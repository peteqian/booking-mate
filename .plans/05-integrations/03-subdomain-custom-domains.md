# Subdomains and Custom Domains

## Scope

Public booking pages should support slug routes, subdomains, and custom domains.

## Phases

### Phase 1: Slug Routes

- `/book/:slug`.
- Works locally and in all environments.
- Source of truth for initial public booking URLs.

### Phase 2: Subdomains

- `{orgSlug}.bookingmate.app`.
- Detect host on web app.
- Resolve org by subdomain slug.
- Keep path fallback for local development.

### Phase 3: Custom Domains

- Store custom domain on org settings or organization metadata.
- Resolve org by request host.
- Gate behind Pro plan.
- Add operational docs for DNS and SSL.

## CORS

Server CORS must allow trusted wildcard subdomains and configured custom domains without opening credentials to arbitrary origins.

## SEO

Canonical URL should prefer the custom domain if configured, otherwise subdomain, otherwise slug route.
