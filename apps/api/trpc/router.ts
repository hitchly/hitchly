import type { User } from "@hitchly/types";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../db/schema";
import { publicProcedure, router } from "./context";

export const appRouter = router({
  getUsers: publicProcedure.query(async ({ ctx }): Promise<User[]> => {
    return await ctx.db.select().from(users);
  }),

  createUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<User[]> => {
      return await ctx.db.insert(users).values(input).returning();
    }),

  getUserById: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }): Promise<User | undefined> => {
      return await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input))
        .then((res) => res[0]);
    }),
});
