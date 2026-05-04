import type {
  AttendeeDto,
  CreateRegistrationRequest,
  RegistrationDto,
  UpdateRegistrationRequest,
} from "@workspace/contracts";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { attendees, events, registrations } from "../../db/schema";

export interface RegistrationWithAttendeeDto extends RegistrationDto {
  attendee: AttendeeDto;
}

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

function toAttendeeDto(attendee: typeof attendees.$inferSelect): AttendeeDto {
  return {
    id: attendee.id,
    orgId: attendee.orgId,
    name: attendee.name,
    email: attendee.email,
    phone: attendee.phone,
    createdAt: attendee.createdAt.toISOString(),
    updatedAt: attendee.updatedAt.toISOString(),
  };
}

export async function listRegistrations(orgId: string): Promise<RegistrationDto[]> {
  const rows = await db.select().from(registrations).where(eq(registrations.orgId, orgId));
  return rows.map(toRegistrationDto);
}

export async function listRegistrationsByEvent(
  orgId: string,
  eventId: string,
): Promise<RegistrationWithAttendeeDto[]> {
  const rows = await db
    .select()
    .from(registrations)
    .innerJoin(attendees, eq(registrations.attendeeId, attendees.id))
    .where(and(eq(registrations.orgId, orgId), eq(registrations.eventId, eventId)));

  return rows.map((row) => ({
    ...toRegistrationDto(row.registrations),
    attendee: toAttendeeDto(row.attendees),
  }));
}

export async function createRegistration(
  orgId: string,
  input: CreateRegistrationRequest,
): Promise<RegistrationDto | "event_not_found" | "attendee_not_found" | "duplicate_registration"> {
  const eventRows = await db
    .select({ id: events.id, maxCapacity: events.maxCapacity, price: events.price })
    .from(events)
    .where(and(eq(events.orgId, orgId), eq(events.id, input.eventId)))
    .limit(1);
  if (!eventRows[0]) return "event_not_found";
  const event = eventRows[0];

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

  // Determine registration status based on capacity
  let status = input.status ?? "confirmed";
  if (status === "confirmed" && event.maxCapacity !== null && event.maxCapacity > 0) {
    const confirmedCount = await db
      .select({ count: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.orgId, orgId),
          eq(registrations.eventId, input.eventId),
          eq(registrations.status, "confirmed"),
        ),
      );
    if (confirmedCount.length >= event.maxCapacity) {
      status = "waitlisted";
    }
  }

  // Determine payment status based on event price
  let paymentStatus = input.paymentStatus ?? "not_required";
  if (paymentStatus === "not_required" && Number(event.price) > 0) {
    paymentStatus = "pending";
  }

  const rows = await db
    .insert(registrations)
    .values({
      orgId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      status,
      paymentStatus,
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
