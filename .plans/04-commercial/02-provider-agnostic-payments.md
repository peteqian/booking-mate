# Provider-Agnostic Payments

## Scope

Payment architecture should support Stripe first and multiple providers later.

Included:

- Provider interface.
- Provider registry.
- Payment connections per organization.
- Public checkout after registration.
- Webhook reconciliation.
- Multi-provider selection design.
- Refund and expiry lifecycle.

## Provider Interface

Responsibilities:

- Generate provider connect URL.
- Handle OAuth callback.
- Disconnect account.
- Create checkout session.
- Verify webhook.
- Normalize provider webhook event.

## Normalized Events

- `payment.completed`.
- `payment.refunded`.
- `payment.expired`.

## Checkout Flow

1. Public registration is created.
2. Paid event creates registration with `paymentStatus = pending`.
3. If one provider is connected, auto-select it.
4. If multiple providers are connected, visitor chooses provider.
5. Server creates checkout session.
6. Server stores provider and session ID on registration.
7. Provider webhook updates payment status.

## Expiry and Refunds

- Expired pending payments should move to `expired` and may cancel the registration.
- Refund webhooks move payment status to `refunded`.
- Expired/cancelled paid registrations should free capacity.

## Provider Roadmap

- Phase 1: Stripe Connect.
- Phase 2: PayPal Commerce.
- Phase 3: Square.
