// apps/api/config/env.ts
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from root first (for shared config like DB, email)
config({ path: path.resolve(__dirname, "../../../.env") });
// Then load .env from apps/api (for API-specific config like Google Maps API)
config({ path: path.resolve(__dirname, "../.env") });
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
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  origins: {
    client: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  },
  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
};
