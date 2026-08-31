import { getCurrentVersion } from "@/lib/getProjectVersion";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import { EditableField, EditableSelect } from "@/components/editable-field";
import {
  updateChargeDirecte,
  updateActivity,
  addActivity,
  deleteActivity,
  addResourceLine,
  updateResourceLine,
  deleteResourceLine,
} from "./actions";
import { addProfile, deleteProfile } from "../parametres/actions";
import {
  PHASE_LABELS,
  PHASES,
  PhaseName,
  IA_LEVEL_LABELS,
  IaLevelName,
  RESOURCE_CATEGORIES,
  ENTITIES,
  CURRENCIES,
} from "@/lib/constants";
import { summarizeByPhase, totalProjectCharge } from "@/lib/engine/abaque";
import { summarizeByCategory } from "@/lib/engine/pricing";
import { formatDH, formatJH, formatPct } from "@/lib/utils";

export default async function ChiffragePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);
  const {
    profiles,
    activities,
    resourceLines,
    chargeReferentiel,
    chargeIoT,
    driverCharge,
    ratio,
    abaqueResults,
    humanLines,
    otherLines,
  } = await getProjectFinancials(version.id);

  const { totalSansIA, totalRetenue } = totalProjectCharge(abaqueResults);
  const phaseSummary = summarizeByPhase(abaqueResults);
  const globalHorsIA = totalSansIA + chargeIoT;
  const globalAvecIA = totalRetenue + chargeIoT;
  const usedProfileIds = new Set(activities.map((a) => a.profileId).filter(Boolean));
  const allLines = [...humanLines, ...otherLines];
  const { total } = summarizeByCategory(allLines, RESOURCE_CATEGORIES);

  const chargeDirecteAction = async (v: string) => {
    "use server";
    await updateChargeDirecte(version.id, projectId, v);
  };
  const activityAction = async (
    id: string,
    f: "activityName" | "profileId" | "abaquePct" | "gainRefPct" | "phase",
    v: string
  ) => {
    "use server";
    await updateActivity(id, projectId, f, v);
  };
  const addActivityAction = async () => {
    "use server";
    await addActivity(projectId, version.id);
  };
  const delActivityAction = async (id: string) => {
    "use server";
    await deleteActivity(id, projectId);
  };
  const addProfileAction = async () => {
    "use server";
    await addProfile(projectId, version.id);
  };
  const delProfileAction = async (id: string) => {
    "use server";
    await deleteProfile(id, projectId);
  };
  const addLineAction = async () => {
    "use server";
    await addResourceLine(projectId, version.id);
  };
  const lineAction = async (
    id: string,
    f: "category" | "resourceName" | "entity" | "unit" | "unitCost" | "currency" | "exchangeRate" | "markupPct" | "quantity",
    v: string
  ) => {
    "use server";
    await updateResourceLine(id, projectId, f, v);
  };
  const delLineAction = async (id: string) => {
    "use server";
    await deleteResourceLine(id, projectId);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">2 · Chiffrage projet</h2>
        <p className="text-slate-500 text-sm mt-1">
          Charge Dev+TU du référentiel → abaque activités → coûts, prix et marge.
        </p>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Charge Dev+TU référentiel (JH)" value={formatJH(chargeReferentiel)} />
          <div className="cell-total rounded-lg p-3">
            <p className="text-xs text-slate-500">Saisie directe (JH, optionnel)</p>
            <EditableField
              type="number"
              step="0.5"
              defaultValue={version.chargeDirecte?.toString() ?? ""}
              action={chargeDirecteAction}
              className="mt-1 font-bold text-lg"
            />
          </div>
          <Stat label="CHARGE DEV+TU RETENUE (driver)" value={formatJH(driverCharge)} />
          <Stat label="CHARGE IOT (driver)" value={formatJH(chargeIoT)} />
          <Stat label="Niveau IA du projet" value={IA_LEVEL_LABELS[version.iaLevel as IaLevelName]} />
          <Stat label="Ratio IA appliqué" value={ratio.toString()} />
          <Stat label="Charge globale — hors IA (JH)" value={formatJH(globalHorsIA)} />
          <Stat label="Charge globale — avec IA (JH)" value={formatJH(globalAvecIA)} />
        </div>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <h3 className="font-semibold text-slate-700 p-4 pb-0">A. Activités (abaque automatique)</h3>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">#</th>
              <th className="p-2">Phase</th>
              <th className="p-2 min-w-55">Activité</th>
              <th className="p-2">Profil</th>
              <th className="p-2">% abaque</th>
              <th className="p-2">Charge sans IA</th>
              <th className="p-2">% gain réf.</th>
              <th className="p-2">Gain IA %</th>
              <th className="p-2">Charge retenue</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {abaqueResults.map((a, i) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="p-1.5 text-slate-400">{i + 1}</td>
                <td className="p-1.5 w-32">
                  <EditableSelect
                    defaultValue={a.phase}
                    action={activityAction.bind(null, a.id, "phase")}
                    options={PHASES.map((p) => ({ value: p, label: PHASE_LABELS[p as PhaseName] }))}
                  />
                </td>
                <td className="p-1.5">
                  <EditableField
                    defaultValue={a.activityName ?? ""}
                    action={activityAction.bind(null, a.id, "activityName")}
                  />
                </td>
                <td className="p-1.5 w-40">
                  <EditableSelect
                    defaultValue={a.profileId ?? ""}
                    action={activityAction.bind(null, a.id, "profileId")}
                    options={[{ value: "", label: "—" }, ...profiles.map((p) => ({ value: p.id, label: p.name }))]}
                  />
                </td>
                <td className="p-1.5 w-20">
                  <EditableField
                    type="number"
                    step="0.001"
                    defaultValue={a.abaquePct.toString()}
                    action={activityAction.bind(null, a.id, "abaquePct")}
                  />
                </td>
                <td className="p-1.5 w-24 cell-computed rounded text-center">{formatJH(a.chargeSansIA)}</td>
                <td className="p-1.5 w-20">
                  <EditableField
                    type="number"
                    step="0.01"
                    defaultValue={a.gainRefPct.toString()}
                    action={activityAction.bind(null, a.id, "gainRefPct")}
                  />
                </td>
                <td className="p-1.5 w-20 cell-computed rounded text-center">{formatPct(a.gainIAPct)}</td>
                <td className="p-1.5 w-24 cell-computed rounded text-center">{formatJH(a.chargeRetenue)}</td>
                <td className="p-1.5">
                  <form action={delActivityAction.bind(null, a.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            <tr className="cell-total">
              <td colSpan={5} className="p-2 text-right font-semibold">
                TOTAL CHARGE PROJET
              </td>
              <td className="p-2 text-center font-semibold">{formatJH(totalSansIA)}</td>
              <td></td>
              <td></td>
              <td className="p-2 text-center font-semibold">{formatJH(totalRetenue)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <form action={addActivityAction} className="p-4">
          <button
            type="submit"
            className="btn-gold rounded-full text-sm font-semibold px-4 py-2 transition-all"
          >
            + Ajouter une activité
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">B. Restitution par phase</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">Phase</th>
              <th className="p-2">Charge sans IA</th>
              <th className="p-2">Charge avec IA</th>
              <th className="p-2">Gain IA</th>
              <th className="p-2">% du total</th>
            </tr>
          </thead>
          <tbody>
            {phaseSummary.map((p) => (
              <tr key={p.phase} className="border-b border-slate-100">
                <td className="p-2">{PHASE_LABELS[p.phase]}</td>
                <td className="p-2">{formatJH(p.chargeSansIA)}</td>
                <td className="p-2">{formatJH(p.chargeAvecIA)}</td>
                <td className="p-2">{formatJH(p.gainIA)}</td>
                <td className="p-2">{formatPct(p.pctOfTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <h3 className="font-semibold text-slate-700 p-4 pb-0">C. Ressources &amp; moyens — coûts, prix, marge</h3>
        <p className="text-xs text-slate-400 px-4 pt-1">
          Les lignes grisées (Moyens Humains) sont calculées automatiquement depuis l&apos;abaque : un
          profil affichant 🔒 est assigné à une activité et doit d&apos;abord en être retiré (section A)
          avant de pouvoir être supprimé. Les autres lignes (toutes catégories) s&apos;ajoutent et se
          suppriment librement.
        </p>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">Catégorie</th>
              <th className="p-2">Ressource</th>
              <th className="p-2">Entité</th>
              <th className="p-2">Unité</th>
              <th className="p-2">Devise</th>
              <th className="p-2">Taux → MAD</th>
              <th className="p-2">Coût unit. (devise)</th>
              <th className="p-2">Coût unit. (MAD)</th>
              <th className="p-2">Markup %</th>
              <th className="p-2">Qté</th>
              <th className="p-2">Coût total</th>
              <th className="p-2">Prix total</th>
              <th className="p-2">Marge %</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {humanLines.map((l, idx) => {
              const profile = profiles[idx];
              const isUsed = usedProfileIds.has(profile.id);
              return (
                <tr key={l.id} className="border-b border-slate-100 text-slate-500">
                  <td className="p-2">{l.category}</td>
                  <td className="p-2">{l.resourceName}</td>
                  <td className="p-2">{l.entity}</td>
                  <td className="p-2">{l.unit}</td>
                  <td className="p-2">{l.currency}</td>
                  <td className="p-2">—</td>
                  <td className="p-2">{formatDH(l.unitCost)}</td>
                  <td className="p-2 cell-computed rounded text-center">{formatDH(l.unitCostMAD)}</td>
                  <td className="p-2">{formatPct(l.markupPct)}</td>
                  <td className="p-2 cell-computed rounded text-center">{l.quantity.toFixed(1)}</td>
                  <td className="p-2 cell-computed rounded text-center">{formatDH(l.totalCost)}</td>
                  <td className="p-2 cell-computed rounded text-center">{formatDH(l.totalPrice)}</td>
                  <td className="p-2 cell-computed rounded text-center">{formatPct(l.marginPct)}</td>
                  <td className="p-1.5">
                    {isUsed ? (
                      <span className="text-xs text-slate-300" title="Assigné à une activité de l'abaque — retirez-le de l'abaque pour pouvoir le supprimer">
                        🔒
                      </span>
                    ) : (
                      <form action={delProfileAction.bind(null, profile.id)}>
                        <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                          ✕
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {resourceLines.map((line, idx) => {
              const l = otherLines[idx];
              return (
                <tr key={line.id} className="border-b border-slate-100">
                  <td className="p-1.5 w-40">
                    <EditableSelect
                      defaultValue={line.category}
                      action={lineAction.bind(null, line.id, "category")}
                      options={RESOURCE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                    />
                  </td>
                  <td className="p-1.5 w-40">
                    <EditableField
                      defaultValue={line.resourceName}
                      action={lineAction.bind(null, line.id, "resourceName")}
                    />
                  </td>
                  <td className="p-1.5 w-28">
                    <EditableSelect
                      defaultValue={line.entity}
                      action={lineAction.bind(null, line.id, "entity")}
                      options={ENTITIES.map((e) => ({ value: e, label: e }))}
                    />
                  </td>
                  <td className="p-1.5 w-16">
                    <EditableField defaultValue={line.unit} action={lineAction.bind(null, line.id, "unit")} />
                  </td>
                  <td className="p-1.5 w-20">
                    <EditableSelect
                      defaultValue={line.currency}
                      action={lineAction.bind(null, line.id, "currency")}
                      options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                    />
                  </td>
                  <td className="p-1.5 w-20">
                    <EditableField
                      type="number"
                      step="0.01"
                      defaultValue={line.exchangeRate.toString()}
                      action={lineAction.bind(null, line.id, "exchangeRate")}
                    />
                  </td>
                  <td className="p-1.5 w-24">
                    <EditableField
                      type="number"
                      defaultValue={line.unitCost.toString()}
                      action={lineAction.bind(null, line.id, "unitCost")}
                    />
                  </td>
                  <td className="p-2 cell-computed rounded text-center">{formatDH(l.unitCostMAD)}</td>
                  <td className="p-1.5 w-20">
                    <EditableField
                      type="number"
                      step="0.01"
                      defaultValue={(line.markupPct ?? 0).toString()}
                      action={lineAction.bind(null, line.id, "markupPct")}
                    />
                  </td>
                  <td className="p-1.5 w-20">
                    <EditableField
                      type="number"
                      defaultValue={line.quantity.toString()}
                      action={lineAction.bind(null, line.id, "quantity")}
                    />
                  </td>
                  <td className="p-2 cell-computed rounded text-center">{formatDH(l.totalCost)}</td>
                  <td className="p-2 cell-computed rounded text-center">{formatDH(l.totalPrice)}</td>
                  <td className="p-2 cell-computed rounded text-center">{formatPct(l.marginPct)}</td>
                  <td className="p-1.5">
                    <form action={delLineAction.bind(null, line.id)}>
                      <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                        ✕
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            <tr className="cell-total">
              <td colSpan={10} className="p-2 text-right font-semibold">
                TOTAL COÛTS &amp; PRIX
              </td>
              <td className="p-2 text-center font-semibold">{formatDH(total.cost)}</td>
              <td className="p-2 text-center font-semibold">{formatDH(total.price)}</td>
              <td className="p-2 text-center font-semibold">{formatPct(total.margin)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div className="p-4 flex flex-wrap gap-3">
          <form action={addLineAction}>
            <button
              type="submit"
              className="btn-gold rounded-full text-sm font-semibold px-4 py-2 transition-all"
            >
              + Ajouter une ressource
            </button>
          </form>
          <form action={addProfileAction}>
            <button
              type="submit"
              className="rounded-full border-2 border-[#16314F] text-[#16314F] text-sm font-semibold px-4 py-2 hover:bg-[#16314F] hover:text-white transition-colors"
            >
              + Ajouter un profil (Moyens Humains)
            </button>
          </form>
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
