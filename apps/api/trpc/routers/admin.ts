import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import { trips, tripRequests, users, profiles, reports } from "@hitchly/db/schema";
import { protectedProcedure, router, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { geocodeAddress } from "../../services/googlemaps";
import { db } from "@hitchly/db/client";
import { count } from "drizzle-orm";
import { requireTestAccount } from "../../lib/test-accounts";

// McMaster University coordinates (default)
const MCMASTER_COORDS = {
  lat: 43.2609,
  lng: -79.9192,
};

// 1503 Main St W, Hamilton coordinates (default)
const MAIN_ST_COORDS = {
  lat: 43.2535,
  lng: -79.8889,
};

/**
 * Admin Router
 * Test data creation endpoints for development/testing
 */
export const adminRouter = router({
  /**
   * Create a test trip with optional passengers
   */
  createTestTrip: protectedProcedure
    .input(
      z.object({
        driverId: z.string().optional(),
        origin: z.string().optional().default("1503 Main St W, Hamilton, ON"),
        destination: z.string().optional().default("McMaster University"),
        departureTime: z.coerce.date().optional(),
        maxSeats: z.number().int().min(1).max(5).optional().default(4),
        status: z
          .enum(["pending", "active", "in_progress", "completed"])
          .optional()
          .default("pending"),
        passengers: z
          .array(
            z.object({
              riderId: z.string().optional(),
              status: z.enum(["pending", "accepted", "on_trip", "completed"]),
              pickupLat: z.number().optional(),
              pickupLng: z.number().optional(),
              dropoffLat: z.number().optional(),
              dropoffLng: z.number().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const driverId = input.driverId || ctx.userId!;

      // Verify driver exists
      const [driver] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      // Set default departure time (1 hour from now)
      const departureTime =
        input.departureTime || new Date(Date.now() + 60 * 60 * 1000);

      // Geocode addresses if not provided
      let originLat = MAIN_ST_COORDS.lat;
      let originLng = MAIN_ST_COORDS.lng;
      let destLat = MCMASTER_COORDS.lat;
      let destLng = MCMASTER_COORDS.lng;

      try {
        const [originCoords, destCoords] = await Promise.all([
          geocodeAddress(input.origin),
          geocodeAddress(input.destination),
        ]);
        if (originCoords) {
          originLat = originCoords.lat;
          originLng = originCoords.lng;
        }
        if (destCoords) {
          destLat = destCoords.lat;
          destLng = destCoords.lng;
        }
      } catch {
        // Use defaults if geocoding fails
        console.warn("Geocoding failed, using default coordinates");
      }

      // Calculate booked seats based on accepted/on_trip/completed passengers
      const bookedSeats = input.passengers.filter(
        (p) =>
          p.status === "accepted" ||
          p.status === "on_trip" ||
          p.status === "completed"
      ).length;

      // Create trip
      const tripId = crypto.randomUUID();
      const [trip] = await ctx.db
        .insert(trips)
        .values({
          id: tripId,
          driverId,
          origin: input.origin,
          destination: input.destination,
          originLat,
          originLng,
          destLat,
          destLng,
          departureTime,
          maxSeats: input.maxSeats,
          bookedSeats,
          status: input.status,
        })
        .returning();

      // Create passengers
      const createdRequests = [];
      for (const passenger of input.passengers) {
        const riderId = passenger.riderId || ctx.userId!;

        // Verify rider exists and is not the driver
        if (riderId === driverId) {
          continue; // Skip if rider is the driver
        }

        const [rider] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, riderId))
          .limit(1);

        if (!rider) {
          continue; // Skip if rider doesn't exist
        }

        const requestId = crypto.randomUUID();
        const [request] = await ctx.db
          .insert(tripRequests)
          .values({
            id: requestId,
            tripId,
            riderId,
            pickupLat: passenger.pickupLat || originLat,
            pickupLng: passenger.pickupLng || originLng,
            dropoffLat: passenger.dropoffLat || destLat,
            dropoffLng: passenger.dropoffLng || destLng,
            status: passenger.status,
          })
          .returning();

        createdRequests.push(request);
      }

      return {
        trip,
        passengers: createdRequests,
      };
    }),

  /**
   * Add a passenger to an existing trip
   */
  createTestPassenger: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        riderId: z.string().optional(),
        status: z
          .enum(["pending", "accepted", "on_trip", "completed"])
          .optional()
          .default("pending"),
        pickupLat: z.number().optional(),
        pickupLng: z.number().optional(),
        dropoffLat: z.number().optional(),
        dropoffLng: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get trip
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      const riderId = input.riderId || ctx.userId!;

      // Verify rider is not the driver
      if (trip.driverId === riderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Driver cannot be a passenger on their own trip",
        });
      }

      // Verify rider exists
      const [rider] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, riderId))
        .limit(1);

      if (!rider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rider not found",
        });
      }

      // Check for existing request
      const [existingRequest] = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.riderId, riderId)
          )
        )
        .limit(1);

      if (existingRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rider already has a request for this trip",
        });
      }

      // Create request
      const requestId = crypto.randomUUID();
      const [request] = await ctx.db
        .insert(tripRequests)
        .values({
          id: requestId,
          tripId: input.tripId,
          riderId,
          pickupLat: input.pickupLat || trip.originLat || MAIN_ST_COORDS.lat,
          pickupLng: input.pickupLng || trip.originLng || MAIN_ST_COORDS.lng,
          dropoffLat: input.dropoffLat || trip.destLat || MCMASTER_COORDS.lat,
          dropoffLng: input.dropoffLng || trip.destLng || MCMASTER_COORDS.lng,
          status: input.status,
        })
        .returning();

      // Update trip bookedSeats if status is accepted/on_trip/completed
      if (
        input.status === "accepted" ||
        input.status === "on_trip" ||
        input.status === "completed"
      ) {
        const newBookedSeats = trip.bookedSeats + 1;
        const shouldActivateTrip = trip.status === "pending";

        await ctx.db
          .update(trips)
          .set({
            bookedSeats: newBookedSeats,
            status: shouldActivateTrip ? "active" : trip.status,
            updatedAt: new Date(),
          })
          .where(eq(trips.id, input.tripId));
      }

      return request;
    }),

  /**
   * Setup a complete test scenario for driver testing
   */
  setupDriverTestScenario: protectedProcedure
    .input(
      z.object({
        scenario: z.enum(["pending", "active", "in_progress", "completed"]),
        driverId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const driverId = input.driverId || ctx.userId!;

      // Verify driver exists
      const [driver] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      // Get or create test riders
      const testRiderEmails = ["rider@mcmaster.ca", "swesan.test@mcmaster.ca"];
      const riders = [];

      for (const email of testRiderEmails) {
        const [rider] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (rider && rider.id !== driverId) {
          riders.push(rider);
        }
      }

      // If no test riders found, use any other verified users
      if (riders.length === 0) {
        const allUsers = await ctx.db
          .select()
          .from(users)
          .where(eq(users.emailVerified, true));

        for (const user of allUsers) {
          if (user.id !== driverId && riders.length < 2) {
            riders.push(user);
          }
        }
      }

      if (riders.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No riders available. Create test rider accounts first.",
        });
      }

      // Define scenario configurations
      const scenarios = {
        pending: {
          tripStatus: "pending" as const,
          requests: [{ status: "pending" as const }],
        },
        active: {
          tripStatus: "active" as const,
          requests: [
            { status: "accepted" as const },
            { status: "accepted" as const },
          ],
        },
        in_progress: {
          tripStatus: "in_progress" as const,
          requests: [
            { status: "on_trip" as const },
            { status: "accepted" as const },
          ],
        },
        completed: {
          tripStatus: "completed" as const,
          requests: [{ status: "completed" as const }],
        },
      };

      const scenario = scenarios[input.scenario];

      // Calculate booked seats
      const bookedSeats = scenario.requests.filter(
        (r) =>
          r.status === "accepted" ||
          r.status === "on_trip" ||
          r.status === "completed"
      ).length;

      // Set departure time (1 hour from now for immediate testing)
      const departureTime = new Date(Date.now() + 60 * 60 * 1000);

      // Create trip
      const tripId = crypto.randomUUID();
      const [trip] = await ctx.db
        .insert(trips)
        .values({
          id: tripId,
          driverId,
          origin: "1503 Main St W, Hamilton, ON",
          destination: "McMaster University",
          originLat: MAIN_ST_COORDS.lat,
          originLng: MAIN_ST_COORDS.lng,
          destLat: MCMASTER_COORDS.lat,
          destLng: MCMASTER_COORDS.lng,
          departureTime,
          maxSeats: 4,
          bookedSeats,
          status: scenario.tripStatus,
        })
        .returning();

      // Create passengers
      const createdRequests = [];
      for (let i = 0; i < scenario.requests.length && i < riders.length; i++) {
        const requestConfig = scenario.requests[i];
        const rider = riders[i];

        const requestId = crypto.randomUUID();
        const [request] = await ctx.db
          .insert(tripRequests)
          .values({
            id: requestId,
            tripId,
            riderId: rider.id,
            pickupLat: MAIN_ST_COORDS.lat + (Math.random() - 0.5) * 0.01,
            pickupLng: MAIN_ST_COORDS.lng + (Math.random() - 0.5) * 0.01,
            dropoffLat: MCMASTER_COORDS.lat,
            dropoffLng: MCMASTER_COORDS.lng,
            status: requestConfig.status,
          })
          .returning();

        createdRequests.push(request);
      }

      return {
        trip,
        passengers: createdRequests,
        scenario: input.scenario,
      };
    }),

  /**
   * Create a test trip from McMaster University to Toronto Union Station
   * with specified passenger dropoff addresses
   */
  createTorontoTestTrip: protectedProcedure
    .input(
      z.object({
        driverId: z.string().optional(),
        passengerCount: z.number().int().min(1).max(4),
        departureTime: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const driverId = input.driverId || ctx.userId!;

      // Verify driver exists
      const [driver] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      // Passenger dropoff addresses (in order)
      const passengerAddresses = [
        "1065 Plains Rd E, Burlington, ON L7T 4K1",
        "214 Cross Ave, Oakville, ON L6J 2W6",
        "1250 S Service Rd, Mississauga, ON L5E 1V4",
        "25 The West Mall, Etobicoke, ON M9C 1B8",
      ];

      const origin = "McMaster University";
      const destination = "Toronto Union Station";

      // Set default departure time (5 minutes from now - within 10 minute window for "Start Ride")
      const departureTime =
        input.departureTime || new Date(Date.now() + 5 * 60 * 1000);

      // Geocode addresses
      const [originCoords, destCoords, ...passengerCoords] = await Promise.all([
        geocodeAddress(origin),
        geocodeAddress(destination),
        ...passengerAddresses
          .slice(0, input.passengerCount)
          .map((addr) => geocodeAddress(addr)),
      ]);

      if (!originCoords || !destCoords) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to geocode origin or destination",
        });
      }

      // Get or create test riders
      const testRiderEmails = [
        "rider@mcmaster.ca",
        "hamzah.test@mcmaster.ca",
        "aidan.test@mcmaster.ca",
        "swesan.test@mcmaster.ca",
      ];

      const riders = [];
      for (let i = 0; i < input.passengerCount; i++) {
        const email = testRiderEmails[i] || `test-rider-${i}@example.com`;
        const [rider] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (rider && rider.id !== driverId) {
          riders.push(rider);
        } else {
          // Create a dummy rider if needed
          const dummyRiderId = crypto.randomUUID();
          await ctx.db.insert(users).values({
            id: dummyRiderId,
            email: email,
            name: `Test Rider ${i + 1}`,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          // Create profile for rider
          await ctx.db.insert(profiles).values({
            userId: dummyRiderId,
            universityRole: "student",
            appRole: "rider",
            defaultAddress: origin,
            defaultLat: originCoords.lat,
            defaultLong: originCoords.lng,
          });
          riders.push({ id: dummyRiderId, email, name: `Test Rider ${i + 1}` });
        }
      }

      if (riders.length < input.passengerCount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough riders available",
        });
      }

      // Create trip with "active" status (ready to start)
      const tripId = crypto.randomUUID();
      const [trip] = await ctx.db
        .insert(trips)
        .values({
          id: tripId,
          driverId,
          origin,
          destination,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          destLat: destCoords.lat,
          destLng: destCoords.lng,
          departureTime,
          maxSeats: input.passengerCount + 1, // Ensure enough seats
          bookedSeats: input.passengerCount, // All passengers accepted
          status: "active", // Ready to start
        })
        .returning();

      // Create passengers with accepted status
      const createdRequests = [];
      for (let i = 0; i < input.passengerCount; i++) {
        const rider = riders[i];
        const dropoffCoords = passengerCoords[i] || destCoords;

        const requestId = crypto.randomUUID();
        const [request] = await ctx.db
          .insert(tripRequests)
          .values({
            id: requestId,
            tripId,
            riderId: rider.id,
            pickupLat: originCoords.lat + (Math.random() - 0.5) * 0.01,
            pickupLng: originCoords.lng + (Math.random() - 0.5) * 0.01,
            dropoffLat: dropoffCoords.lat,
            dropoffLng: dropoffCoords.lng,
            status: "accepted", // All passengers accepted (ready to start)
            riderPickupConfirmedAt: new Date(), // Simulate rider confirming pickup for test trips
          })
          .returning();
        createdRequests.push(request);
      }
      return {
        trip,
        passengers: createdRequests,
      };
    }),

  /**
   * Create 5 dummy passengers for swipe testing
   */
  createDummyPassengers: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      // Get trip
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Create 5 dummy riders
      const createdRequests = [];
      for (let i = 0; i < 5; i++) {
        const dummyRiderId = crypto.randomUUID();
        const email = `dummy-rider-${i}-${Date.now()}@test.com`;

        // Create user
        await ctx.db.insert(users).values({
          id: dummyRiderId,
          email,
          name: `Dummy Rider ${i + 1}`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create profile
        await ctx.db.insert(profiles).values({
          userId: dummyRiderId,
          universityRole: "student",
          appRole: "rider",
          defaultAddress: trip.origin,
          defaultLat: trip.originLat || MAIN_ST_COORDS.lat,
          defaultLong: trip.originLng || MAIN_ST_COORDS.lng,
        });

        // Create pending request
        const requestId = crypto.randomUUID();
        const [request] = await ctx.db
          .insert(tripRequests)
          .values({
            id: requestId,
            tripId: input.tripId,
            riderId: dummyRiderId,
            pickupLat:
              (trip.originLat || MAIN_ST_COORDS.lat) +
              (Math.random() - 0.5) * 0.01,
            pickupLng:
              (trip.originLng || MAIN_ST_COORDS.lng) +
              (Math.random() - 0.5) * 0.01,
            dropoffLat:
              (trip.destLat || MCMASTER_COORDS.lat) +
              (Math.random() - 0.5) * 0.01,
            dropoffLng:
              (trip.destLng || MCMASTER_COORDS.lng) +
              (Math.random() - 0.5) * 0.01,
            status: "pending",
          })
          .returning();

        createdRequests.push(request);
      }

      return {
        passengers: createdRequests,
      };
    }),

  /**
   * Create a test request for the current user against an available trip
   * Chooses the first pending/active trip with available seats
   */
  createTestRequest: protectedProcedure
    .input(
      z.object({
        tripId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const riderId = ctx.userId!;

      // If tripId not provided, find first available trip (pending/active with seats, not cancelled, and rider is not the driver)
      let targetTripId = input.tripId;
      if (!targetTripId) {
        const availableTrips = await ctx.db
          .select()
          .from(trips)
          .where(
            and(
              or(eq(trips.status, "pending"), eq(trips.status, "active")),
              sql`${trips.maxSeats} - ${trips.bookedSeats} > 0`,
              ne(trips.driverId, riderId) // Exclude trips where rider is the driver
            )
          )
          .limit(1);
        if (!availableTrips.length) {
          // Auto-create a test trip with a dummy driver
          const dummyDriverId = crypto.randomUUID();
          const dummyDriverEmail = `test-driver-${Date.now()}@mcmaster.ca`;

          // Create dummy driver user
          await ctx.db.insert(users).values({
            id: dummyDriverId,
            email: dummyDriverEmail,
            name: "Test Driver",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Create driver profile
          await ctx.db.insert(profiles).values({
            userId: dummyDriverId,
            universityRole: "student",
            appRole: "driver",
            defaultAddress: "McMaster University",
            defaultLat: MCMASTER_COORDS.lat,
            defaultLong: MCMASTER_COORDS.lng,
          });

          // Create test trip
          const autoTripId = crypto.randomUUID();
          const departureTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

          await ctx.db
            .insert(trips)
            .values({
              id: autoTripId,
              driverId: dummyDriverId,
              origin: "McMaster University",
              destination: "Toronto Union Station",
              originLat: MCMASTER_COORDS.lat,
              originLng: MCMASTER_COORDS.lng,
              destLat: MAIN_ST_COORDS.lat,
              destLng: MAIN_ST_COORDS.lng,
              departureTime,
              maxSeats: 4,
              bookedSeats: 0,
              status: "active",
            })
            .returning();
          targetTripId = autoTripId;
        } else {
          targetTripId = availableTrips[0].id;
        }
      }

      // Verify trip and availability
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, targetTripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      }

      const availableSeats = trip.maxSeats - trip.bookedSeats;
      if (availableSeats <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Trip has no available seats",
        });
      }

      // Check for existing pending/accepted request for this rider/trip
      const [existing] = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, trip.id),
            eq(tripRequests.riderId, riderId),
            or(
              eq(tripRequests.status, "pending"),
              eq(tripRequests.status, "accepted")
            )
          )
        )
        .limit(1);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You already have a pending or accepted request for this trip",
        });
      }

      const requestId = crypto.randomUUID();
      const [request] = await ctx.db
        .insert(tripRequests)
        .values({
          id: requestId,
          tripId: trip.id,
          riderId,
          pickupLat: trip.originLat ?? MAIN_ST_COORDS.lat,
          pickupLng: trip.originLng ?? MAIN_ST_COORDS.lng,
          dropoffLat: trip.destLat ?? MCMASTER_COORDS.lat,
          dropoffLng: trip.destLng ?? MCMASTER_COORDS.lng,
          status: "accepted",
        })
        .returning();

      // Mark seat booked and activate trip if needed
      await ctx.db
        .update(trips)
        .set({
          bookedSeats: trip.bookedSeats + 1,
          status: trip.status === "pending" ? "active" : trip.status,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, trip.id));
      return request;
    }),

  /**
   * Simulate driver picking up a passenger (for testing rider experience)
   * Bypasses driver ownership check - allows riders to test the pickup flow
   */
  simulateDriverPickup: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        requestId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      // Get request
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      // Verify request belongs to trip
      if (request.tripId !== input.tripId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request does not belong to this trip",
        });
      }

      // Validate status - must be accepted
      if (request.status !== "accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only pick up passengers with accepted status",
        });
      }

      // Check rider has confirmed pickup
      if (!request.riderPickupConfirmedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rider has not confirmed pickup yet",
        });
      }

      // Update request status to on_trip
      const [updatedRequest] = await ctx.db
        .update(tripRequests)
        .set({
          status: "on_trip",
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

      return updatedRequest;
    }),

  /**
   * Simulate driver dropping off a passenger (for testing rider experience)
   * Bypasses driver ownership check - allows riders to test the dropoff flow
   */
  simulateDriverDropoff: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        requestId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      // Get request
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      // Verify request belongs to trip
      if (request.tripId !== input.tripId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request does not belong to this trip",
        });
      }

      // Validate status - must be on_trip
      if (request.status !== "on_trip") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only drop off passengers who are on trip",
        });
      }

      // Update request status to completed
      const [updatedRequest] = await ctx.db
        .update(tripRequests)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

      // Check if all passengers are completed and update trip status
      const allRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId));

      const anyIncomplete = allRequests.some(
        (r) =>
          r.status === "pending" ||
          r.status === "accepted" ||
          r.status === "on_trip"
      );

      if (!anyIncomplete) {
        await ctx.db
          .update(trips)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(trips.id, input.tripId));
      }

      return updatedRequest;
    }),

  /**
   * Create a test request for the current rider (LEGACY).
   * NOTE: This previously overrode `createTestRequest` and caused rider test requests to be created as pending.
   * Kept for reference but renamed to avoid overriding the main endpoint.
   */
  createTestRequestPending: protectedProcedure
    .input(
      z.object({
        tripId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const riderId = ctx.userId!;

      // Try to use provided tripId, else find an available trip, else create one with a dummy driver.
      let tripId = input.tripId;
      let tripRecord;

      if (tripId) {
        const [trip] = await ctx.db
          .select()
          .from(trips)
          .where(eq(trips.id, tripId))
          .limit(1);
        tripRecord = trip;
      }

      if (!tripRecord) {
        const [availableTrip] = await ctx.db
          .select()
          .from(trips)
          .where(
            and(
              or(eq(trips.status, "pending"), eq(trips.status, "active")),
              sql`${trips.maxSeats} - ${trips.bookedSeats} > 0`,
              ne(trips.driverId, riderId)
            )
          )
          .orderBy(trips.departureTime)
          .limit(1);

        tripRecord = availableTrip ?? null;
      }

      // If no trip found, create a dummy driver and a new active trip
      if (!tripRecord) {
        const dummyDriverId = crypto.randomUUID();
        const email = `dummy-driver-${Date.now()}@test.com`;

        await ctx.db.insert(users).values({
          id: dummyDriverId,
          email,
          name: "Dummy Driver",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await ctx.db.insert(profiles).values({
          userId: dummyDriverId,
          universityRole: "staff",
          appRole: "driver",
          defaultAddress: "1503 Main St W, Hamilton, ON",
          defaultLat: MAIN_ST_COORDS.lat,
          defaultLong: MAIN_ST_COORDS.lng,
        });

        const departureTime = new Date(Date.now() + 45 * 60 * 1000);
        const [newTrip] = await ctx.db
          .insert(trips)
          .values({
            id: crypto.randomUUID(),
            driverId: dummyDriverId,
            origin: "1503 Main St W, Hamilton, ON",
            destination: "McMaster University",
            originLat: MAIN_ST_COORDS.lat,
            originLng: MAIN_ST_COORDS.lng,
            destLat: MCMASTER_COORDS.lat,
            destLng: MCMASTER_COORDS.lng,
            departureTime,
            maxSeats: 4,
            bookedSeats: 0,
            status: "active",
          })
          .returning();

        tripRecord = newTrip;
      }

      tripId = tripRecord.id;

      // Create pending request for current rider
      const requestId = crypto.randomUUID();
      const [request] = await ctx.db
        .insert(tripRequests)
        .values({
          id: requestId,
          tripId,
          riderId,
          pickupLat: tripRecord.originLat ?? MAIN_ST_COORDS.lat,
          pickupLng: tripRecord.originLng ?? MAIN_ST_COORDS.lng,
          dropoffLat: tripRecord.destLat ?? MCMASTER_COORDS.lat,
          dropoffLng: tripRecord.destLng ?? MCMASTER_COORDS.lng,
          status: "pending",
        })
        .returning();

      return { tripId, request };
    }),

  /**
   * Simulate driver completing a trip by picking up and dropping off all passengers.
   */
  simulateDriverComplete: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const driverId = ctx.userId!;

      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      if (trip.driverId !== driverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the trip driver can simulate completion",
        });
      }

      const requests = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId))
        .orderBy(tripRequests.createdAt);

      const acceptedIds = requests
        .filter((r) => r.status === "accepted")
        .map((r) => r.id);
      const onTripIds = requests
        .filter((r) => r.status === "on_trip")
        .map((r) => r.id);

      if (acceptedIds.length > 0) {
        await ctx.db
          .update(tripRequests)
          .set({ status: "on_trip", updatedAt: new Date() })
          .where(inArray(tripRequests.id, acceptedIds));
      }

      if (onTripIds.length > 0 || acceptedIds.length > 0) {
        const toCompleteIds = [...onTripIds, ...acceptedIds];
        await ctx.db
          .update(tripRequests)
          .set({ status: "completed", updatedAt: new Date() })
          .where(inArray(tripRequests.id, toCompleteIds));
      }

      const remaining = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            inArray(tripRequests.status, ["pending", "accepted", "on_trip"])
          )
        );

      let newStatus = trip.status;
      if (remaining.length === 0) {
        const [updatedTrip] = await ctx.db
          .update(trips)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(trips.id, input.tripId))
          .returning();
        newStatus = updatedTrip?.status ?? newStatus;

        // Send Trip Completed notification to all completed riders
        const completedRequestIds = [...onTripIds, ...acceptedIds];
        if (completedRequestIds.length > 0) {
          const completedRiders = await ctx.db
            .select({ userId: users.id, pushToken: users.pushToken })
            .from(users)
            .innerJoin(tripRequests, eq(tripRequests.riderId, users.id))
            .where(inArray(tripRequests.id, completedRequestIds));

          if (completedRiders.length > 0) {
            const { sendTripNotification } =
              await import("../../services/notification_service");
            await sendTripNotification(
              completedRiders,
              "Trip Completed",
              `Your trip from ${trip.origin} to ${trip.destination} is complete. Thanks for riding with Hitchly!`,
              { tripId: input.tripId, action: "completed" }
            ).catch((err) =>
              console.error("Failed to send complete notification:", err)
            );
          }
        }
      }

      return {
        tripId: input.tripId,
        updated: {
          acceptedToOnTrip: acceptedIds,
          completed: [...onTripIds, ...acceptedIds],
        },
        tripStatus: newStatus,
      };
    }),

  /**
   * Simulate trip start notification (for testing rider notifications)
   * Allows riders to test the "Trip Starting" notification
   */
  simulateTripStartNotification: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Get current user's push token
      const [user] = await ctx.db
        .select({ userId: users.id, pushToken: users.pushToken })
        .from(users)
        .where(eq(users.id, ctx.userId!));

      if (user?.pushToken) {
        const { sendTripNotification } =
          await import("../../services/notification_service");
        await sendTripNotification(
          [user],
          "Trip Starting",
          "Your driver is on the way! Get ready for pickup.",
          { tripId: input.tripId, action: "started" }
        );
      }

      return { success: true };
    }),

  /**
   * Simulate trip cancel notification (for testing rider notifications)
   * Allows riders to test the "Trip Cancelled" notification
   */
  simulateTripCancelNotification: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Get current user's push token
      const [user] = await ctx.db
        .select({ userId: users.id, pushToken: users.pushToken })
        .from(users)
        .where(eq(users.id, ctx.userId!));

      if (user?.pushToken) {
        const { sendTripNotification } =
          await import("../../services/notification_service");
        await sendTripNotification(
          [user],
          "Trip Cancelled",
          `Your trip from ${trip.origin} to ${trip.destination} has been cancelled by the driver.`,
          { tripId: input.tripId, action: "cancelled" }
        );
      }

      return { success: true };
    }),

  /**
   * Delete dummy passengers for a trip (identified by email pattern)
   */
  deleteDummyPassengers: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      // Get trip
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Find all dummy passengers (by email pattern)
      const allRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId));
      // Filter dummy passengers by email pattern
      const dummyRequests = [];
      for (const request of allRequests) {
        const [rider] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, request.riderId))
          .limit(1);

        if (
          rider &&
          rider.email.includes("dummy-rider-") &&
          rider.email.includes("@test.com")
        ) {
          dummyRequests.push(request);
        }
      }
      if (dummyRequests.length === 0) {
        return { deletedCount: 0, updatedBookedSeats: trip.bookedSeats };
      }

      // Delete dummy passengers
      const dummyRequestIds = dummyRequests.map((r) => r.id);

      await ctx.db
        .delete(tripRequests)
        .where(inArray(tripRequests.id, dummyRequestIds));

      // Delete dummy users
      const dummyRiderIds = dummyRequests.map((r) => r.riderId);
      await ctx.db.delete(users).where(inArray(users.id, dummyRiderIds));

      // Recalculate bookedSeats (count accepted/on_trip/completed requests)
      const remainingRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId));

      const newBookedSeats = remainingRequests.filter(
        (req) =>
          req.status === "accepted" ||
          req.status === "on_trip" ||
          req.status === "completed"
      ).length;

      // Update trip bookedSeats
      await ctx.db
        .update(trips)
        .set({
          bookedSeats: newBookedSeats,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, input.tripId));
      return {
        deletedCount: dummyRequests.length,
        updatedBookedSeats: newBookedSeats,
      };
    }),

  // Admin procedures from HEAD (reports/warnings)
  getAnalytics: adminProcedure.query(async () => {
    const userCount = await db.select({ value: count() }).from(users);
    const reportsCount = await db.select({ value: count() }).from(reports);

    return {
      totalUsers: userCount[0].value,
      activeUsers: 1, //TODO
      totalRides: 0, //TODO
      reportsCount: reportsCount[0].value,
    };
  }),

  getAllUsers: adminProcedure.query(async () => {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        strikeCount: count(reports.id),
      })
      .from(users)
      .leftJoin(reports, eq(reports.targetUserId, users.id))
      .groupBy(users.id)
      .limit(50);
  }),

  amIAdmin: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
      columns: { role: true },
    });

    return { isAdmin: user?.role === "admin" };
  }),

  warnUser: adminProcedure
    .input(
      z.object({
        targetUserId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.insert(reports).values({
        targetUserId: input.targetUserId,
        adminId: ctx.userId!,
        reason: input.reason,
        type: "warning",
      });

      const warnings = await db
        .select({ count: count() })
        .from(reports)
        .where(eq(reports.targetUserId, input.targetUserId));

      const totalStrikes = warnings[0].count;

      if (totalStrikes >= 3) {
        console.warn(
          `User ${input.targetUserId} has reached 3 strikes. Executing BAN.`
        );

        await db
          .update(users)
          .set({
            banned: true,
            banReason: "Excessive strikes (3+ warnings)",
          })
          .where(eq(users.id, input.targetUserId));
      }

      return { success: true };
    }),
});
