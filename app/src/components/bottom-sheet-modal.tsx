import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Ventana que sube desde abajo y se aparta del teclado.
 *
 * Android 15 o superior dibuja la app "de borde a borde" y ya no empuja el contenido hacia
 * arriba al abrir el teclado (Expo Go sí lo hace, por eso allí parecía funcionar). Por eso la
 * ventana se aparta ella sola con KeyboardAvoidingView. Los dos "translucent" hacen que la
 * ventana ocupe toda la pantalla y la posición del teclado cuadre con la de la ventana.
 */
export function BottomSheetModal({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          <View style={styles.handle} />
          {/* Si en una pantalla pequeña no cabe con el teclado, la ventana se puede desplazar */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            bounces={false}>
            {children}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.5)',
    marginBottom: Spacing.two,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: Spacing.two },
});
