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
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function updatePhaseDuration(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseInt(value, 10);
  if (Number.isNaN(num) || num < 0) return;
  await prisma.lotPhase.update({ where: { id }, data: { durationWeeks: num } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capacity`);
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
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function updateLotDescription(id: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.lot.update({ where: { id }, data: { description: value } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addLot(versionId: string, projectId: string, name: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const trimmed = name.trim();
  if (!trimmed) return;
  const maxOrder = await prisma.lot.aggregate({ where: { projectVersionId: versionId }, _max: { orderNum: true } });
  const nextOrder = (maxOrder._max.orderNum ?? -1) + 1;
  const { LOT_PHASES, DEFAULT_LOT_PHASE_DURATIONS } = await import("@/lib/constants");
  const lot = await prisma.lot.create({
    data: { projectVersionId: versionId, name: trimmed, orderNum: nextOrder },
  });
  for (let j = 0; j < LOT_PHASES.length; j++) {
    const phase = LOT_PHASES[j];
    await prisma.lotPhase.create({
      data: { lotId: lot.id, phase, durationWeeks: DEFAULT_LOT_PHASE_DURATIONS[phase], orderNum: j },
    });
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function deleteLot(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.lot.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function addPhase(lotId: string, projectId: string, phase: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const { PHASES, DEFAULT_LOT_PHASE_DURATIONS } = await import("@/lib/constants");
  if (!PHASES.includes(phase as (typeof PHASES)[number])) return;

  const existing = await prisma.lotPhase.findMany({ where: { lotId } });
  if (existing.some((p) => p.phase === phase)) return;

  const maxOrder = existing.reduce((max, p) => Math.max(max, p.orderNum), -1);
  await prisma.lotPhase.create({
    data: {
      lotId,
      phase,
      durationWeeks: DEFAULT_LOT_PHASE_DURATIONS[phase as keyof typeof DEFAULT_LOT_PHASE_DURATIONS],
      orderNum: maxOrder + 1,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function deletePhase(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const target = await prisma.lotPhase.findUnique({ where: { id } });
  if (!target) return;

  await prisma.lotPhase.delete({ where: { id } });

  // Reindex remaining phases in the lot so orderNum stays contiguous for the cascade.
  const remaining = await prisma.lotPhase.findMany({
    where: { lotId: target.lotId },
    orderBy: { orderNum: "asc" },
  });
  await Promise.all(
    remaining.map((p, idx) =>
      p.orderNum === idx ? Promise.resolve() : prisma.lotPhase.update({ where: { id: p.id }, data: { orderNum: idx } })
    )
  );
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function renamePhase(id: string, projectId: string, label: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const trimmed = label.trim();
  await prisma.lotPhase.update({ where: { id }, data: { customLabel: trimmed === "" ? null : trimmed } });
  revalidatePath(`/projects/${projectId}`);
}

export async function reorderPhase(id: string, projectId: string, direction: "up" | "down") {
  await requireRole(["ADMIN", "EDITEUR"]);
  const target = await prisma.lotPhase.findUnique({ where: { id } });
  if (!target) return;

  const siblings = await prisma.lotPhase.findMany({
    where: { lotId: target.lotId },
    orderBy: { orderNum: "asc" },
  });
  const idx = siblings.findIndex((p) => p.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const other = siblings[swapIdx];
  await prisma.$transaction([
    prisma.lotPhase.update({ where: { id: target.id }, data: { orderNum: other.orderNum } }),
    prisma.lotPhase.update({ where: { id: other.id }, data: { orderNum: target.orderNum } }),
  ]);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capacity`);
}
