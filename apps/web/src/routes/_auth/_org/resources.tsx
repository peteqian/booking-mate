import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_auth/_org/resources")({
  component: () => (
    <PlaceholderPage
      title="Resources"
      description="Manage instructors, locations, materials, and equipment."
    />
  ),
});
