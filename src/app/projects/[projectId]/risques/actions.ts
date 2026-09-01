"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

export async function addRisk(projectId: string, versionId: string) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const count = await prisma.risk.count({ where: { projectVersionId: versionId } });
  const risk = await prisma.risk.create({
    data: { projectVersionId: versionId, name: "Nouveau risque", orderNum: count },
  });
  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entity: "Risque",
    entityId: risk.id,
    details: "Ajout d'un nouveau risque",
  });
  revalidatePath(`/projects/${projectId}/risques`);
}

const TEXT_FIELDS = ["name", "description", "mitigation", "owner"] as const;
const ENUM_FIELDS = ["probability", "impact", "status"] as const;

export async function updateRiskField(id: string, projectId: string, field: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if ((TEXT_FIELDS as readonly string[]).includes(field) || (ENUM_FIELDS as readonly string[]).includes(field)) {
    await prisma.risk.update({ where: { id }, data: { [field]: value } });
  }
  revalidatePath(`/projects/${projectId}/risques`);
}

export async function deleteRisk(id: string, projectId: string) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const risk = await prisma.risk.findUnique({ where: { id } });
  await prisma.risk.delete({ where: { id } });
  if (risk) {
    await logActivity({
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      userName: user.name,
      action: "DELETE",
      entity: "Risque",
      entityId: id,
      details: `Suppression du risque « ${risk.name} »`,
    });
  }
  revalidatePath(`/projects/${projectId}/risques`);
}
