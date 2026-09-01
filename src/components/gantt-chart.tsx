"use client";

import { useMemo, useState } from "react";
import { PHASE_LABELS, PhaseName, LOT_PHASES, PHASE_COLORS } from "@/lib/constants";

export interface GanttLot {
  id: string;
  name: string;
  color: string;
}

export interface GanttPhase {
  id: string;
  lotId: string;
  phase: string;
  startDate: Date;
  endDate: Date;
  progress?: number;
}

export interface GanttMilestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  color: string;
  completed: boolean;
}

interface GanttChartProps {
  lots: GanttLot[];
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  projectStart: Date;
  projectEnd: Date | null;
  readOnly?: boolean;
}

const ZOOM_LEVELS = {
  semaine: 22,
  mois: 8,
  trimestre: 3,
} as const;
type ZoomLevel = keyof typeof ZOOM_LEVELS;

const LABEL_WIDTH = 168;

function dayOffset(date: Date, from: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(from).getTime()) / 86400000);
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function GanttChart({ lots, phases, milestones, projectStart, projectEnd, readOnly }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("semaine");
  const pxPerDay = ZOOM_LEVELS[zoom];
  const today = startOfDay(new Date());

  const timelineStart = startOfDay(projectStart);
  const timelineEnd = projectEnd ? startOfDay(projectEnd) : addDays(timelineStart, 30);
  const totalDays = Math.max(dayOffset(timelineEnd, timelineStart) + 14, 30);
  const totalWidth = totalDays * pxPerDay;

  const weekTicks = useMemo(() => {
    const ticks: { offset: number; label: string }[] = [];
    let cursor = timelineStart;
    let i = 1;
    while (dayOffset(cursor, timelineStart) < totalDays) {
      ticks.push({ offset: dayOffset(cursor, timelineStart), label: `S${i}` });
      cursor = addDays(cursor, 7);
      i++;
    }
    return ticks;
  }, [timelineStart, totalDays]);

  const monthTicks = useMemo(() => {
    const ticks: { offset: number; width: number; label: string }[] = [];
    let cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    const end = addDays(timelineStart, totalDays);
    while (cursor < end) {
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segStart = cursor < timelineStart ? timelineStart : cursor;
      const segEnd = nextMonth > end ? end : nextMonth;
      const offset = dayOffset(segStart, timelineStart);
      const width = Math.max(dayOffset(segEnd, segStart), 1);
      ticks.push({ offset, width, label: cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) });
      cursor = nextMonth;
    }
    return ticks;
  }, [timelineStart, totalDays]);

  const todayOffset = dayOffset(today, timelineStart);
  const totalSpanDays = Math.max(dayOffset(timelineEnd, timelineStart), 1);
  const progressPct = Math.min(100, Math.max(0, (Math.min(todayOffset, totalSpanDays) / totalSpanDays) * 100));

  const phasesByLot = useMemo(() => {
    const map = new Map<string, GanttPhase[]>();
    for (const p of phases) {
      if (!map.has(p.lotId)) map.set(p.lotId, []);
      map.get(p.lotId)!.push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }
    return map;
  }, [phases]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Avancement (temps écoulé) · {progressPct.toFixed(0)}%
          </p>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-[#2f6f8f] to-[#16314F] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          {(Object.keys(ZOOM_LEVELS) as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                zoom === z ? "bg-[#2f6f8f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-lg">
        <div style={{ width: LABEL_WIDTH + totalWidth, position: "relative" }}>
          {/* Month header */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
            <div style={{ width: LABEL_WIDTH }} className="shrink-0 sticky left-0 bg-white z-30 border-r border-slate-200" />
            <div className="relative" style={{ width: totalWidth, height: 28 }}>
              {monthTicks.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center px-2 text-[11px] font-semibold text-slate-600 border-r border-slate-100 capitalize truncate"
                  style={{ left: m.offset * pxPerDay, width: m.width * pxPerDay }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          {/* Week header */}
          <div className="flex sticky bg-white z-10 border-b border-slate-200" style={{ top: 28 }}>
            <div style={{ width: LABEL_WIDTH }} className="shrink-0 sticky left-0 bg-white z-30 border-r border-slate-200 flex items-center px-2 text-[11px] font-semibold text-slate-400">
              Lot / Phase
            </div>
            <div className="relative" style={{ width: totalWidth, height: 22 }}>
              {weekTicks.map((w, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center px-1.5 text-[10px] text-slate-400 border-r border-slate-50"
                  style={{ left: w.offset * pxPerDay }}
                >
                  {zoom !== "trimestre" && w.label}
                </div>
              ))}
            </div>
          </div>

          {/* Milestones row */}
          <div className="flex border-b border-slate-100">
            <div
              style={{ width: LABEL_WIDTH }}
              className="shrink-0 sticky left-0 bg-white z-10 border-r border-slate-200 flex items-center px-2 text-[11px] font-semibold text-slate-400"
            >
              Jalons
            </div>
            <div className="relative" style={{ width: totalWidth, height: 32 }}>
              {milestones.map((m) => {
                const offset = dayOffset(m.date, timelineStart) * pxPerDay;
                const isPast = startOfDay(m.date) < today;
                const state = m.completed ? "done" : isPast ? "overdue" : "future";
                return (
                  <div
                    key={m.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                    style={{ left: offset }}
                    title={`${m.name} — ${m.date.toLocaleDateString("fr-FR")}${m.description ? " — " + m.description : ""}`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rotate-45 border-2 ${
                        state === "done"
                          ? "bg-green-500 border-green-600"
                          : state === "overdue"
                          ? "bg-red-500 border-red-600 animate-pulse"
                          : "bg-white"
                      }`}
                      style={state === "future" ? { borderColor: m.color } : undefined}
                    />
                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-5 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-40">
                      {m.name} · {m.date.toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today line spans the full body below */}
          <div className="relative">
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-400 z-20 pointer-events-none"
                style={{ left: LABEL_WIDTH + todayOffset * pxPerDay }}
              />
            )}
            {lots.map((lot) => {
              const lotPhases = phasesByLot.get(lot.id) ?? [];
              const currentPhase = lotPhases.filter((p) => p.startDate <= today).slice(-1)[0];
              const overdue = currentPhase && currentPhase.endDate < today;
              return (
                <div key={lot.id}>
                  <div className="flex border-b border-slate-100 bg-slate-50/60">
                    <div
                      style={{ width: LABEL_WIDTH, borderLeftColor: lot.color }}
                      className="shrink-0 sticky left-0 bg-slate-50/95 z-10 border-r border-slate-200 border-l-4 px-2 py-1.5 text-xs font-semibold text-slate-700 truncate"
                    >
                      {lot.name}
                    </div>
                    <div style={{ width: totalWidth }} />
                  </div>
                  {lotPhases.map((p) => {
                    const start = dayOffset(p.startDate, timelineStart) * pxPerDay;
                    const end = dayOffset(p.endDate, timelineStart) * pxPerDay + pxPerDay;
                    const width = Math.max(end - start, pxPerDay);
                    const color = PHASE_COLORS[p.phase as PhaseName] ?? lot.color;
                    const isPast = p.endDate < today;
                    const isCurrent = p.startDate <= today && p.endDate >= today;
                    const isOverdue = isCurrent && overdue && p.id === currentPhase?.id;
                    let elapsedWidth = 0;
                    if (isCurrent) {
                      elapsedWidth = Math.max(dayOffset(today, p.startDate) + 1, 0) * pxPerDay;
                      elapsedWidth = Math.min(elapsedWidth, width);
                    }
                    return (
                      <div key={p.id} className="flex border-b border-slate-50">
                        <div style={{ width: LABEL_WIDTH }} className="shrink-0 sticky left-0 bg-white z-10 border-r border-slate-200 px-2 py-1.5 text-[11px] text-slate-500 truncate pl-4">
                          {PHASE_LABELS[p.phase as PhaseName]}
                        </div>
                        <div className="relative" style={{ width: totalWidth, height: 30 }}>
                          <div
                            className="absolute top-1.5 h-4 rounded"
                            style={{
                              left: start,
                              width,
                              backgroundColor: color,
                              opacity: isPast ? 1 : isCurrent ? 1 : 0.35,
                            }}
                            title={`${PHASE_LABELS[p.phase as PhaseName]} · ${fmtShort(p.startDate)} → ${fmtShort(p.endDate)} · ${Math.round(p.progress ?? 0)}% avancé`}
                          >
                            {isCurrent && elapsedWidth < width && (
                              <div
                                className="absolute top-0 bottom-0 right-0 rounded-r bg-white/55"
                                style={{ width: width - elapsedWidth }}
                              />
                            )}
                            <div
                              className="absolute left-0 bottom-0 h-1 rounded-b bg-white/90"
                              style={{ width: `${Math.min(100, Math.max(0, p.progress ?? 0))}%` }}
                              title={`Avancement réel · ${Math.round(p.progress ?? 0)}%`}
                            />
                          </div>
                          {isOverdue && (
                            <div
                              className="absolute top-1.5 h-4 rounded-r bg-red-500/80"
                              style={{ left: start + width, width: Math.max((todayOffset * pxPerDay) - (start + width), 4) }}
                              title="En retard"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        {LOT_PHASES.map((phase) => (
          <span key={phase} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PHASE_COLORS[phase] }} />
            {PHASE_LABELS[phase]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rotate-45 bg-green-500 border border-green-600" /> Jalon atteint
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rotate-45 bg-red-500 border border-red-600" /> Jalon en retard
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rotate-45 bg-white border-2 border-slate-400" /> Jalon à venir
        </span>
      </div>
      {readOnly && (
        <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
          Vue partagée en lecture seule — dernière mise à jour reflétant les données du projet.
        </p>
      )}
    </div>
  );
}
