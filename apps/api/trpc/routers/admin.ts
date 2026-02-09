import { and, eq, inArray, ne, or, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
// IMPORT COMPLAINTS TABLE
import {
  trips,
  tripRequests,
  users,
  profiles,
  reports,
  complaints,
} from "@hitchly/db/schema";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";
import { geocodeAddress } from "../../services/googlemaps";
import { requireTestAccount } from "../../lib/test-accounts";

const MCMASTER_COORDS = { lat: 43.2609, lng: -79.9192 };
const MAIN_ST_COORDS = { lat: 43.2535, lng: -79.8889 };

const checkAdmin = async (_userId: string, _db: any) => {
  return true; // TODO: Add real admin check
};

export const adminRouter = router({
  // 1. GET PLATFORM STATS
  getPlatformStats: protectedProcedure.query(async ({ ctx }) => {
    await checkAdmin(ctx.userId!, ctx.db);

    const [userCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [tripCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(trips);

    // CHANGED: Now counting COMPLETED trips instead of active
    const [completedTripCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(eq(trips.status, "completed"));

    const [complaintCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(complaints);

    return {
      totalUsers: Number(userCount?.count ?? 0),
      totalTrips: Number(tripCount?.count ?? 0),
      completedTrips: Number(completedTripCount?.count ?? 0), // Renamed key
      totalReports: Number(complaintCount?.count ?? 0),
      totalRevenue: 0,
    };
  }),

  // 2. GET ALL USERS
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    await checkAdmin(ctx.userId!, ctx.db);
    return await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        banned: users.banned,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(50)
      .orderBy(desc(users.createdAt));
  }),

  // 3. GET REPORTS (Actually fetching COMPLAINTS now)
  getReports: protectedProcedure.query(async ({ ctx }) => {
    await checkAdmin(ctx.userId!, ctx.db);

    // Fetch from COMPLAINTS table
    const allComplaints = await ctx.db
      .select()
      .from(complaints)
      .orderBy(desc(complaints.createdAt));

    // Gather User IDs
    const userIds = new Set<string>();
    allComplaints.forEach((c) => {
      if (c.reporterUserId) userIds.add(c.reporterUserId);
      if (c.targetUserId) userIds.add(c.targetUserId);
    });

    // Fetch User Details
    const usersMap = new Map<string, typeof users.$inferSelect>();
    if (userIds.size > 0) {
      const relatedUsers = await ctx.db
        .select()
        .from(users)
        .where(inArray(users.id, Array.from(userIds)));
      relatedUsers.forEach((u) => usersMap.set(u.id, u));
    }

    // Map to Dashboard Format
    return allComplaints.map((c) => ({
      id: c.id,
      reason: "User Complaint", // Generic title
      details: c.content, // The actual message from SafetyScreen
      createdAt: c.createdAt,
      reporterName: usersMap.get(c.reporterUserId)?.name || "Unknown",
      reporterEmail: usersMap.get(c.reporterUserId)?.email || "Unknown",
      targetName: usersMap.get(c.targetUserId)?.name || "Unknown",
      targetEmail: usersMap.get(c.targetUserId)?.email || "Unknown",
      targetId: c.targetUserId, // Useful for the ban button
    }));
  }),

  // 4. BAN USER
  banUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkAdmin(ctx.userId!, ctx.db);
      await ctx.db
        .update(users)
        .set({ banned: true })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  // 5. UNBAN USER
  unbanUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkAdmin(ctx.userId!, ctx.db);
      await ctx.db
        .update(users)
        .set({ banned: false })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),
  // ========== EXISTING MANAGEMENT ENDPOINTS ==========

  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    await checkAdmin(ctx.userId!, ctx.db);
    // Keeping this for backward compatibility if needed,
    // but getPlatformStats is preferred for the new dashboard
    const userCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return {
      totalUsers: Number(userCount[0]?.count ?? 0),
      activeUsers: 1,
      totalRides: 0,
      reportsCount: 0,
    };
  }),

  amIAdmin: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, ctx.userId!))
      .limit(1);

    return { isAdmin: user?.role === "admin" };
  }),

  warnUser: protectedProcedure
    .input(z.object({ targetUserId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input: _input }) => {
      await checkAdmin(ctx.userId!, ctx.db);
      // Placeholder logic maintained
      return { success: true };
    }),

  // ========== TEST DATA CREATION ENDPOINTS (Unchanged) ==========

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

      const [driver] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);
      if (!driver)
        throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });

      const departureTime =
        input.departureTime || new Date(Date.now() + 60 * 60 * 1000);

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
        console.warn("Geocoding failed, using default coordinates");
      }

      const bookedSeats = input.passengers.filter(
        (p) =>
          p.status === "accepted" ||
          p.status === "on_trip" ||
          p.status === "completed"
      ).length;

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

      const createdRequests = [];
      for (const passenger of input.passengers) {
        const riderId = passenger.riderId || ctx.userId!;
        if (riderId === driverId) continue;

        const [rider] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, riderId))
          .limit(1);
        if (!rider) continue;

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

      return { trip, passengers: createdRequests };
    }),

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
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);
      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

      const riderId = input.riderId || ctx.userId!;
      if (trip.driverId === riderId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Driver cannot be passenger",
        });

      const [rider] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, riderId))
        .limit(1);
      if (!rider)
        throw new TRPCError({ code: "NOT_FOUND", message: "Rider not found" });

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

      if (existingRequest)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rider already requested this trip",
        });

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

  setupDriverTestScenario: protectedProcedure
    .input(
      z.object({
        scenario: z.enum(["pending", "active", "in_progress", "completed"]),
        driverId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const driverId = input.driverId || ctx.userId!;
      const [driver] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);
      if (!driver)
        throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });

      const testRiderEmails = ["rider@mcmaster.ca", "swesan.test@mcmaster.ca"];
      const riders = [];

      for (const email of testRiderEmails) {
        const [rider] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (rider && rider.id !== driverId) riders.push(rider);
      }

      if (riders.length === 0) {
        const allUsers = await ctx.db
          .select()
          .from(users)
          .where(eq(users.emailVerified, true));
        for (const user of allUsers) {
          if (user.id !== driverId && riders.length < 2) riders.push(user);
        }
      }

      if (riders.length === 0)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No riders available",
        });

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
      const bookedSeats = scenario.requests.filter(
        (r) =>
          r.status === "accepted" ||
          r.status === "on_trip" ||
          r.status === "completed"
      ).length;

      const departureTime = new Date(Date.now() + 60 * 60 * 1000);
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

      return { trip, passengers: createdRequests, scenario: input.scenario };
    }),

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

      const [driver] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, driverId))
        .limit(1);
      if (!driver)
        throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });

      const passengerAddresses = [
        "1065 Plains Rd E, Burlington, ON L7T 4K1",
        "214 Cross Ave, Oakville, ON L6J 2W6",
        "1250 S Service Rd, Mississauga, ON L5E 1V4",
        "25 The West Mall, Etobicoke, ON M9C 1B8",
      ];

      const origin = "McMaster University";
      const destination = "Toronto Union Station";
      const departureTime =
        input.departureTime || new Date(Date.now() + 5 * 60 * 1000);

      const [originCoords, destCoords, ...passengerCoords] = await Promise.all([
        geocodeAddress(origin),
        geocodeAddress(destination),
        ...passengerAddresses
          .slice(0, input.passengerCount)
          .map((addr) => geocodeAddress(addr)),
      ]);

      if (!originCoords || !destCoords)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Geocode failed" });

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
          const dummyRiderId = crypto.randomUUID();
          await ctx.db.insert(users).values({
            id: dummyRiderId,
            email,
            name: `Test Rider ${i + 1}`,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
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

      if (riders.length < input.passengerCount)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough riders",
        });

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
          maxSeats: input.passengerCount + 1,
          bookedSeats: input.passengerCount,
          status: "active",
        })
        .returning();

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
            status: "accepted",
            riderPickupConfirmedAt: new Date(),
          })
          .returning();
        createdRequests.push(request);
      }
      return { trip, passengers: createdRequests };
    }),

  createDummyPassengers: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);
      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

      const createdRequests = [];
      for (let i = 0; i < 5; i++) {
        const dummyRiderId = crypto.randomUUID();
        const email = `dummy-rider-${i}-${Date.now()}@test.com`;

        await ctx.db.insert(users).values({
          id: dummyRiderId,
          email,
          name: `Dummy Rider ${i + 1}`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await ctx.db.insert(profiles).values({
          userId: dummyRiderId,
          universityRole: "student",
          appRole: "rider",
          defaultAddress: trip.origin,
          defaultLat: trip.originLat || MAIN_ST_COORDS.lat,
          defaultLong: trip.originLng || MAIN_ST_COORDS.lng,
        });

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
      return { passengers: createdRequests };
    }),

  createTestRequest: protectedProcedure
    .input(z.object({ tripId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const riderId = ctx.userId!;

      let targetTripId = input.tripId;
      if (!targetTripId) {
        const availableTrips = await ctx.db
          .select()
          .from(trips)
          .where(
            and(
              or(eq(trips.status, "pending"), eq(trips.status, "active")),
              sql`${trips.maxSeats} - ${trips.bookedSeats} > 0`,
              ne(trips.driverId, riderId)
            )
          )
          .limit(1);

        if (!availableTrips.length) {
          const dummyDriverId = crypto.randomUUID();
          const dummyDriverEmail = `test-driver-${Date.now()}@mcmaster.ca`;
          await ctx.db.insert(users).values({
            id: dummyDriverId,
            email: dummyDriverEmail,
            name: "Test Driver",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await ctx.db.insert(profiles).values({
            userId: dummyDriverId,
            universityRole: "student",
            appRole: "driver",
            defaultAddress: "McMaster University",
            defaultLat: MCMASTER_COORDS.lat,
            defaultLong: MCMASTER_COORDS.lng,
          });

          const autoTripId = crypto.randomUUID();
          const departureTime = new Date(Date.now() + 5 * 60 * 1000);
          await ctx.db.insert(trips).values({
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
          });
          targetTripId = autoTripId;
        } else {
          targetTripId = availableTrips[0].id;
        }
      }

      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, targetTripId))
        .limit(1);
      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      if (trip.maxSeats - trip.bookedSeats <= 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No seats" });

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
      if (existing)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request exists" });

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

  simulateDriverPickup: protectedProcedure
    .input(z.object({ tripId: z.string(), requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .limit(1);
      if (!request)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      if (request.tripId !== input.tripId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mismatch trip" });
      if (request.status !== "accepted")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must be accepted",
        });
      if (!request.riderPickupConfirmedAt)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rider confirm required",
        });

      const [updatedRequest] = await ctx.db
        .update(tripRequests)
        .set({ status: "on_trip", updatedAt: new Date() })
        .where(eq(tripRequests.id, input.requestId))
        .returning();
      return updatedRequest;
    }),

  simulateDriverDropoff: protectedProcedure
    .input(z.object({ tripId: z.string(), requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .limit(1);
      if (!request)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      if (request.tripId !== input.tripId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mismatch trip" });
      if (request.status !== "on_trip")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must be on trip",
        });

      const [updatedRequest] = await ctx.db
        .update(tripRequests)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

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

  createTestRequestPending: protectedProcedure
    .input(z.object({ tripId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const riderId = ctx.userId!;

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

      if (!tripRecord) {
        const dummyDriverId = crypto.randomUUID();
        const email = `dummy-driver-${Date.now()}@test.com`;
        await ctx.db
          .insert(users)
          .values({
            id: dummyDriverId,
            email,
            name: "Dummy Driver",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        await ctx.db
          .insert(profiles)
          .values({
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

      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      if (trip.driverId !== driverId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Driver only" });

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

      const toCompleteIds = [...onTripIds, ...acceptedIds];
      if (toCompleteIds.length > 0) {
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

        if (toCompleteIds.length > 0) {
          const completedRiders = await ctx.db
            .select({ userId: users.id, pushToken: users.pushToken })
            .from(users)
            .innerJoin(tripRequests, eq(tripRequests.riderId, users.id))
            .where(inArray(tripRequests.id, toCompleteIds));

          if (completedRiders.length > 0) {
            const { sendTripNotification } =
              await import("../../services/notification_service");
            await sendTripNotification(
              completedRiders,
              "Trip Completed",
              `Trip complete. Thanks for riding!`,
              { tripId: input.tripId, action: "completed" }
            ).catch(console.error);
          }
        }
      }

      return {
        tripId: input.tripId,
        updated: { acceptedToOnTrip: acceptedIds, completed: toCompleteIds },
        tripStatus: newStatus,
      };
    }),

  simulateTripStartNotification: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);
      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

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
          "Driver is on the way!",
          { tripId: input.tripId, action: "started" }
        );
      }
      return { success: true };
    }),

  simulateTripCancelNotification: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);
      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

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
          "Trip cancelled by driver.",
          { tripId: input.tripId, action: "cancelled" }
        );
      }
      return { success: true };
    }),

  deleteDummyPassengers: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTestAccount(ctx.userId!);
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);
      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

      const allRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId));
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

      if (dummyRequests.length === 0)
        return { deletedCount: 0, updatedBookedSeats: trip.bookedSeats };

      const dummyRequestIds = dummyRequests.map((r) => r.id);
      await ctx.db
        .delete(tripRequests)
        .where(inArray(tripRequests.id, dummyRequestIds));

      const dummyRiderIds = dummyRequests.map((r) => r.riderId);
      await ctx.db.delete(users).where(inArray(users.id, dummyRiderIds));

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

      await ctx.db
        .update(trips)
        .set({ bookedSeats: newBookedSeats, updatedAt: new Date() })
        .where(eq(trips.id, input.tripId));
      return {
        deletedCount: dummyRequests.length,
        updatedBookedSeats: newBookedSeats,
      };
    }),
});
