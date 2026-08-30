/** Genera un id único ordenable por tiempo (compatible con los ids de la PWA). */
export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Fecha local YYYY-MM-DD (no UTC: una sesión a las 23:30 pertenece a su día local). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
