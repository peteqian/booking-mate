import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { makeHead } from "@workspace/seo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, getPublicRequestInfo } from "@/lib/public";
import { publicEventQueryOptions, publicOrgQueryOptions } from "@/queries/public";
import { NoSubdomainPlaceholder } from "./~components/no-subdomain";

export const Route = createFileRoute("/events/$eventId/")({
  component: PublicEventDetail,
  loader: async ({ context, params }) => {
    const { origin: baseUrl, slug } = await getPublicRequestInfo();
    if (!slug) return { slug: null as string | null, baseUrl };
    const [orgData, eventData] = await Promise.all([
      context.queryClient.ensureQueryData(publicOrgQueryOptions(slug)),
      context.queryClient.ensureQueryData(publicEventQueryOptions(slug, params.eventId)),
    ]);
    return { slug, baseUrl, orgData, eventData };
  },
  head: ({ loaderData, params }) => {
    const event = loaderData?.eventData?.event;
    const orgName = loaderData?.orgData?.org.name;

    return makeHead({
      title: event?.title ?? "Event",
      description: getEventDescription(event, orgName),
      baseUrl: loaderData?.baseUrl,
      path: `/events/${params.eventId}`,
      type: "article",
      noIndex: !loaderData?.slug || !event,
    });
  },
});

function PublicEventDetail() {
  const { slug } = Route.useLoaderData();
  const { eventId } = Route.useParams();
  if (!slug) return <NoSubdomainPlaceholder />;
  return <PublicEventDetailContent slug={slug} eventId={eventId} />;
}

function PublicEventDetailContent({ slug, eventId }: { slug: string; eventId: string }) {
  const { data: orgData } = useSuspenseQuery(publicOrgQueryOptions(slug));
  const { data: eventData } = useSuspenseQuery(publicEventQueryOptions(slug, eventId));

  const event = eventData.event;
  const currency = orgData.settings?.currency ?? "USD";
  const isPaid = event.price > 0;
  const remaining =
    event.maxCapacity === null
      ? null
      : Math.max(0, event.maxCapacity - event.confirmedRegistrations);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <Link to="/events" className="text-sm underline">
            ← {orgData.org.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-6 px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-2xl">{event.title}</CardTitle>
              {event.category ? <Badge variant="secondary">{event.category}</Badge> : null}
            </div>
            {event.description ? (
              <CardDescription>{event.description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>When:</strong> {event.date} at {event.time} ({event.duration} min)
            </div>
            {event.location ? (
              <div>
                <strong>Where:</strong> {event.location}
              </div>
            ) : null}
            <div>
              <strong>Price:</strong>{" "}
              {isPaid ? formatPrice(event.price, currency) : "Free"}
            </div>
            {remaining !== null ? (
              <div>
                <strong>Availability:</strong>{" "}
                {remaining === 0 ? "Full — joining waitlist" : `${remaining} spots left`}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isPaid ? (
          <Alert>
            <AlertDescription>
              Paid registration is not available yet.{" "}
              {orgData.settings?.contactEmail ? (
                <>
                  Contact{" "}
                  <a
                    href={`mailto:${orgData.settings.contactEmail}`}
                    className="underline"
                  >
                    {orgData.settings.contactEmail}
                  </a>{" "}
                  to register.
                </>
              ) : (
                "Contact the organizer to register."
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Link
            to="/events/$eventId/book"
            params={{ eventId }}
            className="inline-block"
          >
            <Button className="w-full sm:w-auto">Book this event</Button>
          </Link>
        )}
      </main>
    </div>
  );
}

function getEventDescription(
  event: { title: string; description: string | null; date: string; time: string; location: string | null } | undefined,
  orgName: string | undefined,
) {
  if (!event) return "View event details and registration information.";
  if (event.description) return event.description;

  const host = orgName ? ` from ${orgName}` : "";
  const location = event.location ? ` at ${event.location}` : "";
  return `${event.title}${host} on ${event.date} at ${event.time}${location}.`;
}
