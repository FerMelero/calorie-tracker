import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MacroColors, Spacing } from '@/constants/theme';

type Props = {
  protein: number;
  carbs: number;
  fat: number;
  /** Color del texto; en la tarjeta del total (fondo verde) va en blanco. */
  textColor?: string;
  /** Si se pasa, cada macro se muestra como "consumido / objetivo". */
  goal?: { protein: number; carbs: number; fat: number } | null;
};

/** Proteínas, carbohidratos y grasas en tres etiquetas con su color. */
export function MacroPills({ protein, carbs, fat, textColor, goal }: Props) {
  const items = [
    { label: 'P', value: protein, goal: goal?.protein, color: MacroColors.protein },
    { label: 'C', value: carbs, goal: goal?.carbs, color: MacroColors.carbs },
    { label: 'G', value: fat, goal: goal?.fat, color: MacroColors.fat },
  ];
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <ThemedText type="smallBold" style={textColor ? { color: textColor } : undefined}>
            {item.label} {item.value}{item.goal !== undefined ? ` / ${item.goal}` : ''} g
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  pill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
