import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Divider, Input, SectionTitle } from '@/components/ui';
import { EXPERIENCE_LABELS, EXPERIENCE_LEVELS, GOAL_LABELS, GOALS } from '@/domain/constants';
import { useAppData } from '@/state/useAppData';
import { useAuth } from '@/state/useAuth';
import { useWorkout } from '@/state/useWorkout';
import { colors, font, spacing } from '@/theme/tokens';

export default function Profile() {
  const auth = useAuth();
  const { prefs, setPrefs, sync, syncing, pendingCount, lastSyncError, isGuest } = useAppData();
  const workoutActive = useWorkout((s) => s.active);

  const [name, setName] = useState(auth.profile.fullName);
  const [birthYear, setBirthYear] = useState(auth.profile.birthYear);
  const [heightCm, setHeightCm] = useState(auth.profile.heightCm);
  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    await auth.saveProfile({ fullName: name, birthYear, heightCm });
    setSavingProfile(false);
    Alert.alert('Guardado', 'Perfil actualizado.');
  };

  const confirmSignOut = () => {
    if (workoutActive) {
      Alert.alert('Entreno en curso', 'Termina o descarta el entreno antes de cerrar sesión.');
      return;
    }
    Alert.alert(
      'Cerrar sesión',
      isGuest
        ? 'Tus datos seguirán guardados en este dispositivo.'
        : pendingCount > 0
          ? `Hay ${pendingCount} cambio(s) sin sincronizar. Se conservarán en el dispositivo y se subirán al volver a entrar.`
          : 'Tus datos están sincronizados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => void auth.signOut() },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <SectionTitle
          title="Perfil"
          subtitle={isGuest ? 'Modo invitado · datos solo en este dispositivo' : auth.user?.email ?? ''}
        />

        {isGuest && auth.cloudEnabled ? (
          <Card style={{ backgroundColor: colors.accentDim, borderColor: colors.accentBorder, gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}>
              Protege tus datos
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Crea una cuenta para sincronizar tus entrenos en la nube y no perderlos si cambias de móvil.
            </Text>
            <Button title="Crear cuenta" small onPress={() => void auth.signOut()} />
          </Card>
        ) : null}

        {/* Datos personales */}
        <Card style={{ gap: spacing.md }}>
          <Text style={CARD_TITLE}>Datos personales</Text>
          <Input label="Nombre" value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input label="Año de nacimiento" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" placeholder="1992" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Altura (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" placeholder="178" />
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Objetivo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {GOALS.map((g) => (
              <Chip
                key={g}
                label={GOAL_LABELS[g]}
                small
                active={auth.profile.goal === g}
                onPress={() => void auth.saveProfile({ goal: g })}
              />
            ))}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Experiencia</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {EXPERIENCE_LEVELS.map((e) => (
              <Chip
                key={e}
                label={EXPERIENCE_LABELS[e]}
                small
                active={auth.profile.experience === e}
                onPress={() => void auth.saveProfile({ experience: e })}
              />
            ))}
          </View>
          <Button title="Guardar cambios" small loading={savingProfile} onPress={() => void saveProfile()} />
        </Card>

        {/* Preferencias de entrenamiento */}
        <Card style={{ gap: spacing.md }}>
          <Text style={CARD_TITLE}>Entrenamiento</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Objetivo semanal (sesiones)</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Chip key={n} label={String(n)} small active={prefs.weeklyGoal === n} onPress={() => void setPrefs({ weeklyGoal: n })} />
            ))}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Unidad de peso</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Chip label="kg" small active={prefs.unitPref === 'kg'} onPress={() => void setPrefs({ unitPref: 'kg' })} />
            <Chip label="lbs" small active={prefs.unitPref === 'lbs'} onPress={() => void setPrefs({ unitPref: 'lbs' })} />
          </View>
          <Divider />
          <ToggleRow
            label="Aviso al terminar el descanso"
            value={prefs.restAlertsEnabled}
            onChange={(v) => void setPrefs({ restAlertsEnabled: v })}
          />
          <ToggleRow
            label="Mantener pantalla encendida al entrenar"
            value={prefs.keepScreenAwake}
            onChange={(v) => void setPrefs({ keepScreenAwake: v })}
          />
        </Card>

        {/* Sincronización */}
        {!isGuest && (
          <Card style={{ gap: spacing.md }}>
            <Text style={CARD_TITLE}>Sincronización</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              {syncing
                ? 'Sincronizando…'
                : pendingCount > 0
                  ? `${pendingCount} cambio(s) pendientes de subir.`
                  : 'Todo sincronizado.'}
            </Text>
            {lastSyncError ? (
              <Text style={{ color: colors.danger, fontSize: font.size.xs }}>Último error: {lastSyncError}</Text>
            ) : null}
            <Button title="Sincronizar ahora" small variant="secondary" loading={syncing} onPress={() => void sync()} />
          </Card>
        )}

        {/* Datos */}
        <Card style={{ gap: spacing.md }}>
          <Text style={CARD_TITLE}>Datos</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            ¿Vienes de la app web de GymTracker? Trae tu historial sin perder nada de lo que ya tengas aquí.
          </Text>
          <Button
            title="Importar desde la PWA"
            small
            variant="secondary"
            onPress={() => router.push('/import-pwa')}
          />
        </Card>

        <Button title={isGuest ? 'Salir del modo invitado' : 'Cerrar sesión'} variant="danger" onPress={confirmSignOut} />
        <Text style={{ color: colors.textDim, fontSize: font.size.xs, textAlign: 'center' }}>
          GymTracker · hecho con 🏋️ para entrenar con cabeza
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.text, fontSize: font.size.sm, flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accentBorder }}
        thumbColor={value ? colors.accent : colors.textDim}
      />
    </View>
  );
}

const CARD_TITLE = {
  color: colors.text,
  fontSize: font.size.md,
  fontWeight: '700' as const,
};
