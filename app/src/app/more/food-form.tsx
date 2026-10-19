import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { NumberField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCustomFood, saveCustomFood } from '@/db/custom-foods';
import { useTheme } from '@/hooks/use-theme';
import { parseNumber } from '@/lib/nutrition';
import { validateCustomFood } from '@/lib/validation';

const FIELD_NAMES: Record<string, string> = {
  name: 'Nombre', brand: 'Marca', kcal: 'Calorías', protein: 'Proteínas',
  carbs: 'Carbohidratos', fat: 'Grasas', sugars: 'Azúcares', fiber: 'Fibra', salt: 'Sal',
};

/** "alimento.kcal: tiene que..." -> "Calorías: tiene que..." */
function friendlyError(error: string): string {
  return error.replace(/^alimento\.(\w+)/, (_, field: string) => FIELD_NAMES[field] ?? field);
}

/** Texto vacío -> null (campo opcional sin rellenar). Texto no numérico -> NaN, que la validación rechaza. */
function optionalNumber(text: string): number | null {
  if (text.trim() === '') return null;
  return parseNumber(text) ?? NaN;
}

export default function FoodFormScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : undefined;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sugars, setSugars] = useState('');
  const [fiber, setFiber] = useState('');
  const [salt, setSalt] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingId === undefined) return;
    getCustomFood(editingId).then((f) => {
      if (!f) return;
      setName(f.name);
      setBrand(f.brand ?? '');
      setKcal(String(f.kcal));
      setProtein(String(f.protein));
      setCarbs(String(f.carbs));
      setFat(String(f.fat));
      setSugars(f.sugars === null ? '' : String(f.sugars));
      setFiber(f.fiber === null ? '' : String(f.fiber));
      setSalt(f.salt === null ? '' : String(f.salt));
    });
  }, [editingId]);

  async function save() {
    const result = validateCustomFood({
      name,
      brand,
      kcal: parseNumber(kcal) ?? NaN,
      protein: parseNumber(protein) ?? NaN,
      carbs: parseNumber(carbs) ?? NaN,
      fat: parseNumber(fat) ?? NaN,
      sugars: optionalNumber(sugars),
      fiber: optionalNumber(fiber),
      salt: optionalNumber(salt),
    });
    if (!result.ok) {
      setErrors(result.errors.map(friendlyError));
      return;
    }
    await saveCustomFood(result.data, editingId);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: editingId === undefined ? 'Nuevo alimento' : 'Editar alimento' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            Nombre
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Granola casera"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Marca (opcional)
          </ThemedText>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </View>

        <View style={styles.group}>
          <ThemedText style={styles.title}>Valores por cada 100 g</ThemedText>
          <View style={styles.fields}>
            <NumberField label="Calorías" value={kcal} onChangeText={setKcal} unit="kcal" />
            <NumberField label="Proteínas" value={protein} onChangeText={setProtein} unit="g" />
          </View>
          <View style={styles.fields}>
            <NumberField label="Carbohidratos" value={carbs} onChangeText={setCarbs} unit="g" />
            <NumberField label="Grasas" value={fat} onChangeText={setFat} unit="g" />
          </View>
        </View>

        <View style={styles.group}>
          <ThemedText style={styles.title}>Opcional</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Si no lo sabes, déjalo vacío: no se contará como 0.
          </ThemedText>
          <View style={styles.fields}>
            <NumberField label="Azúcares" value={sugars} onChangeText={setSugars} unit="g" />
            <NumberField label="Fibra" value={fiber} onChangeText={setFiber} unit="g" />
            <NumberField label="Sal" value={salt} onChangeText={setSalt} unit="g" />
          </View>
        </View>

        {errors.length > 0 ? (
          <View style={styles.errors}>
            {errors.map((e) => (
              <ThemedText key={e} type="small" style={styles.error}>
                • {e}
              </ThemedText>
            ))}
          </View>
        ) : null}

        <Button label="Guardar alimento" onPress={save} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  group: { gap: Spacing.two },
  title: { fontSize: 18, fontWeight: 700 },
  input: { borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: 12, fontSize: 16 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  errors: { gap: 4 },
  error: { color: '#E5484D' },
});
