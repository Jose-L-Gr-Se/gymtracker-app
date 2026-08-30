import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  InvalidBackupError,
  mergeBodyWeight,
  mergeById,
  mergeMeasurements,
  parsePwaBackup,
  totalImported,
} from '../importPwa';
import type { Exercise } from '../types';

const DEV = 'dev_test';

const mkExercise = (id: string, updatedAt: string, name = `Ejercicio ${id}`): Exercise => ({
  id,
  name,
  muscleGroup: 'Pecho',
  defaultRest: 90,
  videoUrl: '',
  instructions: '',
  isCustom: false,
  createdAt: updatedAt,
  updatedAt,
  version: 1,
  deviceId: DEV,
  isDeleted: false,
});

describe('parsePwaBackup', () => {
  it('rechaza entradas sin forma de backup', () => {
    assert.throws(() => parsePwaBackup(null, DEV), InvalidBackupError);
    assert.throws(() => parsePwaBackup({}, DEV), InvalidBackupError);
    assert.throws(() => parsePwaBackup({ data: {} }, DEV), InvalidBackupError);
    assert.throws(() => parsePwaBackup({ data: { exercises: [{ id: '', name: '' }] } }, DEV), InvalidBackupError);
  });

  it('sanitiza un backup válido de la PWA', () => {
    const parsed = parsePwaBackup(
      {
        app: 'GymTracker',
        exportedAt: '2026-01-01T00:00:00.000Z',
        schemaVersion: 2,
        data: {
          exercises: [{ id: 'e1', name: 'Press Banca', muscleGroup: 'Pecho' }],
          routines: [{ id: 'r1', name: 'Push', exercises: [{ exerciseId: 'e1', exerciseName: 'Press Banca' }] }],
          sessions: [{ id: 's1', routineId: 'r1', startTime: '2026-01-01T10:00:00.000Z', endTime: '2026-01-01T11:00:00.000Z' }],
          bodyWeight: [{ date: '2026-01-01', value: 80 }],
          measurements: [{ date: '2026-01-01', type: 'Cintura', value: 82 }],
        },
      },
      DEV,
    );
    assert.equal(parsed.exercises.length, 1);
    assert.equal(parsed.routines.length, 1);
    assert.equal(parsed.sessions.length, 1);
    assert.equal(parsed.bodyWeight.length, 1);
    assert.equal(parsed.measurements.length, 1);
    assert.equal(parsed.exportedAt, '2026-01-01T00:00:00.000Z');
  });
});

describe('mergeById', () => {
  it('añade lo que no existe localmente', () => {
    const result = mergeById<Exercise>([], [mkExercise('e1', '2026-01-01T00:00:00.000Z')]);
    assert.equal(result.added, 1);
    assert.equal(result.merged.length, 1);
  });

  it('actualiza solo si el importado es más reciente', () => {
    const local = [mkExercise('e1', '2026-01-10T00:00:00.000Z', 'Nombre local')];
    const newer = mergeById(local, [mkExercise('e1', '2026-01-20T00:00:00.000Z', 'Nombre importado')]);
    assert.equal(newer.updated, 1);
    assert.equal(newer.merged[0].name, 'Nombre importado');

    const older = mergeById(local, [mkExercise('e1', '2026-01-05T00:00:00.000Z', 'Nombre viejo')]);
    assert.equal(older.skipped, 1);
    assert.equal(older.merged[0].name, 'Nombre local');
  });
});

describe('mergeBodyWeight / mergeMeasurements', () => {
  it('no pisa una entrada local existente en la misma fecha', () => {
    const local = [{ date: '2026-01-01', value: 80, note: '' }];
    const result = mergeBodyWeight(local, [
      { date: '2026-01-01', value: 99, note: '' },
      { date: '2026-01-02', value: 79, note: '' },
    ]);
    assert.equal(result.added, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.merged.find((e) => e.date === '2026-01-01')?.value, 80);
  });

  it('distingue por fecha + tipo de medida', () => {
    const local = [{ date: '2026-01-01', type: 'Cintura', value: 82 }];
    const result = mergeMeasurements(local, [
      { date: '2026-01-01', type: 'Cintura', value: 90 },
      { date: '2026-01-01', type: 'Pecho', value: 100 },
    ]);
    assert.equal(result.added, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.merged.length, 2);
  });
});

describe('totalImported', () => {
  it('suma altas y actualizaciones de todas las colecciones', () => {
    const summary = {
      exercises: { added: 2, updated: 1, skipped: 0 },
      routines: { added: 1, updated: 0, skipped: 0 },
      sessions: { added: 10, updated: 2, skipped: 3 },
      bodyWeight: { added: 5, updated: 0, skipped: 1 },
      measurements: { added: 0, updated: 0, skipped: 0 },
    };
    assert.equal(totalImported(summary), 21);
  });
});
