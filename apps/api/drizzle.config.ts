import { config } from "dotenv";
import type { Config } from "drizzle-kit";
import path from "path";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

config({ path: path.resolve(__dirname, "../../", envFile) });

if (
  !process.env.POSTGRES_USER ||
  !process.env.POSTGRES_PASSWORD ||
  !process.env.POSTGRES_DB ||
  !process.env.POSTGRES_HOST ||
  !process.env.POSTGRES_PORT
) {
  throw new Error("Postgres environment variables are not fully set");
}

const isProduction = process.env.NODE_ENV === "production";

const drizzleConfig: Config = {
  schema: "./db/schema.ts",
  out: path.resolve(__dirname, "../../drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: isProduction ? { rejectUnauthorized: true } : false,
  },
};

export default drizzleConfig;
