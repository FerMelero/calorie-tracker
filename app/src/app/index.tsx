import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { deleteEntry, getEntries, MEALS, sumTotals, todayISO, type Entry } from '@/db/user';

const MEAL_ICONS: Record<string, string> = {
  desayuno: '🥐',
  comida: '🍝',
  snacks: '🍎',
  merienda: '🥪',
  cena: '🌙',
};

export default function HoyScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const date = todayISO();

  const load = useCallback(async () => {
    setEntries(await getEntries(date));
  }, [date]);

  // Recarga cada vez que se abre la pestaña (por si se ha añadido algo desde Buscar)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function remove(id: number) {
    await deleteEntry(id);
    await load();
  }

  const total = sumTotals(entries);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <ThemedText type="subtitle">Hoy</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {date}
            </ThemedText>
          </View>

          <View style={[styles.totalCard, { backgroundColor: Accent }]}>
            <ThemedText type="smallBold" style={styles.onAccentMuted}>
              TOTAL DEL DÍA
            </ThemedText>
            <View style={styles.kcalRow}>
              <ThemedText style={styles.kcalValue}>{total.kcal}</ThemedText>
              <ThemedText type="default" style={styles.onAccentMuted}>
                kcal
              </ThemedText>
            </View>
            <MacroPills {...total} textColor="#ffffff" />
          </View>

          {MEALS.map((meal) => {
            const mealEntries = entries.filter((e) => e.meal === meal.key);
            const mealTotal = sumTotals(mealEntries);
            return (
              <ThemedView key={meal.key} type="backgroundElement" style={styles.card}>
                <View style={styles.row}>
                  <ThemedText style={styles.mealTitle}>
                    {MEAL_ICONS[meal.key]} {meal.label}
                  </ThemedText>
                  <ThemedText style={styles.mealKcal}>{mealTotal.kcal} kcal</ThemedText>
                </View>
                <MacroPills {...mealTotal} />

                {mealEntries.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Sin alimentos. Añádelos desde Buscar.
                  </ThemedText>
                ) : (
                  <View style={styles.entries}>
                    {mealEntries.map((e) => (
                      <View key={e.id} style={styles.entry}>
                        <View style={styles.entryText}>
                          <ThemedText type="small" numberOfLines={2}>
                            {e.food_name}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {e.grams} g · {e.kcal} kcal
                          </ThemedText>
                        </View>
                        <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                          <ThemedText type="small" style={styles.remove}>
                            Quitar
                          </ThemedText>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </ThemedView>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  totalCard: { borderRadius: 20, padding: Spacing.four, gap: Spacing.two },
  onAccentMuted: { color: 'rgba(255,255,255,0.8)' },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  kcalValue: { color: '#ffffff', fontSize: 52, lineHeight: 58, fontWeight: 700 },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTitle: { fontSize: 18, fontWeight: 700 },
  mealKcal: { fontSize: 16, fontWeight: 700 },
  entries: { gap: Spacing.two, marginTop: Spacing.one },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.35)',
  },
  entryText: { flex: 1 },
  remove: { color: '#E5484D' },
});
