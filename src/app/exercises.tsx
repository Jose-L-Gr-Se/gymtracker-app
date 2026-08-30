import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Input, SectionTitle } from '@/components/ui';
import { MUSCLE_GROUPS } from '@/domain/constants';
import type { Exercise, MuscleGroup } from '@/domain/types';
import { TechniqueBadge, TechniqueSheet } from '@/features/exercises/TechniqueSheet';
import { useAppData } from '@/state/useAppData';
import { colors, font, spacing, TAP } from '@/theme/tokens';

/** Biblioteca de ejercicios: buscar, crear, editar, eliminar y consultar técnica. */
export default function ExerciseLibrary() {
  const { exercises, sessions, addExercise, updateExercise, deleteExercise } = useAppData();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [techniqueFor, setTechniqueFor] = useState<Exercise | null>(null);

  const usageCount = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => s.exercises.forEach((ex) => (map[ex.exerciseId] = (map[ex.exerciseId] ?? 0) + 1)));
    return map;
  }, [sessions]);

  const normalized = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = exercises.filter(
    (ex) =>
      (!group || ex.muscleGroup === group) &&
      (!search.trim() || normalized(ex.name).includes(normalized(search))),
  );

  const confirmDelete = (ex: Exercise) => {
    Alert.alert(
      'Eliminar ejercicio',
      `¿Eliminar "${ex.name}"? Las sesiones pasadas lo conservan; dejará de estar disponible para nuevas rutinas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void deleteExercise(ex.id) },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle title="Ejercicios" subtitle={`${exercises.length} en tu biblioteca`} />
          <Button title="+ Nuevo" small onPress={() => setEditing('new')} />
        </View>
        <Input value={search} onChangeText={setSearch} placeholder="Buscar…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Chip label="Todos" small active={group === null} onPress={() => setGroup(null)} />
            {MUSCLE_GROUPS.map((g) => (
              <Chip key={g} label={g} small active={group === g} onPress={() => setGroup(g)} />
            ))}
          </View>
        </ScrollView>
        <ScrollView contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.xxl }}>
          {filtered.map((ex) => (
            <Pressable key={ex.id} onPress={() => setEditing(ex)} onLongPress={() => confirmDelete(ex)}>
              <Card
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.md,
                  minHeight: TAP,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: font.size.md,
                        fontWeight: font.weight.semibold,
                        flexShrink: 1,
                      }}
                    >
                      {ex.name}
                    </Text>
                    {ex.isCustom ? <Text style={{ color: colors.accent, fontSize: font.size.xs }}>●</Text> : null}
                    <TechniqueBadge exercise={ex} />
                  </View>
                  <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                    {ex.muscleGroup} · descanso {ex.defaultRest}s
                    {usageCount[ex.id] ? ` · ${usageCount[ex.id]} sesiones` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setTechniqueFor(ex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver técnica de ${ex.name}`}
                  style={{ width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="play-circle-outline" size={24} color={colors.accent} />
                </Pressable>
              </Card>
            </Pressable>
          ))}
          <Text style={{ color: colors.textDim, fontSize: font.size.xs, textAlign: 'center', marginTop: spacing.sm }}>
            Toca para editar · mantén pulsado para eliminar · ▶ para ver técnica
          </Text>
        </ScrollView>
      </View>

      <TechniqueSheet exercise={techniqueFor} onClose={() => setTechniqueFor(null)} />

      {editing !== null && (
        <ExerciseForm
          exercise={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === 'new') await addExercise(input);
            else await updateExercise(editing.id, input);
            setEditing(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ExerciseForm({
  exercise,
  onSave,
  onClose,
}: {
  exercise: Exercise | null;
  onSave: (input: {
    name: string;
    muscleGroup: MuscleGroup;
    defaultRest: number;
    videoUrl: string;
    instructions: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [group, setGroup] = useState<MuscleGroup>(exercise?.muscleGroup ?? 'Pecho');
  const [rest, setRest] = useState(String(exercise?.defaultRest ?? 90));
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? '');
  const [instructions, setInstructions] = useState(exercise?.instructions ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      muscleGroup: group,
      defaultRest: Math.max(0, parseInt(rest, 10) || 90),
      videoUrl: videoUrl.trim(),
      instructions: instructions.trim(),
    });
    setSaving(false);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: spacing.xl,
            gap: spacing.md,
            maxHeight: '90%',
          }}
        >
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <SectionTitle title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'} />
            <Input label="Nombre" value={name} onChangeText={setName} placeholder="p. ej. Remo Gironda" />
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Grupo muscular</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} label={g} small active={group === g} onPress={() => setGroup(g)} />
              ))}
            </View>
            <Input label="Descanso por defecto (segundos)" value={rest} onChangeText={setRest} keyboardType="number-pad" />
            <Input label="Vídeo de técnica (URL, opcional)" value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
            <Input
              label="Instrucciones (opcional)"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
            <Button title="Guardar" loading={saving} disabled={!name.trim()} onPress={() => void submit()} />
            <Button title="Cancelar" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
