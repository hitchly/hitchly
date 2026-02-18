import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      GMAIL_USER: "test@hitchly.com",
      GMAIL_APP_PASS: "dummy_app_password",
      STRIPE_SECRET_KEY: "sk_test_mock_key",
      GOOGLE_MAPS_API_KEY: "mock_google_maps_key",
      DB_PASSWORD: "dummy_password",
    },
  },
});
