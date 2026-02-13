export declare const profileRouter: import("@trpc/server").TRPCBuiltRouter<
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
     * getUserProfile()
     * Returns the user's profile, preferences, and vehicle data.
     * Throws NotFoundError if user doesn't exist.
     */
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
    /**
     * updateUserProfile()
     * Updates basic profile fields (bio, faculty, roles).
     * Creates the profile record if it doesn't exist (Upsert).
     */
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
    /**
     * updatePreferences()
     * Updates ride comfort settings.
     */
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
    /**
     * updateVehicle()
     * Updates driver vehicle information.
     */
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
    /**
     * getDriverEarnings()
     * Returns driver earnings statistics (lifetime, week, month).
     */
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
    /**
     * updatePushToken()
     * Updates the user's Expo push notification token.
     */
    updatePushToken: import("@trpc/server").TRPCMutationProcedure<{
      input: {
        pushToken: string;
      };
      output: {
        success: boolean;
      };
      meta: object;
    }>;
    /**
     * getBanStatus()
     * Returns the user's ban status.
     * TODO: Add banned and banReason fields to users schema
     */
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
//# sourceMappingURL=profile.d.ts.map
