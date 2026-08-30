/**
 * Importación de backups de la PWA GymTracker (formato buildBackup: ver
 * gymtracker/src/core.js). Es un superconjunto compatible del modelo actual,
 * así que la sanitización estándar del dominio ya valida y normaliza todo;
 * aquí solo se añade la validación de forma del backup y el merge con los
 * datos locales existentes (last-write-wins por updatedAt, nunca se pierde
 * un cambio local más reciente que el importado).
 */
import {
  sanitizeBodyWeightLog,
  sanitizeExercises,
  sanitizeMeasurements,
  sanitizeRoutines,
  sanitizeSessions,
} from './sanitize';
import type {
  BodyWeightEntry,
  EntityMeta,
  Exercise,
  MeasurementEntry,
  Routine,
  Session,
} from './types';

export interface ParsedPwaBackup {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  bodyWeight: BodyWeightEntry[];
  measurements: MeasurementEntry[];
  exportedAt: string | null;
}

export class InvalidBackupError extends Error {}

/** Valida y sanitiza un backup de la PWA. Lanza InvalidBackupError si no tiene forma reconocible. */
export function parsePwaBackup(raw: unknown, deviceId: string): ParsedPwaBackup {
  if (!raw || typeof raw !== 'object') {
    throw new InvalidBackupError('El archivo no contiene un backup válido.');
  }
  const root = raw as Record<string, unknown>;
  const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null;
  if (!data) {
    throw new InvalidBackupError('El backup no tiene la sección "data" esperada.');
  }
  const exercises = sanitizeExercises(data.exercises, deviceId);
  const routines = sanitizeRoutines(data.routines, deviceId);
  const sessions = sanitizeSessions(data.sessions, deviceId);
  const bodyWeight = sanitizeBodyWeightLog(data.bodyWeight);
  const measurements = sanitizeMeasurements(data.measurements);

  if (exercises.length === 0 && routines.length === 0 && sessions.length === 0 && bodyWeight.length === 0 && measurements.length === 0) {
    throw new InvalidBackupError('El backup no contiene datos reconocibles (ejercicios, rutinas o sesiones).');
  }

  return {
    exercises,
    routines,
    sessions,
    bodyWeight,
    measurements,
    exportedAt: typeof root.exportedAt === 'string' ? root.exportedAt : null,
  };
}

export interface MergeCounts {
  added: number;
  updated: number;
  skipped: number;
}

export interface MergeResult<T> extends MergeCounts {
  merged: T[];
  /** Elementos importados que realmente se añadieron o actualizaron (para encolar su sync). */
  changed: T[];
}

/** Fusiona por id: el más reciente (updatedAt) gana; nunca se pisa un cambio local más nuevo. */
export function mergeById<T extends { id: string } & EntityMeta>(local: T[], incoming: T[]): MergeResult<T> {
  const byId = new Map(local.map((item) => [item.id, item]));
  const changed: T[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  incoming.forEach((item) => {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      changed.push(item);
      added++;
    } else if (item.updatedAt > existing.updatedAt) {
      byId.set(item.id, item);
      changed.push(item);
      updated++;
    } else {
      skipped++;
    }
  });
  return { merged: [...byId.values()], changed, added, updated, skipped };
}

/** Peso corporal: una entrada por fecha, sin metadatos de versión — el valor importado gana solo si no existe ya esa fecha. */
export function mergeBodyWeight(local: BodyWeightEntry[], incoming: BodyWeightEntry[]): MergeResult<BodyWeightEntry> {
  const byDate = new Map(local.map((e) => [e.date, e]));
  const changed: BodyWeightEntry[] = [];
  let added = 0;
  let skipped = 0;
  incoming.forEach((entry) => {
    if (byDate.has(entry.date)) {
      skipped++;
    } else {
      byDate.set(entry.date, entry);
      changed.push(entry);
      added++;
    }
  });
  return {
    merged: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    changed,
    added,
    updated: 0,
    skipped,
  };
}

/** Medidas: una entrada por fecha+tipo. */
export function mergeMeasurements(local: MeasurementEntry[], incoming: MeasurementEntry[]): MergeResult<MeasurementEntry> {
  const keyOf = (e: MeasurementEntry) => `${e.date}::${e.type}`;
  const byKey = new Map(local.map((e) => [keyOf(e), e]));
  const changed: MeasurementEntry[] = [];
  let added = 0;
  let skipped = 0;
  incoming.forEach((entry) => {
    const key = keyOf(entry);
    if (byKey.has(key)) {
      skipped++;
    } else {
      byKey.set(key, entry);
      changed.push(entry);
      added++;
    }
  });
  return {
    merged: [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date)),
    changed,
    added,
    updated: 0,
    skipped,
  };
}

export interface PwaImportSummary {
  exercises: MergeCounts;
  routines: MergeCounts;
  sessions: MergeCounts;
  bodyWeight: MergeCounts;
  measurements: MergeCounts;
}

export const totalImported = (summary: PwaImportSummary): number =>
  Object.values(summary).reduce((sum, c) => sum + c.added + c.updated, 0);
