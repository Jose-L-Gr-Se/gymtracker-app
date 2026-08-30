import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineChart } from '@/components/charts/LineChart';
import { Card, EmptyState, StatTile } from '@/components/ui';
import { calcExerciseProgression, calcProjectedProgress } from '@/domain/analytics';
import { formatWeight, weightUnitLabel } from '@/domain/units';
import { useAppData } from '@/state/useAppData';
import { colors, font, spacing } from '@/theme/tokens';

/** Progresión de un ejercicio: histórico, e1RM, PRs y proyección a 12 semanas. */
export default function ExerciseProgression() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, exercises, prefs } = useAppData();

  const exercise = exercises.find((ex) => ex.id === id);
  const progression = useMemo(() => calcExerciseProgression(id ?? '', sessions), [id, sessions]);
  const projection = useMemo(() => calcProjectedProgress(id ?? '', sessions, 12), [id, sessions]);

  const unit = weightUnitLabel(prefs.unitPref);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: exercise?.name ?? 'Progresión' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        {progression.points.length === 0 ? (
          <EmptyState title="Sin datos todavía" message="Completa series de este ejercicio para ver tu progresión." />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <StatTile label={`PR (${unit})`} value={formatWeight(progression.prWeight, prefs.unitPref)} />
              <StatTile label={`e1RM (${unit})`} value={formatWeight(progression.best1RM, prefs.unitPref)} />
              <StatTile label="Sesiones" value={String(progression.totalSessions)} />
            </View>

            {projection && (
              <Card style={{ backgroundColor: colors.accentDim, borderColor: colors.accentBorder, gap: spacing.xs }}>
                <Text style={{ color: colors.accent, fontSize: font.size.sm, fontWeight: font.weight.bold }}>
                  PROYECCIÓN A {projection.weeksAhead} SEMANAS
                </Text>
                <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy }}>
                  {formatWeight(projection.projected, prefs.unitPref)} {unit}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                  Al ritmo actual (+{formatWeight(projection.weeklyGain, prefs.unitPref)} {unit}/sem) sobre{' '}
                  {projection.dataPoints} sesiones.
                </Text>
              </Card>
            )}

            {/* Gráfica de mejor peso por sesión, con PRs destacados */}
            <Card style={{ gap: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>
                Mejor peso por sesión
              </Text>
              <LineChart
                data={progression.points.slice(-24).map((p) => ({
                  label: p.date,
                  value: p.bestWeight,
                  highlight: p.isPR,
                }))}
                formatValue={(v) => `${formatWeight(v, prefs.unitPref)} ${unit}`}
              />
              <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                Últimas {Math.min(24, progression.points.length)} sesiones · arrastra para explorar · los puntos dorados son PR.
              </Text>
            </Card>

            {/* Detalle por sesión */}
            <Card style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>Histórico</Text>
              {progression.points
                .slice()
                .reverse()
                .map((p, i) => (
                  <View key={`${p.date}_${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                      {p.date} {p.isPR ? '🏆' : ''}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>
                      {formatWeight(p.bestWeight, prefs.unitPref)} {unit} × {p.bestReps}
                      <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                        {'  '}e1RM {formatWeight(p.e1rm, prefs.unitPref)}
                      </Text>
                    </Text>
                  </View>
                ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
