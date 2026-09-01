"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { logActivity } from "@/lib/audit";

function revalidateAll(projectId: string) {
  revalidatePath(`/projects/${projectId}/gantt`);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function addMilestone(projectId: string, versionId: string, formData: FormData) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const name = (formData.get("name") as string)?.trim();
  const date = formData.get("date") as string;
  if (!name || !date) return;
  const description = (formData.get("description") as string)?.trim() || "";
  const color = (formData.get("color") as string) || "#FFC933";
  const count = await prisma.milestone.count({ where: { projectVersionId: versionId } });
  const milestone = await prisma.milestone.create({
    data: { projectVersionId: versionId, name, date: new Date(date), description, color, orderNum: count },
  });
  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entity: "Jalon",
    entityId: milestone.id,
    details: `Ajout du jalon « ${name} » prévu le ${new Date(date).toLocaleDateString("fr-FR")}`,
  });
  revalidateAll(projectId);
}

export async function updateMilestone(
  id: string,
  projectId: string,
  field: "name" | "date" | "description" | "color",
  value: string
) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  if (field === "date") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;
    await prisma.milestone.update({ where: { id }, data: { date: d } });
  } else {
    await prisma.milestone.update({ where: { id }, data: { [field]: value } });
  }
  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entity: "Jalon",
    entityId: id,
    details: `Modification du champ « ${field} »`,
  });
  revalidateAll(projectId);
}

export async function toggleMilestoneCompleted(id: string, projectId: string, completed: boolean) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const milestone = await prisma.milestone.update({ where: { id }, data: { completed } });
  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entity: "Jalon",
    entityId: id,
    details: `Jalon « ${milestone.name} » marqué comme ${completed ? "complété" : "non complété"}`,
  });
  revalidateAll(projectId);
}

export async function deleteMilestone(id: string, projectId: string) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  await prisma.milestone.delete({ where: { id } });
  if (milestone) {
    await logActivity({
      organizationId: user.organizationId,
      projectId,
      userId: user.id,
      userName: user.name,
      action: "DELETE",
      entity: "Jalon",
      entityId: id,
      details: `Suppression du jalon « ${milestone.name} »`,
    });
  }
  revalidateAll(projectId);
}

export async function generateShareLink(versionId: string, projectId: string) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const token = randomUUID();
  await prisma.projectVersion.update({ where: { id: versionId }, data: { shareToken: token } });
  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entity: "Lien de partage",
    details: "Génération d'un nouveau lien de partage client",
  });
  revalidateAll(projectId);
}

export async function revokeShareLink(versionId: string, projectId: string) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.projectVersion.update({ where: { id: versionId }, data: { shareToken: null } });
  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entity: "Lien de partage",
    details: "Révocation du lien de partage client",
  });
  revalidateAll(projectId);
}
