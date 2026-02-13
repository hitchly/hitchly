import { config } from "@hitchly/eslint-config";
import { config as expoConfig } from "eslint/config";

export default [
  ...config,
  ...expoConfig,
  {
    ignores: ["dist/*"],
  },
];
