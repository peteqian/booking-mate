import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/admin/resources")({
  component: () => (
    <PlaceholderPage
      title="Resources"
      description="Manage instructors, locations, materials, and equipment."
    />
  ),
});
