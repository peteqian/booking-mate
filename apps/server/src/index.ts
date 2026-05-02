import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import type { HealthResponse, RootResponse } from "@workspace/contracts";

const app = new Hono();
const webOrigin = Bun.env.WEB_URL || "http://localhost:5678";

// Enable CORS for web app
app.use("*", cors({
  origin: [webOrigin],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
}));

app.get("/", (c) => c.json<RootResponse>({ ok: true, service: "booking-mate-server" }));

app.get("/health", (c) => c.json<HealthResponse>({ status: "ok" }));

// Mount Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const port = Number(Bun.env.SERVER_PORT ?? 3456);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running on http://localhost:${port}`);
