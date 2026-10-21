import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipsProps<T extends string> = {
  options: { key: T; label: string; description?: string }[];
  value: T | null;
  onChange: (key: T) => void;
};

/** Grupo de botones donde solo se puede elegir uno. */
export function Chips<T extends string>({ options, value, onChange }: ChipsProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.chip, { backgroundColor: selected ? Accent : theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ color: selected ? '#ffffff' : theme.text }}>
              {o.label}
            </ThemedText>
            {o.description ? (
              <ThemedText
                type="small"
                style={{ color: selected ? 'rgba(255,255,255,0.85)' : theme.textSecondary }}>
                {o.description}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
};

/** Campo numérico con etiqueta y unidad. */
export function NumberField({ label, value, onChangeText, unit }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.inputBox, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          style={[styles.input, { color: theme.text }]}
        />
        {unit ? (
          <ThemedText type="small" themeColor="textSecondary">
            {unit}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

type StepperProps = {
  label: string;
  valueText: string;
  onMinus: () => void;
  onPlus: () => void;
  hint?: string;
};

/** Botones − y + para mover un valor dentro de un rango. */
export function Stepper({ label, valueText, onMinus, onPlus, hint }: StepperProps) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Pressable onPress={onMinus} style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.stepSymbol}>−</ThemedText>
      </Pressable>
      <ThemedText style={styles.stepValue}>{valueText}</ThemedText>
      <Pressable onPress={onPlus} style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.stepSymbol}>+</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderRadius: 99, paddingHorizontal: Spacing.three, paddingVertical: 10, boxShadow: '0 1px 6px rgba(0, 0, 0, 0.05)' },
  field: { flex: 1, minWidth: 100, gap: Spacing.one },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
    boxShadow: '0 1px 6px rgba(0, 0, 0, 0.05)',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperText: { flex: 1 },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { fontSize: 22, lineHeight: 26, fontWeight: 600 },
  stepValue: { minWidth: 56, textAlign: 'center', fontSize: 16, fontWeight: 700 },
});
