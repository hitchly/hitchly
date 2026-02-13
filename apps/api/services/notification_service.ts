// TODO: Fix linting errors in this file and re-enable eslint
/* eslint-disable */
import type { ExpoPushMessage } from "expo-server-sdk";
import { Expo } from "expo-server-sdk";

const expo = new Expo();

export interface NotificationRecipient {
  userId: string;
  pushToken?: string | null;
}

/**
 * Send push notifications to multiple recipients
 * Filters out invalid tokens and handles chunking automatically
 */
export async function sendTripNotification(
  recipients: NotificationRecipient[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const messages: ExpoPushMessage[] = recipients
    .filter((r) => r.pushToken && Expo.isExpoPushToken(r.pushToken))
    .map((r) => ({
      to: r.pushToken!,
      sound: "default" as const,
      title,
      body,
      data: data || {},
    }));

  if (messages.length === 0) {
    return;
  }

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error("Push notification error:", error);
    }
  }
}

/**
 * Format a date for display in notifications
 */
export function formatNotificationDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
