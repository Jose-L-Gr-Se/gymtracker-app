import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/state/useAuth';
import { colors, font, spacing } from '@/theme/tokens';

export default function SignUp() {
  const signUp = useAuth((s) => s.signUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setInfo('');
    if (!fullName.trim()) return setError('Dinos tu nombre.');
    if (!email.trim().includes('@')) return setError('Correo no válido.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setLoading(true);
    const result = await signUp(email, password, fullName);
    setLoading(false);
    if (result === 'CONFIRM_EMAIL') {
      setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
    } else if (result) {
      setError(result);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }}>
          <View style={{ gap: spacing.xs, marginTop: spacing.xl }}>
            <Text style={{ color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy }}>
              Crea tu cuenta
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>
              Tus entrenos, sincronizados y a salvo en todos tus dispositivos.
            </Text>
          </View>

          <Input label="Nombre" value={fullName} onChangeText={setFullName} placeholder="Tu nombre" />
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
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
          <Input
            label="Repite la contraseña"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
            onSubmitEditing={() => void submit()}
          />
          {error ? <Text style={{ color: colors.danger, fontSize: font.size.sm }}>{error}</Text> : null}
          {info ? <Text style={{ color: colors.success, fontSize: font.size.sm }}>{info}</Text> : null}

          <Button title="Crear cuenta" loading={loading} onPress={() => void submit()} />
          <Button title="Ya tengo cuenta — iniciar sesión" variant="ghost" onPress={() => router.replace('/(auth)/sign-in')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
