import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  component: Settings,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
});

function Settings() {
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadOrgData();
  }, []);

  const loadOrgData = async () => {
    const orgs = await authClient.organization.list();
    if (orgs.data && orgs.data.length > 0) {
      const currentOrg = orgs.data[0];
      setOrg(currentOrg);

      const membersData = await authClient.organization.getFullOrganization({
        query: { organizationId: currentOrg.id },
      });

      if (membersData.data) {
        setMembers(membersData.data.members || []);

        const session = await authClient.getSession();
        const currentMember = membersData.data.members?.find(
          (m: any) => m.userId === session.data?.user.id,
        );
        setIsOwner(currentMember?.role === "owner");
      }
    }
    setLoaded(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
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
      loadOrgData();
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

    window.location.href = "/onboarding";
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
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">No organization</h1>
          <p className="text-muted-foreground">Create an organization before opening settings.</p>
          <Button onClick={() => (window.location.href = "/onboarding")}>
            Create organization
          </Button>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Owner access required</h1>
          <p className="text-muted-foreground">
            Only the organization owner can manage organization settings.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your organization</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Organization Details</h2>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-muted-foreground">{org.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <p className="text-muted-foreground">{org.slug}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Members</h2>

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

          <form onSubmit={handleInvite} className="space-y-2">
            <label className="text-sm font-medium">Invite Member</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 rounded-md border px-3 py-2"
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Inviting..." : "Invite"}
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Polar billing is ready for configuration. Add your Polar product ID to enable seat
            checkout.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              window.open("/api/auth/polar/portal", "_blank");
            }}
          >
            Manage Billing
          </Button>
        </div>

        <div className="space-y-4 rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Organization
          </Button>

          {showDeleteModal && (
            <div className="mt-4 space-y-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">
                This will permanently delete your organization and all associated data. This action
                cannot be undone.
              </p>
              <p className="text-sm font-medium text-red-800">Type "{org.name}" to confirm:</p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full rounded-md border border-red-300 px-3 py-2"
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
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDeleteOrg}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete Organization"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
