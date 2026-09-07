import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asciiFallback(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  const { projectId, docId } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const user = session.user;

  const document = await prisma.document.findUnique({ where: { id: docId } });
  if (!document || document.projectId !== projectId) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (!fs.existsSync(document.storedPath)) {
    return NextResponse.json({ error: "Fichier manquant sur le serveur." }, { status: 404 });
  }

  // Inline preview is only ever allowed for images (thumbnails) — every other file is forced as attachment.
  const wantsInline = req.nextUrl.searchParams.get("inline") === "1";
  const isImage = document.mimeType.startsWith("image/");
  const inline = wantsInline && isImage;

  const stat = fs.statSync(document.storedPath);
  const nodeStream = fs.createReadStream(document.storedPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": inline ? document.mimeType : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiFallback(
        document.fileName
      )}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "Content-Length": stat.size.toString(),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
