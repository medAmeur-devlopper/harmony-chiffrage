import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { addRequirement, deleteRequirement, updateRequirementField } from "./actions";
import {
  COMPLEXITIES,
  COMPLEXITY_LABELS,
  Complexity,
  MOSCOW_VALUES,
  MOSCOW_LABELS,
  Moscow,
  COVERAGE_VALUES,
  COVERAGE_LABELS,
  Coverage,
} from "@/lib/constants";
import { totalDevCharge, totalIotCharge } from "@/lib/engine/charge";
import { formatJH } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function ExigencesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);
  const requirements = await prisma.requirement.findMany({
    where: { projectVersionId: version.id },
    orderBy: { orderNum: "asc" },
  });

  const chargeDevTU = totalDevCharge(requirements as never[]);
  const chargeIoT = totalIotCharge(requirements as never[]);
  const retenues = requirements.filter((r) => r.retained).length;

  const addAction = async () => {
    "use server";
    await addRequirement(projectId, version.id);
  };
  const delAction = async (id: string) => {
    "use server";
    await deleteRequirement(id, projectId);
  };
  const field = async (id: string, f: string, v: string) => {
    "use server";
    await updateRequirementField(id, projectId, f, v);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Référentiel Exigences"
        highlight="Exigences"
        subtitle="Cataloguez les exigences ; la charge se déduit de la complexité (modifiable)."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card tone="mint" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Exigences (total)</p>
          <p className="mt-1 font-display text-2xl text-ink">{requirements.length}</p>
        </Card>
        <Card tone="lavender" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Retenues</p>
          <p className="mt-1 font-display text-2xl text-ink">{retenues}</p>
        </Card>
        <Card tone="sky" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Charge Dev+TU retenue</p>
          <p className="mt-1 font-display text-2xl text-ink">{formatJH(chargeDevTU)}</p>
        </Card>
        <Card tone="rose" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/60">Charge IoT retenue</p>
          <p className="mt-1 font-display text-2xl text-ink">{formatJH(chargeIoT)}</p>
        </Card>
      </div>

      <div className="rounded-2xl bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[1400px]">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-slate-200">
              <th className="p-2 min-w-24">ID</th>
              <th className="p-2 min-w-36">Epic</th>
              <th className="p-2 min-w-36">Module</th>
              <th className="p-2 min-w-[200px]">Titre</th>
              <th className="p-2 min-w-[260px]">Exigence fonctionnelle</th>
              <th className="p-2">Matériel ?</th>
              <th className="p-2">Complexité</th>
              <th className="p-2">Abaque (JH)</th>
              <th className="p-2">Retenue (JH)</th>
              <th className="p-2">IoT (JH)</th>
              <th className="p-2">MoSCoW</th>
              <th className="p-2">Retenu ?</th>
              <th className="p-2">Couverture</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-top">
                <td className="p-1.5 min-w-24">
                  <EditableField defaultValue={r.refId} action={field.bind(null, r.id, "refId")} />
                </td>
                <td className="p-1.5 min-w-36">
                  <EditableField defaultValue={r.epicName} action={field.bind(null, r.id, "epicName")} />
                </td>
                <td className="p-1.5 min-w-36">
                  <EditableField defaultValue={r.moduleName ?? ""} action={field.bind(null, r.id, "moduleName")} />
                </td>
                <td className="p-1.5">
                  <EditableField defaultValue={r.title} action={field.bind(null, r.id, "title")} />
                </td>
                <td className="p-1.5">
                  <EditableField defaultValue={r.description ?? ""} action={field.bind(null, r.id, "description")} />
                </td>
                <td className="p-1.5 min-w-28">
                  <EditableSelect
                    defaultValue={r.requiresHardware ? "true" : "false"}
                    action={field.bind(null, r.id, "requiresHardware")}
                    options={[{ value: "false", label: "Non" }, { value: "true", label: "Oui" }]}
                  />
                </td>
                <td className="p-1.5 min-w-36">
                  <EditableSelect
                    defaultValue={r.complexity}
                    action={field.bind(null, r.id, "complexity")}
                    options={COMPLEXITIES.map((c) => ({ value: c, label: COMPLEXITY_LABELS[c as Complexity] }))}
                  />
                </td>
                <td className="p-1.5 min-w-24 cell-computed rounded text-center">{r.chargeAbaque}</td>
                <td className="p-1.5 min-w-28">
                  <EditableField
                    type="number"
                    step="0.5"
                    defaultValue={r.chargeRetenue.toString()}
                    action={field.bind(null, r.id, "chargeRetenue")}
                  />
                </td>
                <td className="p-1.5 min-w-28">
                  <EditableField
                    type="number"
                    step="0.5"
                    defaultValue={r.chargeIoT.toString()}
                    action={field.bind(null, r.id, "chargeIoT")}
                  />
                </td>
                <td className="p-1.5 min-w-28">
                  <EditableSelect
                    defaultValue={r.moscow}
                    action={field.bind(null, r.id, "moscow")}
                    options={MOSCOW_VALUES.map((m) => ({ value: m, label: MOSCOW_LABELS[m as Moscow] }))}
                  />
                </td>
                <td className="p-1.5 min-w-28">
                  <EditableSelect
                    defaultValue={r.retained ? "true" : "false"}
                    action={field.bind(null, r.id, "retained")}
                    options={[{ value: "true", label: "Oui" }, { value: "false", label: "Non" }]}
                  />
                </td>
                <td className="p-1.5 min-w-44">
                  <EditableSelect
                    defaultValue={r.coverage}
                    action={field.bind(null, r.id, "coverage")}
                    options={COVERAGE_VALUES.map((c) => ({ value: c, label: COVERAGE_LABELS[c as Coverage] }))}
                  />
                </td>
                <td className="p-1.5">
                  <form action={delAction.bind(null, r.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={addAction}>
        <Button type="submit">+ Ajouter une exigence</Button>
      </form>
    </div>
  );
}
