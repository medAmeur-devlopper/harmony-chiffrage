"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertCircle } from "lucide-react";

type ImportResponse = {
  projectId: string;
  name: string;
  counts: { requirements: number; epics: number; profiles: number; lots: number };
  warnings: string[];
};

export function ImportProjectButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    setStatus("Envoi du fichier…");
    try {
      const fd = new FormData();
      fd.append("file", file);

      setStatus("Analyse du fichier Excel…");
      const res = await fetch("/api/projects/import", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as Partial<ImportResponse> & { error?: string; sheet?: string; row?: number };

      if (!res.ok) {
        const suffix = data.sheet ? ` (onglet « ${data.sheet} »${data.row ? `, ligne ${data.row}` : ""})` : "";
        throw new Error((data.error ?? "Erreur inconnue") + suffix);
      }

      setStatus("Création du projet…");
      const projectId = (data as ImportResponse).projectId;
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white/90 text-xs font-medium px-3 py-1.5 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Upload size={14} strokeWidth={2} />
        <span className="hidden sm:inline">Importer Excel</span>
      </button>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import en cours"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-8 shadow-2xl max-w-sm mx-4 text-center">
            <Loader2 size={40} className="animate-spin text-[#16314F]" strokeWidth={2} />
            <div>
              <p className="font-display text-lg text-primary">Génération du projet…</p>
              <p className="mt-1 text-sm text-muted">{status || "Préparation…"}</p>
            </div>
            <p className="text-[11px] text-muted/80">Merci de ne pas fermer cette fenêtre.</p>
          </div>
        </div>
      )}
    </>
  );
}
