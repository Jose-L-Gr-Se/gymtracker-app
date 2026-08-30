/**
 * Modelo de dominio de GymTracker.
 * Tipos puros, sin dependencias de React Native ni de la capa de datos.
 */

export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Piernas'
  | 'Glúteos'
  | 'Core'
  | 'Cardio'
  | 'Otro';

export type WeightUnit = 'kg' | 'lbs';

export type Goal =
  | 'general_fitness'
  | 'muscle_gain'
  | 'strength'
  | 'fat_loss'
  | 'performance';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type SetType = 'work' | 'warmup' | 'drop' | 'failure';

/** Metadatos comunes de sincronización presentes en toda entidad. */
export interface EntityMeta {
  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  isDeleted: boolean;
}

export interface Exercise extends EntityMeta {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  /** Descanso por defecto entre series, en segundos. */
  defaultRest: number;
  videoUrl: string;
  instructions: string;
  isCustom: boolean;
}

export interface RoutineExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  restSeconds: number;
  /** Superserie: enlazado con el siguiente ejercicio de la lista. */
  linkedToNext: boolean;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetRirMin: number | null;
  targetRirMax: number | null;
}

export interface Routine extends EntityMeta {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface WorkoutSet {
  /** Peso en kg (unidad canónica de almacenamiento). Cadena vacía = sin registrar. */
  weight: string;
  reps: string;
  rpe: string;
  rir: string;
  completed: boolean;
  type: SetType;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  notes: string;
}

export interface Session extends EntityMeta {
  id: string;
  routineId: string;
  routineName: string;
  startTime: string;
  endTime: string;
  /** Fecha local YYYY-MM-DD de la sesión. */
  date: string;
  durationMin: number;
  sessionMood: number | null;
  sessionNote: string;
  exercises: SessionExercise[];
}

export interface BodyWeightEntry {
  /** YYYY-MM-DD */
  date: string;
  /** kg */
  value: number;
  note: string;
}

export interface MeasurementEntry {
  /** YYYY-MM-DD */
  date: string;
  type: string;
  /** cm */
  value: number;
}

export interface UserProfile {
  fullName: string;
  email: string;
  birthYear: string;
  heightCm: string;
  goal: Goal;
  experience: ExperienceLevel;
  bio: string;
}

export interface Prefs {
  weeklyGoal: number;
  unitPref: WeightUnit;
  onboardingDone: boolean;
  restAlertsEnabled: boolean;
  keepScreenAwake: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  desc: string;
  exercises: Pick<
    RoutineExercise,
    'exerciseId' | 'exerciseName' | 'targetSets' | 'restSeconds' | 'muscleGroup'
  >[];
}

/** Borrador de entreno activo, persistido para sobrevivir a cierres de app. */
export interface WorkoutDraft {
  routineId: string;
  routineName: string;
  startTime: string;
  exercises: SessionExercise[];
  /** Índices de la rutina en el momento de empezar (para reconciliar ediciones). */
  routineExercises: RoutineExercise[];
  restTimer: RestTimerState | null;
  savedAt: string;
}

export interface RestTimerState {
  /** Momento (epoch ms) en el que termina el descanso. */
  endAtMs: number;
  totalSeconds: number;
  exerciseName: string;
  pausedAtMs: number | null;
}
