import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFoodModal } from '@/components/add-food-modal';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { searchFoods, type FoodResult } from '@/db/search';
import { useTheme } from '@/hooks/use-theme';

const DEBOUNCE_MS = 250;

export default function BuscarScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [selected, setSelected] = useState<FoodResult | null>(null);

  useEffect(() => {
    // Espera a que el usuario deje de escribir y descarta respuestas antiguas
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchFoods(db, query);
      if (!cancelled) setResults(found);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Buscar</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Busca en español. Todavía no hay soporte para búsquedas en inglés.
          </ThemedText>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ej: jamón serrano, arroz, yogur..."
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              {query.trim().length >= 2
                ? 'Sin resultados.'
                : 'Escribe al menos 2 letras. Toca un resultado para añadirlo a tu día.'}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitle}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {item.name}
                    </ThemedText>
                    {item.brand ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {item.brand}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.kcalBadge}>
                    <ThemedText type="smallBold" style={styles.kcalText}>
                      {item.kcal} kcal
                    </ThemedText>
                  </View>
                </View>
                <MacroPills protein={item.protein} carbs={item.carbs} fat={item.fat} />
                <ThemedText type="small" themeColor="textSecondary">
                  por 100 g · parecido {item.similarity} %
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
      <AddFoodModal key={selected?.id} food={selected} onClose={() => setSelected(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: Spacing.three, gap: Spacing.two },
  input: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: 16 },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  cardTitle: { flex: 1 },
  kcalBadge: { backgroundColor: Accent, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  kcalText: { color: '#ffffff' },
});
