export declare const reviewsRouter: import("@trpc/server").TRPCBuiltRouter<
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
//# sourceMappingURL=reviews.d.ts.map
