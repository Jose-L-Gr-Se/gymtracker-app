import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import type { Exercise } from '@/domain/types';
import { colors, font, radius, spacing, TAP } from '@/theme/tokens';

/**
 * Ficha de técnica de un ejercicio: vídeo guardado (si lo hay), instrucciones
 * y, en su defecto, una búsqueda directa en YouTube por el nombre del
 * ejercicio. Así los 60+ ejercicios de la biblioteca tienen referencia visual
 * desde el primer día sin depender de que alguien haya pegado una URL.
 *
 * El vídeo se abre en el navegador in-app (expo-web-browser) para no expulsar
 * al usuario de la app en mitad de un entreno.
 */

export const exerciseHasVideo = (ex: Exercise): boolean => ex.videoUrl.trim().length > 0;
export const exerciseHasInstructions = (ex: Exercise): boolean => ex.instructions.trim().length > 0;
export const exerciseHasTechnique = (ex: Exercise): boolean => exerciseHasVideo(ex) || exerciseHasInstructions(ex);

const youtubeSearchUrl = (exerciseName: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} técnica ejecución`)}`;

const openUrl = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
    });
  } catch {
    // navegador no disponible: no rompemos el entreno por esto
  }
};

export function TechniqueSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  if (!exercise) return null;
  const hasVideo = exerciseHasVideo(exercise);
  const hasInstructions = exerciseHasInstructions(exercise);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.xl,
            maxHeight: '85%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy }}>
                {exercise.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                {exercise.muscleGroup}
                {exercise.defaultRest > 0 ? ` · descanso ${exercise.defaultRest}s` : ''}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={{ width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
            {hasInstructions ? (
              <Card style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
                  INSTRUCCIONES
                </Text>
                <Text style={{ color: colors.text, fontSize: font.size.sm, lineHeight: 21 }}>
                  {exercise.instructions}
                </Text>
              </Card>
            ) : null}

            {hasVideo ? (
              <Button title="▶  Ver vídeo de técnica" onPress={() => void openUrl(exercise.videoUrl)} />
            ) : null}

            <Button
              title={hasVideo ? 'Buscar más vídeos en YouTube' : '▶  Buscar técnica en YouTube'}
              variant={hasVideo ? 'secondary' : 'primary'}
              onPress={() => void openUrl(youtubeSearchUrl(exercise.name))}
            />

            {!hasInstructions && !hasVideo ? (
              <Text style={{ color: colors.textDim, fontSize: font.size.xs, textAlign: 'center', lineHeight: 17 }}>
                Este ejercicio aún no tiene vídeo ni instrucciones guardadas.{'\n'}
                Puedes añadirlos desde Rutinas → Biblioteca de ejercicios.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Indicador compacto de que un ejercicio tiene técnica guardada. */
export function TechniqueBadge({ exercise }: { exercise: Exercise }) {
  if (!exerciseHasTechnique(exercise)) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {exerciseHasVideo(exercise) ? <Ionicons name="videocam" size={12} color={colors.accent} /> : null}
      {exerciseHasInstructions(exercise) ? <Ionicons name="document-text" size={12} color={colors.accent} /> : null}
    </View>
  );
}
