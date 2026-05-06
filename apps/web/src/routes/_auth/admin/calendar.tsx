import { DragDropProvider } from "@dnd-kit/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useState } from "react";
import type { EventDto } from "@workspace/contracts";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateEvent } from "@/lib/events";
import type { CurrentOrgResponse } from "@/lib/org";
import { canManageEvents } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { eventKeys, eventsQueryOptions } from "@/queries/events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayView } from "./~components/calendar/day-view";
import { EventListPanel } from "./~components/calendar/event-list-panel";
import { HeatMapDialog } from "./~components/calendar/heat-map-dialog";
import { InlineCreateForm } from "./~components/calendar/inline-create-form";
import { MonthView } from "./~components/calendar/month-view";
import { WeekView } from "./~components/calendar/week-view";
import { YearView } from "./~components/calendar/year-view";

type ViewType = "day" | "week" | "month" | "year";

export const Route = createFileRoute("/_auth/admin/calendar")({
  ssr: false,
  component: CalendarPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
});

function CalendarPage() {
  const orgContext = Route.useRouteContext() as CurrentOrgResponse;
  const canManage = canManageEvents(orgContext.memberRole);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: { events },
  } = useSuspenseQuery(eventsQueryOptions);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [heatMapOpen, setHeatMapOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{
    date?: string;
    time?: string;
    duration?: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleSelectDate = (key: string) => {
    setSelectedDate((current) => (current === key ? "" : key));
  };

  const handleEventClick = (event: EventDto) => {
    navigate({ to: "/admin/events/$eventId/edit", params: { eventId: event.id } });
  };

  const handleSlotClick = (dateKey: string, time: string) => {
    if (!canManage) return;
    setCreatePrefill({ date: dateKey, time, duration: "60" });
    setCreateOpen(true);
  };

  const handleNewClick = () => {
    setCreatePrefill({
      date: selectedDate || new Date().toISOString().slice(0, 10),
      duration: "60",
    });
    setCreateOpen(true);
  };

  const handlePrev = () => setCurrentDate(stepDate(currentDate, viewType, -1));
  const handleNext = () => setCurrentDate(stepDate(currentDate, viewType, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDragEnd = async (dragEvent: { canceled?: boolean; operation?: unknown }) => {
    if (dragEvent.canceled) return;
    const operation = dragEvent.operation as
      | { source?: { data?: { eventId?: string } }; target?: { data?: { dateKey?: string; time?: string } } }
      | undefined;
    const eventId = operation?.source?.data?.eventId;
    const target = operation?.target?.data;
    if (!eventId || !target?.dateKey) return;
    const dto = events.find((event) => event.id === eventId);
    if (!dto) return;

    const newDate = target.dateKey;
    const newTime = target.time ?? dto.time.slice(0, 5);
    if (newDate === dto.date && newTime === dto.time.slice(0, 5)) return;

    try {
      await updateEvent(eventId, { date: newDate, time: newTime });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule event");
    }
  };

  const handleCreated = (event: EventDto) => {
    setSelectedDate(event.date);
    setCreateOpen(false);
  };

  const needsScroll = viewType === "week" || viewType === "day" || viewType === "year";

  const range = rangeForView(currentDate, viewType);
  const scopedCount = events.reduce((acc, event) => {
    const eventStart = new Date(`${event.date}T${event.time.slice(0, 5) || "00:00"}`);
    return eventStart >= range.start && eventStart <= range.end ? acc + 1 : acc;
  }, 0);
  const scopeSuffix =
    viewType === "day"
      ? "this day"
      : viewType === "week"
        ? "this week"
        : viewType === "month"
          ? "this month"
          : "this year";

  return (
    <AppShell title="Calendar" description="Schedule and reschedule events.">
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100svh-6.5rem)] min-h-0 overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_rgba(0,0,0,0.04)] lg:h-[calc(100svh-8rem)]">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-4 border-b bg-card px-5 py-4">
              <div className="flex items-end justify-between gap-6">
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-semibold tabular-nums leading-none tracking-tight">
                    {currentDate.getDate()}
                  </span>
                  <div className="flex flex-col pb-0.5">
                    <span className="text-sm font-semibold tracking-tight leading-tight">
                      {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <span className="mt-0.5 text-xs font-medium tracking-tight leading-tight text-muted-foreground">
                      {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                    </span>
                  </div>
                </div>

                <Tabs
                  value={viewType}
                  onValueChange={(value) => value && setViewType(value as ViewType)}
                >
                  <TabsList className="h-8 bg-muted/60">
                    <TabsTrigger value="day" className="px-2.5 text-xs">
                      Day
                    </TabsTrigger>
                    <TabsTrigger value="week" className="px-2.5 text-xs">
                      Week
                    </TabsTrigger>
                    <TabsTrigger value="month" className="px-2.5 text-xs">
                      Month
                    </TabsTrigger>
                    <TabsTrigger value="year" className="px-2.5 text-xs">
                      Year
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon-sm" className="size-7" onClick={handlePrev} aria-label="Previous">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" className="size-7" onClick={handleNext} aria-label="Next">
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={handleToday}>
                    Today
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setHeatMapOpen(true)}
                >
                  <Flame className="size-3.5" />
                  Heat map
                </Button>
              </div>
            </div>
            {error && (
              <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                {error}
              </div>
            )}
            {!canManage && (
              <div className="border-b bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
                Viewer role — drag/create disabled.
              </div>
            )}

            <div className={cn("min-h-0 flex-1", needsScroll ? "overflow-y-auto" : "overflow-hidden")}>
              {viewType === "day" && (
                <DayView
                  currentDate={currentDate}
                  events={events}
                  canManage={canManage}
                  onEventClick={handleEventClick}
                  onSlotClick={handleSlotClick}
                />
              )}
              {viewType === "week" && (
                <WeekView
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  events={events}
                  canManage={canManage}
                  onSelectDate={handleSelectDate}
                  onEventClick={handleEventClick}
                  onSlotClick={handleSlotClick}
                />
              )}
              {viewType === "month" && (
                <MonthView
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  events={events}
                  canManage={canManage}
                  onSelectDate={handleSelectDate}
                  onEventClick={handleEventClick}
                />
              )}
              {viewType === "year" && (
                <YearView
                  currentDate={currentDate}
                  events={events}
                  onSelectMonth={(date) => {
                    setCurrentDate(date);
                    setViewType("month");
                  }}
                />
              )}
            </div>
          </div>

          <aside className="flex w-72 shrink-0 flex-col border-l bg-card md:w-80 xl:w-[22rem]">
            <EventListPanel
              events={events}
              selectedDate={selectedDate || null}
              onClearDate={() => setSelectedDate("")}
              canCreate={canManage}
              onCreateClick={handleNewClick}
              scopedCount={scopedCount}
              scopePrimary="Events"
              scopeSecondary={scopeSuffix}
            />
          </aside>
        </div>
      </DragDropProvider>

      <HeatMapDialog open={heatMapOpen} onOpenChange={setHeatMapOpen} events={events} />
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>
              Add the basics here, then open the event to set capacity, resources, and recurrence.
            </DialogDescription>
          </DialogHeader>
          <InlineCreateForm prefill={createPrefill} onCreated={handleCreated} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function rangeForView(date: Date, view: ViewType): { start: Date; end: Date } {
  if (view === "day") {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (view === "week") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (view === "month") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function stepDate(date: Date, view: ViewType, direction: 1 | -1): Date {
  const next = new Date(date);
  if (view === "day") next.setDate(date.getDate() + direction);
  else if (view === "week") next.setDate(date.getDate() + 7 * direction);
  else if (view === "month") next.setMonth(date.getMonth() + direction);
  else next.setFullYear(date.getFullYear() + direction);
  return next;
}

