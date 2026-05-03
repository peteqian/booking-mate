import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { getCurrentOrg } from "@/lib/org";
import {
  deleteEvent,
  eventToForm,
  formToEventRequest,
  getEvent,
  type EventFormState,
  updateEvent,
} from "@/lib/events";

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
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventFormState | null>(null);
  const [error, setError] = useState("");

  const eventQuery = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => getEvent(eventId),
  });

  const saveMutation = useMutation({
    mutationFn: (input: EventFormState) => updateEvent(eventId, formToEventRequest(input)),
    onSuccess: async (data) => {
      setForm(eventToForm(data.event));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["events", eventId] }),
      ]);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Unable to save event");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await navigate({ to: "/events" });
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Unable to delete event");
    },
  });

  useEffect(() => {
    if (eventQuery.data?.event) {
      setForm(eventToForm(eventQuery.data.event));
    }
  }, [eventQuery.data?.event]);

  const updateForm = (field: keyof EventFormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setError("");
    saveMutation.mutate(form);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;

    setError("");
    deleteMutation.mutate();
  };

  const event = eventQuery.data?.event ?? null;
  const queryError = eventQuery.error;

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
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || eventQuery.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </header>

        {(error || queryError) && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error || queryError?.message}</p>
          </div>
        )}

        {eventQuery.isPending || !form ? (
          <p className="text-muted-foreground">Loading event...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 rounded-lg border p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" id="title" className="sm:col-span-2">
                <input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </Field>

              <Field label="Date" id="date">
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm("date", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </Field>
              <Field label="Time" id="time">
                <input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={(e) => updateForm("time", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </Field>

              <Field label="Duration" id="duration">
                <input
                  id="duration"
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) => updateForm("duration", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </Field>
              <Field label="Capacity" id="maxCapacity">
                <input
                  id="maxCapacity"
                  type="number"
                  min="1"
                  value={form.maxCapacity}
                  onChange={(e) => updateForm("maxCapacity", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                />
              </Field>

              <Field label="Status" id="status">
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Visibility" id="visibility">
                <select
                  id="visibility"
                  value={form.visibility}
                  onChange={(e) => updateForm("visibility", e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="unpublished">Unpublished</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>

              <Field label="Category" id="category">
                <input
                  id="category"
                  value={form.category}
                  onChange={(e) => updateForm("category", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                />
              </Field>
              <Field label="Price" id="price">
                <input
                  id="price"
                  value={form.price}
                  onChange={(e) => updateForm("price", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  required
                />
              </Field>

              <Field label="Location" id="location" className="sm:col-span-2">
                <input
                  id="location"
                  value={form.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                />
              </Field>

              <Field label="Description" id="description" className="sm:col-span-2">
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  className="min-h-28 w-full rounded-md border px-3 py-2"
                />
              </Field>
            </div>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save event"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
