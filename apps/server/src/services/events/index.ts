import type {
  CreateEventRequest,
  EventDto,
  EventResourceDto,
  UpdateEventRequest,
} from "@workspace/contracts";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { eventResources, events, resources, registrations } from "../../db/schema";

export function toEventDto(
  event: typeof events.$inferSelect,
  confirmedCount = 0,
  waitlistedCount = 0,
): EventDto {
  return {
    id: event.id,
    orgId: event.orgId,
    createdById: event.createdById,
    title: event.title,
    description: event.description,
    category: event.category,
    date: event.date,
    time: event.time,
    duration: event.duration,
    maxCapacity: event.maxCapacity,
    location: event.location,
    status: event.status,
    visibility: event.visibility,
    recurring: event.recurring,
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceDays: event.recurrenceDays,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceEndDate: event.recurrenceEndDate,
    price: event.price,
    confirmedRegistrations: confirmedCount,
    waitlistedRegistrations: waitlistedCount,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function toEventResourceDto(eventResource: typeof eventResources.$inferSelect): EventResourceDto {
  return {
    id: eventResource.id,
    orgId: eventResource.orgId,
    eventId: eventResource.eventId,
    resourceId: eventResource.resourceId,
    role: eventResource.role,
    quantity: eventResource.quantity,
    createdAt: eventResource.createdAt.toISOString(),
    updatedAt: eventResource.updatedAt.toISOString(),
  };
}

export async function listEvents(orgId: string): Promise<EventDto[]> {
  const rows = await db.select().from(events).where(eq(events.orgId, orgId));

  const eventIds = rows.map((row) => row.id);

  let counts: Array<{ eventId: string; status: string; count: number }> = [];
  if (eventIds.length > 0) {
    counts = await db
      .select({
        eventId: registrations.eventId,
        status: registrations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(registrations)
      .where(and(eq(registrations.orgId, orgId), inArray(registrations.eventId, eventIds)))
      .groupBy(registrations.eventId, registrations.status);
  }

  const countMap = new Map<string, { confirmed: number; waitlisted: number }>();
  for (const row of rows) {
    countMap.set(row.id, { confirmed: 0, waitlisted: 0 });
  }
  for (const c of counts) {
    const existing = countMap.get(c.eventId);
    if (existing) {
      if (c.status === "confirmed") existing.confirmed = c.count;
      if (c.status === "waitlisted") existing.waitlisted = c.count;
    }
  }

  return rows.map((row) => {
    const counts = countMap.get(row.id) ?? { confirmed: 0, waitlisted: 0 };
    return toEventDto(row, counts.confirmed, counts.waitlisted);
  });
}

export async function getEvent(orgId: string, eventId: string): Promise<EventDto | null> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.orgId, orgId), eq(events.id, eventId)))
    .limit(1);

  if (!rows[0]) return null;

  const counts = await db
    .select({
      status: registrations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(registrations)
    .where(and(eq(registrations.orgId, orgId), eq(registrations.eventId, eventId)))
    .groupBy(registrations.status);

  const confirmed = counts.find((c) => c.status === "confirmed")?.count ?? 0;
  const waitlisted = counts.find((c) => c.status === "waitlisted")?.count ?? 0;

  return toEventDto(rows[0], confirmed, waitlisted);
}

export async function createEvent(
  orgId: string,
  createdById: string,
  input: CreateEventRequest,
): Promise<EventDto> {
  const rows = await db
    .insert(events)
    .values({
      orgId,
      createdById,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      date: input.date,
      time: input.time,
      duration: input.duration,
      maxCapacity: input.maxCapacity ?? null,
      location: input.location ?? null,
      status: input.status ?? "upcoming",
      visibility: input.visibility ?? "unpublished",
      recurring: input.recurring ?? false,
      recurrenceFrequency: input.recurrenceFrequency ?? null,
      recurrenceDays: input.recurrenceDays ?? [],
      recurrenceInterval: input.recurrenceInterval ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null,
      price: input.price ?? "0",
    })
    .returning();

  return toEventDto(rows[0], 0, 0);
}

export async function updateEvent(
  orgId: string,
  eventId: string,
  input: UpdateEventRequest,
): Promise<EventDto | null> {
  const rows = await db
    .update(events)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(events.orgId, orgId), eq(events.id, eventId)))
    .returning();

  if (!rows[0]) return null;

  const counts = await db
    .select({
      status: registrations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(registrations)
    .where(and(eq(registrations.orgId, orgId), eq(registrations.eventId, eventId)))
    .groupBy(registrations.status);

  const confirmed = counts.find((c) => c.status === "confirmed")?.count ?? 0;
  const waitlisted = counts.find((c) => c.status === "waitlisted")?.count ?? 0;

  return toEventDto(rows[0], confirmed, waitlisted);
}

export async function deleteEvent(orgId: string, eventId: string): Promise<boolean> {
  const rows = await db
    .delete(events)
    .where(and(eq(events.orgId, orgId), eq(events.id, eventId)))
    .returning({ id: events.id });

  return rows.length > 0;
}

export async function duplicateEvent(
  orgId: string,
  createdById: string,
  eventId: string,
): Promise<EventDto | null> {
  const source = await getEvent(orgId, eventId);
  if (!source) return null;

  return createEvent(orgId, createdById, {
    title: `${source.title} Copy`,
    description: source.description,
    category: source.category,
    date: source.date,
    time: source.time,
    duration: source.duration,
    maxCapacity: source.maxCapacity,
    location: source.location,
    status: source.status,
    visibility: "unpublished",
    recurring: source.recurring,
    recurrenceFrequency: source.recurrenceFrequency,
    recurrenceDays: source.recurrenceDays,
    recurrenceInterval: source.recurrenceInterval,
    recurrenceEndDate: source.recurrenceEndDate,
    price: source.price,
  });
}

export async function listEventResources(
  orgId: string,
  eventId: string,
): Promise<EventResourceDto[]> {
  const rows = await db
    .select()
    .from(eventResources)
    .where(and(eq(eventResources.orgId, orgId), eq(eventResources.eventId, eventId)));

  return rows.map(toEventResourceDto);
}

export async function replaceEventResources(
  orgId: string,
  eventId: string,
  input: Array<{ resourceId: string; role: string; quantity?: number }>,
): Promise<EventResourceDto[] | "event_not_found" | "resource_not_found"> {
  const event = await getEvent(orgId, eventId);
  if (!event) return "event_not_found";

  const resourceIds = [...new Set(input.map((assignment) => assignment.resourceId))];
  if (resourceIds.length > 0) {
    const ownedResources = await db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.orgId, orgId), inArray(resources.id, resourceIds)));
    if (ownedResources.length !== resourceIds.length) return "resource_not_found";
  }

  await db
    .delete(eventResources)
    .where(and(eq(eventResources.orgId, orgId), eq(eventResources.eventId, eventId)));

  if (input.length === 0) return [];

  const rows = await db
    .insert(eventResources)
    .values(
      input.map((assignment) => ({
        orgId,
        eventId,
        resourceId: assignment.resourceId,
        role: assignment.role,
        quantity: assignment.quantity ?? 1,
      })),
    )
    .returning();

  return rows.map(toEventResourceDto);
}
