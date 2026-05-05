import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ApiError } from "@/lib/api";
import { getCurrentOrg } from "@/lib/org";

export const Route = createFileRoute("/_auth/_org")({
  beforeLoad: async () => {
    try {
      return await getCurrentOrg();
    } catch (error) {
      if (error instanceof ApiError && error.code === "organization_required") {
        throw redirect({ to: "/onboarding" });
      }
      throw error;
    }
  },
  component: () => <Outlet />,
});
