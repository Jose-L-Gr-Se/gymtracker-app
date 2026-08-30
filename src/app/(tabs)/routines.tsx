import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import type { Routine } from '@/domain/types';
import { useAppData } from '@/state/useAppData';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, spacing } from '@/theme/tokens';

export default function Routines() {
  const { routines, sessions, deleteRoutine, duplicateRoutine } = useAppData();
  const workoutActive = useWorkout((s) => s.active);

  const lastByRoutine = useMemo(() => {
    const map: Record<string, string> = {};
    sessions.forEach((s) => {
      if (!map[s.routineId] || s.date > map[s.routineId]) map[s.routineId] = s.date;
    });
    return map;
  }, [sessions]);

  const confirmDelete = (routine: Routine) => {
    Alert.alert('Eliminar rutina', `¿Seguro que quieres eliminar "${routine.name}"? El historial de sesiones se conserva.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void deleteRoutine(routine.id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle title="Rutinas" subtitle={`${routines.length} creada(s)`} />
          <Button title="+ Nueva" small onPress={() => router.push('/routine/new')} />
        </View>

        <Pressable onPress={() => router.push('/exercises')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="library-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}>
                Biblioteca de ejercicios
              </Text>
              <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                Gestiona ejercicios, técnica y descansos por defecto
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </Card>
        </Pressable>

        {routines.length === 0 ? (
          <EmptyState
            title="Aún no tienes rutinas"
            message="Crea la primera con el botón + Nueva. Podrás elegir ejercicios, series objetivo, rangos de reps y superseries."
          />
        ) : (
          routines.map((r) => {
            const last = lastByRoutine[r.id];
            return (
              <Card key={r.id} style={{ gap: spacing.md }}>
                <Pressable onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}>
                  <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
                    {r.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                    {r.exercises.length} ejercicio(s)
                    {last ? ` · Última vez: ${last}` : ' · Nunca entrenada'}
                  </Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    title="Entrenar"
                    small
                    disabled={workoutActive}
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/workout', params: { routineId: r.id } })}
                  />
                  <Button
                    title="Editar"
                    small
                    variant="secondary"
                    onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}
                  />
                  <Button title="Duplicar" small variant="secondary" onPress={() => void duplicateRoutine(r.id)} />
                  <Button title="🗑" small variant="danger" onPress={() => confirmDelete(r)} />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
