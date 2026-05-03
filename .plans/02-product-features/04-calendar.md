# Calendar

## Scope

Calendar is a management view for events.

Included:

- Month view.
- Day view.
- Week view.
- Click/drag to create events.
- Drag/drop to reschedule.
- Resize to change duration.

Excluded for now:

- Year heatmap.
- Resource availability conflict detection.

## Behavior

- Calendar shows all non-cancelled events by default.
- Events use category colors.
- Clicking an event opens event detail.
- Clicking an empty slot opens create event with date/time prefilled.
- Dragging a range opens create event with date/time/duration prefilled.
- Dragging an existing event updates date/time.
- Resizing an event updates duration.

## Safety

- Optimistic UI is acceptable if failed updates revert.
- Server remains source of truth.
- Drag/drop must respect role permissions.

## Future Resource Scheduling

Calendar data model should eventually support filtering by resource, but initial views are event-first.
