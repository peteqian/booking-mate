import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { getCurrentOrg } from "@/lib/org";
import { eventToForm, type EventFormState } from "@/lib/events";
import type { RegistrationWithAttendeeDto } from "@workspace/contracts";
import { eventQueryOptions } from "@/queries/events";
import { eventRegistrationsQueryOptions } from "@/queries/registrations";
import { useUpdateEvent, useDeleteEvent } from "@/hooks/use-events";
import { useUpdateRegistration, useDeleteRegistration } from "@/hooks/use-registrations";

export const Route = createFileRoute("/event/$eventId")({
  component: EventDetail,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) throw redirect({ to: "/login" });

    try {
      await getCurrentOrg();
    } catch (error) {
      if (error instanceof ApiError && error.code === "organization_required") {
        throw redirect({ to: "/onboarding" });
      }

      throw error;
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(eventQueryOptions(params.eventId)),
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<EventFormState | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  const {
    data: { event },
  } = useSuspenseQuery(eventQueryOptions(eventId));

  const { data: registrationsData, isPending: registrationsLoading } = useQuery({
    ...eventRegistrationsQueryOptions(eventId),
    enabled: activeTab === "registrations",
  });

  const saveMutation = useUpdateEvent(eventId);
  const deleteMutation = useDeleteEvent();
  const updateRegistrationMutation = useUpdateRegistration(eventId);
  const deleteRegistrationMutation = useDeleteRegistration(eventId);

  useEffect(() => {
    if (event) {
      setForm(eventToForm(event));
    }
  }, [event]);

  const updateForm = (field: keyof EventFormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setError("");
    saveMutation.mutate(form, {
      onSuccess: (data) => {
        setForm(eventToForm(data.event));
      },
      onError: (error) => {
        setError(error instanceof Error ? error.message : "Unable to save event");
      },
    });
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;

    setError("");
    deleteMutation.mutate(eventId, {
      onSuccess: async () => {
        await navigate({ to: "/events" });
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

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              <Link to="/events" className="underline">
                Events
              </Link>
            </p>
            <h1 className="text-2xl font-bold">{event?.title ?? "Event"}</h1>
          </div>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="registrations">
              Registrations {registrations.length > 0 && `(${registrations.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            {!form ? (
              <p className="text-muted-foreground">Loading event...</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-6 rounded-lg border p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => updateForm("date", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={form.time}
                      onChange={(e) => updateForm("time", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={form.duration}
                      onChange={(e) => updateForm("duration", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxCapacity">Capacity</Label>
                    <Input
                      id="maxCapacity"
                      type="number"
                      min="1"
                      value={form.maxCapacity}
                      onChange={(e) => updateForm("maxCapacity", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => value && updateForm("status", value)}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={form.visibility}
                      onValueChange={(value) => value && updateForm("visibility", value)}
                    >
                      <SelectTrigger id="visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpublished">Unpublished</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={form.category}
                      onChange={(e) => updateForm("category", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      value={form.price}
                      onChange={(e) => updateForm("price", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => updateForm("location", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      className="min-h-28"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save event"}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="registrations" className="mt-6">
            {registrationsLoading ? (
              <p className="text-muted-foreground">Loading registrations...</p>
            ) : registrations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <h2 className="font-semibold">No registrations yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Registrations will appear here when attendees sign up.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{registration.attendee.name}</p>
                      <p className="text-sm text-muted-foreground">{registration.attendee.email}</p>
                      <div className="mt-1 flex gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            registration.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : registration.status === "waitlisted"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {registration.status}
                        </span>
                        {registration.paymentStatus !== "not_required" && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                            {registration.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={registration.status}
                        onValueChange={(value) => {
                          if (value) {
                            updateRegistrationMutation.mutate(
                              {
                                id: registration.id,
                                status: value as RegistrationWithAttendeeDto["status"],
                              },
                              {
                                onError: (error) => {
                                  setError(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to update registration",
                                  );
                                },
                              },
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="waitlisted">Waitlisted</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRegistration(registration.id)}
                        disabled={deleteRegistrationMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
