import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayView } from '@/components/day-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { todayISO } from '@/db/user';
import { formatLongDate } from '@/lib/dates';

export default function HoyScreen() {
  const date = todayISO();
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <DayView
          date={date}
          header={
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                {formatLongDate(date)}
              </ThemedText>
              <ThemedText type="subtitle">Hoy</ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}
