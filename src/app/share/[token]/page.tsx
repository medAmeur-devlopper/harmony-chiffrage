import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { GanttChart, GanttLot, GanttPhase, GanttMilestone } from "@/components/gantt-chart";
import { cascadeDates, projectEndDate, totalProjectWeeks, LotPhaseInput } from "@/lib/engine/planning";
import { LOT_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function SharedGanttPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const version = await prisma.projectVersion.findUnique({
    where: { shareToken: token },
    include: { project: true },
  });
  if (!version) notFound();

  const [lots, holidays, milestones] = await Promise.all([
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: version.project.organizationId } }),
    prisma.milestone.findMany({ where: { projectVersionId: version.id }, orderBy: { date: "asc" } }),
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
  const projectEnd = projectEndDate(cascaded);
  const totalWeeks = projectEnd ? totalProjectWeeks(projectStart, projectEnd) : 0;

  const ganttLots: GanttLot[] = lots.map((lot, i) => ({
    id: lot.id,
    name: lot.name,
    color: LOT_COLORS[i % LOT_COLORS.length],
  }));
  const ganttPhases: GanttPhase[] = cascaded.map((c) => {
    const progress = lots.find((l) => l.id === c.lotId)?.phases.find((p) => p.id === c.id)?.progress ?? 0;
    return {
      id: c.id,
      lotId: c.lotId,
      phase: c.phase,
      startDate: c.startDate,
      endDate: c.endDate,
      progress,
    };
  });
  const ganttMilestones: GanttMilestone[] = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    date: m.date,
    description: m.description,
    color: m.color,
    completed: m.completed,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-linear-to-r from-[#2f6f8f] to-[#16314F] text-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold tracking-widest text-white/70">HARMONY TECHNOLOGY</p>
          <h1 className="text-2xl font-bold mt-1">{version.project.name}</h1>
          <p className="text-white/80 text-sm mt-1">{version.project.client} — Planning projet (lecture seule)</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl w-full px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Date de démarrage" value={formatDate(projectStart)} />
          <Stat label="Fin estimée" value={formatDate(projectEnd)} />
          <Stat label="Durée totale" value={`${totalWeeks} semaines`} />
        </section>

        <GanttChart
          lots={ganttLots}
          phases={ganttPhases}
          milestones={ganttMilestones}
          projectStart={projectStart}
          projectEnd={projectEnd}
          readOnly
        />

        <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <h3 className="font-semibold text-slate-700 p-4 pb-0">Jalons du projet</h3>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                <th className="p-2">Statut</th>
                <th className="p-2">Nom</th>
                <th className="p-2">Date</th>
                <th className="p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="p-2">{m.completed ? "✅" : m.date < new Date() ? "⚠️" : "⬜"}</td>
                  <td className="p-2 font-medium">{m.name}</td>
                  <td className="p-2">{formatDate(m.date)}</td>
                  <td className="p-2 text-slate-500">{m.description}</td>
                </tr>
              ))}
              {milestones.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    Aucun jalon défini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <p className="text-center text-xs text-slate-400 pt-4">
          Vue de partage générée par Harmony Technology — les données financières ne sont pas incluses.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}
