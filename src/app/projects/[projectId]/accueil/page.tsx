import Link from "next/link";
import { addWeeks, startOfDay } from "date-fns";
import { getCurrentVersion } from "@/lib/getProjectVersion";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { updateProjectField } from "./actions";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  ProjectStatus,
  RESOURCE_CATEGORIES,
  PHASE_LABELS,
  PHASE_COLORS,
  PhaseName,
  AUDIT_ACTION_LABELS,
} from "@/lib/constants";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import { totalProjectCharge } from "@/lib/engine/abaque";
import { summarizeByCategory, computeProvisions } from "@/lib/engine/pricing";
import { summarizeStaffing, ProfileStaffingRow } from "@/lib/engine/capacity";
import { cascadeDates, projectEndDate, totalProjectWeeks, LotPhaseInput } from "@/lib/engine/planning";
import { formatDate, formatJH, formatDH, formatPct, cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { FadeInSection } from "@/components/motion/fade-in-section";
import { RecentDocumentsGrid } from "@/components/recent-documents-grid";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR");
}

function documentIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("word")) return "📝";
  return "📎";
}

export default async function AccueilPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);

  const [lots, holidays, milestones, staffingEntries, auditLogs, documents] = await Promise.all([
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: project.organizationId } }),
    prisma.milestone.findMany({ where: { projectVersionId: version.id }, orderBy: { date: "asc" } }),
    prisma.staffingEntry.findMany({ where: { projectVersionId: version.id } }),
    prisma.auditLog.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.document.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const { profiles, abaqueResults, allLines } = await getProjectFinancials(version.id);

  // KPI 1: charge totale retenue (chiffrage)
  const { totalRetenue } = totalProjectCharge(abaqueResults);

  // KPI 2 & 3: prix total HT + marge % (synthèse)
  const { total } = summarizeByCategory(allLines, RESOURCE_CATEGORIES);
  const provisions = computeProvisions({
    sousTotalCost: total.cost,
    sousTotalPrice: total.price,
    provisionRisqueOperationnel: version.provisionRisqueOperationnel,
    provisionRisqueFinancier: version.provisionRisqueFinancier,
    tva: version.tva,
  });

  // Planning cascade — shared by the timeline and the capacity week range below
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
      manualStartDate: p.manualStartDate,
    }))
  );
  const cascaded = cascadeDates(projectStart, phasesByLot, holidayLikes);
  const projectEnd = projectEndDate(cascaded);
  const totalWeeks = Math.min(projectEnd ? totalProjectWeeks(projectStart, projectEnd) : 0, 60);

  // KPI 4: profils en dépassement (capacity)
  const weekStarts: Date[] = Array.from({ length: totalWeeks }, (_, i) => addWeeks(projectStart, i));
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
  const overBudgetProfiles = summarizeStaffing(staffingRows).filter((r) => r.ecart > 0);

  // Timeline bounds (project start → last cascaded phase end)
  const timelineStart = projectStart;
  const timelineEnd = projectEnd ?? projectStart;
  const timelineMs = timelineEnd.getTime() - timelineStart.getTime() || 1;
  const pct = (date: Date) => Math.min(100, Math.max(0, ((date.getTime() - timelineStart.getTime()) / timelineMs) * 100));

  const field = async (fieldName: string, value: string) => {
    "use server";
    await updateProjectField(projectId, fieldName, value);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <FadeInSection className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{project.client}</p>
          <h1 className="mt-2 truncate font-display text-6xl leading-none text-ink">{project.name}</h1>
          <p className="mt-3 text-sm text-muted">
            {project.reference || "Sans référence"} · {PROJECT_STATUS_LABELS[project.status as ProjectStatus]} · Début{" "}
            {formatDate(projectStart)}
          </p>
        </div>
        <HealthBadge overloadCount={overBudgetProfiles.length} />
      </FadeInSection>

      {/* KPI grid — alternating accent/ink tiles, Clarvos-style */}
      <FadeInSection className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiLink
          href={`/projects/${projectId}/chiffrage`}
          label="Charge totale retenue"
          value={formatJH(totalRetenue)}
          tone="accent"
        />
        <KpiLink
          href={`/projects/${projectId}/synthese`}
          label="Prix total HT"
          value={formatDH(provisions.prixTotalHTPrice)}
          tone="ink"
        />
        <KpiLink
          href={`/projects/${projectId}/synthese`}
          label="Marge"
          value={formatPct(total.margin)}
          tone="accent"
        />
        <KpiLink
          href={`/projects/${projectId}/capacity`}
          label="Profils en dépassement"
          value={overBudgetProfiles.length.toString()}
          tone={overBudgetProfiles.length > 0 ? "danger" : "ink"}
        />
      </FadeInSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeInSection className="rounded-2xl bg-ink p-6 text-white lg:col-span-2">
          <h2 className="font-display text-xl">Chronologie</h2>
          {lots.length === 0 ? (
            <p className="mt-6 text-sm text-white/60">Aucun lot planifié pour le moment.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {lots.map((lot) => {
                const segments = cascaded.filter((c) => c.lotId === lot.id);
                return (
                  <div key={lot.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-white/60">{lot.name}</span>
                    <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                      {segments.map((seg) => (
                        <div
                          key={seg.id}
                          className="absolute h-full"
                          title={`${PHASE_LABELS[seg.phase as PhaseName]} · ${formatDate(seg.startDate)} → ${formatDate(seg.endDate)}`}
                          style={{
                            left: `${pct(seg.startDate)}%`,
                            width: `${Math.max(pct(seg.endDate) - pct(seg.startDate), 0.6)}%`,
                            backgroundColor: PHASE_COLORS[seg.phase as PhaseName],
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {milestones.length > 0 && (
                <div className="relative ml-[7.5rem] h-4">
                  {milestones.map((m) => (
                    <span
                      key={m.id}
                      title={`${m.name} · ${formatDate(m.date)}`}
                      className="absolute top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-ink"
                      style={{ left: `${pct(m.date)}%`, backgroundColor: m.color }}
                    />
                  ))}
                </div>
              )}
              <div className="ml-[7.5rem] flex justify-between text-[11px] text-white/60">
                <span>{formatDate(timelineStart)}</span>
                <span>{formatDate(timelineEnd)}</span>
              </div>
            </div>
          )}
        </FadeInSection>

        <FadeInSection className="rounded-2xl bg-accent p-6 text-accent-ink">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Prochaines actions</h2>
            <Link href={`/projects/${projectId}/activite`} className="text-xs text-accent-ink/70 hover:text-accent-ink">
              Voir tout l&apos;historique
            </Link>
          </div>
          {auditLogs.length === 0 ? (
            <p className="mt-6 text-sm text-accent-ink/70">Aucune activité enregistrée pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {auditLogs.map((log) => (
                <li key={log.id} className="text-xs text-accent-ink/70">
                  {timeAgo(log.createdAt)} · <strong className="font-medium text-accent-ink">{log.userName}</strong> ·{" "}
                  {AUDIT_ACTION_LABELS[log.action] ?? log.action.toLowerCase()} {log.entity.toLowerCase()}
                </li>
              ))}
            </ul>
          )}
        </FadeInSection>
      </div>

      {/* Documents récents */}
      <FadeInSection className="rounded-2xl border border-subtle bg-surface p-6">
        <h2 className="font-display text-xl text-primary">Documents récents</h2>
        {documents.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Aucun document déposé pour le moment.</p>
        ) : (
          <RecentDocumentsGrid
            projectId={projectId}
            documents={documents.map((doc) => ({
              id: doc.id,
              fileName: doc.fileName,
              mimeType: doc.mimeType,
              createdAtLabel: formatDate(doc.createdAt),
              icon: documentIcon(doc.mimeType),
            }))}
          />
        )}
      </FadeInSection>

      {/* Fiche projet — édition conservée du dashboard précédent */}
      <FadeInSection className="rounded-2xl border border-subtle bg-surface p-6">
        <h2 className="font-display text-xl text-primary">Fiche projet</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Client">
            <EditableField defaultValue={project.client} action={field.bind(null, "client")} />
          </Field>
          <Field label="Projet">
            <EditableField defaultValue={project.name} action={field.bind(null, "name")} />
          </Field>
          <Field label="Référence offre">
            <EditableField defaultValue={project.reference ?? ""} action={field.bind(null, "reference")} />
          </Field>
          <Field label="Préparé par">
            <EditableField defaultValue={project.preparedBy ?? ""} action={field.bind(null, "preparedBy")} />
          </Field>
          <Field label="Statut">
            <EditableSelect
              defaultValue={project.status}
              action={field.bind(null, "status")}
              options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s as ProjectStatus] }))}
            />
          </Field>
        </div>
      </FadeInSection>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const KPI_TONE_CLASSES = {
  accent: { card: "bg-accent text-accent-ink", label: "text-accent-ink/70" },
  ink: { card: "bg-ink text-white", label: "text-white/60" },
  danger: { card: "bg-red-500 text-white", label: "text-white/80" },
} as const;

function KpiLink({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: string;
  tone: keyof typeof KPI_TONE_CLASSES;
}) {
  const { card, label: labelClass } = KPI_TONE_CLASSES[tone];
  return (
    <Link href={href} className={cn("hover-card-magnetic block rounded-2xl p-6", card)}>
      <p className={cn("text-xs font-medium uppercase tracking-widest", labelClass)}>{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </Link>
  );
}

const HEALTH_LEVELS = {
  green: { dot: "🟢", label: "OK", classes: "border-green-300 bg-green-50 text-green-700" },
  amber: { dot: "🟠", label: "Vigilance", classes: "border-transparent bg-amber-400 text-white" },
  red: { dot: "🔴", label: "Critique", classes: "border-transparent bg-red-500 text-white" },
} as const;

function HealthBadge({ overloadCount }: { overloadCount: number }) {
  const level = overloadCount === 0 ? "green" : overloadCount === 1 ? "amber" : "red";
  const { dot, label, classes } = HEALTH_LEVELS[level];
  return (
    <div
      className={cn(
        "hover-card-magnetic flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-4 text-center",
        classes
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-widest">Santé projet</span>
      <span className="mt-1 text-2xl">{dot}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}
