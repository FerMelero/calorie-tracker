import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchFoods, type FoodResult } from '@/db/search';

const DEBOUNCE_MS = 250;

export default function BuscarScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);

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
        <ThemedText type="title">Buscar</ThemedText>
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

        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.trim().length >= 2 ? <ThemedText>Sin resultados.</ThemedText> : null
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              {item.brand ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.brand}
                </ThemedText>
              ) : null}
              <ThemedText type="small">
                {item.kcal} kcal · P {item.protein} · C {item.carbs} · G {item.fat} (por 100 g)
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Parecido: {item.similarity} %
              </ThemedText>
            </ThemedView>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  input: { borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  list: { gap: Spacing.two, paddingBottom: Spacing.six },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
});
