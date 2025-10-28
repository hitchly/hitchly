import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  getUsers: publicProcedure.query(async () => {
    return db.select().from(users);
  }),

  createUser: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const [user] = await db
        .insert(users)
        .values({ name: input.name, email: input.email })
        .returning();
      return user;
    }),
});

// Export type for client
export type AppRouter = typeof appRouter;
