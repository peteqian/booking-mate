import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Archive,
  ArchiveRestore,
  Copy,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { EventDto, EventStatus, EventVisibility, ResourceDto } from "@workspace/contracts";
import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { emptyEventForm, formToEventRequest, updateEvent, type EventFormState } from "@/lib/events";
import { getCurrentOrg } from "@/lib/org";
import { canManageEvents } from "@/lib/permissions";
import { eventKeys, eventsQueryOptions } from "@/queries/events";
import { useCreateEvent, useDuplicateEvent, usePatchEvent } from "@/hooks/use-events";
import { resourcesQueryOptions } from "@/queries/resources";
import { replaceEventResources } from "@/lib/resources";
import { StatusBadge, VisibilityBadge } from "./~components/event-badges";

type ViewMode = "list" | "kanban";
type SortKey =
  | "title"
  | "date"
  | "status"
  | "visibility"
  | "registrationCount"
  | "category"
  | "price"
  | "location";
type EventSegment = "active" | "archived";
type ResourceAssignmentDraft = { resourceId: string; role: string; quantity: number };

const statuses: EventStatus[] = ["upcoming", "completed", "cancelled"];
const visibilities: EventVisibility[] = ["unpublished", "published"];
const ITEMS_PER_PAGE = 10;

const sortLabels: Record<SortKey, string> = {
  title: "Title",
  date: "Date",
  status: "Status",
  visibility: "Visibility",
  registrationCount: "Registrations",
  category: "Category",
  price: "Price",
  location: "Location",
};

function isArchived(event: Pick<EventDto, "archivedAt">) {
  return event.archivedAt !== null;
}

function getArchivePatch(event: Pick<EventDto, "archivedAt">) {
  if (isArchived(event)) {
    return { archivedAt: null };
  }

  return { archivedAt: new Date().toISOString() };
}

export const Route = createFileRoute("/_auth/admin/events/")({
  component: Events,
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
});

function Events() {
  const orgContext = Route.useRouteContext() as Awaited<ReturnType<typeof getCurrentOrg>>;
  const role = orgContext.memberRole;
  const canManage = canManageEvents(role);
  const [view, setView] = useState<ViewMode>("list");
  const [segment, setSegment] = useState<EventSegment>("active");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(emptyEventForm);
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignmentDraft[]>([]);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    data: { events },
  } = useSuspenseQuery(eventsQueryOptions);

  const createMutation = useCreateEvent();
  const duplicateMutation = useDuplicateEvent();
  const { data: resourcesData } = useQuery({
    ...resourcesQueryOptions({ includeArchived: true }),
    enabled: createOpen,
  });

  const categories = useMemo(
    () => [...new Set(events.map((event) => event.category).filter(Boolean))] as string[],
    [events],
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [segment, search, category, status, visibility, sortKey]);

  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events
      .filter((event) => {
        const archived = isArchived(event);
        const active = !archived;
        const matchesSegment = segment === "active" ? active : archived;

        const matchesSearch =
          needle.length === 0 ||
          event.title.toLowerCase().includes(needle) ||
          (event.description ?? "").toLowerCase().includes(needle) ||
          (event.location ?? "").toLowerCase().includes(needle);
        const matchesCategory = category === "all" || event.category === category;
        const matchesStatus = status === "all" || event.status === status;
        const matchesVisibility = visibility === "all" || event.visibility === visibility;
        return (
          matchesSegment && matchesSearch && matchesCategory && matchesStatus && matchesVisibility
        );
      })
      .sort((a, b) => compareEvents(a, b, sortKey));
  }, [category, events, search, segment, sortKey, status, visibility]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, page]);

  const activeFilterCount = [category, status, visibility].filter((v) => v !== "all").length;

  const updateForm = (field: keyof EventFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const { event: createdEvent } = await createMutation.mutateAsync(formToEventRequest(form));
      const assignments = resourceAssignments.filter(
        (assignment) => assignment.resourceId && assignment.role.trim(),
      );
      if (assignments.length > 0) {
        await replaceEventResources(createdEvent.id, {
          resources: assignments.map((assignment) => ({
            resourceId: assignment.resourceId,
            role: assignment.role.trim(),
            quantity: assignment.quantity > 0 ? assignment.quantity : 1,
          })),
        });
      }
      setForm(emptyEventForm);
      setResourceAssignments([]);
      setCreateOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create event");
    }
  };

  const handleDuplicate = (eventId: string) => {
    setError("");
    duplicateMutation.mutate(eventId, {
      onError: (error) =>
        setError(error instanceof Error ? error.message : "Unable to duplicate event"),
    });
  };

  const eventCounts = useMemo(() => {
    const archived = events.filter(isArchived).length;
    const active = events.length - archived;
    return { active, archived };
  }, [events]);

  const clearFilters = () => {
    setCategory("all");
    setStatus("all");
    setVisibility("all");
    setSortKey("date");
  };

  return (
    <AppShell
      title="Events"
      description="Create, filter, sort, and schedule event work."
      headerActions={
        <Button size="sm" disabled={!canManage} onClick={() => setCreateOpen(true)}>
          New event
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create event</DialogTitle>
              <DialogDescription>
                Add the schedule, capacity, visibility, and pricing.
              </DialogDescription>
            </DialogHeader>
            <EventForm
              form={form}
              onChange={updateForm}
              onSubmit={handleCreate}
              submitLabel={createMutation.isPending ? "Creating..." : "Create event"}
              disabled={createMutation.isPending}
              resources={resourcesData?.resources ?? []}
              resourceAssignments={resourceAssignments}
              onResourceAssignmentsChange={setResourceAssignments}
            />
          </DialogContent>
        </Dialog>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toolbar: tabs | search + filter + view + new */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={segment} onValueChange={(v) => setSegment(v as EventSegment)}>
            <TabsList>
              <TabsTrigger value="active">
                Active
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {eventCounts.active}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {eventCounts.archived}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events..."
                className="h-8 w-44 pl-8 text-sm"
              />
            </div>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <SlidersHorizontal className="size-3.5" />
                    Filter
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                }
              />
              <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0" align="end">
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4 border-b pb-3">
                    <div>
                      <h4 className="text-sm font-semibold tracking-tight">Filter and sort</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Refine the Events workspace.
                      </p>
                    </div>
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {activeFilterCount} active
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-foreground">Sort by</Label>
                      <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false} className="min-w-56">
                          {(Object.entries(sortLabels) as [SortKey, string][]).map(
                            ([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground">Category</Label>
                        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                          <SelectTrigger className="h-9 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false} className="min-w-44">
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground">Status</Label>
                        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                          <SelectTrigger className="h-9 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false} className="min-w-40">
                            <SelectItem value="all">All statuses</SelectItem>
                            {statuses.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground">Visibility</Label>
                        <Select value={visibility} onValueChange={(v) => v && setVisibility(v)}>
                          <SelectTrigger className="h-9 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false} className="min-w-44">
                            <SelectItem value="all">All visibilities</SelectItem>
                            {visibilities.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={clearFilters}
                      disabled={activeFilterCount === 0 && sortKey === "date"}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setFilterOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center rounded-lg border p-[3px]">
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setView("list")}
              >
                <List className="size-3.5" />
              </Button>
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {category !== "all" && (
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
                Category: {category}
                <button onClick={() => setCategory("all")} className="ml-0.5">
                  <X className="size-2.5" />
                </button>
              </Badge>
            )}
            {status !== "all" && (
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
                Status: {status}
                <button onClick={() => setStatus("all")} className="ml-0.5">
                  <X className="size-2.5" />
                </button>
              </Badge>
            )}
            {visibility !== "all" && (
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
                Visibility: {visibility}
                <button onClick={() => setVisibility("all")} className="ml-0.5">
                  <X className="size-2.5" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        )}

        {!canManage && <p className="text-xs text-muted-foreground">Viewer role — read-only</p>}

        {/* Content */}
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center">
            <Calendar className="mx-auto size-8 text-muted-foreground/60" />
            <h2 className="mt-3 text-sm font-semibold tracking-tight">
              {segment === "active" ? "No active events" : "No archived events"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {segment === "active"
                ? "Create a new event to get started."
                : "Archived events appear here."}
            </p>
          </div>
        ) : view === "list" ? (
          <EventsTable
            events={paginatedEvents}
            sortKey={sortKey}
            setSortKey={setSortKey}
            canManage={canManage}
            onDuplicate={handleDuplicate}
            onError={setError}
          />
        ) : (
          <EventsKanban events={paginatedEvents} canManage={canManage} onError={setError} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(page * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function compareEvents(a: EventDto, b: EventDto, sortKey: SortKey) {
  if (sortKey === "registrationCount") {
    return registrationCount(a) - registrationCount(b);
  }
  if (sortKey === "price") {
    return Number(a.price) - Number(b.price);
  }
  if (sortKey === "date") {
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  }
  return String(a[sortKey] ?? "")
    .toLowerCase()
    .localeCompare(String(b[sortKey] ?? "").toLowerCase());
}

function registrationCount(event: EventDto) {
  return event.confirmedRegistrations + event.waitlistedRegistrations;
}

function EventsTable({
  events,
  sortKey,
  setSortKey,
  canManage,
  onDuplicate,
  onError,
}: {
  events: EventDto[];
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  canManage: boolean;
  onDuplicate: (eventId: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead label="Event" value="title" sortKey={sortKey} setSortKey={setSortKey} />
            <SortableHead label="Date" value="date" sortKey={sortKey} setSortKey={setSortKey} />
            <SortableHead label="Status" value="status" sortKey={sortKey} setSortKey={setSortKey} />
            <SortableHead
              label="Visibility"
              value="visibility"
              sortKey={sortKey}
              setSortKey={setSortKey}
            />
            <SortableHead
              label="Registrations"
              value="registrationCount"
              sortKey={sortKey}
              setSortKey={setSortKey}
            />
            <SortableHead
              label="Category"
              value="category"
              sortKey={sortKey}
              setSortKey={setSortKey}
              className="hidden lg:table-cell"
            />
            <SortableHead
              label="Location"
              value="location"
              sortKey={sortKey}
              setSortKey={setSortKey}
              className="hidden xl:table-cell"
            />
            <SortableHead
              label="Price"
              value="price"
              sortKey={sortKey}
              setSortKey={setSortKey}
              className="hidden md:table-cell"
            />
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              canManage={canManage}
              onDuplicate={onDuplicate}
              onError={onError}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHead({
  label,
  value,
  sortKey,
  setSortKey,
  className,
}: {
  label: string;
  value: SortKey;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <TableHead className={`h-8 py-0 ${className ?? ""}`}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setSortKey(value)}
      >
        {label}
        {sortKey === value && <span className="ml-0.5">↑</span>}
      </Button>
    </TableHead>
  );
}

function EventRow({
  event,
  canManage,
  onDuplicate,
  onError,
}: {
  event: EventDto;
  canManage: boolean;
  onDuplicate: (eventId: string) => void;
  onError: (message: string) => void;
}) {
  const patchMutation = usePatchEvent(event.id);
  const updateEvent = (input: Partial<Pick<EventDto, "archivedAt" | "status" | "visibility">>) => {
    patchMutation.mutate(input, {
      onError: (error) =>
        onError(error instanceof Error ? error.message : "Unable to update event"),
    });
  };
  const archived = isArchived(event);

  return (
    <TableRow className="group hover:bg-muted/30">
      <TableCell className="py-2">
        <Link
          to="/admin/events/$eventId/edit"
          params={{ eventId: event.id }}
          className="font-medium text-sm underline-offset-4 hover:underline"
        >
          {event.title}
        </Link>
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
        {event.date}
        <span className="text-muted-foreground/60"> · {event.time}</span>
      </TableCell>
      <TableCell className="py-2">
        <StatusBadge status={event.status} />
      </TableCell>
      <TableCell className="py-2">
        <VisibilityBadge visibility={event.visibility} />
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{event.confirmedRegistrations}</span>
        {event.maxCapacity !== null && event.maxCapacity > 0 && (
          <span className="text-muted-foreground/60"> /{event.maxCapacity}</span>
        )}
        {event.waitlistedRegistrations > 0 && (
          <span className="text-yellow-600 ml-1">+{event.waitlistedRegistrations} waitlisted</span>
        )}
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">{event.category ?? "—"}</TableCell>
      <TableCell className="hidden py-2 text-xs text-muted-foreground xl:table-cell">
        {event.location ?? "—"}
      </TableCell>
      <TableCell className="py-2 text-xs font-medium tabular-nums">{event.price}</TableCell>
      <TableCell className="py-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <Link
              to="/admin/events/$eventId/edit"
              params={{ eventId: event.id }}
              className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <Pencil className="size-3.5" />
              {canManage ? "Edit" : "View"}
            </Link>
            {canManage && (
              <>
                <DropdownMenuItem onClick={() => onDuplicate(event.id)} className="gap-2">
                  <Copy className="size-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateEvent(getArchivePatch(event))}
                  disabled={patchMutation.isPending}
                  className="gap-2"
                >
                  {archived ? (
                    <ArchiveRestore className="size-3.5" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}
                  {archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function EventsKanban({
  events,
  canManage,
  onError,
}: {
  events: EventDto[];
  canManage: boolean;
  onError: (message: string) => void;
}) {
  const grouped = Object.fromEntries(
    statuses.map((status) => [status, events.filter((event) => event.status === status)]),
  ) as Record<EventStatus, EventDto[]>;
  const patchByEvent = new Map(events.map((event) => [event.id, event]));
  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: EventStatus }) =>
      updateEvent(eventId, { status }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) }),
      ]);
    },
  });

  return (
    <DragDropProvider
      onDragEnd={(dragEvent) => {
        const operation = (dragEvent as any).operation;
        const sourceId = operation?.source?.id as string | undefined;
        const targetId = operation?.target?.id as EventStatus | undefined;
        if (!sourceId || !targetId || !statuses.includes(targetId)) return;
        const event = patchByEvent.get(sourceId);
        if (!event || event.status === targetId) return;
        statusMutation.mutate(
          { eventId: sourceId, status: targetId },
          {
            onError: (error) =>
              onError(error instanceof Error ? error.message : "Unable to update event"),
          },
        );
      }}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            events={grouped[status]}
            canManage={canManage}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}

function KanbanColumn({
  status,
  events,
  canManage,
}: {
  status: EventStatus;
  events: EventDto[];
  canManage: boolean;
}) {
  const { ref, isDropTarget } = useDroppable({ id: status, type: "column", accept: "event" });
  return (
    <section
      ref={ref}
      className={`min-h-80 rounded-xl border bg-background p-4 transition-[box-shadow,ring-color,transform] ${isDropTarget ? "-translate-y-0.5 shadow-md ring-2 ring-primary" : ""}`}
    >
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">{events.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <KanbanCard key={event.id} event={event} canManage={canManage} />
        ))}
      </div>
    </section>
  );
}

function KanbanCard({ event, canManage }: { event: EventDto; canManage: boolean }) {
  const { ref, handleRef, isDragSource } = useDraggable({
    id: event.id,
    type: "event",
    disabled: !canManage,
  });

  return (
    <article
      ref={ref}
      className={`rounded-lg border bg-background/90 p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[box-shadow,transform,opacity] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.07)] ${isDragSource ? "scale-[0.99] opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/admin/events/$eventId/edit"
            params={{ eventId: event.id }}
            className="font-semibold tracking-tight underline-offset-4 hover:underline"
          >
            {event.title}
          </Link>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {event.date} at {event.time}
          </p>
        </div>
        <Button
          ref={handleRef as any}
          variant="ghost"
          size="sm"
          disabled={!canManage}
          className="cursor-grab text-xs text-muted-foreground"
        >
          Drag
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <VisibilityBadge visibility={event.visibility} />
        {event.category && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {event.category}
          </Badge>
        )}
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {event.price}
        </Badge>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {event.confirmedRegistrations}
          {event.maxCapacity !== null && event.maxCapacity > 0 && `/${event.maxCapacity}`}
          {event.waitlistedRegistrations > 0 && ` +${event.waitlistedRegistrations} waitlisted`}
        </Badge>
      </div>
    </article>
  );
}

function EventForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
  resources,
  resourceAssignments,
  onResourceAssignmentsChange,
}: {
  form: EventFormState;
  onChange: (field: keyof EventFormState, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitLabel: string;
  disabled: boolean;
  resources: ResourceDto[];
  resourceAssignments: ResourceAssignmentDraft[];
  onResourceAssignmentsChange: (assignments: ResourceAssignmentDraft[]) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="create-title">Title</Label>
        <Input
          id="create-title"
          value={form.title}
          onChange={(event) => onChange("title", event.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-date">Date</Label>
          <Input
            id="create-date"
            type="date"
            value={form.date}
            onChange={(event) => onChange("date", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-time">Time</Label>
          <Input
            id="create-time"
            type="time"
            value={form.time}
            onChange={(event) => onChange("time", event.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-duration">Duration</Label>
          <Input
            id="create-duration"
            type="number"
            min="1"
            value={form.duration}
            onChange={(event) => onChange("duration", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-capacity">Capacity</Label>
          <Input
            id="create-capacity"
            type="number"
            min="1"
            value={form.maxCapacity}
            onChange={(event) => onChange("maxCapacity", event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-category">Category</Label>
          <Input
            id="create-category"
            value={form.category}
            onChange={(event) => onChange("category", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-price">Price</Label>
          <Input
            id="create-price"
            value={form.price}
            onChange={(event) => onChange("price", event.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Visibility</Label>
          <VisibilitySelect
            value={form.visibility}
            disabled={false}
            onChange={(value) => onChange("visibility", value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <StatusSelect
            value={form.status}
            disabled={false}
            onChange={(value) => onChange("status", value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-location">Location</Label>
        <Input
          id="create-location"
          value={form.location}
          onChange={(event) => onChange("location", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-tags">Tags</Label>
        <Input
          id="create-tags"
          value={form.tags}
          onChange={(event) => onChange("tags", event.target.value)}
          placeholder="urgent, vip, sponsor (comma separated)"
        />
        <p className="text-xs text-muted-foreground">
          Free-form labels for filtering and color hints. Comma separated.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-description">Description</Label>
        <Textarea
          id="create-description"
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
          className="min-h-24"
        />
        <p className="text-xs text-muted-foreground">Public-facing copy.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-notes">Internal notes</Label>
        <Textarea
          id="create-notes"
          value={form.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          className="min-h-20"
          placeholder="Setup, dietary, AV requirements…"
        />
        <p className="text-xs text-muted-foreground">Only visible to your team.</p>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="font-medium">Recurrence</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Stored on the event; generated instances come later.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Repeats</Label>
            <Select
              value={form.recurring}
              onValueChange={(value) => value && onChange("recurring", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={form.recurrenceFrequency || "none"}
              onValueChange={(value) =>
                value && onChange("recurrenceFrequency", value === "none" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-recurrence-interval">Interval</Label>
            <Input
              id="create-recurrence-interval"
              type="number"
              min="1"
              value={form.recurrenceInterval}
              onChange={(event) => onChange("recurrenceInterval", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-recurrence-end">End date</Label>
            <Input
              id="create-recurrence-end"
              type="date"
              value={form.recurrenceEndDate}
              onChange={(event) => onChange("recurrenceEndDate", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="create-recurrence-days">Days of week</Label>
            <Input
              id="create-recurrence-days"
              value={form.recurrenceDays}
              onChange={(event) => onChange("recurrenceDays", event.target.value)}
              placeholder="monday, wednesday"
            />
          </div>
        </div>
      </div>
      <ResourceAssignmentEditor
        resources={resources}
        assignments={resourceAssignments}
        onChange={onResourceAssignmentsChange}
      />
      <Button type="submit" disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}

function ResourceAssignmentEditor({
  resources,
  assignments,
  onChange,
}: {
  resources: ResourceDto[];
  assignments: ResourceAssignmentDraft[];
  onChange: (assignments: ResourceAssignmentDraft[]) => void;
}) {
  const updateAssignment = (
    index: number,
    field: keyof ResourceAssignmentDraft,
    value: string | number,
  ) => {
    const next = [...assignments];
    next[index] = {
      ...next[index],
      [field]: field === "quantity" ? Number(value) || 1 : value,
    };
    onChange(next);
  };

  const selectedResourceIds = new Set(
    assignments.map((assignment) => assignment.resourceId).filter(Boolean),
  );

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Resources</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign instructors, locations, or materials after creation.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...assignments, { resourceId: "", role: "", quantity: 1 }])}
          disabled={resources.length === 0}
        >
          Add resource
        </Button>
      </div>
      {resources.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Create resources first to assign them here.
        </p>
      ) : assignments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {assignments.map((assignment, index) => {
            const currentResource = resources.find(
              (resource) => resource.id === assignment.resourceId,
            );
            const availableResources = resources.filter(
              (resource) =>
                resource.id === assignment.resourceId ||
                (!resource.archivedAt && !selectedResourceIds.has(resource.id)),
            );
            return (
              <div
                key={index}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end"
              >
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Resource</Label>
                  <Select
                    value={assignment.resourceId ?? ""}
                    onValueChange={(value) => updateAssignment(index, "resourceId", value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {currentResource && (
                        <SelectItem value={currentResource.id}>
                          {currentResource.name} ({currentResource.type})
                          {currentResource.archivedAt ? " · archived" : ""}
                        </SelectItem>
                      )}
                      {availableResources
                        .filter((resource) => resource.id !== currentResource?.id)
                        .map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.name} ({resource.type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <Input
                    value={assignment.role}
                    onChange={(event) => updateAssignment(index, "role", event.target.value)}
                    placeholder="instructor, location"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={assignment.quantity}
                    onChange={(event) => updateAssignment(index, "quantity", event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(assignments.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: EventStatus;
  disabled: boolean;
  onChange: (value: EventStatus) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value as EventStatus)}
      disabled={disabled}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function VisibilitySelect({
  value,
  disabled,
  onChange,
}: {
  value: EventVisibility;
  disabled: boolean;
  onChange: (value: EventVisibility) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onChange(value as EventVisibility)}
      disabled={disabled}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {visibilities.map((visibility) => (
          <SelectItem key={visibility} value={visibility}>
            {visibility}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
