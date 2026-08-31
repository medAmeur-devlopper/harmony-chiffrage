import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import {
  DEFAULT_PROFILES,
  DEFAULT_COMPLEXITY_CHARGE,
  DEFAULT_IA_RATIOS,
  DEFAULT_ACTIVITIES,
  DEFAULT_LOTS,
  LOT_PHASES,
  DEFAULT_LOT_PHASE_DURATIONS,
  DEFAULT_HOLIDAYS,
  COMPLEXITIES,
  IA_LEVELS,
} from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "org-harmony" },
    update: {},
    create: { id: "org-harmony", name: "Harmony Technology" },
  });

  await prisma.user.upsert({
    where: { email: "admin@harmony.ma" },
    update: {},
    create: {
      email: "admin@harmony.ma",
      name: "Administrateur Harmony",
      passwordHash: await hashPassword("Harmony@2026"),
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  for (const h of DEFAULT_HOLIDAYS) {
    const existing = await prisma.holiday.findFirst({
      where: { organizationId: org.id, date: new Date(h.date), description: h.description },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: {
          organizationId: org.id,
          date: new Date(h.date),
          country: h.country,
          description: h.description,
        },
      });
    }
  }

  const project = await prisma.project.upsert({
    where: { id: "project-yazaki-sfg" },
    update: {},
    create: {
      id: "project-yazaki-sfg",
      organizationId: org.id,
      name: "Semi Finished Goods",
      client: "YAZAKI Kenitra",
      reference: "OFF-2026-001",
      preparedBy: "Ameur Mohammed",
      status: "DRAFT",
    },
  });

  const existingVersion = await prisma.projectVersion.findFirst({
    where: { projectId: project.id },
  });
  if (existingVersion) {
    console.log("Seed skipped: project already has a version.");
    return;
  }

  const version = await prisma.projectVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      iaLevel: "SANS",
      projectStartDate: new Date("2026-09-07"),
    },
  });

  const profiles = [];
  for (let i = 0; i < DEFAULT_PROFILES.length; i++) {
    const p = DEFAULT_PROFILES[i];
    const created = await prisma.profile.create({
      data: { ...p, projectVersionId: version.id, orderNum: i },
    });
    profiles.push(created);
  }
  const profileByCode = new Map(profiles.map((p) => [p.code, p]));

  for (let i = 0; i < COMPLEXITIES.length; i++) {
    const name = COMPLEXITIES[i];
    await prisma.complexityLevel.create({
      data: {
        projectVersionId: version.id,
        name,
        chargeJH: DEFAULT_COMPLEXITY_CHARGE[name],
        orderNum: i,
      },
    });
  }

  for (let i = 0; i < IA_LEVELS.length; i++) {
    const name = IA_LEVELS[i];
    await prisma.iaLevelOption.create({
      data: { projectVersionId: version.id, name, ratio: DEFAULT_IA_RATIOS[name], orderNum: i },
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
    const lot = await prisma.lot.create({
      data: { projectVersionId: version.id, name: DEFAULT_LOTS[i], orderNum: i },
    });
    for (let j = 0; j < LOT_PHASES.length; j++) {
      const phase = LOT_PHASES[j];
      await prisma.lotPhase.create({
        data: {
          lotId: lot.id,
          phase,
          durationWeeks: DEFAULT_LOT_PHASE_DURATIONS[phase],
          orderNum: j,
        },
      });
    }
  }

  const devProfile = profileByCode.get("DEV");
  const sampleRequirements = [
    {
      refId: "REQ-1.1.1",
      epicName: "AVV",
      moduleName: "Portail Web Voyageur",
      title: "Multilinguisme du portail voyageur",
      description:
        "Le portail voyageur doit être disponible en arabe, français et anglais (arabe par défaut, RTL complet).",
      requiresHardware: false,
      complexity: "TRES_FAIBLE",
      chargeAbaque: 2,
      chargeRetenue: 2,
      moscow: "MUST",
      retained: true,
      coverage: "A_DEVELOPPER",
    },
  ];
  for (let i = 0; i < sampleRequirements.length; i++) {
    await prisma.requirement.create({
      data: { ...sampleRequirements[i], projectVersionId: version.id, orderNum: i, chargeIoT: 0 },
    });
  }

  await prisma.epic.createMany({
    data: [
      { projectVersionId: version.id, name: "AVV", lot: "Lot 1", orderNum: 0 },
      { projectVersionId: version.id, name: "Achat et Importation", lot: "Lot 2", orderNum: 1 },
      { projectVersionId: version.id, name: "Livraison", lot: "Lot 2", orderNum: 2 },
    ],
  });

  await prisma.resourceLine.create({
    data: {
      projectVersionId: version.id,
      category: "Achat Équipements & Matériels",
      resourceName: "Achat de Matériel",
      entity: "Harmony",
      unit: "UT",
      unitCost: 0.92,
      currency: "EUR",
      exchangeRate: 10.7,
      markupPct: 0.3,
      quantity: 71698,
      orderNum: 0,
    },
  });
  await prisma.resourceLine.create({
    data: {
      projectVersionId: version.id,
      category: "Logistique & Déplacements",
      resourceName: "Livraison fournisseur",
      entity: "Harmony",
      unit: "UT",
      unitCost: 40000,
      markupPct: 0,
      quantity: 1,
      orderNum: 1,
    },
  });
  await prisma.resourceLine.create({
    data: {
      projectVersionId: version.id,
      category: "Logistique & Déplacements",
      resourceName: "Dedouanement",
      entity: "Harmony",
      unit: "UT",
      unitCost: 141675.248,
      markupPct: 0,
      quantity: 1,
      orderNum: 2,
    },
  });
  await prisma.resourceLine.create({
    data: {
      projectVersionId: version.id,
      category: "Logistique & Déplacements",
      resourceName: "Livraison au client",
      entity: "Harmony",
      unit: "UT",
      unitCost: 10000,
      markupPct: 0,
      quantity: 1,
      orderNum: 3,
    },
  });

  if (devProfile) {
    console.log("Seed complete. Dev profile id:", devProfile.id);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
