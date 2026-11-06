import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { shouldDismiss } from '@/lib/sheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const CLOSE_DURATION_MS = 180;

/**
 * Ventana que sube desde abajo, se aparta del teclado y se cierra arrastrando la barrita de arriba.
 *
 * Teclado: Android 15 o superior dibuja la app "de borde a borde" y ya no empuja el contenido hacia
 * arriba al abrir el teclado (Expo Go sí lo hace, por eso allí parecía funcionar). Por eso la
 * ventana se aparta ella sola con KeyboardAvoidingView. Los dos "translucent" hacen que la
 * ventana ocupe toda la pantalla y la posición del teclado cuadre con la de la ventana.
 *
 * Arrastre: se puede bajar la ventana con el dedo desde la barrita; si se suelta por debajo de la
 * distancia de cierre (o con un lanzamiento rápido) se cierra, y si no, vuelve a su sitio.
 */
export function BottomSheetModal({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [translateY] = useState(() => new Animated.Value(0));

  // El gesto se crea una sola vez; estas referencias le dan siempre los valores actuales
  const onCloseRef = useRef(onClose);
  const heightRef = useRef(height);
  useEffect(() => {
    onCloseRef.current = onClose;
    heightRef.current = height;
  });

  // Al abrirla de nuevo, vuelve a su sitio (el cierre por arrastre la dejó fuera de pantalla)
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  // Los manejadores del gesto leen onCloseRef y heightRef cuando se suelta el dedo, no al dibujar la
  // pantalla; el lint no puede saberlo. Se crea una sola vez para no perder el gesto si algo se redibuja.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const springBack = () =>
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)), // solo hacia abajo
      onPanResponderRelease: (_, g) => {
        if (shouldDismiss(g.dy, g.vy)) {
          Keyboard.dismiss();
          Animated.timing(translateY, {
            toValue: heightRef.current,
            duration: CLOSE_DURATION_MS,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) onCloseRef.current();
          });
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    });
  });

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
        <Animated.View style={[styles.animated, { transform: [{ translateY }] }]}>
          <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
            {/* Zona de arrastre: más grande que la barrita para que sea fácil de coger con el dedo */}
            <View
              {...pan.panHandlers}
              style={styles.handleZone}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Ventana. Arrastra hacia abajo para cerrar">
              <View style={styles.handle} />
            </View>
            {/* Si en una pantalla pequeña no cabe con el teclado, la ventana se puede desplazar */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              bounces={false}>
              {children}
            </ScrollView>
          </ThemedView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  animated: { flexShrink: 1 },
  sheet: {
    paddingHorizontal: Spacing.four,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexShrink: 1,
  },
  // Ocupa todo el ancho de la ventana (compensa el padding de los lados) y unos 40 puntos de alto
  handleZone: {
    marginHorizontal: -Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.5)',
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: Spacing.two },
});
