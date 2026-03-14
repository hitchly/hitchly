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

export const LOCATION_TRACKING_TASK = "LOCATION_TRACKING";
const AUTH_TOKEN_KEY = "hitchly_auth_token";

// Types
interface LocationContextValue {
  isTracking: boolean;
  startBackgroundTracking: () => Promise<boolean>;
  stopBackgroundTracking: () => Promise<void>;
  error: string | null;
}

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

// Helper: Get auth token for background tasks
const getBackgroundAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

// Helper: Save auth token for background tasks
export const saveBackgroundAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to save auth token:", error);
  }
};

// Helper: Clear auth token
export const clearBackgroundAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear auth token:", error);
  }
};

// Helper: Send location update from background
const sendBackgroundLocationUpdate = async (
  baseUrl: string,
  token: string,
  data: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  }
): Promise<void> => {
  try {
    const response = await fetch(`${baseUrl}/api/trpc/location.update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: "hitchly://",
      },
      body: JSON.stringify({
        json: data,
      }),
    });

    if (!response.ok) {
      console.error("Background location update failed:", response.status);
    }
  } catch (error) {
    console.error("Background location update error:", error);
  }
};

// Define the background task (must be at module scope)
if (!TaskManager.isTaskDefined(LOCATION_TRACKING_TASK)) {
  TaskManager.defineTask(LOCATION_TRACKING_TASK, async (body) => {
    const { data, error } = body;

    if (error) {
      console.error("Background location error:", error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      const loc = locations[0];

      if (loc) {
        // Get stored auth token
        const token = await getBackgroundAuthToken();

        if (!token) {
          console.warn(
            "No auth token available for background location update"
          );
          return;
        }

        // Get API URL from stored preference or default
        const baseUrl =
          process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

        await sendBackgroundLocationUpdate(baseUrl, token, {
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

  // Find active trip (in_progress or active status)
  const activeDriverTrip = useMemo(() => {
    if (!driverTrips) return null;
    return driverTrips.find(
      (trip) => trip.status === "in_progress" || trip.status === "active"
    );
  }, [driverTrips]);

  // Start background tracking
  const startBackgroundTracking = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Request foreground permissions first
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== PermissionStatus.GRANTED) {
        setError("Foreground location permission denied");
        return false;
      }

      // Request background permissions
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== PermissionStatus.GRANTED) {
        setError("Background location permission denied");
        // Fall back to foreground-only tracking
        return false;
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
        distanceInterval: 50, // OR every 50 meters
        foregroundService: {
          notificationTitle: "Hitchly is tracking your ride",
          notificationBody: "Your location is being shared with your riders.",
        },
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
      });

      setIsTracking(true);
      console.log("Background location tracking started");
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to start tracking: ${errorMessage}`);
      console.error("Failed to start background tracking:", err);
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
        console.log("Background location tracking stopped");
      }
    } catch (err) {
      console.error("Failed to stop background tracking:", err);
    }
  }, []);

  // Save session token when user logs in
  useEffect(() => {
    const saveToken = async () => {
      // The session object from authClient.useSession() contains the token
      // It may be directly on session or nested depending on better-auth version
      interface SessionWithToken {
        token?: string;
        session?: { token?: string };
      }
      const sessionWithToken = session as SessionWithToken | null;
      const token = sessionWithToken?.token ?? sessionWithToken?.session?.token;
      if (token) {
        await saveBackgroundAuthToken(token);
      }
    };

    saveToken().catch(console.error);
  }, [session]);

  // Auto-start/stop tracking based on active trip status
  useEffect(() => {
    const manageTracking = async () => {
      // Only for drivers with an active trip
      if (role === AppRole.DRIVER && activeDriverTrip) {
        // Check if tracking is not already active
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(
          LOCATION_TRACKING_TASK
        );

        if (!hasStarted) {
          console.log("Active trip detected, starting background tracking");
          await startBackgroundTracking();
        }
      } else {
        // No active trip - stop tracking
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(
          LOCATION_TRACKING_TASK
        );

        if (hasStarted) {
          console.log("No active trip, stopping background tracking");
          await stopBackgroundTracking();
        }
      }
    };

    manageTracking().catch(console.error);
  }, [role, activeDriverTrip, startBackgroundTracking, stopBackgroundTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop tracking when provider unmounts
      stopBackgroundTracking().catch(console.error);
    };
  }, [stopBackgroundTracking]);

  // Clear token on sign out
  useEffect(() => {
    if (!session?.user) {
      clearBackgroundAuthToken().catch(console.error);
      stopBackgroundTracking().catch(console.error);
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

// Custom hook for using location context
export const useLocationTracking = () => {
  const context = useContext(LocationContext);

  return context;
};
