import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { getCurrentOrg } from "@/lib/org";
import { eventsQueryOptions } from "@/queries/events";

export const Route = createFileRoute("/events")({
  component: Events,
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
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
});

function Events() {
  const {
    data: { events },
  } = useSuspenseQuery(eventsQueryOptions);

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              <Link to="/" className="underline">
                Dashboard
              </Link>
            </p>
            <h1 className="text-2xl font-bold">Events</h1>
          </div>
          <Link to="/">
            <Button variant="outline">Create on dashboard</Button>
          </Link>
        </header>

        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <h2 className="font-semibold">No events yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first event from the dashboard, then manage it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                to="/event/$eventId"
                params={{ eventId: event.id }}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{event.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {event.date} at {event.time} · {event.duration} min
                    </p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {event.status}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {event.visibility}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
