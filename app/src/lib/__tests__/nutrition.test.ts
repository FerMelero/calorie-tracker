import { describe, expect, it } from 'vitest';

import { calculateBmr, calculateGoals, parseNumber, type CalcInput } from '@/lib/nutrition';

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
