import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { trpc } from "@/lib/trpc";

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowList: true,
    }),
});

/**
 * Custom hook to manage push notification registration, syncing, and deep linking.
 */
export function usePushNotifications(userId?: string): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const { mutate: syncToken } = trpc.notifications.syncPushToken.useMutation({
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error("❌ Failed to sync push token:", err.message);
    },
  });

  useEffect(() => {
    let isMounted = true;

    // 1. Register for push notifications (Async - needs the isMounted check)
    registerForPushNotificationsAsync()
      .then((token) => {
        if (isMounted && token) {
          setExpoPushToken(token);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    const handleNotificationInteraction = (
      response: Notifications.NotificationResponse
    ) => {
      const data = response.notification.request.content.data;
      const path = data.route ?? data.url;

      if (typeof path === "string") {
        // eslint-disable-next-line no-console
        console.log("Routing from notification tap to:", path);
        router.push(path as Href);
      }
    };

    // 2. Handle taps when the app is completely KILLED (Cold Start)
    const lastResponse = Notifications.getLastNotificationResponse();

    if (lastResponse) {
      handleNotificationInteraction(lastResponse);
    }

    // 3. Handle receiving a notification while the app is FOREGROUNDED
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
      });

    // 4. Handle taps when the app is in the BACKGROUND or FOREGROUND
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationInteraction(response);
      });

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Sync token to Postgres whenever the user or token changes
  useEffect(() => {
    if (userId && expoPushToken) {
      syncToken({ token: expoPushToken });
    }
  }, [userId, expoPushToken, syncToken]);

  return { expoPushToken, notification, error };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("hitchly-default", {
      name: "Hitchly Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (!Device.isDevice) {
    // eslint-disable-next-line no-console
    console.warn(
      "Running on emulator. Ensure it is a Google Play image to receive pushes."
    );
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    throw new Error("Permission not granted for push notifications.");
  }

  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const easConfig = Constants.easConfig as { projectId?: string } | undefined;

  const projectId = extra?.eas?.projectId ?? easConfig?.projectId;

  if (typeof projectId !== "string" || !projectId) {
    throw new Error(
      "Project ID not found. Ensure extra.eas.projectId is set in app.config.ts."
    );
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  return tokenResponse.data;
}
