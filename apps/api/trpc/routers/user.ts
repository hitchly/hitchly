import { router, publicProcedure } from "../trpc";
import type { User } from "@hitchly/types";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { z } from "zod";

export const userRouter = router({
  getUsers: publicProcedure.query(async ({ ctx }): Promise<User[]> => {
    return ctx.db.select().from(users);
  }),

  createUser: publicProcedure
    .input(z.object({ email: z.string().email(), name: z.string() }))
    .mutation(async ({ ctx, input }): Promise<User[]> => {
      return ctx.db.insert(users).values(input).returning();
    }),

  getUserById: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }): Promise<User | undefined> => {
      const res = await ctx.db.select().from(users).where(eq(users.id, input));
      return res[0];
    }),
});
