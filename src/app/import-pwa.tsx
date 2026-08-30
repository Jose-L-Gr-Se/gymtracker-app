import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, SectionTitle } from '@/components/ui';
import { totalImported, type PwaImportSummary } from '@/domain/importPwa';
import { useAppData } from '@/state/useAppData';
import { colors, font, radius, spacing } from '@/theme/tokens';

/**
 * Importa un backup exportado desde la PWA GymTracker (Ajustes → Exportar
 * datos → JSON) fusionándolo con los datos locales. Nunca sobrescribe un
 * cambio local más reciente: por cada colección, gana el `updatedAt` más
 * nuevo entre lo local y lo importado.
 */
export default function ImportFromPwa() {
  const importPwaBackup = useAppData((s) => s.importPwaBackup);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<PwaImportSummary | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    try {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      setText(content);
    } catch {
      Alert.alert('Error', 'No se pudo leer el archivo seleccionado.');
    }
  };

  const runImport = async () => {
    if (!text.trim()) {
      Alert.alert('Nada que importar', 'Pega el JSON del backup o selecciona un archivo.');
      return;
    }
    setBusy(true);
    try {
      const result = await importPwaBackup(text);
      setSummary(result);
      if (totalImported(result) === 0) {
        Alert.alert('Sin novedades', 'El backup no aportaba datos nuevos: todo lo que trae ya estaba igual o más reciente en este dispositivo.');
      }
    } catch (e) {
      Alert.alert('No se pudo importar', e instanceof Error ? e.message : 'Error desconocido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Importar desde la PWA' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <SectionTitle
          title="Trae tu historial de la PWA"
          subtitle="En la app web: Ajustes → Copia de seguridad → Exportar datos (JSON)"
        />

        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}>
            Nunca se pierde nada: si un dato ya existe aquí y es igual o más reciente, se conserva el de este
            dispositivo. Solo se añaden ejercicios, rutinas, sesiones, peso corporal y medidas que sean nuevos o
            más recientes que lo que ya tienes.
          </Text>
        </Card>

        <Button title="Elegir archivo .json" variant="secondary" onPress={() => void pickFile()} />

        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>…o pega el contenido aquí</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={8}
            placeholder='{"app":"GymTracker","data":{...}}'
            placeholderTextColor={colors.textDim}
            style={{
              minHeight: 160,
              textAlignVertical: 'top',
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderLight,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.text,
              fontSize: font.size.xs,
              fontFamily: 'monospace',
            }}
          />
        </View>

        <Button title="Importar" loading={busy} disabled={!text.trim()} onPress={() => void runImport()} />

        {summary && (
          <Card style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold }}>
              Importación completada
            </Text>
            <SummaryRow label="Ejercicios" counts={summary.exercises} />
            <SummaryRow label="Rutinas" counts={summary.routines} />
            <SummaryRow label="Sesiones" counts={summary.sessions} />
            <SummaryRow label="Peso corporal" counts={summary.bodyWeight} />
            <SummaryRow label="Medidas" counts={summary.measurements} />
            <Button title="Listo" small onPress={() => router.back()} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, counts }: { label: string; counts: { added: number; updated: number; skipped: number } }) {
  if (counts.added + counts.updated + counts.skipped === 0) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: font.size.sm }}>
        {counts.added > 0 ? <Text style={{ color: colors.success }}>+{counts.added} nuevos </Text> : null}
        {counts.updated > 0 ? <Text style={{ color: colors.warning }}>{counts.updated} actualizados </Text> : null}
        {counts.skipped > 0 ? <Text style={{ color: colors.textDim }}>{counts.skipped} ya al día</Text> : null}
      </Text>
    </View>
  );
}
