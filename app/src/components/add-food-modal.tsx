import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { addEntry, MEALS, type MealKey } from '@/db/user';
import type { Food } from '@/db/search';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  food: Food | null;
  onClose: () => void;
};

/** Ventana para elegir franja y cantidad antes de añadir un alimento al diario de hoy. */
export function AddFoodModal({ food, onClose }: Props) {
  const theme = useTheme();
  const [meal, setMeal] = useState<MealKey>('desayuno');
  const [gramsText, setGramsText] = useState('100');

  const grams = Number(gramsText.replace(',', '.'));
  const valid = Number.isFinite(grams) && grams > 0;

  async function add() {
    if (!food || !valid) return;
    await addEntry(food, meal, grams);
    onClose();
  }

  return (
    <Modal visible={food !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable>
          <ThemedView style={styles.sheet}>
            <ThemedText style={styles.foodName}>{food?.name}</ThemedText>
            {food?.brand ? (
              <ThemedText type="small" themeColor="textSecondary">
                {food.brand}
              </ThemedText>
            ) : null}

            <ThemedText type="smallBold">Franja</ThemedText>
            <View style={styles.chips}>
              {MEALS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMeal(m.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: meal === m.key ? Accent : theme.backgroundElement },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: meal === m.key ? '#ffffff' : theme.text }}>
                    {m.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="smallBold">Cantidad (gramos)</ThemedText>
            <TextInput
              value={gramsText}
              onChangeText={setGramsText}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <Pressable
              onPress={add}
              disabled={!valid}
              style={[styles.button, { backgroundColor: Accent, opacity: valid ? 1 : 0.4 }]}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Añadir</ThemedText>
            </Pressable>
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
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  foodName: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 99 },
  input: { borderRadius: 14, padding: Spacing.three, fontSize: 16 },
  button: { alignItems: 'center', padding: Spacing.three, borderRadius: 14, marginTop: Spacing.two },
});
