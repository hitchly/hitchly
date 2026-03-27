import type { Href, Router } from "expo-router";

const DRIVER_TRIPS_FALLBACK = "/(app)/driver/trips" as Href;

/**
 * Prefer router.back(); if there is no history (e.g. deep link), replace so GO_BACK is never dispatched unhandled.
 */
export function safeLeaveCreateTripScreen(router: Router) {
  if (typeof router.canGoBack === "function" && router.canGoBack()) {
    router.back();
  } else {
    router.replace(DRIVER_TRIPS_FALLBACK);
  }
}
