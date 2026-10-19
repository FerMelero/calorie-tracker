import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteCustomFood, listCustomFoods, type CustomFood } from '@/db/custom-foods';

export default function MyFoodsScreen() {
  const [foods, setFoods] = useState<CustomFood[]>([]);

  const load = useCallback(() => {
    listCustomFoods().then(setFoods);
  }, []);
  useFocusEffect(load);

  function confirmDelete(food: CustomFood) {
    Alert.alert(
      'Borrar alimento',
      `¿Borrar "${food.name}"? Los días donde ya lo registraste no cambian.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomFood(food.id);
            load();
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={foods}
        keyExtractor={(f) => String(f.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Button label="+ Nuevo alimento" onPress={() => router.push('/more/food-form')} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>🥣</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Aún no tienes alimentos propios. Crea uno y saldrá también en Buscar.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.top}>
              <View style={styles.name}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.name}
                </ThemedText>
                {item.brand ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.brand}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="smallBold">{item.kcal} kcal</ThemedText>
            </View>
            <MacroPills protein={item.protein} carbs={item.carbs} fat={item.fat} />
            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push({ pathname: '/more/food-form', params: { id: String(item.id) } })}>
                <ThemedText type="smallBold">Editar</ThemedText>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)}>
                <ThemedText type="small" style={styles.delete}>
                  Borrar
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  name: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.one },
  delete: { color: '#E5484D' },
  empty: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  emptyEmoji: { fontSize: 48, lineHeight: 56 },
  emptyText: { textAlign: 'center', maxWidth: 260 },
});
