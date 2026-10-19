import { Stack } from 'expo-router';

import { ThemedStack } from '@/components/themed-stack';

export default function HistoryLayout() {
  return (
    <ThemedStack>
      <Stack.Screen name="index" options={{ title: 'Historial' }} />
      <Stack.Screen name="[date]" options={{ title: 'Día' }} />
    </ThemedStack>
  );
}
