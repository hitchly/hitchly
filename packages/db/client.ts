import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const useSsl =
  process.env.NODE_ENV === "production" ||
  process.env.PGSSLMODE === "require" ||
  process.env.DB_SSL === "true" ||
  process.env.DB_SSL === "1";

// pg expects password to be a string (undefined causes "client password must be a string")
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password:
    process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : "",
  database: process.env.DB_NAME,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
