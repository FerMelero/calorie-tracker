import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFoodModal } from '@/components/add-food-modal';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { searchFoods, type FoodResult } from '@/db/search';
import { useTheme } from '@/hooks/use-theme';

const DEBOUNCE_MS = 250;
const PAGE_SIZE = 10;

export default function BuscarScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<FoodResult | null>(null);

  useEffect(() => {
    // Espera a que el usuario deje de escribir y descarta respuestas antiguas
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchFoods(db, query);
      if (cancelled) return;
      setResults(found);
      setVisible(PAGE_SIZE);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, query]);

  const shown = results.slice(0, visible);
  const searching = query.trim().length >= 2;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Buscar</ThemedText>

          <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Jamón serrano, arroz, yogur..."
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              style={[styles.input, { color: theme.text }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <ThemedText themeColor="textSecondary">✕</ThemedText>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              🇪🇸 Busca en español. Todavía no hay soporte para búsquedas en inglés.
            </ThemedText>
          </View>
        </View>

        <FlatList
          data={shown}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            results.length > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Mostrando {shown.length} de {results.length} resultados
              </ThemedText>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText style={styles.emptyEmoji}>{searching ? '🤷' : '🥗'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {searching
                  ? 'No hemos encontrado nada. Prueba con otra palabra.'
                  : 'Escribe al menos 2 letras. Toca un resultado para añadirlo a tu día.'}
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            visible < results.length ? (
              <Pressable
                onPress={() => setVisible((v) => v + PAGE_SIZE)}
                style={({ pressed }) => [
                  styles.moreButton,
                  { borderColor: Accent, opacity: pressed ? 0.6 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: Accent }}>
                  Ver {Math.min(PAGE_SIZE, results.length - visible)} más
                </ThemedText>
              </Pressable>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(250).delay((index % PAGE_SIZE) * 40)}>
              <Pressable
                onPress={() => setSelected(item)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
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
                    <View style={styles.kcalBox}>
                      <ThemedText style={styles.kcalValue}>{item.kcal}</ThemedText>
                      <ThemedText style={styles.kcalUnit}>kcal</ThemedText>
                    </View>
                  </View>

                  <MacroPills protein={item.protein} carbs={item.carbs} fat={item.fat} />

                  <View style={styles.similarityRow}>
                    <View style={styles.similarityTrack}>
                      <View style={[styles.similarityFill, { width: `${item.similarity}%` }]} />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.similarity} % parecido · por 100 g
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            </Animated.View>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
  },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  notice: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  emptyEmoji: { fontSize: 48, lineHeight: 56 },
  emptyText: { textAlign: 'center', maxWidth: 260 },
  card: { borderRadius: 18, padding: Spacing.three, gap: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  cardTitle: { flex: 1 },
  kcalBox: { alignItems: 'center', backgroundColor: Accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, minWidth: 60 },
  kcalValue: { color: '#ffffff', fontSize: 18, lineHeight: 22, fontWeight: 700 },
  kcalUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 14, fontWeight: 600 },
  similarityRow: { gap: 4 },
  similarityTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' },
  similarityFill: { height: 4, borderRadius: 2, backgroundColor: Accent },
  moreButton: { alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: Spacing.three, marginTop: Spacing.one },
});
