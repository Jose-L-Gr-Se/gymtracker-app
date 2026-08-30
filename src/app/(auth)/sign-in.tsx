import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input, PasswordInput } from '@/components/ui';
import { BrandHeader } from '@/features/auth/BrandMark';
import { translateAuthError } from '@/features/auth/errors';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

export default function SignIn() {
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof fieldErrors = {};
    if (!email.trim()) next.email = 'Introduce tu correo.';
    if (!password) next.password = 'Introduce tu contraseña.';
    setFieldErrors(next);
    setError('');
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result) setError(translateAuthError(result));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingVertical: spacing.xl }}>
            <BrandHeader subtitle="Bienvenido de nuevo" />
          </View>

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
            returnKeyType="next"
          />
          <PasswordInput
            label="Contraseña"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            error={fieldErrors.password}
            autoComplete="current-password"
            textContentType="password"
            placeholder="Tu contraseña"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />

          {error ? <Text style={{ color: colors.danger, fontSize: font.size.sm }}>{error}</Text> : null}

          <Button title="Iniciar sesión" loading={loading} onPress={() => void submit()} />
          <Button title="He olvidado mi contraseña" variant="ghost" onPress={() => router.push('/(auth)/forgot')} />

          <SocialAuthButtons onError={setError} />

          <View style={{ flex: 1 }} />
          <Button title="No tengo cuenta — crear una" variant="ghost" onPress={() => router.replace('/(auth)/sign-up')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
