import { getCurrentVersion } from "@/lib/getProjectVersion";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import { prisma } from "@/lib/prisma";
import { EditableField } from "@/components/editable-field";
import { updateStaffingEntry } from "./actions";
import { PHASE_LABELS, PhaseName } from "@/lib/constants";
import { cascadeDates, projectEndDate, totalProjectWeeks, LotPhaseInput, workdaysInWeek } from "@/lib/engine/planning";
import { buildWeekColumns, summarizeStaffing, totalStaffedPerWeek, ProfileStaffingRow } from "@/lib/engine/capacity";
import { addWeeks, startOfDay } from "date-fns";
import { formatDate, formatJH, cn } from "@/lib/utils";

export default async function CapacityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);
  const { profiles, abaqueResults } = await getProjectFinancials(version.id);
  const [lots, holidays, staffingEntries] = await Promise.all([
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: project.organizationId } }),
    prisma.staffingEntry.findMany({ where: { projectVersionId: version.id } }),
  ]);

  const projectStart = startOfDay(version.projectStartDate ?? new Date());
  const holidayLikes = holidays.map((h) => ({ date: h.date }));
  const phasesByLot: LotPhaseInput[][] = lots.map((lot) =>
    lot.phases.map((p) => ({
      id: p.id,
      lotId: lot.id,
      lotOrderNum: lot.orderNum,
      phase: p.phase,
      durationWeeks: p.durationWeeks,
      phaseOrderNum: p.orderNum,
    }))
  );
  const cascaded = cascadeDates(projectStart, phasesByLot, holidayLikes);
  const endDate = projectEndDate(cascaded);
  const totalWeeks = Math.min(endDate ? totalProjectWeeks(projectStart, endDate) : 0, 60);

  const lotPhasesWithDates = cascaded.map((c) => {
    const lot = lots.find((l) => l.id === c.lotId)!;
    return {
      lotName: lot.name,
      phase: c.phase,
      phaseLabel: PHASE_LABELS[c.phase as PhaseName],
      startDate: c.startDate,
      endDate: c.endDate,
    };
  });

  const weekColumnsByLot = lots.map((lot) =>
    buildWeekColumns(projectStart, totalWeeks, holidayLikes, lotPhasesWithDates, lot.name)
  );
  const weekStarts: Date[] = [];
  for (let i = 0; i < totalWeeks; i++) weekStarts.push(addWeeks(projectStart, i));
  const availableDaysPerWeek = weekStarts.map((w) => workdaysInWeek(w, holidayLikes));

  const entriesByProfile = new Map<string, Map<string, number>>();
  for (const e of staffingEntries) {
    if (!entriesByProfile.has(e.profileId)) entriesByProfile.set(e.profileId, new Map());
    entriesByProfile.get(e.profileId)!.set(startOfDay(e.weekStart).toISOString(), e.daysStaffed);
  }

  const staffingRows: ProfileStaffingRow[] = profiles.map((p) => {
    const chargeAStaffer = abaqueResults.filter((a) => a.profileId === p.id).reduce((s, a) => s + a.chargeRetenue, 0);
    const cells = weekStarts.map((w, weekIndex) => ({
      weekIndex,
      daysStaffed: entriesByProfile.get(p.id)?.get(w.toISOString()) ?? 0,
    }));
    return { profileId: p.id, profileName: p.name, chargeAStaffer, cells };
  });
  const summarized = summarizeStaffing(staffingRows);
  const weekColumnsFlat = weekStarts.map((w, i) => ({ weekStart: w, availableDays: availableDaysPerWeek[i] }));
  const totals = totalStaffedPerWeek(staffingRows, weekColumnsFlat as never);

  const staffAction = async (profileId: string, weekStart: string, v: string) => {
    "use server";
    await updateStaffingEntry(projectId, version.id, profileId, weekStart, v);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">3 · Capacity plan</h2>
        <p className="text-slate-500 text-sm mt-1">
          Charge à staffer par profil vs capacité hebdomadaire (5 j − jours fériés).
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left sticky left-0 bg-white text-xs text-slate-400 min-w-[160px]">Profil</th>
              <th className="p-2 text-xs text-slate-400 min-w-[90px]">Charge à staffer</th>
              <th className="p-2 text-xs text-slate-400 min-w-[80px]">Planifié</th>
              <th className="p-2 text-xs text-slate-400 min-w-[70px]">Écart</th>
              {weekStarts.map((w, i) => (
                <th key={i} className="p-1 text-[10px] text-slate-400 min-w-[52px]">
                  {formatDate(w)}
                  <div className="text-[9px] text-slate-300">{availableDaysPerWeek[i]}j</div>
                </th>
              ))}
            </tr>
            {lots.map((lot, lotIdx) => (
              <tr key={lot.id}>
                <td className="p-1 text-xs font-medium sticky left-0 bg-white">{lot.name}</td>
                <td colSpan={3}></td>
                {weekColumnsByLot[lotIdx].map((col, i) => (
                  <td key={i} className="p-1 text-[9px] text-center text-slate-500 bg-slate-50">
                    {col.lotPhaseLabel ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {summarized.map((row) => (
              <tr key={row.profileId} className="border-t border-slate-100">
                <td className="p-2 sticky left-0 bg-white font-medium">{row.profileName}</td>
                <td className="p-2 text-center cell-computed">{formatJH(row.chargeAStaffer)}</td>
                <td className="p-2 text-center cell-computed">{formatJH(row.planifie)}</td>
                <td className={cn("p-2 text-center cell-computed", row.ecart < 0 && "text-red-600")}>
                  {row.ecart.toFixed(1)}
                </td>
                {row.cells.map((cell, i) => (
                  <td key={i} className="p-0.5">
                    <EditableField
                      type="number"
                      step="0.5"
                      defaultValue={cell.daysStaffed.toString()}
                      action={staffAction.bind(null, row.profileId, weekStarts[i].toISOString())}
                      className="text-center px-0 py-1 text-xs"
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="cell-total border-t border-slate-200">
              <td className="p-2 sticky left-0 bg-[#dceaf5] font-semibold">Total staffé / sem.</td>
              <td colSpan={3}></td>
              {totals.map((t, i) => (
                <td key={i} className={cn("p-2 text-center", t.overloaded && "cell-overload")}>
                  {t.total}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
