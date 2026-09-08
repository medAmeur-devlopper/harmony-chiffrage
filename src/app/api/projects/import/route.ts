import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { ensureDefaultOrg } from "@/app/actions";
import { parseHarmonyWorkbook, ExcelImportError } from "@/lib/excelImport";
import {
  DEFAULT_ACTIVITIES,
  DEFAULT_LOT_PHASE_DURATIONS,
  LOT_PHASES,
  type PhaseName,
} from "@/lib/constants";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireRole(["ADMIN", "EDITEUR"]);
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 413 });
  }
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx")) {
    return NextResponse.json({ error: "Seuls les fichiers .xlsx sont acceptés" }, { status: 415 });
  }
  if (file.type && !ACCEPTED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Type MIME non supporté : ${file.type}` }, { status: 415 });
  }

  let payload;
  try {
    const buffer = await file.arrayBuffer();
    payload = await parseHarmonyWorkbook(buffer);
  } catch (err) {
    if (err instanceof ExcelImportError) {
      return NextResponse.json(
        { error: err.message, sheet: err.sheet, row: err.row },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: `Erreur d'analyse : ${(err as Error).message}` },
      { status: 500 }
    );
  }

  const org = await ensureDefaultOrg();

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          organizationId: org.id,
          name: payload.project.name,
          client: payload.project.client,
          reference: payload.project.reference,
          preparedBy: payload.project.preparedBy,
        },
      });

      const version = await tx.projectVersion.create({
        data: {
          projectId: created.id,
          versionNumber: 1,
          iaLevel: payload.params.iaLevel,
          provisionRisqueOperationnel: payload.params.provisionRisqueOperationnel,
          provisionRisqueFinancier: payload.params.provisionRisqueFinancier,
          markupProvisions: payload.params.markupProvisions,
          garantieBonneExecution: payload.params.garantieBonneExecution,
          penaliteRetardPlafond: payload.params.penaliteRetardPlafond,
          fourchetteHaute: payload.params.fourchetteHaute,
          fourchetteBasse: payload.params.fourchetteBasse,
          tva: payload.params.tva,
          echeancierLancement: payload.params.echeancierLancement,
          echeancierRecetteFinale: payload.params.echeancierRecetteFinale,
          echeancierRetenue: payload.params.echeancierRetenue,
          projectStartDate: payload.params.projectStartDate,
        },
      });

      for (let i = 0; i < payload.complexities.length; i++) {
        const c = payload.complexities[i];
        await tx.complexityLevel.create({
          data: { projectVersionId: version.id, name: c.name, chargeJH: c.chargeJH, orderNum: i },
        });
      }

      for (let i = 0; i < payload.iaLevels.length; i++) {
        const l = payload.iaLevels[i];
        await tx.iaLevelOption.create({
          data: { projectVersionId: version.id, name: l.name, ratio: l.ratio, orderNum: i },
        });
      }

      const profileByCode = new Map<string, string>();
      for (let i = 0; i < payload.profiles.length; i++) {
        const p = payload.profiles[i];
        const prof = await tx.profile.create({
          data: {
            projectVersionId: version.id,
            name: p.name,
            code: p.code,
            cjm: p.cjm,
            markupPct: p.markupPct,
            entity: p.entity,
            orderNum: i,
          },
        });
        profileByCode.set(p.code, prof.id);
      }

      for (let i = 0; i < DEFAULT_ACTIVITIES.length; i++) {
        const a = DEFAULT_ACTIVITIES[i];
        await tx.activity.create({
          data: {
            projectVersionId: version.id,
            orderNum: i,
            phase: a.phase,
            activityName: a.activityName,
            profileId: a.profileCode ? profileByCode.get(a.profileCode) ?? null : null,
            abaquePct: a.abaquePct,
            gainRefPct: a.gainRefPct,
          },
        });
      }

      for (let i = 0; i < payload.epics.length; i++) {
        await tx.epic.create({
          data: { projectVersionId: version.id, name: payload.epics[i], orderNum: i },
        });
      }

      for (let i = 0; i < payload.requirements.length; i++) {
        const r = payload.requirements[i];
        await tx.requirement.create({
          data: {
            projectVersionId: version.id,
            refId: r.refId,
            epicName: r.epicName,
            moduleName: r.moduleName,
            title: r.title,
            description: r.description,
            requiresHardware: r.requiresHardware,
            complexity: r.complexity,
            chargeAbaque: r.chargeAbaque,
            chargeRetenue: r.chargeRetenue,
            chargeIoT: r.chargeIoT,
            moscow: r.moscow,
            retained: r.retained,
            coverage: r.coverage,
            orderNum: i,
          },
        });
      }

      for (let i = 0; i < payload.lots.length; i++) {
        const l = payload.lots[i];
        const lot = await tx.lot.create({
          data: {
            projectVersionId: version.id,
            name: l.name,
            description: l.description,
            orderNum: i,
          },
        });
        const phases: { phase: PhaseName; durationWeeks: number }[] =
          l.phases.length > 0
            ? l.phases
            : LOT_PHASES.map((p) => ({ phase: p, durationWeeks: DEFAULT_LOT_PHASE_DURATIONS[p] }));
        for (let j = 0; j < phases.length; j++) {
          await tx.lotPhase.create({
            data: {
              lotId: lot.id,
              phase: phases[j].phase,
              durationWeeks: phases[j].durationWeeks,
              orderNum: j,
            },
          });
        }
      }

      return created;
    }, { timeout: 30_000 });

    await logActivity({
      organizationId: org.id,
      projectId: project.id,
      userId: user.id,
      userName: user.name,
      action: "CREATE",
      entity: "Projet",
      entityId: project.id,
      details: `Import Excel : projet « ${project.name} » (${payload.requirements.length} exigences, ${payload.profiles.length} profils, ${payload.lots.length} lots)`,
    });

    return NextResponse.json({
      projectId: project.id,
      name: project.name,
      counts: {
        requirements: payload.requirements.length,
        epics: payload.epics.length,
        profiles: payload.profiles.length,
        lots: payload.lots.length,
      },
      warnings: payload.warnings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Erreur lors de la création : ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
