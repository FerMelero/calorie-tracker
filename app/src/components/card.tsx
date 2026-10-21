import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tarjeta blanca (gris oscuro en modo oscuro) con esquinas redondeadas y sombra muy suave. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
  },
});
