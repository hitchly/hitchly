// apps/api/config/env.ts
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root first (for shared config like DB, email)
config({ path: path.resolve(__dirname, "../../../.env") });
// Then load .env from apps/api (for API-specific config like Google Maps API)
config({ path: path.resolve(__dirname, "../.env") });

/**
 * Helper to ensure required environment variables are set.
 * This satisfies the linter and prevents runtime "undefined" bugs.
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    name: process.env.DB_NAME ?? "hitchly_db",
  },
  api: {
    port: Number(process.env.API_PORT ?? 3001),
  },
  email: {
    host: process.env.EMAIL_HOST ?? "smtp.example.com",
    port: Number(process.env.EMAIL_PORT ?? 587),
    user: getRequiredEnv("GMAIL_USER"),
    password: getRequiredEnv("GMAIL_APP_PASS"),
  },
  origins: {
    client: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  },
  google: {
    apiKey: getRequiredEnv("GOOGLE_MAPS_API_KEY"),
  },
  stripe: {
    secretKey: getRequiredEnv("STRIPE_SECRET_KEY"),
  },
};
