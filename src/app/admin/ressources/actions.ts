"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

async function requireAdminOrg() {
  const admin = await requireRole(["ADMIN"]);
  return admin;
}

export async function createResource(formData: FormData) {
  const admin = await requireAdminOrg();
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim();
  const cjm = Number(formData.get("cjm") || 0);
  if (!name || !code || !Number.isFinite(cjm)) return;

  const count = await prisma.resourceCatalog.count({ where: { organizationId: admin.organizationId } });
  const resource = await prisma.resourceCatalog.create({
    data: {
      organizationId: admin.organizationId,
      name,
      code,
      cjm,
      markupPct: 0.3,
      entity: "Harmony",
      orderNum: count,
    },
  });
  await logActivity({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.name,
    action: "CREATE",
    entity: "ResourceCatalog",
    entityId: resource.id,
    details: `${name} (${code}) — ${cjm} €/j`,
  });
  revalidatePath("/admin/ressources");
}

export async function updateResourceField(resourceId: string, field: string, value: string) {
  const admin = await requireAdminOrg();
  const resource = await prisma.resourceCatalog.findFirst({
    where: { id: resourceId, organizationId: admin.organizationId },
  });
  if (!resource) return;

  const data: Record<string, string | number> = {};
  if (field === "name") data.name = value;
  else if (field === "code") data.code = value;
  else if (field === "entity") data.entity = value;
  else if (field === "cjm") data.cjm = Number(value);
  else if (field === "markupPct") data.markupPct = Number(value);
  else return;

  await prisma.resourceCatalog.update({ where: { id: resourceId }, data });
  await logActivity({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.name,
    action: "UPDATE",
    entity: "ResourceCatalog",
    entityId: resourceId,
    details: `${field} = ${value}`,
  });
  revalidatePath("/admin/ressources");
}

export async function toggleResourceActive(resourceId: string, isActive: boolean) {
  const admin = await requireAdminOrg();
  const resource = await prisma.resourceCatalog.findFirst({
    where: { id: resourceId, organizationId: admin.organizationId },
  });
  if (!resource) return;
  await prisma.resourceCatalog.update({ where: { id: resourceId }, data: { isActive } });
  await logActivity({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.name,
    action: "UPDATE",
    entity: "ResourceCatalog",
    entityId: resourceId,
    details: isActive ? "Réactivée" : "Désactivée",
  });
  revalidatePath("/admin/ressources");
}

export async function deleteResource(resourceId: string) {
  const admin = await requireAdminOrg();
  const resource = await prisma.resourceCatalog.findFirst({
    where: { id: resourceId, organizationId: admin.organizationId },
  });
  if (!resource) return;
  await prisma.resourceCatalog.delete({ where: { id: resourceId } });
  await logActivity({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.name,
    action: "DELETE",
    entity: "ResourceCatalog",
    entityId: resourceId,
    details: `${resource.name} (${resource.code})`,
  });
  revalidatePath("/admin/ressources");
}
