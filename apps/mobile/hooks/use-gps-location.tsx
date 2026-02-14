import * as Location from "expo-location";
import { useState } from "react";
import { Alert } from "react-native";

export const useGPSLocation = (
  onLocationFound: (details: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void
) => {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const getLocation = async () => {
    setIsGeocoding(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert("Permission Denied", "Please enter your address manually.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const formatted = [
          place.name !== place.street ? place.name : null,
          place.street,
          place.city,
        ]
          .filter((item): item is string => Boolean(item))
          .join(", ");

        onLocationFound({
          address: formatted,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      // eslint-disable-next-line no-console
      console.error("GPS Fetch Error:", message);
      Alert.alert("Error", "Could not fetch location.");
    } finally {
      setIsGeocoding(false);
    }
  };

  return { getLocation, isGeocoding };
};
