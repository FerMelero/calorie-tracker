import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { getGoals, type Goals } from '@/db/goals';
import { getDaySummaries, type DaySummary } from '@/db/user';
import { formatLongDate } from '@/lib/dates';

const PAGE_SIZE = 10;

export default function HistoryScreen() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useFocusEffect(
    useCallback(() => {
      getDaySummaries().then(setDays);
      getGoals().then(setGoals);
    }, []),
  );

  const shown = days.slice(0, visible);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={shown}
        keyExtractor={(d) => d.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          days.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {days.length} {days.length === 1 ? 'día registrado' : 'días registrados'}
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📅</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Aún no hay días registrados. Añade tu primera comida desde Buscar.
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          visible < days.length ? (
            <Button
              variant="outline"
              label={`Ver ${Math.min(PAGE_SIZE, days.length - visible)} más`}
              onPress={() => setVisible((v) => v + PAGE_SIZE)}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const over = goals !== null && item.kcal > goals.kcal;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/history/[date]', params: { date: item.date } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Card>
                <View style={styles.row}>
                  <View style={styles.dateBox}>
                    <ThemedText type="smallBold">{formatLongDate(item.date)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.count} {item.count === 1 ? 'alimento' : 'alimentos'}
                    </ThemedText>
                  </View>
                  <View style={styles.kcalBox}>
                    <ThemedText style={[styles.kcal, over && styles.over]}>{item.kcal}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {goals ? `de ${goals.kcal} kcal` : 'kcal'}
                    </ThemedText>
                  </View>
                </View>
                <MacroPills protein={item.protein} carbs={item.carbs} fat={item.fat} />
              </Card>
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dateBox: { flex: 1 },
  kcalBox: { alignItems: 'flex-end' },
  kcal: { fontSize: 22, lineHeight: 28, fontWeight: 700, color: Accent },
  over: { color: '#E5484D' },
  empty: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  emptyEmoji: { fontSize: 48, lineHeight: 56 },
  emptyText: { textAlign: 'center', maxWidth: 260 },
});
