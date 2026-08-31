// Central place for the fixed vocabularies mirrored from the Excel workbook.
// SQLite has no enum type, so these values are stored as plain strings and
// validated at the application boundary using the arrays/labels below.

export const USER_ROLES = ["ADMIN", "EDITEUR", "LECTEUR"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrateur",
  EDITEUR: "Éditeur (accès complet)",
  LECTEUR: "Lecteur (consultation)",
};

export const PROJECT_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  APPROVED: "Approuvé",
};
// Tailwind classes for status pills/accents, vivid but distinct per stage.
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, { badge: string; bar: string }> = {
  DRAFT: { badge: "bg-slate-100 text-slate-600", bar: "bg-slate-300" },
  SUBMITTED: { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  APPROVED: { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
};

export const IA_LEVELS = ["SANS", "ASSISTANT", "COPILOTE", "AGENTIC"] as const;
export type IaLevelName = (typeof IA_LEVELS)[number];
export const IA_LEVEL_LABELS: Record<IaLevelName, string> = {
  SANS: "Sans IA",
  ASSISTANT: "Assistant",
  COPILOTE: "Copilote",
  AGENTIC: "Agentic",
};
export const DEFAULT_IA_RATIOS: Record<IaLevelName, number> = {
  SANS: 0,
  ASSISTANT: 0.6,
  COPILOTE: 1,
  AGENTIC: 1.2,
};

export const COMPLEXITIES = [
  "TRES_FAIBLE",
  "FAIBLE",
  "MOYENNE",
  "ELEVEE",
  "TRES_ELEVEE",
] as const;
export type Complexity = (typeof COMPLEXITIES)[number];
export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  TRES_FAIBLE: "Très faible",
  FAIBLE: "Faible",
  MOYENNE: "Moyenne",
  ELEVEE: "Élevée",
  TRES_ELEVEE: "Très élevée",
};
export const DEFAULT_COMPLEXITY_CHARGE: Record<Complexity, number> = {
  TRES_FAIBLE: 2,
  FAIBLE: 4,
  MOYENNE: 10,
  ELEVEE: 24,
  TRES_ELEVEE: 42,
};

export const MOSCOW_VALUES = ["MUST", "SHOULD", "COULD", "WONT"] as const;
export type Moscow = (typeof MOSCOW_VALUES)[number];
export const MOSCOW_LABELS: Record<Moscow, string> = {
  MUST: "Must",
  SHOULD: "Should",
  COULD: "Could",
  WONT: "Won't",
};

export const COVERAGE_VALUES = [
  "COUVERTE",
  "PARTIELLE",
  "A_DEVELOPPER",
  "EXCLUSIVE",
] as const;
export type Coverage = (typeof COVERAGE_VALUES)[number];
export const COVERAGE_LABELS: Record<Coverage, string> = {
  COUVERTE: "🟢 Couverte",
  PARTIELLE: "🟠 Partielle",
  A_DEVELOPPER: "🔴 À développer",
  EXCLUSIVE: "🟣 Exclusive Harmony",
};

export const PHASES = [
  "CADRAGE",
  "CONCEPTION",
  "PREPARATION",
  "CONSTRUCTION",
  "RECETTE",
  "DEPLOIEMENT",
  "PILOTAGE",
  "GARANTIE",
] as const;
export type PhaseName = (typeof PHASES)[number];
export const PHASE_LABELS: Record<PhaseName, string> = {
  CADRAGE: "Cadrage",
  CONCEPTION: "Conception",
  PREPARATION: "Préparation",
  CONSTRUCTION: "Construction",
  RECETTE: "Recette",
  DEPLOIEMENT: "Déploiement",
  PILOTAGE: "Pilotage",
  GARANTIE: "Garantie",
};
// Phases that make up a lot in the macro planning cascade (excludes Pilotage/Garantie which run project-wide)
export const LOT_PHASES: PhaseName[] = [
  "CADRAGE",
  "CONCEPTION",
  "PREPARATION",
  "CONSTRUCTION",
  "RECETTE",
  "DEPLOIEMENT",
];

// Gantt bar colors per phase (Tailwind hex equivalents, used as inline styles).
export const PHASE_COLORS: Record<PhaseName, string> = {
  CADRAGE: "#7DD3FC", // sky-300
  CONCEPTION: "#A855F7", // purple-500
  PREPARATION: "#FB923C", // orange-400
  CONSTRUCTION: "#16314F", // navy medium (brand)
  RECETTE: "#22C55E", // green-500
  DEPLOIEMENT: "#EF4444", // red-500
  PILOTAGE: "#94A3B8", // slate-400
  GARANTIE: "#64748B", // slate-500
};

// Palette used to give each Lot row a distinct accent color in the Gantt.
export const LOT_COLORS = [
  "#2f6f8f",
  "#D89E15",
  "#7C3AED",
  "#DC2626",
  "#0D9488",
  "#DB2777",
  "#65A30D",
  "#4338CA",
];

export const MILESTONE_COLORS = ["#FFC933", "#22C55E", "#EF4444", "#7C3AED", "#2f6f8f", "#DB2777"];

export const RESOURCE_CATEGORIES = [
  "Moyens Humains",
  "Achat Équipements & Matériels",
  "Location Équipements & Matériels",
  "Logiciels & Licences",
  "Prestations & Sous-traitance",
  "Certification",
  "Logistique & Déplacements",
  "Autres",
] as const;


export const ENTITIES = ["Harmony", "Barid Media", "Netopia", "Autre"] as const;

export const CURRENCIES = ["MAD", "EUR", "USD", "GBP", "CNY"] as const;
export type Currency = (typeof CURRENCIES)[number];
// Indicative rates (1 unit of currency = X MAD); editable per resource line in the UI.
export const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  MAD: 1,
  EUR: 10.7,
  USD: 9.8,
  GBP: 12.5,
  CNY: 1.35,
};

export const DEFAULT_PROFILES = [
  { name: "Business Analyste", code: "BA", cjm: 1521, markupPct: 0.3, entity: "Harmony" },
  { name: "Tech Lead", code: "ET", cjm: 1749, markupPct: 0.3, entity: "Harmony" },
  { name: "UXUI Designer", code: "UXUI Designer", cjm: 2834, markupPct: 0.3, entity: "Harmony" },
  { name: "Architecte", code: "ARCHI", cjm: 2645, markupPct: 0.3, entity: "Harmony" },
  { name: "Testeur", code: "TEST", cjm: 1515, markupPct: 0.3, entity: "Harmony" },
  { name: "DEVOPS", code: "DEVOPS", cjm: 2334, markupPct: 0.3, entity: "Harmony" },
  { name: "Developpeur", code: "DEV", cjm: 2796, markupPct: 0.2, entity: "Harmony" },
  { name: "Chef de Projet", code: "CP", cjm: 2709, markupPct: 0.3, entity: "Harmony" },
  { name: "Directeur de projet", code: "DP", cjm: 1799, markupPct: 0.3, entity: "Harmony" },
  { name: "Ingénieur IoT", code: "IOT", cjm: 2500, markupPct: 0.3, entity: "Harmony" },
];

// The 42-row activity abaque, ordered as in the Excel "2-Chiffrage Projet" sheet.
// profileCode references DEFAULT_PROFILES[].code; null means "choose a profile in the UI".
export const DEFAULT_ACTIVITIES: {
  phase: PhaseName;
  activityName: string | null;
  profileCode: string | null;
  abaquePct: number;
  gainRefPct: number;
}[] = [
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.015, gainRefPct: 0.25 },
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.2 },
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.3 },
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.35 },
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.25 },
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.1 },
  { phase: "CADRAGE", activityName: null, profileCode: null, abaquePct: 0.005, gainRefPct: 0.1 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.03, gainRefPct: 0.3 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.08, gainRefPct: 0.15 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.12, gainRefPct: 0.35 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.005, gainRefPct: 0.3 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.02, gainRefPct: 0.2 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.0075, gainRefPct: 0.1 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.0075, gainRefPct: 0.25 },
  { phase: "CONCEPTION", activityName: null, profileCode: null, abaquePct: 0.04, gainRefPct: 0.4 },
  { phase: "PREPARATION", activityName: null, profileCode: null, abaquePct: 0.005, gainRefPct: 0.3 },
  { phase: "PREPARATION", activityName: null, profileCode: null, abaquePct: 0.005, gainRefPct: 0.4 },
  { phase: "PREPARATION", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.5 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.8, gainRefPct: 0.3 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.2, gainRefPct: 0.3 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.05, gainRefPct: 0.45 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.05, gainRefPct: 0.3 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.08, gainRefPct: 0.1 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.09, gainRefPct: 0.2 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.1, gainRefPct: 0.35 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.03, gainRefPct: 0.1 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.04, gainRefPct: 0.15 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.03, gainRefPct: 0.2 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.015, gainRefPct: 0.2 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0.015, gainRefPct: 0.15 },
  { phase: "CONSTRUCTION", activityName: null, profileCode: null, abaquePct: 0, gainRefPct: 0 },
  { phase: "RECETTE", activityName: null, profileCode: null, abaquePct: 0.05, gainRefPct: 0.1 },
  { phase: "RECETTE", activityName: null, profileCode: null, abaquePct: 0.12, gainRefPct: 0.25 },
  { phase: "RECETTE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.35 },
  { phase: "RECETTE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.4 },
  { phase: "RECETTE", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.3 },
  { phase: "DEPLOIEMENT", activityName: null, profileCode: null, abaquePct: 0.045, gainRefPct: 0.35 },
  { phase: "DEPLOIEMENT", activityName: null, profileCode: null, abaquePct: 0.01, gainRefPct: 0.45 },
  { phase: "PILOTAGE", activityName: "Pilotage chef de projet", profileCode: "CP", abaquePct: 0.1, gainRefPct: 0.2 },
  { phase: "PILOTAGE", activityName: "Pilotage directeur de projet", profileCode: "DP", abaquePct: 0.02, gainRefPct: 0.1 },
  { phase: "GARANTIE", activityName: "Garantie / TMA — Développement", profileCode: "DEV", abaquePct: 0.06, gainRefPct: 0.15 },
  { phase: "GARANTIE", activityName: "Garantie / TMA — Pilotage", profileCode: "CP", abaquePct: 0.02, gainRefPct: 0.1 },
];

export const DEFAULT_LOTS = ["Lot 1", "Lot 2", "Lot 3", "Lot 4"];

export const DEFAULT_LOT_PHASE_DURATIONS: Record<PhaseName, number> = {
  CADRAGE: 1,
  CONCEPTION: 2,
  PREPARATION: 1,
  CONSTRUCTION: 4,
  RECETTE: 2,
  DEPLOIEMENT: 1,
  PILOTAGE: 0,
  GARANTIE: 0,
};

// Moroccan public holidays 2025-2027 (approximate for Hijri-based dates), from the Excel "Jours fériés" sheet.
export const DEFAULT_HOLIDAYS: { date: string; country: string; description: string }[] = [
  { date: "2025-01-01", country: "Tous", description: "Jour de l'an" },
  { date: "2025-01-11", country: "Maroc", description: "Manifeste de l'indépendance" },
  { date: "2025-03-30", country: "Maroc", description: "Aïd el Fitr (approx.)" },
  { date: "2025-03-31", country: "Maroc", description: "Aïd el Fitr (approx.)" },
  { date: "2025-05-01", country: "Tous", description: "Fête du travail" },
  { date: "2025-06-07", country: "Maroc", description: "Aïd al Adha (approx.)" },
  { date: "2025-06-26", country: "Maroc", description: "1er Moharram (approx.)" },
  { date: "2025-07-30", country: "Maroc", description: "Fête du Trône" },
  { date: "2025-08-14", country: "Maroc", description: "Oued Eddahab" },
  { date: "2025-08-20", country: "Maroc", description: "Révolution du Roi et du peuple" },
  { date: "2025-08-21", country: "Maroc", description: "Fête de la Jeunesse" },
  { date: "2025-09-04", country: "Maroc", description: "Aïd al Mawlid (approx.)" },
  { date: "2025-11-06", country: "Maroc", description: "Marche Verte" },
  { date: "2025-11-18", country: "Maroc", description: "Fête de l'indépendance" },
  { date: "2026-01-01", country: "Tous", description: "Jour de l'an" },
  { date: "2026-01-11", country: "Maroc", description: "Manifeste de l'indépendance" },
  { date: "2026-03-20", country: "Maroc", description: "Aïd el Fitr (approx.)" },
  { date: "2026-03-21", country: "Maroc", description: "Aïd el Fitr (approx.)" },
  { date: "2026-05-01", country: "Tous", description: "Fête du travail" },
  { date: "2026-05-27", country: "Maroc", description: "Aïd al Adha (approx.)" },
  { date: "2026-07-30", country: "Maroc", description: "Fête du Trône" },
  { date: "2026-08-14", country: "Maroc", description: "Oued Eddahab" },
  { date: "2026-08-20", country: "Maroc", description: "Révolution du Roi et du peuple" },
  { date: "2026-08-21", country: "Maroc", description: "Fête de la Jeunesse" },
  { date: "2026-11-06", country: "Maroc", description: "Marche Verte" },
  { date: "2026-11-18", country: "Maroc", description: "Fête de l'indépendance" },
  { date: "2027-01-01", country: "Tous", description: "Jour de l'an" },
  { date: "2027-01-11", country: "Maroc", description: "Manifeste de l'indépendance" },
  { date: "2027-05-01", country: "Tous", description: "Fête du travail" },
  { date: "2027-07-30", country: "Maroc", description: "Fête du Trône" },
];
