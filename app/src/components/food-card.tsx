import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import type { Food } from '@/db/search';

type Props = {
  food: Food;
  /** Línea pequeña de abajo: "87 % parecido", "Último: 150 g"... */
  note: string;
  /** De 0 a 100: dibuja una barra de parecido (solo en resultados de búsqueda) */
  similarity?: number;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

/** Tarjeta de un alimento: nombre, marca, kcal, macros, estrella de favorito y una nota. */
export function FoodCard({ food, note, similarity, favorite, onPress, onToggleFavorite }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card>
        <View style={styles.top}>
          <View style={styles.title}>
            <ThemedText type="smallBold" numberOfLines={2}>
              {food.source === 'custom' ? '🥣 ' : ''}
              {food.name}
            </ThemedText>
            {food.brand ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {food.brand}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.kcalBox}>
            <ThemedText style={styles.kcalValue}>{food.kcal}</ThemedText>
            <ThemedText style={styles.kcalUnit}>kcal</ThemedText>
          </View>
        </View>

        <MacroPills protein={food.protein} carbs={food.carbs} fat={food.fat} />

        {similarity !== undefined ? (
          <View style={styles.similarityTrack}>
            <View style={[styles.similarityFill, { width: `${similarity}%` }]} />
          </View>
        ) : null}

        <View style={styles.bottom}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {note}
          </ThemedText>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
            <ThemedText style={[styles.star, !favorite && styles.starOff]}>{favorite ? '★' : '☆'}</ThemedText>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  title: { flex: 1 },
  kcalBox: {
    alignItems: 'center',
    backgroundColor: Accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
  },
  kcalValue: { color: '#ffffff', fontSize: 18, lineHeight: 22, fontWeight: 700 },
  kcalUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 14, fontWeight: 600 },
  similarityTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' },
  similarityFill: { height: 4, borderRadius: 2, backgroundColor: Accent },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { flex: 1 },
  star: { fontSize: 26, lineHeight: 30, color: '#F5A524' },
  starOff: { color: 'rgba(128,128,128,0.6)' },
});
