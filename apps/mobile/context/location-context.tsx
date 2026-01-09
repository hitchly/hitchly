import * as Location from "expo-location";
import { createContext, useEffect } from "react";
import { trpc } from "../lib/trpc";

const LocationContext = createContext({});

export const LocationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const updateLocation = trpc.location.update.useMutation();

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      // 1. Check permission, but DO NOT REQUEST it here.
      // The UI component handles the request. We only track if already granted.
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === "granted") {
        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Slow down to 10s to save battery
            distanceInterval: 50,
          },
          (loc) => {
            updateLocation.mutate({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading,
              speed: loc.coords.speed,
            });
          }
        );
      }
    };

    startWatching();

    return () => {
      if (subscriber) subscriber.remove();
    };
  }, [updateLocation]); // Run once on mount

  return (
    <LocationContext.Provider value={{}}>{children}</LocationContext.Provider>
  );
};
