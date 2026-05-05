import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/_org/calendar")({
  component: () => (
    <PlaceholderPage
      title="Calendar"
      description="Plan and reschedule events from calendar views."
    />
  ),
});
