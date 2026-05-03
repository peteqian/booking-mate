# Stripe Connect

## Scope

Stripe Connect is the first payment provider.

Organizations connect their own Stripe accounts. Booking Mate creates checkout sessions on behalf of connected accounts for paid event registrations.

## Environment

- `STRIPE_SECRET_KEY`.
- `STRIPE_CLIENT_ID`.
- `STRIPE_WEBHOOK_SECRET`.

## Connect Flow

1. Admin starts connect from settings.
2. Server creates OAuth state containing org ID and provider.
3. User completes Stripe OAuth.
4. Server verifies state and exchanges code.
5. Server stores `payment_connections` row with provider `stripe`.
6. User returns to settings.

## Checkout Flow

- Create Stripe Checkout Session with `stripeAccount` set to connected account ID.
- Store metadata: registration ID, event ID, org ID.
- Use org currency.
- Return checkout URL.

## Webhooks

Handle:

- `checkout.session.completed` -> `payment.completed`.
- Refund event -> `payment.refunded`.
- `checkout.session.expired` -> `payment.expired`.

## Security

- Verify Stripe signatures server-side.
- Never expose secret keys to the client.
- Use OAuth state to prevent CSRF.
- Treat connected account IDs as identifiers, not secrets.
