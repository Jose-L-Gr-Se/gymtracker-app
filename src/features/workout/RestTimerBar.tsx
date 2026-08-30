import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { calcRemainingSeconds } from '@/domain/workout';
import type { RestTimerState } from '@/domain/types';
import { colors, font, radius, spacing, TAP } from '@/theme/tokens';

/**
 * Barra fija de descanso. El tiempo se deriva de endAtMs (reloj de pared),
 * así el contador sobrevive a bloqueos de pantalla y segundos en background.
 */
export function RestTimerBar({
  timer,
  onPause,
  onResume,
  onSkip,
  onComplete,
}: {
  timer: RestTimerState;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const paused = timer.pausedAtMs !== null;
  const [remaining, setRemaining] = useState(() =>
    calcRemainingSeconds(timer.endAtMs, paused ? timer.pausedAtMs! : Date.now()),
  );
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    const tick = () => {
      const value = calcRemainingSeconds(timer.endAtMs, paused ? timer.pausedAtMs! : Date.now());
      setRemaining(value);
      if (value <= 0 && !completedRef.current && !paused) {
        completedRef.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      }
    };
    tick();
    if (paused) return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer.endAtMs, timer.pausedAtMs, paused, onComplete]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = timer.totalSeconds > 0 ? (remaining / timer.totalSeconds) * 100 : 0;

  return (
    <View
      style={{
        backgroundColor: colors.cardElevated,
        borderTopWidth: 1,
        borderColor: colors.accentBorder,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ height: 4, borderRadius: radius.full, backgroundColor: colors.surface, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.accent }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontSize: font.size.xl, fontWeight: font.weight.heavy }}>
            {mm}:{ss}
          </Text>
          <Text style={{ color: colors.textDim, fontSize: font.size.xs }} numberOfLines={1}>
            Descanso · {timer.exerciseName}
          </Text>
        </View>
        <Pressable
          onPress={paused ? onResume : onPause}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Reanudar descanso' : 'Pausar descanso'}
          style={styles.timerBtn}
        >
          <Ionicons name={paused ? 'play' : 'pause'} size={26} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Saltar descanso"
          style={styles.timerBtn}
        >
          <Ionicons name="play-skip-forward" size={26} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerBtn: {
    width: TAP,
    height: TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
