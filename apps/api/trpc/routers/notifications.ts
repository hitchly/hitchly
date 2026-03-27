import { pushTokens } from "@hitchly/db";
import { and, db, eq } from "@hitchly/db/client";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

export const notificationsRouter = router({
  syncPushToken: protectedProcedure
    .input(
      z.object({
        token: z.string().startsWith("ExponentPushToken["),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert pattern: If the token exists, update the user ownership and timestamp.
      // This handles the edge case where User A logs out and User B logs into the same physical device.
      await db
        .insert(pushTokens)
        .values({
          token: input.token,
          userId: ctx.userId,
          lastUsedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            userId: ctx.userId, // Re-assigns the device token to the current user
            lastUsedAt: new Date(),
          },
        });

      return { success: true };
    }),

  removePushToken: protectedProcedure
    .input(
      z.object({
        token: z.string().startsWith("ExponentPushToken["),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only delete the token if it belongs to the user making the request
      await db
        .delete(pushTokens)
        .where(
          and(
            eq(pushTokens.token, input.token),
            eq(pushTokens.userId, ctx.userId)
          )
        );

      return { success: true };
    }),
});
