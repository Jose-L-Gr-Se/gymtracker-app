import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calcAllPRs,
  calcBodyWeightTrend,
  calcExerciseProgression,
  calcInsights,
  calcPeriodComparison,
  calcProjectedProgress,
  calcRepRangeDistribution,
  calcSuggestion,
  calcWeeklyAlerts,
  calcWeeklyMuscleLoad,
  calcWeeklyVolumeTrend,
  epley1Rm,
  sessionVolume,
} from '../analytics';
import type { Exercise, Routine } from '../types';
import { daysAgo, mkDoneSet, mkSession, mkSessionExercise, mkSet } from './helpers';

const mkExercise = (id: string, muscleGroup: Exercise['muscleGroup']): Exercise => ({
  id,
  name: `Ejercicio ${id}`,
  muscleGroup,
  defaultRest: 90,
  videoUrl: '',
  instructions: '',
  isCustom: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  deviceId: 'dev_test',
  isDeleted: false,
});

const mkRoutine = (id: string, name: string): Routine => ({
  id,
  name,
  exercises: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  deviceId: 'dev_test',
  isDeleted: false,
});

describe('sessionVolume / epley1Rm', () => {
  it('suma solo series completadas', () => {
    const s = mkSession(daysAgo(0), [
      mkSessionExercise('e1', [mkDoneSet(100, 5), mkSet({ weight: '100', reps: '5', completed: false })]),
    ]);
    assert.equal(sessionVolume(s), 500);
  });

  it('epley: 100kg x 10 ≈ 133', () => {
    assert.equal(epley1Rm(100, 10), 133);
    assert.equal(epley1Rm(0, 10), 0);
    assert.equal(epley1Rm(100, 0), 0);
  });
});

describe('calcInsights', () => {
  it('cuenta sesiones y volumen de los últimos 7 días', () => {
    const sessions = [
      mkSession(daysAgo(1), [mkSessionExercise('e1', [mkDoneSet(100, 10)])]),
      mkSession(daysAgo(3), [mkSessionExercise('e1', [mkDoneSet(50, 10)])]),
      mkSession(daysAgo(20), [mkSessionExercise('e1', [mkDoneSet(200, 10)])]),
    ];
    const insights = calcInsights(sessions);
    assert.equal(insights.sessions7, 2);
    assert.equal(insights.volume7, 1500);
  });

  it('calcula racha de días consecutivos terminando hoy o ayer', () => {
    const sessions = [
      mkSession(daysAgo(1), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(2), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(3), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(5), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
    ];
    assert.equal(calcInsights(sessions).streak, 3);
  });

  it('cuenta PRs cronológicamente', () => {
    const sessions = [
      mkSession(daysAgo(10), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(2), [mkSessionExercise('e1', [mkDoneSet(110, 5)])]),
    ];
    const insights = calcInsights(sessions);
    assert.equal(insights.totalPRs, 2); // primera marca + superación
    assert.equal(insights.prs7, 1);
  });
});

describe('calcSuggestion', () => {
  it('prioriza la rutina nunca entrenada', () => {
    const routines = [mkRoutine('r1', 'Push'), mkRoutine('r2', 'Pull')];
    const sessions = [mkSession(daysAgo(1), [], { routineId: 'r1' })];
    const suggestion = calcSuggestion(routines, sessions);
    assert.equal(suggestion?.routineId, 'r2');
    assert.equal(suggestion?.reason, 'Nunca la has entrenado');
  });

  it('prioriza la más antigua cuando todas se han entrenado', () => {
    const routines = [mkRoutine('r1', 'Push'), mkRoutine('r2', 'Pull')];
    const sessions = [
      mkSession(daysAgo(1), [], { routineId: 'r1' }),
      mkSession(daysAgo(6), [], { routineId: 'r2' }),
    ];
    assert.equal(calcSuggestion(routines, sessions)?.routineId, 'r2');
  });

  it('devuelve null sin rutinas', () => {
    assert.equal(calcSuggestion([], []), null);
  });
});

describe('calcWeeklyMuscleLoad', () => {
  it('agrupa volumen por grupo muscular y clasifica niveles', () => {
    const exercises = [mkExercise('e1', 'Pecho'), mkExercise('e2', 'Espalda')];
    const sessions = [
      mkSession(daysAgo(1), [
        mkSessionExercise('e1', [mkDoneSet(100, 10)]),
        mkSessionExercise('e2', [mkDoneSet(30, 10)]),
      ]),
    ];
    const load = calcWeeklyMuscleLoad(sessions, exercises);
    const pecho = load.find((l) => l.group === 'Pecho');
    const espalda = load.find((l) => l.group === 'Espalda');
    assert.equal(pecho?.weeklyVolume, 1000);
    assert.equal(pecho?.level, 'high');
    assert.equal(espalda?.weeklyVolume, 300);
    assert.equal(espalda?.isWorked, true);
    // trabajados primero
    assert.equal(load[0].group, 'Pecho');
  });
});

describe('calcWeeklyAlerts', () => {
  it('una cuenta que nunca ha entrenado no recibe ninguna alerta', () => {
    assert.deepEqual(calcWeeklyAlerts([], [], 3), []);
  });

  it('semana en blanco solo si ya había entrenado antes', () => {
    const sessions = [mkSession(daysAgo(30), [mkSessionExercise('e1', [mkDoneSet(80, 8)])])];
    const alerts = calcWeeklyAlerts(sessions, [], 3);
    const blank = alerts.find((a) => a.id === 'consistency-zero');
    assert.ok(blank);
    // Es información, no peligro: no debe usar el nivel más alto (rojo).
    assert.equal(blank.level, 'medium');
  });

  it('objetivo semanal en riesgo y hueco muscular', () => {
    const exercises = [mkExercise('e1', 'Pecho')];
    const sessions = [mkSession(daysAgo(1), [mkSessionExercise('e1', [mkDoneSet(80, 8)])])];
    const alerts = calcWeeklyAlerts(sessions, exercises, 3);
    assert.ok(alerts.some((a) => a.id === 'consistency-goal'));
    const gap = alerts.find((a) => a.id === 'muscle-gap');
    assert.ok(gap);
    assert.match(gap.message, /Piernas/);
    assert.match(gap.message, /Espalda/);
  });

  it('fatiga con 3 sesiones seguidas de RPE alto', () => {
    const exercises = [mkExercise('e1', 'Pecho')];
    const highRpe = () => [mkSessionExercise('e1', [mkDoneSet(80, 8, { rpe: '9' })])];
    const sessions = [
      mkSession(daysAgo(1), highRpe()),
      mkSession(daysAgo(2), highRpe()),
      mkSession(daysAgo(3), highRpe()),
    ];
    const alerts = calcWeeklyAlerts(sessions, exercises, 3);
    assert.ok(alerts.some((a) => a.id === 'fatigue-high'));
  });
});

describe('calcWeeklyVolumeTrend', () => {
  it('devuelve el número de semanas pedido con la última al final', () => {
    const sessions = [mkSession(daysAgo(0), [mkSessionExercise('e1', [mkDoneSet(100, 10)])])];
    const { weeks } = calcWeeklyVolumeTrend(sessions, 8);
    assert.equal(weeks.length, 8);
    assert.equal(weeks[7].volume, 1000);
    assert.equal(weeks[0].volume, 0);
  });
});

describe('calcPeriodComparison', () => {
  it('compara el volumen del periodo actual contra el mismo número de semanas anterior', () => {
    const sessions = [
      // Periodo actual (últimas 2 semanas): 1000
      mkSession(daysAgo(3), [mkSessionExercise('e1', [mkDoneSet(100, 10)])]),
      // Periodo previo (2 semanas antes de esas): 400
      mkSession(daysAgo(20), [mkSessionExercise('e1', [mkDoneSet(40, 10)])]),
    ];
    const cmp = calcPeriodComparison(sessions, 2);
    assert.equal(cmp.currentVolume, 1000);
    assert.equal(cmp.previousVolume, 400);
    assert.equal(cmp.volumeChangePct, 150);
  });

  it('devuelve null en el cambio porcentual si no hay volumen previo', () => {
    const sessions = [mkSession(daysAgo(1), [mkSessionExercise('e1', [mkDoneSet(100, 10)])])];
    const cmp = calcPeriodComparison(sessions, 4);
    assert.equal(cmp.previousVolume, 0);
    assert.equal(cmp.volumeChangePct, null);
  });
});

describe('calcRepRangeDistribution', () => {
  it('clasifica fuerza / hipertrofia / resistencia', () => {
    const sessions = [
      mkSession(daysAgo(0), [
        mkSessionExercise('e1', [mkDoneSet(100, 3), mkDoneSet(80, 8), mkDoneSet(40, 15)]),
      ]),
    ];
    const dist = calcRepRangeDistribution(sessions);
    assert.equal(dist.strength, 1);
    assert.equal(dist.hypertrophy, 1);
    assert.equal(dist.endurance, 1);
    assert.equal(dist.total, 3);
  });
});

describe('calcExerciseProgression / calcProjectedProgress', () => {
  it('marca PRs y calcula e1rm por sesión', () => {
    const sessions = [
      mkSession(daysAgo(10), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(5), [mkSessionExercise('e1', [mkDoneSet(105, 5)])]),
      mkSession(daysAgo(1), [mkSessionExercise('e1', [mkDoneSet(102, 5)])]),
    ];
    const prog = calcExerciseProgression('e1', sessions);
    assert.equal(prog.totalSessions, 3);
    assert.equal(prog.prWeight, 105);
    assert.deepEqual(
      prog.points.map((p) => p.isPR),
      [true, true, false],
    );
  });

  it('proyecta con tendencia positiva y devuelve null con tendencia plana o negativa', () => {
    const up = [
      mkSession(daysAgo(21), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(14), [mkSessionExercise('e1', [mkDoneSet(102.5, 5)])]),
      mkSession(daysAgo(7), [mkSessionExercise('e1', [mkDoneSet(105, 5)])]),
    ];
    const proj = calcProjectedProgress('e1', up, 12);
    assert.ok(proj);
    assert.ok(proj.projected > 105);
    assert.ok(proj.weeklyGain > 0);

    const flat = [
      mkSession(daysAgo(21), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(14), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(7), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
    ];
    assert.equal(calcProjectedProgress('e1', flat, 12), null);
    assert.equal(calcProjectedProgress('e1', up.slice(0, 2), 12), null);
  });
});

describe('calcAllPRs', () => {
  it('registra cada superación con el valor anterior, más reciente primero', () => {
    const sessions = [
      mkSession(daysAgo(10), [mkSessionExercise('e1', [mkDoneSet(100, 5)])]),
      mkSession(daysAgo(2), [mkSessionExercise('e1', [mkDoneSet(110, 3)])]),
    ];
    const prs = calcAllPRs(sessions);
    assert.equal(prs.length, 2);
    assert.equal(prs[0].weight, 110);
    assert.equal(prs[0].previous, 100);
  });
});

describe('calcBodyWeightTrend', () => {
  it('calcula actual, min, max y cambio', () => {
    const trend = calcBodyWeightTrend([
      { date: '2026-01-01', value: 80, note: '' },
      { date: '2026-02-01', value: 78.5, note: '' },
      { date: '2026-01-15', value: 79, note: '' },
    ]);
    assert.equal(trend.current, 78.5);
    assert.equal(trend.min, 78.5);
    assert.equal(trend.max, 80);
    assert.equal(trend.change, -1.5);
  });

  it('log vacío', () => {
    const trend = calcBodyWeightTrend([]);
    assert.equal(trend.current, null);
    assert.equal(trend.points.length, 0);
  });
});
