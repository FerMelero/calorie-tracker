/**
 * Cálculos de las gráficas de progreso (comida y peso). Sin dependencias de Expo, para poder
 * probarlos: las gráficas solo dibujan lo que sale de aquí.
 *
 * Criterio de fondo: un día sin comidas registradas NO es un día de 0 calorías. Es un hueco
 * (null) y no entra en las medias; si no, olvidar apuntar un día hundiría la media.
 */

import { addDays } from '@/lib/dates';

export type DayTotals = { date: string; kcal: number; protein: number; carbs: number; fat: number };
/** Un día del periodo: con sus totales, o null si ese día no se registró nada. */
export type DayPoint = { date: string; totals: DayTotals | null };
export type WeightPoint = { date: string; kg: number };

/** Las fechas de los últimos `count` días, terminando en `endIso`, de la más antigua a la más reciente. */
export function lastDays(endIso: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endIso, i - (count - 1)));
}

/** Une las fechas del periodo con los totales que haya (los días sin registro quedan en null). */
export function fillDays(dates: string[], totals: DayTotals[]): DayPoint[] {
  const byDate = new Map(totals.map((t) => [t.date, t]));
  return dates.map((date) => ({ date, totals: byDate.get(date) ?? null }));
}

export function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

export type FoodSummary = {
  /** Días con algo registrado */
  loggedDays: number;
  totalDays: number;
  avgKcal: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  /** Días registrados en los que se pasó del objetivo (0 si no hay objetivo) */
  daysOverGoal: number;
};

/** Medias del periodo, solo con los días registrados. */
export function summarizeFood(points: DayPoint[], goalKcal: number | null): FoodSummary {
  const logged = points.flatMap((p) => (p.totals ? [p.totals] : []));
  const avg = (pick: (t: DayTotals) => number) => average(logged.map(pick));
  return {
    loggedDays: logged.length,
    totalDays: points.length,
    avgKcal: avg((t) => t.kcal),
    avgProtein: avg((t) => t.protein),
    avgCarbs: avg((t) => t.carbs),
    avgFat: avg((t) => t.fat),
    daysOverGoal: goalKcal === null ? 0 : logged.filter((t) => t.kcal > goalKcal).length,
  };
}

/**
 * Qué parte de las calorías viene de cada macro (proteína y carbohidratos 4 kcal/g, grasa 9 kcal/g),
 * en porcentajes enteros que suman exactamente 100. null si no hay nada.
 */
export function macroCaloriePercent(
  protein: number,
  carbs: number,
  fat: number,
): { protein: number; carbs: number; fat: number } | null {
  const kcal = [protein * 4, carbs * 4, fat * 9];
  const total = kcal.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const exact = kcal.map((k) => (k / total) * 100);
  const floors = exact.map(Math.floor);
  // Reparte los puntos que faltan a los que tenían más decimales (método del mayor resto)
  let missing = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, rest: v - floors[i] })).sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (missing === 0) break;
    floors[i] += 1;
    missing -= 1;
  }
  return { protein: floors[0], carbs: floors[1], fat: floors[2] };
}

/**
 * Tendencia del peso: para cada día con peso, la media de los pesos de los últimos `window` días
 * naturales (él incluido). El peso de un día sube y baja por agua, comida y hora; la tendencia es
 * lo que de verdad se mueve.
 */
export function weightTrend(points: WeightPoint[], window = 7): WeightPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const from = addDays(p.date, -(window - 1));
    const inWindow = sorted.filter((q) => q.date >= from && q.date <= p.date);
    return { date: p.date, kg: Math.round((average(inWindow.map((q) => q.kg)) ?? p.kg) * 10) / 10 };
  });
}

/** Cambio de peso entre el primer y el último registro del periodo; null con menos de dos. */
export function weightChange(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return Math.round((sorted[sorted.length - 1].kg - sorted[0].kg) * 10) / 10;
}

// ---------------------------------------------------------------- escalas de los ejes

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10];

/** Redondea hacia arriba a un número "bonito" para el eje: 1850 → 2000, 2350 → 2500, 3100 → 3500. */
export function niceCeil(value: number): number {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = NICE_STEPS.find((s) => normalized <= s + 1e-9) ?? 10;
  return step * magnitude;
}

/** Límites del eje del peso: un poco de aire por arriba y por abajo, y siempre al menos 2 kg de alto. */
export function weightBounds(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 60, max: 80 };
  let min = Math.floor(Math.min(...values) - 1);
  let max = Math.ceil(Math.max(...values) + 1);
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  return { min, max };
}

/** Convierte un valor de un rango a otro (para pasar datos a coordenadas de la gráfica). */
export function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}
