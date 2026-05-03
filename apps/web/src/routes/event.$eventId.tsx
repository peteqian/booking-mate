import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
          <Alert variant="destructive">
            <AlertDescription>{error || queryError?.message}</AlertDescription>
          </Alert>
        )}

        {eventQuery.isPending || !form ? (
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
                <Select value={form.status} onValueChange={(value) => value && updateForm("status", value)}>
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
      </div>
    </div>
  );
}
