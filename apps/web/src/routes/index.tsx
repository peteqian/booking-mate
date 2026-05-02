import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";

export const Route = createFileRoute("/")({
  component: Index,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      return;
    }

    const orgs = await authClient.organization.list();
    if (!orgs.data || orgs.data.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
  },
});

function Index() {
  const [session, setSession] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const sessionData = await authClient.getSession();
    if (sessionData.data) {
      setSession(sessionData.data);

      const orgs = await authClient.organization.list();
      if (orgs.data && orgs.data.length > 0) {
        setOrg(orgs.data[0]);
      }
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {org && (
              <p className="text-muted-foreground">{org.name}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {session.user.email}
                </span>
                <Link to="/settings">
                  <Button variant="outline" size="sm">Settings</Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
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

        {!session && (
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

        {session && org && (
          <div className="space-y-4">
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Organization</h2>
              <div className="mt-4 grid gap-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{org.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span>{org.slug}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
