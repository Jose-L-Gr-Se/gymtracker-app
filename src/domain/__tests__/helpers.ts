import { localDateKey } from '../id';
import type { Session, SessionExercise, WorkoutSet } from '../types';

export const mkSet = (over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  weight: '',
  reps: '',
  rpe: '',
  rir: '',
  completed: false,
  type: 'work',
  ...over,
});

export const mkDoneSet = (weight: number, reps: number, over: Partial<WorkoutSet> = {}): WorkoutSet =>
  mkSet({ weight: String(weight), reps: String(reps), completed: true, ...over });

export const mkSessionExercise = (
  exerciseId: string,
  sets: WorkoutSet[],
  over: Partial<SessionExercise> = {},
): SessionExercise => ({
  exerciseId,
  exerciseName: `Ejercicio ${exerciseId}`,
  sets,
  notes: '',
  ...over,
});

let seq = 0;

export const mkSession = (date: string, exercises: SessionExercise[], over: Partial<Session> = {}): Session => ({
  id: `s_test_${++seq}`,
  routineId: 'r1',
  routineName: 'Rutina test',
  startTime: `${date}T10:00:00.000Z`,
  endTime: `${date}T11:00:00.000Z`,
  date,
  durationMin: 60,
  sessionMood: null,
  sessionNote: '',
  exercises,
  createdAt: `${date}T11:00:00.000Z`,
  updatedAt: `${date}T11:00:00.000Z`,
  version: 1,
  deviceId: 'dev_test',
  isDeleted: false,
  ...over,
});

/** Devuelve la clave local YYYY-MM-DD de hace n días. */
export const daysAgo = (n: number): string => localDateKey(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
