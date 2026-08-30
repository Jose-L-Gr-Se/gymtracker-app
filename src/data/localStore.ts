import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Almacén local JSON sobre AsyncStorage, con espacio de nombres por usuario:
 * los datos de cada cuenta viven bajo `gt:u:<userId>:<clave>` y nunca se
 * mezclan entre cuentas. `local` es el espacio para uso sin sesión.
 */

export const STORE_KEYS = {
  exercises: 'exercises',
  routines: 'routines',
  sessions: 'sessions',
  bodyWeight: 'body-weight',
  measurements: 'measurements',
  prefs: 'prefs',
  profile: 'profile',
  pendingOps: 'pending-ops',
  workoutDraft: 'workout-draft',
  syncMeta: 'sync-meta',
  seeded: 'seeded',
} as const;

export type StoreKey = (typeof STORE_KEYS)[keyof typeof STORE_KEYS];

const DEVICE_ID_KEY = 'gt:device-id';

export const scopedKey = (userId: string, key: StoreKey): string => `gt:u:${userId}:${key}`;

export async function readJson<T>(userId: string, key: StoreKey): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(scopedKey(userId, key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn('[localStore] read failed', key, e);
    return null;
  }
}

export async function writeJson(userId: string, key: StoreKey, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(scopedKey(userId, key), JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[localStore] write failed', key, e);
    return false;
  }
}

export async function removeKey(userId: string, key: StoreKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(scopedKey(userId, key));
  } catch (e) {
    console.warn('[localStore] remove failed', key, e);
  }
}

let cachedDeviceId: string | null = null;

/** Id estable de este dispositivo (para trazabilidad de sync). */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cachedDeviceId = existing;
      return existing;
    }
    const next = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, next);
    cachedDeviceId = next;
    return next;
  } catch {
    cachedDeviceId = cachedDeviceId ?? `dev_mem_${Math.random().toString(36).slice(2, 11)}`;
    return cachedDeviceId;
  }
}
