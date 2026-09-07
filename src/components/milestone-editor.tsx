"use client";

import { useState, useTransition } from "react";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS, MILESTONE_COLORS, MilestoneStatus } from "@/lib/constants";
import { ColorSwatchPicker } from "@/components/editable-field";

export interface MilestoneEditorData {
  id: string;
  name: string;
  date: string; // yyyy-mm-dd
  description: string;
  color: string;
  status: string;
  progress: number;
  ownerUserId: string | null;
  lotId: string | null;
  lotPhaseId: string | null;
}

export interface MilestoneEditorLotOption {
  id: string;
  name: string;
  phases: { id: string; label: string }[];
}

export interface MilestoneEditorUserOption {
  id: string;
  name: string;
}

interface MilestoneEditorProps {
  milestone: MilestoneEditorData;
  lots: MilestoneEditorLotOption[];
  users: MilestoneEditorUserOption[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    date: string;
    description: string;
    color: string;
  }) => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
  onProgressChange: (progress: number) => Promise<void>;
  onOwnerChange: (ownerUserId: string) => Promise<void>;
  onLinkChange: (lotId: string, lotPhaseId: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function MilestoneEditor({
  milestone,
  lots,
  users,
  onClose,
  onSave,
  onStatusChange,
  onProgressChange,
  onOwnerChange,
  onLinkChange,
  onDelete,
}: MilestoneEditorProps) {
  const [name, setName] = useState(milestone.name);
  const [date, setDate] = useState(milestone.date);
  const [description, setDescription] = useState(milestone.description);
  const [color, setColor] = useState(milestone.color);
  const [lotId, setLotId] = useState(milestone.lotId ?? "");
  const [lotPhaseId, setLotPhaseId] = useState(milestone.lotPhaseId ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedLot = lots.find((l) => l.id === lotId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white h-full shadow-xl p-5 space-y-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Jalon</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">
            ✕
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="cell-input w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cell-input w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Couleur</label>
            <ColorSwatchPicker value={color} onChange={setColor} colors={MILESTONE_COLORS} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="cell-input w-full"
            rows={2}
          />
        </div>

        <button
          onClick={() =>
            startTransition(async () => {
              await onSave({ name, date, description, color });
            })
          }
          disabled={isPending}
          className="w-full rounded bg-[#16314F] text-white text-sm font-medium py-2 disabled:opacity-40"
        >
          {isPending ? "Enregistrement…" : "Sauvegarder"}
        </button>

        <hr className="border-slate-100" />

        <div>
          <label className="block text-xs text-slate-500 mb-1">Statut</label>
          <select
            defaultValue={milestone.status}
            onChange={(e) => startTransition(() => onStatusChange(e.target.value))}
            className="cell-input w-full"
          >
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MILESTONE_STATUS_LABELS[s as MilestoneStatus]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Avancement ({milestone.progress}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={milestone.progress}
            onMouseUp={(e) => startTransition(() => onProgressChange(Number((e.target as HTMLInputElement).value)))}
            onTouchEnd={(e) => startTransition(() => onProgressChange(Number((e.target as HTMLInputElement).value)))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Responsable</label>
          <select
            defaultValue={milestone.ownerUserId ?? ""}
            onChange={(e) => startTransition(() => onOwnerChange(e.target.value))}
            className="cell-input w-full"
          >
            <option value="">— Aucun —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Lot</label>
            <select
              value={lotId}
              onChange={(e) => {
                setLotId(e.target.value);
                setLotPhaseId("");
                startTransition(() => onLinkChange(e.target.value, ""));
              }}
              className="cell-input w-full"
            >
              <option value="">— Aucun —</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Phase</label>
            <select
              value={lotPhaseId}
              onChange={(e) => {
                setLotPhaseId(e.target.value);
                startTransition(() => onLinkChange(lotId, e.target.value));
              }}
              disabled={!selectedLot}
              className="cell-input w-full disabled:opacity-40"
            >
              <option value="">— Aucune —</option>
              {selectedLot?.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="flex gap-2">
          <button
            onClick={() => startTransition(() => onStatusChange("ATTEINT"))}
            disabled={isPending}
            className="flex-1 rounded border border-green-300 text-green-700 text-xs font-medium py-2 hover:bg-green-50 disabled:opacity-40"
          >
            ✓ Marquer atteint
          </button>
          <button
            onClick={() => {
              if (!confirm(`Supprimer le jalon "${milestone.name}" ?`)) return;
              startTransition(async () => {
                await onDelete();
                onClose();
              });
            }}
            disabled={isPending}
            className="flex-1 rounded border border-red-300 text-red-600 text-xs font-medium py-2 hover:bg-red-50 disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
