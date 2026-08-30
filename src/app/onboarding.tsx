import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input } from '@/components/ui';
import {
  EXPERIENCE_DESCRIPTIONS,
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  GOALS,
  WORKOUT_TEMPLATES,
} from '@/domain/constants';
import type { ExperienceLevel, Goal, WeightUnit } from '@/domain/types';
import { templateToRoutineExercises } from '@/domain/workout';
import { BrandMark } from '@/features/auth/BrandMark';
import { useAppData } from '@/state/useAppData';
import { useAuth } from '@/state/useAuth';
import { colors, font, radius, spacing, TAP } from '@/theme/tokens';

/**
 * Onboarding en 5 pasos: nombre → objetivo → experiencia → unidades y meta
 * semanal → rutina inicial. Cada paso pide una sola cosa y explica qué implica
 * la elección, para que no se responda a ciegas.
 */

const GOAL_ICONS: Record<Goal, React.ComponentProps<typeof Ionicons>['name']> = {
  general_fitness: 'heart-outline',
  muscle_gain: 'barbell-outline',
  strength: 'flame-outline',
  fat_loss: 'trending-down-outline',
  performance: 'flash-outline',
};

const EXPERIENCE_ICONS: Record<ExperienceLevel, React.ComponentProps<typeof Ionicons>['name']> = {
  beginner: 'leaf-outline',
  intermediate: 'fitness-outline',
  advanced: 'trophy-outline',
};

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const profile = useAuth((s) => s.profile);
  const saveProfile = useAuth((s) => s.saveProfile);
  const setPrefs = useAppData((s) => s.setPrefs);
  const saveRoutine = useAppData((s) => s.saveRoutine);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.fullName);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [experience, setExperience] = useState<ExperienceLevel>(profile.experience);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [templateId, setTemplateId] = useState<string | null>('tpl-fullbody');
  const [saving, setSaving] = useState(false);

  const classicTemplates = WORKOUT_TEMPLATES.filter((t) => !t.id.startsWith('tpl-atlas-'));

  const finish = async () => {
    setSaving(true);
    await saveProfile({ fullName: name.trim(), goal, experience });
    const template = WORKOUT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      await saveRoutine({ name: template.name, exercises: templateToRoutineExercises(template) });
    }
    await setPrefs({ unitPref: unit, weeklyGoal, onboardingDone: true });
    setSaving(false);
    router.replace('/(tabs)');
  };

  const canContinue = step !== 0 || name.trim().length > 0;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
          <StepIndicator step={step} total={TOTAL_STEPS} onBack={step > 0 ? () => setStep(step - 1) : undefined} />

          <ScrollView
            contentContainerStyle={{ gap: spacing.lg, flexGrow: 1, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 0 && (
              <>
                <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                  <BrandMark size={64} />
                </View>
                <Title text="¿Cómo te llamamos?" sub="Solo para personalizar la app. Puedes cambiarlo cuando quieras." />
                <Input value={name} onChangeText={setName} placeholder="Tu nombre" autoFocus returnKeyType="done" />
              </>
            )}

            {step === 1 && (
              <>
                <Title text="¿Cuál es tu objetivo?" sub="Ajustaremos las métricas y los avisos a lo que buscas." />
                {GOALS.map((g) => (
                  <OptionCard
                    key={g}
                    icon={GOAL_ICONS[g]}
                    label={GOAL_LABELS[g]}
                    sub={GOAL_DESCRIPTIONS[g]}
                    selected={goal === g}
                    onPress={() => setGoal(g)}
                  />
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <Title text="¿Cuánta experiencia tienes?" sub="Nos dice qué tan agresivas pueden ser las sugerencias." />
                {EXPERIENCE_LEVELS.map((e) => (
                  <OptionCard
                    key={e}
                    icon={EXPERIENCE_ICONS[e]}
                    label={EXPERIENCE_LABELS[e]}
                    sub={EXPERIENCE_DESCRIPTIONS[e]}
                    selected={experience === e}
                    onPress={() => setExperience(e)}
                  />
                ))}
              </>
            )}

            {step === 3 && (
              <>
                <Title text="Unidades y ritmo" sub="Podrás cambiarlo cuando quieras desde Perfil." />
                <Text style={label}>Unidad de peso</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <BigChoice label="Kilogramos" hint="kg" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
                  <BigChoice label="Libras" hint="lbs" selected={unit === 'lbs'} onPress={() => setUnit('lbs')} />
                </View>
                <Text style={label}>¿Cuántos días quieres entrenar por semana?</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setWeeklyGoal(n)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: weeklyGoal === n }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        backgroundColor: weeklyGoal === n ? colors.accentDim : colors.card,
                        borderColor: weeklyGoal === n ? colors.accentBorder : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: weeklyGoal === n ? colors.accent : colors.text,
                          fontSize: font.size.lg,
                          fontWeight: font.weight.bold,
                        }}
                      >
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: colors.textDim, fontSize: font.size.xs }}>
                  Es tu objetivo, no una obligación: sirve para medir la consistencia.
                </Text>
              </>
            )}

            {step === 4 && (
              <>
                <Title text="Empieza con una rutina" sub="Puedes editarla o crear las tuyas después." />
                {classicTemplates.map((t) => (
                  <OptionCard
                    key={t.id}
                    icon="list-outline"
                    label={t.name}
                    sub={`${t.desc} · ${t.exercises.length} ejercicios`}
                    selected={templateId === t.id}
                    onPress={() => setTemplateId(t.id)}
                  />
                ))}
                <OptionCard
                  icon="create-outline"
                  label="Desde cero"
                  sub="Crearé mis rutinas yo mismo"
                  selected={templateId === null}
                  onPress={() => setTemplateId(null)}
                />
                <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                  <Ionicons name="albums-outline" size={20} color={colors.accent} />
                  <Text style={{ color: colors.textMuted, fontSize: font.size.xs, flex: 1, lineHeight: 17 }}>
                    En Rutinas → Plantillas tienes más, incluido el programa completo ATLAS v2.0 de 12 semanas.
                  </Text>
                </Card>
              </>
            )}
          </ScrollView>

          <Button
            title={isLast ? 'Empezar a entrenar' : 'Continuar'}
            disabled={!canContinue}
            loading={saving}
            onPress={() => (isLast ? void finish() : setStep(step + 1))}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Barra de progreso por segmentos + botón atrás, siempre en el mismo sitio. */
function StepIndicator({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Pressable
        onPress={onBack}
        disabled={!onBack}
        accessibilityRole="button"
        accessibilityLabel="Atrás"
        style={{
          width: TAP,
          height: TAP,
          marginLeft: -spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: onBack ? 1 : 0,
        }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textMuted} />
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: i <= step ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>
      <Text style={{ color: colors.textDim, fontSize: font.size.xs, minWidth: 34, textAlign: 'right' }}>
        {step + 1}/{total}
      </Text>
    </View>
  );
}

function Title({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy, letterSpacing: -0.5 }}>
        {text}
      </Text>
      {sub ? <Text style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 22 }}>{sub}</Text> : null}
    </View>
  );
}

function OptionCard({
  icon,
  label,
  sub,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: TAP + 16,
        backgroundColor: selected ? colors.accentDim : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.accentBorder : colors.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={selected ? colors.accent : colors.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: selected ? colors.accent : colors.text,
            fontSize: font.size.md,
            fontWeight: font.weight.semibold,
          }}
        >
          {label}
        </Text>
        {sub ? <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 19 }}>{sub}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
    </Pressable>
  );
}

function BigChoice({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        minHeight: 72,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: selected ? colors.accentDim : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.accentBorder : colors.border,
        borderRadius: radius.lg,
      }}
    >
      <Text
        style={{
          color: selected ? colors.accent : colors.text,
          fontSize: font.size.xl,
          fontWeight: font.weight.heavy,
        }}
      >
        {hint}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{label}</Text>
    </Pressable>
  );
}

const label = {
  color: colors.textMuted,
  fontSize: font.size.sm,
  fontWeight: font.weight.medium,
} as const;
