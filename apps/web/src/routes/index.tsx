import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { EventDto } from "@workspace/contracts";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { ApiError } from "@/lib/api";
import { createEvent, emptyEventForm, formToEventRequest, listEvents } from "@/lib/events";
import type { EventFormState } from "@/lib/events";
import { getCurrentOrg, type CurrentOrgResponse } from "@/lib/org";

interface SessionData {
  user: {
    email: string;
  };
}

export const Route = createFileRoute("/")({
  component: Index,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      return;
    }

    try {
      await getCurrentOrg();
    } catch (error) {
      if (error instanceof ApiError && error.code === "organization_required") {
        throw redirect({ to: "/onboarding" });
      }

      throw error;
    }
  },
});

function Index() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionData | null>(null);
  const [orgContext, setOrgContext] = useState<CurrentOrgResponse | null>(null);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: async () => {
      setEventForm(emptyEventForm);
      const eventsData = await listEvents();
      setEvents(eventsData.events);
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Unable to create event");
    },
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setError("");

    try {
      const sessionData = await authClient.getSession();
      if (!sessionData.data) {
        setSession(null);
        return;
      }

      setSession(sessionData.data);
      const currentOrg = await getCurrentOrg();
      const eventsData = await listEvents();
      setOrgContext(currentOrg);
      setEvents(eventsData.events);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  const updateEventForm = (field: keyof EventFormState, value: string) => {
    setEventForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createEventMutation.mutate(formToEventRequest(eventForm));
  };

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {orgContext && <p className="text-muted-foreground">{orgContext.org.name}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {session ? (
              <>
                <span className="text-sm text-muted-foreground">{session.user.email}</span>
                <Link to="/events">
                  <Button variant="outline" size="sm">
                    Events
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="outline" size="sm">
                    Settings
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!session && !loading && (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-muted-foreground">
              Please{" "}
              <Link to="/login" className="font-medium underline">
                sign in
              </Link>{" "}
              to access your organization.
            </p>
          </div>
        )}

        {session && orgContext && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="space-y-4 rounded-lg border p-6">
              <div>
                <h2 className="text-lg font-semibold">Events</h2>
                <p className="text-sm text-muted-foreground">
                  Create your first bookable event and confirm it appears here.
                </p>
              </div>

              {events.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center">
                  <h3 className="font-semibold">Create your first event</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add the basic schedule, capacity, and pricing details to start taking bookings.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      to="/events/$eventId"
                      params={{ eventId: event.id }}
                      className="block rounded-md border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {event.date} at {event.time} · {event.duration} min
                          </p>
                          {event.location && (
                            <p className="text-sm text-muted-foreground">{event.location}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                          {event.visibility}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold">New Event</h2>
              <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
                <Field label="Title" id="title">
                  <input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) => updateEventForm("title", e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                    required
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date" id="date">
                    <input
                      id="date"
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => updateEventForm("date", e.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                      required
                    />
                  </Field>
                  <Field label="Time" id="time">
                    <input
                      id="time"
                      type="time"
                      value={eventForm.time}
                      onChange={(e) => updateEventForm("time", e.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                      required
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Duration" id="duration">
                    <input
                      id="duration"
                      type="number"
                      min="1"
                      value={eventForm.duration}
                      onChange={(e) => updateEventForm("duration", e.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                      required
                    />
                  </Field>
                  <Field label="Capacity" id="maxCapacity">
                    <input
                      id="maxCapacity"
                      type="number"
                      min="1"
                      value={eventForm.maxCapacity}
                      onChange={(e) => updateEventForm("maxCapacity", e.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Category" id="category">
                  <input
                    id="category"
                    value={eventForm.category}
                    onChange={(e) => updateEventForm("category", e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                    placeholder="Workshop"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Visibility" id="visibility">
                    <select
                      id="visibility"
                      value={eventForm.visibility}
                      onChange={(e) => updateEventForm("visibility", e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2"
                    >
                      <option value="unpublished">Unpublished</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </Field>
                  <Field label="Price" id="price">
                    <input
                      id="price"
                      value={eventForm.price}
                      onChange={(e) => updateEventForm("price", e.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                      required
                    />
                  </Field>
                </div>

                <Field label="Location" id="location">
                  <input
                    id="location"
                    value={eventForm.location}
                    onChange={(e) => updateEventForm("location", e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </Field>

                <Field label="Description" id="description">
                  <textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => updateEventForm("description", e.target.value)}
                    className="min-h-24 w-full rounded-md border px-3 py-2"
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? "Creating..." : "Create event"}
                </Button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
