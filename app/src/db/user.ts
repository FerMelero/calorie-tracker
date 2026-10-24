import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { Food } from '@/db/search';
import type { MealKey } from '@/lib/validation';

export type { MealKey };

export const MEALS = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'comida', label: 'Comida' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'merienda', label: 'Merienda' },
  { key: 'cena', label: 'Cena' },
] as const;


/**
 * Una comida registrada. Los nutrientes son los de la cantidad tomada (no por 100 g) y se
 * guardan copiados: si el alimento cambia en foods.db, el historial no se altera.
 * sugars, fiber y salt son null cuando el alimento no tenía ese dato.
 */
export type Entry = {
  id: number;
  date: string;
  meal: MealKey;
  food_id: number;
  /** 'db' = viene de foods.db; 'custom' = alimento propio del usuario */
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

const USER_DB_VERSION = 4;

let db: SQLiteDatabase | null = null;

/** user.db es independiente de foods.db: actualizar los alimentos nunca borra tu diario. */
export function getUserDb(): SQLiteDatabase {
  if (db) return db;
  db = openDatabaseSync('user.db');
  migrate(db);
  return db;
}

function migrate(database: SQLiteDatabase) {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= USER_DB_VERSION) return;

  if (current < 1) {
    database.execSync(`
      CREATE TABLE entries (
        id         INTEGER PRIMARY KEY,
        date       TEXT NOT NULL,
        meal       TEXT NOT NULL,
        food_id    INTEGER NOT NULL,
        food_name  TEXT NOT NULL,
        food_brand TEXT,
        grams      REAL NOT NULL,
        kcal       REAL NOT NULL,
        protein    REAL NOT NULL,
        carbs      REAL NOT NULL,
        fat        REAL NOT NULL,
        sugars     REAL,
        fiber      REAL,
        salt       REAL
      );
      CREATE INDEX entries_date ON entries (date);
    `);
  }
  if (current < 2) {
    // Una sola fila (id = 1): los objetivos de quien usa este móvil
    database.execSync(`
      CREATE TABLE goals (
        id            INTEGER PRIMARY KEY CHECK (id = 1),
        mode          TEXT NOT NULL,
        sex           TEXT,
        age           REAL,
        weight_kg     REAL,
        height_cm     REAL,
        activity      TEXT,
        objective     TEXT,
        adjust_pct    REAL,
        protein_per_kg REAL,
        fat_pct       REAL,
        kcal          REAL NOT NULL,
        protein       REAL NOT NULL,
        carbs         REAL NOT NULL,
        fat           REAL NOT NULL
      );
    `);
  }
  if (current < 3) {
    database.execSync(`
      -- Alimentos propios: valores por 100 g, mismas reglas que foods.db
      CREATE TABLE custom_foods (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        brand       TEXT,
        kcal        REAL NOT NULL,
        protein     REAL NOT NULL,
        carbs       REAL NOT NULL,
        fat         REAL NOT NULL,
        sugars      REAL,
        fiber       REAL,
        salt        REAL,
        search_text TEXT NOT NULL
      );
      ALTER TABLE entries ADD COLUMN food_source TEXT NOT NULL DEFAULT 'db';
    `);
  }
  if (current < 4) {
    database.execSync(`
      -- Favoritos: copia de los valores por 100 g, así no dependen de que foods.db cambie
      CREATE TABLE favorites (
        id        INTEGER PRIMARY KEY,
        key       TEXT NOT NULL UNIQUE,
        source    TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        name      TEXT NOT NULL,
        brand     TEXT,
        kcal      REAL NOT NULL,
        protein   REAL NOT NULL,
        carbs     REAL NOT NULL,
        fat       REAL NOT NULL,
        sugars    REAL,
        fiber     REAL,
        salt      REAL
      );
    `);
  }
  database.execSync(`PRAGMA user_version = ${USER_DB_VERSION}`);
}

/** Fecha local en formato YYYY-MM-DD (no UTC, para que el día cambie a medianoche local). */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Valor por 100 g -> valor para la cantidad tomada. null se mantiene null. */
function scale(per100: number | null, grams: number): number | null {
  if (per100 === null) return null;
  return Math.round(((per100 * grams) / 100) * 10) / 10;
}

export async function addEntry(food: Food, meal: MealKey, grams: number, date = todayISO()) {
  await getUserDb().runAsync(
    `INSERT INTO entries
       (date, meal, food_id, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat, sugars, fiber, salt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      date,
      meal,
      food.id,
      food.source,
      food.name,
      food.brand,
      grams,
      scale(food.kcal, grams),
      scale(food.protein, grams),
      scale(food.carbs, grams),
      scale(food.fat, grams),
      scale(food.sugars, grams),
      scale(food.fiber, grams),
      scale(food.salt, grams),
    ],
  );
}

export function getEntries(date: string): Promise<Entry[]> {
  return getUserDb().getAllAsync<Entry>('SELECT * FROM entries WHERE date = ? ORDER BY id', [date]);
}

/**
 * Cambia los gramos y/o la franja de un registro. Los nutrientes se recalculan en proporción
 * (misma comida, otra cantidad), sin necesitar el alimento original: así funciona aunque se haya
 * borrado. Los campos opcionales que eran null siguen siendo null.
 */
export async function updateEntry(id: number, meal: MealKey, grams: number) {
  const entry = await getUserDb().getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', [id]);
  if (!entry) return;
  const factor = grams / entry.grams;
  const scaleBy = (value: number | null) =>
    value === null ? null : Math.round(value * factor * 10) / 10;

  await getUserDb().runAsync(
    `UPDATE entries SET meal = ?, grams = ?, kcal = ?, protein = ?, carbs = ?, fat = ?,
       sugars = ?, fiber = ?, salt = ? WHERE id = ?`,
    [
      meal,
      grams,
      scaleBy(entry.kcal),
      scaleBy(entry.protein),
      scaleBy(entry.carbs),
      scaleBy(entry.fat),
      scaleBy(entry.sugars),
      scaleBy(entry.fiber),
      scaleBy(entry.salt),
      id,
    ],
  );
}

export async function deleteEntry(id: number) {
  await getUserDb().runAsync('DELETE FROM entries WHERE id = ?', [id]);
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

export function sumTotals(entries: Entry[]): Totals {
  const total = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  // Redondeo para evitar cosas como 0.30000000000000004
  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein * 10) / 10,
    carbs: Math.round(total.carbs * 10) / 10,
    fat: Math.round(total.fat * 10) / 10,
  };
}

export type DaySummary = Totals & { date: string; count: number };

/** Un resumen por cada día con registros, del más reciente al más antiguo. */
export async function getDaySummaries(): Promise<DaySummary[]> {
  const rows = await getUserDb().getAllAsync<DaySummary>(
    `SELECT date, COUNT(*) AS count,
            SUM(kcal) AS kcal, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat
     FROM entries GROUP BY date ORDER BY date DESC`,
  );
  return rows.map((r) => ({
    ...r,
    kcal: Math.round(r.kcal),
    protein: Math.round(r.protein * 10) / 10,
    carbs: Math.round(r.carbs * 10) / 10,
    fat: Math.round(r.fat * 10) / 10,
  }));
}

export type RecentFood = Food & { lastGrams: number };

const per100 = (total: number | null, grams: number, max: number): number | null =>
  total === null ? null : Math.min(max, Math.round(((total * 100) / grams) * 10) / 10);

/**
 * Los alimentos que añadiste más recientemente, sin repetir, con la última cantidad usada.
 * Los valores por 100 g se deducen del registro (total ÷ gramos × 100) porque el diario guarda
 * una copia y no depende de que el alimento siga existiendo.
 */
export async function getRecentFoods(limit = 20): Promise<RecentFood[]> {
  const rows = await getUserDb().getAllAsync<Entry & { last_id: number }>(
    `SELECT food_id, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat,
            sugars, fiber, salt, MAX(id) AS last_id
     FROM entries
     GROUP BY food_source, food_name, COALESCE(food_brand, '')
     ORDER BY last_id DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.food_id,
    source: r.food_source,
    barcode: null,
    name: r.food_name,
    brand: r.food_brand,
    kcal: per100(r.kcal, r.grams, 900) ?? 0,
    protein: per100(r.protein, r.grams, 100) ?? 0,
    carbs: per100(r.carbs, r.grams, 100) ?? 0,
    fat: per100(r.fat, r.grams, 100) ?? 0,
    sugars: per100(r.sugars, r.grams, 100),
    fiber: per100(r.fiber, r.grams, 100),
    salt: per100(r.salt, r.grams, 100),
    lastGrams: r.grams,
  }));
}

/**
 * Copia los registros de un día a otro, conservando la franja. Devuelve cuántos se copiaron.
 * Solo se copian las franjas indicadas.
 */
export async function copyEntries(fromDate: string, toDate: string, meals: MealKey[]): Promise<number> {
  if (meals.length === 0) return 0;
  const marks = meals.map(() => '?').join(', ');
  const result = await getUserDb().runAsync(
    `INSERT INTO entries
       (date, meal, food_id, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat, sugars, fiber, salt)
     SELECT ?, meal, food_id, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat, sugars, fiber, salt
     FROM entries WHERE date = ? AND meal IN (${marks}) ORDER BY id`,
    [toDate, fromDate, ...meals],
  );
  return result.changes;
}
