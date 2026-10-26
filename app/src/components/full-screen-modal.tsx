import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Pantalla completa con título y botón "Cerrar", para formularios que se abren desde otra pantalla. */
export function FullScreenModal({ visible, title, onClose, children }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      <ThemedView style={styles.root}>
        <SafeAreaView style={styles.root}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="smallBold">Cerrar</ThemedText>
            </Pressable>
          </View>
          {children}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
