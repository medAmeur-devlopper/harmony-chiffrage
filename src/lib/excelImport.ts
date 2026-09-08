import ExcelJS from "exceljs";
import {
  COMPLEXITY_LABELS,
  COMPLEXITIES,
  IA_LEVEL_LABELS,
  IA_LEVELS,
  MOSCOW_LABELS,
  MOSCOW_VALUES,
  COVERAGE_LABELS,
  COVERAGE_VALUES,
  PHASE_LABELS,
  LOT_PHASES,
  DEFAULT_LOT_PHASE_DURATIONS,
  type Complexity,
  type IaLevelName,
  type Moscow,
  type Coverage,
  type PhaseName,
} from "@/lib/constants";

export class ExcelImportError extends Error {
  readonly sheet?: string;
  readonly row?: number;
  constructor(message: string, sheet?: string, row?: number) {
    super(message);
    this.name = "ExcelImportError";
    this.sheet = sheet;
    this.row = row;
  }
}

// Reverse maps: user-visible French label -> enum key
function reverseMap<T extends string>(labels: Record<T, string>): Map<string, T> {
  const m = new Map<string, T>();
  for (const [key, label] of Object.entries(labels) as [T, string][]) {
    m.set(label.trim().toLowerCase(), key);
    // also accept the enum key itself
    m.set(key.toLowerCase(), key);
  }
  return m;
}

const COMPLEXITY_BY_LABEL = reverseMap(COMPLEXITY_LABELS);
const IA_LEVEL_BY_LABEL = reverseMap(IA_LEVEL_LABELS);
const MOSCOW_BY_LABEL = reverseMap(MOSCOW_LABELS);
const COVERAGE_BY_LABEL = reverseMap(COVERAGE_LABELS);
const PHASE_BY_LABEL = reverseMap(PHASE_LABELS);

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if ("result" in v && v.result !== undefined) return v.result;
    if ("text" in v && typeof v.text === "string") return v.text;
    if (v instanceof Date) return v;
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
  }
  return v;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toLocaleDateString("fr-FR");
  return String(v).trim();
}

function asNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: unknown): boolean {
  const s = asString(v).toLowerCase();
  return s === "oui" || s === "yes" || s === "true" || s === "1";
}

/** Parse date. Accepts Date, YYYY-MM-DD, DD/MM/YYYY. Returns null when unparseable. */
function asDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  const s = asString(v);
  const fr = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

function normalizeLabel(v: unknown): string {
  return asString(v)
    .toLowerCase()
    .replace(/[🟢🟠🔴🟣]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function requireSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const s = wb.getWorksheet(name);
  if (!s) throw new ExcelImportError(`Onglet manquant : « ${name} »`);
  return s;
}

/** Find first data row where column A equals the given label (case- and accent-insensitive lookup on the visible text). */
function findRowByLabel(sheet: ExcelJS.Worksheet, label: string): ExcelJS.Row | null {
  const target = label.toLowerCase().trim();
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const first = asString(cellValue(row.getCell(1))).toLowerCase();
    if (first === target || first.startsWith(target)) return row;
  }
  return null;
}

export type ParsedProject = {
  name: string;
  client: string;
  reference: string | null;
  preparedBy: string | null;
};

export type ParsedComplexity = { name: Complexity; chargeJH: number };
export type ParsedIaLevel = { name: IaLevelName; ratio: number };
export type ParsedProfile = {
  name: string;
  code: string;
  cjm: number;
  markupPct: number;
  entity: string;
};

export type ParsedVersionParams = {
  iaLevel: IaLevelName;
  provisionRisqueOperationnel: number;
  provisionRisqueFinancier: number;
  markupProvisions: number;
  garantieBonneExecution: number;
  penaliteRetardPlafond: number;
  fourchetteHaute: number;
  fourchetteBasse: number;
  tva: number;
  echeancierLancement: number;
  echeancierRecetteFinale: number;
  echeancierRetenue: number;
  projectStartDate: Date | null;
};

export type ParsedRequirement = {
  refId: string;
  epicName: string;
  moduleName: string | null;
  title: string;
  description: string | null;
  requiresHardware: boolean;
  complexity: Complexity;
  chargeAbaque: number;
  chargeRetenue: number;
  chargeIoT: number;
  moscow: Moscow;
  retained: boolean;
  coverage: Coverage;
};

export type ParsedLotPhase = { phase: PhaseName; durationWeeks: number };
export type ParsedLot = { name: string; description: string | null; phases: ParsedLotPhase[] };

export type ImportPayload = {
  project: ParsedProject;
  params: ParsedVersionParams;
  complexities: ParsedComplexity[];
  iaLevels: ParsedIaLevel[];
  profiles: ParsedProfile[];
  requirements: ParsedRequirement[];
  epics: string[];
  lots: ParsedLot[];
  warnings: string[];
};

// ============================== Accueil ==============================
function parseAccueil(sheet: ExcelJS.Worksheet): ParsedProject {
  const get = (label: string): string => {
    const row = findRowByLabel(sheet, label);
    return row ? asString(cellValue(row.getCell(2))) : "";
  };
  const name = get("Projet");
  const client = get("Client");
  if (!name) throw new ExcelImportError("Cellule « Projet » vide dans l'onglet Accueil", sheet.name);
  if (!client) throw new ExcelImportError("Cellule « Client » vide dans l'onglet Accueil", sheet.name);
  const reference = get("Référence offre");
  const preparedBy = get("Préparé par");
  return {
    name,
    client,
    reference: reference || null,
    preparedBy: preparedBy || null,
  };
}

// ============================== Paramètres ==============================
type ParamSections = {
  complexities: ParsedComplexity[];
  iaLevels: ParsedIaLevel[];
  profiles: ParsedProfile[];
  version: Omit<ParsedVersionParams, "iaLevel" | "projectStartDate">;
};

function parseParametres(sheet: ExcelJS.Worksheet): ParamSections {
  const complexities: ParsedComplexity[] = [];
  const iaLevels: ParsedIaLevel[] = [];
  const profiles: ParsedProfile[] = [];
  const version: ParamSections["version"] = {
    provisionRisqueOperationnel: 0.05,
    provisionRisqueFinancier: 0.05,
    markupProvisions: 0.3,
    garantieBonneExecution: 0.03,
    penaliteRetardPlafond: 0.1,
    fourchetteHaute: 0.2,
    fourchetteBasse: -0.25,
    tva: 0,
    echeancierLancement: 0.3,
    echeancierRecetteFinale: 0.6,
    echeancierRetenue: 0.1,
  };

  type Section = "COMPLEXITY" | "IA" | "PROFILES" | "PROVISIONS" | null;
  let section: Section = null;

  const versionLabelMap: Record<string, keyof typeof version> = {
    "provision risque opérationnel (% du coût)": "provisionRisqueOperationnel",
    "provision risque financier (% du coût)": "provisionRisqueFinancier",
    "markup appliqué aux provisions": "markupProvisions",
    "garantie de bonne exécution (% du prix)": "garantieBonneExecution",
    "pénalité de retard — plafond (% du prix)": "penaliteRetardPlafond",
    "fourchette haute — offre excessive": "fourchetteHaute",
    "fourchette basse — anormalement basse": "fourchetteBasse",
    "tva": "tva",
    "échéancier — lancement": "echeancierLancement",
    "échéancier — recette finale": "echeancierRecetteFinale",
    "échéancier — retenue / garantie": "echeancierRetenue",
  };

  for (let r = 5; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const a = asString(cellValue(row.getCell(1)));
    const b = cellValue(row.getCell(2));
    if (!a && !b) continue;

    const aLower = a.toLowerCase();
    if (aLower.startsWith("a. complexité")) { section = "COMPLEXITY"; continue; }
    if (aLower.startsWith("b. niveau ia")) { section = "IA"; continue; }
    if (aLower.startsWith("c. profils")) { section = "PROFILES"; continue; }
    if (aLower.startsWith("d. provisions")) { section = "PROVISIONS"; continue; }

    // Skip table headers
    if (section === "COMPLEXITY" && aLower === "complexité") continue;
    if (section === "IA" && aLower === "niveau ia") continue;
    if (section === "PROFILES" && aLower === "profil") continue;

    if (section === "COMPLEXITY") {
      const key = COMPLEXITY_BY_LABEL.get(a.toLowerCase());
      if (key) complexities.push({ name: key, chargeJH: asNumber(b) });
    } else if (section === "IA") {
      const key = IA_LEVEL_BY_LABEL.get(a.toLowerCase());
      if (key) iaLevels.push({ name: key, ratio: asNumber(b) });
    } else if (section === "PROFILES") {
      if (!a) continue;
      profiles.push({
        name: a,
        code: asString(cellValue(row.getCell(2))),
        cjm: asNumber(cellValue(row.getCell(3))),
        markupPct: asNumber(cellValue(row.getCell(4))),
        entity: asString(cellValue(row.getCell(5))) || "Harmony",
      });
    } else if (section === "PROVISIONS") {
      const key = versionLabelMap[aLower];
      if (key) version[key] = asNumber(b, version[key]);
    }
  }

  return { complexities, iaLevels, profiles, version };
}

// ============================== 1-Référentiel Exigences ==============================
function parseRequirements(sheet: ExcelJS.Worksheet): { requirements: ParsedRequirement[]; epics: string[] } {
  const headerRow = findRowByLabel(sheet, "ID");
  if (!headerRow) throw new ExcelImportError("Ligne d'entête introuvable (colonne « ID »)", sheet.name);

  // Map column headers to indexes for robustness against re-ordering
  const headerIdx: Record<string, number> = {};
  for (let c = 1; c <= sheet.columnCount; c++) {
    const label = normalizeLabel(cellValue(headerRow.getCell(c)));
    if (label) headerIdx[label] = c;
  }

  const col = (name: string) => headerIdx[name] ?? -1;
  const idCol = col("id");
  const epicCol = col("epic");
  const moduleCol = col("module");
  const titleCol = col("titre");
  const descCol = col("description");
  const hwCol = col("matériel ?") ?? col("materiel ?");
  const complexityCol = col("complexité");
  const chargeAbaqueCol = col("charge abaque (jh)");
  const chargeRetenueCol = col("charge retenue (jh)");
  const chargeIoTCol = col("charge iot (jh)");
  const moscowCol = col("moscow");
  const retenuCol = col("retenu ?");
  const coverageCol = col("couverture");

  if (idCol < 0 || titleCol < 0 || complexityCol < 0) {
    throw new ExcelImportError("Colonnes essentielles manquantes (ID / Titre / Complexité)", sheet.name);
  }

  const requirements: ParsedRequirement[] = [];
  const epicSet = new Set<string>();

  for (let r = (headerRow.number ?? 0) + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const refId = asString(cellValue(row.getCell(idCol)));
    const title = asString(cellValue(row.getCell(titleCol)));
    if (!refId && title.toUpperCase() === "TOTAL") continue;
    if (!refId) continue;

    const complexityRaw = normalizeLabel(cellValue(row.getCell(complexityCol)));
    const complexity = COMPLEXITY_BY_LABEL.get(complexityRaw) ?? "MOYENNE";
    const moscowRaw = normalizeLabel(cellValue(row.getCell(moscowCol)));
    const moscow = MOSCOW_BY_LABEL.get(moscowRaw) ?? "MUST";
    const coverageRaw = normalizeLabel(cellValue(row.getCell(coverageCol)));
    const coverage = COVERAGE_BY_LABEL.get(coverageRaw) ?? "A_DEVELOPPER";
    const epicName = asString(cellValue(row.getCell(epicCol))) || "Épic";
    epicSet.add(epicName);

    requirements.push({
      refId,
      epicName,
      moduleName: asString(cellValue(row.getCell(moduleCol))) || null,
      title,
      description: asString(cellValue(row.getCell(descCol))) || null,
      requiresHardware: asBool(cellValue(row.getCell(hwCol))),
      complexity,
      chargeAbaque: asNumber(cellValue(row.getCell(chargeAbaqueCol))),
      chargeRetenue: asNumber(cellValue(row.getCell(chargeRetenueCol))),
      chargeIoT: asNumber(cellValue(row.getCell(chargeIoTCol))),
      moscow,
      retained: retenuCol > 0 ? asBool(cellValue(row.getCell(retenuCol))) : true,
      coverage,
    });
  }

  return { requirements, epics: [...epicSet] };
}

// ============================== 3a-Macro Planning ==============================
function parseMacroPlanning(sheet: ExcelJS.Worksheet): { lots: ParsedLot[]; projectStartDate: Date | null } {
  const startRow = findRowByLabel(sheet, "Date de démarrage projet");
  const projectStartDate = startRow ? asDate(cellValue(startRow.getCell(2))) : null;

  const headerRow = findRowByLabel(sheet, "Lot");
  if (!headerRow) return { lots: [], projectStartDate };

  const lots: ParsedLot[] = [];
  let currentLot: ParsedLot | null = null;

  for (let r = (headerRow.number ?? 0) + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const lotCell = asString(cellValue(row.getCell(1)));
    const phaseLabel = asString(cellValue(row.getCell(2)));
    if (!lotCell && !phaseLabel) continue;

    if (lotCell) {
      const descRaw = asString(cellValue(row.getCell(6)));
      currentLot = {
        name: lotCell,
        description: descRaw && descRaw !== "—" ? descRaw : null,
        phases: [],
      };
      lots.push(currentLot);
    }

    if (!currentLot || !phaseLabel) continue;
    const phase = PHASE_BY_LABEL.get(phaseLabel.toLowerCase());
    if (!phase) continue;
    const duration = asNumber(cellValue(row.getCell(3)), DEFAULT_LOT_PHASE_DURATIONS[phase]);
    currentLot.phases.push({ phase, durationWeeks: Math.max(0, Math.round(duration)) });
  }

  return { lots, projectStartDate };
}

// ============================== Orchestrator ==============================
export async function parseHarmonyWorkbook(buffer: ArrayBuffer): Promise<ImportPayload> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch (err) {
    throw new ExcelImportError(`Fichier Excel invalide ou corrompu (${(err as Error).message})`);
  }

  const accueil = requireSheet(wb, "Accueil");
  const parametres = requireSheet(wb, "Paramètres");
  const requirementsSheet = requireSheet(wb, "1-Référentiel Exigences");
  const planningSheet = wb.getWorksheet("3a-Macro Planning");

  const warnings: string[] = [];

  const project = parseAccueil(accueil);
  const paramSections = parseParametres(parametres);
  const { requirements, epics } = parseRequirements(requirementsSheet);
  const { lots, projectStartDate } = planningSheet
    ? parseMacroPlanning(planningSheet)
    : { lots: [], projectStartDate: null };

  // Fill defaults if sheet omitted rows
  if (paramSections.complexities.length === 0) {
    warnings.push("Aucune ligne de complexité trouvée, valeurs par défaut appliquées.");
    for (const name of COMPLEXITIES) paramSections.complexities.push({ name, chargeJH: 0 });
  }
  if (paramSections.iaLevels.length === 0) {
    warnings.push("Aucun niveau IA trouvé, valeurs par défaut appliquées.");
    for (const name of IA_LEVELS) paramSections.iaLevels.push({ name, ratio: 0 });
  }
  if (paramSections.profiles.length === 0) {
    warnings.push("Aucun profil trouvé dans l'onglet Paramètres.");
  }
  if (lots.length === 0) {
    warnings.push("Aucun lot trouvé, un lot par défaut sera créé.");
    lots.push({
      name: "Lot 1",
      description: null,
      phases: LOT_PHASES.map((p) => ({ phase: p, durationWeeks: DEFAULT_LOT_PHASE_DURATIONS[p] })),
    });
  }

  // Ensure MoSCoW/Coverage in requirements
  for (const r of requirements) {
    if (!MOSCOW_VALUES.includes(r.moscow)) r.moscow = "MUST";
    if (!COVERAGE_VALUES.includes(r.coverage)) r.coverage = "A_DEVELOPPER";
  }

  return {
    project,
    params: {
      iaLevel: "SANS",
      projectStartDate,
      ...paramSections.version,
    },
    complexities: paramSections.complexities,
    iaLevels: paramSections.iaLevels,
    profiles: paramSections.profiles,
    requirements,
    epics,
    lots,
    warnings,
  };
}
