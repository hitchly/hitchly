export declare const healthRouter: import("@trpc/server").TRPCBuiltRouter<
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
//# sourceMappingURL=health.d.ts.map
