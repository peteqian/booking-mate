# Resources

## Scope

Resources are first-class. Events are visible booking objects, but resources are the underlying things assigned to events and future booking flows.

Status: backend resource service + API + schema with `resourceType` enum (instructor/material/location/custom) implemented. Frontend `resources.tsx` is `<PlaceholderPage>`. Event-side assignment UI works via event detail/edit.

Included:

- [~] Instructors. (backend yes; resources page no)
- [~] Materials. (backend yes; resources page no)
- [~] Locations. (backend yes; resources page no)
- [~] Custom resource types. (backend yes; resources page no)
- [x] Assign resources to events.

## Resource Types

### Instructor

Fields:

- Name.
- Email.
- Phone.
- Bio.
- Metadata.

### Material

Fields:

- Name.
- Description.
- URL.
- Quantity or metadata.

### Location

Fields:

- Name.
- Address.
- Capacity.
- Notes.

### Custom

Fields:

- Name.
- Description.
- Metadata.

## Event Assignment

- [x] Events can have many resources through `event_resources`.

Examples:

- [x] One primary instructor.
- [x] One location.
- [x] Multiple materials.
- [x] Equipment quantity.

## UI

Resources page:

- [ ] Tabs or filter chips for resource types.
- [ ] Create/edit/delete resource.
- [ ] Search resources.
- [ ] Basic list/table per type.

Event form:

- [x] Assign instructor resources.
- [x] Assign location resource.
- [x] Assign material resources.

## Deferred

- Availability calendars.
- Conflict detection.
- Resource-specific booking pages.
- Appointment scheduling.
