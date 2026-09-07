import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectFinancials } from "@/lib/getProjectFinancials";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function asciiFallback(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_");
}

type Statut = "SOUS_ALLOCATION" | "OK" | "SUR_ALLOCATION" | "CRITIQUE";

function computeStatut(budgetJH: number, planifieJH: number): Statut {
  if (budgetJH <= 0) return planifieJH > 0 ? "CRITIQUE" : "OK";
  if (planifieJH > budgetJH * 1.2) return "CRITIQUE";
  const ecart = planifieJH - budgetJH;
  if (ecart < 0) return "SOUS_ALLOCATION";
  if (ecart === 0) return "OK";
  return "SUR_ALLOCATION";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const user = session.user;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  }

  const version = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  if (!version) return NextResponse.json({ error: "Aucune version pour ce projet." }, { status: 404 });

  const [{ profiles, abaqueResults }, staffingEntries] = await Promise.all([
    getProjectFinancials(version.id),
    prisma.staffingEntry.findMany({ where: { projectVersionId: version.id } }),
  ]);

  const plannedByProfile = new Map<string, number>();
  for (const e of staffingEntries) {
    plannedByProfile.set(e.profileId, (plannedByProfile.get(e.profileId) ?? 0) + e.daysStaffed);
  }

  const header = ["profileName", "entity", "CJM", "budgetJH", "planifieJH", "ecartJH", "ecartPct", "statut"];
  const rows = profiles.map((p) => {
    const budgetJH = abaqueResults.filter((a) => a.profileId === p.id).reduce((s, a) => s + a.chargeRetenue, 0);
    const planifieJH = plannedByProfile.get(p.id) ?? 0;
    const ecartJH = planifieJH - budgetJH;
    const ecartPct = budgetJH > 0 ? (ecartJH / budgetJH) * 100 : planifieJH > 0 ? 100 : 0;
    const statut = computeStatut(budgetJH, planifieJH);
    return [
      p.name,
      p.entity,
      p.cjm.toFixed(2),
      budgetJH.toFixed(1),
      planifieJH.toFixed(1),
      ecartJH.toFixed(1),
      ecartPct.toFixed(1),
      statut,
    ];
  });

  const csvBody = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const csv = "\uFEFF" + csvBody; // BOM for Excel FR

  const projectRef = (project.reference ?? project.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `capacity-${projectRef}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
