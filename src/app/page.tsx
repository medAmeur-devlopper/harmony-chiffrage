import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createProject, deleteProject } from "@/app/actions";
import { requireAuth, logout } from "@/lib/auth";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, ProjectStatus, USER_ROLE_LABELS, UserRole } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  const canEdit = user.role !== "LECTEUR";

  return (
    <div className="mx-auto max-w-6xl w-full px-6 py-10">
      <header className="brand-gradient rounded-2xl px-8 py-10 mb-8 text-white shadow-lg shadow-slate-900/10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#FFC933]">HARMONY · OUTIL DE CHIFFRAGE</p>
            <h1 className="text-3xl font-bold mt-2">📊 Mes projets</h1>
            <p className="text-slate-300 mt-2">Du référentiel d&apos;exigences au prix de vente.</p>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full border border-white/30 text-white/90 text-xs font-medium px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                🔐 Admin
              </Link>
            )}
            <span className="flex items-center gap-2 border-l border-white/20 pl-3">
              <span className="text-right leading-tight">
                <span className="block text-xs font-medium text-white">{user.name}</span>
                <span className="block text-[10px] text-white/60">{USER_ROLE_LABELS[user.role as UserRole]}</span>
              </span>
              <form action={logout}>
                <button type="submit" className="text-xs text-white/70 hover:text-white transition-colors" title="Déconnexion">
                  ⏻
                </button>
              </form>
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-3">
          {projects.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Aucun projet pour l&apos;instant. Créez-en un avec le formulaire à droite. 🚀
            </div>
          )}
          {projects.map((p) => {
            const colors = PROJECT_STATUS_COLORS[p.status as ProjectStatus];
            return (
              <div
                key={p.id}
                className={`card-hover rounded-xl border border-slate-200 border-l-4 ${colors.bar} bg-white p-4 flex items-center justify-between shadow-sm`}
              >
                <div>
                  <Link href={`/projects/${p.id}`} className="font-semibold text-slate-800 hover:text-[#16314F] transition-colors">
                    {p.name}
                  </Link>
                  <p className="text-sm text-slate-500">{p.client} · réf. {p.reference || "—"}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Version {p.versions[0]?.versionNumber ?? 1} · mis à jour le {formatDate(p.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                    {PROJECT_STATUS_LABELS[p.status as ProjectStatus]}
                  </span>
                  {canEdit && (
                    <form action={deleteProject}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs text-red-500 hover:text-red-700 font-medium" type="submit">
                        Supprimer
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {canEdit && (
          <section>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="brand-gradient px-5 py-4">
                <h2 className="font-semibold text-white">✨ Nouveau projet</h2>
              </div>
              <form action={createProject} className="space-y-3 p-5">
                <div>
                  <label className="text-xs font-medium text-slate-500">Client *</label>
                  <input name="client" required className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Nom du projet *</label>
                  <input name="name" required className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Référence offre</label>
                  <input name="reference" className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Préparé par</label>
                  <input name="preparedBy" className="cell-input w-full rounded px-3 py-2 text-sm mt-1" />
                </div>
                <button
                  type="submit"
                  className="btn-gold w-full mt-2 rounded-lg text-sm font-semibold py-2.5 transition-all"
                >
                  Créer le projet
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


