export declare const matchmakingRouter: import("@trpc/server").TRPCBuiltRouter<
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
        preference?: "default" | "costPriority" | "comfortPriority" | undefined;
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
//# sourceMappingURL=matchmaking.d.ts.map
