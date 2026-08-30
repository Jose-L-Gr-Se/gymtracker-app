import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, PasswordInput } from '@/components/ui';
import { BrandHeader } from '@/features/auth/BrandMark';
import { translateAuthError } from '@/features/auth/errors';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

const MIN_PASSWORD = 8;

/** Fuerza de la contraseña: señal simple, sin bloquear al usuario. */
function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (password.length < MIN_PASSWORD) return { score: 0, label: `Mínimo ${MIN_PASSWORD} caracteres`, color: colors.textDim };
  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  if (password.length >= 12 && variety >= 3) return { score: 3, label: 'Contraseña fuerte', color: colors.success };
  if (variety >= 2) return { score: 2, label: 'Contraseña aceptable', color: colors.warning };
  return { score: 1, label: 'Contraseña débil: mezcla letras, números y símbolos', color: colors.warning };
}

export default function SignUp() {
  const signUp = useAuth((s) => s.signUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  const submit = async () => {
    const next: typeof fieldErrors = {};
    if (!fullName.trim()) next.fullName = 'Dinos cómo te llamas.';
    if (!email.trim().includes('@')) next.email = 'El correo no es válido.';
    if (password.length < MIN_PASSWORD) next.password = `Mínimo ${MIN_PASSWORD} caracteres.`;
    setFieldErrors(next);
    setError('');
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const result = await signUp(email, password, fullName);
    setLoading(false);
    if (result === 'CONFIRM_EMAIL') setPendingConfirmation(true);
    else if (result) setError(translateAuthError(result));
  };

  if (pendingConfirmation) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl }}>
          <BrandHeader />
          <Card style={{ gap: spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>📬</Text>
            <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}>
              Confirma tu correo
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center', lineHeight: 21 }}>
              Te hemos enviado un enlace a {email.trim()}. Ábrelo para activar la cuenta y luego inicia sesión.
            </Text>
          </Card>
          <Button title="Ir a iniciar sesión" onPress={() => router.replace('/(auth)/sign-in')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingVertical: spacing.lg }}>
            <BrandHeader subtitle="Tus entrenos, a salvo y en todos tus dispositivos" />
          </View>

          <Input
            label="Nombre"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (fieldErrors.fullName) setFieldErrors((f) => ({ ...f, fullName: undefined }));
            }}
            error={fieldErrors.fullName}
            autoComplete="name"
            textContentType="name"
            placeholder="Tu nombre"
          />
          <Input
            label="Correo"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            error={fieldErrors.email}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="tu@correo.com"
          />
          <View style={{ gap: spacing.xs }}>
            <PasswordInput
              label="Contraseña"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              error={fieldErrors.password}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
            {password.length > 0 && !fieldErrors.password ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        width: 22,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: strength.score >= i ? strength.color : colors.border,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ color: strength.color, fontSize: font.size.xs, flex: 1 }}>{strength.label}</Text>
              </View>
            ) : null}
          </View>

          {error ? <Text style={{ color: colors.danger, fontSize: font.size.sm }}>{error}</Text> : null}

          <Button title="Crear cuenta" loading={loading} onPress={() => void submit()} />

          <SocialAuthButtons onError={setError} />

          <View style={{ flex: 1 }} />
          <Button
            title="Ya tengo cuenta — iniciar sesión"
            variant="ghost"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
