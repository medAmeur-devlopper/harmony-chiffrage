import { prisma } from "@/lib/prisma";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";

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
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#16314F]">HARMONY · OUTIL DE CHIFFRAGE</p>
        <h2 className="text-xl font-bold text-slate-800 mt-1">Journal d&apos;activité</h2>
        <p className="text-slate-500 text-sm mt-1">Historique des 50 dernières actions sur ce projet.</p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Aucune activité enregistrée pour le moment.</p>
        ) : (
          <ol className="space-y-4">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm shrink-0">
                  {ENTITY_ICONS[log.entity] ?? "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <strong className="font-semibold">{log.userName}</strong>{" "}
                    {AUDIT_ACTION_LABELS[log.action] ?? log.action.toLowerCase()}{" "}
                    <span className="text-slate-500">{log.entity.toLowerCase()}</span>
                  </p>
                  {log.details && <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>}
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{timeAgo(log.createdAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
