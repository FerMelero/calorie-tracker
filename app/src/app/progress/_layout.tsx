import { Stack } from 'expo-router';

import { ThemedStack } from '@/components/themed-stack';

export default function ProgressLayout() {
  return (
    <ThemedStack>
      <Stack.Screen name="index" options={{ title: 'Progreso' }} />
      <Stack.Screen name="goals" options={{ title: 'Mis objetivos' }} />
    </ThemedStack>
  );
}
