export interface ResourceLineInput {
  id: string;
  category: string;
  resourceName: string;
  entity: string;
  unit: string;
  unitCost: number;
  currency: string;
  exchangeRate: number;
  markupPct: number | null;
  quantity: number;
}

export interface ResourceLineResult extends ResourceLineInput {
  unitCostMAD: number;
  totalCost: number;
  totalPrice: number;
  marginPct: number | null;
}

/** unitCostMAD = unitCost converted to MAD ; cost = unitCostMAD * quantity ; price = cost * (1 + markup) */
export function computeResourceLine(line: ResourceLineInput): ResourceLineResult {
  const unitCostMAD = line.unitCost * (line.exchangeRate || 1);
  const totalCost = unitCostMAD * line.quantity;
  const markup = line.markupPct ?? 0;
  const totalPrice = totalCost * (1 + markup);
  const marginPct = totalPrice > 0 ? (totalPrice - totalCost) / totalPrice : null;
  return { ...line, unitCostMAD, totalCost, totalPrice, marginPct };
}

export function computeResourceLines(lines: ResourceLineInput[]): ResourceLineResult[] {
  return lines.map(computeResourceLine);
}

export interface CategorySummary {
  category: string;
  cost: number;
  price: number;
  profit: number;
  markup: number | null;
  margin: number | null;
}

/** Section A of sheet 4: rolls resource lines up by category. */
export function summarizeByCategory(
  lines: ResourceLineResult[],
  categories: readonly string[]
): { rows: CategorySummary[]; total: CategorySummary } {
  const rows = categories.map((category) => {
    const rowsForCat = lines.filter((l) => l.category === category);
    const cost = rowsForCat.reduce((s, l) => s + l.totalCost, 0);
    const price = rowsForCat.reduce((s, l) => s + l.totalPrice, 0);
    const profit = price - cost;
    return {
      category,
      cost,
      price,
      profit,
      markup: cost > 0 ? profit / cost : null,
      margin: price > 0 ? profit / price : null,
    };
  });
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const price = rows.reduce((s, r) => s + r.price, 0);
  const profit = price - cost;
  return {
    rows,
    total: {
      category: "TOTAL",
      cost,
      price,
      profit,
      markup: cost > 0 ? profit / cost : null,
      margin: price > 0 ? profit / price : null,
    },
  };
}

/** Section C of sheet 4: rolls resource lines up by entity (subcontracting split). */
export function summarizeByEntity(
  lines: ResourceLineResult[],
  entities: readonly string[]
): { entity: string; cost: number; price: number; margin: number | null }[] {
  return entities.map((entity) => {
    const rowsForEntity = lines.filter((l) => l.entity === entity);
    const cost = rowsForEntity.reduce((s, l) => s + l.totalCost, 0);
    const price = rowsForEntity.reduce((s, l) => s + l.totalPrice, 0);
    return { entity, cost, price, margin: price > 0 ? (price - cost) / price : null };
  });
}

export interface ProvisionsInput {
  sousTotalCost: number;
  sousTotalPrice: number;
  provisionRisqueOperationnel: number;
  provisionRisqueFinancier: number;
  tva: number;
}

export interface ProvisionsResult {
  sousTotalCost: number;
  sousTotalPrice: number;
  provisionOperationnelleCost: number;
  provisionOperationnellePrice: number;
  provisionFinanciereCost: number;
  provisionFinancierePrice: number;
  prixTotalHTCost: number;
  prixTotalHTPrice: number;
  tvaAmount: number;
  prixTTC: number;
}

/** Section B of sheet 4: applies risk provisions (computed on the sub-total) then VAT. */
export function computeProvisions(input: ProvisionsInput): ProvisionsResult {
  const provisionOperationnelleCost = input.sousTotalCost * input.provisionRisqueOperationnel;
  const provisionOperationnellePrice = input.sousTotalPrice * input.provisionRisqueOperationnel;
  const provisionFinanciereCost = input.sousTotalCost * input.provisionRisqueFinancier;
  const provisionFinancierePrice = input.sousTotalPrice * input.provisionRisqueFinancier;

  const prixTotalHTCost = input.sousTotalCost + provisionOperationnelleCost + provisionFinanciereCost;
  const prixTotalHTPrice = input.sousTotalPrice + provisionOperationnellePrice + provisionFinancierePrice;

  const tvaAmount = prixTotalHTPrice * input.tva;
  const prixTTC = prixTotalHTPrice + tvaAmount;

  return {
    sousTotalCost: input.sousTotalCost,
    sousTotalPrice: input.sousTotalPrice,
    provisionOperationnelleCost,
    provisionOperationnellePrice,
    provisionFinanciereCost,
    provisionFinancierePrice,
    prixTotalHTCost,
    prixTotalHTPrice,
    tvaAmount,
    prixTTC,
  };
}

export function computePriceRanges(
  prixHT: number,
  fourchetteHaute: number,
  fourchetteBasse: number,
  garantieBonneExecution: number
) {
  return {
    prixEstime: prixHT,
    fourchetteHauteMontant: prixHT * (1 + fourchetteHaute),
    fourchetteBasseMontant: prixHT * (1 + fourchetteBasse),
    garantieMontant: prixHT * garantieBonneExecution,
  };
}

export function computePaymentSchedule(
  prixHT: number,
  lancementPct: number,
  recetteFinalePct: number,
  retenuePct: number
) {
  return {
    lancement: prixHT * lancementPct,
    recetteFinale: prixHT * recetteFinalePct,
    retenue: prixHT * retenuePct,
  };
}

export function computeNegotiation(prixCibleHT: number | null | undefined, coutTotalRef: number) {
  if (prixCibleHT == null) return null;
  const margeResultante = prixCibleHT > 0 ? (prixCibleHT - coutTotalRef) / prixCibleHT : null;
  return {
    prixCibleHT,
    margeResultante,
    ecartVsPrixCalcule: prixCibleHT - coutTotalRef,
  };
}
