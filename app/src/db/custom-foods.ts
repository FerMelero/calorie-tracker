import type { FoodRow } from '@/db/search';
import { getUserDb } from '@/db/user';
import { normalize } from '@/lib/text';
import type { CustomFoodInput } from '@/lib/validation';

/** Alimento propio guardado en user.db (valores por 100 g). */
export type CustomFood = CustomFoodInput & { id: number };

const COLUMNS = 'id, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt';

function searchText(food: Pick<CustomFoodInput, 'name' | 'brand'>): string {
  return normalize(`${food.name} ${food.brand ?? ''}`.trim());
}

export function listCustomFoods(): Promise<CustomFood[]> {
  return getUserDb().getAllAsync<CustomFood>(`SELECT ${COLUMNS} FROM custom_foods ORDER BY name COLLATE NOCASE`);
}

export function getCustomFood(id: number): Promise<CustomFood | null> {
  return getUserDb().getFirstAsync<CustomFood>(`SELECT ${COLUMNS} FROM custom_foods WHERE id = ?`, [id]);
}

export async function saveCustomFood(food: CustomFoodInput, id?: number): Promise<void> {
  const values = [
    food.name, food.brand, food.kcal, food.protein, food.carbs, food.fat,
    food.sugars, food.fiber, food.salt, searchText(food),
  ];
  if (id === undefined) {
    await getUserDb().runAsync(
      `INSERT INTO custom_foods (name, brand, kcal, protein, carbs, fat, sugars, fiber, salt, search_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    );
  } else {
    await getUserDb().runAsync(
      `UPDATE custom_foods SET name = ?, brand = ?, kcal = ?, protein = ?, carbs = ?, fat = ?,
         sugars = ?, fiber = ?, salt = ?, search_text = ? WHERE id = ?`,
      [...values, id],
    );
  }
}

/** Borrar un alimento propio no toca el diario: cada registro guarda su propia copia de los valores. */
export async function deleteCustomFood(id: number): Promise<void> {
  await getUserDb().runAsync('DELETE FROM custom_foods WHERE id = ?', [id]);
}

/** Alimentos propios que contienen todas las palabras buscadas (ya normalizadas, sin tildes). */
export async function searchCustomFoods(tokens: string[], limit: number): Promise<FoodRow[]> {
  const where = tokens.map(() => 'search_text LIKE ?').join(' AND ');
  const rows = await getUserDb().getAllAsync<Omit<FoodRow, 'source' | 'barcode'>>(
    `SELECT ${COLUMNS}, search_text FROM custom_foods WHERE ${where} LIMIT ?`,
    [...tokens.map((t) => `%${t}%`), limit],
  );
  return rows.map((r) => ({ ...r, barcode: null, source: 'custom' as const }));
}
