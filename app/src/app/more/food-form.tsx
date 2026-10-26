import { router, Stack, useLocalSearchParams } from 'expo-router';

import { CustomFoodForm } from '@/components/custom-food-form';
import { ThemedView } from '@/components/themed-view';

export default function FoodFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : undefined;

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: editingId === undefined ? 'Nuevo alimento' : 'Editar alimento' }} />
      <CustomFoodForm editingId={editingId} onSaved={() => router.back()} />
    </ThemedView>
  );
}
