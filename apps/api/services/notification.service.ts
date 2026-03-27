import { db } from "@hitchly/db/client";
import { pushTokens } from "@hitchly/db/schema";
import { inArray } from "drizzle-orm";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export interface SendPushArgs {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}

export interface SendMultiplePushArgs {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}

export const NotificationService = {
  async sendToUser(args: SendPushArgs): Promise<void> {
    try {
      const userTokens = await db.query.pushTokens.findMany({
        where: (tokens, { eq }) => eq(tokens.userId, args.userId),
        columns: { token: true },
      });

      if (userTokens.length === 0) return;

      const messages: ExpoPushMessage[] = [];
      const validTokens: string[] = [];

      for (const t of userTokens) {
        if (!Expo.isExpoPushToken(t.token)) {
          // eslint-disable-next-line no-console
          console.warn(
            `Push token ${String(t.token)} is not a valid Expo push token`
          );
          continue;
        }
        validTokens.push(t.token);
        messages.push({
          to: t.token,
          sound: "default",
          title: args.title,
          body: args.body,
          data: args.data,
          channelId: args.channelId ?? "hitchly-default",
        });
      }

      if (messages.length === 0) return;

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error sending chunk:", error);
        }
      }

      const deadTokens: string[] = [];
      tickets.forEach((ticket, index) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          const invalidToken = validTokens[index];
          if (invalidToken) {
            deadTokens.push(invalidToken);
          }
        }
      });

      if (deadTokens.length > 0) {
        await db
          .delete(pushTokens)
          .where(inArray(pushTokens.token, deadTokens));
        // eslint-disable-next-line no-console
        console.log(
          `🧹 Cleaned up ${String(deadTokens.length)} dead tokens for user ${args.userId}`
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ NotificationService failed to execute:", error);
    }
  },

  /**
   * Broadcasts a single notification payload to multiple users simultaneously.
   * Optimizes database queries using a single inArray fetch.
   */
  async sendToMultipleUsers(args: SendMultiplePushArgs): Promise<void> {
    try {
      if (args.userIds.length === 0) return;

      const userTokens = await db.query.pushTokens.findMany({
        where: (tokens) => inArray(tokens.userId, args.userIds),
        columns: { token: true },
      });

      if (userTokens.length === 0) return;

      const messages: ExpoPushMessage[] = [];
      const validTokens: string[] = [];

      for (const t of userTokens) {
        if (!Expo.isExpoPushToken(t.token)) {
          // eslint-disable-next-line no-console
          console.warn(
            `Push token ${String(t.token)} is not a valid Expo push token`
          );
          continue;
        }
        validTokens.push(t.token);
        messages.push({
          to: t.token,
          sound: "default",
          title: args.title,
          body: args.body,
          data: args.data,
          channelId: args.channelId ?? "hitchly-default",
        });
      }

      if (messages.length === 0) return;

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error sending chunk:", error);
        }
      }

      const deadTokens: string[] = [];
      tickets.forEach((ticket, index) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          const invalidToken = validTokens[index];
          if (invalidToken) {
            deadTokens.push(invalidToken);
          }
        }
      });

      if (deadTokens.length > 0) {
        await db
          .delete(pushTokens)
          .where(inArray(pushTokens.token, deadTokens));
        // eslint-disable-next-line no-console
        console.log(
          `🧹 Cleaned up ${String(deadTokens.length)} dead tokens from broadcast.`
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        "❌ NotificationService broadcast failed to execute:",
        error
      );
    }
  },
};
