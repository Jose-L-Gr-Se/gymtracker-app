import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors, font, radius, spacing } from '@/theme/tokens';

export interface LineChartPoint {
  label: string;
  value: number;
  /** Marca este punto como destacado (p. ej. un PR): se dibuja más grande y en dorado. */
  highlight?: boolean;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  lineColor?: string;
  highlightColor?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Gráfica de línea interactiva: arrastra el dedo sobre la gráfica para ver
 * el valor del punto más cercano en un tooltip. Los puntos marcados como
 * `highlight` (p. ej. PRs) se dibujan en dorado.
 */
export function LineChart({
  data,
  height = 140,
  formatValue = (v) => String(Math.round(v)),
  lineColor = colors.accent,
  highlightColor = colors.gold,
}: LineChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const padding = 10;
  const chartHeight = height - padding * 2;

  const xFor = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * width : width / 2);
  const yFor = (v: number) => padding + chartHeight - ((v - minValue) / range) * chartHeight;

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.value)}`).join(' ');

  const indexAtX = (x: number) => {
    if (data.length <= 1 || width === 0) return 0;
    const ratio = clamp(x / width, 0, 1);
    return Math.round(ratio * (data.length - 1));
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    // Solo se activa con arrastre horizontal: uno vertical se cede al ScrollView contenedor.
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart((e) => setActiveIndex(indexAtX(e.x)))
    .onUpdate((e) => setActiveIndex(indexAtX(e.x)))
    .onEnd(() => setActiveIndex(null))
    .onFinalize(() => setActiveIndex(null));

  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <View>
      <View style={styles.tooltipSlot}>
        {active ? (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipLabel}>{active.label}</Text>
            <Text style={styles.tooltipValue}>
              {formatValue(active.value)}
              {active.highlight ? ' 🏆' : ''}
            </Text>
          </View>
        ) : null}
      </View>
      <GestureDetector gesture={pan}>
        <View onLayout={onLayout} style={{ height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              {activeIndex !== null ? (
                <Line
                  x1={xFor(activeIndex)}
                  x2={xFor(activeIndex)}
                  y1={padding}
                  y2={padding + chartHeight}
                  stroke={colors.borderLight}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              ) : null}
              <Path d={pathD} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {data.map((d, i) => {
                const isActive = activeIndex === i;
                const r = d.highlight ? 5 : isActive ? 4.5 : 2.5;
                return (
                  <Circle
                    key={i}
                    cx={xFor(i)}
                    cy={yFor(d.value)}
                    r={r}
                    fill={d.highlight ? highlightColor : isActive ? colors.text : lineColor}
                  />
                );
              })}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipSlot: {
    height: 24,
    justifyContent: 'center',
  },
  tooltip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexDirection: 'row',
    gap: 6,
  },
  tooltipLabel: {
    color: colors.textDim,
    fontSize: font.size.xs,
  },
  tooltipValue: {
    color: colors.accent,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
  },
});
