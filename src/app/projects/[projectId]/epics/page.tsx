import { getCurrentVersion } from "@/lib/getProjectVersion";
import { prisma } from "@/lib/prisma";
import { EditableField, EditableSelect } from "@/components/editable-field";
import { addEpic, updateEpic, deleteEpic } from "./actions";
import { DEFAULT_LOTS } from "@/lib/constants";
import { formatJH } from "@/lib/utils";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function EpicsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { version } = await getCurrentVersion(projectId);
  const [epics, requirements] = await Promise.all([
    prisma.epic.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.requirement.findMany({ where: { projectVersionId: version.id } }),
  ]);

  const rows = epics.map((epic) => {
    const reqs = requirements.filter((r) => r.epicName === epic.name && r.retained);
    const vert = reqs.filter((r) => r.coverage === "COUVERTE");
    const rouge = reqs.filter((r) => r.coverage === "A_DEVELOPPER");
    const violet = reqs.filter((r) => r.coverage === "EXCLUSIVE");
    const chargeRetenue = reqs.reduce((s, r) => s + r.chargeRetenue, 0);
    return {
      epic,
      exigCount: reqs.length,
      vertCount: vert.length,
      rougeCount: rouge.length,
      violetCount: violet.length,
      chargeRetenue,
      chargeVert: vert.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeRouge: rouge.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeViolet: violet.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeIoT: reqs.reduce((s, r) => s + r.chargeIoT, 0),
    };
  });

  const totalCharge = rows.reduce((s, r) => s + r.chargeRetenue, 0) || 1;
  const totalRouge = rows.reduce((s, r) => s + r.chargeRouge, 0);
  const totalVertViolet = rows.reduce((s, r) => s + r.chargeVert + r.chargeViolet, 0);
  const partielleReqs = requirements.filter((r) => r.retained && r.coverage === "PARTIELLE");
  const totalPartielle = partielleReqs.reduce((s, r) => s + r.chargeRetenue, 0);
  const totalIoT = rows.reduce((s, r) => s + r.chargeIoT, 0);

  const addAction = async () => {
    "use server";
    await addEpic(projectId, version.id);
  };
  const upd = async (id: string, f: "name" | "lot", v: string) => {
    "use server";
    await updateEpic(id, projectId, f, v);
  };
  const del = async (id: string) => {
    "use server";
    await deleteEpic(id, projectId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Synthèse par épic"
        highlight="épic"
        subtitle="Saisir les noms d'épics (identiques à la colonne Epic du référentiel) et le lot de rattachement."
      />

      <section className="rounded-2xl bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-slate-200">
              <th className="p-2">#</th>
              <th className="p-2">Épic</th>
              <th className="p-2">Lot</th>
              <th className="p-2">Exig.</th>
              <th className="p-2">🟢</th>
              <th className="p-2">🔴</th>
              <th className="p-2">🟣</th>
              <th className="p-2">Charge retenue (JH)</th>
              <th className="p-2">dont 🟢 (JH)</th>
              <th className="p-2">dont 🔴 (JH)</th>
              <th className="p-2">dont 🟣 (JH)</th>
              <th className="p-2">IoT (JH)</th>
              <th className="p-2">% driver</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.epic.id} className="border-b border-slate-100">
                <td className="p-2 text-muted">{i + 1}</td>
                <td className="p-1.5 w-40">
                  <EditableField defaultValue={row.epic.name} action={upd.bind(null, row.epic.id, "name")} />
                </td>
                <td className="p-1.5 w-28">
                  <EditableSelect
                    defaultValue={row.epic.lot ?? ""}
                    action={upd.bind(null, row.epic.id, "lot")}
                    options={[{ value: "", label: "—" }, ...DEFAULT_LOTS.map((l) => ({ value: l, label: l }))]}
                  />
                </td>
                <td className="p-2 cell-computed rounded text-center">{row.exigCount}</td>
                <td className="p-2 cell-computed rounded text-center">{row.vertCount}</td>
                <td className="p-2 cell-computed rounded text-center">{row.rougeCount}</td>
                <td className="p-2 cell-computed rounded text-center">{row.violetCount}</td>
                <td className="p-2 cell-computed rounded text-center">{formatJH(row.chargeRetenue)}</td>
                <td className="p-2 cell-computed rounded text-center">{formatJH(row.chargeVert)}</td>
                <td className="p-2 cell-computed rounded text-center">{formatJH(row.chargeRouge)}</td>
                <td className="p-2 cell-computed rounded text-center">{formatJH(row.chargeViolet)}</td>
                <td className="p-2 cell-computed rounded text-center">{formatJH(row.chargeIoT)}</td>
                <td className="p-2 cell-computed rounded text-center">
                  {((row.chargeRetenue / totalCharge) * 100).toFixed(0)}%
                </td>
                <td className="p-1.5">
                  <form action={del.bind(null, row.epic.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            <tr className="cell-total">
              <td colSpan={7} className="p-2 text-right font-semibold">
                TOTAL
              </td>
              <td className="p-2 text-center font-semibold">{formatJH(totalCharge === 1 ? 0 : totalCharge)}</td>
              <td className="p-2 text-center font-semibold">
                {formatJH(rows.reduce((s, r) => s + r.chargeVert, 0))}
              </td>
              <td className="p-2 text-center font-semibold">{formatJH(totalRouge)}</td>
              <td className="p-2 text-center font-semibold">
                {formatJH(rows.reduce((s, r) => s + r.chargeViolet, 0))}
              </td>
              <td className="p-2 text-center font-semibold">{formatJH(totalIoT)}</td>
              <td className="p-2"></td>
              <td className="p-2"></td>
            </tr>
          </tbody>
        </table>
      </section>

      <form action={addAction}>
        <Button type="submit">+ Ajouter un épic</Button>
      </form>

      <section className="rounded-2xl bg-surface p-5">
        <h3 className="font-semibold text-primary mb-4">B. Lecture</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Charge à développer (🔴)" value={formatJH(totalRouge)} />
          <Stat label="Charge sur existant produit (🟢 + 🟣)" value={formatJH(totalVertViolet)} />
          <Stat label="Charge partielle (🟠)" value={formatJH(totalPartielle)} />
          <Stat label="Charge IoT (hors driver Dev+TU)" value={formatJH(totalIoT)} />
        </div>
      </section>
    </div>
  );
}
