import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: process.env.NODE_ENV === "production" ? true : undefined,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password:
          process.env.DB_PASSWORD != null
            ? String(process.env.DB_PASSWORD)
            : "",
        database: process.env.DB_NAME,
      }
);

export const db = drizzle(pool, { schema });
export { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
