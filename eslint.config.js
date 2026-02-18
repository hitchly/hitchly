import { config } from "@hitchly/eslint-config";

export default [
  ...config,
  {
    ignores: [
      "node_modules/**",
      ".turbo/**",
      "dist/**",
      "apps/**",
      "packages/**",
    ],
  },
];
