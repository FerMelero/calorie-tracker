import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chips } from '@/components/form-controls';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MEALS, updateEntry, type Entry, type MealKey } from '@/db/user';
import { useTheme } from '@/hooks/use-theme';
import { parseNumber } from '@/lib/nutrition';
import { LIMITS } from '@/lib/validation';

type Props = {
  entry: Entry | null;
  onClose: () => void;
  /** Se llama tras guardar, para que la pantalla recargue el día */
  onSaved: () => void;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Ventana para cambiar los gramos o la franja de una comida ya registrada. */
export function EditEntryModal({ entry, onClose, onSaved }: Props) {
  const theme = useTheme();
  const [meal, setMeal] = useState<MealKey>(entry?.meal ?? 'desayuno');
  const [gramsText, setGramsText] = useState(entry ? String(entry.grams) : '');

  const grams = parseNumber(gramsText);
  const valid = grams !== null && grams >= 0.1 && grams <= LIMITS.GRAMS_MAX;

  async function save() {
    if (!entry || !valid) return;
    await updateEntry(entry.id, meal, grams);
    onSaved();
    onClose();
  }

  const factor = entry && valid ? grams / entry.grams : null;

  return (
    <Modal visible={entry !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable>
          <ThemedView style={styles.sheet}>
            <View style={styles.handle} />
            <ThemedText style={styles.name}>{entry?.food_name}</ThemedText>
            {entry?.food_brand ? (
              <ThemedText type="small" themeColor="textSecondary">
                {entry.food_brand}
              </ThemedText>
            ) : null}

            {entry && factor !== null ? (
              <View style={[styles.preview, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.previewKcal}>{Math.round(entry.kcal * factor)} kcal</ThemedText>
                <MacroPills
                  protein={round1(entry.protein * factor)}
                  carbs={round1(entry.carbs * factor)}
                  fat={round1(entry.fat * factor)}
                />
              </View>
            ) : null}

            <ThemedText type="smallBold">Franja</ThemedText>
            <Chips
              options={MEALS.map((m) => ({ key: m.key, label: m.label }))}
              value={meal}
              onChange={setMeal}
            />

            <ThemedText type="smallBold">Cantidad (gramos)</ThemedText>
            <TextInput
              value={gramsText}
              onChangeText={setGramsText}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <View style={styles.buttonRow}>
              <Button label="Guardar cambios" onPress={save} disabled={!valid} />
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    padding: Spacing.four,
    gap: Spacing.two,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.5)',
    marginBottom: Spacing.one,
  },
  name: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  preview: { borderRadius: 14, padding: Spacing.three, gap: Spacing.one, marginVertical: Spacing.one },
  previewKcal: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  input: { borderRadius: 14, padding: Spacing.three, fontSize: 16 },
  buttonRow: { marginTop: Spacing.two },
});
