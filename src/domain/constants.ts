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
  // --- ATLAS v2.0 ---
  { id: 'e35', name: 'Remo Pecho Apoyado (Neutro)', muscleGroup: 'Espalda', defaultRest: 120 },
  { id: 'e36', name: 'Press Militar Mancuernas', muscleGroup: 'Hombros', defaultRest: 120 },
  { id: 'e37', name: 'Farmer Carry', muscleGroup: 'Otro', defaultRest: 90 },
  { id: 'e38', name: 'Plancha RKC', muscleGroup: 'Core', defaultRest: 60 },
  { id: 'e39', name: 'Equilibrio a una Pierna', muscleGroup: 'Otro', defaultRest: 30 },
  { id: 'e40', name: 'Salto Vertical / Cajón Bajo', muscleGroup: 'Piernas', defaultRest: 75 },
  { id: 'e41', name: 'Peso Muerto Rumano a una Pierna', muscleGroup: 'Piernas', defaultRest: 105 },
  { id: 'e42', name: 'Zancada Atrás / Caminando', muscleGroup: 'Piernas', defaultRest: 105 },
  { id: 'e43', name: 'Gemelo de Pie', muscleGroup: 'Piernas', defaultRest: 90 },
  { id: 'e44', name: 'Tibial Anterior', muscleGroup: 'Piernas', defaultRest: 60 },
  { id: 'e45', name: 'Pallof Press', muscleGroup: 'Core', defaultRest: 60 },
  { id: 'e46', name: 'Arrancadas Cortas', muscleGroup: 'Cardio', defaultRest: 90 },
  { id: 'e47', name: 'Cambios de Dirección (Agilidad)', muscleGroup: 'Cardio', defaultRest: 60 },
  { id: 'e48', name: 'Salto Lateral + Aterrizaje', muscleGroup: 'Piernas', defaultRest: 75 },
  { id: 'e49', name: 'Circuito de Acondicionamiento', muscleGroup: 'Cardio', defaultRest: 30 },
  { id: 'e50', name: 'Movilidad Dedicada (Cadera/Torácico/Hombro)', muscleGroup: 'Otro', defaultRest: 0 },
  { id: 'e51', name: 'Dominada Neutra / Jalón', muscleGroup: 'Espalda', defaultRest: 120 },
  { id: 'e52', name: 'Remo Unilateral', muscleGroup: 'Espalda', defaultRest: 105 },
  { id: 'e53', name: 'Press de Hombros en Máquina (Neutro)', muscleGroup: 'Hombros', defaultRest: 105 },
  { id: 'e54', name: 'Reverse Fly', muscleGroup: 'Hombros', defaultRest: 75 },
  { id: 'e55', name: 'Extensión Tríceps sobre Cabeza', muscleGroup: 'Tríceps', defaultRest: 75 },
  { id: 'e56', name: 'Suitcase Carry', muscleGroup: 'Otro', defaultRest: 75 },
  { id: 'e57', name: 'Equilibrio en Superficie Inestable', muscleGroup: 'Otro', defaultRest: 30 },
  { id: 'e58', name: 'Gemelo Sentado', muscleGroup: 'Piernas', defaultRest: 90 },
  { id: 'e59', name: 'Copenhagen Plank', muscleGroup: 'Core', defaultRest: 60 },
  { id: 'e60', name: 'Ab Wheel / Dead Bug', muscleGroup: 'Core', defaultRest: 75 },
  { id: 'e61', name: 'Zona 2 (Bici/Elíptica/Caminata Inclinada)', muscleGroup: 'Cardio', defaultRest: 0 },
  { id: 'e62', name: 'Intervalos 4×4 (Bici/Cinta/Elíptica)', muscleGroup: 'Cardio', defaultRest: 180 },
  { id: 'e63', name: 'Movilidad General + Equilibrio Libre', muscleGroup: 'Otro', defaultRest: 0 },
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

  // ============================================
  // ATLAS v2.0 — Sistema Integral de Preparación Física
  // Fase Fundación · 12 semanas · foco en longevidad
  // ============================================
  {
    id: 'tpl-atlas-upper-a',
    name: 'Atlas · Lunes — Upper A',
    desc: 'Fuerza + espalda + agarre',
    exercises: [
      { exerciseId: 'e1', exerciseName: 'Press Banca', targetSets: 4, restSeconds: 150, muscleGroup: 'Pecho', targetRepsMin: 4, targetRepsMax: 6, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e6', exerciseName: 'Dominadas', targetSets: 4, restSeconds: 150, muscleGroup: 'Espalda', targetRepsMin: 5, targetRepsMax: 8, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e35', exerciseName: 'Remo Pecho Apoyado (Neutro)', targetSets: 3, restSeconds: 120, muscleGroup: 'Espalda', targetRepsMin: 8, targetRepsMax: 10, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e36', exerciseName: 'Press Militar Mancuernas', targetSets: 3, restSeconds: 120, muscleGroup: 'Hombros', targetRepsMin: 6, targetRepsMax: 10, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e13', exerciseName: 'Elevaciones Laterales', targetSets: 3, restSeconds: 75, muscleGroup: 'Hombros', targetRepsMin: 12, targetRepsMax: 20, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e16', exerciseName: 'Face Pull', targetSets: 2, restSeconds: 75, muscleGroup: 'Hombros', targetRepsMin: 15, targetRepsMax: 20, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e37', exerciseName: 'Farmer Carry', targetSets: 3, restSeconds: 90, muscleGroup: 'Otro', targetRepsMin: 30, targetRepsMax: 40 },
      { exerciseId: 'e38', exerciseName: 'Plancha RKC', targetSets: 3, restSeconds: 60, muscleGroup: 'Core', targetRepsMin: 20, targetRepsMax: 30 },
    ],
  },
  {
    id: 'tpl-atlas-lower-a',
    name: 'Atlas · Martes — Lower A',
    desc: 'Fuerza + potencia + equilibrio',
    exercises: [
      { exerciseId: 'e39', exerciseName: 'Equilibrio a una Pierna', targetSets: 2, restSeconds: 30, muscleGroup: 'Otro', targetRepsMin: 30, targetRepsMax: 30 },
      { exerciseId: 'e40', exerciseName: 'Salto Vertical / Cajón Bajo', targetSets: 3, restSeconds: 75, muscleGroup: 'Piernas', targetRepsMin: 3, targetRepsMax: 3 },
      { exerciseId: 'e24', exerciseName: 'Sentadilla', targetSets: 4, restSeconds: 150, muscleGroup: 'Piernas', targetRepsMin: 4, targetRepsMax: 6, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e41', exerciseName: 'Peso Muerto Rumano a una Pierna', targetSets: 3, restSeconds: 105, muscleGroup: 'Piernas', targetRepsMin: 6, targetRepsMax: 8, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e42', exerciseName: 'Zancada Atrás / Caminando', targetSets: 3, restSeconds: 105, muscleGroup: 'Piernas', targetRepsMin: 8, targetRepsMax: 8, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e43', exerciseName: 'Gemelo de Pie', targetSets: 3, restSeconds: 90, muscleGroup: 'Piernas', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e44', exerciseName: 'Tibial Anterior', targetSets: 3, restSeconds: 60, muscleGroup: 'Piernas', targetRepsMin: 15, targetRepsMax: 20, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e45', exerciseName: 'Pallof Press', targetSets: 3, restSeconds: 60, muscleGroup: 'Core', targetRepsMin: 10, targetRepsMax: 12, targetRirMin: 2, targetRirMax: 2 },
    ],
  },
  {
    id: 'tpl-atlas-agilidad',
    name: 'Atlas · Miércoles — Agilidad + Acondicionamiento',
    desc: 'Agilidad, potencia y cardio variable (sustituye al pádel)',
    exercises: [
      { exerciseId: 'e46', exerciseName: 'Arrancadas Cortas', targetSets: 5, restSeconds: 90, muscleGroup: 'Cardio', targetRepsMin: 15, targetRepsMax: 20 },
      { exerciseId: 'e47', exerciseName: 'Cambios de Dirección (Agilidad)', targetSets: 5, restSeconds: 60, muscleGroup: 'Cardio' },
      { exerciseId: 'e48', exerciseName: 'Salto Lateral + Aterrizaje', targetSets: 3, restSeconds: 75, muscleGroup: 'Piernas', targetRepsMin: 3, targetRepsMax: 3 },
      { exerciseId: 'e49', exerciseName: 'Circuito de Acondicionamiento', targetSets: 1, restSeconds: 30, muscleGroup: 'Cardio', targetRepsMin: 15, targetRepsMax: 20 },
      { exerciseId: 'e50', exerciseName: 'Movilidad Dedicada (Cadera/Torácico/Hombro)', targetSets: 1, restSeconds: 0, muscleGroup: 'Otro', targetRepsMin: 15, targetRepsMax: 15 },
    ],
  },
  {
    id: 'tpl-atlas-upper-b',
    name: 'Atlas · Jueves — Upper B',
    desc: 'Hipertrofia + brazos/hombros',
    exercises: [
      { exerciseId: 'e2', exerciseName: 'Press Inclinado Mancuernas', targetSets: 3, restSeconds: 120, muscleGroup: 'Pecho', targetRepsMin: 6, targetRepsMax: 10, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e51', exerciseName: 'Dominada Neutra / Jalón', targetSets: 3, restSeconds: 120, muscleGroup: 'Espalda', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e52', exerciseName: 'Remo Unilateral', targetSets: 3, restSeconds: 105, muscleGroup: 'Espalda', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e53', exerciseName: 'Press de Hombros en Máquina (Neutro)', targetSets: 2, restSeconds: 105, muscleGroup: 'Hombros', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 2, targetRirMax: 2 },
      { exerciseId: 'e13', exerciseName: 'Elevaciones Laterales', targetSets: 3, restSeconds: 75, muscleGroup: 'Hombros', targetRepsMin: 12, targetRepsMax: 20, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e54', exerciseName: 'Reverse Fly', targetSets: 2, restSeconds: 75, muscleGroup: 'Hombros', targetRepsMin: 12, targetRepsMax: 20, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e19', exerciseName: 'Curl Inclinado', targetSets: 3, restSeconds: 75, muscleGroup: 'Bíceps', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e55', exerciseName: 'Extensión Tríceps sobre Cabeza', targetSets: 3, restSeconds: 75, muscleGroup: 'Tríceps', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e56', exerciseName: 'Suitcase Carry', targetSets: 2, restSeconds: 75, muscleGroup: 'Otro', targetRepsMin: 30, targetRepsMax: 40 },
    ],
  },
  {
    id: 'tpl-atlas-lower-b',
    name: 'Atlas · Viernes — Lower B',
    desc: 'Posterior + unilateral + core + equilibrio',
    exercises: [
      { exerciseId: 'e57', exerciseName: 'Equilibrio en Superficie Inestable', targetSets: 2, restSeconds: 30, muscleGroup: 'Otro', targetRepsMin: 30, targetRepsMax: 30 },
      { exerciseId: 'e48', exerciseName: 'Salto Lateral + Aterrizaje', targetSets: 3, restSeconds: 75, muscleGroup: 'Piernas', targetRepsMin: 3, targetRepsMax: 3 },
      { exerciseId: 'e30', exerciseName: 'Hip Thrust', targetSets: 3, restSeconds: 120, muscleGroup: 'Glúteos', targetRepsMin: 6, targetRepsMax: 10, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e25', exerciseName: 'Prensa', targetSets: 3, restSeconds: 120, muscleGroup: 'Piernas', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e27', exerciseName: 'Curl Femoral', targetSets: 3, restSeconds: 90, muscleGroup: 'Piernas', targetRepsMin: 8, targetRepsMax: 12, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e58', exerciseName: 'Gemelo Sentado', targetSets: 3, restSeconds: 90, muscleGroup: 'Piernas', targetRepsMin: 10, targetRepsMax: 15, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e44', exerciseName: 'Tibial Anterior', targetSets: 2, restSeconds: 60, muscleGroup: 'Piernas', targetRepsMin: 15, targetRepsMax: 20, targetRirMin: 1, targetRirMax: 2 },
      { exerciseId: 'e59', exerciseName: 'Copenhagen Plank', targetSets: 2, restSeconds: 60, muscleGroup: 'Core', targetRepsMin: 20, targetRepsMax: 30 },
      { exerciseId: 'e60', exerciseName: 'Ab Wheel / Dead Bug', targetSets: 3, restSeconds: 75, muscleGroup: 'Core', targetRepsMin: 6, targetRepsMax: 12, targetRirMin: 2, targetRirMax: 2 },
    ],
  },
  {
    id: 'tpl-atlas-sabado-zona2',
    name: 'Atlas · Sábado — Zona 2 (semanas impares)',
    desc: 'Aeróbico conversacional · 60–90 min',
    exercises: [
      { exerciseId: 'e61', exerciseName: 'Zona 2 (Bici/Elíptica/Caminata Inclinada)', targetSets: 1, restSeconds: 0, muscleGroup: 'Cardio', targetRepsMin: 60, targetRepsMax: 90 },
    ],
  },
  {
    id: 'tpl-atlas-sabado-intervalos',
    name: 'Atlas · Sábado — Intervalos (semanas pares)',
    desc: 'Protocolo noruego 4×4 min · 85–90% FC máx',
    exercises: [
      { exerciseId: 'e62', exerciseName: 'Intervalos 4×4 (Bici/Cinta/Elíptica)', targetSets: 4, restSeconds: 180, muscleGroup: 'Cardio', targetRepsMin: 4, targetRepsMax: 4 },
    ],
  },
  {
    id: 'tpl-atlas-domingo',
    name: 'Atlas · Domingo — Movilidad y Recuperación',
    desc: 'Rango articular y propiocepción · 20–30 min',
    exercises: [
      { exerciseId: 'e63', exerciseName: 'Movilidad General + Equilibrio Libre', targetSets: 1, restSeconds: 0, muscleGroup: 'Otro', targetRepsMin: 20, targetRepsMax: 30 },
    ],
  },
];

/** Familias de plantillas, para agruparlas en el selector. */
export const TEMPLATE_GROUPS: { title: string; subtitle: string; match: (t: WorkoutTemplate) => boolean }[] = [
  {
    title: 'ATLAS v2.0',
    subtitle: 'Programa de 12 semanas · Fase Fundación',
    match: (t) => t.id.startsWith('tpl-atlas-'),
  },
  {
    title: 'Clásicas',
    subtitle: 'Divisiones habituales listas para usar',
    match: (t) => !t.id.startsWith('tpl-atlas-'),
  },
];
