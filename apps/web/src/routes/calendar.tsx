import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { getCurrentOrg } from "@/lib/org";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/calendar")({
  component: () => (
    <PlaceholderPage
      title="Calendar"
      description="Plan and reschedule events from calendar views."
    />
  ),
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) throw redirect({ to: "/login" });
    try {
      await getCurrentOrg();
    } catch (error) {
      if (error instanceof ApiError && error.code === "organization_required") {
        throw redirect({ to: "/onboarding" });
      }
      throw error;
    }
  },
});
