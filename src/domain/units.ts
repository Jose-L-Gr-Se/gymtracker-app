import type { WeightUnit } from './types';

export const KG_TO_LB = 2.20462;

/** Convierte un peso almacenado en kg a la unidad de visualización. */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const v = unit === 'lbs' ? kg * KG_TO_LB : kg;
  return Math.round(v * 10) / 10;
}

/** Convierte un valor introducido por el usuario (en su unidad) a kg canónicos. */
export function toStoredKg(value: number, unit: WeightUnit): number {
  const kg = unit === 'lbs' ? value / KG_TO_LB : value;
  return Math.round(kg * 100) / 100;
}

/** Formatea un peso en kg para mostrar ("—" si no es numérico). */
export function formatWeight(value: number | string, unit: WeightUnit): string {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) return '—';
  const v = toDisplayWeight(n, unit);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'lbs' ? 'lbs' : 'kg';
}
