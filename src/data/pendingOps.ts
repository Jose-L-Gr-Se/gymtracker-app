import { uid } from '@/domain/id';
import { readJson, writeJson, STORE_KEYS } from './localStore';

/**
 * Cola de operaciones pendientes de sincronizar. Cada mutación local encola
 * una operación; el motor de sync las envía en orden y las retira al
 * confirmarse. Si el dispositivo está offline la cola persiste.
 */

export type SyncEntity = 'exercises' | 'routines' | 'sessions' | 'body_weight' | 'measurements';

export interface PendingOp {
  id: string;
  entity: SyncEntity;
  entityId: string;
  type: 'upsert' | 'delete';
  /** Snapshot completo de la entidad en el momento de la mutación. */
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  lastError: string;
}

const MAX_PENDING_OPS = 1000;

export async function getPendingOps(userId: string): Promise<PendingOp[]> {
  return (await readJson<PendingOp[]>(userId, STORE_KEYS.pendingOps)) ?? [];
}

export async function savePendingOps(userId: string, ops: PendingOp[]): Promise<void> {
  await writeJson(userId, STORE_KEYS.pendingOps, ops.slice(-MAX_PENDING_OPS));
}

export function buildOp(
  entity: SyncEntity,
  entityId: string,
  type: PendingOp['type'],
  payload: Record<string, unknown>,
): PendingOp {
  return {
    id: uid(),
    entity,
    entityId,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    lastError: '',
  };
}

/**
 * Encola una operación colapsando las anteriores sobre la misma entidad+id:
 * solo interesa el último estado, no el historial de ediciones.
 */
export async function enqueueOp(userId: string, op: PendingOp): Promise<void> {
  const ops = await getPendingOps(userId);
  const filtered = ops.filter((o) => !(o.entity === op.entity && o.entityId === op.entityId));
  await savePendingOps(userId, [...filtered, op]);
}
