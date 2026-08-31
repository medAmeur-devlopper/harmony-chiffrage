"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateStaffingEntry(
  projectId: string,
  versionId: string,
  profileId: string,
  weekStart: string,
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = parseFloat(value);
  const days = Number.isNaN(num) ? 0 : num;
  const date = new Date(weekStart);
  await prisma.staffingEntry.upsert({
    where: { profileId_weekStart: { profileId, weekStart: date } },
    update: { daysStaffed: days },
    create: { projectVersionId: versionId, profileId, weekStart: date, daysStaffed: days },
  });
  revalidatePath(`/projects/${projectId}`);
}
