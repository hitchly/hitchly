import { Linking } from "react-native";

/**
 * Open a single location in Google Maps
 */
export const openStopNavigation = async (
  lat: number,
  lng: number
): Promise<boolean> => {
  // Explicitly convert numbers to strings to satisfy strict template rules
  const latStr = lat.toString();
  const lngStr = lng.toString();

  // Using the standard Google Maps Universal URL format
  const url = `https://www.google.com/maps/search/?api=1&query=${latStr},${lngStr}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    // Robustly handle 'unknown' error type for strict TS
    const message = error instanceof Error ? error.message : "Unknown error";

    // eslint-disable-next-line no-console
    console.error("Error opening navigation:", message);
    return false;
  }
};
