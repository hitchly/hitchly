import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

const pool = new Pool({
  host: env.db.host,
  port: Number(env.db.port ?? 5432),
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
});

export const db = drizzle(pool, { schema });
