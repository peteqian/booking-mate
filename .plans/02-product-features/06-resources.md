# Resources

## Scope

Resources are first-class. Events are visible booking objects, but resources are the underlying things assigned to events and future booking flows.

Included:

- Instructors.
- Materials.
- Locations.
- Custom resource types.
- Assign resources to events.

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

Events can have many resources through `event_resources`.

Examples:

- One primary instructor.
- One location.
- Multiple materials.
- Equipment quantity.

## UI

Resources page:

- Tabs or filter chips for resource types.
- Create/edit/delete resource.
- Search resources.
- Basic list/table per type.

Event form:

- Assign instructor resources.
- Assign location resource.
- Assign material resources.

## Deferred

- Availability calendars.
- Conflict detection.
- Resource-specific booking pages.
- Appointment scheduling.
