import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import type { HealthResponse, RootResponse } from "@workspace/contracts";
import { attendeeRoutes } from "./api/attendees";
import { eventRoutes } from "./api/events";
import { orgRoutes } from "./api/org";
import { paymentRoutes } from "./api/payments";
import { publicRoutes } from "./api/public";
import { registrationRoutes } from "./api/registrations";
import { resourceRoutes } from "./api/resources";
import { webhookRoutes } from "./api/webhooks";

const app = new Hono();
const webOrigin = Bun.env.WEB_URL || "http://localhost:5678";

// Enable CORS for web app
app.use(
  "*",
  cors({
    origin: [webOrigin],
    allowHeaders: ["Content-Type", "Authorization", "X-Org-Id"],
    allowMethods: ["POST", "GET", "PATCH", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.get("/", (c) => c.json<RootResponse>({ ok: true, service: "booking-mate-server" }));

app.get("/health", (c) => c.json<HealthResponse>({ status: "ok" }));

// Mount Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/org", orgRoutes);
app.route("/api/resources", resourceRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/attendees", attendeeRoutes);
app.route("/api/registrations", registrationRoutes);
app.route("/api/payments", paymentRoutes);
app.route("/api/webhooks", webhookRoutes);
app.route("/api/public", publicRoutes);

const port = Number(Bun.env.SERVER_PORT ?? 3456);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running on http://localhost:${port}`);
