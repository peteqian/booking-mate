import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/queries/auth";

export const Route = createFileRoute("/_auth")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
