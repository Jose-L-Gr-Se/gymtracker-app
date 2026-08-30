import { create } from 'zustand';

import { buildOp, enqueueOp, getPendingOps } from '@/data/pendingOps';
import {
  loadDataset,
  saveBodyWeight,
  saveExercises,
  saveMeasurements,
  savePrefs,
  saveRoutines,
  saveSessions,
} from '@/data/repository';
import { bodyWeightRowId, measurementRowId, runSync } from '@/data/syncEngine';
import { nowIso, uid } from '@/domain/id';
import { mergeBodyWeight, mergeById, mergeMeasurements, parsePwaBackup, type PwaImportSummary } from '@/domain/importPwa';
import { buildExercise, DEFAULT_PREFS, sanitizePrefs } from '@/domain/sanitize';
import type {
  BodyWeightEntry,
  Exercise,
  MeasurementEntry,
  MuscleGroup,
  Prefs,
  Routine,
  RoutineExercise,
  Session,
} from '@/domain/types';
import { getDeviceId } from '@/data/localStore';

/**
 * Estado de datos del usuario activo. Cada mutación:
 *  1) actualiza el estado en memoria,
 *  2) persiste la colección en local,
 *  3) encola la operación de sync y dispara un push en segundo plano.
 */

interface AppDataState {
  loaded: boolean;
  userId: string | null;
  isGuest: boolean;
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  bodyWeight: BodyWeightEntry[];
  measurements: MeasurementEntry[];
  prefs: Prefs;
  pendingCount: number;
  syncing: boolean;
  lastSyncError: string;

  hydrate: (userId: string, isGuest: boolean) => Promise<void>;
  reset: () => void;
  sync: () => Promise<void>;

  addExercise: (input: {
    name: string;
    muscleGroup: MuscleGroup;
    defaultRest?: number;
    videoUrl?: string;
    instructions?: string;
  }) => Promise<Exercise>;
  updateExercise: (id: string, patch: Partial<Exercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;

  saveRoutine: (routine: { id?: string; name: string; exercises: RoutineExercise[] }) => Promise<Routine>;
  duplicateRoutine: (id: string) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;

  addSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  addBodyWeight: (entry: BodyWeightEntry) => Promise<void>;
  deleteBodyWeight: (date: string) => Promise<void>;
  addMeasurement: (entry: MeasurementEntry) => Promise<void>;
  deleteMeasurement: (date: string, type: string) => Promise<void>;

  setPrefs: (patch: Partial<Prefs>) => Promise<void>;

  /** Importa un backup JSON exportado desde la PWA, fusionando con los datos locales. */
  importPwaBackup: (rawText: string) => Promise<PwaImportSummary>;
}

export const useAppData = create<AppDataState>((set, get) => {
  const requireUser = (): string => {
    const { userId } = get();
    if (!userId) throw new Error('No hay usuario activo');
    return userId;
  };

  /** Encola op de sync y lanza push en background (solo cuentas en la nube). */
  const queueAndSync = async (op: Parameters<typeof enqueueOp>[1]) => {
    const { userId, isGuest } = get();
    if (!userId || isGuest) return;
    await enqueueOp(userId, op);
    set({ pendingCount: (await getPendingOps(userId)).length });
    void get().sync();
  };

  return {
    loaded: false,
    userId: null,
    isGuest: false,
    exercises: [],
    routines: [],
    sessions: [],
    bodyWeight: [],
    measurements: [],
    prefs: DEFAULT_PREFS,
    pendingCount: 0,
    syncing: false,
    lastSyncError: '',

    hydrate: async (userId, isGuest) => {
      const dataset = await loadDataset(userId);
      const pending = isGuest ? [] : await getPendingOps(userId);
      set({ ...dataset, userId, isGuest, loaded: true, pendingCount: pending.length });
      if (!isGuest) void get().sync();
    },

    reset: () =>
      set({
        loaded: false,
        userId: null,
        isGuest: false,
        exercises: [],
        routines: [],
        sessions: [],
        bodyWeight: [],
        measurements: [],
        prefs: DEFAULT_PREFS,
        pendingCount: 0,
        syncing: false,
        lastSyncError: '',
      }),

    sync: async () => {
      const { userId, isGuest, syncing } = get();
      if (!userId || isGuest || syncing) return;
      set({ syncing: true });
      const result = await runSync(userId);
      // Si el pull trajo cambios, recargar dataset en memoria
      if (result.ok && result.pulled > 0) {
        const dataset = await loadDataset(userId);
        set({ ...dataset });
      }
      set({
        syncing: false,
        pendingCount: result.pendingLeft,
        lastSyncError: result.ok ? '' : result.error,
      });
    },

    addExercise: async (input) => {
      const userId = requireUser();
      const exercise = buildExercise(input, await getDeviceId());
      const next = [...get().exercises, exercise];
      set({ exercises: next });
      await saveExercises(userId, next);
      await queueAndSync(buildOp('exercises', exercise.id, 'upsert', exercise as unknown as Record<string, unknown>));
      return exercise;
    },

    updateExercise: async (id, patch) => {
      const userId = requireUser();
      let updated: Exercise | null = null;
      const next = get().exercises.map((ex) => {
        if (ex.id !== id) return ex;
        updated = { ...ex, ...patch, id, updatedAt: nowIso(), version: ex.version + 1 };
        return updated;
      });
      if (!updated) return;
      set({ exercises: next });
      await saveExercises(userId, next);
      await queueAndSync(buildOp('exercises', id, 'upsert', updated as unknown as Record<string, unknown>));
    },

    deleteExercise: async (id) => {
      const userId = requireUser();
      const target = get().exercises.find((ex) => ex.id === id);
      if (!target) return;
      const next = get().exercises.filter((ex) => ex.id !== id);
      set({ exercises: next });
      await saveExercises(userId, next);
      await queueAndSync(
        buildOp('exercises', id, 'delete', { ...target, isDeleted: true, updatedAt: nowIso() } as unknown as Record<string, unknown>),
      );
    },

    saveRoutine: async (input) => {
      const userId = requireUser();
      const deviceId = await getDeviceId();
      const existing = input.id ? get().routines.find((r) => r.id === input.id) : undefined;
      const now = nowIso();
      const routine: Routine = existing
        ? { ...existing, name: input.name, exercises: input.exercises, updatedAt: now, version: existing.version + 1 }
        : {
            id: `r_${uid()}`,
            name: input.name,
            exercises: input.exercises,
            createdAt: now,
            updatedAt: now,
            version: 1,
            deviceId,
            isDeleted: false,
          };
      const next = existing
        ? get().routines.map((r) => (r.id === routine.id ? routine : r))
        : [...get().routines, routine];
      set({ routines: next });
      await saveRoutines(userId, next);
      await queueAndSync(buildOp('routines', routine.id, 'upsert', routine as unknown as Record<string, unknown>));
      return routine;
    },

    duplicateRoutine: async (id) => {
      const source = get().routines.find((r) => r.id === id);
      if (!source) return;
      await get().saveRoutine({ name: `${source.name} (copia)`, exercises: source.exercises });
    },

    deleteRoutine: async (id) => {
      const userId = requireUser();
      const target = get().routines.find((r) => r.id === id);
      if (!target) return;
      const next = get().routines.filter((r) => r.id !== id);
      set({ routines: next });
      await saveRoutines(userId, next);
      await queueAndSync(
        buildOp('routines', id, 'delete', { ...target, isDeleted: true, updatedAt: nowIso() } as unknown as Record<string, unknown>),
      );
    },

    addSession: async (session) => {
      const userId = requireUser();
      const next = [...get().sessions, session];
      set({ sessions: next });
      await saveSessions(userId, next);
      await queueAndSync(buildOp('sessions', session.id, 'upsert', session as unknown as Record<string, unknown>));
    },

    deleteSession: async (id) => {
      const userId = requireUser();
      const target = get().sessions.find((s) => s.id === id);
      if (!target) return;
      const next = get().sessions.filter((s) => s.id !== id);
      set({ sessions: next });
      await saveSessions(userId, next);
      await queueAndSync(
        buildOp('sessions', id, 'delete', { ...target, isDeleted: true, updatedAt: nowIso() } as unknown as Record<string, unknown>),
      );
    },

    addBodyWeight: async (entry) => {
      const userId = requireUser();
      const next = [...get().bodyWeight.filter((e) => e.date !== entry.date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      set({ bodyWeight: next });
      await saveBodyWeight(userId, next);
      await queueAndSync(buildOp('body_weight', bodyWeightRowId(entry), 'upsert', entry as unknown as Record<string, unknown>));
    },

    deleteBodyWeight: async (date) => {
      const userId = requireUser();
      const target = get().bodyWeight.find((e) => e.date === date);
      if (!target) return;
      const next = get().bodyWeight.filter((e) => e.date !== date);
      set({ bodyWeight: next });
      await saveBodyWeight(userId, next);
      await queueAndSync(buildOp('body_weight', bodyWeightRowId(target), 'delete', target as unknown as Record<string, unknown>));
    },

    addMeasurement: async (entry) => {
      const userId = requireUser();
      const next = [
        ...get().measurements.filter((e) => !(e.date === entry.date && e.type === entry.type)),
        entry,
      ].sort((a, b) => a.date.localeCompare(b.date));
      set({ measurements: next });
      await saveMeasurements(userId, next);
      await queueAndSync(buildOp('measurements', measurementRowId(entry), 'upsert', entry as unknown as Record<string, unknown>));
    },

    deleteMeasurement: async (date, type) => {
      const userId = requireUser();
      const target = get().measurements.find((e) => e.date === date && e.type === type);
      if (!target) return;
      const next = get().measurements.filter((e) => !(e.date === date && e.type === type));
      set({ measurements: next });
      await saveMeasurements(userId, next);
      await queueAndSync(buildOp('measurements', measurementRowId(target), 'delete', target as unknown as Record<string, unknown>));
    },

    setPrefs: async (patch) => {
      const userId = requireUser();
      const prefs = sanitizePrefs({ ...get().prefs, ...patch });
      set({ prefs });
      await savePrefs(userId, prefs);
    },

    importPwaBackup: async (rawText) => {
      const userId = requireUser();
      const deviceId = await getDeviceId();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error('El archivo no es JSON válido.');
      }
      const backup = parsePwaBackup(parsed, deviceId);
      const state = get();

      const exercises = mergeById(state.exercises, backup.exercises);
      const routines = mergeById(state.routines, backup.routines);
      const sessions = mergeById(state.sessions, backup.sessions);
      const bodyWeight = mergeBodyWeight(state.bodyWeight, backup.bodyWeight);
      const measurements = mergeMeasurements(state.measurements, backup.measurements);

      set({
        exercises: exercises.merged,
        routines: routines.merged,
        sessions: sessions.merged,
        bodyWeight: bodyWeight.merged,
        measurements: measurements.merged,
      });
      await Promise.all([
        saveExercises(userId, exercises.merged),
        saveRoutines(userId, routines.merged),
        saveSessions(userId, sessions.merged),
        saveBodyWeight(userId, bodyWeight.merged),
        saveMeasurements(userId, measurements.merged),
      ]);

      // Solo se suben las entidades que el merge marcó como realmente añadidas o actualizadas.
      if (!state.isGuest) {
        const ops = [
          ...exercises.changed.map((e) => buildOp('exercises', e.id, 'upsert', e as unknown as Record<string, unknown>)),
          ...routines.changed.map((r) => buildOp('routines', r.id, 'upsert', r as unknown as Record<string, unknown>)),
          ...sessions.changed.map((s) => buildOp('sessions', s.id, 'upsert', s as unknown as Record<string, unknown>)),
          ...bodyWeight.changed.map((e) => buildOp('body_weight', bodyWeightRowId(e), 'upsert', e as unknown as Record<string, unknown>)),
          ...measurements.changed.map((e) => buildOp('measurements', measurementRowId(e), 'upsert', e as unknown as Record<string, unknown>)),
        ];
        for (const op of ops) {
          await enqueueOp(userId, op);
        }
        if (ops.length > 0) {
          set({ pendingCount: (await getPendingOps(userId)).length });
          void get().sync();
        }
      }

      return {
        exercises: { added: exercises.added, updated: exercises.updated, skipped: exercises.skipped },
        routines: { added: routines.added, updated: routines.updated, skipped: routines.skipped },
        sessions: { added: sessions.added, updated: sessions.updated, skipped: sessions.skipped },
        bodyWeight: { added: bodyWeight.added, updated: bodyWeight.updated, skipped: bodyWeight.skipped },
        measurements: { added: measurements.added, updated: measurements.updated, skipped: measurements.skipped },
      };
    },
  };
});
