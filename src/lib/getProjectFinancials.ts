import { prisma } from "@/lib/prisma";
import { PhaseName, IaLevelName } from "@/lib/constants";
import { resolveDriverCharge, totalDevCharge, totalIotCharge, iaRatio } from "@/lib/engine/charge";
import { computeAbaque, AbaqueActivityResult } from "@/lib/engine/abaque";
import { computeResourceLine, ResourceLineResult } from "@/lib/engine/pricing";

/**
 * Recomputes the full chain (referential → driver charge → abaque → resource
 * lines) for a project version. Shared by the Chiffrage and Synthèse pages so
 * both always reflect the same numbers.
 */
export async function getProjectFinancials(versionId: string) {
  const version = await prisma.projectVersion.findUniqueOrThrow({ where: { id: versionId } });
  const [requirements, activities, profiles, resourceLines, iaLevels] = await Promise.all([
    prisma.requirement.findMany({ where: { projectVersionId: versionId } }),
    prisma.activity.findMany({ where: { projectVersionId: versionId }, orderBy: { orderNum: "asc" } }),
    prisma.profile.findMany({ where: { projectVersionId: versionId }, orderBy: { orderNum: "asc" } }),
    prisma.resourceLine.findMany({ where: { projectVersionId: versionId }, orderBy: { orderNum: "asc" } }),
    prisma.iaLevelOption.findMany({ where: { projectVersionId: versionId } }),
  ]);

  const chargeReferentiel = totalDevCharge(requirements as never[]);
  const chargeIoT = totalIotCharge(requirements as never[]);
  const driverCharge = resolveDriverCharge(requirements as never[], version.chargeDirecte);
  const ratioMap = Object.fromEntries(iaLevels.map((l) => [l.name, l.ratio]));
  const ratio = iaRatio(version.iaLevel as IaLevelName, ratioMap);

  const abaqueResults: AbaqueActivityResult[] = computeAbaque(
    driverCharge,
    activities.map((a) => ({
      id: a.id,
      orderNum: a.orderNum,
      phase: a.phase as PhaseName,
      activityName: a.activityName,
      profileId: a.profileId,
      abaquePct: a.abaquePct,
      gainRefPct: a.gainRefPct,
    })),
    ratio
  );

  const humanLines: ResourceLineResult[] = profiles.map((p) => {
    const qty = abaqueResults.filter((a) => a.profileId === p.id).reduce((s, a) => s + a.chargeRetenue, 0);
    return computeResourceLine({
      id: `profile-${p.id}`,
      category: "Moyens Humains",
      resourceName: p.name,
      entity: p.entity,
      unit: "JH",
      unitCost: p.cjm,
      currency: "MAD",
      exchangeRate: 1,
      markupPct: p.markupPct,
      quantity: qty,
    });
  });
  const otherLines: ResourceLineResult[] = resourceLines.map((l) =>
    computeResourceLine({
      id: l.id,
      category: l.category,
      resourceName: l.resourceName,
      entity: l.entity,
      unit: l.unit,
      unitCost: l.unitCost,
      currency: l.currency,
      exchangeRate: l.exchangeRate,
      markupPct: l.markupPct,
      quantity: l.quantity,
    })
  );
  const allLines = [...humanLines, ...otherLines];

  return {
    version,
    requirements,
    activities,
    profiles,
    resourceLines,
    chargeReferentiel,
    chargeIoT,
    driverCharge,
    ratio,
    abaqueResults,
    humanLines,
    otherLines,
    allLines,
  };
}
