import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, SectionTitle, StatTile } from '@/components/ui';
import {
  calcHeatmap14,
  calcInsights,
  calcSuggestion,
  calcWeeklyAlerts,
  calcWeeklyMuscleLoad,
} from '@/domain/analytics';
import { formatWeight, weightUnitLabel } from '@/domain/units';
import { useAppData } from '@/state/useAppData';
import { useAuth } from '@/state/useAuth';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, radius, spacing } from '@/theme/tokens';

export default function Home() {
  const profile = useAuth((s) => s.profile);
  const { routines, sessions, exercises, prefs, pendingCount, syncing, isGuest } = useAppData();
  const workoutActive = useWorkout((s) => s.active);
  const workoutRoutineName = useWorkout((s) => s.routineName);

  const insights = useMemo(() => calcInsights(sessions), [sessions]);
  const suggestion = useMemo(() => calcSuggestion(routines, sessions), [routines, sessions]);
  const alerts = useMemo(() => calcWeeklyAlerts(sessions, exercises, prefs.weeklyGoal), [sessions, exercises, prefs.weeklyGoal]);
  const muscleLoad = useMemo(() => calcWeeklyMuscleLoad(sessions, exercises), [sessions, exercises]);
  const heatmap = useMemo(() => calcHeatmap14(sessions), [sessions]);

  const suggestedRoutine = suggestion ? routines.find((r) => r.id === suggestion.routineId) : null;
  const firstName = profile.fullName.split(' ')[0] || 'atleta';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Cabecera */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Hola,</Text>
            <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy }}>
              {firstName}
            </Text>
          </View>
          <SyncBadge isGuest={isGuest} syncing={syncing} pendingCount={pendingCount} />
        </View>

        {/* Entreno activo */}
        {workoutActive ? (
          <Pressable onPress={() => router.push('/workout')}>
            <Card style={{ backgroundColor: colors.accentDim, borderColor: colors.accentBorder, gap: spacing.xs }}>
              <Text style={{ color: colors.accent, fontSize: font.size.sm, fontWeight: font.weight.bold }}>
                ENTRENO EN CURSO
              </Text>
              <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
                {workoutRoutineName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Toca para continuar →</Text>
            </Card>
          </Pressable>
        ) : suggestedRoutine ? (
          <Card style={{ gap: spacing.md }}>
            <SectionTitle title="Siguiente entreno" subtitle={suggestion?.reason} />
            <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
              {suggestedRoutine.name}
            </Text>
            <Button
              title="Empezar ahora"
              onPress={() => router.push({ pathname: '/workout', params: { routineId: suggestedRoutine.id } })}
            />
          </Card>
        ) : (
          <EmptyState
            title="Crea tu primera rutina"
            message="Ve a la pestaña Rutinas y monta tu plan en un minuto (o usa una plantilla)."
          />
        )}

        {/* Métricas de la semana */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile label="Sesiones (7d)" value={`${insights.sessions7}/${prefs.weeklyGoal}`} />
          <StatTile
            label={`Volumen (7d) ${weightUnitLabel(prefs.unitPref)}`}
            value={formatWeight(insights.volume7, prefs.unitPref)}
          />
          <StatTile label="Racha" value={`${insights.streak}d`} hint={insights.prs7 > 0 ? `🏆 ${insights.prs7} PR` : undefined} />
        </View>

        {/* Alertas */}
        {alerts.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle title="Avisos de tu semana" />
            {alerts.map((a) => (
              <Card
                key={a.id}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: a.level === 'high' ? colors.danger : a.level === 'medium' ? colors.warning : colors.textDim,
                  gap: 2,
                }}
              >
                <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}>
                  {a.title}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 19 }}>{a.message}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* Actividad 14 días */}
        <View style={{ gap: spacing.sm }}>
          <SectionTitle title="Últimos 14 días" />
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {heatmap.map((d) => (
                <View key={d.key} style={{ alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: d.count > 0 ? colors.accent : colors.surface,
                      borderWidth: d.count > 0 ? 0 : 1,
                      borderColor: colors.border,
                    }}
                  />
                  <Text style={{ color: colors.textDim, fontSize: 9 }}>{d.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Carga muscular semanal */}
        <View style={{ gap: spacing.sm }}>
          <SectionTitle title="Carga semanal por grupo muscular" subtitle="Volumen de los últimos 7 días" />
          <Card style={{ gap: spacing.md }}>
            {muscleLoad.filter((m) => m.isWorked).length === 0 ? (
              <Text style={{ color: colors.textDim, fontSize: font.size.sm }}>
                Sin volumen registrado esta semana.
              </Text>
            ) : (
              muscleLoad
                .filter((m) => m.isWorked)
                .map((m) => (
                  <View key={m.group} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
                        {m.group}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>
                        {formatWeight(m.weeklyVolume, prefs.unitPref)} {weightUnitLabel(prefs.unitPref)}
                      </Text>
                    </View>
                    <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surface, overflow: 'hidden' }}>
                      <View
                        style={{
                          width: `${m.pct}%`,
                          height: '100%',
                          backgroundColor:
                            m.level === 'high' ? colors.accent : m.level === 'medium' ? colors.warning : colors.textDim,
                        }}
                      />
                    </View>
                  </View>
                ))
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SyncBadge({ isGuest, syncing, pendingCount }: { isGuest: boolean; syncing: boolean; pendingCount: number }) {
  if (isGuest) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="phone-portrait-outline" size={14} color={colors.textDim} />
        <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>Solo local</Text>
      </View>
    );
  }
  const label = syncing ? 'Sincronizando…' : pendingCount > 0 ? `${pendingCount} pendiente(s)` : 'Sincronizado';
  const color = syncing ? colors.warning : pendingCount > 0 ? colors.warning : colors.success;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="cloud-done-outline" size={14} color={color} />
      <Text style={{ color, fontSize: font.size.xs }}>{label}</Text>
    </View>
  );
}
