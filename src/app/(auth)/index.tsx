import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { BrandMark } from '@/features/auth/BrandMark';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

/** Puerta de entrada: crear cuenta, iniciar sesión, proveedores o modo invitado. */
export default function Welcome() {
  const continueAsGuest = useAuth((s) => s.continueAsGuest);
  const cloudEnabled = useAuth((s) => s.cloudEnabled);
  const [error, setError] = useState('');

  const startAsGuest = () => {
    if (!cloudEnabled) return void continueAsGuest();
    // Sin cuenta los datos viven solo aquí: conviene decirlo antes, no después.
    Alert.alert(
      'Continuar sin cuenta',
      'Tus entrenos se guardarán solo en este móvil. Si lo pierdes o cambias de teléfono, se pierden. Podrás crear una cuenta más adelante.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => void continueAsGuest() },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
          <BrandMark size={96} />
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text
              style={{
                color: colors.text,
                fontSize: font.size.display,
                fontWeight: font.weight.heavy,
                letterSpacing: -1,
              }}
            >
              GymTracker
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: font.size.md,
                textAlign: 'center',
                lineHeight: 23,
                maxWidth: 300,
              }}
            >
              Registra tus entrenos, controla tu progresión y entrena con cabeza.
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {error ? (
            <Text style={{ color: colors.danger, fontSize: font.size.sm, textAlign: 'center' }}>{error}</Text>
          ) : null}

          {cloudEnabled ? (
            <>
              <Button title="Crear cuenta" onPress={() => router.push('/(auth)/sign-up')} />
              <Button title="Ya tengo cuenta" variant="secondary" onPress={() => router.push('/(auth)/sign-in')} />
              <SocialAuthButtons onError={setError} />
            </>
          ) : null}

          <Button
            title={cloudEnabled ? 'Continuar sin cuenta' : 'Empezar'}
            variant={cloudEnabled ? 'ghost' : 'primary'}
            onPress={startAsGuest}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
