import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Google,
  googleAuthConfig,
  isAppleAvailable,
  isCancellation,
  isGoogleConfigured,
  requestAppleCredential,
} from '@/services/socialAuth';
import { useAuth } from '@/state/useAuth';
import { colors, font, radius, spacing, TAP } from '@/theme/tokens';

/**
 * Botones de acceso con Google y Apple.
 *
 * Cada botón solo aparece si su proveedor está realmente disponible: Google
 * necesita los client IDs en el entorno y Apple solo existe en iOS con cuenta
 * de desarrollador. Preferimos no ofrecer el botón a ofrecer uno que falla.
 * Si no hay ninguno disponible, el componente no renderiza nada (ni siquiera
 * el separador "o").
 */
export function SocialAuthButtons({ onError }: { onError: (message: string) => void }) {
  const signInWithIdToken = useAuth((s) => s.signInWithIdToken);
  const [appleReady, setAppleReady] = useState(false);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(googleAuthConfig);

  useEffect(() => {
    void isAppleAvailable().then(setAppleReady);
  }, []);

  /**
   * `promptAsync` resuelve con el resultado, así que todo el flujo vive en el
   * manejador: no hace falta un efecto que observe `response` (y que además
   * obligaría a llamar setState de forma síncrona dentro del efecto).
   */
  const signInWithGoogle = async () => {
    setBusy('google');
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        // cancel / dismiss: el usuario cerró el diálogo, no es un error que reportar
        if (result.type === 'error') {
          onError(result.error?.message ?? 'No se pudo iniciar sesión con Google.');
        }
        return;
      }
      const idToken = result.params?.id_token ?? result.authentication?.idToken;
      if (!idToken) {
        onError('Google no devolvió un token de identidad.');
        return;
      }
      const err = await signInWithIdToken('google', idToken);
      if (err) onError(err);
    } catch (e) {
      if (!isCancellation(e)) onError(e instanceof Error ? e.message : 'No se pudo iniciar sesión con Google.');
    } finally {
      setBusy(null);
    }
  };

  const signInWithApple = async () => {
    setBusy('apple');
    try {
      const { idToken, fullName } = await requestAppleCredential();
      const err = await signInWithIdToken('apple', idToken, fullName);
      if (err) onError(err);
    } catch (e) {
      if (!isCancellation(e)) onError(e instanceof Error ? e.message : 'No se pudo iniciar sesión con Apple.');
    } finally {
      setBusy(null);
    }
  };

  const showGoogle = isGoogleConfigured;
  if (!showGoogle && !appleReady) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.separator}>
        <View style={styles.line} />
        <Text style={styles.separatorLabel}>o</Text>
        <View style={styles.line} />
      </View>

      {showGoogle ? (
        <Pressable
          onPress={() => void signInWithGoogle()}
          disabled={!request || busy !== null}
          accessibilityRole="button"
          style={({ pressed }) => [styles.social, (pressed || busy !== null) && { opacity: 0.7 }]}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text style={styles.socialLabel}>Continuar con Google</Text>
            </>
          )}
        </Pressable>
      ) : null}

      {appleReady ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={radius.md}
          style={{ height: TAP + 6 }}
          onPress={() => void signInWithApple()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorLabel: {
    color: colors.textDim,
    fontSize: font.size.sm,
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: TAP + 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardElevated,
  },
  socialLabel: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
});
