export type NotificationRecipient = {
  userId: string;
  pushToken?: string | null;
};
/**
 * Send push notifications to multiple recipients
 * Filters out invalid tokens and handles chunking automatically
 */
export declare function sendTripNotification(
  recipients: NotificationRecipient[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void>;
/**
 * Format a date for display in notifications
 */
export declare function formatNotificationDate(date: Date): string;
//# sourceMappingURL=notification_service.d.ts.map
