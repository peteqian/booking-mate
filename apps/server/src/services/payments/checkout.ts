import { and, eq } from "drizzle-orm";
import { isPaymentProvider, type PaymentProvider } from "@workspace/contracts";
import { db } from "../../db";
import { events, organization, paymentConnections, registrations } from "../../db/schema";
import { getAdapter } from "../../payments/registry";

const CHECKOUT_TTL_MS = 15 * 60 * 1000;

export type CreateCheckoutOutcome =
  | { type: "ok"; url: string; sessionId: string }
  | {
      type: "error";
      code:
        | "registration_not_found"
        | "event_not_found"
        | "not_payable"
        | "no_provider"
        | "currency_mismatch";
      message: string;
    };

export async function createCheckoutForRegistration(input: {
  registrationId: string;
  orgSlug: string;
  successUrl: string;
  cancelUrl: string;
  preferredProvider?: string;
}): Promise<CreateCheckoutOutcome> {
  const orgRows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, input.orgSlug))
    .limit(1);
  if (!orgRows[0]) {
    return { type: "error", code: "registration_not_found", message: "Org not found" };
  }
  const orgId = orgRows[0].id;

  const regRows = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.id, input.registrationId), eq(registrations.orgId, orgId)))
    .limit(1);
  const registration = regRows[0];
  if (!registration) {
    return {
      type: "error",
      code: "registration_not_found",
      message: "Registration not found",
    };
  }

  if (registration.paymentStatus !== "pending" || registration.status !== "pending") {
    return {
      type: "error",
      code: "not_payable",
      message: "Registration is not awaiting payment",
    };
  }

  const eventRows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      price: events.price,
    })
    .from(events)
    .where(eq(events.id, registration.eventId))
    .limit(1);
  const event = eventRows[0];
  if (!event) {
    return { type: "error", code: "event_not_found", message: "Event not found" };
  }
  if (event.price <= 0) {
    return { type: "error", code: "not_payable", message: "Event is free" };
  }

  const connections = await db
    .select()
    .from(paymentConnections)
    .where(and(eq(paymentConnections.orgId, orgId), eq(paymentConnections.status, "active")));
  if (connections.length === 0) {
    return { type: "error", code: "no_provider", message: "No payment provider connected" };
  }

  let connection = connections[0];
  if (input.preferredProvider) {
    const match = connections.find((c) => c.provider === input.preferredProvider);
    if (!match) {
      return {
        type: "error",
        code: "no_provider",
        message: `Provider not connected: ${input.preferredProvider}`,
      };
    }
    connection = match;
  }
  if (!isPaymentProvider(connection.provider)) {
    return { type: "error", code: "no_provider", message: "Unknown provider" };
  }

  const provider: PaymentProvider = connection.provider;
  const adapter = getAdapter(provider);

  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
  const idempotencyKey = crypto.randomUUID();

  const session = await adapter.createCheckout(connection.accountId, {
    orgId,
    eventId: event.id,
    registrationId: registration.id,
    title: event.title,
    description: event.description,
    amount: { amount: event.price, currency: connection.currency },
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    expiresAt,
    idempotencyKey,
  });

  await db
    .update(registrations)
    .set({
      paymentProvider: provider,
      checkoutSessionId: session.sessionId,
      paymentIdempotencyKey: idempotencyKey,
      paymentExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(registrations.id, registration.id));

  return { type: "ok", url: session.url, sessionId: session.sessionId };
}
