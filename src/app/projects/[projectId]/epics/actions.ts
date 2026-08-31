"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addEpic(projectId: string, versionId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const count = await prisma.epic.count({ where: { projectVersionId: versionId } });
  await prisma.epic.create({
    data: { projectVersionId: versionId, name: `Épic ${count + 1}`, orderNum: count },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateEpic(id: string, projectId: string, field: "name" | "lot", value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.epic.update({ where: { id }, data: { [field]: value } });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteEpic(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.epic.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}
