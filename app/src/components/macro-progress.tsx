import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MacroColors, Spacing } from '@/constants/theme';

type Props = {
  protein: number;
  carbs: number;
  fat: number;
  goal: { protein: number; carbs: number; fat: number };
};

/** Tres columnas (proteínas, carbohidratos, grasas) con lo consumido, el objetivo y una barra. */
export function MacroProgress({ protein, carbs, fat, goal }: Props) {
  const items = [
    { label: 'Proteínas', value: protein, goal: goal.protein, color: MacroColors.protein },
    { label: 'Carbos', value: carbs, goal: goal.carbs, color: MacroColors.carbs },
    { label: 'Grasas', value: fat, goal: goal.fat, color: MacroColors.fat },
  ];
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const pct = item.goal > 0 ? Math.min(100, (item.value / item.goal) * 100) : 0;
        return (
          <View key={item.label} style={styles.item}>
            <ThemedText type="small" style={styles.label}>
              {item.label}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.value}>
              {item.value} / {item.goal} g
            </ThemedText>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  item: { flex: 1, gap: 2 },
  label: { color: 'rgba(255,255,255,0.8)' },
  value: { color: '#ffffff' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', marginTop: 4 },
  fill: { height: 6, borderRadius: 3 },
});
