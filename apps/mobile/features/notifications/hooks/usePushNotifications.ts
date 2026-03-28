import Constants from "expo-constants";
import * as Device from "expo-device";
import type * as ExpoNotifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { isExpoGo } from "@/lib/stripe-utils";
import { trpc } from "@/lib/trpc";

/** SDK 53+: remote push was removed from Expo Go on Android; importing the module throws. */
const isExpoGoAndroidPushDisabled = (): boolean =>
  isExpoGo() && Platform.OS === "android";

type ExpoNotificationsModule = typeof ExpoNotifications;

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: ExpoNotifications.Notification | null;
  error: Error | null;
}

let notificationHandlerConfigured = false;

export function usePushNotifications(userId?: string): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<ExpoNotifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  const { mutate: syncToken } = trpc.notifications.syncPushToken.useMutation({
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error("❌ Failed to sync push token:", err.message);
    },
  });

  useEffect(() => {
    if (isExpoGoAndroidPushDisabled()) {
      return;
    }

    /* Dynamic load: static import throws on Expo Go Android (SDK 53+). */
    /* eslint-disable @typescript-eslint/no-require-imports -- must not statically import expo-notifications here */
    const Notifications =
      require("expo-notifications") as ExpoNotificationsModule;
    /* eslint-enable @typescript-eslint/no-require-imports */

    if (!notificationHandlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: () =>
          Promise.resolve({
            shouldShowBanner: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowList: true,
          }),
      });
      notificationHandlerConfigured = true;
    }

    let isMounted = true;

    registerForPushNotificationsAsync(Notifications)
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
      response: ExpoNotifications.NotificationResponse
    ) => {
      const data = response.notification.request.content.data;
      const path = data.route ?? data.url;

      if (typeof path === "string") {
        // eslint-disable-next-line no-console
        console.log("Routing from notification tap to:", path);
        router.push(path as Href);
      }
    };

    const lastResponse = Notifications.getLastNotificationResponse();

    if (lastResponse) {
      handleNotificationInteraction(lastResponse);
    }

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
      });

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

  useEffect(() => {
    if (userId && expoPushToken) {
      syncToken({ token: expoPushToken });
    }
  }, [userId, expoPushToken, syncToken]);

  return { expoPushToken, notification, error };
}

async function registerForPushNotificationsAsync(
  Notifications: ExpoNotificationsModule
): Promise<string | null> {
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
