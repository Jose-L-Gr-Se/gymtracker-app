import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppData } from '@/state/useAppData';
import { useAuth } from '@/state/useAuth';
import { useWorkout } from '@/state/useWorkout';
import { colors } from '@/theme/tokens';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const ready = useAuth((s) => s.ready);
  const userId = useAuth((s) => s.userId);
  const isGuest = useAuth((s) => s.isGuest);
  const bootstrap = useAuth((s) => s.bootstrap);
  const hydrate = useAppData((s) => s.hydrate);
  const resetData = useAppData((s) => s.reset);
  const restoreDraft = useWorkout((s) => s.restoreDraft);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Al cambiar el usuario activo, cargar su dataset y restaurar borrador de entreno
  useEffect(() => {
    if (!ready) return;
    if (userId) {
      void hydrate(userId, isGuest).then(() => restoreDraft(userId));
    } else {
      resetData();
    }
  }, [ready, userId, isGuest, hydrate, resetData, restoreDraft]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="workout" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="routine/[id]" options={{ title: 'Rutina' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: 'Progresión' }} />
          <Stack.Screen name="exercises" options={{ title: 'Biblioteca de ejercicios' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
