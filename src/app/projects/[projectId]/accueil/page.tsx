import { getCurrentVersion } from "@/lib/getProjectVersion";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { updateProjectField } from "./actions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, ProjectStatus } from "@/lib/constants";
import { totalDevCharge, totalIotCharge } from "@/lib/engine/charge";
import { formatDate, formatJH } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function AccueilPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, version } = await getCurrentVersion(projectId);
  const requirements = await prisma.requirement.findMany({ where: { projectVersionId: version.id } });

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
