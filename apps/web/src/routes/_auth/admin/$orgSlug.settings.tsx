import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authKeys } from "@/queries/auth";

export const Route = createFileRoute("/_auth/admin/$orgSlug/settings")({
  component: OrganizationSettings,
});

function OrganizationSettings() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadOrgData = useCallback(async () => {
    const orgs = await authClient.organization.list();
    const currentOrg = orgs.data?.find((org) => org.slug === orgSlug);

    if (currentOrg) {
      setOrg(currentOrg);

      const membersData = await authClient.organization.getFullOrganization({
        query: { organizationId: currentOrg.id },
      });

      if (membersData.data) {
        setMembers(membersData.data.members || []);

        const session = await authClient.getSession();
        const currentMember = membersData.data.members?.find(
          (member: any) => member.userId === session.data?.user.id,
        );
        setIsOwner(currentMember?.role === "owner");
      }
    }

    setLoaded(true);
  }, [orgSlug]);

  useEffect(() => {
    void loadOrgData();
  }, [loadOrgData]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await authClient.organization.inviteMember({
      email: inviteEmail,
      role: "admin",
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to send invitation");
    } else {
      setInviteEmail("");
      void loadOrgData();
    }

    setLoading(false);
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirm !== org?.name) {
      setError("Organization name doesn't match");
      return;
    }

    setLoading(true);
    const result = await authClient.organization.delete({
      organizationId: org.id,
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to delete organization");
      setLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: authKeys.currentOrg });
    await navigate({ to: "/onboarding" });
  };

  if (!loaded) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <AppShell title="Organization settings" description="Manage organization settings.">
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Organization not found</h1>
          <p className="text-muted-foreground">No organization exists for slug “{orgSlug}”.</p>
          <Button onClick={() => void navigate({ to: "/admin" })}>Back to dashboard</Button>
        </div>
      </AppShell>
    );
  }

  if (!isOwner) {
    return (
      <AppShell title="Organization settings" description="Manage organization settings.">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Owner access required</CardTitle>
              <CardDescription>
                Only the organization owner can manage organization settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => void navigate({ to: "/admin" })}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Organization settings" description="Manage organization-wide settings.">
      <div className="mx-auto max-w-2xl space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-muted-foreground">{org.name}</p>
            </div>
            <div>
              <Label>Slug</Label>
              <p className="text-muted-foreground">{org.slug}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{member.user.name || member.user.email}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs">{member.role}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label>Invite Member</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-8">
                {loading ? "Inviting..." : "Invite"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Polar billing is ready for configuration. Add your Polar product ID to enable seat
              checkout.
            </CardDescription>
            <Button
              variant="outline"
              onClick={() => {
                window.open("/api/auth/polar/portal", "_blank");
              }}
            >
              Manage Billing
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Organization
            </Button>

            {showDeleteModal && (
              <div className="space-y-4 rounded-md bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  This will permanently delete your organization and all associated data. This
                  action cannot be undone.
                </p>
                <p className="text-sm font-medium text-destructive">
                  Type "{org.name}" to confirm:
                </p>
                <Input
                  type="text"
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                  className="border-destructive"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirm("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteOrg} disabled={loading}>
                    {loading ? "Deleting..." : "Delete Organization"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
