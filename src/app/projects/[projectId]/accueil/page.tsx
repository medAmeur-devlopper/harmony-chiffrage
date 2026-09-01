import { getCurrentVersion } from "@/lib/getProjectVersion";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { updateProjectField } from "./actions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, ProjectStatus } from "@/lib/constants";
import { totalDevCharge, totalIotCharge } from "@/lib/engine/charge";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { summarizeByCategory, computeProvisions } from "@/lib/engine/pricing";
import { cascadeDates, projectEndDate, totalProjectWeeks, computeOverallProgress, LotPhaseInput } from "@/lib/engine/planning";
import { formatDate, formatJH, formatDH } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function AccueilPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);
  const [requirements, lots, holidays, milestones] = await Promise.all([
    prisma.requirement.findMany({ where: { projectVersionId: version.id } }),
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: project.organizationId } }),
    prisma.milestone.findMany({ where: { projectVersionId: version.id }, orderBy: { date: "asc" } }),
  ]);

  const totalReq = requirements.length;
  const retenues = requirements.filter((r) => r.retained).length;
  const chargeDevTU = totalDevCharge(
    requirements.map((r) => ({
      complexity: r.complexity as never,
      chargeRetenue: r.chargeRetenue,
      chargeIoT: r.chargeIoT,
      retained: r.retained,
    }))
  );
  const chargeIoT = totalIotCharge(
    requirements.map((r) => ({
      complexity: r.complexity as never,
      chargeRetenue: r.chargeRetenue,
      chargeIoT: r.chargeIoT,
      retained: r.retained,
    }))
  );

  const coverageCounts = { COUVERTE: 0, PARTIELLE: 0, A_DEVELOPPER: 0, EXCLUSIVE: 0 };
  for (const r of requirements) {
    coverageCounts[r.coverage as keyof typeof coverageCounts]++;
  }

  // KPI dashboard data
  const { allLines } = await getProjectFinancials(version.id);
  const { total } = summarizeByCategory(allLines, RESOURCE_CATEGORIES);
  const provisions = computeProvisions({
    sousTotalCost: total.cost,
    sousTotalPrice: total.price,
    provisionRisqueOperationnel: version.provisionRisqueOperationnel,
    provisionRisqueFinancier: version.provisionRisqueFinancier,
    tva: version.tva,
  });

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
  const cascaded = cascadeDates(projectStart, phasesByLot, holidays.map((h) => ({ date: h.date })));
  const projectEnd = projectEndDate(cascaded);
  const totalWeeks = projectEnd ? totalProjectWeeks(projectStart, projectEnd) : 0;
  const overallProgress = computeOverallProgress(
    lots.flatMap((lot) => lot.phases.map((p) => ({ durationWeeks: p.durationWeeks, progress: p.progress })))
  );

  const today = new Date();
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const nextMilestone = milestones.filter((m) => !m.completed && m.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const openRisksCount = await prisma.risk.count({
    where: { projectVersionId: version.id, status: { in: ["OUVERT", "EN_COURS"] } },
  });

  const field = async (fieldName: string, value: string) => {
    "use server";
    await updateProjectField(projectId, fieldName, value);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Accueil &amp; mode d&apos;emploi</h2>
        <p className="text-slate-500 text-sm mt-1">
          Outil de chiffrage Harmony — du référentiel d&apos;exigences au prix de vente.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <KpiCard label="Budget estimé (HT)" value={formatDH(provisions.prixTotalHTPrice)} accent="gold" />
        <KpiCard label="Exigences retenues" value={`${retenues} / ${totalReq}`} accent="teal" />
        <KpiCard label="Avancement global" value={`${overallProgress.toFixed(0)}%`} accent="navy" />
        <KpiCard
          label="Jalons complétés"
          value={milestones.length ? `${completedMilestones} / ${milestones.length}` : "—"}
          accent="teal"
        />
        <KpiCard label="Prochaine échéance" value={nextMilestone ? formatDate(nextMilestone.date) : "—"} accent="gold" />
        <KpiCard label="Durée / lots" value={`${totalWeeks} sem. · ${lots.length} lots`} accent="navy" />
        <KpiCard label="Risques actifs" value={openRisksCount.toString()} accent={openRisksCount > 0 ? "gold" : "teal"} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Fiche projet</h3>
          <div className="space-y-3 text-sm">
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
            <Field label="Date du chiffrage">
              <span className="cell-computed rounded px-2 py-1 block">{formatDate(project.createdAt)}</span>
            </Field>
            <Field label="Statut">
              <EditableSelect
                defaultValue={project.status}
                action={field.bind(null, "status")}
                options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s as ProjectStatus] }))}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Totaux &amp; résultats</h3>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Exigences (total)" value={totalReq.toString()} />
            <Stat label="Retenues" value={retenues.toString()} />
            <Stat label="Charge Dev+TU retenue" value={formatJH(chargeDevTU)} />
            <Stat label="Charge IoT retenue" value={formatJH(chargeIoT)} />
          </div>
          <p className="text-xs text-slate-400 mt-4">
            🟢 {coverageCounts.COUVERTE} · 🟠 {coverageCounts.PARTIELLE} · 🔴 {coverageCounts.A_DEVELOPPER} · 🟣{" "}
            {coverageCounts.EXCLUSIVE}
          </p>
        </section>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Mode d&apos;emploi — 4 étapes</h3>
        <ol className="space-y-3 text-sm text-slate-600">
          <li>
            <strong className="text-slate-800">1. Paramètres</strong> — Vérifier les CJM, markups et le niveau IA du
            projet. Adapter provisions et conditions.
          </li>
          <li>
            <strong className="text-slate-800">2. Référentiel Exigences</strong> — Saisir ou coller les exigences : la
            complexité déduit la charge, MoSCoW pilote le périmètre retenu.
          </li>
          <li>
            <strong className="text-slate-800">3. Chiffrage Projet</strong> — Contrôler l&apos;abaque
            d&apos;activités, la restitution par phase, puis compléter les ressources non humaines.
          </li>
          <li>
            <strong className="text-slate-800">4. Capacity &amp; Synthèse</strong> — Renseigner le macro planning,
            staffer les semaines, puis lire prix HT/TTC, échéancier, fourchettes et marges.
          </li>
        </ol>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
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

const KPI_ACCENTS = {
  gold: "border-[#FFC933]/40 text-[#8a6400]",
  teal: "border-[#2f6f8f]/30 text-[#2f6f8f]",
  navy: "border-[#16314F]/30 text-[#16314F]",
} as const;

function KpiCard({ label, value, accent }: { label: string; value: string; accent: keyof typeof KPI_ACCENTS }) {
  return (
    <div className={`bg-white rounded-xl border-2 ${KPI_ACCENTS[accent]} p-4 shadow-sm`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}
