import { Expo } from "expo-server-sdk";
const expo = new Expo();
/**
 * Send push notifications to multiple recipients
 * Filters out invalid tokens and handles chunking automatically
 */
export async function sendTripNotification(recipients, title, body, data) {
  const messages = recipients
    .filter((r) => r.pushToken && Expo.isExpoPushToken(r.pushToken))
    .map((r) => ({
      to: r.pushToken,
      sound: "default",
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
export function formatNotificationDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
