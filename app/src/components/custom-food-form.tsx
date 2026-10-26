import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NumberField, TextField } from '@/components/form-controls';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getCustomFood, saveCustomFood } from '@/db/custom-foods';
import { parseNumber } from '@/lib/nutrition';
import { validateCustomFood } from '@/lib/validation';

const FIELD_NAMES: Record<string, string> = {
  name: 'Nombre', brand: 'Marca', barcode: 'Código de barras', kcal: 'Calorías', protein: 'Proteínas',
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

type Props = {
  /** Si se pasa, se edita ese alimento; si no, se crea uno nuevo */
  editingId?: number;
  /** Código de barras con el que empieza el formulario (por ejemplo, el que se acaba de escanear) */
  initialBarcode?: string;
  /** Se llama al guardar, con el id del alimento */
  onSaved: (id: number) => void;
};

/** Formulario para crear o editar un alimento propio (valores por 100 g). */
export function CustomFoodForm({ editingId, initialBarcode, onSaved }: Props) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode ?? '');
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
      setBarcode(f.barcode ?? '');
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
      barcode,
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
    const id = await saveCustomFood(result.data, editingId);
    onSaved(id);
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.group}>
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Granola casera" />
        <TextField label="Marca (opcional)" value={brand} onChangeText={setBrand} />
        <TextField
          label="Código de barras (opcional)"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="number-pad"
          placeholder="Para encontrarlo al escanearlo"
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
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  group: { gap: Spacing.two },
  title: { fontSize: 18, fontWeight: 700 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  errors: { gap: 4 },
  error: { color: '#E5484D' },
});
