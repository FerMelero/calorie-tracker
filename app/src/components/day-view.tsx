import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { MacroPills } from '@/components/macro-pills';
import { CopyDayModal } from '@/components/copy-day-modal';
import { EditEntryModal } from '@/components/edit-entry-modal';
import { MacroProgress } from '@/components/macro-progress';
import { ThemedText } from '@/components/themed-text';
import { AccentGradient, Spacing } from '@/constants/theme';
import { getGoals, type Goals } from '@/db/goals';
import { deleteEntry, getEntries, MEALS, sumTotals, type Entry } from '@/db/user';
import { useTheme } from '@/hooks/use-theme';

const MEAL_ICONS: Record<string, string> = {
  desayuno: '🥐',
  comida: '🍝',
  snacks: '🍎',
  merienda: '🥪',
  cena: '🌙',
};

type Props = {
  /** Fecha del día a mostrar, YYYY-MM-DD */
  date: string;
  /** Cabecera opcional que va encima de la tarjeta de calorías */
  header?: ReactNode;
};

/** Resumen de un día: calorías frente al objetivo, macros y las cinco franjas con sus alimentos. */
export function DayView({ date, header }: Props) {
  const theme = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  // Cambia cada vez que se abre la ventana de copiar, para que empiece limpia
  const [copyRun, setCopyRun] = useState(0);

  const load = useCallback(async () => {
    setEntries(await getEntries(date));
    setGoals(await getGoals());
  }, [date]);

  // Recarga cada vez que se abre la pantalla (por si se ha añadido algo desde Buscar)
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
  const over = goals !== null && total.kcal > goals.kcal;

  return (
    <>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {header}

          <LinearGradient
            colors={AccentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}>
            <ThemedText type="smallBold" style={styles.onAccentMuted}>
              CALORÍAS DE HOY
            </ThemedText>
            <View style={styles.kcalRow}>
              <ThemedText style={styles.kcalValue}>{total.kcal}</ThemedText>
              <ThemedText style={styles.onAccentMuted}>
                {goals ? `/ ${goals.kcal} kcal` : 'kcal'}
              </ThemedText>
            </View>

            {goals ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (total.kcal / goals.kcal) * 100)}%`,
                        backgroundColor: over ? '#FFB4A2' : '#ffffff',
                      },
                    ]}
                  />
                </View>
                <ThemedText type="small" style={styles.onAccentMuted}>
                  {over
                    ? `Te has pasado ${total.kcal - goals.kcal} kcal`
                    : `Te quedan ${goals.kcal - total.kcal} kcal`}
                </ThemedText>
                <MacroProgress protein={total.protein} carbs={total.carbs} fat={total.fat} goal={goals} />
              </>
            ) : (
              <>
                <MacroPills {...total} textColor="#ffffff" />
                <Pressable onPress={() => router.navigate('/goals')}>
                  <ThemedText type="smallBold" style={styles.link}>
                    Define tus objetivos →
                  </ThemedText>
                </Pressable>
              </>
            )}
          </LinearGradient>

          <Pressable
            onPress={() => {
              setCopyRun((n) => n + 1);
              setCopyOpen(true);
            }}
            style={({ pressed }) => [styles.copyButton, { borderColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText type="smallBold">📋 Copiar de otro día</ThemedText>
          </Pressable>

          {MEALS.map((meal, index) => {
            const mealEntries = entries.filter((e) => e.meal === meal.key);
            const mealTotal = sumTotals(mealEntries);
            return (
              <Animated.View key={meal.key} entering={FadeInDown.duration(300).delay(index * 60)}>
                <Card>
                  <View style={styles.mealHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText style={styles.icon}>{MEAL_ICONS[meal.key]}</ThemedText>
                    </View>
                    <View style={styles.mealTitleBox}>
                      <ThemedText style={styles.mealTitle}>{meal.label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {mealTotal.kcal} kcal
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => router.navigate({ pathname: '/explore', params: { meal: meal.key, date } })}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.addButton,
                        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
                      ]}>
                      <ThemedText style={styles.addSymbol}>+</ThemedText>
                    </Pressable>
                  </View>

                  {mealEntries.length > 0 ? (
                    <>
                      <MacroPills {...mealTotal} />
                      <View style={styles.entries}>
                        {mealEntries.map((e) => (
                          <View key={e.id} style={[styles.entry, { borderTopColor: theme.backgroundSelected }]}>
                            <View style={styles.entryText}>
                              <ThemedText type="small" numberOfLines={2}>
                                {e.food_name}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {e.grams} g · {e.kcal} kcal
                              </ThemedText>
                            </View>
                            <Pressable onPress={() => setEditing(e)} hitSlop={8}>
                          <ThemedText type="small" style={styles.edit}>
                            Editar
                          </ThemedText>
                        </Pressable>
                        <Pressable onPress={() => remove(e.id)} hitSlop={8}>
                              <ThemedText type="small" style={styles.remove}>
                                Quitar
                              </ThemedText>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </Card>
              </Animated.View>
            );
          })}
    </ScrollView>
      <CopyDayModal
        key={copyRun}
        visible={copyOpen}
        targetDate={date}
        onClose={() => setCopyOpen(false)}
        onCopied={load}
      />
      <EditEntryModal
        key={editing?.id ?? 'none'}
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  totalCard: { borderRadius: 28, padding: Spacing.four, gap: Spacing.three },
  copyButton: { alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingVertical: 12 },
  onAccentMuted: { color: 'rgba(255,255,255,0.82)' },
  link: { color: '#ffffff' },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  kcalValue: { color: '#ffffff', fontSize: 56, lineHeight: 62, fontWeight: 700, letterSpacing: -1.5 },
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.28)' },
  progressFill: { height: 10, borderRadius: 5 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, lineHeight: 28 },
  mealTitleBox: { flex: 1 },
  mealTitle: { fontSize: 17, lineHeight: 22, fontWeight: 700 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addSymbol: { fontSize: 22, lineHeight: 26, fontWeight: 600 },
  entries: { gap: Spacing.two, marginTop: Spacing.one },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryText: { flex: 1 },
  edit: { color: '#3E7BFA' },
  remove: { color: '#E5484D' },
});
