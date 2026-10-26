import { Alert } from 'react-native';

import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { openSuggestionMail, SUGGESTIONS_EMAIL } from '@/constants/contact';

type Props = {
  /** Código que no se ha encontrado; null = ventana cerrada */
  code: string | null;
  onCreate: () => void;
  onScanAgain: () => void;
  onClose: () => void;
};

/** Qué hacer cuando se escanea un producto que no está en la base de alimentos. */
export function BarcodeNotFoundModal({ code, onCreate, onScanAgain, onClose }: Props) {
  async function suggest() {
    const opened = await openSuggestionMail(
      'Sugerencia de alimento',
      `Código de barras: ${code}\nNombre del producto:\nMarca:\nSupermercado:\n\n` +
        'Si puedes, adjunta una foto de la tabla nutricional del envase.',
    );
    if (!opened) {
      Alert.alert('No se pudo abrir el correo', `Puedes escribirnos a ${SUGGESTIONS_EMAIL} indicando el código ${code}.`);
    }
  }

  return (
    <BottomSheetModal visible={code !== null} onClose={onClose}>
      <ThemedText type="subtitle">No lo encontramos</ThemedText>
      <ThemedText themeColor="textSecondary">
        El código {code} no está en nuestra base de alimentos. Puede que el producto no sea de España o que
        no tenga los datos nutricionales.
      </ThemedText>

      <Button label="Crear este alimento yo mismo" onPress={onCreate} />
      <Button label="Escanear otro" variant="outline" onPress={onScanAgain} />
      {SUGGESTIONS_EMAIL !== '' ? (
        <Button label="Sugerir que lo añadamos (correo)" variant="outline" onPress={suggest} />
      ) : __DEV__ ? (
        <ThemedText type="small" themeColor="textSecondary">
          (Solo desarrollo) El botón de sugerir por correo no sale porque SUGGESTIONS_EMAIL está vacío en
          src/constants/contact.ts.
        </ThemedText>
      ) : null}
      <Button label="Cerrar" variant="outline" onPress={onClose} />
    </BottomSheetModal>
  );
}
