export * from "./auth-schema";

import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () => timestamp("updated_at").notNull().defaultNow();

export const orgRole = pgEnum("org_role", ["owner", "admin", "manager", "viewer"]);
export const orgPlan = pgEnum("org_plan", ["free", "pro"]);
export const eventStatus = pgEnum("event_status", ["upcoming", "completed", "cancelled"]);
export const eventVisibility = pgEnum("event_visibility", ["published", "unpublished"]);
export const registrationStatus = pgEnum("registration_status", [
  "confirmed",
  "waitlisted",
  "cancelled",
]);
export const paymentStatus = pgEnum("payment_status", [
  "not_required",
  "pending",
  "paid",
  "refunded",
  "expired",
]);
export const resourceType = pgEnum("resource_type", [
  "instructor",
  "material",
  "location",
  "equipment",
  "custom",
]);
export const webhookDeliveryStatus = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
  "dead_letter",
]);

export const orgSettings = pgTable(
  "org_settings",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    plan: orgPlan("plan").notNull().default("free"),
    contactEmail: text("contact_email"),
    currency: text("currency").notNull().default("USD"),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    categoryConfigs: jsonb("category_configs")
      .$type<import("@workspace/contracts").CategoryConfigs>()
      .notNull()
      .default({}),
    webhookUrl: text("webhook_url"),
    webhookSecret: text("webhook_secret"),
    emailTemplates: jsonb("email_templates").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("org_settings_org_id_idx").on(table.orgId)],
);

export const resources = pgTable(
  "resources",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: resourceType("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    email: text("email"),
    phone: text("phone"),
    capacity: integer("capacity"),
    url: text("url"),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    currency: text("currency"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("resources_org_id_idx").on(table.orgId),
    index("resources_org_type_idx").on(table.orgId, table.type),
    index("resources_org_archived_at_idx").on(table.orgId, table.archivedAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    notes: text("notes"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    date: text("date").notNull(),
    time: time("time").notNull(),
    duration: integer("duration").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    maxCapacity: integer("max_capacity"),
    location: text("location"),
    status: eventStatus("status").notNull().default("upcoming"),
    visibility: eventVisibility("visibility").notNull().default("unpublished"),
    archivedAt: timestamp("archived_at"),
    recurring: boolean("recurring").notNull().default(false),
    recurrenceFrequency: text("recurrence_frequency"),
    recurrenceDays: jsonb("recurrence_days").$type<string[]>().notNull().default([]),
    recurrenceInterval: integer("recurrence_interval"),
    recurrenceEndDate: text("recurrence_end_date"),
    price: numeric("price", { precision: 10, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("events_org_id_idx").on(table.orgId),
    index("events_org_date_idx").on(table.orgId, table.date),
    index("events_org_status_idx").on(table.orgId, table.status),
    index("events_org_visibility_idx").on(table.orgId, table.visibility),
    index("events_org_archived_at_idx").on(table.orgId, table.archivedAt),
  ],
);

export const eventResources = pgTable(
  "event_resources",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("event_resources_org_id_idx").on(table.orgId),
    index("event_resources_event_id_idx").on(table.eventId),
    uniqueIndex("event_resources_event_resource_role_idx").on(
      table.eventId,
      table.resourceId,
      table.role,
    ),
  ],
);

export const attendees = pgTable(
  "attendees",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("attendees_org_id_idx").on(table.orgId),
    uniqueIndex("attendees_org_email_idx").on(table.orgId, table.email),
  ],
);

export const registrations = pgTable(
  "registrations",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    attendeeId: text("attendee_id")
      .notNull()
      .references(() => attendees.id, { onDelete: "cascade" }),
    status: registrationStatus("status").notNull().default("confirmed"),
    paymentStatus: paymentStatus("payment_status").notNull().default("not_required"),
    checkoutSessionId: text("checkout_session_id"),
    paymentProvider: text("payment_provider"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("registrations_org_id_idx").on(table.orgId),
    index("registrations_event_id_idx").on(table.eventId),
    index("registrations_attendee_id_idx").on(table.attendeeId),
  ],
);

export const paymentConnections = pgTable(
  "payment_connections",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    accountId: text("account_id").notNull(),
    status: text("status").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("payment_connections_org_provider_idx").on(table.orgId, table.provider)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: webhookDeliveryStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lastAttemptAt: timestamp("last_attempt_at"),
    lastError: text("last_error"),
    responseStatus: integer("response_status"),
    durationMs: integer("duration_ms"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("webhook_deliveries_org_id_idx").on(table.orgId),
    index("webhook_deliveries_org_status_idx").on(table.orgId, table.status),
  ],
);
