# Attendees and Registrations

## Scope

Attendees are people who register for events. Registrations link attendees to events.

Included:

- Email required.
- Duplicate prevention.
- Manual attendee creation.
- Registration statuses.
- Payment statuses.
- Capacity and waitlist behavior.

## Attendee Rules

- Attendee email is required.
- Email is normalized to lowercase.
- `(orgId, email)` is unique.
- Phone is optional.

## Registration Rules

- One active registration per attendee per event.
- Cancelled registrations do not block future registration.
- If confirmed registration count is below event capacity, new registration is `confirmed`.
- If event is full, new registration is `waitlisted`.
- Free events get `paymentStatus = not_required`.
- Paid events get `paymentStatus = pending` until provider confirms payment.

## Statuses

Registration status:

- `confirmed`.
- `waitlisted`.
- `cancelled`.

Payment status:

- `not_required`.
- `pending`.
- `paid`.
- `refunded`.
- `expired`.

## Public Registration Flow

1. Visitor opens public event.
2. Visitor enters name, email, and optional phone.
3. Server resolves or creates attendee by email.
4. Server checks duplicate active registration.
5. Server checks capacity and assigns registration status.
6. Server assigns payment status.
7. If paid and provider is connected, frontend proceeds to checkout.

## Team Registration Flow

Managers can manually create attendees and registrations from the dashboard.

## Waitlist Promotion

Initial behavior:

- Cancelled confirmed registrations free capacity.
- Manual promotion from waitlisted to confirmed is acceptable for MVP.

Later behavior:

- Auto-promote oldest waitlisted attendee when capacity opens.
- Notify promoted attendee via email template.
