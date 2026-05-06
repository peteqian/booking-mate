import type { EventDto } from "@workspace/contracts";
import { addMinutes, format, parse } from "date-fns";

const TAG_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return "bg-gray-500";
  const hash = category.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function getEventColor(event: { tags: string[]; category: string | null }): string {
  const primary = event.tags[0] ?? event.category;
  if (!primary) return "bg-gray-500";
  const hash = primary.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function shortTime(time: string): string {
  return time.slice(0, 5);
}

export function eventStartDate(event: EventDto): Date {
  return parse(`${event.date} ${shortTime(event.time)}`, "yyyy-MM-dd HH:mm", new Date());
}

export function eventEndDate(event: EventDto): Date {
  return addMinutes(eventStartDate(event), event.duration);
}

export function endTimeString(event: EventDto): string {
  return format(eventEndDate(event), "HH:mm");
}

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function frequencyStep(frequency: string): { kind: "day" | "month" | "year"; amount: number } | null {
  switch (frequency) {
    case "daily":
      return { kind: "day", amount: 1 };
    case "weekly":
      return { kind: "day", amount: 7 };
    case "biweekly":
      return { kind: "day", amount: 14 };
    case "monthly":
      return { kind: "month", amount: 1 };
    case "yearly":
      return { kind: "year", amount: 1 };
    default:
      return null;
  }
}

function advance(current: Date, frequency: string, interval: number): Date {
  const step = frequencyStep(frequency);
  if (!step) return current;
  const next = new Date(current);
  const amount = step.amount * interval;
  if (step.kind === "day") next.setDate(next.getDate() + amount);
  else if (step.kind === "month") next.setMonth(next.getMonth() + amount);
  else next.setFullYear(next.getFullYear() + amount);
  return next;
}

interface EventInstance {
  event: EventDto;
  start: Date;
  end: Date;
  instanceKey: string;
}

export function expandEvent(event: EventDto, rangeStart: Date, rangeEnd: Date): EventInstance[] {
  const baseStart = eventStartDate(event);
  if (!event.recurring || !event.recurrenceFrequency) {
    if (baseStart > rangeEnd) return [];
    if (eventEndDate(event) < rangeStart) return [];
    return [
      {
        event,
        start: baseStart,
        end: eventEndDate(event),
        instanceKey: event.id,
      },
    ];
  }

  const interval = event.recurrenceInterval && event.recurrenceInterval > 0 ? event.recurrenceInterval : 1;
  const limit = event.recurrenceEndDate
    ? parse(event.recurrenceEndDate, "yyyy-MM-dd", new Date())
    : rangeEnd;
  const cap = limit < rangeEnd ? limit : rangeEnd;

  const instances: EventInstance[] = [];
  let cursor = baseStart;
  let safety = 0;
  while (cursor <= cap && safety < 800) {
    if (cursor >= rangeStart) {
      const start = cursor;
      const end = addMinutes(start, event.duration);
      const key = `${event.id}-${dateKey(start)}`;
      instances.push({ event, start, end, instanceKey: key });
    }
    cursor = advance(cursor, event.recurrenceFrequency, interval);
    safety += 1;
  }
  return instances;
}

export function eventsByDate(
  events: EventDto[],
  rangeStart: Date,
  rangeEnd: Date,
): Map<string, EventInstance[]> {
  const map = new Map<string, EventInstance[]>();
  for (const event of events) {
    const instances = expandEvent(event, rangeStart, rangeEnd);
    for (const instance of instances) {
      const key = dateKey(instance.start);
      const bucket = map.get(key);
      if (bucket) bucket.push(instance);
      else map.set(key, [instance]);
    }
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return map;
}

export type { EventInstance };
