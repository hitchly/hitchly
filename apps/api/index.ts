import { config } from "dotenv";
import { createServer } from "./server";

config({ path: "../../.env" });

const PORT = Number(process.env.API_PORT ?? 3001);

const app = createServer();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
