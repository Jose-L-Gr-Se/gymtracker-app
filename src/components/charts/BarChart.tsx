import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, font, radius, spacing } from '@/theme/tokens';

export interface BarChartPoint {
  label: string;
  value: number;
  /** Color especial para esta barra (p. ej. dorar la semana con un PR). */
  highlight?: boolean;
}

interface BarChartProps {
  data: BarChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  barColor?: string;
  highlightColor?: string;
}

/**
 * Gráfica de barras interactiva sobre react-native-svg: toca una barra para
 * fijar su tooltip (peso/volumen). Pensada para series cortas (semanas,
 * meses), no para grandes datasets.
 */
export function BarChart({
  data,
  height = 140,
  formatValue = (v) => String(Math.round(v)),
  barColor = colors.accent,
  highlightColor = colors.gold,
}: BarChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barGap = 4;
  const barWidth = width > 0 ? Math.max(2, width / data.length - barGap) : 0;
  const chartHeight = height - 20; // deja hueco abajo para las etiquetas

  const active = selected !== null ? data[selected] : null;

  return (
    <View>
      {active ? (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>{active.label}</Text>
          <Text style={styles.tooltipValue}>{formatValue(active.value)}</Text>
        </View>
      ) : null}
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={chartHeight}>
            {data.map((d, i) => {
              const barHeight = Math.max(d.value > 0 ? 4 : 1, (d.value / maxValue) * chartHeight);
              const x = i * (barWidth + barGap);
              const isSelected = selected === i;
              return (
                <Rect
                  key={i}
                  x={x}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  fill={d.highlight ? highlightColor : barColor}
                  opacity={selected === null || isSelected ? 1 : 0.45}
                />
              );
            })}
          </Svg>
        ) : null}
        {/* Capa de toques: una franja pulsable por barra, superpuesta al SVG */}
        {width > 0 ? (
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', height: chartHeight }]}>
            {data.map((_, i) => (
              <Pressable
                key={i}
                style={{ width: barWidth + barGap }}
                onPress={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {data.map((d, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={[styles.axisLabel, { width: barWidth + barGap }, selected === i && { color: colors.accent }]}
            >
              {i % Math.max(1, Math.ceil(data.length / 8)) === 0 ? d.label : ''}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  tooltipLabel: {
    color: colors.textDim,
    fontSize: font.size.xs,
  },
  tooltipValue: {
    color: colors.accent,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
  },
  axisLabel: {
    color: colors.textDim,
    fontSize: 8,
    textAlign: 'center',
  },
});
