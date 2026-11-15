import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { getLoggedDates, listUnlocked } from '@/db/achievements';
import { getGamificationEnabled } from '@/db/settings';
import { todayISO } from '@/db/user';
import { useTheme } from '@/hooks/use-theme';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { computeStreak, recentDays } from '@/lib/streaks';

const CALENDAR_DAYS = 30;

type Data = { today: string; loggedDates: string[]; unlocked: number };

/** Mejor racha, días registrados, calendario de los últimos 30 días y acceso a los logros. */
export function ProgressionCard() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [data, setData] = useState<Data | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const on = await getGamificationEnabled();
        if (cancelled) return;
        setEnabled(on);
        if (!on) return;
        const [loggedDates, unlocked] = await Promise.all([getLoggedDates(), listUnlocked()]);
        if (cancelled) return;
        // Solo cuentan los logros que esta versión conoce (una copia de una versión nueva puede traer otros)
        const known = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
        setData({ today: todayISO(), loggedDates, unlocked: known });
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!enabled || !data) return null;
  const streak = computeStreak(data.loggedDates, data.today);
  const days = recentDays(data.loggedDates, data.today, CALENDAR_DAYS);
  const inCalendar = days.filter((d) => d.logged).length;

  return (
    <Card>
      <ThemedText type="smallBold">Constancia</ThemedText>
      <View style={styles.stats}>
        <Stat value={`${streak.current}`} label="racha actual" />
        <Stat value={`${streak.longest}`} label="mejor racha" />
        <Stat value={`${streak.totalDays}`} label="días registrados" />
      </View>
      <View style={styles.calendar}>
        {days.map((d) => (
          <View key={d.date} style={[styles.cell, { backgroundColor: d.logged ? Accent : theme.backgroundSelected }]} />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Últimos {CALENDAR_DAYS} días: {inCalendar} registrados. Un día sin registrar no es un 0: es un hueco, y no pasa nada.
      </ThemedText>
      <Button label={`Logros ${data.unlocked}/${ACHIEVEMENTS.length}`} variant="outline" onPress={() => router.push('/progress/achievements')} />
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1 },
  statValue: { fontSize: 26, lineHeight: 32, fontWeight: 700 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 18, height: 18, borderRadius: 5 },
});
