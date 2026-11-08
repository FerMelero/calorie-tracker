import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { Button } from '@/components/button';
import { Chips, NumberField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { deleteWeight, setWeight } from '@/db/weights';
import { todayISO } from '@/db/user';
import { addDays, relativeDayLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/serving';
import { parseWeight, WEIGHT_RANGE, type WeightInput } from '@/lib/validation';

type Props = {
  visible: boolean;
  /** Si se pasa, se está corrigiendo ese peso (y se puede quitar) */
  editing: WeightInput | null;
  /** Peso con el que se abre el campo cuando se registra uno nuevo (el último que hubiera) */
  suggestedKg: number | null;
  onClose: () => void;
  /** Se llama tras guardar o quitar, para que la pantalla recargue */
  onChanged: () => void;
};

/**
 * Ventana para registrar el peso de hoy, de ayer o de anteayer, o para corregir uno anterior.
 * Quien la use debe darle una `key` nueva cada vez que la abra, para que empiece de cero.
 */
export function WeightSheet({ visible, editing, suggestedKg, onClose, onChanged }: Props) {
  const today = todayISO();
  const [kgText, setKgText] = useState(editing ? String(editing.kg) : suggestedKg !== null ? String(suggestedKg) : '');
  const [date, setDate] = useState(editing?.date ?? today);

  // Hoy, ayer y anteayer; y la fecha que se está corrigiendo, si es más antigua
  const dates = [today, addDays(today, -1), addDays(today, -2)];
  if (editing && !dates.includes(editing.date)) dates.push(editing.date);

  const kg = parseWeight(kgText);
  const error = kg === null && kgText.trim() !== '' ? `Entre ${WEIGHT_RANGE.min} y ${WEIGHT_RANGE.max} kg.` : null;

  async function save() {
    if (kg === null) return;
    // Si se corrige un peso y se cambia su día, el de antes se quita para no dejar dos
    if (editing && editing.date !== date) await deleteWeight(editing.date);
    await setWeight(date, kg);
    onChanged();
    onClose();
  }

  async function remove() {
    if (!editing) return;
    await deleteWeight(editing.date);
    onChanged();
    onClose();
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <ThemedText style={styles.title}>{editing ? 'Corregir peso' : 'Registrar peso'}</ThemedText>
      <NumberField label="Tu peso" value={kgText} onChangeText={setKgText} unit="kg" />
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <ThemedText type="smallBold">¿Qué día?</ThemedText>
      <Chips options={dates.map((d) => ({ key: d, label: relativeDayLabel(d, today) }))} value={date} onChange={setDate} />
      {editing && kg !== null && kg !== editing.kg ? (
        <ThemedText type="small" themeColor="textSecondary">
          Antes: {formatNumber(editing.kg, 1)} kg.
        </ThemedText>
      ) : null}

      <View style={styles.buttons}>
        <Button label="Guardar peso" onPress={save} disabled={kg === null} />
        {editing ? <Button label="Quitar este peso" variant="outline" onPress={remove} /> : null}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  error: { color: '#E5484D' },
  buttons: { gap: 8, marginTop: 8 },
});
