import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, ProgressBar } from '@/components/ui';
import { TechniqueSheet } from '@/features/exercises/TechniqueSheet';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { findLastSets, countCompletedSets, SET_TYPE_LABELS } from '@/domain/workout';
import type { Exercise, Session, WeightUnit, WorkoutSet } from '@/domain/types';
import { sessionVolume } from '@/domain/analytics';
import { formatWeight, toDisplayWeight, toStoredKg, weightUnitLabel } from '@/domain/units';
import { cancelNotification, scheduleRestEndNotification } from '@/services/notifications';
import { useAppData } from '@/state/useAppData';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, radius, spacing, MOOD_EMOJIS, TAP } from '@/theme/tokens';

/** Entreno activo. */
export default function Workout() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { routines, sessions, exercises, prefs, addSession } = useAppData();
  const userId = useAppData((s) => s.userId);
  const w = useWorkout();
  const [finishOpen, setFinishOpen] = useState(false);
  const [summary, setSummary] = useState<Session | null>(null);
  const [techniqueFor, setTechniqueFor] = useState<Exercise | null>(null);
  const notificationRef = useRef<string | null>(null);

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // Arrancar entreno si llegamos con routineId y no hay uno activo
  useEffect(() => {
    if (!w.active && routineId && userId) {
      const routine = routines.find((r) => r.id === routineId);
      if (routine) void w.start(userId, routine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId, userId, w.active]);

  const startRest = useCallback(
    (seconds: number, exerciseName: string) => {
      if (seconds <= 0) return;
      w.startRest(seconds, exerciseName);
      if (prefs.restAlertsEnabled) {
        void cancelNotification(notificationRef.current);
        void scheduleRestEndNotification(seconds, exerciseName).then((id) => {
          notificationRef.current = id;
        });
      }
    },
    [w, prefs.restAlertsEnabled],
  );

  const clearRestNotification = useCallback(() => {
    void cancelNotification(notificationRef.current);
    notificationRef.current = null;
  }, []);

  const progress = useMemo(() => countCompletedSets(w.exercises), [w.exercises]);

  const finish = async (mood: number | null, note: string) => {
    clearRestNotification();
    const session = await w.finish(mood, note);
    setFinishOpen(false);
    if (session && session.exercises.length > 0) {
      await addSession(session);
      setSummary(session);
    } else {
      router.back();
    }
  };

  const confirmDiscard = () => {
    Alert.alert('Descartar entreno', 'Se perderá todo el progreso de esta sesión.', [
      { text: 'Seguir entrenando', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          clearRestNotification();
          void w.discard().then(() => router.back());
        },
      },
    ]);
  };

  if (!w.active) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>No hay entreno activo.</Text>
        <Button title="Volver" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {prefs.keepScreenAwake ? <KeepAwakeMount /> : null}
      {/* Cabecera */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={confirmDiscard}
          accessibilityRole="button"
          accessibilityLabel="Descartar entreno"
          style={{ width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm }}
        >
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {/* Dos líneas: es el dato que dice en qué sesión estás, y los nombres
              de ATLAS ("Atlas · Miércoles — Agilidad…") no caben en una. */}
          <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }} numberOfLines={2}>
            {w.routineName}
          </Text>
          <ElapsedLabel startTime={w.startTime} />
        </View>
        <Button title="Terminar" small onPress={() => setFinishOpen(true)} />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <ProgressBar value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
        <Text style={{ color: colors.textDim, fontSize: font.size.xs, marginTop: 4 }}>
          {progress.done}/{progress.total} series completadas
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {w.exercises.map((ex, exIndex) => {
          const routineEx = w.routineExercises.find((re) => re.exerciseId === ex.exerciseId);
          const lastSets = findLastSets(ex.exerciseId, sessions);
          const isLinked = routineEx?.linkedToNext ?? false;
          const target = [
            routineEx?.targetRepsMin !== null || routineEx?.targetRepsMax !== null
              ? `Reps ${routineEx?.targetRepsMin ?? '·'}–${routineEx?.targetRepsMax ?? '·'}`
              : null,
            routineEx?.targetRirMin !== null || routineEx?.targetRirMax !== null
              ? `RIR ${routineEx?.targetRirMin ?? '·'}–${routineEx?.targetRirMax ?? '·'}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <Card key={`${ex.exerciseId}_${exIndex}`} style={{ gap: spacing.md }}>
              {/* Tocar el nombre abre la ficha de técnica: en mitad de una serie
                  es la consulta más útil y no debe obligar a salir del entreno. */}
              <Pressable
                onPress={() => setTechniqueFor(exercisesById.get(ex.exerciseId) ?? null)}
                accessibilityRole="button"
                accessibilityLabel={`Ver técnica de ${ex.exerciseName}`}
                style={{ minHeight: TAP, justifyContent: 'center' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text
                    style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, flexShrink: 1 }}
                  >
                    {ex.exerciseName}
                  </Text>
                  <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
                </View>
                {target ? <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{target}</Text> : null}
                {isLinked ? (
                  <Text style={{ color: colors.accent, fontSize: font.size.xs }}>⛓ Superserie con el siguiente</Text>
                ) : null}
              </Pressable>

              {/* Cabecera de la tabla de series */}
              <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                <Text style={[TH, { width: 36 }]}>Set</Text>
                <Text style={[TH, { flex: 1 }]}>{weightUnitLabel(prefs.unitPref)}</Text>
                <Text style={[TH, { flex: 1 }]}>Reps</Text>
                <Text style={[TH, { flex: 1 }]}>RPE</Text>
                <Text style={[TH, { flex: 1 }]}>RIR</Text>
                <View style={{ width: TAP }} />
              </View>

              {ex.sets.map((st, setIndex) => (
                <SetRow
                  key={setIndex}
                  index={setIndex}
                  set={st}
                  refSet={lastSets[setIndex] ?? lastSets[lastSets.length - 1] ?? null}
                  unit={prefs.unitPref}
                  onChange={(field, value) => w.setField(exIndex, setIndex, field, value)}
                  onToggleType={() => w.cycleType(exIndex, setIndex)}
                  onComplete={() => {
                    const wasCompleted = st.completed;
                    w.toggleCompleted(exIndex, setIndex, lastSets);
                    if (!wasCompleted) startRest(routineEx?.restSeconds ?? 90, ex.exerciseName);
                  }}
                />
              ))}

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="+ Serie" small variant="secondary" style={{ flex: 1 }} onPress={() => w.addSet(exIndex)} />
                <Button
                  title="− Serie"
                  small
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => w.removeSet(exIndex)}
                />
              </View>

              <TextInput
                value={ex.notes}
                onChangeText={(t) => w.setNotes(exIndex, t)}
                placeholder="Notas del ejercicio…"
                placeholderTextColor={colors.textDim}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  color: colors.text,
                  fontSize: font.size.sm,
                }}
              />
            </Card>
          );
        })}
      </ScrollView>

      {/* Barra de descanso */}
      {w.restTimer && (
        <RestTimerBar
          timer={w.restTimer}
          onPause={() => {
            clearRestNotification();
            w.pauseRest();
          }}
          onResume={() => {
            w.resumeRest();
            if (prefs.restAlertsEnabled && w.restTimer) {
              const secs = Math.ceil((w.restTimer.endAtMs - Date.now()) / 1000);
              void scheduleRestEndNotification(secs, w.restTimer.exerciseName).then((id) => {
                notificationRef.current = id;
              });
            }
          }}
          onSkip={() => {
            clearRestNotification();
            w.stopRest();
          }}
          onComplete={() => w.stopRest()}
        />
      )}

      <FinishModal visible={finishOpen} onCancel={() => setFinishOpen(false)} onFinish={finish} />
      <SummaryModal session={summary} unitPref={prefs.unitPref} onClose={() => { setSummary(null); router.back(); }} />
      <TechniqueSheet exercise={techniqueFor} onClose={() => setTechniqueFor(null)} />
    </SafeAreaView>
  );
}

/** Mantener pantalla encendida solo mientras este componente está montado. */
function KeepAwakeMount() {
  useKeepAwake();
  return null;
}

function ElapsedLabel({ startTime }: { startTime: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const minutes = Math.max(0, Math.round((now - new Date(startTime).getTime()) / 60000));
  return (
    <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
      {minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}
    </Text>
  );
}

/**
 * Campo de peso con conversión real de unidades.
 *
 * El peso se almacena SIEMPRE en kg canónico y se convierte en el límite de
 * entrada/salida. Usa un borrador local mientras se teclea para que la
 * conversión de ida y vuelta nunca compita con lo que el usuario escribe
 * (en lbs, escribir "225" debe verse "225" sin parpadeos y guardarse ~102.06 kg).
 * En kg el valor pasa directo, sin formateo intermedio que redondee decimales.
 */
function WeightField({
  valueKg,
  unit,
  placeholderKg,
  editable,
  onChangeKg,
}: {
  valueKg: string;
  unit: WeightUnit;
  placeholderKg: string;
  editable: boolean;
  onChangeKg: (kg: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const toDisplay = (kg: string): string => {
    if (kg === '') return '';
    if (unit === 'kg') return kg; // paso directo: sin formateo ni redondeo
    const n = parseFloat(kg);
    return Number.isFinite(n) ? String(toDisplayWeight(n, unit)) : kg;
  };

  const handleText = (raw: string) => {
    const t = raw.replace(',', '.');
    setDraft(t);
    if (t === '') return onChangeKg('');
    const n = parseFloat(t);
    if (!Number.isFinite(n)) return; // no guardamos texto no numérico
    onChangeKg(unit === 'kg' ? t : String(toStoredKg(n, unit)));
  };

  return (
    <TextInput
      value={draft ?? toDisplay(valueKg)}
      onChangeText={handleText}
      onBlur={() => setDraft(null)}
      keyboardType="decimal-pad"
      editable={editable}
      placeholder={toDisplay(placeholderKg) || '·'}
      placeholderTextColor={colors.textDim}
      style={setInputStyle(!editable)}
    />
  );
}

const setInputStyle = (completed: boolean) => ({
  flex: 1,
  minHeight: TAP,
  backgroundColor: completed ? colors.successBg : colors.surface,
  borderWidth: 1,
  borderColor: completed ? colors.success : colors.borderLight,
  borderRadius: radius.sm,
  paddingVertical: 8,
  color: colors.text,
  fontSize: font.size.md,
  textAlign: 'center' as const,
});

function SetRow({
  index,
  set,
  refSet,
  unit,
  onChange,
  onToggleType,
  onComplete,
}: {
  index: number;
  set: WorkoutSet;
  /** Serie equivalente de la última sesión: se usa como placeholder de referencia. */
  refSet: WorkoutSet | null;
  unit: WeightUnit;
  onChange: (field: 'weight' | 'reps' | 'rpe' | 'rir', value: string) => void;
  onToggleType: () => void;
  onComplete: () => void;
}) {
  const typeLabel = SET_TYPE_LABELS[set.type];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
      <Pressable
        onPress={onToggleType}
        style={{ width: 36, minHeight: TAP, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel={`Serie ${index + 1}, cambiar tipo`}
      >
        <Text
          style={{
            color: typeLabel ? colors.warning : colors.textMuted,
            fontSize: font.size.md,
            fontWeight: font.weight.bold,
          }}
        >
          {typeLabel || index + 1}
        </Text>
      </Pressable>

      <WeightField
        valueKg={set.weight}
        unit={unit}
        placeholderKg={refSet?.weight ?? ''}
        editable={!set.completed}
        onChangeKg={(kg) => onChange('weight', kg)}
      />

      {(['reps', 'rpe', 'rir'] as const).map((field) => (
        <TextInput
          key={field}
          value={set[field]}
          onChangeText={(t) => onChange(field, t.replace(',', '.'))}
          keyboardType="decimal-pad"
          editable={!set.completed}
          placeholder={(field === 'reps' ? refSet?.reps : '') || '·'}
          placeholderTextColor={colors.textDim}
          style={setInputStyle(set.completed)}
        />
      ))}

      <Pressable
        onPress={onComplete}
        style={{ width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' }}
        accessibilityRole="button"
        accessibilityLabel={set.completed ? 'Desmarcar serie' : 'Completar serie'}
      >
        <Ionicons
          name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={set.completed ? colors.success : colors.textMuted}
        />
      </Pressable>
    </View>
  );
}

function FinishModal({
  visible,
  onCancel,
  onFinish,
}: {
  visible: boolean;
  onCancel: () => void;
  onFinish: (mood: number | null, note: string) => Promise<void>;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl }}>
        <Card elevated style={{ gap: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy }}>
            ¿Terminar entreno?
          </Text>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>¿Cómo ha ido la sesión?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {MOOD_EMOJIS.map((emoji, i) => (
                <Pressable
                  key={emoji}
                  onPress={() => setMood(mood === i + 1 ? null : i + 1)}
                  style={{
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: mood === i + 1 ? colors.accentDim : 'transparent',
                    borderWidth: 1,
                    borderColor: mood === i + 1 ? colors.accentBorder : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Input value={note} onChangeText={setNote} placeholder="Nota de la sesión (opcional)" />
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Guardar sesión"
              loading={saving}
              onPress={() => {
                setSaving(true);
                void onFinish(mood, note).finally(() => setSaving(false));
              }}
            />
            <Button title="Seguir entrenando" variant="ghost" onPress={onCancel} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function SummaryModal({
  session,
  unitPref,
  onClose,
}: {
  session: Session | null;
  unitPref: 'kg' | 'lbs';
  onClose: () => void;
}) {
  if (!session) return null;
  // El volumen se calcula siempre en kg canónico y se convierte solo al mostrarlo.
  const volume = sessionVolume(session);
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl }}>
        <Card elevated style={{ gap: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 44 }}>🏆</Text>
          <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy }}>
            ¡Sesión guardada!
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xl }}>
            <SummaryStat label="Duración" value={`${session.durationMin} min`} />
            <SummaryStat label="Series" value={String(totalSets)} />
            <SummaryStat label={`Volumen (${weightUnitLabel(unitPref)})`} value={formatWeight(volume, unitPref)} />
          </View>
          <Button title="Genial" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </Card>
      </View>
    </Modal>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ color: colors.accent, fontSize: font.size.xl, fontWeight: font.weight.heavy }}>{value}</Text>
      <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{label}</Text>
    </View>
  );
}

const TH = {
  color: colors.textDim,
  fontSize: font.size.xs,
  textAlign: 'center' as const,
  fontWeight: '600' as const,
};
