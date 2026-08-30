import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/state/useAuth';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  const userId = useAuth((s) => s.userId);
  if (userId) return <Redirect href="/(tabs)" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
