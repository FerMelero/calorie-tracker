import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import {
  copyEntries,
  getDaySummaries,
  getEntries,
  MEALS,
  todayISO,
  type DaySummary,
  type MealKey,
} from '@/db/user';
import { relativeDayLabel } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';

const MAX_DAYS = 14;

type Props = {
  visible: boolean;
  /** Día al que se copia (YYYY-MM-DD) */
  targetDate: string;
  onClose: () => void;
  /** Se llama tras copiar, para que la pantalla recargue el día */
  onCopied: () => void;
};

/** Elegir un día anterior y qué franjas copiar al día actual. */
export function CopyDayModal({ visible, targetDate, onClose, onCopied }: Props) {
  const theme = useTheme();
  const [days, setDays] = useState<DaySummary[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [counts, setCounts] = useState<Partial<Record<MealKey, number>>>({});
  const [chosen, setChosen] = useState<Set<MealKey>>(new Set());

  // Días con comida (sin contar el de destino), los más recientes primero
  useEffect(() => {
    if (!visible) return;
    getDaySummaries().then((all) => setDays(all.filter((d) => d.date !== targetDate).slice(0, MAX_DAYS)));
  }, [visible, targetDate]);

  async function pickDay(date: string) {
    setSource(date);
    const entries = await getEntries(date);
    const next: Partial<Record<MealKey, number>> = {};
    for (const e of entries) next[e.meal] = (next[e.meal] ?? 0) + 1;
    setCounts(next);
    // Por defecto, todas las franjas que tengan algo
    setChosen(new Set(MEALS.filter((m) => (next[m.key] ?? 0) > 0).map((m) => m.key)));
  }

  function toggleMeal(key: MealKey) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = [...chosen].reduce((sum, key) => sum + (counts[key] ?? 0), 0);

  async function copy() {
    if (!source || total === 0) return;
    await copyEntries(source, targetDate, [...chosen]);
    onCopied();
    onClose();
  }

  const today = todayISO();

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <ThemedText style={styles.title}>Copiar de otro día</ThemedText>

      {days.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Todavía no hay otros días con comidas registradas.
        </ThemedText>
      ) : (
        <>
          <ThemedText type="smallBold">¿De qué día?</ThemedText>
          <View style={styles.list}>
            {days.map((d) => {
              const selected = d.date === source;
              return (
                <Pressable
                  key={d.date}
                  onPress={() => pickDay(d.date)}
                  style={[styles.dayRow, { backgroundColor: selected ? Accent : theme.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ color: selected ? '#ffffff' : theme.text }}>
                    {relativeDayLabel(d.date, today)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: selected ? 'rgba(255,255,255,0.85)' : theme.textSecondary }}>
                    {d.count} {d.count === 1 ? 'alimento' : 'alimentos'} · {d.kcal} kcal
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {source ? (
            <>
              <ThemedText type="smallBold">¿Qué franjas?</ThemedText>
              <View style={styles.chips}>
                {MEALS.map((m) => {
                  const n = counts[m.key] ?? 0;
                  const on = chosen.has(m.key);
                  return (
                    <Pressable
                      key={m.key}
                      disabled={n === 0}
                      onPress={() => toggleMeal(m.key)}
                      style={[
                        styles.chip,
                        { backgroundColor: on ? Accent : theme.backgroundElement, opacity: n === 0 ? 0.4 : 1 },
                      ]}>
                      <ThemedText type="small" style={{ color: on ? '#ffffff' : theme.text }}>
                        {m.label} ({n})
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Se añadirá a lo que ya tengas en este día.
              </ThemedText>
              <View style={styles.buttonRow}>
                <Button
                  label={total === 0 ? 'Elige alguna franja' : `Copiar ${total} ${total === 1 ? 'alimento' : 'alimentos'}`}
                  onPress={copy}
                  disabled={total === 0}
                />
              </View>
            </>
          ) : null}
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  list: { gap: Spacing.two },
  dayRow: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 12, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 99 },
  buttonRow: { marginTop: Spacing.two },
});
