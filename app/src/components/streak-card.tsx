import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { streakMessage, type StreakInfo, type WeekDot } from '@/lib/streaks';

type Props = { streak: StreakInfo; dots: WeekDot[] };

/** Racha actual, días de gracia que quedan y los siete días de la semana. */
export function StreakCard({ streak, dots }: Props) {
  const theme = useTheme();
  const { title, subtitle } = streakMessage(streak);
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.top}>
        <View style={styles.texts}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        </View>
        {streak.graceStock > 0 ? (
          <View style={[styles.grace, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">🛡️ {streak.graceStock}</ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.dots}>
        {dots.map((d) => (
          <View key={d.date} style={styles.dotBox}>
            <View
              style={[
                styles.dot,
                { backgroundColor: d.logged ? Accent : theme.backgroundSelected, opacity: d.isFuture ? 0.4 : 1 },
                d.isToday && { borderWidth: 2, borderColor: Accent },
              ]}>
              {d.logged ? <ThemedText style={styles.check}>✓</ThemedText> : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {d.label}
            </ThemedText>
          </View>
        ))}
      </View>
      {streak.graceStock > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          🛡️ Días de gracia: si un día no registras, se usa uno y la racha no se rompe.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  grace: { borderRadius: 99, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dotBox: { alignItems: 'center', gap: Spacing.one },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#ffffff', fontSize: 14, lineHeight: 18, fontWeight: 700 },
});
