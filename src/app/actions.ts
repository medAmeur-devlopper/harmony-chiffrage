"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import {
  DEFAULT_PROFILES,
  DEFAULT_COMPLEXITY_CHARGE,
  DEFAULT_IA_RATIOS,
  DEFAULT_ACTIVITIES,
  DEFAULT_LOTS,
  LOT_PHASES,
  DEFAULT_LOT_PHASE_DURATIONS,
  COMPLEXITIES,
  IA_LEVELS,
} from "@/lib/constants";

const DEFAULT_ORG_ID = "org-harmony";

export async function ensureDefaultOrg() {
  const org = await prisma.organization.findFirst();
  if (org) return org;
  return prisma.organization.create({ data: { id: DEFAULT_ORG_ID, name: "Harmony Technology" } });
}

export async function createProject(formData: FormData) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const name = String(formData.get("name") || "").trim();
  const client = String(formData.get("client") || "").trim();
  const reference = String(formData.get("reference") || "").trim();
  const preparedBy = String(formData.get("preparedBy") || "").trim();
  if (!name || !client) return;

  const org = await ensureDefaultOrg();

  const project = await prisma.project.create({
    data: { organizationId: org.id, name, client, reference: reference || null, preparedBy: preparedBy || null },
  });

  const version = await prisma.projectVersion.create({
    data: { projectId: project.id, versionNumber: 1, iaLevel: "SANS" },
  });

  const profiles = [];
  for (let i = 0; i < DEFAULT_PROFILES.length; i++) {
    const p = DEFAULT_PROFILES[i];
    profiles.push(await prisma.profile.create({ data: { ...p, projectVersionId: version.id, orderNum: i } }));
  }
  const profileByCode = new Map(profiles.map((p) => [p.code, p]));

  for (let i = 0; i < COMPLEXITIES.length; i++) {
    const name2 = COMPLEXITIES[i];
    await prisma.complexityLevel.create({
      data: { projectVersionId: version.id, name: name2, chargeJH: DEFAULT_COMPLEXITY_CHARGE[name2], orderNum: i },
    });
  }

  for (let i = 0; i < IA_LEVELS.length; i++) {
    const name2 = IA_LEVELS[i];
    await prisma.iaLevelOption.create({
      data: { projectVersionId: version.id, name: name2, ratio: DEFAULT_IA_RATIOS[name2], orderNum: i },
    });
  }

  for (let i = 0; i < DEFAULT_ACTIVITIES.length; i++) {
    const a = DEFAULT_ACTIVITIES[i];
    await prisma.activity.create({
      data: {
        projectVersionId: version.id,
        orderNum: i,
        phase: a.phase,
        activityName: a.activityName,
        profileId: a.profileCode ? profileByCode.get(a.profileCode)?.id ?? null : null,
        abaquePct: a.abaquePct,
        gainRefPct: a.gainRefPct,
      },
    });
  }

  for (let i = 0; i < DEFAULT_LOTS.length; i++) {
    const lot = await prisma.lot.create({ data: { projectVersionId: version.id, name: DEFAULT_LOTS[i], orderNum: i } });
    for (let j = 0; j < LOT_PHASES.length; j++) {
      const phase = LOT_PHASES[j];
      await prisma.lotPhase.create({
        data: { lotId: lot.id, phase, durationWeeks: DEFAULT_LOT_PHASE_DURATIONS[phase], orderNum: j },
      });
    }
  }

  revalidatePath("/");
  await logActivity({
    organizationId: org.id,
    projectId: project.id,
    userId: user.id,
    userName: user.name,
    action: "CREATE",
    entity: "Projet",
    entityId: project.id,
    details: `Création du projet « ${project.name} » pour ${project.client}`,
  });
  redirect(`/projects/${project.id}`);
}

export async function deleteProject(formData: FormData) {
  const user = await requireRole(["ADMIN", "EDITEUR"]);
  const id = String(formData.get("id") || "");
  if (!id) return;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return;
  await prisma.project.delete({ where: { id } });
  await logActivity({
    organizationId: project.organizationId,
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entity: "Projet",
    entityId: id,
    details: `Suppression du projet « ${project.name} »`,
  });
  revalidatePath("/");
}
