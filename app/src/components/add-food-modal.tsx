import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { Button } from '@/components/button';
import { NumberField, Stepper, TextField } from '@/components/form-controls';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import type { Food } from '@/db/search';
import { removeUserServing, resolveServing, setUserServing, type Serving } from '@/db/servings';
import { addEntry, MEALS, type MealKey } from '@/db/user';
import { useTheme } from '@/hooks/use-theme';
import { parseNumber } from '@/lib/nutrition';
import {
  countFromGrams,
  DEFAULT_SERVING_LABEL,
  describeCount,
  formatNumber,
  gramsFromCount,
  MAX_LABEL_LENGTH,
  stepCount,
} from '@/lib/serving';
import { LIMITS } from '@/lib/validation';

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

/**
 * Ventana para elegir franja y cantidad antes de añadir un alimento al diario.
 * Si el alimento tiene una ración (la define el usuario o la trae foods.db donde tiene sentido), se
 * puede elegir cuántas raciones se toman y la app calcula los gramos. Si no, solo gramos.
 */
export function AddFoodModal({ food, defaultMeal, defaultGrams, date, onClose }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [meal, setMeal] = useState<MealKey>(defaultMeal ?? 'desayuno');
  // Si el alimento trae ración, abre con una ración; si no, con la cantidad dada o 100 g
  const [gramsText, setGramsText] = useState(String(defaultGrams ?? food?.serving_g ?? 100));
  // Cuando el usuario toca la cantidad, ya no se le cambia sola al encontrar la ración
  const touched = useRef(false);

  const [serving, setServing] = useState<Serving | null>(
    food?.serving_g ? { grams: food.serving_g, label: null, origin: 'db' } : null,
  );
  const [editing, setEditing] = useState(false);
  const [editGrams, setEditGrams] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // La ración del usuario (o la de foods.db para lo que viene de Recientes y Favoritos) se busca al abrir
  useEffect(() => {
    if (!food) return;
    let cancelled = false;
    resolveServing(db, food).then((found) => {
      if (cancelled) return;
      setServing(found);
      if (found && !touched.current && defaultGrams === undefined) setGramsText(String(found.grams));
    });
    return () => {
      cancelled = true;
    };
  }, [db, food, defaultGrams]);

  const grams = Number(gramsText.replace(',', '.'));
  const valid = Number.isFinite(grams) && grams > 0;

  function changeGrams(text: string) {
    touched.current = true;
    setGramsText(text);
  }

  function step(direction: 1 | -1) {
    if (!serving) return;
    const current = valid ? countFromGrams(grams, serving.grams) : 1;
    changeGrams(String(gramsFromCount(stepCount(current, direction), serving.grams)));
  }

  function openEditor() {
    setEditGrams(serving ? String(serving.grams) : '');
    setEditLabel(serving?.origin === 'user' ? (serving.label ?? '') : '');
    setEditError(null);
    setEditing(true);
  }

  async function saveServing() {
    if (!food) return;
    const value = parseNumber(editGrams);
    if (value === null || value < 0.1 || value > LIMITS.GRAMS_MAX) {
      setEditError(`Escribe los gramos de una ración (entre 0,1 y ${LIMITS.GRAMS_MAX}).`);
      return;
    }
    const label = editLabel.trim() || null;
    await setUserServing(food, value, label);
    setServing({ grams: value, label, origin: 'user' });
    if (!touched.current) setGramsText(String(value));
    setEditing(false);
  }

  async function removeServing() {
    if (!food) return;
    await removeUserServing(food);
    // Si foods.db trae una ración del fabricante, vuelve a esa; si no, desaparece el selector
    setServing(await resolveServing(db, food));
    setEditing(false);
  }

  async function add() {
    if (!food || !valid) return;
    await addEntry(food, meal, grams, date);
    onClose();
  }

  const word = serving?.label?.trim() || DEFAULT_SERVING_LABEL;

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
          <ThemedText style={styles.previewKcal}>{Math.round((food.kcal * grams) / 100)} kcal</ThemedText>
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
            style={[styles.chip, { backgroundColor: meal === m.key ? Accent : theme.backgroundElement }]}>
            <ThemedText type="small" style={{ color: meal === m.key ? '#ffffff' : theme.text }}>
              {m.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {editing ? (
        <View style={[styles.editor, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Tu ración de este alimento</ThemedText>
          <NumberField label="Gramos de una ración" value={editGrams} onChangeText={setEditGrams} unit="g" />
          <TextField
            label="¿Cómo la llamas? (opcional)"
            value={editLabel}
            onChangeText={(t) => setEditLabel(t.slice(0, MAX_LABEL_LENGTH))}
            placeholder="ración, bolsita, loncha, unidad…"
          />
          {editError ? (
            <ThemedText type="small" style={styles.error}>
              {editError}
            </ThemedText>
          ) : null}
          <Button label="Guardar ración" onPress={saveServing} />
          {serving?.origin === 'user' ? (
            <Button label="Quitar mi ración" variant="outline" onPress={removeServing} />
          ) : null}
          <Button label="Cancelar" variant="outline" onPress={() => setEditing(false)} />
        </View>
      ) : (
        <>
          {serving ? (
            <Stepper
              label="Raciones"
              hint={`1 ${word} = ${formatNumber(serving.grams, 1)} g${serving.origin === 'db' ? ' · indicada por el fabricante' : ''}`}
              valueText={valid ? describeCount(countFromGrams(grams, serving.grams), serving.label) : '—'}
              onMinus={() => step(-1)}
              onPlus={() => step(1)}
            />
          ) : null}
          <Pressable onPress={openEditor} hitSlop={8}>
            <ThemedText type="small" style={{ color: Accent }}>
              {serving ? 'Cambiar mi ración' : 'Definir mi ración (opcional)'}
            </ThemedText>
          </Pressable>
        </>
      )}

      <ThemedText type="smallBold">Cantidad (gramos)</ThemedText>
      <TextInput
        value={gramsText}
        onChangeText={changeGrams}
        keyboardType="decimal-pad"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      <View style={styles.buttonRow}>
        <Button label="Añadir a mi día" onPress={add} disabled={!valid || editing} />
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  foodName: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  preview: { borderRadius: 14, padding: Spacing.three, gap: Spacing.one, marginVertical: Spacing.one },
  previewKcal: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  editor: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  error: { color: '#E5484D' },
  buttonRow: { marginTop: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 99 },
  input: { borderRadius: 14, padding: Spacing.three, fontSize: 16 },
});
