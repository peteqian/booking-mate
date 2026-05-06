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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export interface WeekViewProps {
  currentDate: Date;
  selectedDate: string;
  events: EventDto[];
  canManage: boolean;
  onSelectDate: (dateKey: string) => void;
  onEventClick: (event: EventDto) => void;
  onSlotClick: (dateKey: string, time: string) => void;
}

function getWeekDays(date: Date): Date[] {
  const dayOfWeek = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);
  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

export function WeekView({
  currentDate,
  selectedDate,
  events,
  canManage,
  onSelectDate,
  onEventClick,
  onSlotClick,
}: WeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const byDate = useMemo(() => {
    const rangeStart = new Date(weekDays[0]);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(weekDays[6]);
    rangeEnd.setHours(23, 59, 59);
    return eventsByDate(events, rangeStart, rangeEnd);
  }, [events, weekDays]);

  const todayKey = dateKey(new Date());

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b bg-card">
        <div />
        {weekDays.map((day) => {
          const key = dateKey(day);
          const isToday = todayKey === key;
          const isSelected = selectedDate === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 transition-colors",
                isSelected
                  ? "bg-primary/8 text-primary"
                  : isToday
                    ? "bg-primary/5"
                    : "hover:bg-muted/40",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground shadow-sm",
                  isSelected && !isToday && "text-primary",
                )}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        {HOURS.map((hour) => (
          <HourRow
            key={hour}
            hour={hour}
            weekDays={weekDays}
            byDate={byDate}
            canManage={canManage}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        ))}
      </div>
    </div>
  );
}

interface HourRowProps {
  hour: number;
  weekDays: Date[];
  byDate: Map<string, EventInstance[]>;
  canManage: boolean;
  onEventClick: (event: EventDto) => void;
  onSlotClick: (dateKey: string, time: string) => void;
}

function HourRow({ hour, weekDays, byDate, canManage, onEventClick, onSlotClick }: HourRowProps) {
  const hourLabel = formatHour(hour);
  const hourStr = String(hour).padStart(2, "0");
  const time = `${hourStr}:00`;

  return (
    <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b last:border-b-0">
      <div className="pt-1 pr-2 text-right text-[10px] font-medium tabular-nums text-muted-foreground">
        {hourLabel}
      </div>
      {weekDays.map((day) => {
        const key = dateKey(day);
        const dayEvents = byDate.get(key) ?? [];
        const slotEvents = dayEvents.filter((instance) =>
          shortTime(instance.event.time).startsWith(hourStr),
        );
        return (
          <HourSlot
            key={key}
            dateKey={key}
            time={time}
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

interface HourSlotProps {
  dateKey: string;
  time: string;
  events: EventInstance[];
  canManage: boolean;
  onEventClick: (event: EventDto) => void;
  onSlotClick: (dateKey: string, time: string) => void;
}

export function HourSlot({
  dateKey: key,
  time,
  events,
  canManage,
  onEventClick,
  onSlotClick,
}: HourSlotProps) {
  const { ref, isDropTarget } = useDroppable({
    id: `slot:${key}:${time}`,
    type: "slot",
    accept: "event",
    data: { dateKey: key, time },
  });

  return (
    <div
      ref={ref}
      onClick={() => events.length === 0 && onSlotClick(key, time)}
      className={cn(
        "flex min-h-12 flex-col gap-0.5 border-l border-border/60 p-0.5 transition-colors",
        events.length === 0 && "cursor-pointer hover:bg-primary/5",
        isDropTarget && "ring-2 ring-inset ring-primary/60",
      )}
    >
      {events.map((instance) => (
        <SlotEventChip
          key={instance.instanceKey}
          instance={instance}
          canManage={canManage}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  );
}

interface SlotEventChipProps {
  instance: EventInstance;
  canManage: boolean;
  onEventClick: (event: EventDto) => void;
}

function SlotEventChip({ instance, canManage, onEventClick }: SlotEventChipProps) {
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
        "rounded-sm bg-card px-1.5 py-1 text-[10.5px] leading-tight transition-colors hover:bg-muted/60 ring-1 ring-border/70",
        isDragSource && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1">
        <span className={cn("size-1.5 shrink-0 rounded-full", getEventColor(event))} aria-hidden />
        <span className="truncate font-medium text-foreground">{event.title}</span>
        {event.recurring && <Repeat className="ml-auto size-2.5 shrink-0 text-muted-foreground" />}
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
        {shortTime(event.time)} – {endTimeString(event)}
      </div>
    </div>
  );
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}
