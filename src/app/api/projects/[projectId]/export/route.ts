import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getProjectFinancials } from "@/lib/getProjectFinancials";
import {
  cascadeDates,
  projectEndDate,
  totalProjectWeeks,
  workdaysInWeek,
  LotPhaseInput,
} from "@/lib/engine/planning";
import {
  buildWeekColumns,
  summarizeStaffing,
  totalStaffedPerWeek,
  ProfileStaffingRow,
} from "@/lib/engine/capacity";
import { summarizeByPhase, totalProjectCharge } from "@/lib/engine/abaque";
import {
  summarizeByCategory,
  summarizeByEntity,
  computeProvisions,
  computePriceRanges,
  computePaymentSchedule,
  computeNegotiation,
} from "@/lib/engine/pricing";
import {
  PHASE_LABELS,
  PhaseName,
  COMPLEXITY_LABELS,
  Complexity,
  MOSCOW_LABELS,
  Moscow,
  COVERAGE_LABELS,
  Coverage,
  IA_LEVEL_LABELS,
  IaLevelName,
  RESOURCE_CATEGORIES,
  ENTITIES,
} from "@/lib/constants";
import { addWeeks, startOfDay } from "date-fns";
import {
  applyTitleBar,
  applySheetTitle,
  applySubtitle,
  applySectionHeader,
  applyTableHeader,
  applyHighlightRow,
  autoWidth,
} from "@/lib/excelStyles";

/** Every sheet opens with the same 3-row banner as the original workbook. */
function addBanner(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastCol: number) {
  sheet.mergeCells(1, 1, 1, lastCol);
  sheet.getCell(1, 1).value = "HARMONY · OUTIL DE CHIFFRAGE";
  applyTitleBar(sheet.getRow(1));
  sheet.mergeCells(2, 1, 2, lastCol);
  sheet.getCell(2, 1).value = title;
  applySheetTitle(sheet.getRow(2));
  sheet.mergeCells(3, 1, 3, lastCol);
  sheet.getCell(3, 1).value = subtitle;
  applySubtitle(sheet.getRow(3));
  sheet.addRow([]);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return new Response("Project not found", { status: 404 });

  const version = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  if (!version) return new Response("Project version not found", { status: 404 });

  const [requirements, epics, complexityLevels, iaLevels, lots, holidays, staffingEntries] = await Promise.all([
    prisma.requirement.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.epic.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.complexityLevel.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.iaLevelOption.findMany({ where: { projectVersionId: version.id }, orderBy: { orderNum: "asc" } }),
    prisma.lot.findMany({
      where: { projectVersionId: version.id },
      orderBy: { orderNum: "asc" },
      include: { phases: { orderBy: { orderNum: "asc" } } },
    }),
    prisma.holiday.findMany({ where: { organizationId: project.organizationId } }),
    prisma.staffingEntry.findMany({ where: { projectVersionId: version.id } }),
  ]);

  const {
    profiles,
    resourceLines,
    chargeReferentiel,
    chargeIoT,
    driverCharge,
    ratio,
    abaqueResults,
    humanLines,
    otherLines,
  } = await getProjectFinancials(version.id);
  const allLines = [...humanLines, ...otherLines];
  const { totalSansIA, totalRetenue } = totalProjectCharge(abaqueResults);
  const phaseSummary = summarizeByPhase(abaqueResults);
  const { rows: categoryRows, total } = summarizeByCategory(allLines, RESOURCE_CATEGORIES);
  const entitySplit = summarizeByEntity(allLines, ENTITIES);
  const provisions = computeProvisions({
    sousTotalCost: total.cost,
    sousTotalPrice: total.price,
    provisionRisqueOperationnel: version.provisionRisqueOperationnel,
    provisionRisqueFinancier: version.provisionRisqueFinancier,
    tva: version.tva,
  });
  const ranges = computePriceRanges(
    provisions.prixTotalHTPrice,
    version.fourchetteHaute,
    version.fourchetteBasse,
    version.garantieBonneExecution
  );
  const schedule = computePaymentSchedule(
    provisions.prixTotalHTPrice,
    version.echeancierLancement,
    version.echeancierRecetteFinale,
    version.echeancierRetenue
  );
  const negotiation = computeNegotiation(version.prixCibleHT, provisions.prixTotalHTCost);

  const projectStart = startOfDay(version.projectStartDate ?? new Date());
  const holidayLikes = holidays.map((h) => ({ date: h.date }));
  const phasesByLot: LotPhaseInput[][] = lots.map((lot) =>
    lot.phases.map((p) => ({
      id: p.id,
      lotId: lot.id,
      lotOrderNum: lot.orderNum,
      phase: p.phase,
      durationWeeks: p.durationWeeks,
      phaseOrderNum: p.orderNum,
    }))
  );
  const cascaded = cascadeDates(projectStart, phasesByLot, holidayLikes);
  const endDate = projectEndDate(cascaded);
  const totalWeeks = Math.min(endDate ? totalProjectWeeks(projectStart, endDate) : 0, 60);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Harmony · Outil de chiffrage";
  workbook.created = new Date();

  // ============================== Accueil ==============================
  const accueilSheet = workbook.addWorksheet("Accueil");
  addBanner(accueilSheet, "Accueil & mode d'emploi", "Outil de chiffrage Harmony — du référentiel d'exigences au prix de vente.", 6);
  const coverageCounts = { COUVERTE: 0, PARTIELLE: 0, A_DEVELOPPER: 0, EXCLUSIVE: 0 };
  for (const r of requirements) coverageCounts[r.coverage as keyof typeof coverageCounts]++;
  const retenues = requirements.filter((r) => r.retained).length;

  const ficheHeaderRow = accueilSheet.addRow(["Fiche projet"]);
  applySectionHeader(ficheHeaderRow);
  accueilSheet.addRow(["Client", project.client]);
  accueilSheet.addRow(["Projet", project.name]);
  accueilSheet.addRow(["Référence offre", project.reference ?? ""]);
  accueilSheet.addRow(["Préparé par", project.preparedBy ?? ""]);
  accueilSheet.addRow(["Date du chiffrage", project.createdAt.toLocaleDateString("fr-FR")]);
  accueilSheet.addRow(["Statut", project.status]);
  accueilSheet.addRow([]);

  const totauxHeaderRow = accueilSheet.addRow(["Totaux & résultats"]);
  applySectionHeader(totauxHeaderRow);
  accueilSheet.addRow(["Exigences (total)", requirements.length]);
  accueilSheet.addRow(["Retenues", retenues]);
  accueilSheet.addRow(["Charge Dev+TU retenue (JH)", chargeReferentiel]);
  accueilSheet.addRow(["Charge IoT retenue (JH)", chargeIoT]);
  accueilSheet.addRow([
    "Couverture produit",
    `🟢 ${coverageCounts.COUVERTE}  🟠 ${coverageCounts.PARTIELLE}  🔴 ${coverageCounts.A_DEVELOPPER}  🟣 ${coverageCounts.EXCLUSIVE}`,
  ]);
  accueilSheet.getColumn(1).width = 28;
  accueilSheet.getColumn(2).width = 40;

  // ============================== Paramètres ==============================
  const paramSheet = workbook.addWorksheet("Paramètres");
  addBanner(paramSheet, "Paramètres & abaques", "Barèmes de charge, profils & CJM, niveaux IA, provisions.", 5);

  const complexityHeaderRow = paramSheet.addRow(["A. Complexité → Charge Dev+TU (JH)"]);
  applySectionHeader(complexityHeaderRow);
  const complexityColHeader = paramSheet.addRow(["Complexité", "Charge (JH)"]);
  applyTableHeader(complexityColHeader);
  for (const c of complexityLevels) {
    paramSheet.addRow([COMPLEXITY_LABELS[c.name as Complexity], c.chargeJH]);
  }
  paramSheet.addRow([]);

  const iaHeaderRow = paramSheet.addRow(["B. Niveau IA → Ratio"]);
  applySectionHeader(iaHeaderRow);
  const iaColHeader = paramSheet.addRow(["Niveau IA", "Ratio"]);
  applyTableHeader(iaColHeader);
  for (const l of iaLevels) {
    paramSheet.addRow([IA_LEVEL_LABELS[l.name as IaLevelName], l.ratio]);
  }
  paramSheet.addRow([]);

  const profilHeaderRow = paramSheet.addRow(["C. Profils · CJM · Markup"]);
  applySectionHeader(profilHeaderRow);
  const profilColHeader = paramSheet.addRow(["Profil", "Code", "CJM (DH/JH)", "Markup %", "Entité"]);
  applyTableHeader(profilColHeader);
  for (const p of profiles) {
    paramSheet.addRow([p.name, p.code, p.cjm, p.markupPct, p.entity]);
  }
  paramSheet.addRow([]);

  const provHeaderRow2 = paramSheet.addRow(["D. Provisions & conditions commerciales"]);
  applySectionHeader(provHeaderRow2);
  paramSheet.addRow(["Provision risque opérationnel (% du coût)", version.provisionRisqueOperationnel]);
  paramSheet.addRow(["Provision risque financier (% du coût)", version.provisionRisqueFinancier]);
  paramSheet.addRow(["Markup appliqué aux provisions", version.markupProvisions]);
  paramSheet.addRow(["Garantie de bonne exécution (% du prix)", version.garantieBonneExecution]);
  paramSheet.addRow(["Pénalité de retard — plafond (% du prix)", version.penaliteRetardPlafond]);
  paramSheet.addRow(["Fourchette haute — offre excessive", version.fourchetteHaute]);
  paramSheet.addRow(["Fourchette basse — anormalement basse", version.fourchetteBasse]);
  paramSheet.addRow(["TVA", version.tva]);
  paramSheet.addRow(["Échéancier — Lancement", version.echeancierLancement]);
  paramSheet.addRow(["Échéancier — Recette finale", version.echeancierRecetteFinale]);
  paramSheet.addRow(["Échéancier — Retenue / garantie", version.echeancierRetenue]);
  paramSheet.getColumn(1).width = 40;
  paramSheet.getColumn(2).width = 16;
  paramSheet.getColumn(3).width = 14;
  paramSheet.getColumn(4).width = 12;
  paramSheet.getColumn(5).width = 12;

  // ======================= 1-Référentiel Exigences =======================
  const reqSheet = workbook.addWorksheet("1-Référentiel Exigences");
  addBanner(reqSheet, "1 · Référentiel des exigences", "Cataloguez les exigences ; la charge se déduit de la complexité (modifiable).", 13);
  reqSheet.addRow([
    "Exigences (total)", requirements.length, "Retenues", retenues,
    "Charge Dev+TU retenue", chargeReferentiel, "Charge IoT retenue", chargeIoT,
  ]);
  reqSheet.addRow([]);
  const reqColHeader = reqSheet.addRow([
    "ID", "Epic", "Module", "Titre", "Description", "Matériel ?", "Complexité",
    "Charge abaque (JH)", "Charge retenue (JH)", "Charge IoT (JH)", "MoSCoW", "Retenu ?", "Couverture",
  ]);
  applyTableHeader(reqColHeader);
  for (const r of requirements) {
    reqSheet.addRow([
      r.refId, r.epicName, r.moduleName ?? "", r.title, r.description ?? "",
      r.requiresHardware ? "Oui" : "Non", COMPLEXITY_LABELS[r.complexity as Complexity],
      r.chargeAbaque, r.chargeRetenue, r.chargeIoT, MOSCOW_LABELS[r.moscow as Moscow],
      r.retained ? "Oui" : "Non", COVERAGE_LABELS[r.coverage as Coverage],
    ]);
  }
  const reqTotalRow = reqSheet.addRow([
    "", "", "", "TOTAL", "", "", "",
    requirements.reduce((s, r) => s + r.chargeAbaque, 0),
    requirements.filter((r) => r.retained).reduce((s, r) => s + r.chargeRetenue, 0),
    requirements.filter((r) => r.retained).reduce((s, r) => s + r.chargeIoT, 0),
    "", "", "",
  ]);
  applyHighlightRow(reqTotalRow);

  // ========================= 1b-Synthèse Épics ==========================
  const epicSheet = workbook.addWorksheet("1b-Synthèse Épics");
  addBanner(epicSheet, "1b · Synthèse par épic — couverture produit & charge", "Vue par épic : couverture, charge retenue et part de la charge globale.", 12);
  const epicColHeader = epicSheet.addRow([
    "#", "Épic", "Lot(s)", "Exig.", "🟢", "🔴", "🟣",
    "Charge retenue (JH)", "dont 🟢 (JH)", "dont 🔴 (JH)", "dont 🟣 (JH)", "IoT (JH)", "% driver",
  ]);
  applyTableHeader(epicColHeader);
  const epicRows = epics.map((epic) => {
    const reqs = requirements.filter((r) => r.epicName === epic.name && r.retained);
    const vert = reqs.filter((r) => r.coverage === "COUVERTE");
    const rouge = reqs.filter((r) => r.coverage === "A_DEVELOPPER");
    const violet = reqs.filter((r) => r.coverage === "EXCLUSIVE");
    return {
      epic,
      exigCount: reqs.length,
      vertCount: vert.length,
      rougeCount: rouge.length,
      violetCount: violet.length,
      chargeRetenue: reqs.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeVert: vert.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeRouge: rouge.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeViolet: violet.reduce((s, r) => s + r.chargeRetenue, 0),
      chargeIoT: reqs.reduce((s, r) => s + r.chargeIoT, 0),
    };
  });
  const totalEpicCharge = epicRows.reduce((s, r) => s + r.chargeRetenue, 0) || 1;
  epicRows.forEach((row, i) => {
    epicSheet.addRow([
      i + 1, row.epic.name, row.epic.lot ?? "", row.exigCount, row.vertCount, row.rougeCount, row.violetCount,
      row.chargeRetenue, row.chargeVert, row.chargeRouge, row.chargeViolet, row.chargeIoT,
      row.chargeRetenue / totalEpicCharge,
    ]);
  });
  const epicTotalRow = epicSheet.addRow([
    "", "TOTAL", "",
    epicRows.reduce((s, r) => s + r.exigCount, 0),
    epicRows.reduce((s, r) => s + r.vertCount, 0),
    epicRows.reduce((s, r) => s + r.rougeCount, 0),
    epicRows.reduce((s, r) => s + r.violetCount, 0),
    epicRows.reduce((s, r) => s + r.chargeRetenue, 0),
    epicRows.reduce((s, r) => s + r.chargeVert, 0),
    epicRows.reduce((s, r) => s + r.chargeRouge, 0),
    epicRows.reduce((s, r) => s + r.chargeViolet, 0),
    epicRows.reduce((s, r) => s + r.chargeIoT, 0),
    "",
  ]);
  applyHighlightRow(epicTotalRow);

  // ========================= 2-Chiffrage Projet ==========================
  const chiffrageSheet = workbook.addWorksheet("2-Chiffrage Projet");
  addBanner(chiffrageSheet, "2 · Chiffrage projet", "Charge Dev+TU du référentiel → abaque activités → coûts, prix et marge. Gain IA optionnel.", 13);
  chiffrageSheet.addRow(["Charge Dev+TU du référentiel (JH)", chargeReferentiel]);
  chiffrageSheet.addRow(["Saisie directe — chiffrage rapide (JH, optionnel)", version.chargeDirecte ?? ""]);
  chiffrageSheet.addRow(["CHARGE DEV+TU RETENUE (driver)", driverCharge]);
  chiffrageSheet.addRow(["CHARGE IOT (driver)", chargeIoT]);
  chiffrageSheet.addRow(["Niveau IA du projet", IA_LEVEL_LABELS[version.iaLevel as IaLevelName]]);
  chiffrageSheet.addRow(["Ratio IA appliqué", ratio]);
  chiffrageSheet.addRow(["Charge globale projet — hors IA (JH)", totalSansIA + chargeIoT]);
  chiffrageSheet.addRow(["Charge globale projet — avec IA (JH)", totalRetenue + chargeIoT]);
  chiffrageSheet.addRow([]);

  const abaqueHeaderRow = chiffrageSheet.addRow(["A. Activités (abaque automatique)"]);
  applySectionHeader(abaqueHeaderRow);
  const abaqueColHeader = chiffrageSheet.addRow([
    "#", "Phase", "Activité", "Profil", "% abaque", "Charge sans IA (JH)",
    "% gain réf.", "Gain IA %", "Charge retenue (JH)",
  ]);
  applyTableHeader(abaqueColHeader);
  const profileNameById = new Map(profiles.map((p) => [p.id, p.name]));
  abaqueResults.forEach((a, i) => {
    chiffrageSheet.addRow([
      i + 1, PHASE_LABELS[a.phase as PhaseName], a.activityName ?? "",
      a.profileId ? profileNameById.get(a.profileId) ?? "" : "",
      a.abaquePct, a.chargeSansIA, a.gainRefPct, a.gainIAPct, a.chargeRetenue,
    ]);
  });
  const abaqueTotalRow = chiffrageSheet.addRow([
    "", "", "", "", "TOTAL CHARGE PROJET", totalSansIA, "", "", totalRetenue,
  ]);
  applyHighlightRow(abaqueTotalRow);
  chiffrageSheet.addRow([]);

  const phaseHeaderRow = chiffrageSheet.addRow(["B. Restitution par phase"]);
  applySectionHeader(phaseHeaderRow);
  const phaseColHeader = chiffrageSheet.addRow(["Phase", "Charge sans IA (JH)", "Charge avec IA (JH)", "Gain IA (JH)", "% du total"]);
  applyTableHeader(phaseColHeader);
  for (const p of phaseSummary) {
    chiffrageSheet.addRow([PHASE_LABELS[p.phase as PhaseName], p.chargeSansIA, p.chargeAvecIA, p.gainIA, p.pctOfTotal]);
  }
  chiffrageSheet.addRow([]);

  const resHeaderRow = chiffrageSheet.addRow(["C. Ressources & moyens — coûts, prix, marge"]);
  applySectionHeader(resHeaderRow);
  const resColHeader = chiffrageSheet.addRow([
    "Catégorie", "Ressource", "Entité", "Unité", "Devise", "Taux → MAD",
    "Coût unit. (devise)", "Coût unit. (MAD)", "Markup %", "Qté", "Coût total", "Prix total", "Marge %",
  ]);
  applyTableHeader(resColHeader);
  for (const l of allLines) {
    chiffrageSheet.addRow([
      l.category, l.resourceName, l.entity, l.unit, l.currency, l.exchangeRate,
      l.unitCost, l.unitCostMAD, l.markupPct ?? 0, l.quantity, l.totalCost, l.totalPrice, l.marginPct ?? 0,
    ]);
  }
  const resTotalRow = chiffrageSheet.addRow([
    "TOTAL COÛTS & PRIX", "", "", "", "", "", "", "", "", "", total.cost, total.price, total.margin ?? 0,
  ]);
  applyHighlightRow(resTotalRow);
  chiffrageSheet.getColumn(1).width = 22;
  chiffrageSheet.getColumn(2).width = 24;
  chiffrageSheet.getColumn(3).width = 16;

  // ========================= 3a-Macro Planning ==========================
  const planningSheet = workbook.addWorksheet("3a-Macro Planning");
  addBanner(planningSheet, "3a · Macro planning — dates par lot & phase", "Durées (semaines) : les dates s'enchaînent en cascade, jours fériés déduits.", 6);
  planningSheet.addRow(["Date de démarrage projet", projectStart.toLocaleDateString("fr-FR")]);
  planningSheet.addRow(["Fin de projet (calculée)", endDate ? endDate.toLocaleDateString("fr-FR") : "", `${totalWeeks} sem.`]);
  planningSheet.addRow([]);
  const planColHeader = planningSheet.addRow(["Lot", "Phase", "Durée (sem.)", "Début", "Fin", "Lot — description"]);
  applyTableHeader(planColHeader);
  for (const lot of lots) {
    lot.phases.forEach((phase, idx) => {
      const c = cascaded.find((x) => x.id === phase.id);
      planningSheet.addRow([
        idx === 0 ? lot.name : "",
        PHASE_LABELS[phase.phase as PhaseName],
        phase.durationWeeks,
        c ? c.startDate.toLocaleDateString("fr-FR") : "",
        c ? c.endDate.toLocaleDateString("fr-FR") : "",
        idx === 0 ? lot.description ?? "—" : "",
      ]);
    });
  }
  planningSheet.getColumn(6).width = 30;

  // ========================= 3-Capacity Plan ==========================
  const capacitySheet = workbook.addWorksheet("3-Capacity Plan");
  addBanner(capacitySheet, "3 · Capacity plan", "Charge à staffer par profil vs capacité hebdomadaire (5 j − jours fériés).", 4 + totalWeeks);
  capacitySheet.addRow(["Date de début (lundi)", projectStart.toLocaleDateString("fr-FR")]);

  const weekStarts: Date[] = [];
  for (let i = 0; i < totalWeeks; i++) weekStarts.push(addWeeks(projectStart, i));
  const availableDaysPerWeek = weekStarts.map((w) => workdaysInWeek(w, holidayLikes));

  const capHeaderRow = capacitySheet.addRow([
    "Profil", "Charge à staffer", "Planifié", "Écart",
    ...weekStarts.map((w) => w.toLocaleDateString("fr-FR")),
  ]);
  applyTableHeader(capHeaderRow);
  capacitySheet.addRow(["Jours ouvrés dispo / sem.", "", "", "", ...availableDaysPerWeek]);

  const lotPhasesWithDates = cascaded.map((c) => {
    const lot = lots.find((l) => l.id === c.lotId)!;
    return {
      lotName: lot.name,
      phase: c.phase,
      phaseLabel: PHASE_LABELS[c.phase as PhaseName],
      startDate: c.startDate,
      endDate: c.endDate,
    };
  });
  for (const lot of lots) {
    const cols = buildWeekColumns(projectStart, totalWeeks, holidayLikes, lotPhasesWithDates, lot.name);
    capacitySheet.addRow([lot.name, "", "", "", ...cols.map((c) => c.lotPhaseLabel ?? "")]);
  }

  const entriesByProfile = new Map<string, Map<string, number>>();
  for (const e of staffingEntries) {
    if (!entriesByProfile.has(e.profileId)) entriesByProfile.set(e.profileId, new Map());
    entriesByProfile.get(e.profileId)!.set(startOfDay(e.weekStart).toISOString(), e.daysStaffed);
  }
  const staffingRows: ProfileStaffingRow[] = profiles.map((p) => {
    const chargeAStaffer = abaqueResults.filter((a) => a.profileId === p.id).reduce((s, a) => s + a.chargeRetenue, 0);
    const cells = weekStarts.map((w, weekIndex) => ({
      weekIndex,
      daysStaffed: entriesByProfile.get(p.id)?.get(w.toISOString()) ?? 0,
    }));
    return { profileId: p.id, profileName: p.name, chargeAStaffer, cells };
  });
  const summarized = summarizeStaffing(staffingRows);
  for (const row of summarized) {
    capacitySheet.addRow([
      row.profileName, row.chargeAStaffer, row.planifie, row.ecart,
      ...row.cells.map((c) => c.daysStaffed),
    ]);
  }
  const weekColumnsFlat = weekStarts.map((w, i) => ({ weekStart: w, availableDays: availableDaysPerWeek[i] }));
  const totalsPerWeek = totalStaffedPerWeek(staffingRows, weekColumnsFlat as never);
  const capTotalRow = capacitySheet.addRow(["Total staffé / sem.", "", "", "", ...totalsPerWeek.map((t) => t.total)]);
  applyHighlightRow(capTotalRow);
  capacitySheet.getColumn(1).width = 22;

  // ========================= 4-Synthèse & Prix ==========================
  const syntheseSheet = workbook.addWorksheet("4-Synthèse & Prix");
  addBanner(syntheseSheet, "4 · Synthèse & prix", "Coûts, prix et marge par catégorie et entité ; provisions, garanties, échéancier, fourchettes.", 8);

  const catHeaderTitle = syntheseSheet.addRow(["A. Prix par catégorie de ressources"]);
  applySectionHeader(catHeaderTitle);
  const catColHeader = syntheseSheet.addRow(["Catégorie", "Coût total", "Prix total", "Profit", "Markup", "Marge"]);
  applyTableHeader(catColHeader);
  for (const r of categoryRows) {
    syntheseSheet.addRow([r.category, r.cost, r.price, r.profit, r.markup ?? 0, r.margin ?? 0]);
  }
  const catTotalRow = syntheseSheet.addRow(["TOTAL", total.cost, total.price, total.profit, total.markup ?? 0, total.margin ?? 0]);
  applyHighlightRow(catTotalRow);
  syntheseSheet.addRow([]);

  const entHeaderTitle = syntheseSheet.addRow(["C. Split par entité"]);
  applySectionHeader(entHeaderTitle);
  const entColHeader = syntheseSheet.addRow(["Entité", "Coût", "Prix", "Marge"]);
  applyTableHeader(entColHeader);
  for (const e of entitySplit) {
    syntheseSheet.addRow([e.entity, e.cost, e.price, e.margin ?? 0]);
  }
  syntheseSheet.addRow([]);

  const provHeaderTitle = syntheseSheet.addRow(["B. Provisions & prix de vente"]);
  applySectionHeader(provHeaderTitle);
  const provColHeader = syntheseSheet.addRow(["Élément", "Base / %", "Coût", "Prix"]);
  applyTableHeader(provColHeader);
  syntheseSheet.addRow(["Sous-total (coûts / prix)", "", provisions.sousTotalCost, provisions.sousTotalPrice]);
  syntheseSheet.addRow([
    "Provision risque opérationnel", version.provisionRisqueOperationnel,
    provisions.provisionOperationnelleCost, provisions.provisionOperationnellePrice,
  ]);
  syntheseSheet.addRow([
    "Provision risque financier", version.provisionRisqueFinancier,
    provisions.provisionFinanciereCost, provisions.provisionFinancierePrice,
  ]);
  const prixHTRow = syntheseSheet.addRow([
    "PRIX TOTAL HT (avec provisions)", "", provisions.prixTotalHTCost, provisions.prixTotalHTPrice,
  ]);
  applyHighlightRow(prixHTRow);
  syntheseSheet.addRow(["TVA", version.tva, "", provisions.tvaAmount]);
  const ttcRow = syntheseSheet.addRow(["PRIX TTC", "", "", provisions.prixTTC]);
  applyHighlightRow(ttcRow);
  syntheseSheet.addRow([]);

  const fourchetteHeaderTitle = syntheseSheet.addRow(["Fourchette d'offre"]);
  applySectionHeader(fourchetteHeaderTitle);
  syntheseSheet.addRow(["Repère", "%", "Prix HT"]);
  syntheseSheet.addRow(["Prix estimé (référence)", "", ranges.prixEstime]);
  syntheseSheet.addRow(["Fourchette haute", version.fourchetteHaute, ranges.fourchetteHauteMontant]);
  syntheseSheet.addRow(["Fourchette basse", version.fourchetteBasse, ranges.fourchetteBasseMontant]);
  syntheseSheet.addRow(["Garantie bonne exécution", version.garantieBonneExecution, ranges.garantieMontant]);
  syntheseSheet.addRow([]);

  const echeancierHeaderTitle = syntheseSheet.addRow(["Échéancier de paiement (HT)"]);
  applySectionHeader(echeancierHeaderTitle);
  syntheseSheet.addRow(["Phase", "%", "Montant"]);
  syntheseSheet.addRow(["Lancement", version.echeancierLancement, schedule.lancement]);
  syntheseSheet.addRow(["Recette finale", version.echeancierRecetteFinale, schedule.recetteFinale]);
  syntheseSheet.addRow(["Retenue / garantie", version.echeancierRetenue, schedule.retenue]);

  if (negotiation) {
    syntheseSheet.addRow([]);
    const negoHeaderTitle = syntheseSheet.addRow(["D. Négociation — prix cible"]);
    applySectionHeader(negoHeaderTitle);
    syntheseSheet.addRow(["Prix cible HT (négocié)", negotiation.prixCibleHT]);
    syntheseSheet.addRow(["Coût total de référence (avec provisions)", provisions.prixTotalHTCost]);
    syntheseSheet.addRow(["Marge résultante au prix cible", negotiation.margeResultante ?? 0]);
    syntheseSheet.addRow(["Écart vs prix calculé", negotiation.ecartVsPrixCalcule]);
  }
  syntheseSheet.getColumn(1).width = 34;

  // ============================== Jours fériés ==============================
  const holidaySheet = workbook.addWorksheet("Jours fériés");
  addBanner(holidaySheet, "Jours fériés (Maroc)", "Utilisé par le capacity plan.", 4);
  const holColHeader = holidaySheet.addRow(["Date", "Pays", "Description"]);
  applyTableHeader(holColHeader);
  for (const h of holidays.sort((a, b) => a.date.getTime() - b.date.getTime())) {
    holidaySheet.addRow([h.date.toLocaleDateString("fr-FR"), h.country, h.description]);
  }
  holidaySheet.getColumn(3).width = 34;

  for (const sheet of [accueilSheet, reqSheet, epicSheet, planningSheet, syntheseSheet, holidaySheet]) {
    autoWidth(sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${project.name.replace(/[^a-z0-9]+/gi, "_")}_chiffrage_v${version.versionNumber}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

