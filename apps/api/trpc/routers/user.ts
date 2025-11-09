import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { protectedProcedure, router } from "../trpc";

/**
 * User Router
 * Handles fetching authenticated user profile or app-specific user data.
 */
export const userRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId!));

    return user ?? null;
  }),
});
