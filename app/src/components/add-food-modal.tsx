import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { Button } from '@/components/button';
import { Chips } from '@/components/form-controls';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { getCustomServing } from '@/db/custom-foods';
import { addEntry, MEALS, type MealKey } from '@/db/user';
import type { Food } from '@/db/search';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  food: Food | null;
  /** Franja preseleccionada (si se viene desde el botón + de una franja) */
  defaultMeal?: MealKey;
  /** Cantidad con la que abre (por ejemplo, la última que usaste con este alimento) */
  defaultGrams?: number;
  /** Día al que se añade (YYYY-MM-DD); por defecto, hoy */
  date?: string;
  onClose: () => void;
};

const SERVING_OPTIONS = [
  { key: 'half', label: '½ ración', times: 0.5 },
  { key: 'one', label: '1 ración', times: 1 },
  { key: 'two', label: '2 raciones', times: 2 },
] as const;

/** Ventana para elegir franja y cantidad antes de añadir un alimento al diario de hoy. */
export function AddFoodModal({ food, defaultMeal, defaultGrams, date, onClose }: Props) {
  const theme = useTheme();
  const [meal, setMeal] = useState<MealKey>(defaultMeal ?? 'desayuno');
  // Si el alimento trae ración, abre con una ración; si no, con la cantidad dada o 100 g
  const [gramsText, setGramsText] = useState(String(defaultGrams ?? food?.serving_g ?? 100));
  // Los alimentos que vienen de Recientes o Favoritos guardan una copia sin ración: se mira la actual
  const [lookedUpServing, setLookedUpServing] = useState<number | null>(null);
  useEffect(() => {
    if (!food || food.serving_g) return;
    let cancelled = false;
    getCustomServing(food).then((g) => {
      if (!cancelled) setLookedUpServing(g);
    });
    return () => {
      cancelled = true;
    };
  }, [food]);
  const serving = food?.serving_g ?? lookedUpServing;

  const grams = Number(gramsText.replace(',', '.'));
  const valid = Number.isFinite(grams) && grams > 0;

  async function add() {
    if (!food || !valid) return;
    await addEntry(food, meal, grams, date);
    onClose();
  }

  return (
    <BottomSheetModal visible={food !== null} onClose={onClose}>
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

        {serving ? (
          <>
            <ThemedText type="smallBold">Raciones (1 ración = {serving} g)</ThemedText>
            <Chips
              options={SERVING_OPTIONS.map((o) => ({
                key: o.key,
                label: o.label,
                description: `${Math.round(o.times * serving * 10) / 10} g`,
              }))}
              value={SERVING_OPTIONS.find((o) => Math.abs(o.times * serving - grams) < 0.05)?.key ?? null}
              onChange={(key) => {
                const option = SERVING_OPTIONS.find((o) => o.key === key);
                if (option) setGramsText(String(Math.round(option.times * serving * 10) / 10));
              }}
            />
          </>
        ) : null}

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
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  foodName: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  preview: { borderRadius: 14, padding: Spacing.three, gap: Spacing.one, marginVertical: Spacing.one },
  previewKcal: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  buttonRow: { marginTop: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 99 },
  input: { borderRadius: 14, padding: Spacing.three, fontSize: 16 },
});
