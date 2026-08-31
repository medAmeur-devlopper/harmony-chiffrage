import { getCurrentVersion } from "@/lib/getProjectVersion";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import { EditableField } from "@/components/editable-field";
import { updatePrixCible } from "./actions";
import { updateProvision } from "../parametres/actions";
import { RESOURCE_CATEGORIES, ENTITIES } from "@/lib/constants";
import {
  summarizeByCategory,
  summarizeByEntity,
  computeProvisions,
  computePriceRanges,
  computePaymentSchedule,
  computeNegotiation,
} from "@/lib/engine/pricing";
import { formatDH, formatPct } from "@/lib/utils";

export default async function SynthesePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);
  const { allLines } = await getProjectFinancials(version.id);

  const { rows, total } = summarizeByCategory(allLines, RESOURCE_CATEGORIES);
  const entitySplit = summarizeByEntity(allLines, ENTITIES);

  const provisions = computeProvisions({
    sousTotalCost: total.cost,
    sousTotalPrice: total.price,
    provisionRisqueOperationnel: version.provisionRisqueOperationnel,
    provisionRisqueFinancier: version.provisionRisqueFinancier,
    tva: version.tva,
  });

  const ranges = computePriceRanges(
    provisions.prixTotalHTPrice,
    version.fourchetteHaute,
    version.fourchetteBasse,
    version.garantieBonneExecution
  );

  const schedule = computePaymentSchedule(
    provisions.prixTotalHTPrice,
    version.echeancierLancement,
    version.echeancierRecetteFinale,
    version.echeancierRetenue
  );

  const negotiation = computeNegotiation(version.prixCibleHT, provisions.prixTotalHTCost);

  const prixCibleAction = async (v: string) => {
    "use server";
    await updatePrixCible(version.id, projectId, v);
  };
  const echeancierAction = async (f: Parameters<typeof updateProvision>[2], v: string) => {
    "use server";
    await updateProvision(version.id, projectId, f, v);
  };
  const echeancierSum = version.echeancierLancement + version.echeancierRecetteFinale + version.echeancierRetenue;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">4 · Synthèse &amp; prix</h2>
        <p className="text-slate-500 text-sm mt-1">
          Coûts, prix et marge par catégorie et entité ; provisions, garanties, échéancier, fourchettes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <h3 className="font-semibold text-slate-700 p-4 pb-0">A. Prix par catégorie de ressources</h3>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                <th className="p-2">Catégorie</th>
                <th className="p-2">Coût</th>
                <th className="p-2">Prix</th>
                <th className="p-2">Marge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.category} className="border-b border-slate-100">
                  <td className="p-2">{r.category}</td>
                  <td className="p-2">{formatDH(r.cost)}</td>
                  <td className="p-2">{formatDH(r.price)}</td>
                  <td className="p-2">{formatPct(r.margin)}</td>
                </tr>
              ))}
              <tr className="cell-total">
                <td className="p-2 font-semibold">TOTAL</td>
                <td className="p-2 font-semibold">{formatDH(total.cost)}</td>
                <td className="p-2 font-semibold">{formatDH(total.price)}</td>
                <td className="p-2 font-semibold">{formatPct(total.margin)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <h3 className="font-semibold text-slate-700 p-4 pb-0">C. Split par entité</h3>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                <th className="p-2">Entité</th>
                <th className="p-2">Coût</th>
                <th className="p-2">Prix</th>
                <th className="p-2">Marge</th>
              </tr>
            </thead>
            <tbody>
              {entitySplit.map((e) => (
                <tr key={e.entity} className="border-b border-slate-100">
                  <td className="p-2">{e.entity}</td>
                  <td className="p-2">{formatDH(e.cost)}</td>
                  <td className="p-2">{formatDH(e.price)}</td>
                  <td className="p-2">{formatPct(e.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">B. Provisions &amp; prix de vente</h3>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Sous-total (coûts / prix)" cost={provisions.sousTotalCost} price={provisions.sousTotalPrice} />
            <Row
              label={`Provision risque opérationnel (${formatPct(version.provisionRisqueOperationnel)})`}
              cost={provisions.provisionOperationnelleCost}
              price={provisions.provisionOperationnellePrice}
            />
            <Row
              label={`Provision risque financier (${formatPct(version.provisionRisqueFinancier)})`}
              cost={provisions.provisionFinanciereCost}
              price={provisions.provisionFinancierePrice}
            />
            <tr className="cell-total border-t border-slate-200">
              <td className="p-2 font-semibold">PRIX TOTAL HT (avec provisions)</td>
              <td className="p-2 font-semibold">{formatDH(provisions.prixTotalHTCost)}</td>
              <td className="p-2 font-semibold">{formatDH(provisions.prixTotalHTPrice)}</td>
            </tr>
            <Row label={`TVA (${formatPct(version.tva)})`} cost={0} price={provisions.tvaAmount} />
            <tr className="cell-total border-t border-slate-200">
              <td className="p-2 font-bold text-lg">PRIX TTC</td>
              <td></td>
              <td className="p-2 font-bold text-lg">{formatDH(provisions.prixTTC)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Fourchette d&apos;offre</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Prix estimé (référence)</span>
              <span className="font-semibold">{formatDH(ranges.prixEstime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fourchette haute ({formatPct(version.fourchetteHaute)})</span>
              <span>{formatDH(ranges.fourchetteHauteMontant)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fourchette basse ({formatPct(version.fourchetteBasse)})</span>
              <span>{formatDH(ranges.fourchetteBasseMontant)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Garantie bonne exécution ({formatPct(version.garantieBonneExecution)})</span>
              <span>{formatDH(ranges.garantieMontant)}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Échéancier de paiement (HT)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Lancement</span>
              <div className="flex items-center gap-2">
                <EditableField
                  type="number"
                  step="0.01"
                  defaultValue={version.echeancierLancement.toString()}
                  action={echeancierAction.bind(null, "echeancierLancement")}
                  className="w-20"
                />
                <span className="font-semibold w-24 text-right">{formatDH(schedule.lancement)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Recette finale</span>
              <div className="flex items-center gap-2">
                <EditableField
                  type="number"
                  step="0.01"
                  defaultValue={version.echeancierRecetteFinale.toString()}
                  action={echeancierAction.bind(null, "echeancierRecetteFinale")}
                  className="w-20"
                />
                <span className="font-semibold w-24 text-right">{formatDH(schedule.recetteFinale)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Retenue / garantie</span>
              <div className="flex items-center gap-2">
                <EditableField
                  type="number"
                  step="0.01"
                  defaultValue={version.echeancierRetenue.toString()}
                  action={echeancierAction.bind(null, "echeancierRetenue")}
                  className="w-20"
                />
                <span className="font-semibold w-24 text-right">{formatDH(schedule.retenue)}</span>
              </div>
            </div>
            <p
              className={`text-xs font-medium pt-1 ${
                Math.round(echeancierSum * 100) === 100 ? "text-green-600" : "text-red-500"
              }`}
            >
              Somme des tranches : {formatPct(echeancierSum)}{" "}
              {Math.round(echeancierSum * 100) === 100 ? "✓" : "— doit faire 100%"}
            </p>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">D. Négociation — prix cible</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-slate-500">Prix cible HT (négocié)</label>
            <EditableField
              type="number"
              defaultValue={version.prixCibleHT?.toString() ?? ""}
              action={prixCibleAction}
              className="mt-1"
            />
          </div>
          <Stat label="Coût total de référence (avec provisions)" value={formatDH(provisions.prixTotalHTCost)} />
          {negotiation && (
            <>
              <Stat label="Marge résultante au prix cible" value={formatPct(negotiation.margeResultante)} />
            </>
          )}
        </div>
        {negotiation && (
          <p className="text-sm text-slate-500 mt-3">
            Écart vs prix calculé : <span className="font-semibold">{formatDH(negotiation.ecartVsPrixCalcule)}</span>
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ label, cost, price }: { label: string; cost: number; price: number }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="p-2 text-slate-600">{label}</td>
      <td className="p-2">{formatDH(cost)}</td>
      <td className="p-2">{formatDH(price)}</td>
    </tr>
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
