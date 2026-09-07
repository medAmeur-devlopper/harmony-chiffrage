import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getCurrentVersion } from "@/lib/getProjectVersion";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import { prisma } from "@/lib/prisma";
import { StaffingCellInput } from "@/components/staffing-cell-input";
import { updateStaffingEntry } from "./actions";
import { PHASE_LABELS, PhaseName } from "@/lib/constants";
import { cascadeDates, projectEndDate, totalProjectWeeks, LotPhaseInput, workdaysInWeek } from "@/lib/engine/planning";
import { buildWeekColumns, summarizeStaffing, totalStaffedPerWeek, cumulativeStaffing, ProfileStaffingRow } from "@/lib/engine/capacity";
import { addWeeks, startOfDay } from "date-fns";
import { formatDate, formatDH, formatJH, cn } from "@/lib/utils";
import { FadeInSection } from "@/components/motion/fade-in-section";

export default async function CapacityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);
  const { profiles, abaqueResults, otherLines } = await getProjectFinancials(version.id);
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
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
    return updateStaffingEntry(projectId, version.id, profileId, weekStart, v);
  };

  const overBudgetProfiles = summarized.filter((r) => r.ecart > 0);
  const totalChargeAStaffer = summarized.reduce((s, r) => s + r.chargeAStaffer, 0);
  const totalPlanifie = summarized.reduce((s, r) => s + r.planifie, 0);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Capacity plan"
        highlight="plan"
        subtitle={`Charge à staffer par profil vs capacité hebdomadaire (5 j − jours fériés). Dernière mise à jour : ${formatDate(now)} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
        actions={
          <a
            href={`/api/projects/${projectId}/capacity/report`}
            className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            Exporter les écarts (CSV)
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card tone="mint" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Charge totale à staffer</p>
          <p className="mt-1 font-display text-2xl text-ink">{formatJH(totalChargeAStaffer)}</p>
        </Card>
        <Card tone="lavender" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Planifié cumulé</p>
          <p className="mt-1 font-display text-2xl text-ink">{formatJH(totalPlanifie)}</p>
        </Card>
        <Card tone="rose" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Profils en dépassement</p>
          <p className="mt-1 font-display text-2xl text-ink">{overBudgetProfiles.length}</p>
        </Card>
      </div>

      {overBudgetProfiles.length > 0 && (
        <FadeInSection className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold mb-1.5">
            ⚠ {overBudgetProfiles.length} profil{overBudgetProfiles.length > 1 ? "s" : ""} en dépassement du budget
            chiffrage
          </p>
          <div className="flex flex-wrap gap-2">
            {overBudgetProfiles.map((r) => (
              <a
                key={r.profileId}
                href={`#capacity-profile-${r.profileId}`}
                className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-amber-200"
              >
                {r.profileName} (+{r.ecart.toFixed(1)} JH)
              </a>
            ))}
          </div>
        </FadeInSection>
      )}

      <FadeInSection className="rounded-2xl bg-surface overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="p-2 text-left sticky left-0 bg-white text-xs text-muted min-w-[160px]">Profil</th>
              <th className="p-2 text-left text-xs text-muted min-w-[140px]">Ressource chiffrage</th>
              <th className="p-2 text-xs text-muted min-w-[90px]">Charge à staffer</th>
              <th className="p-2 text-xs text-muted min-w-[80px]">Planifié</th>
              <th className="p-2 text-xs text-muted min-w-[70px]">Écart</th>
              {weekStarts.map((w, i) => (
                <th key={i} className="p-1 text-[10px] text-muted min-w-[52px]">
                  {formatDate(w)}
                  <div className="text-[9px] text-muted">{availableDaysPerWeek[i]}j</div>
                </th>
              ))}
            </tr>
            {lots.map((lot, lotIdx) => (
              <tr key={lot.id}>
                <td className="p-1 text-xs font-medium sticky left-0 bg-white">{lot.name}</td>
                <td colSpan={4}></td>
                {weekColumnsByLot[lotIdx].map((col, i) => (
                  <td key={i} className="p-1 text-[9px] text-center text-muted bg-slate-50">
                    {col.lotPhaseLabel ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {summarized.map((row) => {
              const cumulative = cumulativeStaffing(row);
              const budget = row.chargeAStaffer;
              const progressPct = budget > 0 ? Math.min(100, (row.planifie / budget) * 100) : row.planifie > 0 ? 100 : 0;
              const progressColor = progressPct > 100 ? "bg-red-500" : progressPct >= 90 ? "bg-amber-500" : "bg-green-500";
              const profile = profilesById.get(row.profileId);
              return (
                <tr id={`capacity-profile-${row.profileId}`} key={row.profileId} className="border-t border-slate-100 scroll-mt-24">
                  <td className="p-2 sticky left-0 bg-white font-medium">
                    <div>{row.profileName}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className={cn("h-full rounded-full", progressColor)} style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="text-[9px] text-muted whitespace-nowrap">
                        {row.planifie.toFixed(1)} / {budget.toFixed(1)} JH
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-xs">
                    {profile ? (
                      <Link
                        href={`/projects/${projectId}/chiffrage#profile-${profile.id}`}
                        className="block text-[#2f6f8f] hover:underline"
                      >
                        <div>
                          {profile.entity} · {formatDH(profile.cjm)}/j
                        </div>
                        <div className="text-muted">Budget: {(Math.round(budget * 2) / 2).toFixed(1)} JH</div>
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-2 text-center cell-computed">{formatJH(row.chargeAStaffer)}</td>
                  <td className="p-2 text-center cell-computed">{formatJH(row.planifie)}</td>
                  <td
                    className={cn(
                      "p-2 text-center cell-computed",
                      row.ecart > 0 && "text-red-600 font-semibold",
                      row.ecart < 0 && "text-green-600",
                      row.ecart === 0 && "text-muted"
                    )}
                  >
                    {row.ecart > 0 ? "+" : ""}
                    {row.ecart.toFixed(1)}
                  </td>
                  {row.cells.map((cell, i) => {
                    const cum = cumulative[i];
                    const overBudget = budget > 0 && cum > budget;
                    const overBudget20 = budget > 0 && cum > budget * 1.2;
                    return (
                      <td
                        key={i}
                        className={cn(
                          "p-0.5",
                          overBudget20 ? "bg-red-100" : overBudget ? "bg-red-50" : undefined
                        )}
                      >
                        <StaffingCellInput
                          defaultValue={cell.daysStaffed.toString()}
                          action={staffAction.bind(null, row.profileId, weekStarts[i].toISOString())}
                          className={cn(
                            "text-center px-0 py-1 text-xs",
                            overBudget20
                              ? "border-red-300 text-red-700 font-semibold"
                              : overBudget
                              ? "border-red-300"
                              : undefined
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="cell-total border-t border-slate-200">
              <td className="p-2 sticky left-0 bg-[#dceaf5] font-semibold">Total staffé / sem.</td>
              <td colSpan={4}></td>
              {totals.map((t, i) => (
                <td key={i} className={cn("p-2 text-center", t.overloaded && "cell-overload")}>
                  {t.total}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </FadeInSection>

      {otherLines.length > 0 && (
        <FadeInSection className="rounded-2xl bg-surface overflow-x-auto">
          <h3 className="font-semibold text-primary p-4 pb-0">Autres ressources chiffrées</h3>
          <p className="text-xs text-muted px-4 pt-1">
            Lecture seule — matériel, licences et autres lignes déjà budgétées dans le chiffrage (hors JH humains).
          </p>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-slate-200">
                <th className="p-2">Catégorie</th>
                <th className="p-2">Ressource</th>
                <th className="p-2">Qté</th>
                <th className="p-2">Unité</th>
                <th className="p-2">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {otherLines.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 text-muted">
                  <td className="p-2">{l.category}</td>
                  <td className="p-2">{l.resourceName}</td>
                  <td className="p-2">{l.quantity.toFixed(1)}</td>
                  <td className="p-2">{l.unit}</td>
                  <td className="p-2">{formatDH(l.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FadeInSection>
      )}
    </div>
  );
}
