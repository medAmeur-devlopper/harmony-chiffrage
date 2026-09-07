"use client";

import { useState, useTransition } from "react";

export function AddLotButton({ action }: { action: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await action(name.trim());
      setName("");
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-linear-to-r from-[#2f6f8f] to-[#16314F] text-white text-sm font-medium px-4 py-2 shadow hover:shadow-md transition-shadow"
      >
        + Ajouter un lot
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        placeholder="Nom du lot"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="cell-input w-40"
        disabled={isPending}
      />
      <button
        onClick={submit}
        disabled={isPending || !name.trim()}
        className="rounded bg-[#16314F] text-white text-xs px-3 py-1.5 disabled:opacity-40"
      >
        {isPending ? "…" : "Ajouter"}
      </button>
      <button
        onClick={() => { setOpen(false); setName(""); }}
        className="rounded bg-slate-200 text-slate-600 text-xs px-3 py-1.5"
      >
        Annuler
      </button>
    </div>
  );
}

export function DeleteLotButton({ lotId, lotName, action }: { lotId: string; lotName: string; action: (id: string) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm(`Supprimer "${lotName}" et toutes ses phases ?`)) return;
        startTransition(() => action(lotId));
      }}
      disabled={isPending}
      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
      title={`Supprimer ${lotName}`}
    >
      {isPending ? "…" : "✕"}
    </button>
  );
}

export function AddPhaseButton({
  lotId,
  availablePhases,
  action,
}: {
  lotId: string;
  availablePhases: { value: string; label: string }[];
  action: (lotId: string, phase: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState(availablePhases[0]?.value ?? "");
  const [isPending, startTransition] = useTransition();

  if (availablePhases.length === 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#2f6f8f] hover:text-[#16314F] font-medium"
      >
        + Phase
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={phase}
        onChange={(e) => setPhase(e.target.value)}
        className="cell-input text-xs py-1"
        disabled={isPending}
      >
        {availablePhases.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        onClick={() =>
          startTransition(async () => {
            await action(lotId, phase);
            setOpen(false);
          })
        }
        disabled={isPending}
        className="rounded bg-[#16314F] text-white text-xs px-2 py-1 disabled:opacity-40"
      >
        {isPending ? "…" : "OK"}
      </button>
      <button onClick={() => setOpen(false)} className="rounded bg-slate-200 text-slate-600 text-xs px-2 py-1">
        ✕
      </button>
    </div>
  );
}

export function DeletePhaseButton({ phaseId, phaseLabel, action }: { phaseId: string; phaseLabel: string; action: (id: string) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm(`Supprimer la phase "${phaseLabel}" ?`)) return;
        startTransition(() => action(phaseId));
      }}
      disabled={isPending}
      className="text-red-300 hover:text-red-600 transition-colors disabled:opacity-40 text-xs"
      title={`Supprimer ${phaseLabel}`}
    >
      {isPending ? "…" : "✕"}
    </button>
  );
}

export function ReorderPhaseButtons({
  phaseId,
  canMoveUp,
  canMoveDown,
  action,
}: {
  phaseId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  action: (id: string, direction: "up" | "down") => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col leading-none">
      <button
        onClick={() => startTransition(() => action(phaseId, "up"))}
        disabled={isPending || !canMoveUp}
        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px]"
        title="Monter"
      >
        ▲
      </button>
      <button
        onClick={() => startTransition(() => action(phaseId, "down"))}
        disabled={isPending || !canMoveDown}
        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px]"
        title="Descendre"
      >
        ▼
      </button>
    </div>
  );
}
