# Public Booking Pages

## Scope

Public booking pages are a first-class distribution channel for each organization.

Included:

- Slug URL: `/book/:slug`.
- Subdomain URL: `{org}.domain.com`.
- Custom domain support.
- Public event search/filter.
- Public registration.
- SEO metadata.
- Org branding.

## Routing

MVP:

- `/book/:slug`: public org event list.
- `/book/:slug/events/:eventId`: event detail.

Production target:

- `{orgSlug}.bookingmate.app` resolves to the same public booking experience.
- Custom domains resolve by host lookup.

## Public API

- `GET /api/public/orgs/:slug`: returns safe org details and settings.
- `GET /api/public/orgs/:slug/events`: returns published upcoming events with counts.
- `GET /api/public/orgs/:slug/events/:eventId`: returns event detail.
- `POST /api/public/orgs/:slug/events/:eventId/register`: creates registration.

## Public Data Rules

Expose only:

- Org name, slug, logo.
- Public-safe settings: categories, category configs, currency.
- Published and upcoming event details.
- Registration counts, not attendee lists.
- Connected payment provider names, not account IDs.

## SEO

Each public page should set:

- Title.
- Description.
- Canonical URL.
- Open Graph title/description.
- Structured data for event detail pages.

## Branding

Public pages use:

- Org logo.
- Org name.
- Category color/icon configuration.
- Contact email where appropriate.
