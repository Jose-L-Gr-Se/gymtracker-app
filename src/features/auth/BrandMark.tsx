import { Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors, font, spacing } from '@/theme/tokens';

/**
 * La marca de la app dibujada en vector: el mismo monograma "G" del icono
 * (una G cuyo travesaño es la barra de una mancuerna). Se dibuja con SVG en
 * vez de usar el PNG del icono para que escale sin pixelarse y herede el
 * color del tema.
 */
export function BrandMark({ size = 72, color = colors.accent }: { size?: number; color?: string }) {
  // Geometría normalizada a un lienzo de 1024, igual que scripts/generate-icons.mjs
  const R = 296;
  const STROKE = 116;
  const circumference = 2 * Math.PI * R;
  const gap = (circumference * 76) / 360;
  const dash = circumference - gap;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Circle
        cx={512}
        cy={512}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-gap / 2}
      />
      <Rect x={502} y={478} width={300} height={68} rx={34} fill={color} />
    </Svg>
  );
}

/** Marca + nombre, para encabezar las pantallas de acceso. */
export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <BrandMark size={64} />
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: font.size.xxl,
            fontWeight: font.weight.heavy,
            letterSpacing: -0.5,
          }}
        >
          GymTracker
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}
