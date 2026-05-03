import type {
  CreateResourceRequest,
  ResourceDto,
  ResourceType,
  UpdateResourceRequest,
} from "@workspace/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { resources } from "../../db/schema";

export function toResourceDto(resource: typeof resources.$inferSelect): ResourceDto {
  return {
    id: resource.id,
    orgId: resource.orgId,
    type: resource.type,
    name: resource.name,
    description: resource.description,
    email: resource.email,
    phone: resource.phone,
    capacity: resource.capacity,
    url: resource.url,
    metadata: resource.metadata,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  };
}

export async function listResources(
  orgId: string,
  type: ResourceType | null,
): Promise<ResourceDto[]> {
  const rows = await db
    .select()
    .from(resources)
    .where(
      type ? and(eq(resources.orgId, orgId), eq(resources.type, type)) : eq(resources.orgId, orgId),
    );

  return rows.map(toResourceDto);
}

export async function getResource(orgId: string, resourceId: string): Promise<ResourceDto | null> {
  const rows = await db
    .select()
    .from(resources)
    .where(and(eq(resources.orgId, orgId), eq(resources.id, resourceId)))
    .limit(1);

  return rows[0] ? toResourceDto(rows[0]) : null;
}

export async function createResource(
  orgId: string,
  input: CreateResourceRequest,
): Promise<ResourceDto> {
  const rows = await db
    .insert(resources)
    .values({
      orgId,
      type: input.type,
      name: input.name,
      description: input.description ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      capacity: input.capacity ?? null,
      url: input.url ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return toResourceDto(rows[0]);
}

export async function updateResource(
  orgId: string,
  resourceId: string,
  input: UpdateResourceRequest,
): Promise<ResourceDto | null> {
  const rows = await db
    .update(resources)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(resources.orgId, orgId), eq(resources.id, resourceId)))
    .returning();

  return rows[0] ? toResourceDto(rows[0]) : null;
}

export async function deleteResource(orgId: string, resourceId: string): Promise<boolean> {
  const rows = await db
    .delete(resources)
    .where(and(eq(resources.orgId, orgId), eq(resources.id, resourceId)))
    .returning({ id: resources.id });

  return rows.length > 0;
}
