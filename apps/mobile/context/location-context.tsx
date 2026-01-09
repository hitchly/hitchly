import * as Location from "expo-location";
import { createContext, useEffect, useMemo } from "react";
import { trpc } from "../lib/trpc";

const LocationContext = createContext({});

export const LocationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { mutate } = trpc.location.update.useMutation();

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === "granted") {
        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50, // OR every 50 meters
          },
          (loc) => {
            mutate({
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
  }, [mutate]);

  const value = useMemo(() => ({}), []);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
