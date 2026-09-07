import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DocumentsPanel, DocumentItem } from "@/components/documents-panel";
import { deleteDocument } from "./actions";
import { MAX_PROJECT_QUOTA_BYTES } from "@/lib/uploads";
import { PageHeader } from "@/components/ui/page-header";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireAuth();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== user.organizationId) {
    return <p className="text-red-600">Projet introuvable.</p>;
  }

  const documents = await prisma.document.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { uploader: true },
  });

  const usedBytes = documents.reduce((sum, d) => sum + d.sizeBytes, 0);
  const canUpload = user.role === "ADMIN" || user.role === "EDITEUR";

  const items: DocumentItem[] = documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    createdAt: d.createdAt.toISOString(),
    uploaderName: d.uploader?.name ?? "—",
    isImage: d.mimeType.startsWith("image/"),
    canDelete: canUpload || d.uploaderId === user.id,
  }));

  const deleteAction = async (docId: string) => {
    "use server";
    await deleteDocument(docId, projectId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Documents projet"
        highlight="Documents"
        subtitle="Fichiers rattachés au projet — 100 Mo maximum cumulés, 25 Mo par envoi."
      />

      <DocumentsPanel
        projectId={projectId}
        documents={items}
        usedBytes={usedBytes}
        quotaBytes={MAX_PROJECT_QUOTA_BYTES}
        canUpload={canUpload}
        onDelete={deleteAction}
      />
    </div>
  );
}
