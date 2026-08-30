import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Routine, RoutineExercise } from '../types';
import {
  appendSet,
  buildFinishedSession,
  buildInitialExercises,
  calcRemainingSeconds,
  countCompletedSets,
  cycleSetType,
  fillSetFromLast,
  findLastSets,
  nextSetType,
  reconcileExercises,
  removeLastSet,
  resumeEndAtMs,
  toggleSetCompleted,
  updateSetField,
} from '../workout';
import { daysAgo, mkDoneSet, mkSession, mkSessionExercise } from './helpers';

const mkRoutineExercise = (exerciseId: string, targetSets = 3): RoutineExercise => ({
  exerciseId,
  exerciseName: `Ejercicio ${exerciseId}`,
  muscleGroup: 'Pecho',
  targetSets,
  restSeconds: 90,
  linkedToNext: false,
  targetRepsMin: null,
  targetRepsMax: null,
  targetRirMin: null,
  targetRirMax: null,
});

const mkRoutine = (ids: string[]): Routine => ({
  id: 'r1',
  name: 'Push',
  exercises: ids.map((id) => mkRoutineExercise(id)),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  deviceId: 'dev_test',
  isDeleted: false,
});

describe('estado del entreno', () => {
  it('inicializa con el número de series objetivo', () => {
    const exs = buildInitialExercises(mkRoutine(['e1', 'e2']));
    assert.equal(exs.length, 2);
    assert.equal(exs[0].sets.length, 3);
    assert.equal(exs[0].sets[0].completed, false);
  });

  it('actualiza campos y completa series de forma inmutable', () => {
    const exs = buildInitialExercises(mkRoutine(['e1']));
    const next = toggleSetCompleted(updateSetField(exs, 0, 0, 'weight', '100'), 0, 0);
    assert.equal(next[0].sets[0].weight, '100');
    assert.equal(next[0].sets[0].completed, true);
    assert.equal(exs[0].sets[0].weight, ''); // original intacto
  });

  it('añade y quita series (sin bajar de 1)', () => {
    let exs = buildInitialExercises(mkRoutine(['e1']));
    exs = appendSet(exs, 0, 'drop');
    assert.equal(exs[0].sets.length, 4);
    assert.equal(exs[0].sets[3].type, 'drop');
    exs = removeLastSet(removeLastSet(removeLastSet(exs, 0), 0), 0);
    assert.equal(exs[0].sets.length, 1);
    assert.equal(removeLastSet(exs, 0)[0].sets.length, 1);
  });

  it('cicla tipos de serie', () => {
    assert.equal(nextSetType('work'), 'warmup');
    assert.equal(nextSetType('failure'), 'work');
    const exs = cycleSetType(buildInitialExercises(mkRoutine(['e1'])), 0, 0);
    assert.equal(exs[0].sets[0].type, 'warmup');
  });

  it('rellena desde la última sesión', () => {
    const history = [mkSession(daysAgo(3), [mkSessionExercise('e1', [mkDoneSet(80, 8), mkDoneSet(85, 6)])])];
    const last = findLastSets('e1', history);
    assert.equal(last.length, 2);
    let exs = buildInitialExercises(mkRoutine(['e1']));
    exs = fillSetFromLast(exs, 0, 1, last);
    assert.equal(exs[0].sets[1].weight, '85');
    assert.equal(exs[0].sets[1].completed, false);
    // set 3 no existe en historial → usa el último disponible
    exs = fillSetFromLast(exs, 0, 2, last);
    assert.equal(exs[0].sets[2].weight, '85');
  });

  it('reconcilia con la rutina editada conservando progreso', () => {
    const exs = updateSetField(buildInitialExercises(mkRoutine(['e1', 'e2'])), 0, 0, 'weight', '100');
    const next = reconcileExercises(mkRoutine(['e1', 'e3']).exercises, exs);
    assert.equal(next.length, 2);
    assert.equal(next[0].sets[0].weight, '100'); // e1 conserva
    assert.equal(next[1].exerciseId, 'e3'); // e3 nuevo
  });

  it('construye la sesión final excluyendo ejercicios sin progreso', () => {
    let exs = buildInitialExercises(mkRoutine(['e1', 'e2']));
    exs = toggleSetCompleted(updateSetField(exs, 0, 0, 'weight', '100'), 0, 0);
    const session = buildFinishedSession({
      routineId: 'r1',
      routineName: 'Push',
      startTime: new Date(Date.now() - 45 * 60000).toISOString(),
      exercises: exs,
      sessionMood: 4,
      sessionNote: ' buen día ',
      deviceId: 'dev_test',
    });
    assert.equal(session.exercises.length, 1);
    assert.equal(session.durationMin, 45);
    assert.equal(session.sessionNote, 'buen día');
    assert.ok(session.id.startsWith('s_'));
  });

  it('cuenta series completadas', () => {
    let exs = buildInitialExercises(mkRoutine(['e1']));
    exs = toggleSetCompleted(exs, 0, 0);
    assert.deepEqual(countCompletedSets(exs), { done: 1, total: 3 });
  });
});

describe('temporizador de descanso', () => {
  it('calcula segundos restantes con techo', () => {
    const now = 1_000_000;
    assert.equal(calcRemainingSeconds(now + 1500, now), 2);
    assert.equal(calcRemainingSeconds(now - 100, now), 0);
  });

  it('desplaza el fin al reanudar tras pausa', () => {
    const end = 1_000_000;
    const paused = 990_000;
    const resumed = 995_000;
    assert.equal(resumeEndAtMs(end, paused, resumed), 1_005_000);
    // reanudar "antes" de pausar no desplaza hacia atrás
    assert.equal(resumeEndAtMs(end, paused, paused - 1), end);
  });
});
