import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_EXERCISES, MUSCLE_GROUPS, TEMPLATE_GROUPS, WORKOUT_TEMPLATES } from '../constants';
import { templateToRoutineExercises } from '../workout';

describe('biblioteca de ejercicios', () => {
  it('no tiene ids duplicados', () => {
    const ids = DEFAULT_EXERCISES.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('todos los grupos musculares son válidos', () => {
    DEFAULT_EXERCISES.forEach((e) => {
      assert.ok(MUSCLE_GROUPS.includes(e.muscleGroup), `${e.name} tiene grupo inválido: ${e.muscleGroup}`);
    });
  });

  it('incluye los 29 ejercicios de ATLAS (e35–e63)', () => {
    for (let i = 35; i <= 63; i++) {
      assert.ok(
        DEFAULT_EXERCISES.some((e) => e.id === `e${i}`),
        `falta el ejercicio e${i} de ATLAS`,
      );
    }
  });
});

describe('plantillas', () => {
  it('toda plantilla referencia ejercicios que existen en la biblioteca', () => {
    const known = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    WORKOUT_TEMPLATES.forEach((t) => {
      t.exercises.forEach((ex) => {
        assert.ok(known.has(ex.exerciseId), `${t.name} referencia ${ex.exerciseId}, que no existe`);
      });
    });
  });

  it('el nombre de cada ejercicio coincide con el de la biblioteca', () => {
    const nameById = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e.name]));
    WORKOUT_TEMPLATES.forEach((t) => {
      t.exercises.forEach((ex) => {
        assert.equal(ex.exerciseName, nameById.get(ex.exerciseId), `nombre desincronizado en ${t.name}`);
      });
    });
  });

  it('incluye las 8 sesiones del programa ATLAS', () => {
    const atlas = WORKOUT_TEMPLATES.filter((t) => t.id.startsWith('tpl-atlas-'));
    assert.equal(atlas.length, 8);
  });

  it('no hay ids de plantilla duplicados', () => {
    const ids = WORKOUT_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('cada plantilla cae exactamente en un grupo del selector', () => {
    WORKOUT_TEMPLATES.forEach((t) => {
      const matches = TEMPLATE_GROUPS.filter((g) => g.match(t));
      assert.equal(matches.length, 1, `${t.name} encaja en ${matches.length} grupos`);
    });
  });

  it('templateToRoutineExercises conserva los objetivos de reps y RIR', () => {
    const upperA = WORKOUT_TEMPLATES.find((t) => t.id === 'tpl-atlas-upper-a');
    assert.ok(upperA);
    const exercises = templateToRoutineExercises(upperA);
    const press = exercises.find((e) => e.exerciseId === 'e1');
    assert.ok(press);
    assert.equal(press.targetRepsMin, 4);
    assert.equal(press.targetRepsMax, 6);
    assert.equal(press.targetRirMin, 2);
    // Los que no definen RIR quedan en null, no en undefined
    const carry = exercises.find((e) => e.exerciseId === 'e37');
    assert.ok(carry);
    assert.equal(carry.targetRirMin, null);
    assert.equal(carry.linkedToNext, false);
  });
});
