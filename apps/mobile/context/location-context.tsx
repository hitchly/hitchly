import type { LocationSubscription } from "expo-location";
import {
  Accuracy,
  getForegroundPermissionsAsync,
  PermissionStatus,
  watchPositionAsync,
} from "expo-location";
import type { ReactNode } from "react";
import { createContext, useEffect, useMemo } from "react";

import { trpc } from "@/lib/trpc";

const LocationContext = createContext({});

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { mutate } = trpc.location.update.useMutation();

  useEffect(() => {
    let subscriber: LocationSubscription | null = null;

    const startWatching = async (): Promise<void> => {
      const { status } = await getForegroundPermissionsAsync();

      if (status === PermissionStatus.GRANTED) {
        subscriber = await watchPositionAsync(
          {
            accuracy: Accuracy.High,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50, // OR every 50 meters
          },
          (loc) => {
            mutate({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading ?? undefined,
              speed: loc.coords.speed ?? undefined,
            });
          }
        );
      }
    };

    startWatching().catch(() => {
      // Silently fail if location tracking cannot start
    });

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [mutate]);

  const value = useMemo(() => ({}), []);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
