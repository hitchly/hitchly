// packages/db/vitest.config.ts
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
