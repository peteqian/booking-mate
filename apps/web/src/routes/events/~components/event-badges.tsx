import type { EventStatus, EventVisibility } from "@workspace/contracts";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: EventStatus }) {
  const variants: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
    upcoming: "default",
    completed: "secondary",
    cancelled: "destructive",
  };
  return (
    <Badge variant={variants[status]} className="h-5 px-1.5 text-[10px] capitalize">
      {status}
    </Badge>
  );
}

export function VisibilityBadge({ visibility }: { visibility: EventVisibility }) {
  const variants: Record<EventVisibility, "default" | "secondary" | "destructive" | "outline"> = {
    unpublished: "outline",
    published: "default",
    archived: "secondary",
  };
  return (
    <Badge variant={variants[visibility]} className="h-5 px-1.5 text-[10px] capitalize">
      {visibility}
    </Badge>
  );
}
