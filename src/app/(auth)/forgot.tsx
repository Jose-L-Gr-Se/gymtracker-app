import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

export default function ForgotPassword() {
  const resetPassword = useAuth((s) => s.resetPassword);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim().includes('@')) return setError('Correo no válido.');
    setLoading(true);
    setError('');
    const result = await resetPassword(email);
    setLoading(false);
    if (result) setError(result);
    else setSent(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}>
        <View style={{ gap: spacing.xs, marginTop: spacing.xl }}>
          <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy }}>
            Recuperar contraseña
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>
            Te enviaremos un enlace para restablecerla.
          </Text>
        </View>

        {sent ? (
          <>
            <Text style={{ color: colors.success, fontSize: font.size.md }}>
              Enviado. Revisa tu bandeja de entrada (y el spam).
            </Text>
            <Button title="Volver" variant="secondary" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <Input
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tu@correo.com"
              onSubmitEditing={() => void submit()}
            />
            {error ? <Text style={{ color: colors.danger, fontSize: font.size.sm }}>{error}</Text> : null}
            <Button title="Enviar enlace" loading={loading} onPress={() => void submit()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
