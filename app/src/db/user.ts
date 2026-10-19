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

const USER_DB_VERSION = 3;

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
