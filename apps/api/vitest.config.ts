import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      STRIPE_SECRET_KEY: "sk_test_mock_key",
      GOOGLE_MAPS_API_KEY: "mock_google_maps_key",
    },
  },
});
