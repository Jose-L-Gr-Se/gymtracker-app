/**
 * Helpers puros del entreno activo: manipulación de series, reconciliación
 * con la rutina y matemática del temporizador de descanso.
 */
import { localDateKey, nowIso, uid } from './id';
import type {
  Routine,
  RoutineExercise,
  Session,
  SessionExercise,
  SetType,
  WorkoutSet,
  WorkoutTemplate,
} from './types';

export const SET_TYPE_ORDER: SetType[] = ['work', 'warmup', 'drop', 'failure'];
export const SET_TYPE_LABELS: Record<SetType, string> = {
  work: '',
  warmup: 'W',
  drop: 'D',
  failure: 'F',
};

export const nextSetType = (t: SetType): SetType =>
  SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(t) + 1) % SET_TYPE_ORDER.length];

export const createEmptySet = (type: SetType = 'work'): WorkoutSet => ({
  weight: '',
  reps: '',
  rpe: '',
  rir: '',
  completed: false,
  type,
});

/** Crea la entrada de sesión inicial para un ejercicio de rutina. */
export const buildSessionExercise = (re: RoutineExercise): SessionExercise => ({
  exerciseId: re.exerciseId,
  exerciseName: re.exerciseName,
  sets: Array.from({ length: Math.max(1, re.targetSets) }, () => createEmptySet()),
  notes: '',
});

export const buildInitialExercises = (routine: Routine): SessionExercise[] =>
  routine.exercises.map(buildSessionExercise);

/**
 * Convierte una plantilla en ejercicios de rutina conservando los objetivos
 * de reps y RIR que trae (los programas como ATLAS los traen del PDF; las
 * plantillas clásicas los dejan sin definir).
 */
export const templateToRoutineExercises = (template: WorkoutTemplate): RoutineExercise[] =>
  template.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    muscleGroup: e.muscleGroup,
    targetSets: e.targetSets,
    restSeconds: e.restSeconds,
    linkedToNext: false,
    targetRepsMin: e.targetRepsMin ?? null,
    targetRepsMax: e.targetRepsMax ?? null,
    targetRirMin: e.targetRirMin ?? null,
    targetRirMax: e.targetRirMax ?? null,
  }));

const replaceAt = <T>(list: T[], index: number, next: T): T[] =>
  list.map((item, i) => (i === index ? next : item));

export function updateSetField(
  exs: SessionExercise[],
  exIndex: number,
  setIndex: number,
  field: 'weight' | 'reps' | 'rpe' | 'rir',
  value: string,
): SessionExercise[] {
  const ex = exs[exIndex];
  if (!ex || !ex.sets[setIndex]) return exs;
  const sets = replaceAt(ex.sets, setIndex, { ...ex.sets[setIndex], [field]: value });
  return replaceAt(exs, exIndex, { ...ex, sets });
}

const isBlank = (v: string): boolean => v === '' || v === null || v === undefined;

/**
 * Completa (o descompleta) una serie.
 *
 * Al completar una serie en blanco, confirma los valores de la sesión
 * anterior que el usuario ya está viendo como referencia: marcar sin escribir
 * nada es el gesto más frecuente del gimnasio ("hoy igual que la semana
 * pasada"), y guardarla vacía la haría contar en el progreso sin aportar
 * volumen, sin generar PR y sin servir de referencia la próxima sesión.
 *
 * Nunca pisa lo que el usuario ha escrito, no inventa nada si no hay
 * referencia (planchas, carries) y al desmarcar no reescribe lo registrado.
 * Las series extra heredan la última referencia disponible.
 */
export function toggleSetCompleted(
  exs: SessionExercise[],
  exIndex: number,
  setIndex: number,
  lastSets: WorkoutSet[] = [],
): SessionExercise[] {
  const ex = exs[exIndex];
  if (!ex || !ex.sets[setIndex]) return exs;
  const st = ex.sets[setIndex];
  const nextCompleted = !st.completed;
  const ref = nextCompleted && lastSets.length > 0 ? (lastSets[setIndex] ?? lastSets[lastSets.length - 1]) : null;
  const sets = replaceAt(ex.sets, setIndex, {
    ...st,
    completed: nextCompleted,
    weight: ref && isBlank(st.weight) && !isBlank(ref.weight) ? ref.weight : st.weight,
    reps: ref && isBlank(st.reps) && !isBlank(ref.reps) ? ref.reps : st.reps,
  });
  return replaceAt(exs, exIndex, { ...ex, sets });
}

/** ¿Están todas las series de este ejercicio completadas? (para autoavanzar al siguiente). */
export const exerciseIsFullyCompleted = (ex: SessionExercise): boolean =>
  ex.sets.length > 0 && ex.sets.every((s) => s.completed);

export function cycleSetType(exs: SessionExercise[], exIndex: number, setIndex: number): SessionExercise[] {
  const ex = exs[exIndex];
  if (!ex || !ex.sets[setIndex]) return exs;
  const st = ex.sets[setIndex];
  const sets = replaceAt(ex.sets, setIndex, { ...st, type: nextSetType(st.type) });
  return replaceAt(exs, exIndex, { ...ex, sets });
}

export function appendSet(exs: SessionExercise[], exIndex: number, type: SetType = 'work'): SessionExercise[] {
  const ex = exs[exIndex];
  if (!ex) return exs;
  return replaceAt(exs, exIndex, { ...ex, sets: [...ex.sets, createEmptySet(type)] });
}

export function removeLastSet(exs: SessionExercise[], exIndex: number): SessionExercise[] {
  const ex = exs[exIndex];
  if (!ex || ex.sets.length <= 1) return exs;
  return replaceAt(exs, exIndex, { ...ex, sets: ex.sets.slice(0, -1) });
}

export function updateExerciseNotes(exs: SessionExercise[], exIndex: number, notes: string): SessionExercise[] {
  const ex = exs[exIndex];
  if (!ex) return exs;
  return replaceAt(exs, exIndex, { ...ex, notes });
}

/** Copia peso/reps de la última sesión al set indicado (sin marcarlo completado). */
export function fillSetFromLast(
  exs: SessionExercise[],
  exIndex: number,
  setIndex: number,
  lastSets: WorkoutSet[],
): SessionExercise[] {
  const source = lastSets[setIndex] ?? lastSets[lastSets.length - 1];
  if (!source) return exs;
  const ex = exs[exIndex];
  if (!ex || !ex.sets[setIndex]) return exs;
  const st = ex.sets[setIndex];
  const sets = replaceAt(ex.sets, setIndex, { ...st, weight: source.weight, reps: source.reps });
  return replaceAt(exs, exIndex, { ...ex, sets });
}

/** Busca los sets completados de la última sesión que incluyó este ejercicio. */
export function findLastSets(exerciseId: string, sessions: Session[]): WorkoutSet[] {
  const sorted = sessions.slice().sort((a, b) => b.date.localeCompare(a.date));
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex) {
      const done = ex.sets.filter((st) => st.completed);
      if (done.length > 0) return done;
    }
  }
  return [];
}

const setHasProgress = (st: WorkoutSet): boolean =>
  st.completed || st.weight !== '' || st.reps !== '' || st.rpe !== '' || st.rir !== '';

export const exerciseHasProgress = (ex: SessionExercise): boolean =>
  ex.notes.trim() !== '' || ex.sets.some(setHasProgress);

/**
 * Reconciliación cuando la rutina cambia a mitad de entreno: conserva el
 * progreso de ejercicios existentes y añade/quita según la nueva lista.
 */
export function reconcileExercises(
  routineExercises: RoutineExercise[],
  current: SessionExercise[],
): SessionExercise[] {
  const byId = new Map(current.map((ex) => [ex.exerciseId, ex]));
  return routineExercises.map((re) => byId.get(re.exerciseId) ?? buildSessionExercise(re));
}

/** Construye la sesión final a partir del estado del entreno. */
export function buildFinishedSession(input: {
  routineId: string;
  routineName: string;
  startTime: string;
  exercises: SessionExercise[];
  sessionMood: number | null;
  sessionNote: string;
  deviceId: string;
}): Session {
  const end = new Date();
  const start = new Date(input.startTime);
  const now = nowIso();
  return {
    id: `s_${uid()}`,
    routineId: input.routineId,
    routineName: input.routineName,
    startTime: input.startTime,
    endTime: end.toISOString(),
    date: localDateKey(end),
    durationMin: Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
    sessionMood: input.sessionMood,
    sessionNote: input.sessionNote.trim(),
    exercises: input.exercises.filter(exerciseHasProgress),
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: input.deviceId,
    isDeleted: false,
  };
}

export function countCompletedSets(exs: SessionExercise[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  exs.forEach((ex) => {
    total += ex.sets.length;
    done += ex.sets.filter((s) => s.completed).length;
  });
  return { done, total };
}

// ── Temporizador de descanso (matemática pura, sin timers) ────

export const calcRemainingSeconds = (endAtMs: number, nowMs: number = Date.now()): number =>
  Math.max(0, Math.ceil((endAtMs - nowMs) / 1000));

/** Al reanudar tras pausa, desplaza el fin del descanso el tiempo pausado. */
export const resumeEndAtMs = (endAtMs: number, pausedAtMs: number, resumeAtMs: number = Date.now()): number =>
  endAtMs + Math.max(0, resumeAtMs - pausedAtMs);
