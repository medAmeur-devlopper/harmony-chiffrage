import { prisma } from "@/lib/prisma";
import { addHoliday, deleteHoliday } from "./actions";
import { formatDate } from "@/lib/utils";

export default async function JoursFeriesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const holidays = await prisma.holiday.findMany({
    where: { organizationId: project.organizationId },
    orderBy: { date: "asc" },
  });

  const addHolidayAction = async (formData: FormData) => {
    "use server";
    await addHoliday(project.organizationId, projectId, formData);
  };
  const delHolidayAction = async (id: string) => {
    "use server";
    await deleteHoliday(id, projectId);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Jours fériés</h2>
        <p className="text-slate-500 text-sm mt-1">
          Ces dates sont exclues (en plus des week-ends) du calcul du Macro Planning et du Capacity Plan.
        </p>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="p-2">Date</th>
              <th className="p-2">Pays</th>
              <th className="p-2">Description</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className="border-b border-slate-100">
                <td className="p-2">{formatDate(h.date)}</td>
                <td className="p-2">{h.country}</td>
                <td className="p-2">{h.description}</td>
                <td className="p-2">
                  <form action={delHolidayAction.bind(null, h.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      ✕
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-400">
                  Aucun jour férié enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <form action={addHolidayAction} className="p-4 flex flex-wrap items-end gap-3 border-t border-slate-100">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input type="date" name="date" required className="cell-input rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Pays</label>
            <input
              type="text"
              name="country"
              defaultValue="MA"
              className="cell-input rounded px-2 py-1.5 text-sm w-20"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <input
              type="text"
              name="description"
              placeholder="Fête du Travail"
              className="cell-input rounded px-2 py-1.5 text-sm w-full"
            />
          </div>
          <button
            type="submit"
            className="btn-gold rounded-full text-sm font-semibold px-4 py-2 transition-all"
          >
            + Ajouter
          </button>
        </form>
      </section>
    </div>
  );
}
