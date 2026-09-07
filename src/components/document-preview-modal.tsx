"use client";

import { useEffect, useState } from "react";
import type { DocumentItem } from "./documents-panel";

interface DocumentPreviewModalProps {
  doc: DocumentItem | null;
  projectId: string;
  onClose: () => void;
}

const TEXT_TYPES = ["text/plain", "text/csv", "text/markdown", "application/json"];

export function DocumentPreviewModal({ doc, projectId, onClose }: DocumentPreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = doc?.isImage ?? false;
  const isPdf = doc?.mimeType === "application/pdf";
  const isText = doc ? TEXT_TYPES.includes(doc.mimeType) : false;
  const inlineUrl = doc ? `/api/projects/${projectId}/documents/${doc.id}/download?inline=1` : "";
  const downloadUrl = doc ? `/api/projects/${projectId}/documents/${doc.id}/download` : "";

  useEffect(() => {
    if (!doc || !isText) {
      setTextContent(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(inlineUrl)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.text();
      })
      .then(setTextContent)
      .catch(() => setError("Impossible de charger le contenu du fichier."))
      .finally(() => setLoading(false));
  }, [doc, isText, inlineUrl]);

  useEffect(() => {
    if (!doc) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Aperçu de ${doc.fileName}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <span className="truncate text-sm font-semibold text-slate-700" title={doc.fileName}>
            {doc.fileName}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              className="text-xs font-medium text-[#2f6f8f] hover:underline"
            >
              Télécharger
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer l'aperçu"
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50 p-4">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inlineUrl} alt={doc.fileName} className="max-h-full max-w-full object-contain" />
          )}
          {isPdf && <iframe src={inlineUrl} title={doc.fileName} className="h-full w-full rounded border border-slate-200 bg-white" />}
          {isText && (
            <div className="h-full w-full overflow-auto rounded border border-slate-200 bg-white p-4">
              {loading && <p className="text-sm text-slate-400">Chargement…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {textContent !== null && !loading && !error && (
                <pre className="whitespace-pre-wrap text-xs text-slate-700">{textContent}</pre>
              )}
            </div>
          )}
          {!isImage && !isPdf && !isText && (
            <p className="text-sm text-slate-500">
              Aperçu non disponible pour ce type de fichier — utilisez le bouton Télécharger.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
