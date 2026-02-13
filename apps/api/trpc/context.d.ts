import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
export declare function createContext({
  req,
  resHeaders,
}: FetchCreateContextFnOptions): Promise<{
  req: Request;
  db: import("drizzle-orm/node-postgres").NodePgDatabase<
    typeof import("@hitchly/db/schema")
  > & {
    $client: import("pg").Pool;
  };
  userId: string | undefined;
  resHeaders: Headers;
}>;
export type Context = Awaited<ReturnType<typeof createContext>>;
//# sourceMappingURL=context.d.ts.map
