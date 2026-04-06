import { db } from "@hitchly/db/client";
import { users } from "@hitchly/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../trpc";

export const onboardingRouter = router({
  completeTutorial: publicProcedure
    .input(z.object({ mode: z.enum(["rider", "driver"]) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) throw new Error("Unauthorized");

      const updateData =
        input.mode === "rider"
          ? { riderTutorialCompleted: true }
          : { driverTutorialCompleted: true };

      await db.update(users).set(updateData).where(eq(users.id, userId));
      return { success: true };
    }),
});
