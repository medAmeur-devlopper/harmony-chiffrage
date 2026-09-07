import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField } from "@/components/editable-field";
import { updateProjectStartDate, updatePhaseDuration, updateLotDescription, updatePhaseManualStart, updatePhaseProgress, addLot, deleteLot, addPhase, deletePhase, renamePhase, reorderPhase } from "./actions";
import { PHASE_LABELS, PHASES, PhaseName } from "@/lib/constants";
import { AddLotButton, DeleteLotButton, AddPhaseButton, DeletePhaseButton, ReorderPhaseButtons } from "@/components/lot-actions";
import { cascadeDates, projectEndDate, totalProjectWeeks, computeOverallProgress, LotPhaseInput } from "@/lib/engine/planning";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Stat } from "@/components/ui/stat";
import { FadeInSection } from "@/components/motion/fade-in-section";
import { PageHeader } from "@/components/ui/page-header";

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);
  const [lots, holidays] = await Promise.all([
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: project.organizationId } }),
  ]);

  const projectStart = version.projectStartDate ?? new Date();
  const phasesByLot: LotPhaseInput[][] = lots.map((lot) =>
    lot.phases.map((p) => ({
      id: p.id,
      lotId: lot.id,
      lotOrderNum: lot.orderNum,
      phase: p.phase,
      durationWeeks: p.durationWeeks,
      phaseOrderNum: p.orderNum,
      manualStartDate: p.manualStartDate,
    }))
  );
  const cascaded = cascadeDates(
    projectStart,
    phasesByLot,
    holidays.map((h) => ({ date: h.date }))
  );
  const endDate = projectEndDate(cascaded);
  const totalWeeks = endDate ? totalProjectWeeks(projectStart, endDate) : 0;
  const overallProgress = computeOverallProgress(
    lots.flatMap((lot) => lot.phases.map((p) => ({ durationWeeks: p.durationWeeks, progress: p.progress })))
  );

  const cascadedByPhaseId = new Map(cascaded.map((c) => [c.id, c]));

  const startAction = async (v: string) => {
    "use server";
    await updateProjectStartDate(version.id, projectId, v);
  };
  const durationAction = async (id: string, v: string) => {
    "use server";
    await updatePhaseDuration(id, projectId, v);
  };
  const descAction = async (id: string, v: string) => {
    "use server";
    await updateLotDescription(id, projectId, v);
  };
  const manualStartAction = async (id: string, v: string) => {
    "use server";
    await updatePhaseManualStart(id, projectId, v);
  };
  const progressAction = async (id: string, v: string) => {
    "use server";
    await updatePhaseProgress(id, projectId, v);
  };
  const addLotAction = async (name: string) => {
    "use server";
    await addLot(version.id, projectId, name);
  };
  const deleteLotAction = async (id: string) => {
    "use server";
    await deleteLot(id, projectId);
  };
  const addPhaseAction = async (lotId: string, phase: string) => {
    "use server";
    await addPhase(lotId, projectId, phase);
  };
  const deletePhaseAction = async (id: string) => {
    "use server";
    await deletePhase(id, projectId);
  };
  const renamePhaseAction = async (id: string, label: string) => {
    "use server";
    await renamePhase(id, projectId, label);
  };
  const reorderPhaseAction = async (id: string, direction: "up" | "down") => {
    "use server";
    await reorderPhase(id, projectId, direction);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Macro planning"
        highlight="planning"
        subtitle="Saisir les durées (semaines) : les dates s'enchâînent en cascade (jours fériés déduits). Une date de début manuelle permet de paralleliser un lot."
        actions={
          <Link
            href={`/projects/${projectId}/gantt`}
            className="inline-flex whitespace-nowrap items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            → Voir le Gantt interactif
          </Link>
        }
      />

      <FadeInSection className="rounded-2xl bg-surface p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="cell-total rounded-lg p-3">
            <p className="text-xs text-muted">Date de démarrage projet</p>
            <EditableField
              type="text"
              defaultValue={projectStart.toISOString().slice(0, 10)}
              action={startAction}
              className="mt-1 font-bold"
            />
          </div>
          <Stat label="Fin de projet (calculée)" value={formatDate(endDate)} />
          <Stat label="Durée totale" value={`${totalWeeks} sem.`} />
          <Stat label="Avancement global" value={`${overallProgress.toFixed(0)}%`} />
        </div>
      </FadeInSection>

      <FadeInSection className="rounded-2xl bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-slate-200">
              <th className="p-2">Lot</th>
              <th className="p-2 w-8"></th>
              <th className="p-2 w-6"></th>
              <th className="p-2">Phase</th>
              <th className="p-2">Durée (sem.)</th>
              <th className="p-2">Avancement</th>
              <th className="p-2">Début manuel</th>
              <th className="p-2">Début</th>
              <th className="p-2">Fin</th>
              <th className="p-2 w-8"></th>
              <th className="p-2">Lot — description</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) =>
              lot.phases.map((phase, idx) => {
                const c = cascadedByPhaseId.get(phase.id);
                return (
                  <tr key={phase.id} className="border-b border-slate-100">
                    <td className="p-2 font-medium">{idx === 0 ? lot.name : ""}</td>
                    <td className="p-1 text-center">
                      {idx === 0 ? (
                        <DeleteLotButton lotId={lot.id} lotName={lot.name} action={deleteLotAction} />
                      ) : null}
                    </td>
                    <td className="p-1 text-center">
                      <ReorderPhaseButtons
                        phaseId={phase.id}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < lot.phases.length - 1}
                        action={reorderPhaseAction}
                      />
                    </td>
                    <td className="p-2 w-40">
                      <EditableField
                        defaultValue={phase.customLabel ?? PHASE_LABELS[phase.phase as PhaseName]}
                        action={renamePhaseAction.bind(null, phase.id)}
                        className="text-xs"
                      />
                    </td>
                    <td className="p-1.5 w-20">
                      <EditableField
                        type="number"
                        defaultValue={phase.durationWeeks.toString()}
                        action={durationAction.bind(null, phase.id)}
                      />
                    </td>
                    <td className="p-1.5 w-32">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-[#2f6f8f] to-[#16314F]"
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                        <EditableField
                          type="number"
                          defaultValue={phase.progress.toString()}
                          action={progressAction.bind(null, phase.id)}
                          className="w-14 shrink-0"
                        />
                      </div>
                    </td>
                    <td className="p-1.5 w-36">
                      <EditableField
                        type="text"
                        defaultValue={phase.manualStartDate ? phase.manualStartDate.toISOString().slice(0, 10) : ""}
                        action={manualStartAction.bind(null, phase.id)}
                        className="text-xs"
                      />
                    </td>
                    <td className="p-2 cell-computed rounded text-center">{formatDate(c?.startDate)}</td>
                    <td className="p-2 cell-computed rounded text-center">{formatDate(c?.endDate)}</td>
                    <td className="p-1 text-center">
                      <DeletePhaseButton
                        phaseId={phase.id}
                        phaseLabel={PHASE_LABELS[phase.phase as PhaseName]}
                        action={deletePhaseAction}
                      />
                    </td>
                    <td className="p-1.5 w-48">
                      {idx === 0 ? (
                        <EditableField
                          defaultValue={lot.description ?? ""}
                          action={descAction.bind(null, lot.id)}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="p-3 border-t border-slate-200 space-y-3">
          {lots.map((lot) => {
            const usedPhases = new Set(lot.phases.map((p) => p.phase));
            const availablePhases = PHASES.filter((p) => !usedPhases.has(p)).map((p) => ({
              value: p,
              label: PHASE_LABELS[p],
            }));
            if (availablePhases.length === 0) return null;
            return (
              <div key={lot.id} className="flex items-center gap-2">
                <span className="text-xs text-muted w-24 shrink-0">{lot.name}</span>
                <AddPhaseButton lotId={lot.id} availablePhases={availablePhases} action={addPhaseAction} />
              </div>
            );
          })}
          <AddLotButton action={addLotAction} />
        </div>
      </FadeInSection>

      <FadeInSection className="rounded-2xl bg-surface p-5">
        <h3 className="font-semibold text-primary mb-4">Vue Gantt</h3>
        <div className="space-y-2">
          {lots.map((lot) => {
            const lotPhases = cascaded.filter((c) => c.lotId === lot.id);
            const lotStart = lotPhases[0]?.startDate;
            const lotEnd = lotPhases[lotPhases.length - 1]?.endDate;
            if (!lotStart || !lotEnd || !endDate) return null;
            const totalMs = endDate.getTime() - projectStart.getTime() || 1;
            const offsetPct = ((lotStart.getTime() - projectStart.getTime()) / totalMs) * 100;
            const widthPct = ((lotEnd.getTime() - lotStart.getTime()) / totalMs) * 100;
            return (
              <div key={lot.id} className="hover-card-magnetic flex items-center gap-3 rounded-lg p-2">
                <span className="w-16 text-xs text-muted shrink-0">{lot.name}</span>
                <div className="relative h-6 flex-1 bg-slate-100 rounded">
                  <div
                    className="absolute h-6 rounded bg-[#16314F]"
                    style={{ left: `${offsetPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                    title={`${formatDate(lotStart)} → ${formatDate(lotEnd)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </FadeInSection>
    </div>
  );
}
