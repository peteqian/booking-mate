import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { EventDto } from "@workspace/contracts";
import { makeHead } from "@workspace/seo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, getPublicRequestInfo } from "@/lib/public";
import { publicEventsQueryOptions, publicOrgQueryOptions } from "@/queries/public";
import { NoSubdomainPlaceholder } from "./~components/no-subdomain";

export const Route = createFileRoute("/events/")({
  component: PublicOrgEvents,
  loader: async ({ context }) => {
    const { origin: baseUrl, slug } = await getPublicRequestInfo();
    if (!slug) return { slug: null as string | null, baseUrl };
    const [orgData, eventsData] = await Promise.all([
      context.queryClient.ensureQueryData(publicOrgQueryOptions(slug)),
      context.queryClient.ensureQueryData(publicEventsQueryOptions(slug)),
    ]);
    return { slug, baseUrl, orgData, eventsData };
  },
  head: ({ loaderData }) => {
    const orgName = loaderData?.orgData?.org.name;
    const title = orgName ? `${orgName} Events` : "Events";
    const description = orgName
      ? `Browse upcoming events from ${orgName}.`
      : "Browse upcoming events.";

    return makeHead({
      title,
      description,
      baseUrl: loaderData?.baseUrl,
      path: "/events",
      noIndex: !loaderData?.slug,
    });
  },
});

const ALL_CATEGORIES = "__all__";

function PublicOrgEvents() {
  const { slug } = Route.useLoaderData();
  if (!slug) return <NoSubdomainPlaceholder />;
  return <PublicOrgEventsContent slug={slug} />;
}

function PublicOrgEventsContent({ slug }: { slug: string }) {
  const { data: orgData } = useSuspenseQuery(publicOrgQueryOptions(slug));
  const { data: eventsData } = useSuspenseQuery(publicEventsQueryOptions(slug));

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const currency = orgData.settings?.currency ?? "USD";
  const categories = orgData.settings?.categories ?? [];

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return eventsData.events.filter((event) => {
      if (category !== ALL_CATEGORIES && event.category !== category) return false;
      if (!term) return true;
      const haystack = `${event.title} ${event.description ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [eventsData.events, search, category]);

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-6">
          {orgData.org.logo ? (
            <img
              src={orgData.org.logo}
              alt={orgData.org.name}
              className="h-12 w-12 rounded-xl object-cover shadow-xs ring-1 ring-border"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em]">
              {orgData.org.name}
            </h1>
            {orgData.settings?.contactEmail ? (
              <p className="text-sm text-muted-foreground">
                Contact:{" "}
                <a href={`mailto:${orgData.settings.contactEmail}`} className="underline">
                  {orgData.settings.contactEmail}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 rounded-2xl border bg-background/80 p-3 shadow-xs sm:flex-row">
          <Input
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={category} onValueChange={(v) => setCategory(v ?? ALL_CATEGORIES)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visibleEvents.length === 0 ? (
          <Alert>
            <AlertDescription>No events match your filters. Check back soon.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <PublicEventCard key={event.id} event={event} currency={currency} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PublicEventCard({ event, currency }: { event: EventDto; currency: string }) {
  const remaining =
    event.maxCapacity === null
      ? null
      : Math.max(0, event.maxCapacity - event.confirmedRegistrations);
  const full = remaining !== null && remaining === 0;

  return (
    <Link to="/events/$eventId" params={{ eventId: event.id }} className="block focus:outline-none">
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight tracking-[-0.02em]">
              {event.title}
            </CardTitle>
            {event.category ? <Badge variant="secondary">{event.category}</Badge> : null}
          </div>
          {event.description ? (
            <CardDescription className="line-clamp-2">{event.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>
            {event.date} · {event.time} · {event.duration} min
          </div>
          {event.location ? <div>{event.location}</div> : null}
          <div className="flex items-center justify-between pt-2">
            <span className="font-medium text-foreground">
              {event.price > 0 ? formatPrice(event.price, currency) : "Free"}
            </span>
            {remaining !== null ? (
              <span>{full ? "Waitlist only" : `${remaining} spots left`}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
