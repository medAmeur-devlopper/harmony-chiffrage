"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProjectStartDate(versionId: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return;
  await prisma.projectVersion.update({ where: { id: versionId }, data: { projectStartDate: date } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updatePhaseDuration(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseInt(value, 10);
  if (Number.isNaN(num) || num < 0) return;
  await prisma.lotPhase.update({ where: { id }, data: { durationWeeks: num } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updatePhaseProgress(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return;
  const clamped = Math.min(100, Math.max(0, num));
  await prisma.lotPhase.update({ where: { id }, data: { progress: clamped } });
  revalidatePath(`/projects/${projectId}`);
}

/** Overrides the sequential lot cascade so this phase (and its lot) starts on a fixed date — enables running lots in parallel. */
export async function updatePhaseManualStart(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const date = value.trim() === "" ? null : new Date(value);
  if (date !== null && Number.isNaN(date.getTime())) return;
  await prisma.lotPhase.update({ where: { id }, data: { manualStartDate: date } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateLotDescription(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.lot.update({ where: { id }, data: { description: value } });
  revalidatePath(`/projects/${projectId}`);
}
