import { config as hitchlyConfig } from "@hitchly/eslint-config";
import expoConfig from "eslint-config-expo/flat.js";

export default [
  // 1. The Expo Config (Filtered to avoid plugin collisions)
  ...expoConfig.map((conf) => {
    if (conf.plugins?.import) {
      const { import: _, ...restPlugins } = conf.plugins;
      return { ...conf, plugins: restPlugins };
    }
    return conf;
  }),

  // 2. Your newly-fixed, valid Hitchly rules
  ...hitchlyConfig,

  // 3. Final Mobile Overrides
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
];
