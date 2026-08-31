"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updatePrixCible(versionId: string, projectId: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const num = value.trim() === "" ? null : parseFloat(value);
  if (num !== null && Number.isNaN(num)) return;
  await prisma.projectVersion.update({ where: { id: versionId }, data: { prixCibleHT: num } });
  revalidatePath(`/projects/${projectId}`);
}
