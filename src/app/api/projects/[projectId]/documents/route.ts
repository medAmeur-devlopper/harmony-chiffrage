import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import {
  MAX_REQUEST_SIZE_BYTES,
  MAX_PROJECT_QUOTA_BYTES,
  isAllowedDeclaredType,
  verifyMagicBytes,
  extensionOf,
  ensureProjectUploadDir,
  formatBytes,
} from "@/lib/uploads";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const user = session.user;

  if (user.role !== "ADMIN" && user.role !== "EDITEUR") {
    return NextResponse.json({ error: "Droits insuffisants pour ajouter un document." }, { status: 403 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête multipart invalide." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }

  if (file.size > MAX_REQUEST_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux : ${formatBytes(file.size)} (maximum ${formatBytes(MAX_REQUEST_SIZE_BYTES)} par envoi).` },
      { status: 413 }
    );
  }

  if (!isAllowedDeclaredType(file.name, file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé. Formats acceptés : images (png, jpg, gif, webp), PDF, Word, Excel, PowerPoint." },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!verifyMagicBytes(file.name, buffer)) {
    return NextResponse.json(
      { error: "Le contenu du fichier ne correspond pas à son extension déclarée." },
      { status: 415 }
    );
  }

  const usage = await prisma.document.aggregate({
    where: { projectId },
    _sum: { sizeBytes: true },
  });
  const currentTotal = usage._sum.sizeBytes ?? 0;
  if (currentTotal + buffer.length > MAX_PROJECT_QUOTA_BYTES) {
    return NextResponse.json(
      {
        error: `Quota du projet dépassé : ${formatBytes(currentTotal)} déjà utilisés sur ${formatBytes(
          MAX_PROJECT_QUOTA_BYTES
        )}. Ce fichier (${formatBytes(buffer.length)}) ne peut pas être ajouté.`,
      },
      { status: 413 }
    );
  }

  const ext = extensionOf(file.name);
  const storedName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
  const dir = ensureProjectUploadDir(projectId);
  const storedPath = path.join(dir, storedName);

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(storedPath);
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });

  const document = await prisma.document.create({
    data: {
      projectId,
      uploaderId: user.id,
      fileName: file.name,
      storedPath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entity: "Document",
    entityId: document.id,
    details: `Ajout du document « ${file.name} » (${formatBytes(buffer.length)})`,
  });

  return NextResponse.json({
    id: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
    uploaderName: user.name,
  });
}
