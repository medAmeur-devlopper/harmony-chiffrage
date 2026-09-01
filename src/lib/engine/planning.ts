import { addDays, isSaturday, isSunday, isBefore, isEqual, startOfDay } from "date-fns";

export interface HolidayLike {
  date: Date;
}

function isHoliday(date: Date, holidays: Set<string>): boolean {
  return holidays.has(startOfDay(date).toISOString().slice(0, 10));
}

function isWorkday(date: Date, holidays: Set<string>): boolean {
  return !isSaturday(date) && !isSunday(date) && !isHoliday(date, holidays);
}

/** Excel WORKDAY(startDate, +1) equivalent: next working day strictly after `date`. */
function nextWorkday(date: Date, holidays: Set<string>): Date {
  let d = addDays(date, 1);
  while (!isWorkday(d, holidays)) d = addDays(d, 1);
  return d;
}

/**
 * Adds `days` working days to `start` (start counts as day 1 if it is itself
 * a working day), skipping week-ends and holidays — mirrors Excel's WORKDAY().
 */
export function addWorkdays(start: Date, days: number, holidays: HolidayLike[]): Date {
  const holidaySet = new Set(holidays.map((h) => startOfDay(h.date).toISOString().slice(0, 10)));
  let current = startOfDay(start);
  if (!isWorkday(current, holidaySet)) current = nextWorkday(current, holidaySet);
  let remaining = days - 1;
  while (remaining > 0) {
    current = nextWorkday(current, holidaySet);
    remaining--;
  }
  return current;
}

/** Number of working days (Mon-Fri minus holidays) available in the week starting `weekStart`. */
export function workdaysInWeek(weekStart: Date, holidays: HolidayLike[]): number {
  const holidaySet = new Set(holidays.map((h) => startOfDay(h.date).toISOString().slice(0, 10)));
  let count = 0;
  for (let i = 0; i < 5; i++) {
    const d = addDays(startOfDay(weekStart), i);
    if (isWorkday(d, holidaySet)) count++;
  }
  return count;
}

export interface LotPhaseInput {
  id: string;
  lotId: string;
  lotOrderNum: number;
  phase: string;
  durationWeeks: number;
  phaseOrderNum: number;
  /** Manual override of the start date, used to parallelize lots. */
  manualStartDate?: Date | null;
}

export interface LotPhaseResult extends LotPhaseInput {
  startDate: Date;
  endDate: Date;
}

/**
 * Cascades start/end dates across lots & phases: within a lot, phases chain
 * sequentially; across lots, each lot starts the working day after the
 * previous lot's last phase ends, unless a manual start override is set.
 */
export function cascadeDates(
  projectStart: Date,
  phasesByLot: LotPhaseInput[][],
  holidays: HolidayLike[]
): LotPhaseResult[] {
  const results: LotPhaseResult[] = [];
  let nextLotStart = startOfDay(projectStart);

  const sortedLots = phasesByLot
    .slice()
    .sort((a, b) => (a[0]?.lotOrderNum ?? 0) - (b[0]?.lotOrderNum ?? 0));

  for (const phases of sortedLots) {
    const sortedPhases = phases.slice().sort((a, b) => a.phaseOrderNum - b.phaseOrderNum);
    let cursor = sortedPhases[0]?.manualStartDate
      ? startOfDay(sortedPhases[0].manualStartDate as Date)
      : nextLotStart;

    for (const phase of sortedPhases) {
      const start = phase.manualStartDate ? startOfDay(phase.manualStartDate) : cursor;
      const end = addWorkdays(start, phase.durationWeeks * 5, holidays);
      results.push({ ...phase, startDate: start, endDate: end });
      cursor = nextWorkday(end, new Set(holidays.map((h) => startOfDay(h.date).toISOString().slice(0, 10))));
    }
    nextLotStart = cursor;
  }

  return results;
}

export function projectEndDate(results: LotPhaseResult[]): Date | null {
  if (results.length === 0) return null;
  return results.reduce((max, r) => (isBefore(max, r.endDate) ? r.endDate : max), results[0].endDate);
}

export function totalProjectWeeks(start: Date, end: Date): number {
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil((days + 1) / 7);
}

export function isSameOrBefore(a: Date, b: Date): boolean {
  return isBefore(a, b) || isEqual(a, b);
}

/** Overall project progress (%) weighted by each phase's duration in weeks. */
export function computeOverallProgress(phases: { durationWeeks: number; progress: number }[]): number {
  const totalWeeks = phases.reduce((s, p) => s + p.durationWeeks, 0);
  if (totalWeeks === 0) return 0;
  const weighted = phases.reduce((s, p) => s + p.durationWeeks * p.progress, 0);
  return weighted / totalWeeks;
}
