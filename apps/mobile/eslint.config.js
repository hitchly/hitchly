import { config as hitchlyConfig } from "@hitchly/eslint-config";
import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig.map((conf) => {
    if (conf.plugins?.import) {
      const { import: _, ...restPlugins } = conf.plugins;
      return { ...conf, plugins: restPlugins };
    }
    return conf;
  }),
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
  ...hitchlyConfig,
];
