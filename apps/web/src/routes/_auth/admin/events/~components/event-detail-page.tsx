/* eslint-disable react/no-children-prop */
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import type { AttendeeDto, PaymentStatus, RegistrationWithAttendeeDto } from "@workspace/contracts";
import { eventQueryOptions } from "@/queries/events";
import { eventRegistrationsQueryOptions } from "@/queries/registrations";
import { attendeesQueryOptions } from "@/queries/attendees";
import { eventResourcesQueryOptions, resourcesQueryOptions } from "@/queries/resources";
import { canDeleteEvents, canManageEvents } from "@/lib/permissions";
import { useUpdateEvent, useDeleteEvent, useDuplicateEvent } from "@/hooks/use-events";
import { useCreateRegistration } from "@/hooks/use-registrations";
import { RegistrationsTable } from "./registrations-table";
import { useReplaceEventResources } from "@/hooks/use-resources";
import { useCreateAttendee } from "@/hooks/use-attendees";
import { PaymentStatusSelect, RegistrationSummary } from "./registration-summary";
import { EventResourcesTab } from "./event-resources-tab";

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
  const [activeTab, setActiveTab] = useState("details");
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

  const { data: eventResourcesData } = useQuery(eventResourcesQueryOptions(eventId));

  const { data: resourcesData, refetch: refetchResources } = useQuery(
    resourcesQueryOptions({ includeArchived: true }),
  );

  const { data: attendeesData } = useQuery({
    ...attendeesQueryOptions(),
    enabled: activeTab === "registrations",
  });

  const saveMutation = useUpdateEvent(eventId);
  const deleteMutation = useDeleteEvent();
  const duplicateMutation = useDuplicateEvent();
  const createRegistrationMutation = useCreateRegistration(eventId);
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
        await navigate({ to: "/admin/events" });
      },
      onError: (error) => {
        setError(error instanceof Error ? error.message : "Unable to delete event");
      },
    });
  };

  const registrations = registrationsData?.registrations ?? [];
  const [addRegOpen, setAddRegOpen] = useState(false);
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
            to={mode === "edit" ? "/admin/events/$eventId" : "/admin/events"}
            params={mode === "edit" ? { eventId } : undefined}
            label={mode === "edit" ? "Back to event" : "Back to events"}
          />
          <Link to="/admin/events" className="shrink-0 hover:underline">
            Events
          </Link>
          <PageBreadcrumbSeparator />
          {mode === "edit" ? (
            <>
              <Link
                to="/admin/events/$eventId"
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
      description={
        mode === "edit"
          ? (event?.title ?? "Update event details.")
          : "View and manage event details."
      }
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
                    setError(error instanceof Error ? error.message : "Unable to duplicate event"),
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

          <TabsContent value="details" className="mt-6 space-y-4">
            <SectionJumpNav />
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
                <div id="form-basics" className="scroll-mt-24 sm:col-span-2" aria-hidden />
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
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <div id="form-details" className="scroll-mt-24 sm:col-span-2" aria-hidden />
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
                  name="tags"
                  children={(field) => (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={field.name}>Tags</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        placeholder="urgent, vip, sponsor (comma separated)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Free-form labels for filtering and color hints. Comma separated.
                      </p>
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
                      <p className="text-xs text-muted-foreground">Public-facing copy.</p>
                    </div>
                  )}
                />
                <form.Field
                  name="notes"
                  children={(field) => (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={field.name}>Internal notes</Label>
                      <Textarea
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        disabled={!canManage}
                        className="min-h-24"
                        placeholder="Setup, dietary, AV requirements…"
                      />
                      <p className="text-xs text-muted-foreground">Only visible to your team.</p>
                    </div>
                  )}
                />

                <div id="form-recurrence" className="scroll-mt-24 sm:col-span-2" aria-hidden />
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
                              field.handleChange(value === "none" || value === null ? "" : value)
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
                          <ComboboxInput
                            id="attendee-combobox"
                            placeholder="Search by name or email"
                          />
                          <ComboboxContent>
                            <ComboboxList>
                              {(attendee: AttendeeDto) => (
                                <ComboboxItem key={attendee.id} value={attendee}>
                                  <div className="flex flex-col">
                                    <span className="text-sm">{attendee.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {attendee.email}
                                    </span>
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
                            <Input
                              id="attendee-name"
                              value={registrationForm.name}
                              onChange={(e) =>
                                setRegistrationForm((current) => ({
                                  ...current,
                                  name: e.target.value,
                                }))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="attendee-email">Email</Label>
                            <Input
                              id="attendee-email"
                              type="email"
                              value={registrationForm.email}
                              onChange={(e) =>
                                setRegistrationForm((current) => ({
                                  ...current,
                                  email: e.target.value,
                                }))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="attendee-phone">Phone</Label>
                            <Input
                              id="attendee-phone"
                              value={registrationForm.phone}
                              onChange={(e) =>
                                setRegistrationForm((current) => ({
                                  ...current,
                                  phone: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={registrationForm.status}
                          onValueChange={(value) =>
                            setRegistrationForm((current) => ({
                              ...current,
                              status: value as RegistrationWithAttendeeDto["status"],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                          onChange={(paymentStatus) =>
                            setRegistrationForm((current) => ({ ...current, paymentStatus }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setAddRegOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          createRegistrationMutation.isPending || createAttendeeMutation.isPending
                        }
                      >
                        {createRegistrationMutation.isPending || createAttendeeMutation.isPending
                          ? "Adding..."
                          : "Add registration"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {registrationsLoading ? (
              <p className="text-muted-foreground">Loading registrations...</p>
            ) : registrations.length === 0 ? (
              <div className="space-y-4">
                <RegistrationSummary event={event} registrations={registrations} />
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
              </div>
            ) : (
              <div className="space-y-4">
                <RegistrationSummary event={event} registrations={registrations} />
                <RegistrationsTable
                  eventId={eventId}
                  eventTitle={event.title}
                  registrations={registrations}
                  canManage={canManage}
                  canDelete={canDelete}
                  onAddClick={() => setAddRegOpen(true)}
                  onError={setError}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <EventResourcesTab
              canManage={canManage}
              allResources={allResources}
              assignedResources={assignedResources}
              resourceById={resourceById}
              replaceResourcesMutation={replaceResourcesMutation}
              refetchResources={refetchResources}
              onError={setError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

const detailSections: { id: string; label: string }[] = [
  { id: "form-basics", label: "Basics" },
  { id: "form-details", label: "Details" },
  { id: "form-recurrence", label: "Recurrence" },
];

function SectionJumpNav() {
  const jump = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav
      aria-label="Jump to form section"
      className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
    >
      {detailSections.map((section) => (
        <Button
          key={section.id}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => jump(section.id)}
        >
          {section.label}
        </Button>
      ))}
    </nav>
  );
}
