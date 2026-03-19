/* eslint-disable */
import Constants from "expo-constants";

/**
 * Check if the app is running in Expo Go
 * Stripe React Native requires native modules and doesn't work in Expo Go
 */
export function isExpoGo(): boolean {
  // In Expo Go, executionEnvironment is 'storeClient'
  // In development builds or standalone apps, it's 'standalone' or 'bare'
  return Constants.executionEnvironment === "storeClient";
}

/**
 * Check if Stripe functionality is available
 * Stripe only works in development builds or standalone apps, not in Expo Go
 */
export function isStripeAvailable(): boolean {
  return !isExpoGo();
}
