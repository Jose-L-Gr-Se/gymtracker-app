import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

export default function SignIn() {
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Introduce tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signIn(email, password);
    setLoading(false);
    if (result) setError(result);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}>
          <View style={{ gap: spacing.xs, marginTop: spacing.xl }}>
            <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy }}>
              Bienvenido de nuevo
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>
              Inicia sesión para sincronizar tus entrenos.
            </Text>
          </View>

          <Input
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="tu@correo.com"
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
            onSubmitEditing={() => void submit()}
          />
          {error ? <Text style={{ color: colors.danger, fontSize: font.size.sm }}>{error}</Text> : null}

          <Button title="Iniciar sesión" loading={loading} onPress={() => void submit()} />
          <Button title="He olvidado mi contraseña" variant="ghost" onPress={() => router.push('/(auth)/forgot')} />
          <Button title="No tengo cuenta — crear una" variant="ghost" onPress={() => router.replace('/(auth)/sign-up')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
