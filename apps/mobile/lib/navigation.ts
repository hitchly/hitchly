import { Linking } from "react-native";

/**
 * Open a single location in Google Maps
 */
export const openStopNavigation = async (
  lat: number,
  lng: number
): Promise<boolean> => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error opening navigation:", error);
    return false;
  }
};
