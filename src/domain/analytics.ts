/**
 * Analítica de entrenamiento: funciones puras sobre sesiones/ejercicios.
 * Todas trabajan con pesos canónicos en kg y fechas locales YYYY-MM-DD.
 */
import { MUSCLE_GROUPS, PRIMARY_MUSCLE_GROUPS } from './constants';
import { localDateKey } from './id';
import type { BodyWeightEntry, Exercise, MeasurementEntry, MuscleGroup, Routine, Session, WorkoutSet } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v: string | number): number => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const completedSets = (sets: WorkoutSet[]): WorkoutSet[] => sets.filter((s) => s.completed);

const setVolume = (s: WorkoutSet): number => num(s.weight) * Math.round(num(s.reps));

export const sessionVolume = (s: Session): number =>
  s.exercises.reduce((acc, ex) => acc + completedSets(ex.sets).reduce((a, st) => a + setVolume(st), 0), 0);

/** e1RM con fórmula de Epley. */
export const epley1Rm = (weightKg: number, reps: number): number =>
  weightKg > 0 && reps > 0 ? Math.round(weightKg * (1 + reps / 30)) : 0;

const sortByDate = (sessions: Session[]): Session[] =>
  sessions.slice().sort((a, b) => a.date.localeCompare(b.date));

const inLastNDays = (sessions: Session[], days: number, today = new Date()): Session[] => {
  const from = new Date(today.getTime() - (days - 1) * DAY_MS);
  const fromKey = localDateKey(from);
  const toKey = localDateKey(today);
  return sessions.filter((s) => s.date >= fromKey && s.date <= toKey);
};

// ── Insights generales ────────────────────────────────────────

export interface Insights {
  volume7: number;
  sessions7: number;
  streak: number;
  lastDate: string | null;
  prs7: number;
  totalPRs: number;
}

export function calcInsights(sessions: Session[], today = new Date()): Insights {
  const list = sortByDate(sessions);
  const last7 = inLastNDays(list, 7, today);
  const volume7 = Math.round(last7.reduce((sum, s) => sum + sessionVolume(s), 0));

  // PRs: mejor peso por ejercicio, en orden cronológico
  const bestByExercise: Record<string, number> = {};
  let totalPRs = 0;
  let prs7 = 0;
  const last7Ids = new Set(last7.map((s) => s.id));
  list.forEach((s) => {
    s.exercises.forEach((ex) => {
      const best = completedSets(ex.sets).reduce((m, st) => Math.max(m, num(st.weight)), 0);
      if (best <= 0) return;
      const prev = bestByExercise[ex.exerciseId] ?? 0;
      if (best > prev) {
        bestByExercise[ex.exerciseId] = best;
        totalPRs++;
        if (last7Ids.has(s.id)) prs7++;
      }
    });
  });

  // Racha de días consecutivos con entreno
  const uniqueDays = new Set(list.map((s) => s.date));
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  if (!uniqueDays.has(localDateKey(cursor))) cursor.setTime(cursor.getTime() - DAY_MS);
  while (uniqueDays.has(localDateKey(cursor))) {
    streak++;
    cursor.setTime(cursor.getTime() - DAY_MS);
  }

  const lastDate = list.length ? list[list.length - 1].date : null;
  return { volume7, sessions7: last7.length, streak, lastDate, prs7, totalPRs };
}

// ── Sugerencia de próxima rutina ──────────────────────────────

export interface RoutineSuggestion {
  routineId: string;
  lastDate: string | null;
  daysSince: number;
  reason: string;
}

export function calcSuggestion(routines: Routine[], sessions: Session[], today = new Date()): RoutineSuggestion | null {
  if (routines.length === 0) return null;
  const lastByRoutine: Record<string, string> = {};
  sessions.forEach((s) => {
    if (!lastByRoutine[s.routineId] || s.date > lastByRoutine[s.routineId]) lastByRoutine[s.routineId] = s.date;
  });
  const enriched = routines.map((r) => {
    const lastDate = lastByRoutine[r.id] ?? null;
    if (!lastDate) return { routineId: r.id, lastDate, daysSince: 9999, reason: 'Nunca la has entrenado' };
    const diff = Math.max(0, Math.floor((today.getTime() - new Date(`${lastDate}T12:00:00`).getTime()) / DAY_MS));
    return {
      routineId: r.id,
      lastDate,
      daysSince: diff,
      reason: diff === 0 ? 'Ya entrenada hoy' : `Hace ${diff} día${diff === 1 ? '' : 's'}`,
    };
  });
  return enriched.sort((a, b) => b.daysSince - a.daysSince)[0] ?? null;
}

// ── Carga muscular semanal ────────────────────────────────────

export interface MuscleLoadItem {
  group: MuscleGroup;
  weeklyVolume: number;
  isWorked: boolean;
  pct: number;
  level: 'none' | 'low' | 'medium' | 'high';
}

export function calcWeeklyMuscleLoad(sessions: Session[], exercises: Exercise[], today = new Date()): MuscleLoadItem[] {
  const groupByEx: Record<string, MuscleGroup> = {};
  exercises.forEach((ex) => {
    groupByEx[ex.id] = ex.muscleGroup;
  });
  const bucket = new Map<MuscleGroup, number>(MUSCLE_GROUPS.map((g) => [g, 0]));
  inLastNDays(sessions, 7, today).forEach((s) => {
    s.exercises.forEach((ex) => {
      const mg = groupByEx[ex.exerciseId] ?? 'Otro';
      const vol = completedSets(ex.sets).reduce((a, st) => a + setVolume(st), 0);
      bucket.set(mg, (bucket.get(mg) ?? 0) + vol);
    });
  });
  const raw = [...bucket.entries()].map(([group, vol]) => ({
    group,
    weeklyVolume: Math.round(vol),
    isWorked: vol > 0,
  }));
  const maxVol = Math.max(...raw.map((i) => i.weeklyVolume), 0);
  return raw
    .map((item) => {
      const pct = maxVol > 0 ? Math.round((item.weeklyVolume / maxVol) * 100) : 0;
      const level: MuscleLoadItem['level'] =
        item.weeklyVolume <= 0 ? 'none' : pct >= 67 ? 'high' : pct >= 34 ? 'medium' : 'low';
      return { ...item, pct, level };
    })
    .sort((a, b) => {
      if (a.isWorked !== b.isWorked) return a.isWorked ? -1 : 1;
      if (b.weeklyVolume !== a.weeklyVolume) return b.weeklyVolume - a.weeklyVolume;
      return MUSCLE_GROUPS.indexOf(a.group) - MUSCLE_GROUPS.indexOf(b.group);
    });
}

// ── Calendario / heatmap ──────────────────────────────────────

export interface HeatmapDay {
  key: string;
  label: string;
  count: number;
}

export function calcHeatmap14(sessions: Session[], today = new Date()): HeatmapDay[] {
  const map: Record<string, number> = {};
  sessions.forEach((s) => {
    map[s.date] = (map[s.date] ?? 0) + 1;
  });
  const out: HeatmapDay[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = localDateKey(d);
    out.push({
      key,
      label: d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 1).toUpperCase(),
      count: map[key] ?? 0,
    });
  }
  return out;
}

// ── Alertas semanales ─────────────────────────────────────────

export interface WeeklyAlert {
  id: string;
  level: 'low' | 'medium' | 'high';
  title: string;
  message: string;
}

export function calcWeeklyAlerts(
  sessions: Session[],
  exercises: Exercise[],
  weeklyGoal: number,
  today = new Date(),
): WeeklyAlert[] {
  const goal = Math.min(14, Math.max(1, Math.round(weeklyGoal) || 3));
  const last7 = inLastNDays(sessions, 7, today);
  const alerts: WeeklyAlert[] = [];

  if (last7.length === 0) {
    alerts.push({
      id: 'consistency-zero',
      level: 'high',
      title: 'Semana en blanco',
      message: 'No registraste entrenos en los últimos 7 días. Empieza con 1 sesión corta para retomar el ritmo.',
    });
  } else if (last7.length < goal) {
    alerts.push({
      id: 'consistency-goal',
      level: 'medium',
      title: 'Objetivo semanal en riesgo',
      message: `Llevas ${last7.length}/${goal} sesiones esta semana. Planifica ${Math.max(1, goal - last7.length)} sesión(es) más para cumplir objetivo.`,
    });
  }

  const groupByEx: Record<string, MuscleGroup> = {};
  exercises.forEach((ex) => {
    groupByEx[ex.id] = ex.muscleGroup;
  });

  const workedGroups = new Set<MuscleGroup>();
  const volumeByGroup: Record<string, number> = {};
  last7.forEach((s) => {
    s.exercises.forEach((ex) => {
      const mg = groupByEx[ex.exerciseId] ?? 'Otro';
      const vol = completedSets(ex.sets).reduce((a, st) => a + setVolume(st), 0);
      if (completedSets(ex.sets).length > 0) workedGroups.add(mg);
      volumeByGroup[mg] = (volumeByGroup[mg] ?? 0) + vol;
    });
  });

  const missingPrimary = PRIMARY_MUSCLE_GROUPS.filter((g) => !workedGroups.has(g));
  if (last7.length > 0 && missingPrimary.length > 0) {
    alerts.push({
      id: 'muscle-gap',
      level: 'medium',
      title: 'Cobertura muscular incompleta',
      message: `Esta semana no trabajaste: ${missingPrimary.join(', ')}. Añade al menos 1 bloque para equilibrar.`,
    });
  }

  const totalVol = Object.values(volumeByGroup).reduce((a, v) => a + v, 0);
  if (totalVol > 0) {
    const [topGroup, topVol] = Object.entries(volumeByGroup).sort((a, b) => b[1] - a[1])[0];
    if (topVol / totalVol >= 0.7) {
      alerts.push({
        id: 'muscle-imbalance',
        level: 'low',
        title: 'Balance mejorable',
        message: `${topGroup} concentra ${Math.round((topVol / totalVol) * 100)}% del volumen semanal. Compensa con grupos rezagados.`,
      });
    }
  }

  // Deload: 6+ semanas consecutivas entrenando
  if (sessions.length >= 3) {
    let consecutiveWeeks = 0;
    for (let w = 0; w < 12; w++) {
      const wEnd = new Date(today.getTime() - w * 7 * DAY_MS);
      const wStart = new Date(wEnd.getTime() - 6 * DAY_MS);
      const fromKey = localDateKey(wStart);
      const toKey = localDateKey(wEnd);
      const hasSessions = sessions.some((s) => s.date >= fromKey && s.date <= toKey);
      if (hasSessions) consecutiveWeeks++;
      else break;
    }
    if (consecutiveWeeks >= 6) {
      alerts.push({
        id: 'deload-suggested',
        level: 'medium',
        title: 'Semana de descarga sugerida',
        message: `Llevas ${consecutiveWeeks} semanas seguidas entrenando. Programa un deload (50-60% de volumen) para optimizar recuperación.`,
      });
    }
  }

  // Fatiga: 3+ sesiones seguidas con RPE medio >= 8.5
  const recent = sortByDate(inLastNDays(sessions, 7, today)).reverse();
  let highRpeStreak = 0;
  for (const s of recent) {
    const rpes = s.exercises.flatMap((ex) =>
      completedSets(ex.sets)
        .map((st) => num(st.rpe))
        .filter((v) => v > 0),
    );
    const avg = rpes.length ? rpes.reduce((a, v) => a + v, 0) / rpes.length : 0;
    if (avg >= 8.5) highRpeStreak++;
    else break;
  }
  if (highRpeStreak >= 3) {
    alerts.push({
      id: 'fatigue-high',
      level: 'high',
      title: 'Fatiga acumulada detectada',
      message: `${highRpeStreak} sesiones seguidas con RPE ≥ 8.5. Considera un deload o sesión ligera para recuperar.`,
    });
  }

  return alerts.slice(0, 5);
}

// ── Tendencia de volumen semanal (8 semanas) ──────────────────

export interface WeekVolume {
  weekStart: string;
  label: string;
  volume: number;
  sessions: number;
  pct: number;
}

export function calcWeeklyVolumeTrend(
  sessions: Session[],
  weeks = 8,
  today = new Date(),
): { weeks: WeekVolume[]; trend: number } {
  const result: Omit<WeekVolume, 'pct'>[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const wEnd = new Date(today.getTime() - w * 7 * DAY_MS);
    const wStart = new Date(wEnd.getTime() - 6 * DAY_MS);
    const fromKey = localDateKey(wStart);
    const toKey = localDateKey(wEnd);
    const wSessions = sessions.filter((s) => s.date >= fromKey && s.date <= toKey);
    result.push({
      weekStart: fromKey,
      label: wStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''),
      volume: Math.round(wSessions.reduce((sum, s) => sum + sessionVolume(s), 0)),
      sessions: wSessions.length,
    });
  }
  const maxVol = Math.max(...result.map((w) => w.volume), 1);
  const withPct = result.map((w) => ({ ...w, pct: Math.round((w.volume / maxVol) * 100) }));
  const filled = withPct.filter((w) => w.volume > 0);
  const trend =
    filled.length >= 2
      ? Math.round(
          ((filled[filled.length - 1].volume - filled[filled.length - 2].volume) /
            Math.max(filled[filled.length - 2].volume, 1)) *
            100,
        )
      : 0;
  return { weeks: withPct, trend };
}

// ── Comparativa entre periodos (N semanas actuales vs N anteriores) ──

export interface PeriodComparison {
  weeks: number;
  currentVolume: number;
  previousVolume: number;
  currentSessions: number;
  previousSessions: number;
  /** % de cambio de volumen; null si no hay volumen previo con el que comparar. */
  volumeChangePct: number | null;
}

export function calcPeriodComparison(sessions: Session[], weeks: number, today = new Date()): PeriodComparison {
  const n = Math.max(1, Math.round(weeks));
  const currentEnd = today;
  const currentStart = new Date(currentEnd.getTime() - (n * 7 - 1) * DAY_MS);
  const previousEnd = new Date(currentStart.getTime() - DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - (n * 7 - 1) * DAY_MS);

  const inRange = (fromKey: string, toKey: string) => sessions.filter((s) => s.date >= fromKey && s.date <= toKey);
  const current = inRange(localDateKey(currentStart), localDateKey(currentEnd));
  const previous = inRange(localDateKey(previousStart), localDateKey(previousEnd));

  const currentVolume = Math.round(current.reduce((sum, s) => sum + sessionVolume(s), 0));
  const previousVolume = Math.round(previous.reduce((sum, s) => sum + sessionVolume(s), 0));

  return {
    weeks: n,
    currentVolume,
    previousVolume,
    currentSessions: current.length,
    previousSessions: previous.length,
    volumeChangePct: previousVolume > 0 ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : null,
  };
}

// ── Distribución de rangos de repeticiones (7 días) ───────────

export interface RepRangeDistribution {
  strength: number;
  hypertrophy: number;
  endurance: number;
  total: number;
  strengthPct: number;
  hypertrophyPct: number;
  endurancePct: number;
}

export function calcRepRangeDistribution(sessions: Session[], today = new Date()): RepRangeDistribution {
  let strength = 0;
  let hypertrophy = 0;
  let endurance = 0;
  inLastNDays(sessions, 7, today).forEach((s) => {
    s.exercises.forEach((ex) => {
      completedSets(ex.sets).forEach((st) => {
        const reps = Math.round(num(st.reps));
        if (reps <= 0) return;
        if (reps <= 5) strength++;
        else if (reps <= 12) hypertrophy++;
        else endurance++;
      });
    });
  });
  const total = strength + hypertrophy + endurance;
  return {
    strength,
    hypertrophy,
    endurance,
    total,
    strengthPct: total ? Math.round((strength / total) * 100) : 0,
    hypertrophyPct: total ? Math.round((hypertrophy / total) * 100) : 0,
    endurancePct: total ? Math.round((endurance / total) * 100) : 0,
  };
}

// ── Progresión por ejercicio ──────────────────────────────────

export interface ProgressionPoint {
  date: string;
  bestWeight: number;
  bestReps: number;
  e1rm: number;
  volume: number;
  totalSets: number;
  isPR: boolean;
  avgRpe: number | null;
  routineName: string;
}

export interface ExerciseProgression {
  points: ProgressionPoint[];
  prWeight: number;
  totalSessions: number;
  totalVolume: number;
  best1RM: number;
}

export function calcExerciseProgression(exerciseId: string, sessions: Session[]): ExerciseProgression {
  let prWeight = 0;
  const points: ProgressionPoint[] = [];
  sortByDate(sessions).forEach((s) => {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) return;
    const done = completedSets(ex.sets);
    if (done.length === 0) return;
    const bestSet = done.reduce((best, st) => (num(st.weight) > num(best.weight) ? st : best), done[0]);
    const bestWeight = num(bestSet.weight);
    const bestReps = Math.round(num(bestSet.reps));
    const rpes = done.map((st) => num(st.rpe)).filter((v) => v > 0);
    const isPR = bestWeight > prWeight && bestWeight > 0;
    if (isPR) prWeight = bestWeight;
    points.push({
      date: s.date,
      bestWeight,
      bestReps,
      e1rm: epley1Rm(bestWeight, bestReps),
      volume: Math.round(done.reduce((sum, st) => sum + setVolume(st), 0)),
      totalSets: done.length,
      isPR,
      avgRpe: rpes.length ? Math.round((rpes.reduce((a, v) => a + v, 0) / rpes.length) * 10) / 10 : null,
      routineName: s.routineName,
    });
  });
  const totalVolume = points.reduce((a, p) => a + p.volume, 0);
  return {
    points,
    prWeight,
    totalSessions: points.length,
    totalVolume,
    best1RM: points.reduce((m, p) => Math.max(m, p.e1rm), 0),
  };
}

// ── Proyección de progreso (regresión lineal) ─────────────────

export interface ProjectedProgress {
  currentWeight: number;
  projected: number;
  weeklyGain: number;
  weeksAhead: number;
  dataPoints: number;
}

export function calcProjectedProgress(
  exerciseId: string,
  sessions: Session[],
  weeksAhead = 12,
): ProjectedProgress | null {
  const { points } = calcExerciseProgression(exerciseId, sessions);
  const usable = points.filter((p) => p.bestWeight > 0);
  if (usable.length < 3) return null;
  const d0 = new Date(`${usable[0].date}T12:00:00`).getTime();
  const xs = usable.map((p) => (new Date(`${p.date}T12:00:00`).getTime() - d0) / DAY_MS);
  const ys = usable.map((p) => p.bestWeight);
  const n = xs.length;
  const sumX = xs.reduce((a, v) => a + v, 0);
  const sumY = ys.reduce((a, v) => a + v, 0);
  const sumXY = xs.reduce((a, v, i) => a + v * ys[i], 0);
  const sumX2 = xs.reduce((a, v) => a + v * v, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  if (slope <= 0) return null;
  const intercept = (sumY - slope * sumX) / n;
  const futureDay = xs[xs.length - 1] + weeksAhead * 7;
  return {
    currentWeight: ys[ys.length - 1],
    projected: Math.round((intercept + slope * futureDay) * 10) / 10,
    weeklyGain: Math.round(slope * 7 * 100) / 100,
    weeksAhead,
    dataPoints: n,
  };
}

// ── PRs (timeline completo) ───────────────────────────────────

export interface PrRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  routineName: string;
  previous: number;
}

export function calcAllPRs(sessions: Session[]): PrRecord[] {
  const bestByExercise: Record<string, number> = {};
  const prs: PrRecord[] = [];
  sortByDate(sessions).forEach((s) => {
    s.exercises.forEach((ex) => {
      completedSets(ex.sets).forEach((st) => {
        const kg = num(st.weight);
        if (kg <= 0) return;
        const prev = bestByExercise[ex.exerciseId] ?? 0;
        if (kg > prev) {
          bestByExercise[ex.exerciseId] = kg;
          prs.push({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            weight: kg,
            reps: Math.round(num(st.reps)),
            date: s.date,
            routineName: s.routineName,
            previous: prev,
          });
        }
      });
    });
  });
  return prs.reverse();
}

// ── Peso corporal y medidas ───────────────────────────────────

export interface BodyWeightTrend {
  current: number | null;
  min: number | null;
  max: number | null;
  change: number | null;
  points: BodyWeightEntry[];
}

export function calcBodyWeightTrend(log: BodyWeightEntry[]): BodyWeightTrend {
  const sorted = log.slice().sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { current: null, min: null, max: null, change: null, points: [] };
  const current = sorted[sorted.length - 1].value;
  return {
    current,
    min: Math.min(...sorted.map((e) => e.value)),
    max: Math.max(...sorted.map((e) => e.value)),
    change: sorted.length >= 2 ? Math.round((current - sorted[0].value) * 10) / 10 : null,
    points: sorted,
  };
}

export interface MeasurementTrend {
  current: number;
  change: number | null;
  points: MeasurementEntry[];
}

export function calcMeasurementTrends(log: MeasurementEntry[]): Record<string, MeasurementTrend> {
  const byType: Record<string, MeasurementEntry[]> = {};
  log.forEach((e) => {
    (byType[e.type] ??= []).push(e);
  });
  const trends: Record<string, MeasurementTrend> = {};
  Object.entries(byType).forEach(([type, entries]) => {
    const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
    const current = sorted[sorted.length - 1].value;
    trends[type] = {
      current,
      change: sorted.length >= 2 ? Math.round((current - sorted[0].value) * 10) / 10 : null,
      points: sorted,
    };
  });
  return trends;
}

// ── CSV export ────────────────────────────────────────────────

export function buildSessionsCsv(sessions: Session[]): string {
  const rows: string[][] = [
    ['fecha', 'rutina', 'ejercicio', 'set', 'kg', 'reps', 'rpe', 'rir', 'volumen', 'completada', 'duracion_min'],
  ];
  sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      ex.sets.forEach((st, i) => {
        rows.push([
          s.date,
          s.routineName,
          ex.exerciseName,
          String(i + 1),
          st.weight,
          st.reps,
          st.rpe,
          st.rir,
          String(Math.round(setVolume(st) * 100) / 100),
          st.completed ? '1' : '0',
          String(s.durationMin),
        ]);
      });
    });
  });
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
