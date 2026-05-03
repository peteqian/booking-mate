import { createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$invitationId")({
  component: Invite,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
});

function Invite() {
  const { invitationId } = useParams({ from: "/invite/$invitationId" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkExistingOrg();
  }, []);

  const checkExistingOrg = async () => {
    const orgs = await authClient.organization.list();
    if (orgs.data && orgs.data.length > 0) {
      setError("You already belong to an organization.");
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    setError("");

    const result = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to accept invitation");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  };

  if (success) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-green-600">Invitation accepted!</h1>
          <p>Redirecting to your organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Organization Invitation</h1>
          <p className="text-muted-foreground">You've been invited to join an organization</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!error && (
          <Button onClick={handleAccept} className="w-full" disabled={loading}>
            {loading ? "Accepting..." : "Accept Invitation"}
          </Button>
        )}
      </div>
    </div>
  );
}
