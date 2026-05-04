import type { OrgRole } from "@workspace/contracts";

export function canManageEvents(role: OrgRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canDeleteEvents(role: OrgRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canManageAttendees(role: OrgRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "manager";
}
