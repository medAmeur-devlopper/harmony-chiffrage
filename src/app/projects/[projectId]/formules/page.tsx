import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField } from "@/components/editable-field";
import { updateComplexityCharge, updateProvision, updateIaRatio } from "../parametres/actions";
import {
  COMPLEXITY_LABELS,
  Complexity,
  IA_LEVEL_LABELS,
  IaLevelName,
  PHASE_LABELS,
  PhaseName,
  DEFAULT_LOT_PHASE_DURATIONS,
  DEFAULT_EXCHANGE_RATES,
  CURRENCIES,
} from "@/lib/constants";
import { formatPct } from "@/lib/utils";

/** Collapsible section wrapper shared by every formula block below. */
function FormulaSection({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="bg-white rounded-lg border border-slate-200 group">
      <summary className="cursor-pointer list-none p-5 font-semibold text-slate-700 flex items-center justify-between">
        {title}
        <span className="text-slate-400 text-sm group-open:rotate-90 transition-transform">▶</span>
      </summary>
      <div className="px-5 pb-5 space-y-4">{children}</div>
    </details>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded px-3 py-2 font-mono text-sm text-slate-700 overflow-x-auto">{children}</div>
  );
}

export default async function FormulesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);

  const [complexityLevels, iaLevels] = await Promise.all([
    prisma.complexityLevel.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.iaLevelOption.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
  ]);

  const complexity = async (id: string, value: string) => {
    "use server";
    await updateComplexityCharge(id, projectId, value);
  };
  const iaRatio = async (id: string, value: string) => {
    "use server";
    await updateIaRatio(id, projectId, value);
  };
  const provision = async (f: Parameters<typeof updateProvision>[2], value: string) => {
    "use server";
    await updateProvision(version.id, projectId, f, value);
  };

  const echeancierSum =
    version.echeancierLancement + version.echeancierRecetteFinale + version.echeancierRetenue;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Formules &amp; paramètres</h2>
        <p className="text-slate-500 text-sm mt-1">
          Toutes les formules de calcul du chiffrage, avec les paramètres modifiables qui les alimentent.
        </p>
      </div>

      <FormulaSection title="1. Charge des exigences" defaultOpen>
        <Formula>Charge Dev+TU = Σ requirement.chargeRetenue (si retained = true)</Formula>
        <Formula>Charge IoT = Σ requirement.chargeIoT (si retained = true)</Formula>
        <Formula>Driver Charge = chargeDirecte si saisie manuellement, sinon Charge Dev+TU</Formula>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">Échelle de complexité → Charge (JH)</p>
          <table className="w-full text-sm max-w-md">
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
        </div>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">Ratios IA (multiplicateur du gain référence)</p>
          <table className="w-full text-sm max-w-md">
            <tbody>
              {iaLevels.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1.5">{IA_LEVEL_LABELS[l.name as IaLevelName]}</td>
                  <td className="py-1.5 w-28">
                    <EditableField
                      type="number"
                      step="0.05"
                      defaultValue={l.ratio.toString()}
                      action={iaRatio.bind(null, l.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormulaSection>

      <FormulaSection title="2. Abaque (activités)">
        <Formula>Charge sans IA = driverCharge × abaquePct</Formula>
        <Formula>Gain IA % = gainRefPct × ratioIA</Formula>
        <Formula>Gain IA (JH) = chargeSansIA × gainIA%</Formula>
        <Formula>Charge retenue = chargeSansIA − gainIA</Formula>
        <p className="text-xs text-slate-400">
          Les 42 activités et leur % d&apos;abaque sont éditables sur la page 2 · Chiffrage Projet. Leur somme
          représente ≈ 2.16× la charge Dev+TU driver.
        </p>
      </FormulaSection>

      <FormulaSection title="3. Coûts &amp; prix (ressources)">
        <Formula>Coût unitaire MAD = coût unitaire devise × taux de change</Formula>
        <Formula>Coût total = coûtUnitaireMAD × quantité</Formula>
        <Formula>Prix total = coûtTotal × (1 + markup%)</Formula>
        <Formula>Marge % = (prix − coût) / prix</Formula>
        <Formula>Profils humains → quantité = Σ chargeRetenue des activités affectées au profil</Formula>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            Taux de change par défaut (informatif — modifiable par ligne de ressource sur la page Chiffrage)
          </p>
          <table className="w-full text-sm max-w-md">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2">Devise</th>
                <th className="pb-2">1 unité = X MAD</th>
              </tr>
            </thead>
            <tbody>
              {CURRENCIES.map((cur) => (
                <tr key={cur} className="border-t border-slate-100">
                  <td className="py-1.5">{cur}</td>
                  <td className="py-1.5 cell-computed rounded px-2">{DEFAULT_EXCHANGE_RATES[cur]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormulaSection>

      <FormulaSection title="4. Provisions &amp; synthèse">
        <Formula>Provision risque opérationnel = sous-total coût × provisionRisqueOperationnel</Formula>
        <Formula>Provision risque financier = sous-total coût × provisionRisqueFinancier</Formula>
        <Formula>Prix HT = sous-total + provisions</Formula>
        <Formula>TVA = prixHT × tva</Formula>
        <Formula>Prix TTC = prixHT + TVA</Formula>
        <Formula>Fourchette haute = prixHT × (1 + fourchetteHaute)</Formula>
        <Formula>Fourchette basse = prixHT × (1 + fourchetteBasse)</Formula>
        <Formula>Garantie bonne exécution = prixHT × garantieBonneExecution</Formula>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {(
            [
              { field: "provisionRisqueOperationnel", label: "Provision risque opérationnel", value: version.provisionRisqueOperationnel },
              { field: "provisionRisqueFinancier", label: "Provision risque financier", value: version.provisionRisqueFinancier },
              { field: "tva", label: "TVA", value: version.tva },
              { field: "fourchetteHaute", label: "Fourchette haute", value: version.fourchetteHaute },
              { field: "fourchetteBasse", label: "Fourchette basse", value: version.fourchetteBasse },
              { field: "garantieBonneExecution", label: "Garantie bonne exécution", value: version.garantieBonneExecution },
            ] as { field: Parameters<typeof updateProvision>[2]; label: string; value: number }[]
          ).map((row) => (
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
      </FormulaSection>

      <FormulaSection title="5. Échéancier de paiement">
        <Formula>Lancement = prixHT × echeancierLancement</Formula>
        <Formula>Recette finale = prixHT × echeancierRecetteFinale</Formula>
        <Formula>Retenue = prixHT × echeancierRetenue</Formula>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {(
            [
              { field: "echeancierLancement", label: "Lancement", value: version.echeancierLancement },
              { field: "echeancierRecetteFinale", label: "Recette finale", value: version.echeancierRecetteFinale },
              { field: "echeancierRetenue", label: "Retenue / garantie", value: version.echeancierRetenue },
            ] as { field: Parameters<typeof updateProvision>[2]; label: string; value: number }[]
          ).map((row) => (
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
        <p className={`text-xs font-medium ${Math.round(echeancierSum * 100) === 100 ? "text-green-600" : "text-red-500"}`}>
          Somme des 3 tranches : {formatPct(echeancierSum)} {Math.round(echeancierSum * 100) === 100 ? "✓" : "— doit faire 100%"}
        </p>
      </FormulaSection>

      <FormulaSection title="6. Planning">
        <Formula>Date fin de phase = addWorkdays(dateDébut, durée en semaines × 5, joursFériés)</Formula>
        <Formula>Jours ouvrés / semaine = 5 − joursFériés dans la semaine</Formula>
        <Formula>Un lot démarre le jour ouvré suivant la fin du lot précédent (sauf date manuelle)</Formula>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            Durées par défaut des phases (semaines) — informatif, éditable par lot sur la page Macro Planning
          </p>
          <table className="w-full text-sm max-w-md">
            <tbody>
              {(Object.keys(DEFAULT_LOT_PHASE_DURATIONS) as PhaseName[]).map((phase) => (
                <tr key={phase} className="border-t border-slate-100">
                  <td className="py-1.5">{PHASE_LABELS[phase]}</td>
                  <td className="py-1.5 cell-computed rounded px-2 w-20">{DEFAULT_LOT_PHASE_DURATIONS[phase]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormulaSection>
    </div>
  );
}
