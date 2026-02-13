export declare const router: import("@trpc/server").TRPCRouterBuilder<{
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
}>;
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<
  {
    req: Request;
    db: import("drizzle-orm/node-postgres").NodePgDatabase<
      typeof import("@hitchly/db/schema")
    > & {
      $client: import("pg").Pool;
    };
    userId: string | undefined;
    resHeaders: Headers;
  },
  object,
  object,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  false
>;
export declare const protectedProcedure: import("@trpc/server").TRPCProcedureBuilder<
  {
    req: Request;
    db: import("drizzle-orm/node-postgres").NodePgDatabase<
      typeof import("@hitchly/db/schema")
    > & {
      $client: import("pg").Pool;
    };
    userId: string | undefined;
    resHeaders: Headers;
  },
  object,
  {
    userId: string | undefined;
    req: Request;
    resHeaders: Headers;
    db: import("drizzle-orm/node-postgres").NodePgDatabase<
      typeof import("@hitchly/db/schema")
    > & {
      $client: import("pg").Pool;
    };
  },
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  false
>;
export declare const adminProcedure: import("@trpc/server").TRPCProcedureBuilder<
  {
    req: Request;
    db: import("drizzle-orm/node-postgres").NodePgDatabase<
      typeof import("@hitchly/db/schema")
    > & {
      $client: import("pg").Pool;
    };
    userId: string | undefined;
    resHeaders: Headers;
  },
  object,
  {
    user: {
      role: string | null;
    };
    userId: string | undefined;
    req: Request;
    resHeaders: Headers;
    db: import("drizzle-orm/node-postgres").NodePgDatabase<
      typeof import("@hitchly/db/schema")
    > & {
      $client: import("pg").Pool;
    };
  },
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  import("@trpc/server").TRPCUnsetMarker,
  false
>;
//# sourceMappingURL=trpc.d.ts.map
