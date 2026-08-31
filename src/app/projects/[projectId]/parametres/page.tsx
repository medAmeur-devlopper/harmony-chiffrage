import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { updateComplexityCharge, updateProfile, updateIaLevel, updateProvision } from "./actions";
import {
  COMPLEXITY_LABELS,
  Complexity,
  IA_LEVELS,
  IA_LEVEL_LABELS,
  IaLevelName,
  ENTITIES,
} from "@/lib/constants";
import { formatPct } from "@/lib/utils";

export default async function ParametresPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);

  const [complexityLevels, iaLevels, profiles] = await Promise.all([
    prisma.complexityLevel.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.iaLevelOption.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.profile.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
  ]);

  const complexity = async (id: string, value: string) => {
    "use server";
    await updateComplexityCharge(id, projectId, value);
  };
  const profile = async (id: string, f: "cjm" | "markupPct" | "entity", value: string) => {
    "use server";
    await updateProfile(id, projectId, f, value);
  };
  const iaLevel = async (value: string) => {
    "use server";
    await updateIaLevel(version.id, projectId, value);
  };
  const provision = async (f: Parameters<typeof updateProvision>[2], value: string) => {
    "use server";
    await updateProvision(version.id, projectId, f, value);
  };

  const provisionRows: { field: Parameters<typeof updateProvision>[2]; label: string; value: number }[] = [
    { field: "provisionRisqueOperationnel", label: "Provision risque opérationnel (% du coût)", value: version.provisionRisqueOperationnel },
    { field: "provisionRisqueFinancier", label: "Provision risque financier (% du coût)", value: version.provisionRisqueFinancier },
    { field: "markupProvisions", label: "Markup appliqué aux provisions", value: version.markupProvisions },
    { field: "garantieBonneExecution", label: "Garantie de bonne exécution (% du prix)", value: version.garantieBonneExecution },
    { field: "penaliteRetardPlafond", label: "Pénalité de retard — plafond (% du prix)", value: version.penaliteRetardPlafond },
    { field: "fourchetteHaute", label: "Fourchette haute — offre excessive", value: version.fourchetteHaute },
    { field: "fourchetteBasse", label: "Fourchette basse — anormalement basse", value: version.fourchetteBasse },
    { field: "tva", label: "TVA", value: version.tva },
    { field: "echeancierLancement", label: "Échéancier — Lancement", value: version.echeancierLancement },
    { field: "echeancierRecetteFinale", label: "Échéancier — Recette finale", value: version.echeancierRecetteFinale },
    { field: "echeancierRetenue", label: "Échéancier — Retenue / garantie", value: version.echeancierRetenue },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Paramètres &amp; abaques</h2>
        <p className="text-slate-500 text-sm mt-1">Barèmes de charge, profils &amp; CJM, niveaux IA, provisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">A. Complexité → Charge Dev+TU (JH)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2">Complexité</th>
                <th className="pb-2">Charge (JH)</th>
              </tr>
            </thead>
            <tbody>
              {complexityLevels.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-1.5">{COMPLEXITY_LABELS[c.name as Complexity]}</td>
                  <td className="py-1.5 w-28">
                    <EditableField
                      type="number"
                      step="0.5"
                      defaultValue={c.chargeJH.toString()}
                      action={complexity.bind(null, c.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">B. Niveau IA du projet</h3>
          <EditableSelect
            defaultValue={version.iaLevel}
            action={iaLevel}
            options={IA_LEVELS.map((l) => ({ value: l, label: IA_LEVEL_LABELS[l] }))}
            className="max-w-xs"
          />
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2">Niveau IA</th>
                <th className="pb-2">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {iaLevels.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1.5">{IA_LEVEL_LABELS[l.name as IaLevelName]}</td>
                  <td className="py-1.5">{l.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">C. Profils · CJM · Markup</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="pb-2">Profil</th>
              <th className="pb-2">Code</th>
              <th className="pb-2">CJM (DH/JH)</th>
              <th className="pb-2">Markup %</th>
              <th className="pb-2">Entité</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="py-1.5">{p.name}</td>
                <td className="py-1.5 text-slate-400">{p.code}</td>
                <td className="py-1.5 w-28">
                  <EditableField
                    type="number"
                    defaultValue={p.cjm.toString()}
                    action={profile.bind(null, p.id, "cjm")}
                  />
                </td>
                <td className="py-1.5 w-24">
                  <EditableField
                    type="number"
                    step="0.01"
                    defaultValue={p.markupPct.toString()}
                    action={profile.bind(null, p.id, "markupPct")}
                  />
                </td>
                <td className="py-1.5 w-36">
                  <EditableSelect
                    defaultValue={p.entity}
                    action={profile.bind(null, p.id, "entity")}
                    options={ENTITIES.map((e) => ({ value: e, label: e }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">D. Provisions &amp; conditions commerciales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {provisionRows.map((row) => (
            <div key={row.field} className="flex items-center justify-between gap-4">
              <label className="text-sm text-slate-600">{row.label}</label>
              <div className="w-28 flex items-center gap-2">
                <EditableField
                  type="number"
                  step="0.01"
                  defaultValue={row.value.toString()}
                  action={provision.bind(null, row.field)}
                />
                <span className="text-xs text-slate-400 w-10">{formatPct(row.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
