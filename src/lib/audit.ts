import { prisma } from "@/lib/prisma";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

/** Records a project or organization-level event; project-scoped when projectId is provided. */
export async function logActivity(params: {
  organizationId: string;
  projectId?: string | null;
  userId?: string | null;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId ?? undefined,
      userId: params.userId ?? undefined,
      userName: params.userName,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? undefined,
      details: params.details ?? undefined,
    },
  });
}
