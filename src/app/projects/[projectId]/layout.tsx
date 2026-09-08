import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectStatus, USER_ROLE_LABELS, UserRole } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { StepNavigation } from "@/components/step-navigation";
import { NavSidebar } from "@/components/nav-sidebar";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
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
        <div className="mx-auto max-w-7xl px-3 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <MobileNavDrawer projectId={projectId} userRole={user.role} />
            <Link href="/" className="font-display italic text-xl text-brand hover:text-accent transition-colors">
              Harmony
            </Link>
            <span className="hidden md:block h-6 w-px bg-subtle" />
            <span className="hidden md:block">
              <span className="block font-display text-lg leading-tight text-primary">{project.name}</span>
              <span className="block text-xs text-muted leading-tight">{project.client}</span>
            </span>
          </div>
          <span className="flex items-center gap-1.5 sm:gap-3">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full border border-subtle text-primary text-xs font-medium px-2.5 md:px-3 py-1.5 hover:bg-app transition-colors"
              >
                🔐 <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <a
              href={`/api/projects/${projectId}/export`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-accent text-accent text-xs font-medium px-2.5 md:px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
            >
              ⬇ <span className="hidden sm:inline">Exporter Excel</span>
            </a>
            <StatusBadge status={project.status as ProjectStatus} />
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
            <span className="flex items-center gap-2 border-l border-subtle pl-2 sm:pl-3">
              <span className="hidden sm:block text-right leading-tight">
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
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 md:gap-8 px-3 md:px-6 py-4 md:py-8">
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

