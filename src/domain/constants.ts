import type {
  ExperienceLevel,
  Goal,
  MuscleGroup,
  WorkoutTemplate,
} from './types';

export const APP_NAME = 'GymTracker';
export const APP_SCHEMA_VERSION = 3;

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Piernas',
  'Glúteos',
  'Core',
  'Cardio',
  'Otro',
];

/** Grupos cuya ausencia semanal dispara la alerta de cobertura. */
export const PRIMARY_MUSCLE_GROUPS: MuscleGroup[] = ['Piernas', 'Espalda', 'Pecho'];

export const MEASUREMENT_TYPES = [
  'Pecho',
  'Brazo der.',
  'Brazo izq.',
  'Cintura',
  'Cadera',
  'Muslo der.',
  'Muslo izq.',
] as const;

export const GOALS: Goal[] = [
  'general_fitness',
  'muscle_gain',
  'strength',
  'fat_loss',
  'performance',
];

export const GOAL_LABELS: Record<Goal, string> = {
  general_fitness: 'Fitness general',
  muscle_gain: 'Ganar músculo',
  strength: 'Fuerza',
  fat_loss: 'Perder grasa',
  performance: 'Rendimiento',
};

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

interface SeedExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultRest: number;
}

/** Biblioteca inicial de ejercicios (misma semilla que la PWA, ids estables). */
export const DEFAULT_EXERCISES: SeedExercise[] = [
  { id: 'e1', name: 'Press Banca', muscleGroup: 'Pecho', defaultRest: 180 },
  { id: 'e2', name: 'Press Inclinado Mancuernas', muscleGroup: 'Pecho', defaultRest: 120 },
  { id: 'e3', name: 'Aperturas', muscleGroup: 'Pecho', defaultRest: 90 },
  { id: 'e4', name: 'Fondos en Paralelas', muscleGroup: 'Pecho', defaultRest: 120 },
  { id: 'e5', name: 'Cruces en Polea', muscleGroup: 'Pecho', defaultRest: 60 },
  { id: 'e6', name: 'Dominadas', muscleGroup: 'Espalda', defaultRest: 180 },
  { id: 'e7', name: 'Remo con Barra', muscleGroup: 'Espalda', defaultRest: 150 },
  { id: 'e8', name: 'Jalón al Pecho', muscleGroup: 'Espalda', defaultRest: 120 },
  { id: 'e9', name: 'Remo Mancuerna', muscleGroup: 'Espalda', defaultRest: 90 },
  { id: 'e10', name: 'Peso Muerto', muscleGroup: 'Espalda', defaultRest: 240 },
  { id: 'e11', name: 'Remo en Polea Baja', muscleGroup: 'Espalda', defaultRest: 120 },
  { id: 'e12', name: 'Press Militar', muscleGroup: 'Hombros', defaultRest: 150 },
  { id: 'e13', name: 'Elevaciones Laterales', muscleGroup: 'Hombros', defaultRest: 60 },
  { id: 'e14', name: 'Elevaciones Frontales', muscleGroup: 'Hombros', defaultRest: 60 },
  { id: 'e15', name: 'Pájaros', muscleGroup: 'Hombros', defaultRest: 60 },
  { id: 'e16', name: 'Face Pull', muscleGroup: 'Hombros', defaultRest: 60 },
  { id: 'e17', name: 'Curl Bíceps Barra', muscleGroup: 'Bíceps', defaultRest: 90 },
  { id: 'e18', name: 'Curl Martillo', muscleGroup: 'Bíceps', defaultRest: 60 },
  { id: 'e19', name: 'Curl Inclinado', muscleGroup: 'Bíceps', defaultRest: 60 },
  { id: 'e20', name: 'Curl Predicador', muscleGroup: 'Bíceps', defaultRest: 90 },
  { id: 'e21', name: 'Extensión Tríceps Polea', muscleGroup: 'Tríceps', defaultRest: 60 },
  { id: 'e22', name: 'Press Francés', muscleGroup: 'Tríceps', defaultRest: 90 },
  { id: 'e23', name: 'Patada Tríceps', muscleGroup: 'Tríceps', defaultRest: 60 },
  { id: 'e24', name: 'Sentadilla', muscleGroup: 'Piernas', defaultRest: 240 },
  { id: 'e25', name: 'Prensa', muscleGroup: 'Piernas', defaultRest: 180 },
  { id: 'e26', name: 'Extensión de Cuádriceps', muscleGroup: 'Piernas', defaultRest: 90 },
  { id: 'e27', name: 'Curl Femoral', muscleGroup: 'Piernas', defaultRest: 90 },
  { id: 'e28', name: 'Zancadas', muscleGroup: 'Piernas', defaultRest: 120 },
  { id: 'e29', name: 'Gemelos en Máquina', muscleGroup: 'Piernas', defaultRest: 60 },
  { id: 'e30', name: 'Hip Thrust', muscleGroup: 'Glúteos', defaultRest: 120 },
  { id: 'e31', name: 'Sentadilla Búlgara', muscleGroup: 'Glúteos', defaultRest: 120 },
  { id: 'e32', name: 'Plancha', muscleGroup: 'Core', defaultRest: 60 },
  { id: 'e33', name: 'Crunch en Polea', muscleGroup: 'Core', defaultRest: 60 },
  { id: 'e34', name: 'Elevación de Piernas', muscleGroup: 'Core', defaultRest: 60 },
];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tpl-push',
    name: 'Push Day (PPL)',
    desc: 'Pecho, hombros y tríceps',
    exercises: [
      { exerciseId: 'e1', exerciseName: 'Press Banca', targetSets: 4, restSeconds: 180, muscleGroup: 'Pecho' },
      { exerciseId: 'e2', exerciseName: 'Press Inclinado Mancuernas', targetSets: 3, restSeconds: 120, muscleGroup: 'Pecho' },
      { exerciseId: 'e5', exerciseName: 'Cruces en Polea', targetSets: 3, restSeconds: 60, muscleGroup: 'Pecho' },
      { exerciseId: 'e12', exerciseName: 'Press Militar', targetSets: 3, restSeconds: 150, muscleGroup: 'Hombros' },
      { exerciseId: 'e13', exerciseName: 'Elevaciones Laterales', targetSets: 3, restSeconds: 60, muscleGroup: 'Hombros' },
      { exerciseId: 'e21', exerciseName: 'Extensión Tríceps Polea', targetSets: 3, restSeconds: 60, muscleGroup: 'Tríceps' },
    ],
  },
  {
    id: 'tpl-pull',
    name: 'Pull Day (PPL)',
    desc: 'Espalda y bíceps',
    exercises: [
      { exerciseId: 'e6', exerciseName: 'Dominadas', targetSets: 4, restSeconds: 180, muscleGroup: 'Espalda' },
      { exerciseId: 'e7', exerciseName: 'Remo con Barra', targetSets: 3, restSeconds: 150, muscleGroup: 'Espalda' },
      { exerciseId: 'e8', exerciseName: 'Jalón al Pecho', targetSets: 3, restSeconds: 120, muscleGroup: 'Espalda' },
      { exerciseId: 'e16', exerciseName: 'Face Pull', targetSets: 3, restSeconds: 60, muscleGroup: 'Hombros' },
      { exerciseId: 'e17', exerciseName: 'Curl Bíceps Barra', targetSets: 3, restSeconds: 90, muscleGroup: 'Bíceps' },
      { exerciseId: 'e18', exerciseName: 'Curl Martillo', targetSets: 3, restSeconds: 60, muscleGroup: 'Bíceps' },
    ],
  },
  {
    id: 'tpl-legs',
    name: 'Leg Day (PPL)',
    desc: 'Piernas y glúteos',
    exercises: [
      { exerciseId: 'e24', exerciseName: 'Sentadilla', targetSets: 4, restSeconds: 240, muscleGroup: 'Piernas' },
      { exerciseId: 'e25', exerciseName: 'Prensa', targetSets: 3, restSeconds: 180, muscleGroup: 'Piernas' },
      { exerciseId: 'e27', exerciseName: 'Curl Femoral', targetSets: 3, restSeconds: 90, muscleGroup: 'Piernas' },
      { exerciseId: 'e26', exerciseName: 'Extensión de Cuádriceps', targetSets: 3, restSeconds: 90, muscleGroup: 'Piernas' },
      { exerciseId: 'e30', exerciseName: 'Hip Thrust', targetSets: 3, restSeconds: 120, muscleGroup: 'Glúteos' },
      { exerciseId: 'e29', exerciseName: 'Gemelos en Máquina', targetSets: 4, restSeconds: 60, muscleGroup: 'Piernas' },
    ],
  },
  {
    id: 'tpl-upper',
    name: 'Upper Body',
    desc: 'Tren superior completo',
    exercises: [
      { exerciseId: 'e1', exerciseName: 'Press Banca', targetSets: 4, restSeconds: 180, muscleGroup: 'Pecho' },
      { exerciseId: 'e7', exerciseName: 'Remo con Barra', targetSets: 4, restSeconds: 150, muscleGroup: 'Espalda' },
      { exerciseId: 'e12', exerciseName: 'Press Militar', targetSets: 3, restSeconds: 150, muscleGroup: 'Hombros' },
      { exerciseId: 'e8', exerciseName: 'Jalón al Pecho', targetSets: 3, restSeconds: 120, muscleGroup: 'Espalda' },
      { exerciseId: 'e17', exerciseName: 'Curl Bíceps Barra', targetSets: 3, restSeconds: 90, muscleGroup: 'Bíceps' },
      { exerciseId: 'e21', exerciseName: 'Extensión Tríceps Polea', targetSets: 3, restSeconds: 60, muscleGroup: 'Tríceps' },
    ],
  },
  {
    id: 'tpl-lower',
    name: 'Lower Body',
    desc: 'Tren inferior completo',
    exercises: [
      { exerciseId: 'e24', exerciseName: 'Sentadilla', targetSets: 4, restSeconds: 240, muscleGroup: 'Piernas' },
      { exerciseId: 'e10', exerciseName: 'Peso Muerto', targetSets: 4, restSeconds: 240, muscleGroup: 'Espalda' },
      { exerciseId: 'e28', exerciseName: 'Zancadas', targetSets: 3, restSeconds: 120, muscleGroup: 'Piernas' },
      { exerciseId: 'e30', exerciseName: 'Hip Thrust', targetSets: 3, restSeconds: 120, muscleGroup: 'Glúteos' },
      { exerciseId: 'e27', exerciseName: 'Curl Femoral', targetSets: 3, restSeconds: 90, muscleGroup: 'Piernas' },
      { exerciseId: 'e29', exerciseName: 'Gemelos en Máquina', targetSets: 4, restSeconds: 60, muscleGroup: 'Piernas' },
    ],
  },
  {
    id: 'tpl-fullbody',
    name: 'Full Body',
    desc: 'Cuerpo completo en una sesión',
    exercises: [
      { exerciseId: 'e24', exerciseName: 'Sentadilla', targetSets: 3, restSeconds: 240, muscleGroup: 'Piernas' },
      { exerciseId: 'e1', exerciseName: 'Press Banca', targetSets: 3, restSeconds: 180, muscleGroup: 'Pecho' },
      { exerciseId: 'e7', exerciseName: 'Remo con Barra', targetSets: 3, restSeconds: 150, muscleGroup: 'Espalda' },
      { exerciseId: 'e12', exerciseName: 'Press Militar', targetSets: 3, restSeconds: 150, muscleGroup: 'Hombros' },
      { exerciseId: 'e17', exerciseName: 'Curl Bíceps Barra', targetSets: 2, restSeconds: 90, muscleGroup: 'Bíceps' },
      { exerciseId: 'e32', exerciseName: 'Plancha', targetSets: 3, restSeconds: 60, muscleGroup: 'Core' },
    ],
  },
];
