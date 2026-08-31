"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProjectField(projectId: string, field: string, value: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const allowed = ["name", "client", "reference", "preparedBy", "status"];
  if (!allowed.includes(field)) return;
  await prisma.project.update({ where: { id: projectId }, data: { [field]: value } });
  revalidatePath(`/projects/${projectId}`);
}
