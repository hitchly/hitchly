import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Hitchly",
  slug: "hitchly",
  version: "1.0.0",
  scheme: "hitchly",
  orientation: "portrait",
  icon: "./assets/images/ios-light.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.hitchly.app",
    buildNumber: "1",
    icon: {
      light: "./assets/images/ios-light.png",
      dark: "./assets/images/ios-dark.png",
      tinted: "./assets/images/ios-tinted.png",
    },
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Hitchly needs access to your location to track your rides and provide accurate ETAs to riders, even when the app is in the background.",
      NSLocationWhenInUseUsageDescription:
        "Hitchly needs access to your location to show your position on the map and provide navigation during rides.",
      UIBackgroundModes: ["location", "fetch", "remote-notification"],
    },
  },

  android: {
    package: "com.hitchly.app",
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#F5F7FA",
      foregroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/adaptive-icon.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
    ],
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F5F7FA",
        dark: {
          backgroundColor: "#11181C",
        },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Hitchly needs access to your location to track your rides and provide accurate ETAs to riders.",
        locationWhenInUsePermission:
          "Hitchly needs access to your location to show your position on the map.",
        isAndroidBackgroundLocationEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      "expo-notifications",
      {
        mode: "production",
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
