import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Input, ProgressBar } from '@/components/ui';
import {
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  GOAL_LABELS,
  GOALS,
  WORKOUT_TEMPLATES,
} from '@/domain/constants';
import type { ExperienceLevel, Goal, WeightUnit } from '@/domain/types';
import { templateToRoutineExercises } from '@/domain/workout';
import { useAppData } from '@/state/useAppData';
import { useAuth } from '@/state/useAuth';
import { colors, font, radius, spacing } from '@/theme/tokens';

/**
 * Onboarding en 4 pasos: nombre → objetivo/experiencia → unidades y meta
 * semanal → rutina inicial desde plantilla (opcional).
 */

const TOTAL_STEPS = 4;

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

  const next = () => (step < TOTAL_STEPS - 1 ? setStep(step + 1) : void finish());
  const canContinue = step !== 0 || name.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl }}>
        <ProgressBar value={((step + 1) / TOTAL_STEPS) * 100} />

        <ScrollView contentContainerStyle={{ gap: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Title text="¿Cómo te llamamos?" sub="Así personalizamos tu experiencia." />
              <Input value={name} onChangeText={setName} placeholder="Tu nombre" autoFocus />
            </>
          )}

          {step === 1 && (
            <>
              <Title text="Tu objetivo" sub="Adaptaremos métricas y alertas a lo que buscas." />
              <View style={{ gap: spacing.sm }}>
                {GOALS.map((g) => (
                  <SelectRow key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
                ))}
              </View>
              <Title text="Experiencia" />
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {EXPERIENCE_LEVELS.map((e) => (
                  <Chip key={e} label={EXPERIENCE_LABELS[e]} active={experience === e} onPress={() => setExperience(e)} />
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Title text="Unidades y ritmo" sub="Podrás cambiarlo cuando quieras en Perfil." />
              <Text style={styles.label}>Unidad de peso</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Chip label="Kilogramos (kg)" active={unit === 'kg'} onPress={() => setUnit('kg')} />
                <Chip label="Libras (lbs)" active={unit === 'lbs'} onPress={() => setUnit('lbs')} />
              </View>
              <Text style={styles.label}>Sesiones por semana: objetivo</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <Chip key={n} label={`${n}`} active={weeklyGoal === n} onPress={() => setWeeklyGoal(n)} />
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Title text="Empieza con una rutina" sub="Elige una plantilla o empieza desde cero." />
              <View style={{ gap: spacing.sm }}>
                {/* Solo las divisiones clásicas: los programas completos (ATLAS)
                    tienen 8 sesiones y abrumarían aquí. Están en Rutinas → Plantillas. */}
                {WORKOUT_TEMPLATES.filter((t) => !t.id.startsWith('tpl-atlas-')).map((t) => (
                  <SelectRow
                    key={t.id}
                    label={t.name}
                    sub={t.desc}
                    selected={templateId === t.id}
                    onPress={() => setTemplateId(t.id)}
                  />
                ))}
                <SelectRow
                  label="Desde cero"
                  sub="Crearé mis rutinas yo mismo"
                  selected={templateId === null}
                  onPress={() => setTemplateId(null)}
                />
              </View>
              <Text style={{ color: colors.textDim, fontSize: font.size.xs, lineHeight: 17 }}>
                Después encontrarás más plantillas en Rutinas → Plantillas, incluido el programa
                completo ATLAS v2.0 de 12 semanas.
              </Text>
            </>
          )}
        </ScrollView>

        <View style={{ gap: spacing.sm }}>
          <Button
            title={step === TOTAL_STEPS - 1 ? 'Empezar a entrenar' : 'Continuar'}
            disabled={!canContinue}
            loading={saving}
            onPress={next}
          />
          {step > 0 ? <Button title="Atrás" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Title({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy }}>{text}</Text>
      {sub ? <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{sub}</Text> : null}
    </View>
  );
}

function SelectRow({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.accentDim : colors.card,
        borderWidth: 1,
        borderColor: selected ? colors.accentBorder : colors.border,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: 2,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? colors.accent : colors.text,
          fontSize: font.size.md,
          fontWeight: font.weight.semibold,
        }}
      >
        {label}
      </Text>
      {sub ? <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{sub}</Text> : null}
    </Pressable>
  );
}

const styles = {
  label: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.medium } as const,
};
