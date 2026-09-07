"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DocumentPreviewModal } from "./document-preview-modal";

export interface DocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploaderName: string;
  isImage: boolean;
  canDelete: boolean;
}

interface DocumentsPanelProps {
  projectId: string;
  documents: DocumentItem[];
  usedBytes: number;
  quotaBytes: number;
  canUpload: boolean;
  onDelete: (docId: string) => Promise<void>;
}

const ACCEPTED = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentsPanel({
  projectId,
  documents,
  usedBytes,
  quotaBytes,
  canUpload,
  onDelete,
}: DocumentsPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [, startTransition] = useTransition();

  const pct = Math.min(100, (usedBytes / quotaBytes) * 100);
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-[#2f6f8f]";

  async function uploadFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Échec de l'envoi du fichier.");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau pendant l'envoi.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-slate-500">Quota utilisé</span>
          <span className="text-slate-500">
            {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-[#2f6f8f] bg-[#2f6f8f]/5" : "border-slate-300"
          }`}
        >
          <p className="text-sm text-slate-500 mb-2">Glissez-déposez un fichier ici, ou</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="rounded bg-[#2f6f8f] text-white text-sm font-medium px-4 py-2 hover:bg-[#265a72] transition-colors disabled:opacity-50"
          >
            {isUploading ? "Envoi en cours…" : "Choisir un fichier"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className="text-xs text-slate-400 mt-2">Images, PDF, Word, Excel, PowerPoint — 25 Mo max par fichier.</p>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-3">Fichier</th>
              <th className="p-3">Type</th>
              <th className="p-3">Taille</th>
              <th className="p-3">Ajouté par</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {d.isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/projects/${projectId}/documents/${d.id}/download?inline=1`}
                        alt={d.fileName}
                        className="w-8 h-8 object-cover rounded border border-slate-200"
                      />
                    ) : (
                      <span className="text-lg">📄</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(d)}
                      className="truncate max-w-[220px] text-left hover:underline"
                      title={d.fileName}
                    >
                      {d.fileName}
                    </button>
                  </div>
                </td>
                <td className="p-3 text-slate-500">{d.mimeType}</td>
                <td className="p-3 text-slate-500">{formatBytes(d.sizeBytes)}</td>
                <td className="p-3 text-slate-500">{d.uploaderName}</td>
                <td className="p-3 text-slate-500">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(d)}
                      className="text-xs text-[#2f6f8f] hover:underline"
                    >
                      Aperçu
                    </button>
                    <a
                      href={`/api/projects/${projectId}/documents/${d.id}/download`}
                      className="text-xs text-[#2f6f8f] hover:underline"
                    >
                      Télécharger
                    </a>
                    {d.canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`Supprimer « ${d.fileName} » ?`)) return;
                          startTransition(async () => {
                            await onDelete(d.id);
                            router.refresh();
                          });
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">
                  Aucun document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DocumentPreviewModal doc={previewDoc} projectId={projectId} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
