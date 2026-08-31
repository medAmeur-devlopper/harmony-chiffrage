import { addDays, addWeeks, startOfDay } from "date-fns";
import { workdaysInWeek, HolidayLike } from "@/lib/engine/planning";

export interface WeekColumn {
  weekStart: Date;
  availableDays: number;
  lotPhaseLabel: string | null;
}

export interface LotPhaseWithDates {
  lotName: string;
  phase: string;
  phaseLabel: string;
  startDate: Date;
  endDate: Date;
}

/** Builds the week-by-week header (dates, available days, active lot/phase label) for the capacity grid. */
export function buildWeekColumns(
  projectStart: Date,
  weekCount: number,
  holidays: HolidayLike[],
  lotPhases: LotPhaseWithDates[],
  lotName: string
): WeekColumn[] {
  const columns: WeekColumn[] = [];
  let weekStart = startOfDay(projectStart);
  for (let i = 0; i < weekCount; i++) {
    const weekEnd = addDays(weekStart, 4);
    const active = lotPhases.find(
      (lp) => lp.lotName === lotName && lp.startDate <= weekEnd && lp.endDate >= weekStart
    );
    columns.push({
      weekStart,
      availableDays: workdaysInWeek(weekStart, holidays),
      lotPhaseLabel: active ? active.phaseLabel : null,
    });
    weekStart = addWeeks(weekStart, 1);
  }
  return columns;
}

export interface StaffingCell {
  weekIndex: number;
  daysStaffed: number;
}

export interface ProfileStaffingRow {
  profileId: string;
  profileName: string;
  chargeAStaffer: number;
  cells: StaffingCell[];
}

export interface ProfileStaffingSummary extends ProfileStaffingRow {
  planifie: number;
  ecart: number;
}

/** Adds the "planifié" (sum of staffed days) and "écart" columns for each profile row. */
export function summarizeStaffing(rows: ProfileStaffingRow[]): ProfileStaffingSummary[] {
  return rows.map((row) => {
    const planifie = row.cells.reduce((s, c) => s + c.daysStaffed, 0);
    return { ...row, planifie, ecart: planifie - row.chargeAStaffer };
  });
}

/** Total staffed per week across all profiles, plus an overload flag vs. available days. */
export function totalStaffedPerWeek(
  rows: ProfileStaffingRow[],
  weekColumns: WeekColumn[]
): { weekIndex: number; total: number; overloaded: boolean }[] {
  return weekColumns.map((col, weekIndex) => {
    const total = rows.reduce((s, r) => {
      const cell = r.cells.find((c) => c.weekIndex === weekIndex);
      return s + (cell?.daysStaffed ?? 0);
    }, 0);
    return { weekIndex, total, overloaded: total > col.availableDays };
  });
}
