/* eslint-disable react/no-children-prop */
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { ArrowUpCircle, Ban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCurrentOrg } from "@/lib/org";
import {
  AppShell,
  PageBackButton,
  PageBreadcrumb,
  PageBreadcrumbCurrent,
  PageBreadcrumbSeparator,
} from "@/components/app-shell";
import { eventFormSchema, eventToForm, type EventFormState } from "@/lib/events";
import type { AttendeeDto, PaymentStatus, RegistrationWithAttendeeDto, EventResourceDto, ResourceDto } from "@workspace/contracts";
import { eventQueryOptions } from "@/queries/events";
import { eventRegistrationsQueryOptions } from "@/queries/registrations";
import { attendeesQueryOptions } from "@/queries/attendees";
import { eventResourcesQueryOptions, resourcesQueryOptions } from "@/queries/resources";
import { canDeleteEvents, canManageEvents } from "@/lib/permissions";
import { useUpdateEvent, useDeleteEvent, useDuplicateEvent } from "@/hooks/use-events";
import { useCreateRegistration, useUpdateRegistration, useDeleteRegistration } from "@/hooks/use-registrations";
import { useReplaceEventResources } from "@/hooks/use-resources";
import { useCreateAttendee } from "@/hooks/use-attendees";
import { PaymentStatusSelect } from "./registration-summary";

export function EventDetailPage({
  eventId,
  orgContext,
  mode = "detail",
}: {
  eventId: string;
  orgContext: Awaited<ReturnType<typeof getCurrentOrg>>;
  mode?: "detail" | "edit";
}) {
  const canManage = canManageEvents(orgContext.memberRole);
  const canDelete = canDeleteEvents(orgContext.memberRole);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(mode === "edit" ? "details" : "details");
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeDto | null>(null);
  const [registrationForm, setRegistrationForm] = useState({
    attendeeId: "",
    name: "",
    email: "",
    phone: "",
    status: "confirmed" as RegistrationWithAttendeeDto["status"],
    paymentStatus: "not_required" as PaymentStatus,
  });

  const {
    data: { event },
  } = useSuspenseQuery(eventQueryOptions(eventId));

  const { data: registrationsData, isPending: registrationsLoading } = useQuery({
    ...eventRegistrationsQueryOptions(eventId),
    enabled: activeTab === "registrations",
  });

  const { data: eventResourcesData } = useQuery({
    ...eventResourcesQueryOptions(eventId),
    enabled: activeTab === "resources" || activeTab === "details",
  });

  const { data: resourcesData } = useQuery({
    ...resourcesQueryOptions(),
    enabled: activeTab === "resources" || activeTab === "details",
  });

  const { data: attendeesData } = useQuery({
    ...attendeesQueryOptions(),
    enabled: activeTab === "registrations",
  });

  const saveMutation = useUpdateEvent(eventId);
  const deleteMutation = useDeleteEvent();
  const duplicateMutation = useDuplicateEvent();
  const updateRegistrationMutation = useUpdateRegistration(eventId);
  const createRegistrationMutation = useCreateRegistration(eventId);
  const deleteRegistrationMutation = useDeleteRegistration(eventId);
  const replaceResourcesMutation = useReplaceEventResources(eventId);
  const createAttendeeMutation = useCreateAttendee();

  const form = useForm({
    defaultValues: eventToForm(event),
    validators: {
      onChange: eventFormSchema,
      onSubmit: eventFormSchema,
    },
    onSubmit: ({ value, formApi }) => {
      setError("");
      saveMutation.mutate(value, {
        onSuccess: (data) => formApi.reset(eventToForm(data.event)),
        onError: (error) => {
          setError(error instanceof Error ? error.message : "Unable to save event");
        },
      });
    },
  });

  useEffect(() => {
    form.reset(eventToForm(event));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const allResources = resourcesData?.resources ?? [];
  const assignedResources = eventResourcesData?.resources ?? [];
  const resourceById = new Map(allResources.map((r) => [r.id, r]));

  const handleDelete = async () => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    if (!canDelete) return;

    setError("");
    deleteMutation.mutate(eventId, {
      onSuccess: async () => {
        await navigate({ to: "/events/" });
      },
      onError: (error) => {
        setError(error instanceof Error ? error.message : "Unable to delete event");
      },
    });
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm("Remove this registration?")) return;
    deleteRegistrationMutation.mutate(id, {
      onError: (error) => {
        setError(error instanceof Error ? error.message : "Unable to delete registration");
      },
    });
  };

  const registrations = registrationsData?.registrations ?? [];
  const [statusFilter, setStatusFilter] = useState<RegistrationWithAttendeeDto["status"] | null>(null);
  const [addRegOpen, setAddRegOpen] = useState(false);
  const filteredRegistrations = statusFilter
    ? registrations.filter((r) => r.status === statusFilter)
    : registrations;
  const statusCounts = registrations.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { confirmed: 0, waitlisted: 0, cancelled: 0 } as Record<RegistrationWithAttendeeDto["status"], number>,
  );
  const attendees = attendeesData?.attendees ?? [];

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setError("");

    try {
      let attendeeId = registrationForm.attendeeId;
      if (!attendeeId) {
        const attendee = await createAttendeeMutation.mutateAsync({
          name: registrationForm.name,
          email: registrationForm.email,
          phone: registrationForm.phone.trim() || null,
        });
        attendeeId = attendee.attendee.id;
      }

      await createRegistrationMutation.mutateAsync({
        eventId,
        attendeeId,
        status: registrationForm.status,
        paymentStatus: registrationForm.paymentStatus,
      });
      setRegistrationForm({
        attendeeId: "",
        name: "",
        email: "",
        phone: "",
        status: "confirmed",
        paymentStatus: "not_required",
      });
      setSelectedAttendee(null);
      setAddRegOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create registration");
    }
  };

  return (
    <AppShell
      title={
        <PageBreadcrumb>
          <PageBackButton
            to={mode === "edit" ? "/events/$eventId" : "/events/"}
            params={mode === "edit" ? { eventId } : undefined}
            label={mode === "edit" ? "Back to event" : "Back to events"}
          />
          <Link to="/events/" className="shrink-0 hover:underline">
            Events
          </Link>
          <PageBreadcrumbSeparator />
          {mode === "edit" ? (
            <>
              <Link
                to="/events/$eventId"
                params={{ eventId }}
                className="min-w-0 truncate hover:underline"
              >
                {event?.title ?? "Event"}
              </Link>
              <PageBreadcrumbSeparator />
              <PageBreadcrumbCurrent>Edit</PageBreadcrumbCurrent>
            </>
          ) : (
            <PageBreadcrumbCurrent>{event?.title ?? "Event"}</PageBreadcrumbCurrent>
          )}
        </PageBreadcrumb>
      }
      description={mode === "edit" ? event?.title ?? "Update event details." : "View and manage event details."}
      headerActions={
        mode === "edit" ? (
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isPristine] as const}
            children={([canSubmit, isSubmitting, isPristine]) => (
              <Button
                type="submit"
                form="event-details-form"
                disabled={
                  !canManage || !canSubmit || isSubmitting || isPristine || saveMutation.isPending
                }
              >
                {isSubmitting || saveMutation.isPending ? "Saving..." : "Save event"}
              </Button>
            )}
          />
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                duplicateMutation.mutate(eventId, {
                  onError: (error) =>
                    setError(
                      error instanceof Error ? error.message : "Unable to duplicate event",
                    ),
                })
              }
              disabled={!canManage || duplicateMutation.isPending}
            >
              Duplicate
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {!canManage && (
          <Alert>
            <AlertDescription>
              Your viewer role can read this event but cannot edit it.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-fit">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="registrations">
              Registrations {registrations.length > 0 && `(${registrations.length})`}
            </TabsTrigger>
            <TabsTrigger value="resources">
              Resources {assignedResources.length > 0 && `(${assignedResources.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <form
              id="event-details-form"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
              className="overflow-hidden rounded-2xl border bg-background shadow-xs"
            >
              <div className="border-b bg-muted/20 px-6 py-4">
                <h2 className="text-base font-semibold tracking-tight">Core details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update the schedule, public copy, capacity, and booking state.
                </p>
              </div>
              <div className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
                <form.Field
                  name="title"
                  children={(field) => (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={field.name}>Title</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        required
                      />
                    </div>
                  )}
                />

                <form.Field
                  name="date"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Date</Label>
                      <Input
                        id={field.name}
                        type="date"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        required
                      />
                    </div>
                  )}
                />
                <form.Field
                  name="time"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Time</Label>
                      <Input
                        id={field.name}
                        type="time"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        required
                      />
                    </div>
                  )}
                />

                <form.Field
                  name="duration"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Duration</Label>
                      <Input
                        id={field.name}
                        type="number"
                        min="1"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        required
                      />
                    </div>
                  )}
                />
                <form.Field
                  name="maxCapacity"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Capacity</Label>
                      <Input
                        id={field.name}
                        type="number"
                        min="1"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                      />
                    </div>
                  )}
                />

                <form.Field
                  name="status"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Status</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as EventFormState["status"])
                        }
                        disabled={!canManage}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <form.Field
                  name="visibility"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Visibility</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as EventFormState["visibility"])
                        }
                        disabled={!canManage}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectItem value="unpublished">Unpublished</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <form.Field
                  name="category"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Category</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                      />
                    </div>
                  )}
                />
                <form.Field
                  name="price"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Price</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        required
                      />
                    </div>
                  )}
                />

                <form.Field
                  name="location"
                  children={(field) => (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={field.name}>Location</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                      />
                    </div>
                  )}
                />
                <form.Field
                  name="description"
                  children={(field) => (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={field.name}>Description</Label>
                      <Textarea
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        className="min-h-28"
                      />
                    </div>
                  )}
                />

                <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2">
                  <div>
                    <h3 className="font-medium">Recurrence</h3>
                    <p className="text-sm text-muted-foreground">
                      Stored on the event for future recurrence expansion.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field
                      name="recurring"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label>Repeats</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) =>
                              field.handleChange(value as EventFormState["recurring"])
                            }
                            disabled={!canManage}
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
                      )}
                    />
                    <form.Field
                      name="recurrenceFrequency"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={field.state.value || "none"}
                            onValueChange={(value) =>
                              field.handleChange(value === "none" ? "" : value)
                            }
                            disabled={!canManage}
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
                      )}
                    />
                    <form.Field
                      name="recurrenceInterval"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Interval</Label>
                          <Input
                            id={field.name}
                            type="number"
                            min="1"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={!canManage}
                          />
                        </div>
                      )}
                    />
                    <form.Field
                      name="recurrenceEndDate"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>End date</Label>
                          <Input
                            id={field.name}
                            type="date"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={!canManage}
                          />
                        </div>
                      )}
                    />
                    <form.Field
                      name="recurrenceDays"
                      children={(field) => (
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={field.name}>Days of week</Label>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={!canManage}
                            placeholder="monday, wednesday"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="registrations" className="mt-6">
            {canManage && (
              <Dialog open={addRegOpen} onOpenChange={setAddRegOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add registration</DialogTitle>
                    <DialogDescription>Select an attendee or create one inline.</DialogDescription>
                  </DialogHeader>
              <form onSubmit={handleCreateRegistration} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="attendee-combobox">Attendee</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setSelectedAttendee(null);
                          setRegistrationForm((current) => ({
                            ...current,
                            attendeeId: "",
                            name: "",
                            email: "",
                            phone: "",
                          }));
                        }}
                      >
                        + Create new
                      </Button>
                    </div>
                    <Combobox<AttendeeDto>
                      items={attendees}
                      value={selectedAttendee}
                      onValueChange={(attendee) => {
                        setSelectedAttendee(attendee ?? null);
                        setRegistrationForm((current) => ({
                          ...current,
                          attendeeId: attendee?.id ?? "",
                          name: attendee?.name ?? "",
                          email: attendee?.email ?? "",
                          phone: attendee?.phone ?? "",
                        }));
                      }}
                      itemToStringLabel={(attendee) => `${attendee.name} (${attendee.email})`}
                      itemToStringValue={(attendee) => attendee.id}
                      isItemEqualToValue={(a, b) => a.id === b.id}
                    >
                      <ComboboxInput id="attendee-combobox" placeholder="Search by name or email" />
                      <ComboboxContent>
                        <ComboboxList>
                          {(attendee: AttendeeDto) => (
                            <ComboboxItem key={attendee.id} value={attendee}>
                              <div className="flex flex-col">
                                <span className="text-sm">{attendee.name}</span>
                                <span className="text-xs text-muted-foreground">{attendee.email}</span>
                              </div>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                        <ComboboxEmpty>
                          No matching attendee. Use "+ Create new" to add one.
                        </ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                  {!registrationForm.attendeeId && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="attendee-name">Name</Label>
                        <Input id="attendee-name" value={registrationForm.name} onChange={(e) => setRegistrationForm((current) => ({ ...current, name: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attendee-email">Email</Label>
                        <Input id="attendee-email" type="email" value={registrationForm.email} onChange={(e) => setRegistrationForm((current) => ({ ...current, email: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attendee-phone">Phone</Label>
                        <Input id="attendee-phone" value={registrationForm.phone} onChange={(e) => setRegistrationForm((current) => ({ ...current, phone: e.target.value }))} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={registrationForm.status} onValueChange={(value) => setRegistrationForm((current) => ({ ...current, status: value as RegistrationWithAttendeeDto["status"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="waitlisted">Waitlisted</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment</Label>
                    <PaymentStatusSelect
                      value={registrationForm.paymentStatus}
                      onChange={(paymentStatus) => setRegistrationForm((current) => ({ ...current, paymentStatus }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddRegOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRegistrationMutation.isPending || createAttendeeMutation.isPending}>
                    {createRegistrationMutation.isPending || createAttendeeMutation.isPending ? "Adding..." : "Add registration"}
                  </Button>
                </div>
              </form>
                </DialogContent>
              </Dialog>
            )}
            {registrationsLoading ? (
              <p className="text-muted-foreground">Loading registrations...</p>
            ) : registrations.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
                <h2 className="text-lg font-semibold tracking-tight">No registrations yet</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Registrations will appear here when attendees sign up.
                </p>
                {canManage && (
                  <Button className="mt-4 gap-1" onClick={() => setAddRegOpen(true)}>
                    <Plus className="size-3.5" />
                    Add registration
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Filter:</span>
                  {(["confirmed", "waitlisted", "cancelled"] as const).map((s) => {
                    const active = statusFilter === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(active ? null : s)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 capitalize transition-colors ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        aria-pressed={active}
                      >
                        {s}
                        <span className={`tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>
                          {statusCounts[s]}
                        </span>
                      </button>
                    );
                  })}
                  {statusFilter && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter(null)}
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      className="ml-auto gap-1"
                      onClick={() => setAddRegOpen(true)}
                    >
                      <Plus className="size-3.5" />
                      Add registration
                    </Button>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-10">Attendee</TableHead>
                        <TableHead className="h-10 w-32">Status</TableHead>
                        <TableHead className="h-10 w-44">Payment</TableHead>
                        <TableHead className="h-10 w-56" aria-label="Actions" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegistrations.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            No {statusFilter} registrations.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {filteredRegistrations.map((registration) => {
                      const statusVariant: Record<
                        RegistrationWithAttendeeDto["status"],
                        "default" | "secondary" | "outline"
                      > = {
                        confirmed: "default",
                        waitlisted: "secondary",
                        cancelled: "outline",
                      };
                      return (
                        <TableRow key={registration.id} className="hover:bg-muted/40">
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{registration.attendee.name}</span>
                              <span className="text-xs text-muted-foreground">{registration.attendee.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setStatusFilter(
                                  statusFilter === registration.status ? null : registration.status,
                                )
                              }
                              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title={`Filter by ${registration.status}`}
                            >
                              <Badge variant={statusVariant[registration.status]} className="capitalize cursor-pointer">
                                {registration.status}
                              </Badge>
                            </button>
                          </TableCell>
                          <TableCell className="py-3">
                            <PaymentStatusSelect
                              value={registration.paymentStatus}
                              onChange={(paymentStatus) =>
                                updateRegistrationMutation.mutate(
                                  { id: registration.id, input: { paymentStatus } },
                                  {
                                    onError: (error) => {
                                      setError(error instanceof Error ? error.message : "Unable to update registration");
                                    },
                                  },
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="py-3 pr-3">
                            <div className="flex items-center justify-end gap-1">
                              {registration.status === "waitlisted" && canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-xs"
                                  onClick={() =>
                                    updateRegistrationMutation.mutate(
                                      { id: registration.id, input: { status: "confirmed" } },
                                      {
                                        onError: (error) =>
                                          setError(
                                            error instanceof Error
                                              ? error.message
                                              : "Unable to promote registration",
                                          ),
                                      },
                                    )
                                  }
                                  disabled={updateRegistrationMutation.isPending}
                                  title="Promote to confirmed"
                                >
                                  <ArrowUpCircle className="size-3.5" />
                                  Promote
                                </Button>
                              )}
                              {registration.status !== "cancelled" && canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    if (!window.confirm("Cancel this registration?")) return;
                                    updateRegistrationMutation.mutate(
                                      { id: registration.id, input: { status: "cancelled" } },
                                      {
                                        onError: (error) =>
                                          setError(
                                            error instanceof Error
                                              ? error.message
                                              : "Unable to cancel registration",
                                          ),
                                      },
                                    );
                                  }}
                                  disabled={updateRegistrationMutation.isPending}
                                  title="Cancel registration"
                                >
                                  <Ban className="size-3.5" />
                                  Cancel
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteRegistration(registration.id)}
                                  disabled={deleteRegistrationMutation.isPending}
                                  aria-label="Remove registration"
                                  title="Remove registration"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <EventResourcesTab
              eventId={eventId}
              canManage={canManage}
              allResources={allResources}
              assignedResources={assignedResources}
              resourceById={resourceById}
              replaceResourcesMutation={replaceResourcesMutation}
              onError={setError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}


function EventResourcesTab({
  canManage,
  allResources,
  assignedResources,
  resourceById,
  replaceResourcesMutation,
  onError,
}: {
  eventId: string;
  canManage: boolean;
  allResources: ResourceDto[];
  assignedResources: EventResourceDto[];
  resourceById: Map<string, ResourceDto>;
  replaceResourcesMutation: ReturnType<typeof useReplaceEventResources>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftAssignments, setDraftAssignments] = useState<
    Array<{ resourceId: string; role: string; quantity: number }>
  >([]);

  useEffect(() => {
    setDraftAssignments(
      assignedResources.map((ar) => ({
        resourceId: ar.resourceId,
        role: ar.role,
        quantity: ar.quantity,
      })),
    );
  }, [assignedResources]);

  const handleSave = () => {
    const validAssignments = draftAssignments.filter(
      (a) => a.resourceId && a.role.trim(),
    );
    replaceResourcesMutation.mutate(
      {
        resources: validAssignments.map((a) => ({
          resourceId: a.resourceId,
          role: a.role.trim(),
          quantity: a.quantity > 0 ? a.quantity : 1,
        })),
      },
      {
        onSuccess: () => setEditing(false),
        onError: (error) =>
          onError(error instanceof Error ? error.message : "Unable to update resources"),
      },
    );
  };

  const addAssignment = () => {
    setDraftAssignments((prev) => [...prev, { resourceId: "", role: "", quantity: 1 }]);
  };

  const updateAssignment = (
    index: number,
    field: "resourceId" | "role" | "quantity",
    value: string | number,
  ) => {
    setDraftAssignments((prev) => {
      const next = [...prev];
      if (field === "quantity") {
        next[index] = { ...next[index], [field]: typeof value === "string" ? parseInt(value) || 1 : value };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const removeAssignment = (index: number) => {
    setDraftAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const unassignedResources = allResources.filter(
    (r) => !draftAssignments.some((a) => a.resourceId === r.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Assigned resources</h2>
        {canManage && (
          <>
            {editing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={replaceResourcesMutation.isPending}>
                  {replaceResourcesMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit resources
              </Button>
            )}
          </>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          {draftAssignments.map((assignment, index) => {
            const resource = resourceById.get(assignment.resourceId);
            return (
              <div key={index} className="flex items-start gap-3 rounded-lg border bg-background p-4">
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Resource</Label>
                    <Select
                      value={assignment.resourceId}
                      onValueChange={(value) => updateAssignment(index, "resourceId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resource" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {resource && (
                          <SelectItem value={resource.id}>{resource.name} ({resource.type})</SelectItem>
                        )}
                        {unassignedResources.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <Input
                        value={assignment.role}
                        onChange={(e) => updateAssignment(index, "role", e.target.value)}
                        placeholder="e.g., instructor, location, material"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={assignment.quantity}
                        onChange={(e) => updateAssignment(index, "quantity", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeAssignment(index)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addAssignment}>
            Add resource
          </Button>
        </div>
      ) : assignedResources.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
          <h2 className="text-lg font-semibold tracking-tight">No resources assigned</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Assign instructors, locations, materials, and equipment to this event.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignedResources.map((assignment) => {
            const resource = resourceById.get(assignment.resourceId);
            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg border bg-background/90 p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              >
                <div>
                  <p className="font-medium">{resource?.name ?? "Unknown resource"}</p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.role} · {resource?.type ?? "unknown"}
                    {assignment.quantity > 1 && ` · qty ${assignment.quantity}`}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                  {resource?.type ?? "unknown"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
