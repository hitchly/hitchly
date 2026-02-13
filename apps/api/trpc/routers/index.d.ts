export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<
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
    admin: import("@trpc/server").TRPCBuiltRouter<
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
            status?:
              | "pending"
              | "active"
              | "in_progress"
              | "completed"
              | undefined;
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
            status?:
              | "pending"
              | "completed"
              | "accepted"
              | "on_trip"
              | undefined;
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
    complaints: import("@trpc/server").TRPCBuiltRouter<
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
        createComplaint: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            targetUserId: string;
            content: string;
            rideId?: string | undefined;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        getMyComplaints: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            id: number;
            reporterUserId: string;
            targetUserId: string;
            content: string;
            rideId: string | null;
            status: string | null;
            createdAt: Date | null;
          }[];
          meta: object;
        }>;
      }>
    >;
    profile: import("@trpc/server").TRPCBuiltRouter<
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
        getMe: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
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
            preferences: {
              id: string;
              updatedAt: Date | null;
              userId: string;
              music: boolean;
              chatty: boolean;
              smoking: boolean;
              pets: boolean;
            };
            profile: {
              id: string;
              updatedAt: Date | null;
              userId: string;
              bio: string | null;
              faculty: string | null;
              year: number | null;
              universityRole:
                | "student"
                | "professor"
                | "staff"
                | "alumni"
                | "other";
              appRole: "rider" | "driver";
              defaultAddress: string | null;
              defaultLat: number | null;
              defaultLong: number | null;
            };
            vehicle: {
              id: string;
              updatedAt: Date | null;
              userId: string;
              make: string;
              model: string;
              color: string;
              plate: string;
              seats: number;
            };
          };
          meta: object;
        }>;
        updateProfile: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            bio: string | null;
            faculty: string | null;
            year: number | null;
            universityRole?:
              | "student"
              | "professor"
              | "staff"
              | "alumni"
              | "other"
              | undefined;
            appRole?: "rider" | "driver" | undefined;
            defaultAddress?: string | null | undefined;
            defaultLat?: number | null | undefined;
            defaultLong?: number | null | undefined;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        updatePreferences: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            music?: boolean | undefined;
            chatty?: boolean | undefined;
            smoking?: boolean | undefined;
            pets?: boolean | undefined;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        updateVehicle: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            make: string;
            model: string;
            color: string;
            plate: string;
            seats: number;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        getDriverEarnings: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            totals: {
              lifetimeCents: number;
              weekCents: number;
              monthCents: number;
            };
            stats: {
              completedTripCount: number;
              avgPerTripCents: number;
            };
            placeholders: {
              completedTripsThisWeek: number;
              completedTripsThisMonth: number;
            };
          };
          meta: object;
        }>;
        updatePushToken: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            pushToken: string;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        getBanStatus: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            isBanned: boolean;
            reason: null;
          };
          meta: object;
        }>;
      }>
    >;
    location: import("@trpc/server").TRPCBuiltRouter<
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
        update: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            latitude: number;
            longitude: number;
            heading?: number | null | undefined;
            speed?: number | null | undefined;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        saveDefaultAddress: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            address: string;
            latitude: number;
            longitude: number;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
      }>
    >;
    health: import("@trpc/server").TRPCBuiltRouter<
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
        ping: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            ok: boolean;
            message: string;
          };
          meta: object;
        }>;
      }>
    >;
    matchmaking: import("@trpc/server").TRPCBuiltRouter<
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
        findMatches: import("@trpc/server").TRPCQueryProcedure<{
          input: {
            origin: {
              lat: number;
              lng: number;
            };
            destination: {
              lat: number;
              lng: number;
            };
            desiredArrivalTime: string;
            desiredDate?: unknown;
            maxOccupancy?: number | undefined;
            preference?:
              | "default"
              | "costPriority"
              | "comfortPriority"
              | undefined;
            includeDummyMatches?: boolean | undefined;
          };
          output: import("../../services/matchmaking_service").RideMatch[];
          meta: object;
        }>;
        cancelRequest: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            requestId: string;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
      }>
    >;
    trip: import("@trpc/server").TRPCBuiltRouter<
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
    payment: import("@trpc/server").TRPCBuiltRouter<
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
        createSetupIntent: import("@trpc/server").TRPCMutationProcedure<{
          input: void;
          output: {
            clientSecret: string;
          };
          meta: object;
        }>;
        getPaymentMethods: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            methods: {
              id: string;
              brand: string;
              last4: string;
              expMonth: number | undefined;
              expYear: number | undefined;
              isDefault: boolean;
            }[];
            hasPaymentMethod: boolean;
          };
          meta: object;
        }>;
        deletePaymentMethod: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            paymentMethodId: string;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        setDefaultPaymentMethod: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            paymentMethodId: string;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        hasPaymentMethod: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            hasPaymentMethod: boolean;
          };
          meta: object;
        }>;
        createConnectOnboarding: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            returnUrl: string;
            refreshUrl: string;
          };
          output: {
            onboardingUrl: string;
          };
          meta: object;
        }>;
        getConnectStatus: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            hasAccount: boolean;
            accountId: string | null;
            onboardingComplete: boolean;
            payoutsEnabled: boolean;
            chargesEnabled?: boolean;
            requirementsCurrentlyDue?: string[];
            requirementsEventuallyDue?: string[];
            requirementsDisabledReason?: string | null;
          } | null;
          meta: object;
        }>;
        submitTip: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            tripId: string;
            tipAmountCents: number;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        getPaymentStatus: import("@trpc/server").TRPCQueryProcedure<{
          input: {
            tripRequestId: string;
          };
          output: {
            status: string;
            amountCents: number;
          } | null;
          meta: object;
        }>;
        getDriverPayoutHistory: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            payments: {
              id: string;
              tripId: string;
              riderName: string;
              origin: string;
              destination: string;
              departureTime: Date;
              amountCents: number;
              platformFeeCents: number;
              driverAmountCents: number;
              status:
                | "pending"
                | "cancelled"
                | "authorized"
                | "captured"
                | "refunded"
                | "failed";
              capturedAt: Date | null;
            }[];
            summary: {
              totalEarningsCents: number;
              totalPlatformFeeCents: number;
              pendingCents: number;
              transactionCount: number;
            };
          };
          meta: object;
        }>;
        getRiderPaymentHistory: import("@trpc/server").TRPCQueryProcedure<{
          input: void;
          output: {
            payments: {
              id: string;
              tripId: string;
              driverName: string;
              origin: string;
              destination: string;
              departureTime: Date;
              amountCents: number;
              status:
                | "pending"
                | "cancelled"
                | "authorized"
                | "captured"
                | "refunded"
                | "failed";
              capturedAt: Date | null;
            }[];
            tips: {
              tipId: string;
              tripId: string;
              amountCents: number;
              createdAt: Date;
            }[];
            summary: {
              totalSpentCents: number;
              totalTipsCents: number;
              rideCount: number;
            };
          };
          meta: object;
        }>;
      }>
    >;
    reviews: import("@trpc/server").TRPCBuiltRouter<
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
        submitRating: import("@trpc/server").TRPCMutationProcedure<{
          input: {
            tripId: string;
            targetUserId: string;
            rating: number;
          };
          output: {
            success: boolean;
          };
          meta: object;
        }>;
        getUserScore: import("@trpc/server").TRPCQueryProcedure<{
          input: {
            userId: string;
          };
          output: {
            average: string;
            count: number;
          };
          meta: object;
        }>;
      }>
    >;
  }>
>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map
