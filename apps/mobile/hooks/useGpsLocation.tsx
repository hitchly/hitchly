import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export const useGPSLocation = (
  onLocationFound: (details: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void
) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getLocation = async () => {
    setIsGeocoding(true);
    try {
      await Location.getForegroundPermissionsAsync();
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Permission Denied",
          "Please ensure location services are enabled for Hitchly in settings."
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          "Location Disabled",
          "Please enable location services in your device settings."
        );
        return;
      }

      // Set timeout for location fetch (15 seconds)
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsGeocoding(false);
          Alert.alert(
            "Timeout",
            "Location fetch timed out. Please try again or enter your address manually."
          );
        }
      }, 15000);

      let loc: Location.LocationObject | null = null;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts && !loc) {
        try {
          const accuracy =
            attempt === 0 ? Location.Accuracy.High : Location.Accuracy.Balanced;

          loc = await Location.getCurrentPositionAsync({
            accuracy,
          });
        } catch {
          attempt++;
          if (attempt < maxAttempts) {
            // Increase delay between retries
            const delay = 1000 * attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      loc ??= await Location.getLastKnownPositionAsync();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!loc) {
        Alert.alert(
          "Location Error",
          "Could not determine your current position. Please ensure your emulator has a GPS location set and try again."
        );
        return;
      }

      if (!isMountedRef.current) return;

      let place: Location.LocationGeocodedAddress | null = null;
      try {
        const [firstResult] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        place = firstResult ?? null;
      } catch {
        // Reverse geocode failed, will use coordinate fallback below
      }

      // Fallback to coordinate string if geocoder failed
      const address = place
        ? [
            place.name !== place.street ? place.name : null,
            place.street,
            place.city,
          ]
            .filter((item): item is string => Boolean(item))
            .join(", ")
        : `Location: ${loc.coords.latitude.toFixed(
            4
          )}, ${loc.coords.longitude.toFixed(4)}`;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!isMountedRef.current) return;

      onLocationFound({
        address,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!isMountedRef.current) return;

      const message = error instanceof Error ? error.message : "Unknown error";
      // eslint-disable-next-line no-console
      console.error("GPS Fetch Error:", message);

      if (error instanceof Error && error.message.includes("timeout")) {
        Alert.alert("Timeout", "Location fetch timed out. Please try again.");
      } else {
        Alert.alert("Error", "Could not fetch location. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  return { getLocation, isGeocoding };
};
