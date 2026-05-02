import { Hono } from "hono";
import type { HealthResponse, RootResponse } from "@workspace/contracts";

const app = new Hono();

app.get("/", (c) => c.json<RootResponse>({ ok: true, service: "booking-mate-server" }));

app.get("/health", (c) => c.json<HealthResponse>({ status: "ok" }));

const port = Number(Bun.env.PORT ?? 3000);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running on http://localhost:${port}`);
