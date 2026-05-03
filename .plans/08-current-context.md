# Current Context: Organization Activation to First Event

## Active Goal

Build the first useful product loop:

```txt
signup/login -> create org -> resolve active org -> dashboard -> create first event -> see event
```

This is the next implementation focus. Avoid continuing backend-first unless the backend change directly supports this loop.

## Why This Is Next

The plan hierarchy was reorganized around user value. Organization activation comes before event management, and event creation/viewing comes before resources, registrations, public booking, team settings, payments, and integrations.

The backend foundation is already broad enough for this loop:

- Auth/session exists through Better Auth.
- Better Auth organization creation exists.
- `GET /api/org` resolves active org server-side.
- Org settings read/update exists.
- Event CRUD exists.
- Server auth/org/role middleware exists.

The missing piece is the web flow that connects these pieces.

## Current Frontend State

Existing routes:

- `apps/web/src/routes/signup.tsx`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/onboarding.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/settings.tsx`

Current behavior:

- Signup redirects to `/onboarding`.
- Onboarding creates an organization through Better Auth.
- `/` redirects logged-in users without organizations to `/onboarding`.
- Dashboard only shows basic org info.
- There is no event list or event creation UI yet.

Main issue:

- Frontend org checks mostly use `authClient.organization.list()` instead of the server's active-org endpoint.

## Next Implementation Plan

### 1. Add Web API Helper

Create:

```txt
apps/web/src/lib/api.ts
```

Responsibilities:

- Base URL from `VITE_SERVER_URL || "http://localhost:3456"`.
- Include credentials for Better Auth cookies.
- Parse success JSON.
- Parse API error shape: `{ error: { code, message } }`.
- Export helpers for `GET`, `POST`, `PATCH`, `PUT`, `DELETE`.

### 2. Add Org API Helper

Create:

```txt
apps/web/src/lib/org.ts
```

Functions:

- `getCurrentOrg()` -> `GET /api/org`
- `getOrgSettings()` -> `GET /api/org/settings`
- `updateOrgSettings()` -> `PATCH /api/org/settings`

Use this for active-org checks. Keep Better Auth client for org creation and Better Auth-specific invite/delete flows.

### 3. Tighten Route Guards

Update route behavior:

- `/login`: if session exists, redirect to `/`.
- `/signup`: if session exists, redirect to `/`.
- `/onboarding`: if no session, redirect to `/login`; if active org resolves through `/api/org`, redirect to `/`; if server returns `organization_required`, stay on onboarding.
- `/`: if session but no org, redirect to `/onboarding`; if session and org, show dashboard.

### 4. Expand Onboarding Minimal Fields

Add fields:

- organization name
- slug
- contact email
- currency

Submit flow:

1. `authClient.organization.create({ name, slug })`
2. `PATCH /api/org/settings` with `contactEmail` and `currency`
3. Redirect to `/`

Do not add logo, categories, team invites, or first-event shortcut yet.

### 5. Dashboard First-Event CTA

Update `apps/web/src/routes/index.tsx`:

- Fetch current org via `GET /api/org`.
- Fetch events via `GET /api/events`.
- If no events, show empty state with “Create your first event”.
- If events exist, show a simple event list.

### 6. Minimal Event Creation UI

On the dashboard, add a small create-event form using:

- `GET /api/events`
- `POST /api/events`

Initial fields:

- title
- date
- time
- duration
- maxCapacity
- category
- visibility
- optional description
- optional location
- optional price

After create:

- refresh events list
- clear form
- show the created event after reload

## Explicitly Not In Scope Yet

- Full app shell/navigation.
- Dedicated `/events` route.
- Event edit/delete UI.
- Resource UI.
- Registration UI.
- Public booking UI.
- Member role UI.
- Invite UI rewrite.
- Payments or checkout.
- Bruno collection.

## Verification

Run:

```bash
bun run typecheck
bun run lint
bun run build
```

Manual QA:

- Logged-out user can reach `/` and see sign-in CTA.
- New signup redirects to onboarding.
- Onboarding creates org settings and redirects to dashboard.
- Refreshing dashboard still resolves org.
- Dashboard creates an event.
- Created event appears after reload.
- Users without org cannot call org-scoped event APIs.

## Current Backend Notes

Already implemented:

- `GET /api/org`
- `GET /api/org/settings`
- `PATCH /api/org/settings`
- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:eventId`
- `PATCH /api/events/:eventId`
- `DELETE /api/events/:eventId`
- `POST /api/events/:eventId/duplicate`

Known intentional placeholders:

- `POST /api/org/invites`
- payment connect/callback
- public checkout
