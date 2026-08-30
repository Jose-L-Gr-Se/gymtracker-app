import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, SectionTitle } from '@/components/ui';
import { TEMPLATE_GROUPS, WORKOUT_TEMPLATES } from '@/domain/constants';
import type { WorkoutTemplate } from '@/domain/types';
import { templateToRoutineExercises } from '@/domain/workout';
import { useAppData } from '@/state/useAppData';
import { colors, font, spacing } from '@/theme/tokens';

/**
 * Catálogo de plantillas de rutina. Agrupa los programas completos (ATLAS)
 * y las divisiones clásicas, y permite añadir cualquiera como rutina propia
 * (editable después, no queda ligada a la plantilla).
 */
export default function Templates() {
  const saveRoutine = useAppData((s) => s.saveRoutine);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const addTemplate = async (template: WorkoutTemplate) => {
    setAddingId(template.id);
    await saveRoutine({ name: template.name, exercises: templateToRoutineExercises(template) });
    setAddingId(null);
    Alert.alert('Rutina creada', `"${template.name}" ya está en tus rutinas. Puedes editarla a tu gusto.`, [
      { text: 'Seguir viendo', style: 'cancel' },
      { text: 'Ir a Rutinas', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Plantillas' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl }}>
        {TEMPLATE_GROUPS.map((group) => {
          const items = WORKOUT_TEMPLATES.filter(group.match);
          if (items.length === 0) return null;
          return (
            <View key={group.title} style={{ gap: spacing.md }}>
              <SectionTitle title={group.title} subtitle={group.subtitle} />
              {items.map((t) => {
                const expanded = expandedId === t.id;
                return (
                  <Card key={t.id} style={{ gap: spacing.md }}>
                    <Pressable
                      onPress={() => setExpandedId(expanded ? null : t.id)}
                      accessibilityRole="button"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>
                          {t.name}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{t.desc}</Text>
                        <Text style={{ color: colors.textDim, fontSize: font.size.xs, marginTop: 2 }}>
                          {t.exercises.length} ejercicio{t.exercises.length === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                    </Pressable>

                    {expanded && (
                      <View
                        style={{
                          gap: spacing.sm,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          paddingTop: spacing.md,
                        }}
                      >
                        {t.exercises.map((ex, i) => (
                          <View key={`${ex.exerciseId}_${i}`} style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <Text style={{ color: colors.textDim, fontSize: font.size.sm, width: 20 }}>{i + 1}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontSize: font.size.sm }}>{ex.exerciseName}</Text>
                              <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                                {ex.targetSets} × {formatRange(ex.targetRepsMin, ex.targetRepsMax) ?? '—'}
                                {formatRange(ex.targetRirMin, ex.targetRirMax)
                                  ? ` · RIR ${formatRange(ex.targetRirMin, ex.targetRirMax)}`
                                  : ''}
                                {ex.restSeconds > 0 ? ` · ${ex.restSeconds}s` : ''}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <Button
                      title="Añadir a mis rutinas"
                      small
                      loading={addingId === t.id}
                      onPress={() => void addTemplate(t)}
                    />
                  </Card>
                );
              })}
            </View>
          );
        })}

        <Text style={{ color: colors.textDim, fontSize: font.size.xs, textAlign: 'center', lineHeight: 17 }}>
          Al añadir una plantilla se crea una copia editable en tus rutinas.{'\n'}
          Cambiarla después no afecta a la plantilla original.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** "8–10", "8" o null si no hay objetivo definido. */
function formatRange(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? String(min) : `${min}–${max}`;
  return String(min ?? max);
}
