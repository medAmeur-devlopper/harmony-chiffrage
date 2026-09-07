import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, ProjectStatus, USER_ROLE_LABELS, UserRole } from "@/lib/constants";
import { StepNavigation } from "@/components/step-navigation";
import { NavSidebar } from "@/components/nav-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { Breadcrumb } from "@/components/breadcrumb";
import { ReadOnlyGuard } from "@/components/read-only-guard";
import { NotificationBell } from "@/components/notification-bell";
import { requireAuth, logout } from "@/lib/auth";
import { generateMilestoneNotifications } from "@/lib/notifications";
import { markNotificationRead, markAllNotificationsRead } from "@/app/notifications/actions";

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

  await generateMilestoneNotifications(projectId, user.id);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, projectId },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-subtle">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display italic text-xl text-brand hover:text-accent transition-colors">
              Harmony
            </Link>
            <span className="hidden md:block h-6 w-px bg-subtle" />
            <span className="hidden md:block">
              <span className="block font-display text-lg leading-tight text-primary">{project.name}</span>
              <span className="block text-xs text-muted leading-tight">{project.client}</span>
            </span>
          </div>
          <span className="flex items-center gap-3">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full border border-subtle text-primary text-xs font-medium px-3 py-1.5 hover:bg-app transition-colors"
              >
                🔐 Admin
              </Link>
            )}
            <a
              href={`/api/projects/${projectId}/export`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-accent text-accent text-xs font-medium px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
            >
              ⬇ Exporter Excel
            </a>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors.badge}`}>
              {PROJECT_STATUS_LABELS[project.status as ProjectStatus]}
            </span>
            <NotificationBell
              notifications={notifications.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                isRead: n.isRead,
                createdAt: n.createdAt.toISOString(),
              }))}
              unreadCount={unreadCount}
              markOneAction={markNotificationRead}
              markAllAction={markAllNotificationsRead}
            />
            <span className="flex items-center gap-2 border-l border-subtle pl-3">
              <span className="text-right leading-tight">
                <span className="block text-xs font-medium text-primary">{user.name}</span>
                <span className="block text-[10px] text-muted">{USER_ROLE_LABELS[user.role as UserRole]}</span>
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs text-muted hover:text-primary transition-colors"
                  title="Déconnexion"
                >
                  ⏻
                </button>
              </form>
            </span>
          </span>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-8">
        <NavSidebar projectId={projectId} userRole={user.role} />
        <main className="min-w-0 flex-1">
          <Breadcrumb projectId={projectId} projectName={project.name} />
          <ReadOnlyGuard role={user.role}>{children}</ReadOnlyGuard>
          <StepNavigation projectId={projectId} />
        </main>
      </div>
      <CommandPalette projectId={projectId} userRole={user.role} />
    </div>
  );
}

