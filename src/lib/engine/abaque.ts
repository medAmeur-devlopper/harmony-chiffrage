import { PhaseName, PHASES } from "@/lib/constants";

export interface AbaqueActivityInput {
  id: string;
  orderNum: number;
  phase: PhaseName;
  activityName: string | null;
  profileId: string | null;
  abaquePct: number;
  gainRefPct: number;
}

export interface AbaqueActivityResult extends AbaqueActivityInput {
  chargeSansIA: number;
  gainIAPct: number;
  gainIA: number;
  chargeRetenue: number;
}

/**
 * Computes the 42-row activity abaque: each activity's charge is a percentage
 * of the Dev+TU driver charge, reduced by an AI gain that scales with the
 * project's selected AI ratio (0 for "Sans IA" up to 1.2 for "Agentic").
 */
export function computeAbaque(
  driverCharge: number,
  activities: AbaqueActivityInput[],
  iaRatioValue: number
): AbaqueActivityResult[] {
  return activities
    .slice()
    .sort((a, b) => a.orderNum - b.orderNum)
    .map((a) => {
      const chargeSansIA = driverCharge * (a.abaquePct || 0);
      const gainIAPct = (a.gainRefPct || 0) * iaRatioValue;
      const gainIA = chargeSansIA * gainIAPct;
      const chargeRetenue = chargeSansIA - gainIA;
      return { ...a, chargeSansIA, gainIAPct, gainIA, chargeRetenue };
    });
}

export interface PhaseSummary {
  phase: PhaseName;
  chargeSansIA: number;
  chargeAvecIA: number;
  gainIA: number;
  pctOfTotal: number;
}

/** Groups abaque activity rows into the 8-phase restitution table (section B of sheet 2). */
export function summarizeByPhase(activities: AbaqueActivityResult[]): PhaseSummary[] {
  const totalRetenue = activities.reduce((s, a) => s + a.chargeRetenue, 0) || 1;
  return PHASES.map((phase) => {
    const rows = activities.filter((a) => a.phase === phase);
    const chargeSansIA = rows.reduce((s, a) => s + a.chargeSansIA, 0);
    const chargeAvecIA = rows.reduce((s, a) => s + a.chargeRetenue, 0);
    return {
      phase,
      chargeSansIA,
      chargeAvecIA,
      gainIA: chargeSansIA - chargeAvecIA,
      pctOfTotal: chargeAvecIA / totalRetenue,
    };
  });
}

export function totalProjectCharge(activities: AbaqueActivityResult[]): {
  totalSansIA: number;
  totalRetenue: number;
} {
  return {
    totalSansIA: activities.reduce((s, a) => s + a.chargeSansIA, 0),
    totalRetenue: activities.reduce((s, a) => s + a.chargeRetenue, 0),
  };
}
