import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent } from '@/constants/theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** "outline" = solo borde verde; "solid" (por defecto) = relleno verde */
  variant?: 'solid' | 'outline';
};

export function Button({ label, variant = 'solid', disabled, ...rest }: Props) {
  const solid = variant === 'solid';
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        solid ? { backgroundColor: Accent } : { borderWidth: 1.5, borderColor: Accent },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={{ color: solid ? '#ffffff' : Accent }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16 },
});
