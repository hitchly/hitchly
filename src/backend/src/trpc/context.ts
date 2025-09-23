import { initTRPC } from "@trpc/server";
import { db } from "../db";

export type Context = {
  db: typeof db;
};

export const createContext = async () => {
  return {
    db,
  };
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
