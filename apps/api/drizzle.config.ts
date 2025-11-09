import type { Config } from "drizzle-kit";
import { env } from "./config/env";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: env.db.host!,
    port: Number(env.db.port ?? 5432),
    user: env.db.user!,
    password: env.db.password!,
    database: env.db.name!,
    ssl: false,
  },
} satisfies Config;
