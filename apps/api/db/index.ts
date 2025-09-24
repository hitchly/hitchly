import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in root .env file");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
