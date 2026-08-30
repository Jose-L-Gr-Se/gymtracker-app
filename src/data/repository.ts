import { DEFAULT_EXERCISES } from '@/domain/constants';
import { nowIso } from '@/domain/id';
import {
  DEFAULT_PREFS,
  sanitizeBodyWeightLog,
  sanitizeExercises,
  sanitizeMeasurements,
  sanitizePrefs,
  sanitizeRoutines,
  sanitizeSessions,
} from '@/domain/sanitize';
import type {
  BodyWeightEntry,
  Exercise,
  MeasurementEntry,
  Prefs,
  Routine,
  Session,
  WorkoutDraft,
} from '@/domain/types';

import { getDeviceId, readJson, removeKey, STORE_KEYS, writeJson } from './localStore';

/**
 * Repositorio local: única puerta de lectura/escritura de colecciones.
 * Todo lo que entra se sanitiza, de modo que datos corruptos o antiguos
 * nunca llegan a la UI.
 */

export interface UserDataset {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  bodyWeight: BodyWeightEntry[];
  measurements: MeasurementEntry[];
  prefs: Prefs;
}

export async function loadDataset(userId: string): Promise<UserDataset> {
  const deviceId = await getDeviceId();
  const [exercisesRaw, routinesRaw, sessionsRaw, bodyWeightRaw, measurementsRaw, prefsRaw, seeded] =
    await Promise.all([
      readJson(userId, STORE_KEYS.exercises),
      readJson(userId, STORE_KEYS.routines),
      readJson(userId, STORE_KEYS.sessions),
      readJson(userId, STORE_KEYS.bodyWeight),
      readJson(userId, STORE_KEYS.measurements),
      readJson(userId, STORE_KEYS.prefs),
      readJson<boolean>(userId, STORE_KEYS.seeded),
    ]);

  let exercises = sanitizeExercises(exercisesRaw, deviceId);
  if (exercises.length === 0 && !seeded) {
    const now = nowIso();
    exercises = sanitizeExercises(
      DEFAULT_EXERCISES.map((e) => ({ ...e, isCustom: false, createdAt: now, updatedAt: now })),
      deviceId,
    );
    await Promise.all([
      writeJson(userId, STORE_KEYS.exercises, exercises),
      writeJson(userId, STORE_KEYS.seeded, true),
    ]);
  }

  return {
    exercises,
    routines: sanitizeRoutines(routinesRaw, deviceId),
    sessions: sanitizeSessions(sessionsRaw, deviceId),
    bodyWeight: sanitizeBodyWeightLog(bodyWeightRaw),
    measurements: sanitizeMeasurements(measurementsRaw),
    prefs: prefsRaw ? sanitizePrefs(prefsRaw) : DEFAULT_PREFS,
  };
}

export const saveExercises = (userId: string, list: Exercise[]) =>
  writeJson(userId, STORE_KEYS.exercises, list);
export const saveRoutines = (userId: string, list: Routine[]) =>
  writeJson(userId, STORE_KEYS.routines, list);
export const saveSessions = (userId: string, list: Session[]) =>
  writeJson(userId, STORE_KEYS.sessions, list);
export const saveBodyWeight = (userId: string, list: BodyWeightEntry[]) =>
  writeJson(userId, STORE_KEYS.bodyWeight, list);
export const saveMeasurements = (userId: string, list: MeasurementEntry[]) =>
  writeJson(userId, STORE_KEYS.measurements, list);
export const savePrefs = (userId: string, prefs: Prefs) => writeJson(userId, STORE_KEYS.prefs, prefs);

export const loadWorkoutDraft = (userId: string) => readJson<WorkoutDraft>(userId, STORE_KEYS.workoutDraft);
export const saveWorkoutDraft = (userId: string, draft: WorkoutDraft) =>
  writeJson(userId, STORE_KEYS.workoutDraft, draft);
export const clearWorkoutDraft = (userId: string) => removeKey(userId, STORE_KEYS.workoutDraft);
