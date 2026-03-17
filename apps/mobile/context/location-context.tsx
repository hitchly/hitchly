import { Accuracy, PermissionStatus } from "expo-location";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppRole } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

// This must match the storagePrefix used in auth-client.ts expoClient config
const COOKIE_STORAGE_KEY = "hitchly_cookie";
export const LOCATION_TRACKING_TASK = "LOCATION_TRACKING";

// Types
interface LocationContextValue {
  isTracking: boolean;
  startBackgroundTracking: () => Promise<boolean>;
  stopBackgroundTracking: () => Promise<void>;
  error: string | null;
}

interface StoredCookieValue {
  value: string;
  expires: string | null;
}

type StoredCookies = Record<string, StoredCookieValue>;

// Context
const LocationContext = createContext<LocationContextValue>({
  isTracking: false,
  startBackgroundTracking: async () => {
    await Promise.resolve();
    return false;
  },
  stopBackgroundTracking: async () => {
    await Promise.resolve();
  },
  error: null,
});

// Helper: Get formatted cookie string for background tasks
// Reads from the same storage key that expo client uses
const getBackgroundAuthCookie = async (): Promise<string | null> => {
  try {
    const cookieJson = await SecureStore.getItemAsync(COOKIE_STORAGE_KEY);
    if (!cookieJson) return null;

    const parsed = JSON.parse(cookieJson) as StoredCookies;

    // Format cookies, filtering out expired ones
    const formattedCookies = Object.entries(parsed)
      .filter(([, cookieValue]) => {
        if (cookieValue.expires && new Date(cookieValue.expires) < new Date()) {
          return false;
        }
        return true;
      })
      .map(([name, cookieValue]) => `${name}=${cookieValue.value}`)
      .join("; ");

    return formattedCookies || null;
  } catch {
    return null;
  }
};

// Helper: Send location update from background
const sendBackgroundLocationUpdate = async (
  baseUrl: string,
  cookie: string,
  data: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  }
): Promise<void> => {
  try {
    await fetch(`${baseUrl}/trpc/location.update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "expo-origin": "hitchly://",
      },
      body: JSON.stringify(data),
    });
  } catch {
    // Background location update failed silently
  }
};

// Define the background task (must be at module scope)
if (!TaskManager.isTaskDefined(LOCATION_TRACKING_TASK)) {
  TaskManager.defineTask(LOCATION_TRACKING_TASK, async (body) => {
    const { data, error } = body;

    if (error) {
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      const loc = locations[0];

      if (loc) {
        // Get stored auth cookie
        const cookie = await getBackgroundAuthCookie();

        if (!cookie) {
          return;
        }

        // Get API URL from stored preference or default
        const baseUrl =
          process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

        await sendBackgroundLocationUpdate(baseUrl, cookie, {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          heading: loc.coords.heading,
          speed: loc.coords.speed,
        });
      }
    }
  });
}

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = authClient.useSession();
  const { role } = useUserRole();

  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get active driver trips to determine if tracking should be active
  const { data: driverTrips } = trpc.trip.getTrips.useQuery(undefined, {
    enabled: !!session?.user.id && role === AppRole.DRIVER,
    refetchInterval: 5000,
  });

  // Find active trip (in_progress status only)
  const activeDriverTrip = useMemo(() => {
    if (!driverTrips) return null;
    return driverTrips.find((trip) => trip.status === "in_progress");
  }, [driverTrips]);

  // Start background tracking
  const startBackgroundTracking = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      const { status: foregroundStatus } =
        await Location.getForegroundPermissionsAsync();

      if (foregroundStatus !== PermissionStatus.GRANTED) {
        const { status: requestedStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (requestedStatus !== PermissionStatus.GRANTED) {
          setError("Foreground location permission denied");
          return false;
        }
      }

      const { status: backgroundStatus } =
        await Location.getBackgroundPermissionsAsync();

      if (backgroundStatus !== PermissionStatus.GRANTED) {
        const { status: requestedStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (requestedStatus !== PermissionStatus.GRANTED) {
          setError("Background location permission denied");
          return false;
        }
      }

      // Check if already tracking
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TRACKING_TASK
      );

      if (hasStarted) {
        setIsTracking(true);
        return true;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds
        foregroundService: {
          notificationTitle: "Hitchly is tracking your ride",
          notificationBody: "Your location is being shared with your riders.",
        },
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
      });

      setIsTracking(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to start tracking: ${errorMessage}`);
      return false;
    }
  }, []);

  // Stop background tracking
  const stopBackgroundTracking = useCallback(async (): Promise<void> => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TRACKING_TASK
      );

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        setIsTracking(false);
      }
    } catch {
      // Already stopped or not tracking
    }
  }, []);

  // Auto-start/stop tracking based on active trip status
  useEffect(() => {
    const manageTracking = async () => {
      if (role === AppRole.DRIVER && activeDriverTrip) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(
          LOCATION_TRACKING_TASK
        );

        if (!hasStarted) {
          await startBackgroundTracking();
        }
      } else {
        // No active trip - stop tracking
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(
          LOCATION_TRACKING_TASK
        );

        if (hasStarted) {
          await stopBackgroundTracking();
        }
      }
    };

    void manageTracking();
  }, [role, activeDriverTrip, startBackgroundTracking, stopBackgroundTracking]);

  useEffect(() => {
    return () => {
      void stopBackgroundTracking();
    };
  }, [stopBackgroundTracking]);

  // Stop tracking on sign out
  useEffect(() => {
    if (!session?.user) {
      void stopBackgroundTracking();
    }
  }, [session?.user, stopBackgroundTracking]);

  const value = useMemo<LocationContextValue>(
    () => ({
      isTracking,
      startBackgroundTracking,
      stopBackgroundTracking,
      error,
    }),
    [isTracking, startBackgroundTracking, stopBackgroundTracking, error]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationTracking = () => {
  const context = useContext(LocationContext);

  return context;
};
