import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EditableField } from "@/components/editable-field";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import Link from "next/link";
import { DEFAULT_PROFILES } from "@/lib/constants";
import { createResource, updateResourceField, toggleResourceActive, deleteResource } from "./actions";

export default async function ResourcesPage() {
  const admin = await requireRole(["ADMIN"]);
  const existingCount = await prisma.resourceCatalog.count({ where: { organizationId: admin.organizationId } });
  if (existingCount === 0) {
    await prisma.resourceCatalog.createMany({
      data: DEFAULT_PROFILES.map((p, i) => ({ ...p, organizationId: admin.organizationId, orderNum: i })),
    });
  }
  const resources = await prisma.resourceCatalog.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { orderNum: "asc" },
  });

  const fieldAction = async (resourceId: string, field: string, value: string) => {
    "use server";
    await updateResourceField(resourceId, field, value);
  };
  const toggleAction = async (resourceId: string, isActive: boolean) => {
    "use server";
    await toggleResourceActive(resourceId, isActive);
  };
  const deleteAction = async (resourceId: string) => {
    "use server";
    await deleteResource(resourceId);
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-6 py-10 space-y-6">
      <header className="brand-gradient rounded-2xl px-8 py-10 text-white shadow-lg shadow-slate-900/10">
        <Link href="/admin" className="text-xs font-semibold tracking-wide text-[#FFC933] hover:underline">← Administration</Link>
        <p className="text-sm font-semibold tracking-wide text-[#FFC933] mt-2">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h1 className="text-2xl font-bold mt-2">💼 Ressources & TJM</h1>
        <p className="text-sm text-white/80 mt-1">
          Référentiel des profils et de leur TJM, utilisé pour initialiser les nouveaux projets.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-3">Nom</th>
              <th className="p-3">Code</th>
              <th className="p-3">Entité</th>
              <th className="p-3">TJM (€/j)</th>
              <th className="p-3">Markup</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className={`border-b border-slate-100 ${!r.isActive ? "opacity-50" : ""}`}>
                <td className="p-3 w-48">
                  <EditableField defaultValue={r.name} action={fieldAction.bind(null, r.id, "name")} />
                </td>
                <td className="p-3 w-32">
                  <EditableField defaultValue={r.code} action={fieldAction.bind(null, r.id, "code")} />
                </td>
                <td className="p-3 w-32">
                  <EditableField defaultValue={r.entity} action={fieldAction.bind(null, r.id, "entity")} />
                </td>
                <td className="p-3 w-32">
                  <EditableField
                    type="number"
                    step="1"
                    defaultValue={String(r.cjm)}
                    action={fieldAction.bind(null, r.id, "cjm")}
                  />
                </td>
                <td className="p-3 w-28">
                  <EditableField
                    type="number"
                    step="0.01"
                    defaultValue={String(r.markupPct)}
                    action={fieldAction.bind(null, r.id, "markupPct")}
                  />
                </td>
                <td className="p-3">
                  <form action={toggleAction.bind(null, r.id, !r.isActive)}>
                    <button
                      type="submit"
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  <form action={deleteAction.bind(null, r.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Supprimer la ressource « ${r.name} » ?`}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Supprimer
                    </ConfirmSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {resources.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-400">
                  Aucune ressource. Ajoutez-en une ci-dessous.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">Ajouter une ressource</h2>
        <form action={createResource} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nom</label>
            <input name="name" required className="cell-input rounded px-2 py-1 text-sm w-40" placeholder="Développeur" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Code</label>
            <input name="code" required className="cell-input rounded px-2 py-1 text-sm w-28" placeholder="DEV" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">TJM (€/j)</label>
            <input
              name="cjm"
              type="number"
              step="1"
              required
              className="cell-input rounded px-2 py-1 text-sm w-28"
              placeholder="2500"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-[#2f6f8f] text-white text-sm font-medium px-4 py-2 hover:bg-[#265a72] transition-colors"
          >
            Ajouter
          </button>
        </form>
      </section>
    </div>
  );
}
