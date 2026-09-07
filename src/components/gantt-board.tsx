"use client";

import { useMemo, useState, useTransition } from "react";
import { GanttChart, GanttLot, GanttPhase } from "./gantt-chart";
import { MilestoneEditor, MilestoneEditorLotOption, MilestoneEditorUserOption } from "./milestone-editor";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS, MilestoneStatus } from "@/lib/constants";

export interface BoardMilestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  color: string;
  completed: boolean;
  status: string;
  progress: number;
  ownerUserId: string | null;
  ownerName: string | null;
  lotId: string | null;
  lotPhaseId: string | null;
}

interface GanttBoardProps {
  lots: GanttLot[];
  phases: GanttPhase[];
  milestones: BoardMilestone[];
  projectStart: Date;
  projectEnd: Date | null;
  lotOptions: MilestoneEditorLotOption[];
  userOptions: MilestoneEditorUserOption[];
  readOnly?: boolean;
  onMilestoneSave: (id: string, data: { name: string; date: string; description: string; color: string }) => Promise<void>;
  onMilestoneStatusChange: (id: string, status: string) => Promise<void>;
  onMilestoneProgressChange: (id: string, progress: number) => Promise<void>;
  onMilestoneOwnerChange: (id: string, ownerUserId: string) => Promise<void>;
  onMilestoneLinkChange: (id: string, lotId: string, lotPhaseId: string) => Promise<void>;
  onMilestoneDelete: (id: string) => Promise<void>;
  onMilestoneMove: (id: string, newDateISO: string) => Promise<void>;
  onTimelineCreate?: (dateISO: string) => Promise<string | void>;
}

export function GanttBoard({
  lots,
  phases,
  milestones,
  projectStart,
  projectEnd,
  lotOptions,
  userOptions,
  readOnly,
  onMilestoneSave,
  onMilestoneStatusChange,
  onMilestoneProgressChange,
  onMilestoneOwnerChange,
  onMilestoneLinkChange,
  onMilestoneDelete,
  onMilestoneMove,
  onTimelineCreate,
}: GanttBoardProps) {
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterLot, setFilterLot] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");

  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      if (filterLot && m.lotId !== filterLot) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      if (filterOwner && m.ownerUserId !== filterOwner) return false;
      return true;
    });
  }, [milestones, filterLot, filterStatus, filterOwner]);

  const chartMilestones = filtered.map((m) => ({
    id: m.id,
    name: m.name,
    date: m.date,
    description: m.description,
    color: m.color,
    completed: m.completed,
    status: m.status,
    progress: m.progress,
    ownerName: m.ownerName,
    lotId: m.lotId,
    lotPhaseId: m.lotPhaseId,
  }));

  const selected = milestones.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtres</span>
          <select value={filterLot} onChange={(e) => setFilterLot(e.target.value)} className="cell-input text-xs">
            <option value="">Tous les lots</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="cell-input text-xs">
            <option value="">Tous les statuts</option>
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MILESTONE_STATUS_LABELS[s as MilestoneStatus]}
              </option>
            ))}
          </select>
          <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="cell-input text-xs">
            <option value="">Tous les responsables</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {(filterLot || filterStatus || filterOwner) && (
            <button
              onClick={() => {
                setFilterLot("");
                setFilterStatus("");
                setFilterOwner("");
              }}
              className="text-xs text-[#2f6f8f] hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <GanttChart
        lots={lots}
        phases={phases}
        milestones={chartMilestones}
        projectStart={projectStart}
        projectEnd={projectEnd}
        readOnly={readOnly}
        selectedMilestoneId={selectedId}
        onMilestoneClick={readOnly ? undefined : (id) => setSelectedId(id)}
        onMilestoneMove={readOnly ? undefined : (id, d) => startTransition(() => onMilestoneMove(id, d))}
        onTimelineClick={
          readOnly || !onTimelineCreate
            ? undefined
            : (dateISO) =>
                startTransition(async () => {
                  await onTimelineCreate(dateISO);
                })
        }
      />

      {selected && (
        <MilestoneEditor
          milestone={{
            id: selected.id,
            name: selected.name,
            date: selected.date.toISOString().slice(0, 10),
            description: selected.description,
            color: selected.color,
            status: selected.status,
            progress: selected.progress,
            ownerUserId: selected.ownerUserId,
            lotId: selected.lotId,
            lotPhaseId: selected.lotPhaseId,
          }}
          lots={lotOptions}
          users={userOptions}
          onClose={() => setSelectedId(null)}
          onSave={(data) => onMilestoneSave(selected.id, data)}
          onStatusChange={(status) => onMilestoneStatusChange(selected.id, status)}
          onProgressChange={(progress) => onMilestoneProgressChange(selected.id, progress)}
          onOwnerChange={(ownerUserId) => onMilestoneOwnerChange(selected.id, ownerUserId)}
          onLinkChange={(lotId, lotPhaseId) => onMilestoneLinkChange(selected.id, lotId, lotPhaseId)}
          onDelete={() => onMilestoneDelete(selected.id)}
        />
      )}
    </div>
  );
}
