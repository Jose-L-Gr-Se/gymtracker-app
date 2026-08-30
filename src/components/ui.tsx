import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, spacing, TAP } from '@/theme/tokens';

/** Kit UI mínimo y consistente de la app. Sin dependencias externas. */

export function Card({ children, style, elevated = false }: { children: React.ReactNode; style?: ViewStyle; elevated?: boolean }) {
  return <View style={[styles.card, elevated && styles.cardElevated, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

export function Button({ title, variant = 'primary', loading, small, disabled, style, ...rest }: ButtonProps) {
  const base: ViewStyle[] = [styles.btn, small ? styles.btnSmall : {}];
  const label: TextStyle[] = [styles.btnLabel, small ? styles.btnLabelSmall : {}];
  if (variant === 'primary') {
    base.push({ backgroundColor: colors.accent });
    label.push({ color: colors.onAccent });
  } else if (variant === 'secondary') {
    base.push({ backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.borderLight });
    label.push({ color: colors.text });
  } else if (variant === 'danger') {
    base.push({ backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger });
    label.push({ color: colors.danger });
  } else {
    base.push({ backgroundColor: 'transparent' });
    label.push({ color: colors.textMuted });
  }
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [...base, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 }, style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.accent} />
      ) : (
        <Text style={label}>{title}</Text>
      )}
    </Pressable>
  );
}

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active = false,
  onPress,
  small = false,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={small ? { top: 4, bottom: 4 } : undefined}
      style={({ pressed }) => [
        styles.chip,
        small && styles.chipSmall,
        active && { backgroundColor: colors.accentDim, borderColor: colors.accentBorder },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          small && { fontSize: font.size.xs },
          active && { color: colors.accent, fontWeight: font.weight.semibold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl }}>
      <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}>{title}</Text>
      {message ? (
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>{message}</Text>
      ) : null}
    </Card>
  );
}

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]}
      />
    </View>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, paddingVertical: spacing.md }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardElevated: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
  btn: {
    borderRadius: radius.md,
    minHeight: TAP,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // "small" reduce el ancho y la tipografía, nunca por debajo del suelo táctil.
  btnSmall: {
    minHeight: TAP,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
  },
  btnLabel: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  btnLabelSmall: {
    fontSize: font.size.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.size.md,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  inputError: {
    color: colors.danger,
    fontSize: font.size.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
  },
  sectionSubtitle: {
    color: colors.textDim,
    fontSize: font.size.xs,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    minHeight: TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Los chips "small" viven en filas densas (filtros, grupos musculares):
  // se compensa el alto reducido con hitSlop en el componente.
  chipSmall: {
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: font.size.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  statValue: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.heavy,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: font.size.xs,
  },
  statHint: {
    color: colors.textDim,
    fontSize: font.size.xs,
  },
});
