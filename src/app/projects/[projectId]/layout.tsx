import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, ProjectStatus, USER_ROLE_LABELS, UserRole } from "@/lib/constants";
import { StepNavigation } from "@/components/step-navigation";
import { NavTabs } from "@/components/nav-tabs";
import { ReadOnlyGuard } from "@/components/read-only-guard";
import { requireAuth, logout } from "@/lib/auth";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireAuth();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();
  const statusColors = PROJECT_STATUS_COLORS[project.status as ProjectStatus];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="brand-gradient shadow-lg shadow-slate-900/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs font-semibold tracking-wide text-[#FFC933] hover:underline">
              ← Mes projets
            </Link>
            <h1 className="text-xl font-bold text-white mt-1">
              {project.name} <span className="text-slate-300 font-normal">— {project.client}</span>
            </h1>
          </div>
          <span className="flex items-center gap-3">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full border border-white/30 text-white/90 text-xs font-medium px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                🔐 Admin
              </Link>
            )}
            <a
              href={`/api/projects/${projectId}/export`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#FFC933] text-[#FFC933] text-xs font-medium px-3 py-1.5 hover:bg-[#FFC933] hover:text-[#0B1B30] transition-colors"
            >
              ⬇ Exporter Excel
            </a>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors.badge}`}>
              {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
            </span>
            <span className="flex items-center gap-2 border-l border-white/20 pl-3">
              <span className="text-right leading-tight">
                <span className="block text-xs font-medium text-white">{user.name}</span>
                <span className="block text-[10px] text-white/60">{USER_ROLE_LABELS[user.role as UserRole]}</span>
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs text-white/70 hover:text-white transition-colors"
                  title="Déconnexion"
                >
                  ⏻
                </button>
              </form>
            </span>
          </span>
        </div>
        <NavTabs projectId={projectId} />
      </header>
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-8">
        <ReadOnlyGuard role={user.role}>{children}</ReadOnlyGuard>
        <StepNavigation projectId={projectId} />
      </main>
    </div>
  );
}

