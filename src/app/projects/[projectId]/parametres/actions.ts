"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateComplexityCharge(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseFloat(value);
  if (Number.isNaN(num)) return;
  await prisma.complexityLevel.update({ where: { id }, data: { chargeJH: num } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProfile(
  id: string,
  projectId: string,
  field: "cjm" | "markupPct" | "entity",
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if (field === "entity") {
    await prisma.profile.update({ where: { id }, data: { entity: value } });
  } else {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    await prisma.profile.update({ where: { id }, data: { [field]: num } });
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function updateIaLevel(versionId: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.projectVersion.update({ where: { id: versionId }, data: { iaLevel: value } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateIaRatio(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseFloat(value);
  if (Number.isNaN(num)) return;
  await prisma.iaLevelOption.update({ where: { id }, data: { ratio: num } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addProfile(projectId: string, versionId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const count = await prisma.profile.count({ where: { projectVersionId: versionId } });
  await prisma.profile.create({
    data: {
      projectVersionId: versionId,
      name: "Nouveau profil",
      code: `P${count + 1}`,
      cjm: 0,
      markupPct: 0.3,
      entity: "Harmony",
      orderNum: count,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Deletes a profile from the resource table. Refused if any abaque activity is still
 * assigned to it, since removing the profile would silently drop that charge from the costing.
 */
export async function deleteProfile(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const usageCount = await prisma.activity.count({ where: { profileId: id } });
  if (usageCount > 0) return;
  await prisma.profile.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}

const PROVISION_FIELDS = [
  "provisionRisqueOperationnel",
  "provisionRisqueFinancier",
  "markupProvisions",
  "garantieBonneExecution",
  "penaliteRetardPlafond",
  "fourchetteHaute",
  "fourchetteBasse",
  "tva",
  "echeancierLancement",
  "echeancierRecetteFinale",
  "echeancierRetenue",
] as const;

export async function updateProvision(
  versionId: string,
  projectId: string,
  field: (typeof PROVISION_FIELDS)[number],
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if (!PROVISION_FIELDS.includes(field)) return;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return;
  await prisma.projectVersion.update({ where: { id: versionId }, data: { [field]: num } });
  revalidatePath(`/projects/${projectId}`);
}
