import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NumberField, TextField } from '@/components/form-controls';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getCustomFood, saveCustomFood } from '@/db/custom-foods';
import { getUserServing, removeUserServing, setUserServing } from '@/db/servings';
import { MAX_LABEL_LENGTH } from '@/lib/serving';
import { parseNumber } from '@/lib/nutrition';
import { LIMITS, validateCustomFood } from '@/lib/validation';

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
  const [serving, setServing] = useState('');
  const [servingLabel, setServingLabel] = useState('');
  // Nombre y marca con los que se guardó la ración, por si se cambian al editar
  const [saved, setSaved] = useState<{ name: string; brand: string | null } | null>(null);
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
      setSaved({ name: f.name, brand: f.brand });
      getUserServing({ source: 'custom', name: f.name, brand: f.brand }).then((sv) => {
        if (!sv) return;
        setServing(String(sv.grams));
        setServingLabel(sv.label ?? '');
      });
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
    // La ración (opcional) se valida aparte: tiene sus propios límites
    const servingGrams = optionalNumber(serving);
    if (servingGrams !== null && !(servingGrams >= 0.1 && servingGrams <= LIMITS.GRAMS_MAX)) {
      setErrors([`Ración: tiene que estar entre 0,1 y ${LIMITS.GRAMS_MAX} g`]);
      return;
    }

    const id = await saveCustomFood(result.data, editingId);
    const identity = { source: 'custom' as const, name: result.data.name, brand: result.data.brand };
    // Si se ha cambiado el nombre o la marca, la ración antigua ya no corresponde
    if (saved && (saved.name !== identity.name || saved.brand !== identity.brand)) {
      await removeUserServing({ source: 'custom', ...saved });
    }
    if (servingGrams === null) await removeUserServing(identity);
    else await setUserServing(identity, servingGrams, servingLabel.trim() || null);
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
        <ThemedText style={styles.title}>Ración (opcional)</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Cuánto pesa una ración, por ejemplo 125 si tu bolsita son 125 g. Al añadir el alimento podrás elegir
          cuántas raciones tomas y la app calcula los gramos. Si no tiene sentido, déjalo vacío.
        </ThemedText>
        <View style={styles.fields}>
          <NumberField label="Una ración" value={serving} onChangeText={setServing} unit="g" />
        </View>
        <TextField
          label="¿Cómo la llamas? (opcional)"
          value={servingLabel}
          onChangeText={(t) => setServingLabel(t.slice(0, MAX_LABEL_LENGTH))}
          placeholder="ración, bolsita, loncha, unidad…"
        />
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
