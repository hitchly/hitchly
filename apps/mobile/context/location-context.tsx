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
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or every 20 meters
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
    };

    startWatching();

    return () => {
      if (subscriber) subscriber.remove();
    };
  }, [updateLocation]);

  return (
    <LocationContext.Provider value={{}}>{children}</LocationContext.Provider>
  );
};
