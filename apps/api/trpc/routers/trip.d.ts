/**
 * Trip Router
 * Handles trip creation, retrieval, updates, and cancellation.
 */
export declare const tripRouter: import("@trpc/server").TRPCBuiltRouter<
  {
    ctx: {
      req: Request;
      db: import("drizzle-orm/node-postgres").NodePgDatabase<
        typeof import("@hitchly/db/schema")
      > & {
        $client: import("pg").Pool;
      };
      userId: string | undefined;
      resHeaders: Headers;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
  },
  import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    /**
     * Create a new trip
     */
    createTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        origin: string;
        destination: string;
        departureTime: unknown;
        maxSeats: number;
      };
      output:
        | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            driverId: string;
            origin: string;
            destination: string;
            originLat: number | null;
            originLng: number | null;
            destLat: number | null;
            destLng: number | null;
            departureTime: Date;
            maxSeats: number;
            bookedSeats: number;
            status:
              | "pending"
              | "scheduled"
              | "active"
              | "in_progress"
              | "completed"
              | "cancelled";
          }
        | undefined;
      meta: object;
    }>;
    /**
     * Get trips with optional filters
     * Returns trips where user is driver OR has a trip request as rider
     */
    getTrips: import("@trpc/server").TRPCQueryProcedure<{
      input:
        | {
            userId?: string | undefined;
            status?:
              | "pending"
              | "active"
              | "completed"
              | "cancelled"
              | undefined;
            startDate?: unknown;
            endDate?: unknown;
          }
        | undefined;
      output: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        driverId: string;
        origin: string;
        destination: string;
        originLat: number | null;
        originLng: number | null;
        destLat: number | null;
        destLng: number | null;
        departureTime: Date;
        maxSeats: number;
        bookedSeats: number;
        status:
          | "pending"
          | "scheduled"
          | "active"
          | "in_progress"
          | "completed"
          | "cancelled";
      }[];
      meta: object;
    }>;
    /**
     * Get a single trip by ID
     */
    getTripById: import("@trpc/server").TRPCQueryProcedure<{
      input: {
        tripId: string;
      };
      output: {
        driver: {
          id: string;
          name: string | null;
          email: string | null;
        } | null;
        requests: any[];
        id: string;
        driverId: string;
        origin: string;
        destination: string;
        originLat: number | null;
        originLng: number | null;
        destLat: number | null;
        destLng: number | null;
        departureTime: Date;
        maxSeats: number;
        bookedSeats: number;
        status:
          | "pending"
          | "scheduled"
          | "active"
          | "in_progress"
          | "completed"
          | "cancelled";
        createdAt: Date;
        updatedAt: Date;
      };
      meta: object;
    }>;
    /**
     * Update a trip
     */
    updateTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        updates: {
          origin?: string | undefined;
          destination?: string | undefined;
          departureTime?: unknown;
          maxSeats?: number | undefined;
        };
      };
      output:
        | {
            id: string;
            driverId: string;
            origin: string;
            destination: string;
            originLat: number | null;
            originLng: number | null;
            destLat: number | null;
            destLng: number | null;
            departureTime: Date;
            maxSeats: number;
            bookedSeats: number;
            status:
              | "pending"
              | "scheduled"
              | "active"
              | "in_progress"
              | "completed"
              | "cancelled";
            createdAt: Date;
            updatedAt: Date;
          }
        | undefined;
      meta: object;
    }>;
    /**
     * Cancel a trip
     */
    cancelTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        success: boolean;
        trip:
          | {
              id: string;
              driverId: string;
              origin: string;
              destination: string;
              originLat: number | null;
              originLng: number | null;
              destLat: number | null;
              destLng: number | null;
              departureTime: Date;
              maxSeats: number;
              bookedSeats: number;
              status:
                | "pending"
                | "scheduled"
                | "active"
                | "in_progress"
                | "completed"
                | "cancelled";
              createdAt: Date;
              updatedAt: Date;
            }
          | undefined;
      };
      meta: object;
    }>;
    /**
     * Start a trip (mark as in progress)
     */
    startTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        id: string;
        driverId: string;
        origin: string;
        destination: string;
        originLat: number | null;
        originLng: number | null;
        destLat: number | null;
        destLng: number | null;
        departureTime: Date;
        maxSeats: number;
        bookedSeats: number;
        status:
          | "pending"
          | "scheduled"
          | "active"
          | "in_progress"
          | "completed"
          | "cancelled";
        createdAt: Date;
        updatedAt: Date;
      };
      meta: object;
    }>;
    /**
     * Update passenger status (pickup or dropoff)
     */
    updatePassengerStatus: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        requestId: string;
        action: "pickup" | "dropoff";
      };
      output:
        | {
            id: string;
            tripId: string;
            riderId: string;
            pickupLat: number;
            pickupLng: number;
            dropoffLat: number | null;
            dropoffLng: number | null;
            status:
              | "pending"
              | "completed"
              | "cancelled"
              | "accepted"
              | "on_trip"
              | "rejected";
            createdAt: Date;
            updatedAt: Date;
          }
        | undefined;
      meta: object;
    }>;
    /**
     * Complete trip (mark as completed when all passengers dropped off)
     */
    completeTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        trip:
          | {
              id: string;
              driverId: string;
              origin: string;
              destination: string;
              originLat: number | null;
              originLng: number | null;
              destLat: number | null;
              destLng: number | null;
              departureTime: Date;
              maxSeats: number;
              bookedSeats: number;
              status:
                | "pending"
                | "scheduled"
                | "active"
                | "in_progress"
                | "completed"
                | "cancelled";
              createdAt: Date;
              updatedAt: Date;
            }
          | undefined;
        summary: {
          durationMinutes: number | null;
          totalEarningsCents: number;
          passengerCount: number;
          perPassenger: {
            riderName: string;
            amountCents: number;
          }[];
          totalDistanceKm: number | null;
        };
      };
      meta: object;
    }>;
    submitTripReview: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        rating: number;
        comment?: string | undefined;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    submitTripTip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        tipCents: number;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    submitRiderReview: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        riderId: string;
        rating: number;
        comment?: string | undefined;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    createTripRequest: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        pickupLat: number;
        pickupLng: number;
        estimatedDistanceKm?: number | undefined;
        estimatedDurationSec?: number | undefined;
        estimatedDetourSec?: number | undefined;
      };
      output:
        | {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status:
              | "pending"
              | "completed"
              | "cancelled"
              | "accepted"
              | "on_trip"
              | "rejected";
            tripId: string;
            riderId: string;
            pickupLat: number;
            pickupLng: number;
            dropoffLat: number | null;
            dropoffLng: number | null;
            estimatedDistanceKm: number | null;
            estimatedDurationSec: number | null;
            estimatedDetourSec: number | null;
            riderPickupConfirmedAt: Date | null;
          }
        | undefined;
      meta: object;
    }>;
    getTripRequests: import("@trpc/server").TRPCQueryProcedure<{
      input: {
        tripId?: string | undefined;
        riderId?: string | undefined;
      };
      output: {
        id: string;
        tripId: string;
        riderId: string;
        status:
          | "pending"
          | "completed"
          | "cancelled"
          | "accepted"
          | "on_trip"
          | "rejected";
        createdAt: Date;
        updatedAt: Date;
        trip: {
          id: string;
          driverId: string;
          origin: string;
          destination: string;
          originLat: number | null;
          originLng: number | null;
          destLat: number | null;
          destLng: number | null;
          departureTime: Date;
          maxSeats: number;
          bookedSeats: number;
          status:
            | "pending"
            | "scheduled"
            | "active"
            | "in_progress"
            | "completed"
            | "cancelled";
          createdAt: Date;
          updatedAt: Date;
        } | null;
        rider: {
          id: string;
          name: string;
          email: string;
          emailVerified: boolean;
          image: string | null;
          pushToken: string | null;
          createdAt: Date;
          updatedAt: Date;
          role: string | null;
          banned: boolean | null;
          banReason: string | null;
          banExpires: Date | null;
        } | null;
      }[];
      meta: object;
    }>;
    acceptTripRequest: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        requestId: string;
      };
      output:
        | {
            id: string;
            tripId: string;
            riderId: string;
            pickupLat: number;
            pickupLng: number;
            dropoffLat: number | null;
            dropoffLng: number | null;
            estimatedDistanceKm: number | null;
            estimatedDurationSec: number | null;
            estimatedDetourSec: number | null;
            riderPickupConfirmedAt: Date | null;
            status:
              | "pending"
              | "completed"
              | "cancelled"
              | "accepted"
              | "on_trip"
              | "rejected";
            createdAt: Date;
            updatedAt: Date;
          }
        | undefined;
      meta: object;
    }>;
    rejectTripRequest: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        requestId: string;
      };
      output:
        | {
            id: string;
            tripId: string;
            riderId: string;
            pickupLat: number;
            pickupLng: number;
            dropoffLat: number | null;
            dropoffLng: number | null;
            estimatedDistanceKm: number | null;
            estimatedDurationSec: number | null;
            estimatedDetourSec: number | null;
            riderPickupConfirmedAt: Date | null;
            status:
              | "pending"
              | "completed"
              | "cancelled"
              | "accepted"
              | "on_trip"
              | "rejected";
            createdAt: Date;
            updatedAt: Date;
          }
        | undefined;
      meta: object;
    }>;
    cancelTripRequest: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        requestId: string;
      };
      output:
        | {
            id: string;
            tripId: string;
            riderId: string;
            pickupLat: number;
            pickupLng: number;
            dropoffLat: number | null;
            dropoffLng: number | null;
            estimatedDistanceKm: number | null;
            estimatedDurationSec: number | null;
            estimatedDetourSec: number | null;
            riderPickupConfirmedAt: Date | null;
            status:
              | "pending"
              | "completed"
              | "cancelled"
              | "accepted"
              | "on_trip"
              | "rejected";
            createdAt: Date;
            updatedAt: Date;
          }
        | undefined;
      meta: object;
    }>;
    confirmRiderPickup: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        requestId: string;
      };
      output:
        | {
            id: string;
            tripId: string;
            riderId: string;
            pickupLat: number;
            pickupLng: number;
            dropoffLat: number | null;
            dropoffLng: number | null;
            estimatedDistanceKm: number | null;
            estimatedDurationSec: number | null;
            estimatedDetourSec: number | null;
            riderPickupConfirmedAt: Date | null;
            status:
              | "pending"
              | "completed"
              | "cancelled"
              | "accepted"
              | "on_trip"
              | "rejected";
            createdAt: Date;
            updatedAt: Date;
          }
        | undefined;
      meta: object;
    }>;
    getAvailableTrips: import("@trpc/server").TRPCQueryProcedure<{
      input: {
        startDate?: unknown;
        endDate?: unknown;
      };
      output: {
        id: string;
        driverId: string;
        origin: string;
        destination: string;
        originLat: number | null;
        originLng: number | null;
        destLat: number | null;
        destLng: number | null;
        departureTime: Date;
        maxSeats: number;
        bookedSeats: number;
        status:
          | "pending"
          | "scheduled"
          | "active"
          | "in_progress"
          | "completed"
          | "cancelled";
        createdAt: Date;
        updatedAt: Date;
      }[];
      meta: object;
    }>;
    /**
     * Fix trip status - transitions trips with accepted riders from "pending" to "active"
     * This fixes trips that got stuck in "pending" status due to bugs
     */
    fixTripStatus: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId?: string | undefined;
      };
      output: {
        success: boolean;
        fixedCount: number;
        fixedTrips: {
          tripId: string;
          acceptedRiders: number;
          oldStatus:
            | "pending"
            | "scheduled"
            | "active"
            | "in_progress"
            | "completed"
            | "cancelled";
          newStatus: string;
        }[];
      };
      meta: object;
    }>;
  }>
>;
//# sourceMappingURL=trip.d.ts.map
