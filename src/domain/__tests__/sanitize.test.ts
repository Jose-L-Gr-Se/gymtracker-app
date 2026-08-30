import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildExercise,
  sanitizeBodyWeightLog,
  sanitizeExercises,
  sanitizeMeasurements,
  sanitizePrefs,
  sanitizeRoutines,
  sanitizeSessions,
} from '../sanitize';

const DEV = 'dev_test';

describe('sanitizeExercises', () => {
  it('descarta entradas sin id o nombre y normaliza campos', () => {
    const result = sanitizeExercises(
      [
        { id: 'e1', name: 'Press Banca', muscleGroup: 'Pecho', defaultRest: '120' },
        { id: '', name: 'Sin id' },
        { name: 'Sin id tampoco' },
        { id: 'e2', name: 'Raro', muscleGroup: 'NoExiste', defaultRest: 'abc' },
        null,
      ],
      DEV,
    );
    assert.equal(result.length, 2);
    assert.equal(result[0].defaultRest, 120);
    assert.equal(result[1].muscleGroup, 'Otro');
    assert.equal(result[1].defaultRest, 90);
    assert.equal(result[0].deviceId, DEV);
  });

  it('rechaza URLs de vídeo no http(s)', () => {
    const [ex] = sanitizeExercises(
      [{ id: 'e1', name: 'X', videoUrl: 'javascript:alert(1)' }],
      DEV,
    );
    assert.equal(ex.videoUrl, '');
    const [ok] = sanitizeExercises(
      [{ id: 'e1', name: 'X', videoUrl: 'https://youtube.com/watch?v=1' }],
      DEV,
    );
    assert.equal(ok.videoUrl, 'https://youtube.com/watch?v=1');
  });
});

describe('sanitizeRoutines', () => {
  it('normaliza rangos objetivo y desengancha el último ejercicio', () => {
    const [r] = sanitizeRoutines(
      [
        {
          id: 'r1',
          name: 'Push',
          exercises: [
            {
              exerciseId: 'e1',
              exerciseName: 'Press',
              targetSets: 0,
              targetRepsMin: 8,
              targetRepsMax: 5, // max < min → se eleva a min
              linkedToNext: true,
            },
            { exerciseId: 'e2', exerciseName: 'Aperturas', linkedToNext: true },
          ],
        },
      ],
      DEV,
    );
    assert.equal(r.exercises[0].targetSets, 1);
    assert.equal(r.exercises[0].targetRepsMax, 8);
    assert.equal(r.exercises[0].linkedToNext, true);
    assert.equal(r.exercises[1].linkedToNext, false);
  });
});

describe('sanitizeSessions', () => {
  it('deriva fecha y duración cuando faltan', () => {
    const [s] = sanitizeSessions(
      [
        {
          id: 's1',
          routineId: 'r1',
          startTime: '2026-03-01T10:00:00.000Z',
          endTime: '2026-03-01T11:30:00.000Z',
          sessionMood: 9,
          exercises: [
            { exerciseId: 'e1', exerciseName: 'Press', sets: [{ weight: 100, reps: 5, completed: 1 }] },
            { exerciseId: '', exerciseName: 'inválido' },
          ],
        },
      ],
      DEV,
    );
    assert.equal(s.date, '2026-03-01');
    assert.equal(s.durationMin, 90);
    assert.equal(s.sessionMood, 5); // clamp a 1..5
    assert.equal(s.exercises.length, 1);
    assert.equal(s.exercises[0].sets[0].weight, '100');
    assert.equal(s.exercises[0].sets[0].completed, true);
  });
});

describe('sanitizeBodyWeightLog / sanitizeMeasurements', () => {
  it('filtra valores no numéricos y redondea a 1 decimal', () => {
    const log = sanitizeBodyWeightLog([
      { date: '2026-01-01', value: '80.44' },
      { date: '2026-01-02', value: 'abc' },
    ]);
    assert.equal(log.length, 1);
    assert.equal(log[0].value, 80.4);
  });

  it('solo acepta tipos de medida conocidos', () => {
    const list = sanitizeMeasurements([
      { date: '2026-01-01', type: 'Cintura', value: 82 },
      { date: '2026-01-01', type: 'Inventado', value: 82 },
    ]);
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'Cintura');
  });
});

describe('sanitizePrefs', () => {
  it('aplica defaults y clamps', () => {
    const p = sanitizePrefs({ weeklyGoal: 99, unitPref: 'stone' });
    assert.equal(p.weeklyGoal, 14);
    assert.equal(p.unitPref, 'kg');
    assert.equal(p.onboardingDone, false);
    assert.equal(p.restAlertsEnabled, true);
  });
});

describe('buildExercise', () => {
  it('crea un ejercicio custom válido', () => {
    const ex = buildExercise({ name: '  Remo Gironda  ', muscleGroup: 'Espalda' }, DEV);
    assert.equal(ex.name, 'Remo Gironda');
    assert.equal(ex.isCustom, true);
    assert.ok(ex.id.startsWith('ex_'));
    assert.equal(ex.version, 1);
  });
});
