import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Se llama una sola vez, con el número del código leído */
  onScanned: (code: string) => void;
};

/**
 * Cámara a pantalla completa que lee códigos de barras de productos (EAN y UPC).
 * Solo lee el número: no se guarda ninguna foto ni se envía nada.
 * El que lo usa debe darle una `key` nueva cada vez que lo abre, para que empiece de cero.
 */
export function BarcodeScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  // La cámara avisa muchas veces por segundo del mismo código: nos quedamos con el primero
  const handled = useRef(false);

  function handleScan(code: string) {
    if (handled.current) return;
    handled.current = true;
    onScanned(code);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      <View style={styles.root}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={(result) => handleScan(result.data)}
            />
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
              <View style={styles.topBar}>
                <Pressable onPress={onClose} hitSlop={12} style={styles.roundButton}>
                  <ThemedText style={styles.white}>✕</ThemedText>
                </Pressable>
                <Pressable onPress={() => setTorch((t) => !t)} hitSlop={12} style={styles.roundButton}>
                  <ThemedText style={styles.white}>{torch ? '🔦 Apagar' : '🔦 Luz'}</ThemedText>
                </Pressable>
              </View>
              <View style={styles.center} pointerEvents="none">
                <View style={styles.frame} />
              </View>
              <ThemedText style={[styles.white, styles.hint]}>Apunta al código de barras del producto</ThemedText>
            </SafeAreaView>
          </>
        ) : (
          <ThemedView style={styles.permission}>
            <SafeAreaView style={styles.permissionContent}>
              <ThemedText style={styles.emoji}>📷</ThemedText>
              <ThemedText type="subtitle" style={styles.center}>
                Permiso de cámara
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                La cámara solo se usa para leer el número del código de barras. No se guarda ninguna foto ni
                se envía nada.
              </ThemedText>
              {permission && !permission.canAskAgain ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                    Has bloqueado el permiso. Actívalo en los ajustes del móvil.
                  </ThemedText>
                  <Button label="Abrir ajustes" onPress={() => Linking.openSettings()} />
                </>
              ) : (
                <Button label="Permitir cámara" onPress={requestPermission} />
              )}
              <Button label="Volver" variant="outline" onPress={onClose} />
            </SafeAreaView>
          </ThemedView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.three },
  roundButton: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10 },
  white: { color: '#ffffff' },
  center: { alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  frame: { width: 290, height: 170, borderRadius: 20, borderWidth: 3, borderColor: '#ffffff' },
  hint: { textAlign: 'center', padding: Spacing.four, backgroundColor: 'rgba(0,0,0,0.45)' },
  permission: { flex: 1 },
  permissionContent: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  emoji: { fontSize: 56, lineHeight: 64, textAlign: 'center' },
  centerText: { textAlign: 'center' },
});
