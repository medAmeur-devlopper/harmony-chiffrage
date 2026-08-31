"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PHASES, DEFAULT_EXCHANGE_RATES, Currency } from "@/lib/constants";

export async function updateChargeDirecte(versionId: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = value.trim() === "" ? null : parseFloat(value);
  if (num !== null && Number.isNaN(num)) return;
  await prisma.projectVersion.update({ where: { id: versionId }, data: { chargeDirecte: num } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateActivity(
  id: string,
  projectId: string,
  field: "activityName" | "profileId" | "abaquePct" | "gainRefPct" | "phase",
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if (field === "activityName") {
    await prisma.activity.update({ where: { id }, data: { activityName: value || null } });
  } else if (field === "profileId") {
    await prisma.activity.update({ where: { id }, data: { profileId: value || null } });
  } else if (field === "phase") {
    if (!(PHASES as readonly string[]).includes(value)) return;
    await prisma.activity.update({ where: { id }, data: { phase: value } });
  } else {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    await prisma.activity.update({ where: { id }, data: { [field]: num } });
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function addActivity(projectId: string, versionId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const count = await prisma.activity.count({ where: { projectVersionId: versionId } });
  await prisma.activity.create({
    data: {
      projectVersionId: versionId,
      orderNum: count,
      phase: "CADRAGE",
      activityName: null,
      profileId: null,
      abaquePct: 0,
      gainRefPct: 0,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteActivity(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.activity.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}


export async function addResourceLine(projectId: string, versionId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const count = await prisma.resourceLine.count({ where: { projectVersionId: versionId } });
  await prisma.resourceLine.create({
    data: {
      projectVersionId: versionId,
      category: "Autres",
      resourceName: "Nouvelle ressource",
      entity: "Harmony",
      unit: "UT",
      unitCost: 0,
      currency: "MAD",
      exchangeRate: 1,
      markupPct: 0.3,
      quantity: 0,
      orderNum: count,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateResourceLine(
  id: string,
  projectId: string,
  field: "category" | "resourceName" | "entity" | "unit" | "unitCost" | "currency" | "exchangeRate" | "markupPct" | "quantity",
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if (["unitCost", "exchangeRate", "markupPct", "quantity"].includes(field)) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    await prisma.resourceLine.update({ where: { id }, data: { [field]: num } });
  } else if (field === "currency") {
    const rate = DEFAULT_EXCHANGE_RATES[value as Currency] ?? 1;
    await prisma.resourceLine.update({ where: { id }, data: { currency: value, exchangeRate: rate } });
  } else {
    await prisma.resourceLine.update({ where: { id }, data: { [field]: value } });
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteResourceLine(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.resourceLine.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}
