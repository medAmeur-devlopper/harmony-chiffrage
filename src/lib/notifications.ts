import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

/** Creates unread notifications for milestones due within 7 days or already overdue (deduped by title+type). */
export async function generateMilestoneNotifications(projectId: string, userId: string) {
  const version = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  if (!version) return;

  const today = new Date();
  const in7Days = addDays(today, 7);
  const milestones = await prisma.milestone.findMany({
    where: { projectVersionId: version.id, completed: false },
  });

  for (const m of milestones) {
    const isOverdue = m.date < today;
    const isDueSoon = !isOverdue && m.date <= in7Days;
    if (!isOverdue && !isDueSoon) continue;

    const type = isOverdue ? "MILESTONE_OVERDUE" : "MILESTONE_DUE";
    const existing = await prisma.notification.findFirst({
      where: { userId, projectId, type, title: m.name, isRead: false },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId,
        projectId,
        type,
        title: m.name,
        message: isOverdue
          ? `Le jalon « ${m.name} » est en retard (prévu le ${m.date.toLocaleDateString("fr-FR")})`
          : `Le jalon « ${m.name} » arrive le ${m.date.toLocaleDateString("fr-FR")}`,
      },
    });
  }
}
