import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/router";

const app = express();
const port = process.env.API_PORT;

app.use(cors());
app.use(express.json());

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
