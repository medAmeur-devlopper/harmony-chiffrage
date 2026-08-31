import type { Worksheet, Row, Fill, Font } from "exceljs";

// Color palette extracted from the original Grille_estimatif_Yazaki_SFG.xlsx template.
export const COLORS = {
  navy: "FF0B1B30", // main title bar / table headers
  navyMedium: "FF16314F", // section sub-header
  gold: "FFFFC933", // title bar accent text
  goldDark: "FFD89E15", // computed/formula accent text
  cream: "FFFFFBEF", // user-input cell background
  computed: "FFF5F8FC", // auto-calculated cell background
  highlight: "FFFFF4D6", // driver/highlighted totals background
  slate: "FF334155",
  muted: "FF94A3B8",
  textNavy: "FF0B1B30",
} as const;

function fill(argb: string): Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

const BASE_FONT: Partial<Font> = { name: "Calibri", size: 10 };

/** Row 1 of every sheet: the "HARMONY · OUTIL DE CHIFFRAGE" title bar. */
export function applyTitleBar(row: Row) {
  row.eachCell((cell) => {
    cell.fill = fill(COLORS.navy);
    cell.font = { ...BASE_FONT, size: 8, bold: true, color: { argb: COLORS.gold } };
  });
}

/** Row 2 of every sheet: the sheet's section title (e.g. "2 · Chiffrage projet"). */
export function applySheetTitle(row: Row) {
  row.eachCell((cell) => {
    cell.fill = fill(COLORS.navy);
    cell.font = { ...BASE_FONT, size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  });
}

/** Row 3 of every sheet: the italic gold subtitle/description line. */
export function applySubtitle(row: Row) {
  row.eachCell((cell) => {
    cell.font = { ...BASE_FONT, size: 9, color: { argb: COLORS.goldDark } };
  });
}

/** A medium-navy section header inside a sheet (e.g. "A. Activités (abaque automatique)"). */
export function applySectionHeader(row: Row) {
  row.eachCell((cell) => {
    cell.fill = fill(COLORS.navyMedium);
    cell.font = { ...BASE_FONT, bold: true, color: { argb: "FFFFFFFF" } };
  });
}

/** A dark-navy table header row (column names). */
export function applyTableHeader(row: Row) {
  row.eachCell((cell) => {
    cell.fill = fill(COLORS.navy);
    cell.font = { ...BASE_FONT, bold: true, color: { argb: "FFFFFFFF" } };
  });
}

/** Cream background for a cell that was user-editable in the app. */
export function applyInputCell(cell: import("exceljs").Cell) {
  cell.fill = fill(COLORS.cream);
  cell.font = { ...BASE_FONT, color: { argb: COLORS.slate } };
}

/** Light blue-grey background for an auto-calculated cell. */
export function applyComputedCell(cell: import("exceljs").Cell) {
  cell.fill = fill(COLORS.computed);
  cell.font = { ...BASE_FONT, color: { argb: COLORS.textNavy } };
}

/** Highlighted cream/gold background for driver values and grand totals. */
export function applyHighlightRow(row: Row) {
  row.eachCell((cell) => {
    cell.fill = fill(COLORS.highlight);
    cell.font = { ...BASE_FONT, bold: true, color: { argb: COLORS.textNavy } };
  });
}

export function baseFont() {
  return { ...BASE_FONT };
}

export function autoWidth(sheet: Worksheet, minWidth = 10, maxWidth = 45) {
  sheet.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, maxWidth);
  });
}
