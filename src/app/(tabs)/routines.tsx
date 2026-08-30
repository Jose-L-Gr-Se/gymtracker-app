import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import type { Routine } from '@/domain/types';
import { useAppData } from '@/state/useAppData';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, spacing, TAP } from '@/theme/tokens';

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

        <NavCard
          icon="albums-outline"
          title="Plantillas"
          subtitle="ATLAS v2.0 y divisiones clásicas listas para usar"
          onPress={() => router.push('/templates')}
        />

        <NavCard
          icon="library-outline"
          title="Biblioteca de ejercicios"
          subtitle="Gestiona ejercicios, técnica y descansos por defecto"
          onPress={() => router.push('/exercises')}
        />

        {routines.length === 0 ? (
          <EmptyState
            title="Aún no tienes rutinas"
            message="Empieza por Plantillas para añadir un programa completo, o crea la tuya con + Nueva."
          />
        ) : (
          routines.map((r) => {
            const last = lastByRoutine[r.id];
            return (
              <Card key={r.id} style={{ gap: spacing.md }}>
                <Pressable
                  onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}
                  accessibilityRole="button"
                >
                  {/* Sin truncar: el nombre dice qué sesión es, y los de ATLAS son largos. */}
                  <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
                    {r.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 }}>
                    {r.exercises.length} ejercicio{r.exercises.length === 1 ? '' : 's'}
                    {last ? ` · Última vez: ${last}` : ' · Nunca entrenada'}
                  </Text>
                </Pressable>
                {/* La acción principal ocupa el ancho; el resto son iconos de 44px
                    en vez de cuatro botones de texto apretados en una fila. */}
                <Button
                  title="Entrenar"
                  disabled={workoutActive}
                  onPress={() => router.push({ pathname: '/workout', params: { routineId: r.id } })}
                />
                <View style={{ flexDirection: 'row', gap: spacing.lg, justifyContent: 'flex-end' }}>
                  <RoutineAction
                    icon="create-outline"
                    label="Editar"
                    onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}
                  />
                  <RoutineAction icon="copy-outline" label="Duplicar" onPress={() => void duplicateRoutine(r.id)} />
                  <RoutineAction
                    icon="trash-outline"
                    label="Eliminar"
                    color={colors.danger}
                    onPress={() => confirmDelete(r)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Tarjeta de navegación a una subpantalla (Plantillas, Biblioteca…). */
function NavCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TAP }}>
        <Ionicons name={icon} size={22} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}>{title}</Text>
          <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

/** Acción secundaria de una rutina: icono + etiqueta, con suelo táctil de 44px. */
function RoutineAction({
  icon,
  label,
  onPress,
  color = colors.textMuted,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minWidth: TAP,
        minHeight: TAP,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color, fontSize: font.size.xs }}>{label}</Text>
    </Pressable>
  );
}
