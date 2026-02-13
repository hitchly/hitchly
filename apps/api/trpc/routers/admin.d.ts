export declare const adminRouter: import("@trpc/server").TRPCBuiltRouter<
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
    getPlatformStats: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        totalUsers: number;
        totalTrips: number;
        completedTrips: number;
        totalReports: number;
        totalRevenue: number;
      };
      meta: object;
    }>;
    getAllUsers: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        id: string;
        name: string;
        email: string;
        image: string | null;
        role: string | null;
        banned: boolean | null;
        createdAt: Date;
      }[];
      meta: object;
    }>;
    getReports: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        id: number;
        reason: string;
        details: string;
        createdAt: Date | null;
        reporterName: string;
        reporterEmail: string;
        targetName: string;
        targetEmail: string;
        targetId: string;
      }[];
      meta: object;
    }>;
    banUser: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        userId: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    unbanUser: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        userId: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    getAnalytics: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        totalUsers: number;
        activeUsers: number;
        totalRides: number;
        reportsCount: number;
      };
      meta: object;
    }>;
    amIAdmin: import("@trpc/server").TRPCQueryProcedure<{
      input: void;
      output: {
        isAdmin: boolean;
      };
      meta: object;
    }>;
    warnUser: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        targetUserId: string;
        reason: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    createTestTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        driverId?: string | undefined;
        origin?: string | undefined;
        destination?: string | undefined;
        departureTime?: unknown;
        maxSeats?: number | undefined;
        status?: "pending" | "active" | "in_progress" | "completed" | undefined;
        passengers?:
          | {
              status: "pending" | "completed" | "accepted" | "on_trip";
              riderId?: string | undefined;
              pickupLat?: number | undefined;
              pickupLng?: number | undefined;
              dropoffLat?: number | undefined;
              dropoffLng?: number | undefined;
            }[]
          | undefined;
      };
      output: {
        trip:
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
        passengers: (
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
          | undefined
        )[];
      };
      meta: object;
    }>;
    createTestPassenger: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
        riderId?: string | undefined;
        status?: "pending" | "completed" | "accepted" | "on_trip" | undefined;
        pickupLat?: number | undefined;
        pickupLng?: number | undefined;
        dropoffLat?: number | undefined;
        dropoffLng?: number | undefined;
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
    setupDriverTestScenario: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        scenario: "pending" | "active" | "in_progress" | "completed";
        driverId?: string | undefined;
      };
      output: {
        trip:
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
        passengers: (
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
          | undefined
        )[];
        scenario: "pending" | "active" | "in_progress" | "completed";
      };
      meta: object;
    }>;
    createTorontoTestTrip: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        passengerCount: number;
        driverId?: string | undefined;
        departureTime?: unknown;
      };
      output: {
        trip:
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
        passengers: (
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
          | undefined
        )[];
      };
      meta: object;
    }>;
    createDummyPassengers: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        passengers: (
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
          | undefined
        )[];
      };
      meta: object;
    }>;
    createTestRequest: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId?: string | undefined;
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
    simulateDriverPickup: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
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
    simulateDriverDropoff: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
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
    createTestRequestPending: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId?: string | undefined;
      };
      output: {
        tripId: string;
        request:
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
      };
      meta: object;
    }>;
    simulateDriverComplete: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        tripId: string;
        updated: {
          acceptedToOnTrip: string[];
          completed: string[];
        };
        tripStatus:
          | "pending"
          | "scheduled"
          | "active"
          | "in_progress"
          | "completed"
          | "cancelled";
      };
      meta: object;
    }>;
    simulateTripStartNotification: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    simulateTripCancelNotification: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    deleteDummyPassengers: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        tripId: string;
      };
      output: {
        deletedCount: number;
        updatedBookedSeats: number;
      };
      meta: object;
    }>;
  }>
>;
//# sourceMappingURL=admin.d.ts.map
