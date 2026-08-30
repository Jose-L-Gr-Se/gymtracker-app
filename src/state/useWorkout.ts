import { create } from 'zustand';

import { clearWorkoutDraft, loadWorkoutDraft, saveWorkoutDraft } from '@/data/repository';
import { getDeviceId } from '@/data/localStore';
import { nowIso } from '@/domain/id';
import type {
  RestTimerState,
  Routine,
  Session,
  SessionExercise,
  SetType,
  WorkoutDraft,
} from '@/domain/types';
import {
  appendSet,
  buildFinishedSession,
  buildInitialExercises,
  cycleSetType,
  fillSetFromLast,
  reconcileExercises,
  removeLastSet,
  resumeEndAtMs,
  toggleSetCompleted,
  updateExerciseNotes,
  updateSetField,
} from '@/domain/workout';

/**
 * Entreno activo. El estado se persiste como borrador en cada mutación para
 * que un cierre de la app (o bloqueo del móvil) nunca pierda el entreno.
 */

interface WorkoutState {
  active: boolean;
  userId: string | null;
  routineId: string;
  routineName: string;
  startTime: string;
  exercises: SessionExercise[];
  routineExercises: Routine['exercises'];
  restTimer: RestTimerState | null;

  /** Restaura un borrador persistido si existe. Devuelve true si lo había. */
  restoreDraft: (userId: string) => Promise<boolean>;
  start: (userId: string, routine: Routine) => Promise<void>;
  /** La rutina se editó a mitad de entreno: reconciliar ejercicios. */
  applyRoutineEdit: (routine: Routine) => void;

  setField: (exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe' | 'rir', value: string) => void;
  /** `lastSets` = series de la sesión anterior: al completar una en blanco se confirman esos valores. */
  toggleCompleted: (exIndex: number, setIndex: number, lastSets?: SessionExercise['sets']) => void;
  cycleType: (exIndex: number, setIndex: number) => void;
  addSet: (exIndex: number, type?: SetType) => void;
  removeSet: (exIndex: number) => void;
  setNotes: (exIndex: number, notes: string) => void;
  fillFromLast: (exIndex: number, setIndex: number, lastSets: SessionExercise['sets']) => void;

  startRest: (seconds: number, exerciseName: string) => void;
  pauseRest: () => void;
  resumeRest: () => void;
  stopRest: () => void;

  finish: (mood: number | null, note: string) => Promise<Session | null>;
  discard: () => Promise<void>;
}

const EMPTY = {
  active: false,
  routineId: '',
  routineName: '',
  startTime: '',
  exercises: [] as SessionExercise[],
  routineExercises: [] as Routine['exercises'],
  restTimer: null as RestTimerState | null,
};

export const useWorkout = create<WorkoutState>((set, get) => {
  const persist = () => {
    const s = get();
    if (!s.active || !s.userId) return;
    const draft: WorkoutDraft = {
      routineId: s.routineId,
      routineName: s.routineName,
      startTime: s.startTime,
      exercises: s.exercises,
      routineExercises: s.routineExercises,
      restTimer: s.restTimer,
      savedAt: nowIso(),
    };
    void saveWorkoutDraft(s.userId, draft);
  };

  const update = (patch: Partial<WorkoutState>) => {
    set(patch);
    persist();
  };

  return {
    ...EMPTY,
    userId: null,

    restoreDraft: async (userId) => {
      const draft = await loadWorkoutDraft(userId);
      if (!draft || !draft.routineId || draft.exercises.length === 0) return false;
      set({
        active: true,
        userId,
        routineId: draft.routineId,
        routineName: draft.routineName,
        startTime: draft.startTime,
        exercises: draft.exercises,
        routineExercises: draft.routineExercises,
        restTimer: draft.restTimer,
      });
      return true;
    },

    start: async (userId, routine) => {
      update({
        active: true,
        userId,
        routineId: routine.id,
        routineName: routine.name,
        startTime: nowIso(),
        exercises: buildInitialExercises(routine),
        routineExercises: routine.exercises,
        restTimer: null,
      });
    },

    applyRoutineEdit: (routine) => {
      const s = get();
      if (!s.active || routine.id !== s.routineId) return;
      update({
        routineName: routine.name,
        routineExercises: routine.exercises,
        exercises: reconcileExercises(routine.exercises, s.exercises),
      });
    },

    setField: (exIndex, setIndex, field, value) =>
      update({ exercises: updateSetField(get().exercises, exIndex, setIndex, field, value) }),
    toggleCompleted: (exIndex, setIndex, lastSets = []) =>
      update({ exercises: toggleSetCompleted(get().exercises, exIndex, setIndex, lastSets) }),
    cycleType: (exIndex, setIndex) => update({ exercises: cycleSetType(get().exercises, exIndex, setIndex) }),
    addSet: (exIndex, type) => update({ exercises: appendSet(get().exercises, exIndex, type) }),
    removeSet: (exIndex) => update({ exercises: removeLastSet(get().exercises, exIndex) }),
    setNotes: (exIndex, notes) => update({ exercises: updateExerciseNotes(get().exercises, exIndex, notes) }),
    fillFromLast: (exIndex, setIndex, lastSets) =>
      update({ exercises: fillSetFromLast(get().exercises, exIndex, setIndex, lastSets) }),

    startRest: (seconds, exerciseName) =>
      update({
        restTimer: {
          endAtMs: Date.now() + seconds * 1000,
          totalSeconds: seconds,
          exerciseName,
          pausedAtMs: null,
        },
      }),
    pauseRest: () => {
      const t = get().restTimer;
      if (!t || t.pausedAtMs !== null) return;
      update({ restTimer: { ...t, pausedAtMs: Date.now() } });
    },
    resumeRest: () => {
      const t = get().restTimer;
      if (!t || t.pausedAtMs === null) return;
      update({ restTimer: { ...t, endAtMs: resumeEndAtMs(t.endAtMs, t.pausedAtMs), pausedAtMs: null } });
    },
    stopRest: () => update({ restTimer: null }),

    finish: async (mood, note) => {
      const s = get();
      if (!s.active || !s.userId) return null;
      const session = buildFinishedSession({
        routineId: s.routineId,
        routineName: s.routineName,
        startTime: s.startTime,
        exercises: s.exercises,
        sessionMood: mood,
        sessionNote: note,
        deviceId: await getDeviceId(),
      });
      await clearWorkoutDraft(s.userId);
      set({ ...EMPTY, userId: s.userId });
      return session;
    },

    discard: async () => {
      const s = get();
      if (s.userId) await clearWorkoutDraft(s.userId);
      set({ ...EMPTY, userId: s.userId });
    },
  };
});
