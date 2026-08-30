import { getSupabase } from '@/services/supabase';
import { getDeviceId, readJson, STORE_KEYS, writeJson } from './localStore';
import { getPendingOps, savePendingOps, type PendingOp, type SyncEntity } from './pendingOps';
import {
  loadDataset,
  saveBodyWeight,
  saveExercises,
  saveMeasurements,
  saveRoutines,
  saveSessions,
} from './repository';
import {
  sanitizeBodyWeightLog,
  sanitizeExercise,
  sanitizeMeasurements,
  sanitizeRoutine,
  sanitizeSession,
} from '@/domain/sanitize';
import type { BodyWeightEntry, MeasurementEntry } from '@/domain/types';

/**
 * Motor de sincronización offline-first:
 *  1) push — envía la cola de operaciones pendientes (upsert/delete) a Supabase.
 *  2) pull — trae filas con updated_at posterior al último pull y las fusiona
 *     en local con last-write-wins por updatedAt de la entidad.
 *
 * La app siempre lee/escribe en local; la nube es una réplica. Sin conexión
 * todo sigue funcionando y la cola se vacía al recuperarla.
 */

const TABLE_BY_ENTITY: Record<SyncEntity, string> = {
  exercises: 'exercises',
  routines: 'routines',
  sessions: 'sessions',
  body_weight: 'body_weight_entries',
  measurements: 'measurements',
};

interface SyncMeta {
  lastPulledAt: string;
  lastPushedAt: string;
  lastError: string;
}

const DEFAULT_SYNC_META: SyncMeta = { lastPulledAt: '', lastPushedAt: '', lastError: '' };

export async function getSyncMeta(userId: string): Promise<SyncMeta> {
  return (await readJson<SyncMeta>(userId, STORE_KEYS.syncMeta)) ?? DEFAULT_SYNC_META;
}

const setSyncMeta = async (userId: string, patch: Partial<SyncMeta>) => {
  const current = await getSyncMeta(userId);
  await writeJson(userId, STORE_KEYS.syncMeta, { ...current, ...patch });
};

const MAX_ATTEMPTS = 8;

async function pushPending(userId: string): Promise<{ pushed: number; failed: number }> {
  const supabase = getSupabase();
  if (!supabase) return { pushed: 0, failed: 0 };
  const ops = await getPendingOps(userId);
  if (ops.length === 0) return { pushed: 0, failed: 0 };

  const remaining: PendingOp[] = [];
  let pushed = 0;

  for (const op of ops) {
    const table = TABLE_BY_ENTITY[op.entity];
    const row = {
      id: op.entityId,
      user_id: userId,
      data: op.type === 'delete' ? { ...op.payload, isDeleted: true } : op.payload,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from(table).upsert(row, { onConflict: 'user_id,id' });
    if (error) {
      const attemptCount = op.attemptCount + 1;
      if (attemptCount < MAX_ATTEMPTS) {
        remaining.push({ ...op, attemptCount, lastError: error.message });
      } else {
        console.warn('[sync] op descartada tras reintentos', op.entity, op.entityId, error.message);
      }
    } else {
      pushed++;
    }
  }

  await savePendingOps(userId, remaining);
  if (pushed > 0) await setSyncMeta(userId, { lastPushedAt: new Date().toISOString() });
  return { pushed, failed: remaining.length };
}

interface CloudRow {
  id: string;
  data: Record<string, unknown>;
  updated_at: string;
}

const entityUpdatedAt = (e: { updatedAt?: unknown }): string =>
  typeof e.updatedAt === 'string' ? e.updatedAt : '';

async function pullChanges(userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const meta = await getSyncMeta(userId);
  const since = meta.lastPulledAt;
  const pullStartedAt = new Date().toISOString();
  const deviceId = await getDeviceId();
  const dataset = await loadDataset(userId);
  const pendingIds = new Set((await getPendingOps(userId)).map((o) => `${o.entity}:${o.entityId}`));
  let merged = 0;

  const fetchRows = async (entity: SyncEntity): Promise<CloudRow[]> => {
    let query = supabase.from(TABLE_BY_ENTITY[entity]).select('id,data,updated_at').eq('user_id', userId);
    if (since) query = query.gt('updated_at', since);
    const { data, error } = await query;
    if (error) throw new Error(`${entity}: ${error.message}`);
    return (data ?? []) as CloudRow[];
  };

  // Entidades con metadatos propios: merge por updatedAt, respetando cambios locales pendientes
  const mergeEntity = <T extends { id: string; updatedAt: string; isDeleted: boolean }>(
    entity: SyncEntity,
    local: T[],
    rows: CloudRow[],
    sanitize: (raw: Record<string, unknown>) => T | null,
  ): T[] => {
    const byId = new Map(local.map((e) => [e.id, e]));
    rows.forEach((row) => {
      if (pendingIds.has(`${entity}:${row.id}`)) return; // el cambio local aún no subido gana
      const incoming = sanitize({ ...row.data, id: row.id });
      if (!incoming) return;
      const existing = byId.get(incoming.id);
      if (!existing || entityUpdatedAt(incoming) >= entityUpdatedAt(existing)) {
        byId.set(incoming.id, incoming);
        merged++;
      }
    });
    return [...byId.values()].filter((e) => !e.isDeleted);
  };

  const [exRows, rtRows, ssRows, bwRows, msRows] = await Promise.all([
    fetchRows('exercises'),
    fetchRows('routines'),
    fetchRows('sessions'),
    fetchRows('body_weight'),
    fetchRows('measurements'),
  ]);

  if (exRows.length) {
    await saveExercises(
      userId,
      mergeEntity('exercises', dataset.exercises, exRows, (raw) => sanitizeExercise(raw, deviceId)),
    );
  }
  if (rtRows.length) {
    await saveRoutines(
      userId,
      mergeEntity('routines', dataset.routines, rtRows, (raw) => sanitizeRoutine(raw, deviceId)),
    );
  }
  if (ssRows.length) {
    await saveSessions(
      userId,
      mergeEntity('sessions', dataset.sessions, ssRows, (raw) => sanitizeSession(raw, deviceId)),
    );
  }

  // Entradas sin metadatos (id determinista por fecha): la nube gana si hay fila más nueva
  if (bwRows.length) {
    const byDate = new Map(dataset.bodyWeight.map((e) => [e.date, e]));
    bwRows.forEach((row) => {
      if (pendingIds.has(`body_weight:${row.id}`)) return;
      const [entry] = sanitizeBodyWeightLog([row.data]);
      if (!entry) return;
      if ((row.data as { isDeleted?: boolean }).isDeleted) byDate.delete(entry.date);
      else byDate.set(entry.date, entry);
      merged++;
    });
    await saveBodyWeight(userId, [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
  }
  if (msRows.length) {
    const keyOf = (e: MeasurementEntry) => `${e.date}:${e.type}`;
    const byKey = new Map(dataset.measurements.map((e) => [keyOf(e), e]));
    msRows.forEach((row) => {
      if (pendingIds.has(`measurements:${row.id}`)) return;
      const [entry] = sanitizeMeasurements([row.data]);
      if (!entry) return;
      if ((row.data as { isDeleted?: boolean }).isDeleted) byKey.delete(keyOf(entry));
      else byKey.set(keyOf(entry), entry);
      merged++;
    });
    await saveMeasurements(userId, [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date)));
  }

  await setSyncMeta(userId, { lastPulledAt: pullStartedAt, lastError: '' });
  return merged;
}

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  pendingLeft: number;
  error: string;
}

let syncing = false;

/** Ejecuta un ciclo completo push+pull. Seguro frente a llamadas concurrentes. */
export async function runSync(userId: string): Promise<SyncResult> {
  if (syncing || !getSupabase()) {
    const pending = await getPendingOps(userId);
    return { ok: false, pushed: 0, pulled: 0, pendingLeft: pending.length, error: syncing ? 'sync-in-progress' : 'not-configured' };
  }
  syncing = true;
  try {
    const { pushed, failed } = await pushPending(userId);
    const pulled = await pullChanges(userId);
    return { ok: true, pushed, pulled, pendingLeft: failed, error: '' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setSyncMeta(userId, { lastError: message });
    const pending = await getPendingOps(userId);
    return { ok: false, pushed: 0, pulled: 0, pendingLeft: pending.length, error: message };
  } finally {
    syncing = false;
  }
}

/** Ids deterministas para entradas sin id propio. */
export const bodyWeightRowId = (entry: BodyWeightEntry): string => `bw_${entry.date}`;
export const measurementRowId = (entry: MeasurementEntry): string =>
  `ms_${entry.date}_${entry.type.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '')}`;
