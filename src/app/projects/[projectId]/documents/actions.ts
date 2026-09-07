"use server";

import fs from "fs";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

export async function deleteDocument(docId: string, projectId: string) {
  const user = await requireAuth();

  const document = await prisma.document.findUnique({ where: { id: docId } });
  if (!document || document.projectId !== projectId) return;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== user.organizationId) return;

  const isPrivileged = user.role === "ADMIN" || user.role === "EDITEUR";
  const isOwner = document.uploaderId === user.id;
  if (!isPrivileged && !isOwner) return;

  await prisma.document.delete({ where: { id: docId } });
  if (fs.existsSync(document.storedPath)) {
    fs.unlinkSync(document.storedPath);
  }

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entity: "Document",
    entityId: docId,
    details: `Suppression du document « ${document.fileName} »`,
  });

  revalidatePath(`/projects/${projectId}/documents`);
}
