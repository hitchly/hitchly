import { publicProcedure, router } from "../trpc";
export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { ok: true, message: "tRPC is alive 🚀" };
  }),
});
