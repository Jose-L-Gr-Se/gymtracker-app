/**
 * Design tokens de GymTracker. Tema oscuro único (identidad de marca:
 * fondo casi negro + acento lima eléctrico, heredado de la PWA).
 */

export const colors = {
  bg: '#08080a',
  surface: '#111114',
  card: '#141418',
  cardElevated: '#1c1c22',

  border: '#222228',
  borderLight: '#2e2e36',

  text: '#f0f0f5',
  textMuted: '#8888a0',
  textDim: '#55556a',

  accent: '#c8ff2e',
  accentDim: 'rgba(200,255,46,0.12)',
  accentBorder: 'rgba(200,255,46,0.25)',
  onAccent: '#08080a',

  danger: '#ff4560',
  dangerBg: 'rgba(255,69,96,0.10)',
  success: '#30d87a',
  successBg: 'rgba(48,216,122,0.10)',
  warning: '#ffb020',
  warningBg: 'rgba(255,176,32,0.10)',

  gold: '#FFD93D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const font = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export const MOOD_EMOJIS = ['😫', '😕', '😐', '🙂', '🔥'] as const;
