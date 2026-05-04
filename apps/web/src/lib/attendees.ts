import type { AttendeeDto, CreateAttendeeRequest } from "@workspace/contracts";
import { api } from "./api";

export function listAttendees(search?: string | null) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return api.get<{ attendees: AttendeeDto[] }>(`/api/attendees${query}`);
}

export function createAttendee(input: CreateAttendeeRequest) {
  return api.post<{ attendee: AttendeeDto }>("/api/attendees", input);
}
