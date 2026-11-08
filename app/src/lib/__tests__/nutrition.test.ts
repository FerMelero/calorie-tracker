import { describe, expect, it } from 'vitest';

import {
  calculateBmr,
  calculateGoals,
  goalsOutdated,
  parseNumber,
  recalculateWithWeight,
  WEIGHT_DRIFT_KG,
  type CalcInput,
  type StoredProfile,
} from '@/lib/nutrition';

const base: CalcInput = {
  sex: 'male', age: 30, weightKg: 80, heightCm: 180, activity: 'moderate',
  objective: 'lose', adjustPercent: 20, proteinPerKg: 1.8, fatPercent: 25,
};

describe('Mifflin-St Jeor', () => {
  it('calcula la TMB de un hombre y de una mujer', () => {
    expect(calculateBmr('male', 30, 80, 180)).toBe(1780); // 800 + 1125 - 150 + 5
    expect(calculateBmr('female', 25, 55, 165)).toBeCloseTo(1295.25); // 550 + 1031,25 - 125 - 161
  });

  it('aplica el factor de actividad y el déficit', () => {
    const r = calculateGoals(base);
    expect(r.bmr).toBe(1780);
    expect(r.tdee).toBe(2759); // 1780 x 1,55
    expect(r.kcal).toBe(2207); // 2759 - 20 %
  });

  it('reparte los macros: proteína por kilo, grasa por % y carbohidratos lo que sobra', () => {
    const r = calculateGoals(base);
    expect(r.protein).toBe(144); // 1,8 x 80
    expect(r.fat).toBe(61); // 25 % de 2207 kcal / 9
    expect(r.carbs).toBe(271);
    expect(r.protein * 4 + r.fat * 9 + r.carbs * 4).toBeCloseTo(r.kcal, -1);
    expect(r.caloriesTooLow).toBe(false);
  });

  it('mantenimiento no ajusta las calorías y superávit las sube', () => {
    expect(calculateGoals({ ...base, objective: 'maintain' }).kcal).toBe(2759);
    expect(calculateGoals({ ...base, objective: 'gain', adjustPercent: 10 }).kcal).toBe(3035);
  });

  it('avisa si proteína y grasa ya superan las calorías y deja los carbohidratos en 0', () => {
    // Mujer de 80 años, 90 kg, 140 cm, sedentaria, con déficit del 25 %: ~1.093 kcal, pero 2,2 g/kg de
    // proteína (792 kcal) y 30 % de grasa (328 kcal) ya suman 1.120
    const r = calculateGoals({ ...base, sex: 'female', age: 80, weightKg: 90, heightCm: 140, activity: 'sedentary', adjustPercent: 25, proteinPerKg: 2.2, fatPercent: 30 });
    expect(r.caloriesTooLow).toBe(true);
    expect(r.carbs).toBe(0);
  });
});

describe('parseNumber', () => {
  it('acepta coma decimal y rechaza lo que no es un número', () => {
    expect(parseNumber('72,5')).toBe(72.5);
    expect(parseNumber(' 80 ')).toBe(80);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('recalcular los objetivos con un peso nuevo', () => {
  // Lo que guarda la tabla goals tras calcular con el ejemplo de siempre (80 kg, déficit del 20 %)
  const perfil: StoredProfile = {
    sex: 'male', age: 30, weight_kg: 80, height_cm: 180, activity: 'moderate', objective: 'lose',
    adjust_pct: 20, protein_per_kg: 1.8, fat_pct: 25,
  };

  it('con el mismo peso da exactamente lo mismo que el cálculo original', () => {
    expect(recalculateWithWeight(perfil, 80)).toEqual(calculateGoals(base));
  });

  it('con menos peso, bajan las calorías y la proteína (que va por kilo)', () => {
    const antes = recalculateWithWeight(perfil, 80)!;
    const despues = recalculateWithWeight(perfil, 75)!;
    expect(despues.kcal).toBeLessThan(antes.kcal);
    expect(despues.protein).toBe(135); // 1,8 x 75
    expect(despues.protein).toBeLessThan(antes.protein);
  });

  it('mantenimiento no aplica ajuste aunque guarde un porcentaje', () => {
    const r = recalculateWithWeight({ ...perfil, objective: 'maintain', adjust_pct: 0 }, 80)!;
    expect(r.kcal).toBe(r.tdee);
  });

  it('si faltan datos (objetivos manuales) no se puede recalcular', () => {
    expect(recalculateWithWeight({ ...perfil, sex: null }, 80)).toBeNull();
    expect(recalculateWithWeight({ ...perfil, age: null }, 80)).toBeNull();
    expect(recalculateWithWeight({ ...perfil, height_cm: null }, 80)).toBeNull();
    expect(recalculateWithWeight({ ...perfil, activity: null }, 80)).toBeNull();
    expect(recalculateWithWeight({ ...perfil, objective: null }, 80)).toBeNull();
    expect(recalculateWithWeight({ ...perfil, protein_per_kg: null }, 80)).toBeNull();
    expect(recalculateWithWeight({ ...perfil, fat_pct: null }, 80)).toBeNull();
  });

  it('los objetivos están desfasados a partir de 1 kg de diferencia, en cualquier sentido', () => {
    expect(WEIGHT_DRIFT_KG).toBe(1);
    expect(goalsOutdated(80, 80)).toBe(false);
    expect(goalsOutdated(80, 79.1)).toBe(false); // el peso de un día sube y baja: no se avisa por ruido
    expect(goalsOutdated(80, 79)).toBe(true);
    expect(goalsOutdated(80, 81.5)).toBe(true);
    expect(goalsOutdated(null, 70)).toBe(false); // objetivos manuales: no hay con qué comparar
  });
});
