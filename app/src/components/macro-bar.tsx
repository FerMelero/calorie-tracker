import { StyleSheet, View } from 'react-native';

import { MacroColors } from '@/constants/theme';

type Props = { protein: number; carbs: number; fat: number };

/** Barra con el reparto de gramos entre proteínas, carbohidratos y grasas. */
export function MacroBar({ protein, carbs, fat }: Props) {
  const total = protein + carbs + fat;
  return (
    <View style={styles.track}>
      {total > 0 ? (
        <>
          <View style={{ flex: protein, backgroundColor: MacroColors.protein }} />
          <View style={{ flex: carbs, backgroundColor: MacroColors.carbs }} />
          <View style={{ flex: fat, backgroundColor: MacroColors.fat }} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.25)',
  },
});
