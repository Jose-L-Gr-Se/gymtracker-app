import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Divider, Input, SectionTitle } from '@/components/ui';
import { ReorderableList } from '@/components/ReorderableList';
import { MUSCLE_GROUPS } from '@/domain/constants';
import type { Exercise, MuscleGroup, RoutineExercise } from '@/domain/types';
import { useAppData } from '@/state/useAppData';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, radius, spacing } from '@/theme/tokens';

/** Editor de rutina: nombre, ejercicios, objetivos y superseries. */
export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { routines, exercises, saveRoutine } = useAppData();
  const applyRoutineEdit = useWorkout((s) => s.applyRoutineEdit);

  const existing = useMemo(() => routines.find((r) => r.id === id), [routines, id]);
  const [name, setName] = useState(existing?.name ?? '');
  const [items, setItems] = useState<RoutineExercise[]>(existing?.exercises ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const buildItem = (ex: Exercise): RoutineExercise => ({
    exerciseId: ex.id,
    exerciseName: ex.name,
    muscleGroup: ex.muscleGroup,
    targetSets: 3,
    restSeconds: ex.defaultRest,
    linkedToNext: false,
    targetRepsMin: null,
    targetRepsMax: null,
    targetRirMin: null,
    targetRirMax: null,
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  const patchItem = (index: number, patch: Partial<RoutineExercise>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre a la rutina.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Rutina vacía', 'Añade al menos un ejercicio.');
      return;
    }
    setSaving(true);
    const normalized = items.map((it, i) => (i === items.length - 1 ? { ...it, linkedToNext: false } : it));
    const routine = await saveRoutine({ id: existing?.id, name: name.trim(), exercises: normalized });
    applyRoutineEdit(routine);
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: isNew ? 'Nueva rutina' : 'Editar rutina' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="p. ej. Push Day" />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle title="Ejercicios" subtitle="El orden marca el flujo del entreno" />
          <Button title="+ Añadir" small variant="secondary" onPress={() => setPickerOpen(true)} />
        </View>

        {items.length > 1 ? (
          <Text style={{ color: colors.textDim, fontSize: font.size.xs, marginTop: -spacing.sm }}>
            Mantén pulsada la asa ⠿ para arrastrar, o usa las flechas.
          </Text>
        ) : null}

        <ReorderableList
          data={items}
          keyExtractor={(it) => it.exerciseId}
          onReorder={setItems}
          renderItem={(it, i, dragHandle) => (
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {dragHandle}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>
                  {it.exerciseName}
                </Text>
                <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{it.muscleGroup}</Text>
              </View>
              <IconBtn name="chevron-up" onPress={() => move(i, -1)} disabled={i === 0} />
              <IconBtn name="chevron-down" onPress={() => move(i, 1)} disabled={i === items.length - 1} />
              <IconBtn name="trash-outline" color={colors.danger} onPress={() => removeItem(i)} />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <NumField label="Series" value={it.targetSets} min={1} onChange={(v) => patchItem(i, { targetSets: v })} />
              <NumField
                label="Descanso (s)"
                value={it.restSeconds}
                min={0}
                step={15}
                onChange={(v) => patchItem(i, { restSeconds: v })}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <RangeField
                label="Reps objetivo"
                min={it.targetRepsMin}
                max={it.targetRepsMax}
                onChange={(min, max) => patchItem(i, { targetRepsMin: min, targetRepsMax: max })}
              />
              <RangeField
                label="RIR objetivo"
                min={it.targetRirMin}
                max={it.targetRirMax}
                onChange={(min, max) => patchItem(i, { targetRirMin: min, targetRirMax: max })}
              />
            </View>

            {i < items.length - 1 && (
              <Pressable
                onPress={() => patchItem(i, { linkedToNext: !it.linkedToNext })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Ionicons
                  name={it.linkedToNext ? 'link' : 'link-outline'}
                  size={16}
                  color={it.linkedToNext ? colors.accent : colors.textDim}
                />
                <Text style={{ color: it.linkedToNext ? colors.accent : colors.textDim, fontSize: font.size.sm }}>
                  {it.linkedToNext ? 'En superserie con el siguiente' : 'Enlazar con el siguiente (superserie)'}
                </Text>
              </Pressable>
            )}
          </Card>
          )}
        />

        <Button title={isNew ? 'Crear rutina' : 'Guardar cambios'} loading={saving} onPress={() => void save()} />
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        exercises={exercises}
        selectedIds={items.map((it) => it.exerciseId)}
        onClose={() => setPickerOpen(false)}
        onToggle={(ex) => {
          const idx = items.findIndex((it) => it.exerciseId === ex.id);
          if (idx >= 0) removeItem(idx);
          else setItems([...items, buildItem(ex)]);
        }}
      />
    </SafeAreaView>
  );
}

function IconBtn({
  name,
  onPress,
  disabled,
  color = colors.textMuted,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={{ opacity: disabled ? 0.3 : 1 }}>
      <Ionicons name={name} size={20} color={color} />
    </Pressable>
  );
}

function NumField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable onPress={() => onChange(Math.max(min, value - step))} style={stepBtn}>
          <Text style={{ color: colors.text, fontSize: font.size.lg }}>−</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, minWidth: 34, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={() => onChange(value + step)} style={stepBtn}>
          <Text style={{ color: colors.text, fontSize: font.size.lg }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RangeField({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const parse = (t: string): number | null => {
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <TextInput
          value={min === null ? '' : String(min)}
          onChangeText={(t) => onChange(parse(t), max)}
          keyboardType="number-pad"
          placeholder="min"
          placeholderTextColor={colors.textDim}
          style={rangeInput}
        />
        <Text style={{ color: colors.textDim }}>–</Text>
        <TextInput
          value={max === null ? '' : String(max)}
          onChangeText={(t) => onChange(min, parse(t))}
          keyboardType="number-pad"
          placeholder="max"
          placeholderTextColor={colors.textDim}
          style={rangeInput}
        />
      </View>
    </View>
  );
}

function ExercisePicker({
  visible,
  exercises,
  selectedIds,
  onToggle,
  onClose,
}: {
  visible: boolean;
  exercises: Exercise[];
  selectedIds: string[];
  onToggle: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const normalized = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = exercises.filter(
    (ex) =>
      (!group || ex.muscleGroup === group) &&
      (!search.trim() || normalized(ex.name).includes(normalized(search))),
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionTitle title="Añadir ejercicios" subtitle={`${selectedIds.length} seleccionado(s)`} />
            <Button title="Listo" small onPress={onClose} />
          </View>
          <Input value={search} onChangeText={setSearch} placeholder="Buscar ejercicio…" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Chip label="Todos" small active={group === null} onPress={() => setGroup(null)} />
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} label={g} small active={group === g} onPress={() => setGroup(g)} />
              ))}
            </View>
          </ScrollView>
          <ScrollView contentContainerStyle={{ gap: spacing.xs }}>
            {filtered.map((ex) => {
              const selected = selectedIds.includes(ex.id);
              return (
                <Pressable
                  key={ex.id}
                  onPress={() => onToggle(ex)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: selected ? colors.accentDim : colors.card,
                    borderWidth: 1,
                    borderColor: selected ? colors.accentBorder : colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  }}
                >
                  <View>
                    <Text style={{ color: selected ? colors.accent : colors.text, fontSize: font.size.md }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{ex.muscleGroup}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <Divider />
          <Text style={{ color: colors.textDim, fontSize: font.size.xs, textAlign: 'center' }}>
            ¿No encuentras un ejercicio? Créalo en Rutinas → Biblioteca de ejercicios.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const stepBtn = {
  width: 34,
  height: 34,
  borderRadius: radius.sm,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.borderLight,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const rangeInput = {
  flex: 1,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.borderLight,
  borderRadius: radius.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
  color: colors.text,
  fontSize: font.size.sm,
  textAlign: 'center' as const,
};
