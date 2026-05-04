import { queryOptions } from "@tanstack/react-query";
import { listAttendees } from "@/lib/attendees";

export const attendeeKeys = {
  all: ["attendees"] as const,
  lists: () => [...attendeeKeys.all, "list"] as const,
  list: (search?: string | null) => [...attendeeKeys.lists(), search ?? ""] as const,
};

export const attendeesQueryOptions = (search?: string | null) =>
  queryOptions({
    queryKey: attendeeKeys.list(search),
    queryFn: () => listAttendees(search),
  });
