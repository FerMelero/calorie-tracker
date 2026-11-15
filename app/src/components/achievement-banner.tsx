import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { bannerText } from '@/lib/achievements';

type Props = { ids: string[]; onDismiss: () => void };

/** Aviso que se puede cerrar o tocar para ver los logros. No aparece si no hay nada nuevo. */
export function AchievementBanner({ ids, onDismiss }: Props) {
  const text = bannerText(ids);
  if (text === '') return null;
  return (
    <View style={[styles.banner, { backgroundColor: Accent }]}>
      <Pressable style={styles.text} onPress={() => router.navigate('/progress/achievements')}>
        <ThemedText type="smallBold" style={styles.white}>
          {text}
        </ThemedText>
        <ThemedText type="small" style={styles.whiteMuted}>
          Toca para verlos
        </ThemedText>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={12} accessibilityLabel="Cerrar aviso">
        <ThemedText style={styles.white}>✕</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 16, padding: Spacing.three },
  text: { flex: 1, gap: 2 },
  white: { color: '#ffffff' },
  whiteMuted: { color: 'rgba(255,255,255,0.85)' },
});
