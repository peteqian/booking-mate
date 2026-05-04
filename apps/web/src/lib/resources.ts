import type { ResourceDto, EventResourceDto, UpdateEventResourcesRequest } from "@workspace/contracts";
import { api } from "./api";

export function listResources(type?: string | null) {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return api.get<{ resources: ResourceDto[] }>(`/api/resources${query}`);
}

export function listEventResources(eventId: string) {
  return api.get<{ resources: EventResourceDto[] }>(`/api/events/${eventId}/resources`);
}

export function replaceEventResources(eventId: string, input: UpdateEventResourcesRequest) {
  return api.put<{ resources: EventResourceDto[] }>(`/api/events/${eventId}/resources`, input);
}
