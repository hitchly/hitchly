import { config } from "dotenv";
import { createServer } from "./server";

config({ path: "../../.env.local" });

const PORT = Number(process.env.API_PORT ?? 3001);

const app = createServer();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
