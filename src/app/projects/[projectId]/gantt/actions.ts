"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

function revalidateAll(projectId: string) {
  revalidatePath(`/projects/${projectId}/gantt`);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function addMilestone(projectId: string, versionId: string, formData: FormData) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const name = (formData.get("name") as string)?.trim();
  const date = formData.get("date") as string;
  if (!name || !date) return;
  const description = (formData.get("description") as string)?.trim() || "";
  const color = (formData.get("color") as string) || "#FFC933";
  const count = await prisma.milestone.count({ where: { projectVersionId: versionId } });
  await prisma.milestone.create({
    data: { projectVersionId: versionId, name, date: new Date(date), description, color, orderNum: count },
  });
  revalidateAll(projectId);
}

export async function updateMilestone(
  id: string,
  projectId: string,
  field: "name" | "date" | "description" | "color",
  value: string
) {
  await requireRole(["ADMIN", "EDITEUR"]);
  if (field === "date") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;
    await prisma.milestone.update({ where: { id }, data: { date: d } });
  } else {
    await prisma.milestone.update({ where: { id }, data: { [field]: value } });
  }
  revalidateAll(projectId);
}

export async function toggleMilestoneCompleted(id: string, projectId: string, completed: boolean) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.milestone.update({ where: { id }, data: { completed } });
  revalidateAll(projectId);
}

export async function deleteMilestone(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.milestone.delete({ where: { id } });
  revalidateAll(projectId);
}

export async function generateShareLink(versionId: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const token = randomUUID();
  await prisma.projectVersion.update({ where: { id: versionId }, data: { shareToken: token } });
  revalidateAll(projectId);
}

export async function revokeShareLink(versionId: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.projectVersion.update({ where: { id: versionId }, data: { shareToken: null } });
  revalidateAll(projectId);
}
