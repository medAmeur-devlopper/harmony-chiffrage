"use client";

import { useState, useTransition } from "react";

export function ResetPasswordButton({ action }: { action: () => Promise<string> }) {
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const temp = await action();
            setRevealed(temp);
          })
        }
        className="text-xs text-[#2f6f8f] hover:underline font-medium disabled:opacity-50"
      >
        Réinitialiser
      </button>
      {revealed && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">Nouveau mot de passe temporaire</p>
            <p className="font-mono text-lg bg-slate-100 rounded px-3 py-2 select-all">{revealed}</p>
            <p className="text-xs text-slate-400">
              Ce mot de passe ne sera plus affiché — communiquez-le à l&apos;utilisateur maintenant.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="rounded bg-[#2f6f8f] text-white text-xs font-medium px-4 py-2 hover:bg-[#265a72] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
