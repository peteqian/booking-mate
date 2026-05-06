import { useDraggable, useDroppable } from "@dnd-kit/react";
import { Repeat } from "lucide-react";
import { useMemo } from "react";
import type { EventDto } from "@workspace/contracts";
import { cn } from "@/lib/utils";
import {
  dateKey,
  endTimeString,
  eventsByDate,
  getEventColor,
  shortTime,
  type EventInstance,
} from "./event-utils";
import { formatHour } from "./week-view";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export interface DayViewProps {
  currentDate: Date;
  events: EventDto[];
  canManage: boolean;
  onEventClick: (event: EventDto) => void;
  onSlotClick: (dateKey: string, time: string) => void;
}

export function DayView({ currentDate, events, canManage, onEventClick, onSlotClick }: DayViewProps) {
  const key = dateKey(currentDate);
  const byDate = useMemo(() => {
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59);
    return eventsByDate(events, start, end);
  }, [events, currentDate]);

  const dayEvents = byDate.get(key) ?? [];

  if (dayEvents.length === 0) {
    return (
      <div className="flex flex-col">
        <DayEmpty />
        <div>
          {HOURS.map((hour) => (
            <HourLine
              key={hour}
              dateKey={key}
              hour={hour}
              events={[]}
              canManage={canManage}
              onEventClick={onEventClick}
              onSlotClick={onSlotClick}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {HOURS.map((hour) => {
        const hourStr = String(hour).padStart(2, "0");
        const slotEvents = dayEvents.filter((instance) =>
          shortTime(instance.event.time).startsWith(hourStr),
        );
        return (
          <HourLine
            key={hour}
            dateKey={key}
            hour={hour}
            events={slotEvents}
            canManage={canManage}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        );
      })}
    </div>
  );
}

function DayEmpty() {
  return (
    <div className="border-b bg-muted/20 px-4 py-2 text-center text-[11px] text-muted-foreground">
      No events scheduled. Click an hour to add one.
    </div>
  );
}

interface HourLineProps {
  dateKey: string;
  hour: number;
  events: EventInstance[];
  canManage: boolean;
  onEventClick: (event: EventDto) => void;
  onSlotClick: (dateKey: string, time: string) => void;
}

function HourLine({
  dateKey: key,
  hour,
  events,
  canManage,
  onEventClick,
  onSlotClick,
}: HourLineProps) {
  const hourStr = String(hour).padStart(2, "0");
  const time = `${hourStr}:00`;
  const { ref, isDropTarget } = useDroppable({
    id: `dayslot:${key}:${time}`,
    type: "slot",
    accept: "event",
    data: { dateKey: key, time },
  });

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] border-b last:border-b-0">
      <div className="pt-1.5 pr-2 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
        {formatHour(hour)}
      </div>
      <div
        ref={ref}
        onClick={() => events.length === 0 && onSlotClick(key, time)}
        className={cn(
          "flex min-h-14 flex-col gap-1 border-l border-border/60 p-1 transition-colors",
          events.length === 0 && "cursor-pointer hover:bg-primary/5",
          isDropTarget && "ring-2 ring-inset ring-primary/60",
        )}
      >
        {events.map((instance) => (
          <DayEventChip
            key={instance.instanceKey}
            instance={instance}
            canManage={canManage}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

interface DayEventChipProps {
  instance: EventInstance;
  canManage: boolean;
  onEventClick: (event: EventDto) => void;
}

function DayEventChip({ instance, canManage, onEventClick }: DayEventChipProps) {
  const event = instance.event;
  const { ref, isDragSource } = useDraggable({
    id: `event:${instance.instanceKey}`,
    type: "event",
    disabled: !canManage,
    data: { eventId: event.id },
  });

  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(event);
      }}
      className={cn(
        "cursor-pointer rounded-md bg-card px-2.5 py-1.5 ring-1 ring-border/70 transition-shadow hover:shadow-sm",
        isDragSource && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", getEventColor(event))} aria-hidden />
        <span className="truncate text-sm font-medium tracking-tight">{event.title}</span>
        {event.recurring && <Repeat className="size-3 shrink-0 text-muted-foreground" />}
        {event.category && (
          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {event.category}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>
          {shortTime(event.time)} – {endTimeString(event)}
        </span>
        {event.description && <span className="truncate">· {event.description}</span>}
      </div>
    </div>
  );
}
