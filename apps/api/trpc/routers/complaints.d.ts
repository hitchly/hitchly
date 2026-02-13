export declare const complaintsRouter: import("@trpc/server").TRPCBuiltRouter<
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
    /**
     * Get complaints created by the current user
     */
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
//# sourceMappingURL=complaints.d.ts.map
