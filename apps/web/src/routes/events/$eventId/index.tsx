import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { getCurrentOrg } from "@/lib/org";
import { eventQueryOptions } from "@/queries/events";
import { EventDetailPage } from "../~components/event-detail-page";

export const Route = createFileRoute("/events/$eventId/")({
  component: EventDetailRoute,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) throw redirect({ to: "/login" });

    try {
      return await getCurrentOrg();
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

function EventDetailRoute() {
  const { eventId } = Route.useParams();
  const orgContext = Route.useRouteContext() as Awaited<ReturnType<typeof getCurrentOrg>>;
  return <EventDetailPage eventId={eventId} orgContext={orgContext} />;
}
