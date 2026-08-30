import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Chip, EmptyState, SectionTitle } from '@/components/ui';
import { calcAllPRs, sessionVolume } from '@/domain/analytics';
import { formatWeight, weightUnitLabel } from '@/domain/units';
import type { Session } from '@/domain/types';
import { MOOD_EMOJIS , colors, font, spacing } from '@/theme/tokens';
import { useAppData } from '@/state/useAppData';

type Tab = 'sessions' | 'prs';

export default function History() {
  const { sessions, prefs, deleteSession } = useAppData();
  const [tab, setTab] = useState<Tab>('sessions');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () => sessions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
    [sessions],
  );
  const prs = useMemo(() => calcAllPRs(sessions), [sessions]);

  const confirmDelete = (session: Session) => {
    Alert.alert('Eliminar sesión', `¿Eliminar la sesión de "${session.routineName}" del ${session.date}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void deleteSession(session.id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <SectionTitle title="Historial" subtitle={`${sessions.length} sesiones · ${prs.length} PRs`} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Sesiones" active={tab === 'sessions'} onPress={() => setTab('sessions')} />
          <Chip label="🏆 PRs" active={tab === 'prs'} onPress={() => setTab('prs')} />
        </View>

        {tab === 'sessions' ? (
          sorted.length === 0 ? (
            <EmptyState title="Sin sesiones todavía" message="Cuando termines tu primer entreno aparecerá aquí." />
          ) : (
            sorted.map((s) => {
              const expanded = expandedId === s.id;
              const volume = sessionVolume(s);
              return (
                <Card key={s.id} style={{ gap: spacing.sm }}>
                  <Pressable onPress={() => setExpandedId(expanded ? null : s.id)} onLongPress={() => confirmDelete(s)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>
                          {s.routineName}
                        </Text>
                        <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                          {s.date} · {s.durationMin} min · {formatWeight(volume, prefs.unitPref)}{' '}
                          {weightUnitLabel(prefs.unitPref)}
                        </Text>
                      </View>
                      {s.sessionMood ? <Text style={{ fontSize: 20 }}>{MOOD_EMOJIS[s.sessionMood - 1]}</Text> : null}
                    </View>
                    {s.sessionNote ? (
                      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 4 }}>
                        “{s.sessionNote}”
                      </Text>
                    ) : null}
                  </Pressable>

                  {expanded && (
                    <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
                      {s.exercises.map((ex, i) => (
                        <View key={`${ex.exerciseId}_${i}`} style={{ gap: 2 }}>
                          <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>
                            {ex.exerciseName}
                          </Text>
                          {ex.sets
                            .filter((st) => st.completed)
                            .map((st, j) => (
                              <Text key={j} style={{ color: colors.textMuted, fontSize: font.size.xs }}>
                                {`  ${j + 1}. ${formatWeight(st.weight, prefs.unitPref)} ${weightUnitLabel(prefs.unitPref)} × ${st.reps}${st.rpe ? ` @RPE ${st.rpe}` : ''}${st.rir ? ` RIR ${st.rir}` : ''}`}
                              </Text>
                            ))}
                          {ex.notes ? (
                            <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>  📝 {ex.notes}</Text>
                          ) : null}
                        </View>
                      ))}
                      <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                        Mantén pulsada la tarjeta para eliminar la sesión.
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )
        ) : prs.length === 0 ? (
          <EmptyState title="Sin PRs todavía" message="Completa series con peso y aquí verás cada récord personal." />
        ) : (
          prs.map((pr, i) => (
            <Card key={`${pr.exerciseId}_${pr.date}_${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}>
                  {pr.exerciseName}
                </Text>
                <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                  {pr.date} · {pr.routineName}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.accent, fontSize: font.size.lg, fontWeight: font.weight.heavy }}>
                  {formatWeight(pr.weight, prefs.unitPref)} {weightUnitLabel(prefs.unitPref)}
                </Text>
                {pr.previous > 0 ? (
                  <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                    antes {formatWeight(pr.previous, prefs.unitPref)}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>primera marca</Text>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
