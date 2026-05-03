import type { CreateEventRequest, EventDto, UpdateEventRequest } from "@workspace/contracts";
import { api } from "./api";

export interface EventFormState {
  title: string;
  date: string;
  time: string;
  duration: string;
  maxCapacity: string;
  category: string;
  status: EventDto["status"];
  visibility: EventDto["visibility"];
  description: string;
  location: string;
  price: string;
}

export const emptyEventForm: EventFormState = {
  title: "",
  date: "",
  time: "",
  duration: "60",
  maxCapacity: "",
  category: "",
  status: "upcoming",
  visibility: "unpublished",
  description: "",
  location: "",
  price: "0.00",
};

export function eventToForm(event: EventDto): EventFormState {
  return {
    title: event.title,
    date: event.date,
    time: event.time,
    duration: String(event.duration),
    maxCapacity: event.maxCapacity === null ? "" : String(event.maxCapacity),
    category: event.category ?? "",
    status: event.status,
    visibility: event.visibility,
    description: event.description ?? "",
    location: event.location ?? "",
    price: event.price,
  };
}

export function formToEventRequest(form: EventFormState): CreateEventRequest {
  return {
    title: form.title,
    date: form.date,
    time: form.time,
    duration: Number(form.duration),
    maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : null,
    category: form.category.trim() || null,
    status: form.status,
    visibility: form.visibility,
    description: form.description.trim() || null,
    location: form.location.trim() || null,
    price: form.price,
  };
}

export function listEvents() {
  return api.get<{ events: EventDto[] }>("/api/events");
}

export function getEvent(eventId: string) {
  return api.get<{ event: EventDto }>(`/api/events/${eventId}`);
}

export function createEvent(input: CreateEventRequest) {
  return api.post<{ event: EventDto }>("/api/events", input);
}

export function updateEvent(eventId: string, input: UpdateEventRequest) {
  return api.patch<{ event: EventDto }>(`/api/events/${eventId}`, input);
}

export function deleteEvent(eventId: string) {
  return api.delete<{ deleted: true }>(`/api/events/${eventId}`);
}
