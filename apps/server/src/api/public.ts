import { Hono } from "hono";
import type { PublicRegistrationRequest } from "@workspace/contracts";
import { apiError } from "./errors";
import { isRecord, readJson, stringOrNull } from "./validation";
import { logEvent } from "../observability/events";
import { enrichLogger, getLogger } from "../observability/request-context";
import {
  getPublicEvent,
  getPublicOrg,
  listPublicEvents,
  registerForPublicEvent,
} from "../services/public";
import { createCheckoutForRegistration } from "../services/payments/checkout";

function parsePublicRegistration(input: unknown): PublicRegistrationRequest | string {
  if (!isRecord(input)) return "Request body must be an object";
  if (typeof input.name !== "string" || input.name.trim().length === 0) return "Name is required";
  if (typeof input.email !== "string" || input.email.trim().length === 0)
    return "Email is required";
  const phone = stringOrNull(input.phone);
  if (phone === undefined) return "Phone must be a string or null";
  return { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone };
}

export const publicRoutes = new Hono()
  .use("/orgs/:slug/*", async (c, next) => {
    enrichLogger({ orgSlug: c.req.param("slug"), source: "public" });
    await next();
  })
  .use("/orgs/:slug", async (c, next) => {
    enrichLogger({ orgSlug: c.req.param("slug"), source: "public" });
    await next();
  })
  .get("/orgs/:slug", async (c) => {
    const org = await getPublicOrg(c.req.param("slug"));
    if (!org) {
      getLogger().warn("tenant.notFound");
      return apiError(c, 404, "org_not_found", "Organization not found");
    }
    enrichLogger({ orgId: org.org.id });
    return c.json(org);
  })
  .get("/orgs/:slug/events", async (c) => {
    const events = await listPublicEvents(c.req.param("slug"));
    if (!events) {
      getLogger().warn("tenant.notFound");
      return apiError(c, 404, "org_not_found", "Organization not found");
    }
    return c.json({ events });
  })
  .get("/orgs/:slug/events/:eventId", async (c) => {
    const eventId = c.req.param("eventId");
    enrichLogger({ eventId });
    const event = await getPublicEvent(c.req.param("slug"), eventId);
    if (!event) return apiError(c, 404, "event_not_found", "Event not found");
    return c.json({ event });
  })
  .post("/orgs/:slug/events/:eventId/register", async (c) => {
    const eventId = c.req.param("eventId");
    enrichLogger({ eventId });
    const input = parsePublicRegistration(await readJson(c));
    if (typeof input === "string") return apiError(c, 400, "invalid_registration", input);

    const registration = await registerForPublicEvent(c.req.param("slug"), eventId, input);
    if (registration === "org_not_found") {
      getLogger().warn("tenant.notFound");
      return apiError(c, 404, "org_not_found", "Organization not found");
    }
    if (registration === "event_not_found")
      return apiError(c, 404, "event_not_found", "Event not found");
    if (registration === "attendee_not_found")
      return apiError(c, 404, "attendee_not_found", "Attendee not found");
    if (registration === "duplicate_registration") {
      logEvent("registration.duplicate", { eventId });
      return apiError(
        c,
        409,
        "duplicate_registration",
        "You are already registered for this event",
      );
    }

    logEvent("registration.created", { registrationId: registration.id, eventId });
    return c.json({ registration }, 201);
  })
  .post("/orgs/:slug/events/:eventId/checkout", async (c) => {
    enrichLogger({ eventId: c.req.param("eventId") });
    const body = (await readJson(c)) as Record<string, unknown> | null;
    if (!isRecord(body)) {
      return apiError(c, 400, "invalid_checkout", "Body must be an object");
    }
    if (typeof body.registrationId !== "string" || body.registrationId.length === 0) {
      return apiError(c, 400, "invalid_checkout", "registrationId is required");
    }
    if (typeof body.successUrl !== "string" || typeof body.cancelUrl !== "string") {
      return apiError(c, 400, "invalid_checkout", "successUrl and cancelUrl are required");
    }
    const preferred = typeof body.provider === "string" ? body.provider : undefined;

    const result = await createCheckoutForRegistration({
      registrationId: body.registrationId,
      orgSlug: c.req.param("slug"),
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      preferredProvider: preferred,
    });

    if (result.type === "error") {
      const status = result.code === "registration_not_found" ? 404 : 400;
      return apiError(c, status, result.code, result.message);
    }

    logEvent("payment.checkout.created", {
      registrationId: body.registrationId,
      sessionId: result.sessionId,
    });
    return c.json({ url: result.url, sessionId: result.sessionId });
  });
