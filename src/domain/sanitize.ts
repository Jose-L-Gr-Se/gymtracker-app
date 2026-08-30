/**
 * Sanitización de entidades. Todo dato que entra al almacén local o llega de
 * la nube pasa por aquí, de modo que el resto de la app puede asumir formas
 * válidas. Portado de la PWA original y endurecido con tipos.
 */
import { MEASUREMENT_TYPES, MUSCLE_GROUPS } from './constants';
import { nowIso, uid } from './id';
import type {
  BodyWeightEntry,
  EntityMeta,
  Exercise,
  MeasurementEntry,
  MuscleGroup,
  Prefs,
  Routine,
  RoutineExercise,
  Session,
  SessionExercise,
  SetType,
  WorkoutSet,
} from './types';

const SET_TYPES: SetType[] = ['work', 'warmup', 'drop', 'failure'];

export const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const str = (v: unknown, max = 500): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const intOr = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

export function sanitizeMuscleGroup(v: unknown): MuscleGroup {
  return MUSCLE_GROUPS.includes(v as MuscleGroup) ? (v as MuscleGroup) : 'Otro';
}

export function entityMeta(e: Partial<EntityMeta> | undefined, deviceId: string): EntityMeta {
  const now = nowIso();
  return {
    createdAt: str(e?.createdAt) || now,
    updatedAt: str(e?.updatedAt) || now,
    version: Math.max(1, intOr(e?.version, 1)),
    deviceId: str(e?.deviceId) || deviceId,
    isDeleted: !!e?.isDeleted,
  };
}

function sanitizeVideoUrl(v: unknown): string {
  const trimmed = str(v, 500);
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function sanitizeExercise(e: Record<string, unknown>, deviceId: string): Exercise | null {
  const id = str(e.id, 80);
  const name = str(e.name, 80);
  if (!id || !name) return null;
  return {
    ...entityMeta(e as Partial<EntityMeta>, deviceId),
    id,
    name,
    muscleGroup: sanitizeMuscleGroup(e.muscleGroup),
    defaultRest: Math.max(0, intOr(e.defaultRest, 90)),
    videoUrl: sanitizeVideoUrl(e.videoUrl),
    instructions: str(e.instructions, 2000),
    isCustom: !!e.isCustom,
  };
}

export function sanitizeExercises(list: unknown, deviceId: string): Exercise[] {
  return asArray<Record<string, unknown>>(list)
    .map((e) => sanitizeExercise(e ?? {}, deviceId))
    .filter((e): e is Exercise => e !== null);
}

function sanitizeTargetRange(minRaw: unknown, maxRaw: unknown): [number | null, number | null] {
  const min = numOrNull(minRaw);
  const minVal = min !== null && min >= 0 ? Math.round(min) : null;
  const max = numOrNull(maxRaw);
  let maxVal = max !== null && max >= 0 ? Math.round(max) : null;
  if (maxVal !== null && minVal !== null && maxVal < minVal) maxVal = minVal;
  return [minVal, maxVal];
}

export function sanitizeRoutineExercise(ex: Record<string, unknown>): RoutineExercise | null {
  const exerciseId = str(ex.exerciseId, 80);
  const exerciseName = str(ex.exerciseName, 80);
  if (!exerciseId || !exerciseName) return null;
  const [repsMin, repsMax] = sanitizeTargetRange(ex.targetRepsMin, ex.targetRepsMax);
  const [rirMin, rirMax] = sanitizeTargetRange(ex.targetRirMin, ex.targetRirMax);
  return {
    exerciseId,
    exerciseName,
    muscleGroup: sanitizeMuscleGroup(ex.muscleGroup),
    targetSets: Math.max(1, intOr(ex.targetSets, 3)),
    restSeconds: Math.max(0, intOr(ex.restSeconds, 90)),
    linkedToNext: !!ex.linkedToNext,
    targetRepsMin: repsMin,
    targetRepsMax: repsMax,
    targetRirMin: rirMin,
    targetRirMax: rirMax,
  };
}

export function sanitizeRoutine(r: Record<string, unknown>, deviceId: string): Routine | null {
  const id = str(r.id, 80);
  const name = str(r.name, 80);
  if (!id || !name) return null;
  const exercises = asArray<Record<string, unknown>>(r.exercises)
    .map((ex) => sanitizeRoutineExercise(ex ?? {}))
    .filter((ex): ex is RoutineExercise => ex !== null)
    // el último ejercicio nunca puede quedar enlazado "al siguiente"
    .map((ex, i, list) => (i === list.length - 1 ? { ...ex, linkedToNext: false } : ex));
  return { ...entityMeta(r as Partial<EntityMeta>, deviceId), id, name, exercises };
}

export function sanitizeRoutines(list: unknown, deviceId: string): Routine[] {
  return asArray<Record<string, unknown>>(list)
    .map((r) => sanitizeRoutine(r ?? {}, deviceId))
    .filter((r): r is Routine => r !== null);
}

/** Campos de serie: acepta número o string (datos antiguos guardaban números). */
const numericField = (v: unknown, max: number): string =>
  typeof v === 'number' && Number.isFinite(v) ? String(v) : str(v, max);

export function sanitizeSet(st: Record<string, unknown>): WorkoutSet {
  return {
    weight: numericField(st.weight, 12),
    reps: numericField(st.reps, 8),
    rpe: numericField(st.rpe, 8),
    rir: numericField(st.rir, 8),
    completed: !!st.completed,
    type: SET_TYPES.includes(st.type as SetType) ? (st.type as SetType) : 'work',
  };
}

export function sanitizeSessionExercise(ex: Record<string, unknown>): SessionExercise | null {
  const exerciseId = str(ex.exerciseId, 80);
  const exerciseName = str(ex.exerciseName, 80);
  if (!exerciseId || !exerciseName) return null;
  return {
    exerciseId,
    exerciseName,
    sets: asArray<Record<string, unknown>>(ex.sets).map((st) => sanitizeSet(st ?? {})),
    notes: str(ex.notes, 1000),
  };
}

export function sanitizeSession(s: Record<string, unknown>, deviceId: string): Session | null {
  const id = str(s.id, 80);
  const routineId = str(s.routineId, 80);
  if (!id || !routineId) return null;
  const now = nowIso();
  const startTime = str(s.startTime) || now;
  const endTime = str(s.endTime) || now;
  const fallbackDuration = Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
  );
  const mood = numOrNull(s.sessionMood);
  return {
    ...entityMeta(s as Partial<EntityMeta>, deviceId),
    id,
    routineId,
    routineName: str(s.routineName, 80) || 'Rutina',
    startTime,
    endTime,
    date: str(s.date, 10) || startTime.slice(0, 10),
    durationMin: Math.max(0, intOr(s.durationMin, fallbackDuration)),
    sessionMood: mood !== null ? Math.min(5, Math.max(1, Math.round(mood))) : null,
    sessionNote: str(s.sessionNote, 1000),
    exercises: asArray<Record<string, unknown>>(s.exercises)
      .map((ex) => sanitizeSessionExercise(ex ?? {}))
      .filter((ex): ex is SessionExercise => ex !== null),
  };
}

export function sanitizeSessions(list: unknown, deviceId: string): Session[] {
  return asArray<Record<string, unknown>>(list)
    .map((s) => sanitizeSession(s ?? {}, deviceId))
    .filter((s): s is Session => s !== null);
}

export function sanitizeBodyWeightLog(list: unknown): BodyWeightEntry[] {
  return asArray<Record<string, unknown>>(list)
    .filter((e) => e && typeof e.date === 'string' && numOrNull(e.value) !== null)
    .map((e) => ({
      date: String(e.date).slice(0, 10),
      value: Math.round((numOrNull(e.value) ?? 0) * 10) / 10,
      note: str(e.note, 120),
    }));
}

export function sanitizeMeasurements(list: unknown): MeasurementEntry[] {
  return asArray<Record<string, unknown>>(list)
    .filter(
      (e) =>
        e &&
        typeof e.date === 'string' &&
        typeof e.type === 'string' &&
        (MEASUREMENT_TYPES as readonly string[]).includes(e.type) &&
        numOrNull(e.value) !== null,
    )
    .map((e) => ({
      date: String(e.date).slice(0, 10),
      type: String(e.type),
      value: Math.round((numOrNull(e.value) ?? 0) * 10) / 10,
    }));
}

export const DEFAULT_PREFS: Prefs = {
  weeklyGoal: 3,
  unitPref: 'kg',
  onboardingDone: false,
  restAlertsEnabled: true,
  keepScreenAwake: true,
};

export function sanitizePrefs(p: unknown): Prefs {
  const src = (p ?? {}) as Record<string, unknown>;
  return {
    weeklyGoal: Math.min(14, Math.max(1, intOr(src.weeklyGoal, DEFAULT_PREFS.weeklyGoal))),
    unitPref: src.unitPref === 'lbs' ? 'lbs' : 'kg',
    onboardingDone: !!src.onboardingDone,
    restAlertsEnabled: src.restAlertsEnabled === undefined ? true : !!src.restAlertsEnabled,
    keepScreenAwake: src.keepScreenAwake === undefined ? true : !!src.keepScreenAwake,
  };
}

/** Crea un ejercicio nuevo listo para guardar. */
export function buildExercise(
  input: { name: string; muscleGroup: MuscleGroup; defaultRest?: number; videoUrl?: string; instructions?: string },
  deviceId: string,
): Exercise {
  const now = nowIso();
  return {
    id: `ex_${uid()}`,
    name: input.name.trim().slice(0, 80),
    muscleGroup: input.muscleGroup,
    defaultRest: Math.max(0, input.defaultRest ?? 90),
    videoUrl: sanitizeVideoUrl(input.videoUrl),
    instructions: (input.instructions ?? '').trim().slice(0, 2000),
    isCustom: true,
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId,
    isDeleted: false,
  };
}
