import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, SectionTitle } from '@/components/ui';
import {
  calcBodyWeightTrend,
  calcMeasurementTrends,
  calcRepRangeDistribution,
  calcWeeklyVolumeTrend,
} from '@/domain/analytics';
import { MEASUREMENT_TYPES } from '@/domain/constants';
import { localDateKey } from '@/domain/id';
import { formatWeight, toStoredKg, weightUnitLabel } from '@/domain/units';
import { useAppData } from '@/state/useAppData';
import { colors, font, radius, spacing } from '@/theme/tokens';

export default function Progress() {
  const { sessions, exercises, bodyWeight, measurements, prefs, addBodyWeight, deleteBodyWeight, addMeasurement } =
    useAppData();

  const volumeTrend = useMemo(() => calcWeeklyVolumeTrend(sessions, 8), [sessions]);
  const repRange = useMemo(() => calcRepRangeDistribution(sessions), [sessions]);
  const bwTrend = useMemo(() => calcBodyWeightTrend(bodyWeight), [bodyWeight]);
  const msTrends = useMemo(() => calcMeasurementTrends(measurements), [measurements]);

  const trainedExercises = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach((s) => s.exercises.forEach((ex) => ids.add(ex.exerciseId)));
    return exercises.filter((ex) => ids.has(ex.id));
  }, [sessions, exercises]);

  const [bwInput, setBwInput] = useState('');
  const [msType, setMsType] = useState<string>(MEASUREMENT_TYPES[0]);
  const [msInput, setMsInput] = useState('');

  const submitBodyWeight = () => {
    const value = parseFloat(bwInput.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    void addBodyWeight({ date: localDateKey(), value: toStoredKg(value, prefs.unitPref), note: '' });
    setBwInput('');
  };

  const submitMeasurement = () => {
    const value = parseFloat(msInput.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    void addMeasurement({ date: localDateKey(), type: msType, value });
    setMsInput('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <SectionTitle title="Progreso" subtitle="Tendencias de volumen, cuerpo y fuerza" />

        {/* Volumen semanal */}
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={CARD_TITLE}>Volumen semanal (8 sem.)</Text>
            {volumeTrend.trend !== 0 && (
              <Text
                style={{
                  color: volumeTrend.trend > 0 ? colors.success : colors.warning,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.bold,
                }}
              >
                {volumeTrend.trend > 0 ? '▲' : '▼'} {Math.abs(volumeTrend.trend)}%
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: 96 }}>
            {volumeTrend.weeks.map((w) => (
              <View key={w.weekStart} style={{ flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    width: '70%',
                    height: `${Math.max(w.pct, w.volume > 0 ? 8 : 2)}%`,
                    borderRadius: 3,
                    backgroundColor: w.volume > 0 ? colors.accent : colors.surface,
                  }}
                />
                <Text style={{ color: colors.textDim, fontSize: 8 }} numberOfLines={1}>
                  {w.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Distribución de rangos */}
        <Card style={{ gap: spacing.md }}>
          <Text style={CARD_TITLE}>Rangos de repeticiones (7 días)</Text>
          {repRange.total === 0 ? (
            <Text style={{ color: colors.textDim, fontSize: font.size.sm }}>Sin series completadas esta semana.</Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', height: 10, borderRadius: radius.full, overflow: 'hidden' }}>
                {repRange.strengthPct > 0 && <View style={{ flex: repRange.strengthPct, backgroundColor: colors.danger }} />}
                {repRange.hypertrophyPct > 0 && <View style={{ flex: repRange.hypertrophyPct, backgroundColor: colors.accent }} />}
                {repRange.endurancePct > 0 && <View style={{ flex: repRange.endurancePct, backgroundColor: colors.warning }} />}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <LegendDot color={colors.danger} label={`Fuerza ${repRange.strengthPct}%`} />
                <LegendDot color={colors.accent} label={`Hipertrofia ${repRange.hypertrophyPct}%`} />
                <LegendDot color={colors.warning} label={`Resistencia ${repRange.endurancePct}%`} />
              </View>
            </>
          )}
        </Card>

        {/* Peso corporal */}
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={CARD_TITLE}>Peso corporal</Text>
            {bwTrend.current !== null && (
              <Text style={{ color: colors.accent, fontSize: font.size.lg, fontWeight: font.weight.heavy }}>
                {formatWeight(bwTrend.current, prefs.unitPref)} {weightUnitLabel(prefs.unitPref)}
                {bwTrend.change !== null ? (
                  <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                    {'  '}({bwTrend.change > 0 ? '+' : ''}
                    {formatWeight(bwTrend.change, prefs.unitPref)})
                  </Text>
                ) : null}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={bwInput}
              onChangeText={setBwInput}
              keyboardType="decimal-pad"
              placeholder={`Peso de hoy (${weightUnitLabel(prefs.unitPref)})`}
              placeholderTextColor={colors.textDim}
              style={INPUT}
            />
            <Button title="Añadir" small onPress={submitBodyWeight} />
          </View>
          {bwTrend.points
            .slice(-5)
            .reverse()
            .map((p) => (
              <Pressable
                key={p.date}
                onLongPress={() =>
                  Alert.alert('Eliminar registro', `¿Eliminar el peso del ${p.date}?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => void deleteBodyWeight(p.date) },
                  ])
                }
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{p.date}</Text>
                <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>
                  {formatWeight(p.value, prefs.unitPref)} {weightUnitLabel(prefs.unitPref)}
                </Text>
              </Pressable>
            ))}
        </Card>

        {/* Medidas */}
        <Card style={{ gap: spacing.md }}>
          <Text style={CARD_TITLE}>Medidas corporales (cm)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {MEASUREMENT_TYPES.map((t) => (
                <Chip key={t} label={t} small active={msType === t} onPress={() => setMsType(t)} />
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={msInput}
              onChangeText={setMsInput}
              keyboardType="decimal-pad"
              placeholder={`${msType} hoy (cm)`}
              placeholderTextColor={colors.textDim}
              style={INPUT}
            />
            <Button title="Añadir" small onPress={submitMeasurement} />
          </View>
          {Object.entries(msTrends).map(([type, trend]) => (
            <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{type}</Text>
              <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>
                {trend.current} cm
                {trend.change !== null ? (
                  <Text style={{ color: trend.change < 0 ? colors.success : colors.textDim, fontSize: font.size.xs }}>
                    {'  '}({trend.change > 0 ? '+' : ''}
                    {trend.change})
                  </Text>
                ) : null}
              </Text>
            </View>
          ))}
        </Card>

        {/* Progresión por ejercicio */}
        <View style={{ gap: spacing.sm }}>
          <SectionTitle title="Progresión por ejercicio" subtitle="Toca un ejercicio para ver su evolución y proyección" />
          {trainedExercises.length === 0 ? (
            <EmptyState title="Sin datos de fuerza" message="Registra entrenos para ver tu progresión." />
          ) : (
            trainedExercises.map((ex) => (
              <Pressable key={ex.id} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{ex.muscleGroup}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{label}</Text>
    </View>
  );
}

const CARD_TITLE = {
  color: colors.text,
  fontSize: font.size.md,
  fontWeight: '700' as const,
};

const INPUT = {
  flex: 1,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.borderLight,
  borderRadius: radius.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: 8,
  color: colors.text,
  fontSize: font.size.sm,
};
