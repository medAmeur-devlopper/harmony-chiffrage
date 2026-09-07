import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { addRisk, updateRiskField, deleteRisk } from "./actions";
import {
  RISK_PROBABILITIES,
  RISK_PROBABILITY_LABELS,
  RiskProbability,
  RISK_IMPACTS,
  RISK_IMPACT_LABELS,
  RiskImpact,
  RISK_STATUSES,
  RISK_STATUS_LABELS,
  RISK_STATUS_COLORS,
  RiskStatus,
  RISK_SCORE,
  RISK_SCORE_COLORS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function RisquesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);
  const risks = await prisma.risk.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } });

  const addAction = async () => {
    "use server";
    await addRisk(projectId, version.id);
  };
  const fieldAction = async (id: string, field: string, value: string) => {
    "use server";
    await updateRiskField(id, projectId, field, value);
  };
  const deleteAction = async (id: string) => {
    "use server";
    await deleteRisk(id, projectId);
  };

  // Matrix: count of open/in-progress risks per probability x impact cell
  const activeRisks = risks.filter((r) => r.status === "OUVERT" || r.status === "EN_COURS");
  const matrix: Record<RiskProbability, Record<RiskImpact, number>> = {
    FAIBLE: { FAIBLE: 0, MOYEN: 0, ELEVE: 0, CRITIQUE: 0 },
    MOYENNE: { FAIBLE: 0, MOYEN: 0, ELEVE: 0, CRITIQUE: 0 },
    ELEVEE: { FAIBLE: 0, MOYEN: 0, ELEVE: 0, CRITIQUE: 0 },
  };
  for (const r of activeRisks) {
    matrix[r.probability as RiskProbability][r.impact as RiskImpact]++;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Registre des risques"
        highlight="risques"
        subtitle="Identifier, suivre et mitiger les risques projet — matrice probabilité × impact."
        actions={
          <form action={addAction}>
            <Button type="submit" className="whitespace-nowrap">
              + Ajouter un risque
            </Button>
          </form>
        }
      />

      <section className="rounded-2xl bg-surface p-5">
        <h3 className="font-semibold text-primary mb-4">Matrice des risques actifs</h3>
        <div className="overflow-x-auto">
          <table className="text-sm border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="p-2 text-xs text-muted"></th>
                {RISK_IMPACTS.map((impact) => (
                  <th key={impact} className="p-2 text-xs font-semibold text-muted">
                    {RISK_IMPACT_LABELS[impact]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RISK_PROBABILITIES.slice()
                .reverse()
                .map((probability) => (
                  <tr key={probability}>
                    <td className="p-2 text-xs font-semibold text-muted whitespace-nowrap">
                      {RISK_PROBABILITY_LABELS[probability]}
                    </td>
                    {RISK_IMPACTS.map((impact) => {
                      const score = RISK_SCORE[probability][impact];
                      const count = matrix[probability][impact];
                      return (
                        <td
                          key={impact}
                          className={`w-16 h-14 text-center rounded-lg font-bold text-lg ${RISK_SCORE_COLORS[score]}`}
                        >
                          {count > 0 ? count : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-slate-200">
              <th className="p-2">Risque</th>
              <th className="p-2">Probabilité</th>
              <th className="p-2">Impact</th>
              <th className="p-2">Mitigation</th>
              <th className="p-2">Responsable</th>
              <th className="p-2">Statut</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {risks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted text-sm">
                  Aucun risque identifié pour ce projet.
                </td>
              </tr>
            ) : (
              risks.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="p-1.5 w-48">
                    <EditableField defaultValue={r.name} action={fieldAction.bind(null, r.id, "name")} />
                  </td>
                  <td className="p-1.5 w-32">
                    <EditableSelect
                      defaultValue={r.probability}
                      action={fieldAction.bind(null, r.id, "probability")}
                      options={RISK_PROBABILITIES.map((p) => ({ value: p, label: RISK_PROBABILITY_LABELS[p] }))}
                    />
                  </td>
                  <td className="p-1.5 w-32">
                    <EditableSelect
                      defaultValue={r.impact}
                      action={fieldAction.bind(null, r.id, "impact")}
                      options={RISK_IMPACTS.map((i) => ({ value: i, label: RISK_IMPACT_LABELS[i] }))}
                    />
                  </td>
                  <td className="p-1.5 w-56">
                    <EditableField defaultValue={r.mitigation} action={fieldAction.bind(null, r.id, "mitigation")} />
                  </td>
                  <td className="p-1.5 w-36">
                    <EditableField defaultValue={r.owner} action={fieldAction.bind(null, r.id, "owner")} />
                  </td>
                  <td className="p-1.5 w-36">
                    <EditableSelect
                      defaultValue={r.status}
                      action={fieldAction.bind(null, r.id, "status")}
                      options={RISK_STATUSES.map((s) => ({ value: s, label: RISK_STATUS_LABELS[s] }))}
                      className={RISK_STATUS_COLORS[r.status as RiskStatus]}
                    />
                  </td>
                  <td className="p-1.5 w-16">
                    <form action={deleteAction.bind(null, r.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Supprimer le risque « ${r.name} » ?`}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Suppr.
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
