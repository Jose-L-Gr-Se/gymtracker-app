import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatWeight, toDisplayWeight, toStoredKg, weightUnitLabel } from '../units';

describe('conversión de unidades', () => {
  it('en kg es identidad: no toca el número', () => {
    assert.equal(toStoredKg(100, 'kg'), 100);
    assert.equal(toDisplayWeight(100, 'kg'), 100);
    assert.equal(toStoredKg(62.5, 'kg'), 62.5);
  });

  it('escribir 225 lbs guarda ~102.06 kg', () => {
    const kg = toStoredKg(225, 'lbs');
    assert.ok(Math.abs(kg - 102.06) < 0.01, `esperaba ~102.06, obtuve ${kg}`);
  });

  it('ida y vuelta lbs → kg → lbs conserva el valor que ve el usuario', () => {
    for (const lbs of [45, 135, 225, 315, 405]) {
      const kg = toStoredKg(lbs, 'lbs');
      assert.equal(toDisplayWeight(kg, 'lbs'), lbs, `round-trip roto para ${lbs} lbs`);
    }
  });

  it('formatWeight convierte al mostrar y no altera el dato canónico', () => {
    // 100 kg almacenados se ven como 220.5 lbs
    assert.equal(formatWeight(100, 'lbs'), '220.5');
    assert.equal(formatWeight(100, 'kg'), '100');
    assert.equal(formatWeight('', 'kg'), '—');
    assert.equal(formatWeight('abc', 'kg'), '—');
  });

  it('etiquetas de unidad', () => {
    assert.equal(weightUnitLabel('kg'), 'kg');
    assert.equal(weightUnitLabel('lbs'), 'lbs');
  });
});
