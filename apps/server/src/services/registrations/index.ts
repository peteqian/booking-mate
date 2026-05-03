import type {
  CreateRegistrationRequest,
  RegistrationDto,
  UpdateRegistrationRequest,
} from "@workspace/contracts";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { attendees, events, registrations } from "../../db/schema";

export function toRegistrationDto(
  registration: typeof registrations.$inferSelect,
): RegistrationDto {
  return {
    id: registration.id,
    orgId: registration.orgId,
    eventId: registration.eventId,
    attendeeId: registration.attendeeId,
    status: registration.status,
    paymentStatus: registration.paymentStatus,
    checkoutSessionId: registration.checkoutSessionId,
    paymentProvider: registration.paymentProvider,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
  };
}

export async function listRegistrations(orgId: string): Promise<RegistrationDto[]> {
  const rows = await db.select().from(registrations).where(eq(registrations.orgId, orgId));
  return rows.map(toRegistrationDto);
}

export async function listRegistrationsByEvent(
  orgId: string,
  eventId: string,
): Promise<RegistrationDto[]> {
  const rows = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.orgId, orgId), eq(registrations.eventId, eventId)));

  return rows.map(toRegistrationDto);
}

export async function createRegistration(
  orgId: string,
  input: CreateRegistrationRequest,
): Promise<RegistrationDto | "event_not_found" | "attendee_not_found" | "duplicate_registration"> {
  const eventRows = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.orgId, orgId), eq(events.id, input.eventId)))
    .limit(1);
  if (!eventRows[0]) return "event_not_found";

  const attendeeRows = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(and(eq(attendees.orgId, orgId), eq(attendees.id, input.attendeeId)))
    .limit(1);
  if (!attendeeRows[0]) return "attendee_not_found";

  const existing = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.orgId, orgId),
        eq(registrations.eventId, input.eventId),
        eq(registrations.attendeeId, input.attendeeId),
        ne(registrations.status, "cancelled"),
      ),
    )
    .limit(1);
  if (existing[0]) return "duplicate_registration";

  const rows = await db
    .insert(registrations)
    .values({
      orgId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      status: input.status ?? "confirmed",
      paymentStatus: input.paymentStatus ?? "not_required",
    })
    .returning();

  return toRegistrationDto(rows[0]);
}

export async function updateRegistration(
  orgId: string,
  registrationId: string,
  input: UpdateRegistrationRequest,
): Promise<RegistrationDto | null> {
  const rows = await db
    .update(registrations)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(registrations.orgId, orgId), eq(registrations.id, registrationId)))
    .returning();

  return rows[0] ? toRegistrationDto(rows[0]) : null;
}

export async function deleteRegistration(orgId: string, registrationId: string): Promise<boolean> {
  const rows = await db
    .delete(registrations)
    .where(and(eq(registrations.orgId, orgId), eq(registrations.id, registrationId)))
    .returning({ id: registrations.id });

  return rows.length > 0;
}
