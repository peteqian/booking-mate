import Stripe from "stripe";
import type { Money } from "@workspace/contracts";
import { requireStripeEnv } from "../env";
import {
  AdapterConfigError,
  InvalidSignatureError,
  type CheckoutSession,
  type CreateCheckoutInput,
  type ExchangedAccount,
  type NormalizedPaymentEvent,
  type PaymentProviderAdapter,
  type RefundInput,
  type RefundResult,
} from "./adapter";

let cachedClient: Stripe | null = null;

function client(): Stripe {
  if (!cachedClient) {
    const { secretKey } = requireStripeEnv();
    cachedClient = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return cachedClient;
}

function moneyToStripeAmount(money: Money): number {
  return money.amount;
}

export function createStripeAdapter(): PaymentProviderAdapter {
  return {
    provider: "stripe",

    buildOnboardingUrl({ state, redirectUri }) {
      const { clientId } = requireStripeEnv();
      const url = new URL("https://connect.stripe.com/oauth/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("scope", "read_write");
      url.searchParams.set("state", state);
      url.searchParams.set("redirect_uri", redirectUri);
      return url.toString();
    },

    async exchangeOAuthCode({ code }): Promise<ExchangedAccount> {
      const stripe = client();
      const tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });
      const stripeUserId = tokenResponse.stripe_user_id;
      if (!stripeUserId) {
        throw new AdapterConfigError("stripe oauth response missing stripe_user_id");
      }
      const account = await stripe.accounts.retrieve(stripeUserId);
      const currency = (account.default_currency ?? "usd").toUpperCase();
      return {
        accountId: stripeUserId,
        currency,
        metadata: {
          livemode: tokenResponse.livemode,
          scope: tokenResponse.scope,
          country: account.country,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          email: account.email,
          rawAccount: account,
        },
      };
    },

    async createCheckout(connectionAccountId, input: CreateCheckoutInput): Promise<CheckoutSession> {
      const stripe = client();
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: input.amount.currency.toLowerCase(),
                unit_amount: moneyToStripeAmount(input.amount),
                product_data: {
                  name: input.title,
                  ...(input.description ? { description: input.description } : {}),
                },
              },
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          expires_at: Math.floor(input.expiresAt.getTime() / 1000),
          client_reference_id: input.registrationId,
          metadata: {
            registrationId: input.registrationId,
            eventId: input.eventId,
            orgId: input.orgId,
          },
          payment_intent_data: {
            metadata: {
              registrationId: input.registrationId,
              eventId: input.eventId,
              orgId: input.orgId,
            },
          },
        },
        {
          stripeAccount: connectionAccountId,
          idempotencyKey: input.idempotencyKey,
        },
      );
      if (!session.url) {
        throw new AdapterConfigError("stripe checkout session created without url");
      }
      return { sessionId: session.id, url: session.url };
    },

    async refundPayment(connectionAccountId, input: RefundInput): Promise<RefundResult> {
      const stripe = client();
      const refund = await stripe.refunds.create(
        {
          payment_intent: input.paymentReference,
          ...(input.amount ? { amount: moneyToStripeAmount(input.amount) } : {}),
          ...(input.reason ? { reason: mapRefundReason(input.reason) } : {}),
        },
        {
          stripeAccount: connectionAccountId,
          idempotencyKey: input.idempotencyKey,
        },
      );
      return {
        refundId: refund.id,
        status: mapRefundStatus(refund.status),
        raw: refund as unknown as Record<string, unknown>,
      };
    },

    verifyAndParse(headers, rawBody): NormalizedPaymentEvent | null {
      const { webhookSecret } = requireStripeEnv();
      const sig = headers["stripe-signature"];
      if (!sig) {
        throw new InvalidSignatureError("missing stripe-signature header");
      }
      const stripe = client();
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err) {
        throw new InvalidSignatureError(
          err instanceof Error ? err.message : "invalid stripe signature",
        );
      }
      return mapStripeEvent(event);
    },

    async expireCheckout(connectionAccountId, sessionId) {
      const stripe = client();
      await stripe.checkout.sessions.expire(
        sessionId,
        undefined,
        { stripeAccount: connectionAccountId },
      );
    },
  };
}

function mapStripeEvent(event: Stripe.Event): NormalizedPaymentEvent | null {
  const providerEventId = event.id;
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return null;
      const ref = paymentReferenceFromSession(session);
      if (!ref) return null;
      return { type: "payment.completed", paymentReference: ref, providerEventId };
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const ref = paymentReferenceFromSession(session);
      if (!ref) return null;
      return { type: "payment.expired", paymentReference: ref, providerEventId };
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        type: "payment.failed",
        paymentReference: intent.id,
        providerEventId,
        reason: intent.last_payment_error?.message,
      };
    }
    case "charge.refunded":
    case "refund.created":
    case "refund.updated": {
      const refund =
        event.type === "charge.refunded"
          ? extractRefundFromCharge(event.data.object as Stripe.Charge)
          : (event.data.object as Stripe.Refund);
      if (!refund) return null;
      const ref = typeof refund.payment_intent === "string" ? refund.payment_intent : null;
      if (!ref) return null;
      return {
        type: "payment.refunded",
        paymentReference: ref,
        providerEventId,
        providerRefundId: refund.id,
        amount: refund.amount
          ? { amount: refund.amount, currency: (refund.currency ?? "usd").toUpperCase() }
          : undefined,
        status: mapRefundStatus(refund.status),
      };
    }
    default:
      return null;
  }
}

function paymentReferenceFromSession(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  if (session.payment_intent && "id" in session.payment_intent) return session.payment_intent.id;
  return session.id;
}

function extractRefundFromCharge(charge: Stripe.Charge): Stripe.Refund | null {
  const refunds = charge.refunds;
  if (!refunds || !refunds.data || refunds.data.length === 0) return null;
  return refunds.data[refunds.data.length - 1];
}

function mapRefundStatus(status: string | null | undefined): RefundResult["status"] {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

function mapRefundReason(reason: string): Stripe.RefundCreateParams.Reason | undefined {
  if (reason === "duplicate" || reason === "fraudulent" || reason === "requested_by_customer") {
    return reason;
  }
  return undefined;
}
