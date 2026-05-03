import { Hono } from "hono";
import type { PublicRegistrationRequest } from "@workspace/contracts";
import { apiError } from "./errors";
import { isRecord, readJson, stringOrNull } from "./validation";
import {
  getPublicEvent,
  getPublicOrg,
  listPublicEvents,
  registerForPublicEvent,
} from "../services/public";

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
  .get("/orgs/:slug", async (c) => {
    const org = await getPublicOrg(c.req.param("slug"));
    if (!org) return apiError(c, 404, "org_not_found", "Organization not found");
    return c.json(org);
  })
  .get("/orgs/:slug/events", async (c) => {
    const events = await listPublicEvents(c.req.param("slug"));
    if (!events) return apiError(c, 404, "org_not_found", "Organization not found");
    return c.json({ events });
  })
  .get("/orgs/:slug/events/:eventId", async (c) => {
    const event = await getPublicEvent(c.req.param("slug"), c.req.param("eventId"));
    if (!event) return apiError(c, 404, "event_not_found", "Event not found");
    return c.json({ event });
  })
  .post("/orgs/:slug/events/:eventId/register", async (c) => {
    const input = parsePublicRegistration(await readJson(c));
    if (typeof input === "string") return apiError(c, 400, "invalid_registration", input);

    const registration = await registerForPublicEvent(
      c.req.param("slug"),
      c.req.param("eventId"),
      input,
    );
    if (registration === "org_not_found")
      return apiError(c, 404, "org_not_found", "Organization not found");
    if (registration === "event_not_found")
      return apiError(c, 404, "event_not_found", "Event not found");
    if (registration === "duplicate_registration") {
      return apiError(
        c,
        409,
        "duplicate_registration",
        "You are already registered for this event",
      );
    }

    return c.json({ registration }, 201);
  })
  .post("/orgs/:slug/events/:eventId/checkout", (c) =>
    c.json({ slug: c.req.param("slug"), eventId: c.req.param("eventId"), checkout: null }, 501),
  );
