import { db } from "../db";

export type Context = {
  db: typeof db;
};

export const createContext = async (): Promise<Context> => {
  return { db };
};
