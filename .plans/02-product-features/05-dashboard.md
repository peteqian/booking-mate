# Dashboard

## Scope

Dashboard gives organization users a fast operational overview.

Included:

- Basic dashboard metrics.
- Analytics charts.
- Upcoming events.
- Registration trends.
- Category breakdown.
- Revenue summary when paid events exist.

## Metrics

- Total events.
- Upcoming events.
- Events this week.
- Confirmed registrations.
- Attendance/capacity utilization.
- Paid, pending, refunded revenue.

## Charts

- Registrations over time.
- Events by category.
- Optional revenue chart after payment lifecycle is stable.

## Empty States

- No events: prompt to create first event.
- No registrations: explain public booking URL.
- No payment data: hide revenue widgets until paid events exist.

## API

Use a server summary endpoint once dashboard computations become expensive:

- `GET /api/dashboard/summary`.

Until then, dashboard can derive from existing events/registrations data.
