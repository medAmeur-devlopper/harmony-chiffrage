import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/** Fetches a project and its latest version (MVP works with a single "current" version per project). */
export async function getCurrentVersion(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const version = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  if (!version) notFound();

  return { project, version };
}
