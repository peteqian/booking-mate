import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { makeHead } from "@workspace/seo";
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
    <div className="min-h-svh bg-muted/20">
      <header className="bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <Link
            to="/events"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← {orgData.org.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-6 px-6 py-8">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle className="font-heading text-3xl leading-tight tracking-[-0.04em]">
                {event.title}
              </CardTitle>
              {event.category ? <Badge variant="secondary">{event.category}</Badge> : null}
            </div>
            {event.description ? <CardDescription>{event.description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                When
              </p>
              <p className="mt-1 font-medium">
                {event.date} at {event.time}
              </p>
              <p className="text-muted-foreground">{event.duration} min</p>
            </div>
            {event.location ? (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Where
                </p>
                <p className="mt-1 font-medium">{event.location}</p>
              </div>
            ) : null}
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Price
              </p>
              <p className="mt-1 font-medium">
                {isPaid ? formatPrice(event.price, currency) : "Free"}
              </p>
            </div>
            {remaining !== null ? (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Availability
                </p>
                <p className="mt-1 font-medium">
                  {remaining === 0 ? "Full, joining waitlist" : `${remaining} spots left`}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Link to="/events/$eventId/book" params={{ eventId }} className="inline-block">
          <Button className="w-full sm:w-auto">{isPaid ? "Book & pay" : "Book this event"}</Button>
        </Link>
      </main>
    </div>
  );
}

function getEventDescription(
  event:
    | {
        title: string;
        description: string | null;
        date: string;
        time: string;
        location: string | null;
      }
    | undefined,
  orgName: string | undefined,
) {
  if (!event) return "View event details and registration information.";
  if (event.description) return event.description;

  const host = orgName ? ` from ${orgName}` : "";
  const location = event.location ? ` at ${event.location}` : "";
  return `${event.title}${host} on ${event.date} at ${event.time}${location}.`;
}
