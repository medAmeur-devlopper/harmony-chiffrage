import { prisma } from "@/lib/prisma";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR");
}

const ENTITY_ICONS: Record<string, string> = {
  Projet: "📁",
  Exigence: "📋",
  Jalon: "🚩",
  "Lien de partage": "🔗",
  Utilisateur: "👤",
};

export default async function ActivitePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const logs = await prisma.auditLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HARMONY · OUTIL DE CHIFFRAGE"
        title="Journal d'activité"
        highlight="activité"
        subtitle="Historique des 50 dernières actions sur ce projet."
      />

      <div className="space-y-3">
        {logs.length === 0 ? (
          <Card tone="surface">
            <p className="text-sm text-muted text-center py-8">Aucune activité enregistrée pour le moment.</p>
          </Card>
        ) : (
          logs.map((log, i) => (
            <Card key={log.id} tone={i % 2 === 0 ? "cream-warm" : "surface"} className="flex items-start gap-3 p-4">
              <span className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-sm shrink-0">
                {ENTITY_ICONS[log.entity] ?? "📝"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">
                  <strong className="font-semibold">{log.userName}</strong>{" "}
                  {AUDIT_ACTION_LABELS[log.action] ?? log.action.toLowerCase()}{" "}
                  <span className="text-ink/60">{log.entity.toLowerCase()}</span>
                </p>
                {log.details && <p className="text-xs text-ink/60 mt-0.5">{log.details}</p>}
              </div>
              <span className="text-[11px] text-ink/50 whitespace-nowrap shrink-0">{timeAgo(log.createdAt)}</span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
