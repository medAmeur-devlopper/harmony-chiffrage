import { Complexity, DEFAULT_COMPLEXITY_CHARGE, IaLevelName, DEFAULT_IA_RATIOS } from "@/lib/constants";

export interface RequirementLike {
  complexity: Complexity;
  chargeRetenue: number;
  chargeIoT: number;
  retained: boolean;
}

/** Charge (JH) suggested by a complexity level, from the complexity scale (overridable per requirement). */
export function complexityToCharge(
  complexity: Complexity,
  scale: Record<string, number> = DEFAULT_COMPLEXITY_CHARGE
): number {
  return scale[complexity] ?? 0;
}

export function iaRatio(
  level: IaLevelName,
  ratios: Record<string, number> = DEFAULT_IA_RATIOS
): number {
  return ratios[level] ?? 0;
}

/** Sum of "charge retenue" (Dev+TU) across retained requirements. */
export function totalDevCharge(requirements: RequirementLike[]): number {
  return requirements
    .filter((r) => r.retained)
    .reduce((sum, r) => sum + (r.chargeRetenue || 0), 0);
}

/** Sum of IoT charge across retained requirements (kept separate from the Dev+TU driver). */
export function totalIotCharge(requirements: RequirementLike[]): number {
  return requirements
    .filter((r) => r.retained)
    .reduce((sum, r) => sum + (r.chargeIoT || 0), 0);
}

/**
 * The project's Dev+TU driver charge: the manual "saisie directe" override takes
 * precedence over the sum computed from the requirements referential.
 */
export function resolveDriverCharge(
  requirements: RequirementLike[],
  chargeDirecte: number | null | undefined
): number {
  if (chargeDirecte != null && chargeDirecte > 0) return chargeDirecte;
  return totalDevCharge(requirements);
}
