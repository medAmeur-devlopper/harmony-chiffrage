"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { getProjectFinancials } from "@/lib/getProjectFinancials";

export interface StaffingUpdateResult {
  ok: true;
  overload?: { plannedJH: number; budgetJH: number; pct: number };
}

export async function updateStaffingEntry(
  projectId: string,
  versionId: string,
  profileId: string,
  weekStart: string,
  value: string
): Promise<StaffingUpdateResult> {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseFloat(value);
  const days = Number.isNaN(num) ? 0 : num;
  const date = new Date(weekStart);
  await prisma.staffingEntry.upsert({
    where: { profileId_weekStart: { profileId, weekStart: date } },
    update: { daysStaffed: days },
    create: { projectVersionId: versionId, profileId, weekStart: date, daysStaffed: days },
  });

  const [{ abaqueResults }, entries, profile] = await Promise.all([
    getProjectFinancials(versionId),
    prisma.staffingEntry.findMany({ where: { profileId } }),
    prisma.profile.findUnique({ where: { id: profileId } }),
  ]);
  const budgetJH = abaqueResults.filter((a) => a.profileId === profileId).reduce((s, a) => s + a.chargeRetenue, 0);
  const plannedJH = entries.reduce((s, e) => s + e.daysStaffed, 0);

  let overload: StaffingUpdateResult["overload"];
  if (budgetJH > 0 && plannedJH > budgetJH * 1.5) {
    const pct = ((plannedJH - budgetJH) / budgetJH) * 100;
    overload = { plannedJH, budgetJH, pct };
    await logActivity({
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      userName: user.name,
      action: "UPDATE",
      entity: "StaffingEntry",
      entityId: profileId,
      details: `Sur-allocation critique: ${plannedJH.toFixed(1)} JH planifiés vs ${budgetJH.toFixed(1)} JH budgétés (+${pct.toFixed(0)} %) — profil ${profile?.name ?? profileId}`,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, overload };
}
