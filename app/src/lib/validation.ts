/**
 * Reglas del formato de datos de la app. Son las mismas que usa el pipeline para foods.db:
 * valores por 100 g, kcal entre 0 y 900, macros que no suman más de 100 g, nombres de 3 a 100
 * letras, y los campos opcionales (azúcares, fibra, sal) pueden ser null pero nunca imposibles.
 *
 * Solo funciones puras: sirven para el formulario de alimentos propios y para validar copias
 * de seguridad antes de importarlas.
 */

import { isValidISODate } from '@/lib/dates';

export const MEAL_KEYS = ['desayuno', 'comida', 'snacks', 'merienda', 'cena'] as const;
export type MealKey = (typeof MEAL_KEYS)[number];

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_APP_ID = 'calorie-tracker';

export const LIMITS = {
  KCAL_MAX: 900,
  NAME_MIN: 3,
  NAME_MAX: 100,
  // En foods.db hay marcas de hasta 134 caracteres (listas de empresas); con 200 caben todas
  BRAND_MAX: 200,
  GRAMS_MAX: 10000,
  GOAL_KCAL_MAX: 10000,
  GOAL_MACRO_MAX: 2000,
} as const;

/** Alimento propio. Todos los valores nutricionales son por 100 g. */
export type CustomFoodInput = {
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars: number | null;
  fiber: number | null;
  salt: number | null;
};

/** Comida registrada. Los valores son los de la cantidad tomada (no por 100 g). */
export type EntryInput = {
  date: string;
  meal: MealKey;
  food_source: 'db' | 'custom';
  food_name: string;
  food_brand: string | null;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars: number | null;
  fiber: number | null;
  salt: number | null;
};

/** Alimento favorito: copia de sus valores por 100 g y de dónde venía. */
export type FavoriteInput = CustomFoodInput & { source: 'db' | 'custom' };

export type GoalsInput = {
  mode: 'auto' | 'manual';
  sex: 'male' | 'female' | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity: 'sedentary' | 'light' | 'moderate' | 'high' | null;
  objective: 'lose' | 'maintain' | 'gain' | null;
  adjust_pct: number | null;
  protein_per_kg: number | null;
  fat_pct: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Backup = {
  app: typeof BACKUP_APP_ID;
  format_version: number;
  exported_at: string;
  custom_foods: CustomFoodInput[];
  favorites: FavoriteInput[];
  entries: EntryInput[];
  goals: GoalsInput | null;
};

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// ---------------------------------------------------------------- utilidades

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const round1 = (n: number) => Math.round(n * 10) / 10;

function readNumber(v: unknown, path: string, min: number, max: number, errors: string[]): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    errors.push(`${path}: tiene que ser un número`);
    return null;
  }
  if (v < min || v > max) {
    errors.push(`${path}: tiene que estar entre ${min} y ${max} (es ${v})`);
    return null;
  }
  return v;
}

/** Opcional: undefined o null -> null. Si hay valor, debe cumplir el rango. */
function readOptionalNumber(v: unknown, path: string, min: number, max: number, errors: string[]): number | null {
  if (v === undefined || v === null) return null;
  return readNumber(v, path, min, max, errors);
}

function readText(v: unknown, path: string, min: number, max: number, errors: string[]): string | null {
  if (typeof v !== 'string') {
    errors.push(`${path}: tiene que ser un texto`);
    return null;
  }
  const clean = v.trim().replace(/\s+/g, ' ');
  if (clean.length < min || clean.length > max) {
    errors.push(`${path}: tiene que tener entre ${min} y ${max} caracteres`);
    return null;
  }
  return clean;
}

function readOptionalText(v: unknown, path: string, max: number, errors: string[]): string | null {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return null;
  return readText(v, path, 1, max, errors);
}

function readEnum<T extends string>(v: unknown, path: string, allowed: readonly T[], errors: string[]): T | null {
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
  errors.push(`${path}: tiene que ser uno de ${allowed.join(', ')}`);
  return null;
}

function readOptionalEnum<T extends string>(v: unknown, path: string, allowed: readonly T[], errors: string[]): T | null {
  if (v === undefined || v === null) return null;
  return readEnum(v, path, allowed, errors);
}

// ---------------------------------------------------------------- alimentos propios

/**
 * `lenient` es para los favoritos: sus valores por 100 g se calculan a partir de registros ya
 * redondeados, así que pueden desviarse unas décimas; se admite un margen en la suma de macros y
 * no se comprueba azúcares frente a carbohidratos.
 */
export function validateCustomFood(
  raw: unknown,
  path = 'alimento',
  lenient = false,
): ValidationResult<CustomFoodInput> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: [`${path}: tiene que ser un objeto`] };

  const name = readText(raw.name, `${path}.name`, LIMITS.NAME_MIN, LIMITS.NAME_MAX, errors);
  const brand = readOptionalText(raw.brand, `${path}.brand`, LIMITS.BRAND_MAX, errors);
  const kcal = readNumber(raw.kcal, `${path}.kcal`, 0, LIMITS.KCAL_MAX, errors);
  const protein = readNumber(raw.protein, `${path}.protein`, 0, 100, errors);
  const carbs = readNumber(raw.carbs, `${path}.carbs`, 0, 100, errors);
  const fat = readNumber(raw.fat, `${path}.fat`, 0, 100, errors);
  const sugars = readOptionalNumber(raw.sugars, `${path}.sugars`, 0, 100, errors);
  const fiber = readOptionalNumber(raw.fiber, `${path}.fiber`, 0, 100, errors);
  const salt = readOptionalNumber(raw.salt, `${path}.salt`, 0, 100, errors);

  if (protein !== null && carbs !== null && fat !== null && protein + carbs + fat > (lenient ? 105 : 100.05)) {
    errors.push(`${path}: proteínas + carbohidratos + grasas no pueden sumar más de 100 g por cada 100 g`);
  }
  if (!lenient && sugars !== null && carbs !== null && sugars > carbs) {
    errors.push(`${path}.sugars: los azúcares no pueden superar a los carbohidratos`);
  }

  if (errors.length > 0 || name === null || kcal === null || protein === null || carbs === null || fat === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      name, brand, kcal: round1(kcal), protein: round1(protein), carbs: round1(carbs), fat: round1(fat),
      sugars: sugars === null ? null : round1(sugars),
      fiber: fiber === null ? null : round1(fiber),
      salt: salt === null ? null : round1(salt),
    },
  };
}

export function validateFavorite(raw: unknown, path = 'favorito'): ValidationResult<FavoriteInput> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: [`${path}: tiene que ser un objeto`] };
  const source = readEnum(raw.source, `${path}.source`, ['db', 'custom'] as const, errors);
  const food = validateCustomFood(raw, path, true);
  if (!food.ok) errors.push(...food.errors);
  if (errors.length > 0 || source === null || !food.ok) return { ok: false, errors };
  return { ok: true, data: { ...food.data, source } };
}

// ---------------------------------------------------------------- registros del diario

export function validateEntry(raw: unknown, path = 'registro'): ValidationResult<EntryInput> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: [`${path}: tiene que ser un objeto`] };

  let date: string | null = null;
  if (typeof raw.date === 'string' && isValidISODate(raw.date)) date = raw.date;
  else errors.push(`${path}.date: tiene que ser una fecha real con formato AAAA-MM-DD`);

  const meal = readEnum(raw.meal, `${path}.meal`, MEAL_KEYS, errors);
  const source = readEnum(raw.food_source, `${path}.food_source`, ['db', 'custom'] as const, errors);
  const name = readText(raw.food_name, `${path}.food_name`, 1, LIMITS.NAME_MAX, errors);
  const brand = readOptionalText(raw.food_brand, `${path}.food_brand`, LIMITS.BRAND_MAX, errors);
  const grams = readNumber(raw.grams, `${path}.grams`, 0.1, LIMITS.GRAMS_MAX, errors);

  // Con los gramos conocidos, los valores no pueden superar lo que pesa la ración
  const cap = grams ?? LIMITS.GRAMS_MAX;
  const kcal = readNumber(raw.kcal, `${path}.kcal`, 0, cap * 9 + 1, errors);
  const protein = readNumber(raw.protein, `${path}.protein`, 0, cap, errors);
  const carbs = readNumber(raw.carbs, `${path}.carbs`, 0, cap, errors);
  const fat = readNumber(raw.fat, `${path}.fat`, 0, cap, errors);
  const sugars = readOptionalNumber(raw.sugars, `${path}.sugars`, 0, cap, errors);
  const fiber = readOptionalNumber(raw.fiber, `${path}.fiber`, 0, cap, errors);
  const salt = readOptionalNumber(raw.salt, `${path}.salt`, 0, cap, errors);

  if (grams !== null && protein !== null && carbs !== null && fat !== null && protein + carbs + fat > grams + 0.5) {
    errors.push(`${path}: proteínas + carbohidratos + grasas (${round1(protein + carbs + fat)} g) superan los ${grams} g de la ración`);
  }

  if (
    errors.length > 0 || date === null || meal === null || source === null || name === null ||
    grams === null || kcal === null || protein === null || carbs === null || fat === null
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      date, meal, food_source: source, food_name: name, food_brand: brand, grams, kcal, protein, carbs, fat,
      sugars, fiber, salt,
    },
  };
}

// ---------------------------------------------------------------- objetivos

export function validateGoals(raw: unknown, path = 'goals'): ValidationResult<GoalsInput> {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: [`${path}: tiene que ser un objeto`] };

  const mode = readEnum(raw.mode, `${path}.mode`, ['auto', 'manual'] as const, errors);
  const sex = readOptionalEnum(raw.sex, `${path}.sex`, ['male', 'female'] as const, errors);
  const activity = readOptionalEnum(raw.activity, `${path}.activity`, ['sedentary', 'light', 'moderate', 'high'] as const, errors);
  const objective = readOptionalEnum(raw.objective, `${path}.objective`, ['lose', 'maintain', 'gain'] as const, errors);
  const age = readOptionalNumber(raw.age, `${path}.age`, 1, 119, errors);
  const weight = readOptionalNumber(raw.weight_kg, `${path}.weight_kg`, 20, 400, errors);
  const height = readOptionalNumber(raw.height_cm, `${path}.height_cm`, 80, 260, errors);
  const adjust = readOptionalNumber(raw.adjust_pct, `${path}.adjust_pct`, 0, 100, errors);
  const proteinPerKg = readOptionalNumber(raw.protein_per_kg, `${path}.protein_per_kg`, 0, 10, errors);
  const fatPct = readOptionalNumber(raw.fat_pct, `${path}.fat_pct`, 0, 100, errors);
  const kcal = readNumber(raw.kcal, `${path}.kcal`, 1, LIMITS.GOAL_KCAL_MAX, errors);
  const protein = readNumber(raw.protein, `${path}.protein`, 0, LIMITS.GOAL_MACRO_MAX, errors);
  const carbs = readNumber(raw.carbs, `${path}.carbs`, 0, LIMITS.GOAL_MACRO_MAX, errors);
  const fat = readNumber(raw.fat, `${path}.fat`, 0, LIMITS.GOAL_MACRO_MAX, errors);

  if (errors.length > 0 || mode === null || kcal === null || protein === null || carbs === null || fat === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      mode, sex, age, weight_kg: weight, height_cm: height, activity, objective, adjust_pct: adjust,
      protein_per_kg: proteinPerKg, fat_pct: fatPct, kcal, protein, carbs, fat,
    },
  };
}

// ---------------------------------------------------------------- copia de seguridad completa

/**
 * Comprueba un archivo de copia de seguridad entero. Todo o nada: si algo no cumple el formato,
 * devuelve la lista de errores y no se importa nada.
 */
export function validateBackup(raw: unknown): ValidationResult<Backup> {
  if (!isObj(raw)) return { ok: false, errors: ['El archivo no es una copia de seguridad (se esperaba un objeto JSON).'] };

  if (raw.app !== BACKUP_APP_ID) {
    return { ok: false, errors: [`Este archivo no es de esta app (app debería ser "${BACKUP_APP_ID}").`] };
  }
  if (typeof raw.format_version !== 'number' || !Number.isInteger(raw.format_version)) {
    return { ok: false, errors: ['Falta format_version o no es un número entero.'] };
  }
  if (raw.format_version > BACKUP_FORMAT_VERSION) {
    return { ok: false, errors: [`El archivo es de una versión más nueva (${raw.format_version}). Actualiza la app para importarlo.`] };
  }

  const errors: string[] = [];
  const customFoods: CustomFoodInput[] = [];
  const favorites: FavoriteInput[] = [];
  const entries: EntryInput[] = [];
  let goals: GoalsInput | null = null;

  if (!Array.isArray(raw.custom_foods)) errors.push('custom_foods: tiene que ser una lista');
  else {
    raw.custom_foods.forEach((item, i) => {
      const r = validateCustomFood(item, `custom_foods[${i}]`);
      if (r.ok) customFoods.push(r.data);
      else errors.push(...r.errors);
    });
  }

  // favorites es opcional: las copias antiguas no lo traen
  if (raw.favorites !== undefined && raw.favorites !== null) {
    if (!Array.isArray(raw.favorites)) errors.push('favorites: tiene que ser una lista');
    else {
      raw.favorites.forEach((item, i) => {
        const r = validateFavorite(item, `favorites[${i}]`);
        if (r.ok) favorites.push(r.data);
        else errors.push(...r.errors);
      });
    }
  }

  if (!Array.isArray(raw.entries)) errors.push('entries: tiene que ser una lista');
  else {
    raw.entries.forEach((item, i) => {
      const r = validateEntry(item, `entries[${i}]`);
      if (r.ok) entries.push(r.data);
      else errors.push(...r.errors);
    });
  }

  if (raw.goals !== undefined && raw.goals !== null) {
    const r = validateGoals(raw.goals, 'goals');
    if (r.ok) goals = r.data;
    else errors.push(...r.errors);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      app: BACKUP_APP_ID,
      format_version: raw.format_version,
      exported_at: typeof raw.exported_at === 'string' ? raw.exported_at : '',
      custom_foods: customFoods,
      favorites,
      entries,
      goals,
    },
  };
}
