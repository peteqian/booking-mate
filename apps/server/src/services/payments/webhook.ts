import { and, eq, isNotNull } from "drizzle-orm";
import { isPaymentProvider } from "@workspace/contracts";
import { db } from "../../db";
import { paymentRefunds, registrations, webhookEvents } from "../../db/schema";
import { getAdapter, isAdapterAvailable } from "../../payments/registry";
import { InvalidSignatureError, type NormalizedPaymentEvent } from "../../payments/adapter";

export type WebhookOutcome =
  | { type: "ok" }
  | { type: "ignored" }
  | { type: "duplicate" }
  | { type: "invalid_signature" }
  | { type: "unknown_provider" }
  | { type: "provider_not_configured" };

export async function handleWebhook(input: {
  provider: string;
  headers: Record<string, string | undefined>;
  rawBody: string;
}): Promise<WebhookOutcome> {
  if (!isPaymentProvider(input.provider)) {
    return { type: "unknown_provider" };
  }
  if (!isAdapterAvailable(input.provider)) {
    return { type: "provider_not_configured" };
  }
  const adapter = getAdapter(input.provider);

  let normalized: NormalizedPaymentEvent | null;
  try {
    normalized = adapter.verifyAndParse(input.headers, input.rawBody);
  } catch (err) {
    if (err instanceof InvalidSignatureError) return { type: "invalid_signature" };
    throw err;
  }
  if (!normalized) return { type: "ignored" };

  // Dedupe + apply atomically.
  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(webhookEvents)
      .values({
        provider: input.provider,
        providerEventId: normalized.providerEventId,
        payload: { type: normalized.type } as Record<string, unknown>,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });

    if (inserted.length === 0) {
      return "duplicate" as const;
    }

    await applyEvent(tx, input.provider, normalized);
    return "ok" as const;
  });

  return result === "duplicate" ? { type: "duplicate" } : { type: "ok" };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyEvent(
  tx: Tx,
  provider: string,
  event: NormalizedPaymentEvent,
): Promise<void> {
  switch (event.type) {
    case "payment.completed":
      await markPaid(tx, event.paymentReference);
      break;
    case "payment.expired":
      await markExpired(tx, event.paymentReference);
      break;
    case "payment.failed":
      await markFailed(tx, event.paymentReference);
      break;
    case "payment.refunded":
      await applyRefund(tx, provider, event);
      break;
  }
}

async function markPaid(tx: Tx, paymentReference: string) {
  await tx
    .update(registrations)
    .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
    .where(matchPaymentReference(paymentReference));
}

async function markExpired(tx: Tx, paymentReference: string) {
  await tx
    .update(registrations)
    .set({ paymentStatus: "expired", status: "cancelled", updatedAt: new Date() })
    .where(matchPaymentReference(paymentReference));
}

async function markFailed(tx: Tx, paymentReference: string) {
  await tx
    .update(registrations)
    .set({ paymentStatus: "failed", status: "cancelled", updatedAt: new Date() })
    .where(matchPaymentReference(paymentReference));
}

async function applyRefund(
  tx: Tx,
  provider: string,
  event: Extract<NormalizedPaymentEvent, { type: "payment.refunded" }>,
) {
  const existing = await tx
    .select()
    .from(paymentRefunds)
    .where(
      and(
        eq(paymentRefunds.provider, provider),
        eq(paymentRefunds.providerRefundId, event.providerRefundId),
      ),
    )
    .limit(1);

  const settled = event.amount?.amount ?? null;
  const status = event.status;
  const settledAt = status === "succeeded" || status === "failed" ? new Date() : null;

  if (existing[0]) {
    await tx
      .update(paymentRefunds)
      .set({
        settledAmount: settled ?? existing[0].settledAmount,
        status,
        settledAt,
        updatedAt: new Date(),
      })
      .where(eq(paymentRefunds.id, existing[0].id));
  } else {
    // Refund originated from provider dashboard. Create row.
    const regRows = await tx
      .select({
        id: registrations.id,
        paymentReference: registrations.checkoutSessionId,
        paymentIntent: registrations.checkoutSessionId,
      })
      .from(registrations)
      .where(matchPaymentReference(event.paymentReference))
      .limit(1);
    const reg = regRows[0];
    if (!reg) return;

    await tx.insert(paymentRefunds).values({
      registrationId: reg.id,
      provider,
      providerRefundId: event.providerRefundId,
      paymentReference: event.paymentReference,
      requestedAmount: settled ?? 0,
      settledAmount: settled,
      currency: event.amount?.currency ?? "USD",
      status,
      settledAt,
    });
  }

  // Flip registration paymentStatus when refund succeeds AND amount equals full payment.
  // v1 simple: any successful refund flips to refunded.
  if (status === "succeeded") {
    await tx
      .update(registrations)
      .set({ paymentStatus: "refunded", updatedAt: new Date() })
      .where(matchPaymentReference(event.paymentReference));
  }
}

function matchPaymentReference(paymentReference: string) {
  return and(
    isNotNull(registrations.checkoutSessionId),
    eq(registrations.checkoutSessionId, paymentReference),
  );
}
