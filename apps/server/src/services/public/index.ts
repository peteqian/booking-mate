import type { PublicRegistrationRequest } from "@workspace/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { attendees, events, organization, orgSettings, registrations } from "../../db/schema";
import { toEventDto } from "../events";
import { toRegistrationDto } from "../registrations";

export async function getPublicOrg(slug: string) {
  const rows = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);
  const org = rows[0];
  if (!org) return null;

  const settingsRows = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.orgId, org.id))
    .limit(1);

  return {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt.toISOString(),
    },
    settings: settingsRows[0]
      ? {
          contactEmail: settingsRows[0].contactEmail,
          currency: settingsRows[0].currency,
          categories: settingsRows[0].categories,
        }
      : null,
  };
}

export async function listPublicEvents(slug: string) {
  const publicOrg = await getPublicOrg(slug);
  if (!publicOrg) return null;

  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.orgId, publicOrg.org.id), eq(events.visibility, "published")));

  return rows.map(toEventDto);
}

export async function getPublicEvent(slug: string, eventId: string) {
  const publicOrg = await getPublicOrg(slug);
  if (!publicOrg) return null;

  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.orgId, publicOrg.org.id),
        eq(events.id, eventId),
        eq(events.visibility, "published"),
      ),
    )
    .limit(1);

  return rows[0] ? toEventDto(rows[0]) : null;
}

export async function registerForPublicEvent(
  slug: string,
  eventId: string,
  input: PublicRegistrationRequest,
) {
  const publicOrg = await getPublicOrg(slug);
  if (!publicOrg) return "org_not_found";

  const event = await getPublicEvent(slug, eventId);
  if (!event) return "event_not_found";

  const attendeeRows = await db
    .insert(attendees)
    .values({
      orgId: publicOrg.org.id,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
    })
    .onConflictDoUpdate({
      target: [attendees.orgId, attendees.email],
      set: { name: input.name, phone: input.phone ?? null, updatedAt: new Date() },
    })
    .returning();

  const existing = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.orgId, publicOrg.org.id),
        eq(registrations.eventId, eventId),
        eq(registrations.attendeeId, attendeeRows[0].id),
      ),
    )
    .limit(1);
  if (existing[0]) return "duplicate_registration";

  const rows = await db
    .insert(registrations)
    .values({ orgId: publicOrg.org.id, eventId, attendeeId: attendeeRows[0].id })
    .returning();

  return toRegistrationDto(rows[0]);
}
