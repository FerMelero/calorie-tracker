import { Stack, useLocalSearchParams } from 'expo-router';

import { DayView } from '@/components/day-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatLongDate, isValidISODate } from '@/lib/dates';

export default function HistoryDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  if (!date || !isValidISODate(date)) {
    return (
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <ThemedText>Fecha no válida.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: formatLongDate(date) }} />
      <DayView date={date} />
    </ThemedView>
  );
}
