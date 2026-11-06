import type { SQLiteDatabase } from 'expo-sqlite';

import type { Food } from '@/db/search';
import { getUserDb } from '@/db/user';
import { foodKey } from '@/lib/food-key';
import type { ServingInput } from '@/lib/validation';

/** La ración de un alimento: cuántos gramos es y cómo se llama. */
export type Serving = {
  grams: number;
  /** Palabra del usuario ("bolsita"); null = "ración" */
  label: string | null;
  /** 'user' = la definió el usuario; 'db' = la trae foods.db (del fabricante) */
  origin: 'user' | 'db';
};

type Identity = Pick<Food, 'source' | 'name' | 'brand'>;

/** La ración que el usuario ha definido para este alimento, si la hay. */
export async function getUserServing(food: Identity): Promise<Serving | null> {
  const row = await getUserDb().getFirstAsync<{ grams: number; label: string | null }>(
    'SELECT grams, label FROM servings WHERE key = ?',
    [foodKey(food)],
  );
  return row ? { grams: row.grams, label: row.label, origin: 'user' } : null;
}

/**
 * La ración que se ofrece para un alimento: primero la del usuario y, si no hay, la de foods.db.
 * Los alimentos que vienen de Recientes o Favoritos guardan una copia sin ración, así que la de
 * foods.db se busca por nombre y marca.
 */
export async function resolveServing(db: SQLiteDatabase, food: Food): Promise<Serving | null> {
  const user = await getUserServing(food);
  if (user) return user;

  let grams = food.serving_g ?? null;
  if (grams === null && food.source === 'db') {
    const row = await db.getFirstAsync<{ serving_g: number | null }>(
      'SELECT serving_g FROM foods WHERE name = ? AND brand IS ? AND serving_g IS NOT NULL LIMIT 1',
      [food.name, food.brand],
    );
    grams = row?.serving_g ?? null;
  }
  return grams ? { grams, label: null, origin: 'db' } : null;
}

export async function setUserServing(food: Identity, grams: number, label: string | null): Promise<void> {
  await getUserDb().runAsync(
    `INSERT OR REPLACE INTO servings (key, source, name, brand, grams, label) VALUES (?, ?, ?, ?, ?, ?)`,
    [foodKey(food), food.source, food.name, food.brand, grams, label],
  );
}

export async function removeUserServing(food: Identity): Promise<void> {
  await getUserDb().runAsync('DELETE FROM servings WHERE key = ?', [foodKey(food)]);
}

/** Todas las raciones del usuario, por clave de alimento (para listados). */
export async function listUserServings(): Promise<Map<string, Serving>> {
  const rows = await getUserDb().getAllAsync<{ key: string; grams: number; label: string | null }>(
    'SELECT key, grams, label FROM servings',
  );
  return new Map(rows.map((r) => [r.key, { grams: r.grams, label: r.label, origin: 'user' as const }]));
}

/** Para la copia de seguridad. */
export function listServingsForBackup(): Promise<ServingInput[]> {
  return getUserDb().getAllAsync<ServingInput>(
    'SELECT source, name, brand, grams, label FROM servings ORDER BY name COLLATE NOCASE',
  );
}
