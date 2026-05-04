import { queryOptions } from "@tanstack/react-query";
import { listResources, listEventResources } from "@/lib/resources";

export const resourceKeys = {
  all: ["resources"] as const,
  lists: () => [...resourceKeys.all, "list"] as const,
  list: (type?: string | null) => [...resourceKeys.lists(), type ?? "all"] as const,
  eventLists: () => [...resourceKeys.all, "event"] as const,
  eventList: (eventId: string) => [...resourceKeys.eventLists(), eventId] as const,
};

export const resourcesQueryOptions = (type?: string | null) =>
  queryOptions({
    queryKey: resourceKeys.list(type),
    queryFn: () => listResources(type),
  });

export const eventResourcesQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: resourceKeys.eventList(eventId),
    queryFn: () => listEventResources(eventId),
  });
