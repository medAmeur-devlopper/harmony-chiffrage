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
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">1 · Référentiel des exigences</h2>
        <p className="text-slate-500 text-sm mt-1">
          Cataloguez les exigences ; la charge se déduit de la complexité (modifiable).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Exigences (total)" value={requirements.length.toString()} />
        <Stat label="Retenues" value={retenues.toString()} />
        <Stat label="Charge Dev+TU retenue" value={formatJH(chargeDevTU)} />
        <Stat label="Charge IoT retenue" value={formatJH(chargeIoT)} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1400px]">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">ID</th>
              <th className="p-2">Epic</th>
              <th className="p-2">Module</th>
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
                <td className="p-1.5 w-28">
                  <EditableField defaultValue={r.refId} action={field.bind(null, r.id, "refId")} />
                </td>
                <td className="p-1.5 w-32">
                  <EditableField defaultValue={r.epicName} action={field.bind(null, r.id, "epicName")} />
                </td>
                <td className="p-1.5 w-32">
                  <EditableField defaultValue={r.moduleName ?? ""} action={field.bind(null, r.id, "moduleName")} />
                </td>
                <td className="p-1.5">
                  <EditableField defaultValue={r.title} action={field.bind(null, r.id, "title")} />
                </td>
                <td className="p-1.5">
                  <EditableField defaultValue={r.description ?? ""} action={field.bind(null, r.id, "description")} />
                </td>
                <td className="p-1.5 w-24">
                  <EditableSelect
                    defaultValue={r.requiresHardware ? "true" : "false"}
                    action={field.bind(null, r.id, "requiresHardware")}
                    options={[{ value: "false", label: "Non" }, { value: "true", label: "Oui" }]}
                  />
                </td>
                <td className="p-1.5 w-32">
                  <EditableSelect
                    defaultValue={r.complexity}
                    action={field.bind(null, r.id, "complexity")}
                    options={COMPLEXITIES.map((c) => ({ value: c, label: COMPLEXITY_LABELS[c as Complexity] }))}
                  />
                </td>
                <td className="p-1.5 w-20 cell-computed rounded text-center">{r.chargeAbaque}</td>
                <td className="p-1.5 w-24">
                  <EditableField
                    type="number"
                    step="0.5"
                    defaultValue={r.chargeRetenue.toString()}
                    action={field.bind(null, r.id, "chargeRetenue")}
                  />
                </td>
                <td className="p-1.5 w-24">
                  <EditableField
                    type="number"
                    step="0.5"
                    defaultValue={r.chargeIoT.toString()}
                    action={field.bind(null, r.id, "chargeIoT")}
                  />
                </td>
                <td className="p-1.5 w-24">
                  <EditableSelect
                    defaultValue={r.moscow}
                    action={field.bind(null, r.id, "moscow")}
                    options={MOSCOW_VALUES.map((m) => ({ value: m, label: MOSCOW_LABELS[m as Moscow] }))}
                  />
                </td>
                <td className="p-1.5 w-24">
                  <EditableSelect
                    defaultValue={r.retained ? "true" : "false"}
                    action={field.bind(null, r.id, "retained")}
                    options={[{ value: "true", label: "Oui" }, { value: "false", label: "Non" }]}
                  />
                </td>
                <td className="p-1.5 w-40">
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
        <button
          type="submit"
          className="btn-gold rounded-full text-sm font-semibold px-4 py-2 transition-all"
        >
          + Ajouter une exigence
        </button>
      </form>
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
