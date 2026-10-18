import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chips, NumberField, Stepper } from '@/components/form-controls';
import { MacroPills } from '@/components/macro-pills';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, AccentGradient, Spacing } from '@/constants/theme';
import { getGoals, saveGoals } from '@/db/goals';
import {
  ACTIVITY_OPTIONS,
  calculateGoals,
  FAT_PERCENT,
  OBJECTIVE_OPTIONS,
  parseNumber,
  PROTEIN_PER_KG,
  SEX_OPTIONS,
  type Activity,
  type Objective,
  type Sex,
} from '@/lib/nutrition';

type Mode = 'auto' | 'manual';

const MODE_OPTIONS: { key: Mode; label: string }[] = [
  { key: 'auto', label: 'Calcular por mí' },
  { key: 'manual', label: 'Elegir las mías' },
];

function objectiveRange(objective: Objective) {
  return OBJECTIVE_OPTIONS.find((o) => o.key === objective)!.range;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function GoalsScreen() {
  const [mode, setMode] = useState<Mode>('auto');

  // Datos para el cálculo automático
  const [sex, setSex] = useState<Sex>('male');
  const [ageText, setAgeText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [heightText, setHeightText] = useState('');
  const [activity, setActivity] = useState<Activity>('light');
  const [objective, setObjective] = useState<Objective>('maintain');
  const [adjustPercent, setAdjustPercent] = useState(20);
  const [proteinPerKg, setProteinPerKg] = useState(PROTEIN_PER_KG.default);
  const [fatPercent, setFatPercent] = useState(FAT_PERCENT.default);

  // Valores para el modo manual
  const [kcalText, setKcalText] = useState('');
  const [proteinText, setProteinText] = useState('');
  const [carbsText, setCarbsText] = useState('');
  const [fatText, setFatText] = useState('');

  const [message, setMessage] = useState<string | null>(null);

  // Carga lo guardado cada vez que se abre la pestaña
  useFocusEffect(
    useCallback(() => {
      getGoals().then((g) => {
        if (!g) return;
        setMode(g.mode);
        if (g.sex) setSex(g.sex);
        if (g.age !== null) setAgeText(String(g.age));
        if (g.weight_kg !== null) setWeightText(String(g.weight_kg));
        if (g.height_cm !== null) setHeightText(String(g.height_cm));
        if (g.activity) setActivity(g.activity);
        if (g.objective) setObjective(g.objective);
        if (g.adjust_pct !== null) setAdjustPercent(g.adjust_pct);
        if (g.protein_per_kg !== null) setProteinPerKg(g.protein_per_kg);
        if (g.fat_pct !== null) setFatPercent(g.fat_pct);
        setKcalText(String(g.kcal));
        setProteinText(String(g.protein));
        setCarbsText(String(g.carbs));
        setFatText(String(g.fat));
      });
    }, []),
  );

  const age = parseNumber(ageText);
  const weight = parseNumber(weightText);
  const height = parseNumber(heightText);
  const inputsValid =
    age !== null && age > 0 && age < 120 && weight !== null && weight > 20 && weight < 400 &&
    height !== null && height > 80 && height < 260;

  const result = useMemo(() => {
    if (!inputsValid) return null;
    return calculateGoals({
      sex, age, weightKg: weight, heightCm: height, activity, objective,
      adjustPercent, proteinPerKg, fatPercent,
    });
  }, [inputsValid, sex, age, weight, height, activity, objective, adjustPercent, proteinPerKg, fatPercent]);

  const manualKcal = parseNumber(kcalText);
  const manualProtein = parseNumber(proteinText);
  const manualCarbs = parseNumber(carbsText);
  const manualFat = parseNumber(fatText);
  const manualValid =
    manualKcal !== null && manualKcal > 0 && manualProtein !== null && manualProtein >= 0 &&
    manualCarbs !== null && manualCarbs >= 0 && manualFat !== null && manualFat >= 0;

  function selectObjective(next: Objective) {
    setObjective(next);
    const range = objectiveRange(next);
    if (range) setAdjustPercent(range.default);
    setMessage(null);
  }

  async function save() {
    if (mode === 'auto' && result) {
      await saveGoals({
        mode, sex, age, weight_kg: weight, height_cm: height, activity, objective,
        adjust_pct: objectiveRange(objective) ? adjustPercent : 0,
        protein_per_kg: proteinPerKg, fat_pct: fatPercent,
        kcal: result.kcal, protein: result.protein, carbs: result.carbs, fat: result.fat,
      });
      setKcalText(String(result.kcal));
      setProteinText(String(result.protein));
      setCarbsText(String(result.carbs));
      setFatText(String(result.fat));
      setMessage('Objetivos guardados ✓');
    } else if (mode === 'manual' && manualValid) {
      await saveGoals({
        mode, sex: null, age: null, weight_kg: null, height_cm: null, activity: null,
        objective: null, adjust_pct: null, protein_per_kg: null, fat_pct: null,
        kcal: manualKcal, protein: manualProtein, carbs: manualCarbs, fat: manualFat,
      });
      setMessage('Objetivos guardados ✓');
    }
  }

  const canSave = mode === 'auto' ? result !== null : manualValid;
  const range = objectiveRange(objective);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View>
            <ThemedText type="subtitle">Objetivos</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Se guardan en este móvil. Aquí no hay cuentas.
            </ThemedText>
          </View>

          <Chips options={MODE_OPTIONS} value={mode} onChange={(m) => { setMode(m); setMessage(null); }} />

          {mode === 'auto' ? (
            <>
              <Section title="Tus datos">
                <Chips options={SEX_OPTIONS} value={sex} onChange={setSex} />
                <View style={styles.fields}>
                  <NumberField label="Edad" value={ageText} onChangeText={setAgeText} unit="años" />
                  <NumberField label="Peso" value={weightText} onChangeText={setWeightText} unit="kg" />
                  <NumberField label="Altura" value={heightText} onChangeText={setHeightText} unit="cm" />
                </View>
              </Section>

              <Section title="Actividad física">
                <Chips options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
              </Section>

              <Section title="Objetivo">
                <Chips options={OBJECTIVE_OPTIONS} value={objective} onChange={selectObjective} />
                {range ? (
                  <Stepper
                    label={objective === 'lose' ? 'Déficit' : 'Superávit'}
                    hint={`Entre ${range.min} % y ${range.max} %`}
                    valueText={`${adjustPercent} %`}
                    onMinus={() => setAdjustPercent((v) => clamp(v - 5, range.min, range.max))}
                    onPlus={() => setAdjustPercent((v) => clamp(v + 5, range.min, range.max))}
                  />
                ) : null}
              </Section>

              <Section title="Reparto de macros">
                <Stepper
                  label="Proteína"
                  hint={`Entre ${PROTEIN_PER_KG.min} y ${PROTEIN_PER_KG.max} g por kg`}
                  valueText={`${proteinPerKg.toFixed(1)} g/kg`}
                  onMinus={() => setProteinPerKg((v) => clamp(Math.round((v - 0.1) * 10) / 10, PROTEIN_PER_KG.min, PROTEIN_PER_KG.max))}
                  onPlus={() => setProteinPerKg((v) => clamp(Math.round((v + 0.1) * 10) / 10, PROTEIN_PER_KG.min, PROTEIN_PER_KG.max))}
                />
                <Stepper
                  label="Grasa"
                  hint={`Entre ${FAT_PERCENT.min} % y ${FAT_PERCENT.max} % de las calorías`}
                  valueText={`${fatPercent} %`}
                  onMinus={() => setFatPercent((v) => clamp(v - 1, FAT_PERCENT.min, FAT_PERCENT.max))}
                  onPlus={() => setFatPercent((v) => clamp(v + 1, FAT_PERCENT.min, FAT_PERCENT.max))}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Los carbohidratos son lo que sobra tras la proteína y la grasa.
                </ThemedText>
              </Section>

              {result ? (
                <LinearGradient colors={AccentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultCard}>
                  <ThemedText type="smallBold" style={styles.onAccentMuted}>
                    TU OBJETIVO DIARIO
                  </ThemedText>
                  <View style={styles.kcalRow}>
                    <ThemedText style={styles.kcalValue}>{result.kcal}</ThemedText>
                    <ThemedText style={styles.onAccentMuted}>kcal</ThemedText>
                  </View>
                  <MacroPills protein={result.protein} carbs={result.carbs} fat={result.fat} textColor="#ffffff" />
                  <ThemedText type="small" style={styles.onAccentMuted}>
                    Metabolismo basal {result.bmr} kcal · gasto total {result.tdee} kcal
                  </ThemedText>
                  {result.caloriesTooLow ? (
                    <ThemedText type="small" style={styles.warning}>
                      ⚠️ La proteína y la grasa ya superan tus calorías. Prueba con menos déficit o menos proteína.
                    </ThemedText>
                  ) : null}
                </LinearGradient>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Rellena edad, peso y altura para ver tu objetivo.
                </ThemedText>
              )}
            </>
          ) : (
            <Section title="Tus objetivos diarios">
              <View style={styles.fields}>
                <NumberField label="Calorías" value={kcalText} onChangeText={setKcalText} unit="kcal" />
                <NumberField label="Proteínas" value={proteinText} onChangeText={setProteinText} unit="g" />
              </View>
              <View style={styles.fields}>
                <NumberField label="Carbohidratos" value={carbsText} onChangeText={setCarbsText} unit="g" />
                <NumberField label="Grasas" value={fatText} onChangeText={setFatText} unit="g" />
              </View>
              {manualValid ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Con esos macros salen {Math.round(manualProtein * 4 + manualCarbs * 4 + manualFat * 9)} kcal.
                </ThemedText>
              ) : null}
            </Section>
          )}

          <Button label="Guardar objetivos" onPress={save} disabled={!canSave} />
          {message ? (
            <ThemedText type="small" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: 700 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  resultCard: { borderRadius: 28, padding: Spacing.four, gap: Spacing.two },
  onAccentMuted: { color: 'rgba(255,255,255,0.8)' },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  kcalValue: { color: '#ffffff', fontSize: 52, lineHeight: 58, fontWeight: 700, letterSpacing: -1 },
  warning: { color: '#FFE3A3' },
  message: { color: Accent, textAlign: 'center' },
});
