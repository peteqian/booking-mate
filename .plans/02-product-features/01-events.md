# Events

## Scope

Events are the primary user-facing booking object.

Events are the second product milestone after organization activation. The first useful loop is: create organization, create event, see event in dashboard.

Included:

- CRUD.
- Publish/unpublish/archive visibility.
- Status lifecycle: upcoming, completed, cancelled.
- Capacity.
- Waitlist support through registrations.
- Recurrence fields.
- Kanban view.
- Table filters and sorting.
- Duplicate event.
- Resource assignments.
- Price field for paid events.

## Event Fields

Required:

- Title.
- Date.
- Time.
- Duration.
- Max capacity.
- Category.
- Visibility.

Optional:

- Description.
- Location text.
- Assigned location resource.
- Assigned instructor resources.
- Assigned material resources.
- Price.
- Recurrence settings.

## Behavior

- New events default to `upcoming` and `unpublished`.
- Published events appear on public booking pages if status is `upcoming`.
- Archived events remain visible to team members but not public visitors.
- Cancelled events are hidden from public booking by default.
- Duplicate creates a new upcoming event with copied fields and no registrations.

## Recurrence

MVP stores recurrence configuration on the event. Expansion into individual generated event instances can be deferred until recurring behavior must support per-instance edits.

Plan for:

- `daily`, `weekly`, `biweekly`, `monthly`, `yearly`, `custom`.
- Interval.
- Days of week.
- End date.

## UI

Events page:

- Search by title and description.
- Filter by category.
- Filter by status.
- Filter by visibility.
- Toggle table/kanban.
- Create/edit modal.
- Detail modal with registrations, resources, payment status, and actions.

Kanban:

- Columns: upcoming, completed, cancelled.
- Drag/drop updates status.

Table:

- Sort by title, date, status, registration count, visibility, category, price, location.

## Permissions

- Viewer: read.
- Manager: create/update/duplicate.
- Admin: delete.
- Owner: all.
