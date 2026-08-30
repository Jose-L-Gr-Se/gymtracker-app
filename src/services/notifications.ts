import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificación local de fin de descanso. Solo suena si el descanso termina
 * con la app en segundo plano; en primer plano la barra de descanso ya avisa.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  await Notifications.setNotificationChannelAsync('rest-timer', {
    name: 'Fin de descanso',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

export async function scheduleRestEndNotification(seconds: number, exerciseName: string): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted || seconds <= 0) return null;
    await ensureChannel();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Descanso terminado!',
        body: `Siguiente serie de ${exerciseName}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, seconds),
        channelId: Platform.OS === 'android' ? 'rest-timer' : undefined,
      },
    });
  } catch (e) {
    console.warn('[notifications] no se pudo programar', e);
    return null;
  }
}

export async function cancelNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ya disparada o cancelada
  }
}
