import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

/** Espacio que se deja entre el campo y el teclado */
const MARGIN = 24;

const EnsureVisibleContext = createContext<() => void>(() => {});

/** Los campos de texto llaman a esto en onFocus para asegurarse de que no los tapa el teclado. */
export function useEnsureVisible() {
  return useContext(EnsureVisibleContext);
}

/**
 * ScrollView que desplaza el contenido para que el campo que estás escribiendo quede por encima
 * del teclado. Android 15 o superior ya no lo hace solo (en Expo Go sí, en la APK no), así que se
 * calcula a mano: se mide dónde está el campo y dónde empieza el teclado.
 */
export function KeyboardAwareScrollView({ children, onScroll, ...rest }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const ensureVisible = useCallback(() => {
    // Pequeña espera: el teclado y el espacio extra tardan un instante en aparecer
    setTimeout(() => {
      const top = keyboardTop.current;
      const input = TextInput.State.currentlyFocusedInput();
      if (top === null || !input) return;
      input.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height + MARGIN - top;
        if (overlap > 0) ref.current?.scrollTo({ y: offsetY.current + overlap, animated: true });
      });
    }, 120);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      ensureVisible();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll],
  );

  const context = useMemo(() => ensureVisible, [ensureVisible]);

  return (
    <EnsureVisibleContext.Provider value={context}>
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        {...rest}>
        {children}
        {/* Espacio al final para poder subir los últimos campos por encima del teclado */}
        <View style={{ height: keyboardHeight }} />
      </ScrollView>
    </EnsureVisibleContext.Provider>
  );
}
