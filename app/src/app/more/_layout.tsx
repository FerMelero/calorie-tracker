import { Stack } from 'expo-router';

import { ThemedStack } from '@/components/themed-stack';

export default function MoreLayout() {
  return (
    <ThemedStack>
      <Stack.Screen name="index" options={{ title: 'Más' }} />
      <Stack.Screen name="my-foods" options={{ title: 'Mis alimentos' }} />
      <Stack.Screen name="food-form" options={{ title: 'Alimento' }} />
      <Stack.Screen name="backup" options={{ title: 'Copia de seguridad' }} />
    </ThemedStack>
  );
}
