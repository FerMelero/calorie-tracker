import { describe, expect, it } from 'vitest';

import { LIMITS, validateBackup, validateCustomFood, validateEntry, validateGoals } from '@/lib/validation';

const food = (over: Record<string, unknown> = {}) => ({
  name: 'Granola casera', kcal: 450, protein: 10, carbs: 60, fat: 15, ...over,
});

const entry = (over: Record<string, unknown> = {}) => ({
  date: '2026-10-18', meal: 'desayuno', food_source: 'custom', food_name: 'Granola casera', food_brand: null,
  grams: 50, kcal: 225, protein: 5, carbs: 30, fat: 7.5, sugars: 6, fiber: null, salt: 0.1, ...over,
});

const backup = (over: Record<string, unknown> = {}) => ({
  app: 'calorie-tracker', format_version: 1, custom_foods: [], entries: [], goals: null, ...over,
});

const errorsOf = (r: { ok: boolean; errors?: string[] }) => (r.ok ? [] : (r.errors ?? []));

describe('validateCustomFood (valores por 100 g)', () => {
  it('acepta un alimento correcto y deja los opcionales a null', () => {
    const r = validateCustomFood(food());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ brand: null, barcode: null, sugars: null, fiber: null, salt: null });
  });

  it('rechaza kcal fuera de 0-900', () => {
    expect(validateCustomFood(food({ kcal: 901 })).ok).toBe(false);
    expect(validateCustomFood(food({ kcal: -1 })).ok).toBe(false);
    expect(validateCustomFood(food({ kcal: 900 })).ok).toBe(true);
  });

  it('rechaza macros que suman más de 100 g por 100 g', () => {
    expect(validateCustomFood(food({ protein: 60, carbs: 60, fat: 5 })).ok).toBe(false);
  });

  it('rechaza azúcares mayores que los carbohidratos', () => {
    expect(validateCustomFood(food({ sugars: 70 })).ok).toBe(false);
  });

  it('exige un nombre de 3 a 100 caracteres', () => {
    expect(validateCustomFood(food({ name: 'ab' })).ok).toBe(false);
    expect(validateCustomFood(food({ name: 'a'.repeat(101) })).ok).toBe(false);
  });

  it('admite marcas largas como las de foods.db (hasta 200) y rechaza más', () => {
    expect(validateCustomFood(food({ brand: 'x'.repeat(134) })).ok).toBe(true);
    expect(validateCustomFood(food({ brand: 'x'.repeat(201) })).ok).toBe(false);
  });

  it('valida el código de barras: opcional, solo dígitos, 6 a 14', () => {
    for (const ok of [undefined, null, '', '8480000123456', '  8480000123456  ']) {
      expect(validateCustomFood(food({ barcode: ok })).ok).toBe(true);
    }
    for (const bad of ['123', '84800001234567890', '84800abc', 8480000123456]) {
      expect(validateCustomFood(food({ barcode: bad })).ok).toBe(false);
    }
    const r = validateCustomFood(food({ barcode: '  8480000123456 ' }));
    if (r.ok) expect(r.data.barcode).toBe('8480000123456');
  });
});

describe('validateEntry (registros del diario)', () => {
  it('acepta un registro correcto', () => {
    expect(validateEntry(entry()).ok).toBe(true);
  });

  it('rechaza fechas que no existen', () => {
    expect(validateEntry(entry({ date: '2026-02-31' })).ok).toBe(false);
    expect(validateEntry(entry({ date: '18/10/2026' })).ok).toBe(false);
  });

  it('rechaza franjas que no son una de las cinco', () => {
    expect(validateEntry(entry({ meal: 'brunch' })).ok).toBe(false);
    for (const meal of ['desayuno', 'comida', 'snacks', 'merienda', 'cena']) {
      expect(validateEntry(entry({ meal })).ok).toBe(true);
    }
  });

  it('limita los gramos a 0,1 - 10 000 (el mismo rango que debe aplicar la ventana de añadir)', () => {
    expect(validateEntry(entry({ grams: 0.05 })).ok).toBe(false);
    expect(validateEntry(entry({ grams: 0.1, kcal: 1, protein: 0, carbs: 0.1, fat: 0, sugars: null })).ok).toBe(true);
    expect(validateEntry(entry({ grams: LIMITS.GRAMS_MAX + 1 })).ok).toBe(false);
  });

  it('los macros no pueden pesar más que la ración', () => {
    expect(validateEntry(entry({ grams: 10, protein: 8, carbs: 8, fat: 1, kcal: 70 })).ok).toBe(false);
  });
});

describe('validateGoals', () => {
  it('acepta objetivos manuales y rechaza kcal que no es un número', () => {
    expect(validateGoals({ mode: 'manual', kcal: 2000, protein: 120, carbs: 220, fat: 60 }).ok).toBe(true);
    expect(validateGoals({ mode: 'manual', kcal: 'mucho', protein: 1, carbs: 1, fat: 1 }).ok).toBe(false);
  });
});

describe('validateBackup (archivo completo)', () => {
  it('acepta una copia sin favoritos (formato antiguo)', () => {
    expect(validateBackup(backup()).ok).toBe(true);
  });

  it('acepta una copia completa', () => {
    const r = validateBackup(backup({
      custom_foods: [food()],
      entries: [entry()],
      favorites: [{ source: 'db', name: 'Yogur natural', kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 }],
      goals: { mode: 'manual', kcal: 2000, protein: 120, carbs: 220, fat: 60 },
    }));
    expect(r.ok).toBe(true);
  });

  it('rechaza archivos de otra app o de una versión más nueva', () => {
    expect(validateBackup({ app: 'otra' }).ok).toBe(false);
    expect(errorsOf(validateBackup(backup({ format_version: 9 })))[0]).toMatch(/más nueva/);
  });

  it('todo o nada: un solo registro malo hace fallar la copia y dice cuál', () => {
    const r = validateBackup(backup({ entries: [entry(), entry({ date: '2026-02-31' })] }));
    expect(r.ok).toBe(false);
    expect(errorsOf(r).join('\n')).toContain('entries[1].date');
  });

  it('en favoritos tolera el redondeo (macros sumando 102) pero no en alimentos propios', () => {
    const redondeado = { name: 'Aceite de oliva', kcal: 899, protein: 0, carbs: 2, fat: 100 };
    expect(validateBackup(backup({ favorites: [{ source: 'db', ...redondeado }] })).ok).toBe(true);
    expect(validateBackup(backup({ custom_foods: [redondeado] })).ok).toBe(false);
  });

  it('rechaza un favorito con origen desconocido', () => {
    expect(validateBackup(backup({ favorites: [{ source: 'otro', ...food() }] })).ok).toBe(false);
  });
});
