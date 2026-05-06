import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type {
  EventDto,
  PublicOrgResponse,
  PublicRegistrationRequest,
  RegistrationDto,
} from "@workspace/contracts";
import { api } from "./api";

type ServerRequestInfo = {
  forwardedHost: string | null;
  host: string | null;
  forwardedProto: string | null;
} | null;

const readServerRequestInfo = createIsomorphicFn()
  .client((): ServerRequestInfo => null)
  .server(
    (): ServerRequestInfo => ({
      forwardedHost: getRequestHeader("x-forwarded-host") ?? null,
      host: getRequestHeader("host") ?? null,
      forwardedProto: getRequestHeader("x-forwarded-proto") ?? null,
    }),
  );

export function getPublicOrg(slug: string) {
  return api.get<PublicOrgResponse>(`/api/public/orgs/${encodeURIComponent(slug)}`);
}

export function listPublicEvents(slug: string) {
  return api.get<{ events: EventDto[] }>(`/api/public/orgs/${encodeURIComponent(slug)}/events`);
}

export function getPublicEvent(slug: string, eventId: string) {
  return api.get<{ event: EventDto }>(
    `/api/public/orgs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}`,
  );
}

export function publicRegister(slug: string, eventId: string, input: PublicRegistrationRequest) {
  return api.post<{ registration: RegistrationDto }>(
    `/api/public/orgs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/register`,
    input,
  );
}

const DEFAULT_PUBLIC_HOST_SUFFIXES = ".traefik.me,.lvh.me";

export function getPublicHostSuffixes() {
  const configured = import.meta.env.VITE_PUBLIC_HOST_SUFFIXES ?? DEFAULT_PUBLIC_HOST_SUFFIXES;
  return configured
    .split(",")
    .map((suffix) => suffix.trim())
    .filter(Boolean);
}

export function extractPublicSlug(hostname: string, suffixes = getPublicHostSuffixes()): string | null {
  for (const suffix of suffixes) {
    if (hostname.endsWith(suffix)) {
      const label = hostname.slice(0, -suffix.length);
      if (label && !label.includes(".")) return label;
    }
  }
  return null;
}

export function getPublicHostname(): string | null {
  if (import.meta.env.SSR) return null;
  if (typeof window === "undefined") return null;
  return window.location.hostname;
}

export function getPublicOrigin(): string {
  const fallback = import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5678";
  if (typeof window === "undefined") return fallback;
  return window.location.origin;
}

export function getPublicSlug(): string | null {
  const hostname = getPublicHostname();
  return hostname ? extractPublicSlug(hostname) : null;
}

export function getPublicSlugFromWindow(): string | null {
  return getPublicSlug();
}

export function getPublicRequestInfo() {
  const serverInfo = readServerRequestInfo();
  if (serverInfo) {
    const host = cleanHostWithPort(serverInfo.forwardedHost ?? serverInfo.host);
    const hostname = cleanHost(host);
    const fallback = import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5678";

    if (!host || !hostname) return { origin: fallback, hostname: null, slug: null };

    const proto = serverInfo.forwardedProto ?? (isLocalHost(host) ? "http" : "https");
    return {
      origin: `${proto}://${host}`,
      hostname,
      slug: extractPublicSlug(hostname),
    };
  }

  const hostname = getPublicHostname();
  return {
    origin: getPublicOrigin(),
    hostname,
    slug: hostname ? extractPublicSlug(hostname) : null,
  };
}

export function formatPrice(price: string, currency: string) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return price;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function cleanHost(value: string | null | undefined) {
  const host = cleanHostWithPort(value);
  if (!host) return null;
  return host.split(":")[0] || null;
}

function cleanHostWithPort(value: string | null | undefined) {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function isLocalHost(host: string) {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".localhost") ||
    host.endsWith(".lvh.me") ||
    host.endsWith(".traefik.me")
  );
}
