import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, ProgressBar } from '@/components/ui';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { findLastSets, countCompletedSets, SET_TYPE_LABELS } from '@/domain/workout';
import type { Session, WorkoutSet } from '@/domain/types';
import { cancelNotification, scheduleRestEndNotification } from '@/services/notifications';
import { useAppData } from '@/state/useAppData';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, radius, spacing , MOOD_EMOJIS } from '@/theme/tokens';

/** Entreno activo. */
export default function Workout() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { routines, sessions, prefs, addSession } = useAppData();
  const userId = useAppData((s) => s.userId);
  const w = useWorkout();
  const [finishOpen, setFinishOpen] = useState(false);
  const [summary, setSummary] = useState<Session | null>(null);
  const notificationRef = useRef<string | null>(null);

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
        <Pressable onPress={confirmDiscard} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }} numberOfLines={1}>
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
              <View>
                <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>
                  {ex.exerciseName}
                </Text>
                {target ? <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>{target}</Text> : null}
                {isLinked ? (
                  <Text style={{ color: colors.accent, fontSize: font.size.xs }}>⛓ Superserie con el siguiente</Text>
                ) : null}
              </View>

              {/* Cabecera de la tabla de series */}
              <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                <Text style={[TH, { width: 32 }]}>Set</Text>
                <Text style={[TH, { flex: 1 }]}>{prefs.unitPref === 'lbs' ? 'lbs' : 'kg'}</Text>
                <Text style={[TH, { flex: 1 }]}>Reps</Text>
                <Text style={[TH, { flex: 1 }]}>RPE</Text>
                <Text style={[TH, { flex: 1 }]}>RIR</Text>
                <View style={{ width: 64 }} />
              </View>

              {ex.sets.map((st, setIndex) => (
                <SetRow
                  key={setIndex}
                  index={setIndex}
                  set={st}
                  hasLast={lastSets.length > 0}
                  onChange={(field, value) => w.setField(exIndex, setIndex, field, value)}
                  onToggleType={() => w.cycleType(exIndex, setIndex)}
                  onFill={() => w.fillFromLast(exIndex, setIndex, lastSets)}
                  onComplete={() => {
                    const wasCompleted = st.completed;
                    w.toggleCompleted(exIndex, setIndex);
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

function SetRow({
  index,
  set,
  hasLast,
  onChange,
  onToggleType,
  onFill,
  onComplete,
}: {
  index: number;
  set: WorkoutSet;
  hasLast: boolean;
  onChange: (field: 'weight' | 'reps' | 'rpe' | 'rir', value: string) => void;
  onToggleType: () => void;
  onFill: () => void;
  onComplete: () => void;
}) {
  const typeLabel = SET_TYPE_LABELS[set.type];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
      <Pressable onPress={onToggleType} style={{ width: 32, alignItems: 'center' }} hitSlop={6}>
        <Text
          style={{
            color: typeLabel ? colors.warning : colors.textMuted,
            fontSize: font.size.sm,
            fontWeight: font.weight.bold,
          }}
        >
          {typeLabel || index + 1}
        </Text>
      </Pressable>
      {(['weight', 'reps', 'rpe', 'rir'] as const).map((field) => (
        <TextInput
          key={field}
          value={set[field]}
          onChangeText={(t) => onChange(field, t.replace(',', '.'))}
          keyboardType="decimal-pad"
          editable={!set.completed}
          placeholder="·"
          placeholderTextColor={colors.textDim}
          style={{
            flex: 1,
            backgroundColor: set.completed ? colors.successBg : colors.surface,
            borderWidth: 1,
            borderColor: set.completed ? colors.success : colors.borderLight,
            borderRadius: radius.sm,
            paddingVertical: 8,
            color: colors.text,
            fontSize: font.size.sm,
            textAlign: 'center',
          }}
        />
      ))}
      <View style={{ width: 64, flexDirection: 'row', gap: spacing.xs, justifyContent: 'flex-end' }}>
        {hasLast && !set.completed ? (
          <Pressable onPress={onFill} hitSlop={6}>
            <Ionicons name="copy-outline" size={20} color={colors.textDim} />
          </Pressable>
        ) : null}
        <Pressable onPress={onComplete} hitSlop={6}>
          <Ionicons
            name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={set.completed ? colors.success : colors.textDim}
          />
        </Pressable>
      </View>
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
  const volume = session.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets
        .filter((s) => s.completed)
        .reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0),
    0,
  );
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
            <SummaryStat
              label={`Volumen (${unitPref})`}
              value={String(Math.round(unitPref === 'lbs' ? volume * 2.20462 : volume))}
            />
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
