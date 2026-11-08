/** Cálculo de objetivos con la fórmula de Mifflin-St Jeor. Sin dependencias: solo funciones puras. */

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'high';
export type Objective = 'lose' | 'maintain' | 'gain';

export const SEX_OPTIONS: { key: Sex; label: string }[] = [
  { key: 'male', label: 'Hombre' },
  { key: 'female', label: 'Mujer' },
];

export const ACTIVITY_OPTIONS: { key: Activity; label: string; description: string; factor: number }[] = [
  { key: 'sedentary', label: 'Sedentario', description: 'Sin ejercicio', factor: 1.2 },
  { key: 'light', label: 'Ligera', description: '1-3 días/semana', factor: 1.375 },
  { key: 'moderate', label: 'Moderada', description: '3-5 días/semana', factor: 1.55 },
  { key: 'high', label: 'Alta', description: '6-7 días/semana', factor: 1.725 },
];

/** Porcentaje de déficit/superávit permitido y valor por defecto (en %). */
export const OBJECTIVE_OPTIONS: {
  key: Objective;
  label: string;
  /** null = no hay ajuste (mantenimiento) */
  range: { min: number; max: number; default: number } | null;
}[] = [
  { key: 'lose', label: 'Perder grasa', range: { min: 15, max: 25, default: 20 } },
  { key: 'maintain', label: 'Mantener', range: null },
  { key: 'gain', label: 'Ganar músculo', range: { min: 10, max: 20, default: 15 } },
];

export const PROTEIN_PER_KG = { min: 1.6, max: 2.2, default: 1.8 };
export const FAT_PERCENT = { min: 20, max: 30, default: 25 };

export type CalcInput = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: Activity;
  objective: Objective;
  /** % de déficit o superávit; se ignora en mantenimiento */
  adjustPercent: number;
  proteinPerKg: number;
  /** % de las calorías totales que vienen de la grasa */
  fatPercent: number;
};

export type CalcResult = {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** true si proteína + grasa ya superan las calorías objetivo (los carbohidratos quedan en 0) */
  caloriesTooLow: boolean;
};

/** Tasa metabólica basal (kcal/día en reposo). */
export function calculateBmr(sex: Sex, age: number, weightKg: number, heightCm: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calculateGoals(input: CalcInput): CalcResult {
  const bmr = calculateBmr(input.sex, input.age, input.weightKg, input.heightCm);
  const factor = ACTIVITY_OPTIONS.find((a) => a.key === input.activity)!.factor;
  const tdee = bmr * factor;

  let kcal = tdee;
  if (input.objective === 'lose') kcal = tdee * (1 - input.adjustPercent / 100);
  if (input.objective === 'gain') kcal = tdee * (1 + input.adjustPercent / 100);
  kcal = Math.round(kcal);

  const protein = Math.round(input.proteinPerKg * input.weightKg);
  const fat = Math.round((kcal * input.fatPercent) / 100 / 9);
  const carbsRaw = (kcal - protein * 4 - fat * 9) / 4;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    protein,
    fat,
    carbs: Math.max(0, Math.round(carbsRaw)),
    caloriesTooLow: carbsRaw < 0,
  };
}

/** Lee un número escrito por el usuario (acepta coma decimal). Devuelve null si no es válido. */
export function parseNumber(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
}

/** Los datos con los que se calcularon unos objetivos "automáticos" (lo que guarda la tabla goals). */
export type StoredProfile = {
  sex: Sex | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity: Activity | null;
  objective: Objective | null;
  adjust_pct: number | null;
  protein_per_kg: number | null;
  fat_pct: number | null;
};

/** Diferencia de peso (kg) a partir de la cual los objetivos calculados se consideran desfasados. */
export const WEIGHT_DRIFT_KG = 1;

/** true si los objetivos se calcularon con un peso que ya no es el actual (por 1 kg o más). */
export function goalsOutdated(calculatedWithKg: number | null, currentKg: number): boolean {
  return calculatedWithKg !== null && Math.abs(currentKg - calculatedWithKg) >= WEIGHT_DRIFT_KG - 1e-9;
}

/**
 * Vuelve a calcular unos objetivos con un peso nuevo, conservando el resto de datos (sexo, edad,
 * altura, actividad, objetivo y reparto). null si faltan datos, es decir, si no eran automáticos.
 */
export function recalculateWithWeight(p: StoredProfile, weightKg: number): CalcResult | null {
  if (
    p.sex === null || p.age === null || p.height_cm === null || p.activity === null ||
    p.objective === null || p.protein_per_kg === null || p.fat_pct === null
  ) {
    return null;
  }
  return calculateGoals({
    sex: p.sex,
    age: p.age,
    weightKg,
    heightCm: p.height_cm,
    activity: p.activity,
    objective: p.objective,
    adjustPercent: p.adjust_pct ?? 0,
    proteinPerKg: p.protein_per_kg,
    fatPercent: p.fat_pct,
  });
}
