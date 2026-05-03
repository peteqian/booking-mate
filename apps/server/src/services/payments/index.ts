import type { PaymentConnectionDto } from "@workspace/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { paymentConnections } from "../../db/schema";

function toPaymentConnectionDto(
  connection: typeof paymentConnections.$inferSelect,
): PaymentConnectionDto {
  return {
    id: connection.id,
    orgId: connection.orgId,
    provider: connection.provider,
    accountId: connection.accountId,
    status: connection.status,
    metadata: connection.metadata,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

export function listPaymentProviders() {
  return { providers: [{ id: "stripe", name: "Stripe", enabled: false }] };
}

export async function listPaymentConnections(orgId: string): Promise<PaymentConnectionDto[]> {
  const rows = await db
    .select()
    .from(paymentConnections)
    .where(eq(paymentConnections.orgId, orgId));
  return rows.map(toPaymentConnectionDto);
}

export async function deletePaymentConnection(
  orgId: string,
  connectionId: string,
): Promise<boolean> {
  const rows = await db
    .delete(paymentConnections)
    .where(and(eq(paymentConnections.orgId, orgId), eq(paymentConnections.id, connectionId)))
    .returning({ id: paymentConnections.id });

  return rows.length > 0;
}
