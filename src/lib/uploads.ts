import fs from "fs";
import path from "path";

export const MAX_REQUEST_SIZE_BYTES = 25 * 1024 * 1024; // 25 Mo par envoi
export const MAX_PROJECT_QUOTA_BYTES = 100 * 1024 * 1024; // 100 Mo cumulés par projet

/** Extensions autorisées et types MIME attendus (whitelist — jamais de confiance aveugle dans le navigateur). */
export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
};

export function extensionOf(fileName: string): string {
  return path.extname(fileName).replace(".", "").toLowerCase();
}

/** Extension + MIME déclaré doivent matcher la whitelist (le navigateur envoie parfois un MIME générique). */
export function isAllowedDeclaredType(fileName: string, mimeType: string): boolean {
  const ext = extensionOf(fileName);
  const allowedMimes = ALLOWED_EXTENSIONS[ext];
  if (!allowedMimes) return false;
  if (mimeType && mimeType !== "application/octet-stream" && !allowedMimes.includes(mimeType)) return false;
  return true;
}

const MAGIC_CHECKS: { exts: string[]; test: (buf: Buffer) => boolean }[] = [
  { exts: ["png"], test: (b) => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { exts: ["jpg", "jpeg"], test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { exts: ["gif"], test: (b) => b.length >= 4 && b.toString("ascii", 0, 4) === "GIF8" },
  {
    exts: ["webp"],
    test: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  { exts: ["pdf"], test: (b) => b.length >= 4 && b.toString("ascii", 0, 4) === "%PDF" },
  {
    // docx/xlsx/pptx are zip containers
    exts: ["docx", "xlsx", "pptx"],
    test: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
  {
    // legacy doc/xls/ppt are OLE compound files
    exts: ["doc", "xls", "ppt"],
    test: (b) =>
      b.length >= 8 &&
      b[0] === 0xd0 &&
      b[1] === 0xcf &&
      b[2] === 0x11 &&
      b[3] === 0xe0 &&
      b[4] === 0xa1 &&
      b[5] === 0xb1 &&
      b[6] === 0x1a &&
      b[7] === 0xe1,
  },
];

/** Vérifie les magic bytes réels du fichier par rapport à l'extension déclarée (obligatoire pour images/PDF). */
export function verifyMagicBytes(fileName: string, buffer: Buffer): boolean {
  const ext = extensionOf(fileName);
  const rule = MAGIC_CHECKS.find((r) => r.exts.includes(ext));
  if (!rule) return true;
  return rule.test(buffer);
}

export function getUploadRootDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export function getProjectUploadDir(projectId: string): string {
  return path.join(/* turbopackIgnore: true */ getUploadRootDir(), projectId);
}

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ensureProjectUploadDir(projectId: string): string {
  const dir = getProjectUploadDir(projectId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
