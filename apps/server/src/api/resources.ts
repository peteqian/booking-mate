import { Hono } from "hono";
import type { Context } from "hono";
import type {
  CreateResourceRequest,
  ResourceType,
  UpdateResourceRequest,
} from "@workspace/contracts";
import { apiError } from "./errors";
import type { ApiEnv } from "./types";
import { requireAuth, requireOrg, requireRole } from "../middleware/auth";
import {
  createResource,
  deleteResource,
  getResource,
  listResources,
  updateResource,
} from "../services/resources";

const resourceTypes = ["instructor", "material", "location", "equipment", "custom"] as const;

function isResourceType(value: string): value is ResourceType {
  return resourceTypes.includes(value as ResourceType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string"
    ? value
    : value === null || value === undefined
      ? null
      : undefined;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : value === null || value === undefined
      ? null
      : undefined;
}

function parseCreateResource(input: unknown): CreateResourceRequest | string {
  if (!isRecord(input)) return "Request body must be an object";
  if (typeof input.type !== "string" || !isResourceType(input.type))
    return "Resource type is invalid";
  if (typeof input.name !== "string" || input.name.trim().length === 0)
    return "Resource name is required";

  const description = stringOrNull(input.description);
  const email = stringOrNull(input.email);
  const phone = stringOrNull(input.phone);
  const capacity = numberOrNull(input.capacity);
  const url = stringOrNull(input.url);

  if (description === undefined) return "Description must be a string or null";
  if (email === undefined) return "Email must be a string or null";
  if (phone === undefined) return "Phone must be a string or null";
  if (capacity === undefined) return "Capacity must be an integer or null";
  if (url === undefined) return "URL must be a string or null";
  if (input.metadata !== undefined && !isRecord(input.metadata))
    return "Metadata must be an object";

  return {
    type: input.type,
    name: input.name.trim(),
    description,
    email,
    phone,
    capacity,
    url,
    metadata: input.metadata ?? {},
  };
}

function parseUpdateResource(input: unknown): UpdateResourceRequest | string {
  if (!isRecord(input)) return "Request body must be an object";

  const parsed: UpdateResourceRequest = {};

  if (input.type !== undefined) {
    if (typeof input.type !== "string" || !isResourceType(input.type))
      return "Resource type is invalid";
    parsed.type = input.type;
  }

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim().length === 0)
      return "Resource name is required";
    parsed.name = input.name.trim();
  }

  for (const field of ["description", "email", "phone", "url"] as const) {
    if (input[field] !== undefined) {
      const value = stringOrNull(input[field]);
      if (value === undefined) return `${field} must be a string or null`;
      parsed[field] = value;
    }
  }

  if (input.capacity !== undefined) {
    const capacity = numberOrNull(input.capacity);
    if (capacity === undefined) return "Capacity must be an integer or null";
    parsed.capacity = capacity;
  }

  if (input.metadata !== undefined) {
    if (!isRecord(input.metadata)) return "Metadata must be an object";
    parsed.metadata = input.metadata;
  }

  if (Object.keys(parsed).length === 0) return "At least one field is required";

  return parsed;
}

async function readJson(c: Context<ApiEnv>) {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export const resourceRoutes = new Hono<ApiEnv>()
  .use("*", requireAuth, requireOrg)
  .get("/", async (c) => {
    const type = c.req.query("type") ?? null;

    if (type !== null && !isResourceType(type)) {
      return apiError(c, 400, "invalid_resource_type", "Resource type is invalid");
    }

    const resources = await listResources(c.var.orgId, type);
    return c.json({ resources });
  })
  .post("/", requireRole("manager"), async (c) => {
    const input = parseCreateResource(await readJson(c));

    if (typeof input === "string") {
      return apiError(c, 400, "invalid_resource", input);
    }

    const resource = await createResource(c.var.orgId, input);
    return c.json({ resource }, 201);
  })
  .get("/:resourceId", async (c) => {
    const resource = await getResource(c.var.orgId, c.req.param("resourceId"));

    if (!resource) {
      return apiError(c, 404, "resource_not_found", "Resource not found");
    }

    return c.json({ resource });
  })
  .patch("/:resourceId", requireRole("manager"), async (c) => {
    const input = parseUpdateResource(await readJson(c));

    if (typeof input === "string") {
      return apiError(c, 400, "invalid_resource", input);
    }

    const resource = await updateResource(c.var.orgId, c.req.param("resourceId"), input);

    if (!resource) {
      return apiError(c, 404, "resource_not_found", "Resource not found");
    }

    return c.json({ resource });
  })
  .delete("/:resourceId", requireRole("admin"), async (c) => {
    const deleted = await deleteResource(c.var.orgId, c.req.param("resourceId"));

    if (!deleted) {
      return apiError(c, 404, "resource_not_found", "Resource not found");
    }

    return c.json({ deleted: true });
  });
