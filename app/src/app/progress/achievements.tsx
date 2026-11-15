import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { evaluateAndUnlock, listUnlocked, loadStats } from '@/db/achievements';
import { todayISO } from '@/db/user';
import { useTheme } from '@/hooks/use-theme';
import { evaluateAll, GROUP_LABELS, type Evaluated, type Group } from '@/lib/achievements';
import { shortDate } from '@/lib/dates';

const GROUP_ORDER: Group[] = ['constancia', 'objetivos', 'peso', 'app'];

type Data = { items: Evaluated[]; unlocked: Map<string, string>; hasGoals: boolean };

export default function AchievementsScreen() {
  const theme = useTheme();
  const [data, setData] = useState<Data | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const today = todayISO();
        // Por si algo se acaba de cumplir y aún no se había evaluado
        await evaluateAndUnlock(today);
        const [stats, unlocked] = await Promise.all([loadStats(today), listUnlocked()]);
        if (cancelled) return;
        setData({ items: evaluateAll(stats), unlocked, hasGoals: stats.goals !== null });
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!data) return <ThemedView style={{ flex: 1 }} />;
  const total = data.items.length;
  const done = data.items.filter((i) => data.unlocked.has(i.achievement.id)).length;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">
          {done} de {total}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Los logros premian el hábito (registrar, pesarte, usar la app), nunca comer menos ni perder peso. Una vez
          desbloqueados no se pierden.
        </ThemedText>

        {GROUP_ORDER.map((group) => {
          const list = data.items.filter((i) => i.achievement.group === group);
          return (
            <View key={group} style={styles.group}>
              <ThemedText type="smallBold">{GROUP_LABELS[group]}</ThemedText>
              {group === 'objetivos' && !data.hasGoals ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Define tus objetivos en la pestaña Progreso para poder conseguir estos.
                </ThemedText>
              ) : null}
              {list.map(({ achievement: a, result }) => {
                const date = data.unlocked.get(a.id);
                const isDone = date !== undefined;
                // Un hito de una sola vez no tiene barra: o está o no está
                const showBar = !isDone && result.target > 1;
                return (
                  <Card key={a.id} style={{ opacity: isDone ? 1 : 0.65 }}>
                    <View style={styles.row}>
                      <ThemedText style={[styles.emoji, !isDone && styles.locked]}>{a.emoji}</ThemedText>
                      <View style={styles.texts}>
                        <ThemedText type="smallBold">{a.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {a.description}
                        </ThemedText>
                      </View>
                    </View>
                    {isDone ? (
                      <ThemedText type="small" style={{ color: Accent }}>
                        ✓ Conseguido el {shortDate(date)}
                      </ThemedText>
                    ) : showBar ? (
                      <View>
                        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                          <View
                            style={[styles.fill, { width: `${Math.min(100, (result.current / result.target) * 100)}%` }]}
                          />
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {Math.min(result.current, result.target)} / {result.target}
                        </ThemedText>
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  emoji: { fontSize: 28, lineHeight: 34 },
  locked: { opacity: 0.5 },
  texts: { flex: 1, gap: 2 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.one },
  fill: { height: 8, borderRadius: 4, backgroundColor: Accent },
});
