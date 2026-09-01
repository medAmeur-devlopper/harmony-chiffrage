import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { GanttChart, GanttLot, GanttPhase, GanttMilestone } from "@/components/gantt-chart";
import { ShareLinkPanel } from "@/components/share-link-panel";
import {
  addMilestone,
  updateMilestone,
  deleteMilestone,
  toggleMilestoneCompleted,
  generateShareLink,
  revokeShareLink,
} from "./actions";
import { cascadeDates, projectEndDate, LotPhaseInput } from "@/lib/engine/planning";
import { LOT_COLORS, MILESTONE_COLORS } from "@/lib/constants";
import { headers } from "next/headers";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);
  const [lots, holidays, milestones] = await Promise.all([
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: project.organizationId } }),
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

  const host = (await headers()).get("host");
  const forwarded = (await headers()).get("x-forwarded-proto");
  const proto = forwarded || (process.env.HTTPS_ENABLED === "true" ? "https" : "http");
  const shareUrl = version.shareToken ? `${proto}://${host}/share/${version.shareToken}` : null;

  const addMilestoneAction = async (formData: FormData) => {
    "use server";
    await addMilestone(projectId, version.id, formData);
  };
  const milestoneAction = async (id: string, f: "name" | "date" | "description" | "color", v: string) => {
    "use server";
    await updateMilestone(id, projectId, f, v);
  };
  const toggleAction = async (id: string, completed: boolean) => {
    "use server";
    await toggleMilestoneCompleted(id, projectId, completed);
  };
  const deleteAction = async (id: string) => {
    "use server";
    await deleteMilestone(id, projectId);
  };
  const generateLinkAction = async () => {
    "use server";
    await generateShareLink(version.id, projectId);
  };
  const revokeLinkAction = async () => {
    "use server";
    await revokeShareLink(version.id, projectId);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Gantt interactif &amp; jalons</h2>
        <p className="text-slate-500 text-sm mt-1">
          Vue agile du planning — phases par lot, jalons, et lien de partage client en lecture seule.
        </p>
      </div>

      <GanttChart
        lots={ganttLots}
        phases={ganttPhases}
        milestones={ganttMilestones}
        projectStart={projectStart}
        projectEnd={projectEnd}
      />

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-1">Partage client</h3>
        <p className="text-xs text-slate-500 mb-3">
          Ce lien public affiche le Gantt et les jalons en lecture seule — aucune donnée financière (coûts, prix,
          marges) n&apos;est exposée.
        </p>
        {shareUrl ? (
          <div className="space-y-3">
            <ShareLinkPanel shareUrl={shareUrl} />
            <form action={revokeLinkAction}>
              <button
                type="submit"
                className="rounded border border-red-300 text-red-600 text-xs font-medium px-3 py-1.5 hover:bg-red-50 transition-colors"
              >
                Révoquer le lien
              </button>
            </form>
          </div>
        ) : (
          <form action={generateLinkAction}>
            <button
              type="submit"
              className="rounded bg-linear-to-r from-[#2f6f8f] to-[#16314F] text-white text-sm font-medium px-4 py-2 shadow hover:shadow-md transition-shadow"
            >
              Générer un lien de partage
            </button>
          </form>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <h3 className="font-semibold text-slate-700 p-4 pb-0">Jalons du projet</h3>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">Atteint</th>
              <th className="p-2">Nom</th>
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2">Couleur</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="p-2 text-center">
                  <form action={toggleAction.bind(null, m.id, !m.completed)}>
                    <button type="submit" className="text-lg leading-none" title={m.completed ? "Marquer non atteint" : "Marquer atteint"}>
                      {m.completed ? "✅" : "⬜"}
                    </button>
                  </form>
                </td>
                <td className="p-1.5 min-w-40">
                  <EditableField defaultValue={m.name} action={milestoneAction.bind(null, m.id, "name")} />
                </td>
                <td className="p-1.5 w-36">
                  <EditableField
                    type="text"
                    defaultValue={m.date.toISOString().slice(0, 10)}
                    action={milestoneAction.bind(null, m.id, "date")}
                  />
                </td>
                <td className="p-1.5 min-w-48">
                  <EditableField defaultValue={m.description} action={milestoneAction.bind(null, m.id, "description")} />
                </td>
                <td className="p-1.5 w-28">
                  <EditableSelect
                    defaultValue={m.color}
                    action={milestoneAction.bind(null, m.id, "color")}
                    options={MILESTONE_COLORS.map((c) => ({ value: c, label: c }))}
                  />
                </td>
                <td className="p-1.5">
                  <form action={deleteAction.bind(null, m.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {milestones.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">
                  Aucun jalon défini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <form action={addMilestoneAction} className="p-4 flex flex-wrap items-end gap-3 border-t border-slate-100">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nom</label>
            <input type="text" name="name" required placeholder="Livraison Lot 1" className="cell-input rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input type="date" name="date" required className="cell-input rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <input type="text" name="description" placeholder="Optionnel" className="cell-input rounded px-2 py-1.5 text-sm w-full" />
          </div>
          <button
            type="submit"
            className="rounded bg-[#2f6f8f] text-white text-sm font-medium px-4 py-2 hover:bg-[#265a72] transition-colors"
          >
            + Ajouter un jalon
          </button>
        </form>
      </section>
    </div>
  );
}
