"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll(projectId: string) {
  revalidatePath(`/projects/${projectId}/jours-feries`);
  revalidatePath(`/projects/${projectId}/planning`);
  revalidatePath(`/projects/${projectId}/capacity`);
}

export async function addHoliday(organizationId: string, projectId: string, formData: FormData) {
  await requireRole(["ADMIN", "EDITEUR"]);
  const date = formData.get("date") as string;
  if (!date) return;
  const country = (formData.get("country") as string)?.trim() || "MA";
  const description = (formData.get("description") as string)?.trim() || "";
  await prisma.holiday.create({
    data: { organizationId, date: new Date(date), country, description },
  });
  revalidateAll(projectId);
}

export async function deleteHoliday(id: string, projectId: string) {
  await requireRole(["ADMIN", "EDITEUR"]);
  await prisma.holiday.delete({ where: { id } });
  revalidateAll(projectId);
}
