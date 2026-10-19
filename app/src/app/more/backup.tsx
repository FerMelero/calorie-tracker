import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { buildBackup, importBackup } from '@/db/backup';
import { todayISO } from '@/db/user';
import { validateBackup } from '@/lib/validation';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ERRORS_SHOWN = 8;

export default function BackupScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    setMessage(null);
    setErrors([]);
    try {
      const backup = await buildBackup();
      const file = new File(Paths.cache, `calorie-tracker-${todayISO()}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(backup, null, 2));

      if (!(await Sharing.isAvailableAsync())) {
        setErrors(['Este dispositivo no permite compartir archivos.']);
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar copia de seguridad',
        UTI: 'public.json',
      });
      setMessage(
        `Copia creada: ${backup.entries.length} registros y ${backup.custom_foods.length} alimentos propios.`,
      );
    } catch (e) {
      setErrors([`No se pudo exportar: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setBusy(false);
    }
  }

  async function pickAndImport() {
    setBusy(true);
    setMessage(null);
    setErrors([]);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (asset.size !== undefined && asset.size > MAX_FILE_BYTES) {
        setErrors(['El archivo es demasiado grande (máximo 20 MB).']);
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(await new File(asset.uri).text());
      } catch {
        setErrors(['El archivo no es un JSON válido.']);
        return;
      }

      const result = validateBackup(parsed);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }

      const { data } = result;
      Alert.alert(
        'Importar copia de seguridad',
        `Se van a añadir hasta ${data.custom_foods.length} alimentos propios y ${data.entries.length} registros del diario ` +
          '(los que ya tengas no se duplican).' +
          (data.goals ? '\n\nTus objetivos actuales se reemplazarán por los del archivo.' : ''),
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            onPress: async () => {
              try {
                const s = await importBackup(data);
                setMessage(
                  `Importado: ${s.addedEntries} registros y ${s.addedFoods} alimentos nuevos` +
                    (s.skippedEntries + s.skippedFoods > 0
                      ? ` (${s.skippedEntries + s.skippedFoods} ya existían).`
                      : '.') +
                    (s.goalsReplaced ? ' Objetivos actualizados.' : ''),
                );
              } catch (e) {
                setErrors([`No se pudo importar: ${e instanceof Error ? e.message : String(e)}`]);
              }
            },
          },
        ],
      );
    } catch (e) {
      setErrors([`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <ThemedText type="smallBold">Exportar</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Guarda en un archivo tu diario, tus alimentos propios y tus objetivos. Es tu única copia de
            seguridad: la app no usa cuentas ni servidores.
          </ThemedText>
          <Button label="Exportar mis datos" onPress={exportData} disabled={busy} />
        </Card>

        <Card>
          <ThemedText type="smallBold">Importar</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Elige un archivo exportado por esta app. Antes de importar se comprueba que cumple el formato
            (valores por 100 g, kcal entre 0 y 900, macros que no sumen más de 100 g, fechas reales,
            franjas válidas…). Si algo no cumple, no se importa nada.
          </ThemedText>
          <Button label="Importar desde archivo" variant="outline" onPress={pickAndImport} disabled={busy} />
        </Card>

        {message ? (
          <ThemedText type="small" style={styles.success}>
            ✓ {message}
          </ThemedText>
        ) : null}

        {errors.length > 0 ? (
          <Card>
            <ThemedText type="smallBold" style={styles.error}>
              El archivo no es válido ({errors.length} {errors.length === 1 ? 'problema' : 'problemas'})
            </ThemedText>
            <View style={styles.errorList}>
              {errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary">
                  • {e}
                </ThemedText>
              ))}
              {errors.length > MAX_ERRORS_SHOWN ? (
                <ThemedText type="small" themeColor="textSecondary">
                  … y {errors.length - MAX_ERRORS_SHOWN} más.
                </ThemedText>
              ) : null}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  success: { color: Accent },
  error: { color: '#E5484D' },
  errorList: { gap: 4 },
});
