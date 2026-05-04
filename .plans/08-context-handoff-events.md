# Context Handoff: Events Feature

## Current Focus

The active work is completing the `02-product-features/01-events.md` plan. The Events area is mostly implemented, but still needs a final integration pass around registration management, create-flow resource assignment, sorting parity, and action polish.

## Recent Changes

- Expanded the Events route into a full workspace with search, filters, list/kanban views, pagination, create event modal, duplicate, archive, and permission-aware actions.
- Added event detail editing with details and registrations tabs.
- Added event resource assignment support on the event detail page through a Resources tab.
- Added frontend resource API/query/mutation helpers:
  - `apps/web/src/lib/resources.ts`
  - `apps/web/src/queries/resources.ts`
  - `apps/web/src/hooks/use-resources.ts`
- Added registration counts to `EventDto`:
  - `confirmedRegistrations`
  - `waitlistedRegistrations`
- Updated server event listing/detail responses to include registration counts.
- Updated registration creation so capacity overflow becomes `waitlisted` and paid events default to `paymentStatus = pending`.
- Fixed Base UI dropdown composition in `apps/web/src/routes/events.tsx` by replacing Radix-style `asChild` with Base UI `render`.

## Verification

Last successful checks:

```bash
bun run typecheck
bun run lint
```

Both passed after the Base UI dropdown fix.

## Important Implementation Notes

- This project uses Base UI wrappers, not Radix UI. For composed triggers/items, use `render={<Component />}`, not `asChild`.
- The Events page currently uses a separate event detail route (`/event/$eventId`) rather than the plan's requested detail modal. This is an intentional practical deviation unless the product specifically requires modal-only detail.
- The current kanban drag/drop implementation uses a `window.dispatchEvent` bridge from drag handler to cards. It works, but should be replaced with direct local mutation wiring for a cleaner implementation.
- Resource assignment exists after an event is created, in the event detail Resources tab. It is not yet part of the create event modal.
- The Events list uses archive through `visibility = archived`; the action currently needs clearer copy/iconography so archive and delete are not visually conflated.

## Remaining Events Plan Gaps

From `.plans/02-product-features/01-events.md`, these are the remaining gaps to call Events complete:

1. Add resource assignment to the create event flow.
2. Add richer registration summary to event detail:
   - confirmed count
   - waitlisted count
   - capacity utilization
   - payment summary
3. Add manual registration creation from event detail.
4. Allow managers to update registration `paymentStatus`, not only registration `status`.
5. Add missing table sort keys:
   - registration count
   - location
6. Replace kanban global event bridge with direct mutation flow.
7. Polish archive/delete/list actions:
   - use archive icon/copy for archive
   - reserve destructive icon/copy for delete
   - make permission-disabled states clearer
8. Decide whether to keep the detail route or convert/open it as a modal to exactly match the Events plan.

## Recommended Next Steps

1. Implement registration summary cards and payment status editing in `apps/web/src/routes/event.$eventId.tsx`.
2. Add manual registration creation from event detail. This likely needs attendee lookup/creation UX or integration with the existing attendee APIs.
3. Add resource assignment fields to the create event modal in `apps/web/src/routes/events.tsx`; create the event first, then call `PUT /api/events/:eventId/resources` if assignments were selected.
4. Add `registrationCount` and `location` sorting support in the Events table.
5. Refactor kanban drag/drop so the drop handler calls the patch mutation directly.
6. Run `bun run typecheck` and `bun run lint` after each major step.

## Key Files

- Plan: `.plans/02-product-features/01-events.md`
- Events list/workspace: `apps/web/src/routes/events.tsx`
- Event detail/edit/resources/registrations: `apps/web/src/routes/event.$eventId.tsx`
- Event form/API helpers: `apps/web/src/lib/events.ts`
- Event mutations: `apps/web/src/hooks/use-events.ts`
- Event queries: `apps/web/src/queries/events.ts`
- Resource frontend helpers: `apps/web/src/lib/resources.ts`, `apps/web/src/queries/resources.ts`, `apps/web/src/hooks/use-resources.ts`
- Registration frontend helpers: `apps/web/src/lib/registrations.ts`, `apps/web/src/hooks/use-registrations.ts`, `apps/web/src/queries/registrations.ts`
- Server event service/routes: `apps/server/src/services/events/index.ts`, `apps/server/src/api/events.ts`
- Server registration service/routes: `apps/server/src/services/registrations/index.ts`, `apps/server/src/api/registrations.ts`
- Shared contracts: `packages/contracts/src/index.ts`

## Worktree Context

The worktree is dirty and includes both event-related changes and broader shell/navigation/design setup. Do not assume every changed file belongs only to Events.

Notable event-related files include:

- `apps/server/src/services/events/index.ts`
- `apps/server/src/services/public/index.ts`
- `apps/server/src/services/registrations/index.ts`
- `apps/web/src/hooks/use-events.ts`
- `apps/web/src/hooks/use-resources.ts`
- `apps/web/src/lib/events.ts`
- `apps/web/src/lib/resources.ts`
- `apps/web/src/queries/resources.ts`
- `apps/web/src/routes/event.$eventId.tsx`
- `apps/web/src/routes/events.tsx`
- `packages/contracts/src/index.ts`
