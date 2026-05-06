import type { EventDto, PublicRegistrationRequest } from "@workspace/contracts";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { attendees, organization, orgSettings } from "../../db/schema";
import { getEvent, listEvents } from "../events";
import { createRegistration } from "../registrations";

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

  const rows = await listEvents(publicOrg.org.id);
  return rows.filter(isPublicEvent).map(stripPrivate);
}

function stripPrivate<T extends { notes: string | null }>(dto: T): T {
  return { ...dto, notes: null };
}

function isPublicEvent(event: EventDto) {
  return (
    event.visibility === "published" && event.status === "upcoming" && event.archivedAt === null
  );
}

export async function getPublicEvent(slug: string, eventId: string) {
  const publicOrg = await getPublicOrg(slug);
  if (!publicOrg) return null;

  const event = await getEvent(publicOrg.org.id, eventId);
  if (!event || !isPublicEvent(event)) return null;
  return stripPrivate(event);
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

  const email = input.email.trim().toLowerCase();
  const attendeeRows = await db
    .insert(attendees)
    .values({
      orgId: publicOrg.org.id,
      name: input.name,
      email,
      phone: input.phone ?? null,
    })
    .onConflictDoUpdate({
      target: [attendees.orgId, attendees.email],
      set: { name: input.name, phone: input.phone ?? null, updatedAt: new Date() },
    })
    .returning();

  return createRegistration(publicOrg.org.id, {
    eventId,
    attendeeId: attendeeRows[0].id,
  });
}
