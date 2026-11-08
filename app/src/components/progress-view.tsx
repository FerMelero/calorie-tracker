import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BarChart, type AxisLabel } from '@/components/bar-chart';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Segmented } from '@/components/form-controls';
import { LineChart } from '@/components/line-chart';
import { MacroBar } from '@/components/macro-bar';
import { ThemedText } from '@/components/themed-text';
import { WeightSheet } from '@/components/weight-sheet';
import { MacroColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getGoals, saveGoals, type Goals } from '@/db/goals';
import { getDayTotalsBetween, todayISO } from '@/db/user';
import { getLatestWeight, listWeightsBetween } from '@/db/weights';
import { daysBetween, relativeDayLabel, shortDate } from '@/lib/dates';
import {
  fillDays,
  lastDays,
  macroCaloriePercent,
  summarizeFood,
  weightBounds,
  weightChange,
  weightTrend,
  type DayPoint,
} from '@/lib/progress';
import { goalsOutdated, recalculateWithWeight } from '@/lib/nutrition';
import { formatNumber } from '@/lib/serving';
import type { WeightInput } from '@/lib/validation';

type Range = '7' | '30' | '90';
const RANGES: { key: Range; label: string }[] = [
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: '90', label: '90 días' },
];

/** Etiquetas del eje horizontal: el primer día, el del medio y el último. */
function axisLabels(dates: string[]): AxisLabel[] {
  const last = dates.length - 1;
  return [0, Math.floor(last / 2), last].map((index) => ({ index, text: shortDate(dates[index]) }));
}

type Data = {
  goals: Goals | null;
  points: DayPoint[];
  weights: WeightInput[];
  latest: WeightInput | null;
};

/** Gráficas de progreso: calorías por día (con el objetivo) y peso (con su tendencia). */
export function ProgressView() {
  const theme = useTheme();
  const [range, setRange] = useState<Range>('30');
  const [data, setData] = useState<Data | null>(null);
  // Ventana de registrar/corregir peso; `sheetRun` cambia en cada apertura para que empiece limpia
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRun, setSheetRun] = useState(0);
  const [editing, setEditing] = useState<WeightInput | null>(null);

  const days = Number(range);
  const today = todayISO();
  const dates = lastDays(today, days);

  const load = useCallback(async () => {
    const period = lastDays(todayISO(), days);
    const [goals, totals, weights, latest] = await Promise.all([
      getGoals(),
      getDayTotalsBetween(period[0], period[period.length - 1]),
      listWeightsBetween(period[0], period[period.length - 1]),
      getLatestWeight(),
    ]);
    setData({ goals, points: fillDays(period, totals), weights, latest });
  }, [days]);

  // Recarga al abrir la pestaña y cada vez que cambia el periodo
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openSheet(weight: WeightInput | null) {
    setEditing(weight);
    setSheetRun((n) => n + 1);
    setSheetOpen(true);
  }

  if (!data) return null;
  const { goals, points, weights } = data;
  // El último peso registrado, aunque sea anterior al periodo que se está viendo
  const latest = data.latest;

  // Si los objetivos se calcularon con otro peso, se ofrece recalcularlos (nunca se cambian solos)
  const recalculated =
    goals && goals.mode === 'auto' && latest && goalsOutdated(goals.weight_kg, latest.kg)
      ? recalculateWithWeight(goals, latest.kg)
      : null;

  async function recalculate() {
    if (!goals || !latest || !recalculated) return;
    await saveGoals({
      ...goals,
      weight_kg: latest.kg,
      kcal: recalculated.kcal,
      protein: recalculated.protein,
      carbs: recalculated.carbs,
      fat: recalculated.fat,
    });
    await load();
  }

  const food = summarizeFood(points, goals?.kcal ?? null);
  const split = food.avgProtein !== null ? macroCaloriePercent(food.avgProtein, food.avgCarbs ?? 0, food.avgFat ?? 0) : null;
  const labels = axisLabels(dates);

  const trend = weightTrend(weights);
  const change = weightChange(weights);
  const bounds = weightBounds(weights.map((w) => w.kg));
  const index = (date: string) => daysBetween(dates[0], date);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ---------------------------------------------------------------- objetivos */}
        <Card>
          <ThemedText type="smallBold">Mis objetivos</ThemedText>
          {goals ? (
            <>
              <ThemedText style={styles.big}>
                {goals.kcal} <ThemedText themeColor="textSecondary">kcal al día</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Proteínas {goals.protein} g · Carbohidratos {goals.carbs} g · Grasas {goals.fat} g
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {goals.mode === 'auto' && goals.weight_kg !== null
                  ? `Calculados con la fórmula, con un peso de ${formatNumber(goals.weight_kg, 1)} kg.`
                  : 'Elegidos por ti.'}
              </ThemedText>

              {recalculated && latest ? (
                <View style={[styles.notice, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small">
                    Ahora pesas {formatNumber(latest.kg, 1)} kg y tus objetivos se calcularon con{' '}
                    {formatNumber(goals.weight_kg ?? 0, 1)} kg. Recalculados serían{' '}
                    <ThemedText type="smallBold">{recalculated.kcal} kcal</ThemedText> (ahora {goals.kcal}).
                  </ThemedText>
                  <Button label="Recalcular con mi peso actual" onPress={recalculate} />
                </View>
              ) : null}
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Aún no has definido tus objetivos. Con ellos, Hoy te dice cuánto te queda por comer.
            </ThemedText>
          )}
          <Button
            label={goals ? 'Cambiar mis objetivos' : 'Definir mis objetivos'}
            variant="outline"
            onPress={() => router.push('/progress/goals')}
          />
        </Card>

        <Segmented options={RANGES} value={range} onChange={setRange} />

        {/* ---------------------------------------------------------------- comida */}
        <Card>
          <ThemedText type="smallBold">Calorías</ThemedText>
          {food.loggedDays === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Aún no hay comidas registradas en estos {days} días.
            </ThemedText>
          ) : (
            <>
              <ThemedText style={styles.big}>
                {Math.round(food.avgKcal ?? 0)} <ThemedText themeColor="textSecondary">kcal de media</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {goals ? `Objetivo: ${goals.kcal} kcal · ` : ''}
                Registraste {food.loggedDays} de {food.totalDays} días
                {food.daysOverGoal > 0 ? ` · te pasaste ${food.daysOverGoal} ${food.daysOverGoal === 1 ? 'día' : 'días'}` : ''}
              </ThemedText>
              <BarChart
                bars={points.map((p) => ({ key: p.date, value: p.totals?.kcal ?? null }))}
                goal={goals?.kcal ?? null}
                xLabels={labels}
                accessibilityLabel={`Calorías de los últimos ${days} días: media de ${Math.round(food.avgKcal ?? 0)} kcal, ${food.loggedDays} días registrados.`}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Los días sin comidas registradas no cuentan en la media: salen como una marca fina.
              </ThemedText>

              {split ? (
                <View style={styles.split}>
                  <ThemedText type="smallBold">Reparto medio de las calorías</ThemedText>
                  <MacroBar protein={split.protein} carbs={split.carbs} fat={split.fat} />
                  <View style={styles.legend}>
                    <Legend color={MacroColors.protein} text={`Proteínas ${split.protein} %`} />
                    <Legend color={MacroColors.carbs} text={`Carbohidratos ${split.carbs} %`} />
                    <Legend color={MacroColors.fat} text={`Grasas ${split.fat} %`} />
                  </View>
                </View>
              ) : null}
            </>
          )}
        </Card>

        {/* ---------------------------------------------------------------- peso */}
        <Card>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold">Peso</ThemedText>
            <Button label="Registrar peso" onPress={() => openSheet(null)} />
          </View>

          {latest ? (
            <>
              <ThemedText style={styles.big}>
                {formatNumber(latest.kg, 1)} <ThemedText themeColor="textSecondary">kg</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {relativeDayLabel(latest.date, today)}
                {change !== null ? ` · ${change > 0 ? '+' : change < 0 ? '−' : ''}${formatNumber(Math.abs(change), 1)} kg en este periodo` : ''}
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Registra tu peso para ver cómo evoluciona. Se guarda solo en este móvil.
            </ThemedText>
          )}

          {weights.length > 0 ? (
            <>
              <LineChart
                total={days}
                points={weights.map((w) => ({ index: index(w.date), value: w.kg }))}
                trend={trend.map((t) => ({ index: index(t.date), value: t.kg }))}
                min={bounds.min}
                max={bounds.max}
                xLabels={labels}
                accessibilityLabel={`Peso de los últimos ${days} días: ${weights.length} registros, último ${formatNumber(weights[weights.length - 1].kg, 1)} kg.`}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Los círculos son tus pesos y la línea verde, la tendencia (media de 7 días).
              </ThemedText>

              <ThemedText type="smallBold" style={styles.listTitle}>
                Pesos de este periodo
              </ThemedText>
              {[...weights].reverse().slice(0, 8).map((w) => (
                <Pressable key={w.date} onPress={() => openSheet(w)} style={styles.weightRow} hitSlop={4}>
                  <ThemedText type="small">{relativeDayLabel(w.date, today)}</ThemedText>
                  <ThemedText type="smallBold">{formatNumber(w.kg, 1)} kg  ›</ThemedText>
                </Pressable>
              ))}
            </>
          ) : latest ? (
            <ThemedText type="small" themeColor="textSecondary">
              No hay pesos en estos {days} días.
            </ThemedText>
          ) : null}
        </Card>
      </ScrollView>

      <WeightSheet
        key={sheetRun}
        visible={sheetOpen}
        editing={editing}
        suggestedKg={latest?.kg ?? null}
        onClose={() => setSheetOpen(false)}
        onChanged={load}
      />
    </>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small">{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  big: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  split: { gap: Spacing.two, marginTop: Spacing.two },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  listTitle: { marginTop: Spacing.two },
  notice: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
