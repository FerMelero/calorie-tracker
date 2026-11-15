import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AchievementBanner } from '@/components/achievement-banner';
import { DayView } from '@/components/day-view';
import { StreakCard } from '@/components/streak-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { todayISO } from '@/db/user';
import { useProgression } from '@/hooks/use-progression';
import { formatLongDate } from '@/lib/dates';

export default function HoyScreen() {
  const date = todayISO();
  const { enabled, streak, dots, fresh, refresh, dismiss } = useProgression();
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <DayView
          date={date}
          onLoaded={refresh}
          header={
            <View style={{ gap: 16 }}>
              <View>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatLongDate(date)}
                </ThemedText>
                <ThemedText type="subtitle">Hoy</ThemedText>
              </View>
              {enabled ? <AchievementBanner ids={fresh} onDismiss={dismiss} /> : null}
              {enabled ? <StreakCard streak={streak} dots={dots} /> : null}
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}
