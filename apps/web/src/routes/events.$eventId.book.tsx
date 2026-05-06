import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { makeHead } from "@workspace/seo";
import { ApiError } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPublicRequestInfo } from "@/lib/public";
import { usePublicRegister } from "@/hooks/use-public-register";
import { publicEventQueryOptions, publicOrgQueryOptions } from "@/queries/public";
import { NoSubdomainPlaceholder } from "./~components/no-subdomain";

export const Route = createFileRoute("/events/$eventId/book")({
  component: PublicEventBook,
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
    return makeHead({
      title: event ? `Book ${event.title}` : "Book event",
      description: event?.description ?? "Enter your details to reserve a spot.",
      baseUrl: loaderData?.baseUrl,
      path: `/events/${params.eventId}/book`,
      noIndex: true,
    });
  },
});

function PublicEventBook() {
  const { slug } = Route.useLoaderData();
  const { eventId } = Route.useParams();
  if (!slug) return <NoSubdomainPlaceholder />;
  return <PublicEventBookContent slug={slug} eventId={eventId} />;
}

function PublicEventBookContent({ slug, eventId }: { slug: string; eventId: string }) {
  const { data: orgData } = useSuspenseQuery(publicOrgQueryOptions(slug));
  const { data: eventData } = useSuspenseQuery(publicEventQueryOptions(slug, eventId));

  const event = eventData.event;
  const isPaid = Number(event.price) > 0;

  const register = usePublicRegister(slug, eventId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to register. Try again.");
      }
    }
  };

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <Link
            to="/events/$eventId"
            params={{ eventId }}
            className="text-sm underline"
          >
            ← {event.title}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-8">
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
        ) : register.data ? (
          <Alert>
            <AlertDescription>
              {register.data.registration.status === "confirmed"
                ? "You're registered. Confirmation will follow by email."
                : register.data.registration.status === "waitlisted"
                  ? "Event is full — you're on the waitlist."
                  : "Registration received."}
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Book {event.title}</CardTitle>
              <CardDescription>Enter your details to reserve a spot.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Name</Label>
                  <Input
                    id="reg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Phone (optional)</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full" disabled={register.isPending}>
                  {register.isPending ? "Registering…" : "Register"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
