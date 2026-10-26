import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFoodModal } from '@/components/add-food-modal';
import { BarcodeNotFoundModal } from '@/components/barcode-not-found-modal';
import { BarcodeScannerModal } from '@/components/barcode-scanner-modal';
import { Button } from '@/components/button';
import { CustomFoodForm } from '@/components/custom-food-form';
import { FoodCard } from '@/components/food-card';
import { Chips } from '@/components/form-controls';
import { FullScreenModal } from '@/components/full-screen-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { customToFood, getCustomFood } from '@/db/custom-foods';
import { favoriteKey, listFavorites, toggleFavorite } from '@/db/favorites';
import { findFoodByBarcode, searchFoods, type Food, type FoodResult } from '@/db/search';
import { getRecentFoods, MEALS, todayISO, type RecentFood } from '@/db/user';
import { cleanBarcode } from '@/lib/barcode';
import { formatLongDate, isValidISODate } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';

const DEBOUNCE_MS = 250;
const PAGE_SIZE = 10;

type Tab = 'recent' | 'favorites';

const TABS: { key: Tab; label: string }[] = [
  { key: 'recent', label: 'Recientes' },
  { key: 'favorites', label: '★ Favoritos' },
];

/** Una fila de la lista, venga de la búsqueda, de recientes o de favoritos. */
type Row = {
  key: string;
  food: Food;
  note: string;
  similarity?: number;
  /** Cantidad con la que abre la ventana de añadir (la última usada, en recientes) */
  defaultGrams?: number;
};

export default function BuscarScreen() {
  const db = useSQLiteContext();
  const { meal, date: dateParam } = useLocalSearchParams<{ meal?: string; date?: string }>();
  const targetDate = dateParam && isValidISODate(dateParam) ? dateParam : undefined;
  const mealFromHome = MEALS.find((m) => m.key === meal)?.key;
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [tab, setTab] = useState<Tab>('recent');
  const [recents, setRecents] = useState<RecentFood[]>([]);
  const [favorites, setFavorites] = useState<Food[]>([]);

  // Escáner de códigos de barras
  const [scanOpen, setScanOpen] = useState(false);
  const [scanRun, setScanRun] = useState(0); // cambia en cada apertura para que la cámara empiece limpia
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setRecents(await getRecentFoods());
    setFavorites(await listFavorites());
  }, []);

  // Recarga recientes y favoritos cada vez que se abre la pestaña
  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists]),
  );

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

  const favoriteKeys = useMemo(() => new Set(favorites.map(favoriteKey)), [favorites]);
  const searching = query.trim().length >= 2;

  const rows: Row[] = useMemo(() => {
    if (searching) {
      return results.slice(0, visible).map((r) => ({
        key: `${r.source}-${r.id}`,
        food: r,
        similarity: r.similarity,
        note: `${r.similarity} % parecido · por 100 g`,
      }));
    }
    if (tab === 'recent') {
      return recents.map((r) => ({
        key: `recent-${favoriteKey(r)}`,
        food: r,
        defaultGrams: r.lastGrams,
        note: `Último: ${r.lastGrams} g`,
      }));
    }
    return favorites.map((f) => ({ key: `fav-${favoriteKey(f)}`, food: f, note: 'por 100 g' }));
  }, [searching, results, visible, tab, recents, favorites]);

  function openScanner() {
    Keyboard.dismiss();
    setScanRun((n) => n + 1);
    setScanOpen(true);
  }

  async function onScanned(rawCode: string) {
    setScanOpen(false);
    const food = await findFoodByBarcode(db, rawCode);
    if (food) {
      // Está en la base (o es un alimento propio): se abre directamente para añadirlo
      setSelected({ key: `scan-${food.source}-${food.id}`, food, note: '' });
    } else {
      setUnknownCode(cleanBarcode(rawCode) ?? rawCode);
    }
  }

  async function onCreated(id: number) {
    setCreatingCode(null);
    const created = await getCustomFood(id);
    if (created) setSelected({ key: `new-${id}`, food: customToFood(created), note: '' });
    loadLists();
  }

  async function onToggleFavorite(food: Food) {
    await toggleFavorite(food);
    await loadLists();
  }

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
            <Pressable
              onPress={openScanner}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Escanear código de barras">
              <ThemedText style={styles.scanIcon}>📷</ThemedText>
            </Pressable>
          </View>

          {mealFromHome ? (
            <ThemedText type="smallBold" style={{ color: Accent }}>
              Añadiendo a {MEALS.find((m) => m.key === mealFromHome)?.label}
              {targetDate && targetDate !== todayISO() ? ` · ${formatLongDate(targetDate)}` : ''}
            </ThemedText>
          ) : null}

          <View style={[styles.notice, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              🇪🇸 Busca en español. Todavía no hay soporte para búsquedas en inglés.
            </ThemedText>
          </View>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            searching ? (
              results.length > 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Mostrando {rows.length} de {results.length} resultados
                </ThemedText>
              ) : undefined
            ) : (
              <Chips options={TABS} value={tab} onChange={setTab} />
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText style={styles.emptyEmoji}>
                {searching ? '🤷' : tab === 'recent' ? '🥗' : '☆'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {searching
                  ? 'No hemos encontrado nada. Prueba con otra palabra.'
                  : tab === 'recent'
                    ? 'Aquí saldrá lo último que añadas, para repetirlo en un toque. Mientras, escribe arriba para buscar.'
                    : 'Toca la estrella ☆ de cualquier alimento para tenerlo siempre a mano aquí.'}
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            searching && visible < results.length ? (
              <View style={styles.moreButton}>
                <Button
                  variant="outline"
                  label={`Ver ${Math.min(PAGE_SIZE, results.length - visible)} más`}
                  onPress={() => setVisible((v) => v + PAGE_SIZE)}
                />
              </View>
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(250).delay((index % PAGE_SIZE) * 40)}>
              <FoodCard
                food={item.food}
                note={item.note}
                similarity={item.similarity}
                favorite={favoriteKeys.has(favoriteKey(item.food))}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelected(item);
                }}
                onToggleFavorite={() => onToggleFavorite(item.food)}
              />
            </Animated.View>
          )}
        />
      </SafeAreaView>
      <BarcodeScannerModal
        key={`scan-${scanRun}`}
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
      />
      <BarcodeNotFoundModal
        code={unknownCode}
        onClose={() => setUnknownCode(null)}
        onScanAgain={() => {
          setUnknownCode(null);
          openScanner();
        }}
        onCreate={() => {
          setCreatingCode(unknownCode);
          setUnknownCode(null);
        }}
      />
      <FullScreenModal visible={creatingCode !== null} title="Nuevo alimento" onClose={() => setCreatingCode(null)}>
        <CustomFoodForm initialBarcode={creatingCode ?? undefined} onSaved={onCreated} />
      </FullScreenModal>
      <AddFoodModal
        key={selected?.key ?? 'none'}
        food={selected?.food ?? null}
        defaultGrams={selected?.defaultGrams}
        defaultMeal={mealFromHome}
        date={targetDate}
        onClose={() => {
          setSelected(null);
          loadLists();
        }}
      />
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
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
  },
  searchIcon: { fontSize: 16 },
  scanIcon: { fontSize: 22, lineHeight: 26 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  notice: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  emptyEmoji: { fontSize: 48, lineHeight: 56 },
  emptyText: { textAlign: 'center', maxWidth: 280 },
  moreButton: { marginTop: Spacing.one },
});
