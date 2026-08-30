import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

/** Pantalla de bienvenida: entrada a login, registro o modo invitado. */
export default function Welcome() {
  const continueAsGuest = useAuth((s) => s.continueAsGuest);
  const cloudEnabled = useAuth((s) => s.cloudEnabled);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: colors.accentDim,
              borderWidth: 1,
              borderColor: colors.accentBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="barbell" size={44} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: font.size.display, fontWeight: font.weight.heavy }}>
            GymTracker
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: font.size.md,
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 300,
            }}
          >
            Registra tus entrenos, controla tu progresión y entrena con cabeza. Tus datos, siempre contigo.
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          {cloudEnabled ? (
            <>
              <Button title="Crear cuenta" onPress={() => router.push('/(auth)/sign-up')} />
              <Button title="Iniciar sesión" variant="secondary" onPress={() => router.push('/(auth)/sign-in')} />
            </>
          ) : null}
          <Button
            title={cloudEnabled ? 'Continuar sin cuenta' : 'Empezar'}
            variant={cloudEnabled ? 'ghost' : 'primary'}
            onPress={() => void continueAsGuest()}
          />
          {cloudEnabled ? (
            <Text style={{ color: colors.textDim, fontSize: font.size.xs, textAlign: 'center' }}>
              Sin cuenta, tus datos solo viven en este dispositivo.
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
