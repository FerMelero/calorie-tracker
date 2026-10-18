import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { addEntry, MEALS, type MealKey } from '@/db/user';
import type { Food } from '@/db/search';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  food: Food | null;
  /** Franja preseleccionada (si se viene desde el botón + de una franja) */
  defaultMeal?: MealKey;
  onClose: () => void;
};

/** Ventana para elegir franja y cantidad antes de añadir un alimento al diario de hoy. */
export function AddFoodModal({ food, defaultMeal, onClose }: Props) {
  const theme = useTheme();
  const [meal, setMeal] = useState<MealKey>(defaultMeal ?? 'desayuno');
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
            <View style={styles.handle} />
            <ThemedText style={styles.foodName}>{food?.name}</ThemedText>
            {food?.brand ? (
              <ThemedText type="small" themeColor="textSecondary">
                {food.brand}
              </ThemedText>
            ) : null}

            {food && valid ? (
              <View style={[styles.preview, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.previewKcal}>
                  {Math.round((food.kcal * grams) / 100)} kcal
                </ThemedText>
                <MacroPills
                  protein={Math.round(((food.protein * grams) / 100) * 10) / 10}
                  carbs={Math.round(((food.carbs * grams) / 100) * 10) / 10}
                  fat={Math.round(((food.fat * grams) / 100) * 10) / 10}
                />
              </View>
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

            <View style={styles.buttonRow}>
              <Button label="Añadir a mi día" onPress={add} disabled={!valid} />
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
  foodName: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  preview: { borderRadius: 14, padding: Spacing.three, gap: Spacing.one, marginVertical: Spacing.one },
  previewKcal: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.5)', marginBottom: Spacing.one },
  buttonRow: { marginTop: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 99 },
  input: { borderRadius: 14, padding: Spacing.three, fontSize: 16 },
});
