import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField } from "@/components/editable-field";
import { updateProjectStartDate, updatePhaseDuration, updateLotDescription, updatePhaseManualStart } from "./actions";
import { PHASE_LABELS, PhaseName } from "@/lib/constants";
import { cascadeDates, projectEndDate, totalProjectWeeks, LotPhaseInput } from "@/lib/engine/planning";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
          <h2 className="text-xl font-bold text-slate-800 mt-1">3a · Macro planning — dates par lot &amp; phase</h2>
          <p className="text-slate-500 text-sm mt-1">
            Saisir les durées (semaines) : les dates s&apos;enchaînent en cascade (jours fériés déduits). Une date de
            début manuelle permet de paralleliser un lot.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/gantt`}
          className="whitespace-nowrap rounded-lg bg-linear-to-r from-[#2f6f8f] to-[#16314F] text-white text-sm font-medium px-4 py-2 shadow hover:shadow-md transition-shadow"
        >
          → Voir le Gantt interactif
        </Link>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="cell-total rounded-lg p-3">
            <p className="text-xs text-slate-500">Date de démarrage projet</p>
            <EditableField
              type="text"
              defaultValue={projectStart.toISOString().slice(0, 10)}
              action={startAction}
              className="mt-1 font-bold"
            />
          </div>
          <Stat label="Fin de projet (calculée)" value={formatDate(endDate)} />
          <Stat label="Durée totale" value={`${totalWeeks} sem.`} />
        </div>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">Lot</th>
              <th className="p-2">Phase</th>
              <th className="p-2">Durée (sem.)</th>
              <th className="p-2">Début manuel</th>
              <th className="p-2">Début</th>
              <th className="p-2">Fin</th>
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
                    <td className="p-2">{PHASE_LABELS[phase.phase as PhaseName]}</td>
                    <td className="p-1.5 w-20">
                      <EditableField
                        type="number"
                        defaultValue={phase.durationWeeks.toString()}
                        action={durationAction.bind(null, phase.id)}
                      />
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
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Vue Gantt</h3>
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
              <div key={lot.id} className="flex items-center gap-3">
                <span className="w-16 text-xs text-slate-500 shrink-0">{lot.name}</span>
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
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="cell-total rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
