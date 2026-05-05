import { createFileRoute } from "@tanstack/react-router";
import { getCurrentOrg } from "@/lib/org";
import { eventQueryOptions } from "@/queries/events";
import { EventDetailPage } from "../~components/event-detail-page";

export const Route = createFileRoute("/_auth/_org/events/$eventId/")({
  component: EventDetailRoute,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(eventQueryOptions(params.eventId)),
});

function EventDetailRoute() {
  const { eventId } = Route.useParams();
  const orgContext = Route.useRouteContext() as Awaited<ReturnType<typeof getCurrentOrg>>;
  return <EventDetailPage eventId={eventId} orgContext={orgContext} />;
}
