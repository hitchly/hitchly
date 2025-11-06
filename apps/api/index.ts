import { env } from "./config/env";
import { createServer } from "./server";

const PORT = Number(env.api.port ?? 3001);

const app = createServer();

app.listen(PORT, "0.0.0.0", () => {
  console.warn(`🚀 Server running on http://localhost:${PORT}`);
});
