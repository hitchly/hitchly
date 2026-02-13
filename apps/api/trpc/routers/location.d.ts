export declare const locationRouter: import("@trpc/server").TRPCBuiltRouter<
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
//# sourceMappingURL=location.d.ts.map
