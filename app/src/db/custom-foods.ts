import type { Food, FoodRow } from '@/db/search';
import { getUserDb } from '@/db/user';
import { barcodeKey } from '@/lib/barcode';
import { normalize } from '@/lib/text';
import type { CustomFoodInput } from '@/lib/validation';

/** Alimento propio guardado en user.db (valores por 100 g). */
export type CustomFood = CustomFoodInput & { id: number };

const COLUMNS = 'id, name, brand, barcode, kcal, protein, carbs, fat, sugars, fiber, salt';

function searchText(food: Pick<CustomFoodInput, 'name' | 'brand'>): string {
  return normalize(`${food.name} ${food.brand ?? ''}`.trim());
}

/** Convierte un alimento propio en el tipo común `Food` que usa el resto de la app. */
export function customToFood(food: CustomFood): Food {
  return {
    id: food.id,
    source: 'custom',
    barcode: food.barcode ?? null,
    name: food.name,
    brand: food.brand,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    sugars: food.sugars,
    fiber: food.fiber,
    salt: food.salt,
  };
}

export function listCustomFoods(): Promise<CustomFood[]> {
  return getUserDb().getAllAsync<CustomFood>(`SELECT ${COLUMNS} FROM custom_foods ORDER BY name COLLATE NOCASE`);
}

export function getCustomFood(id: number): Promise<CustomFood | null> {
  return getUserDb().getFirstAsync<CustomFood>(`SELECT ${COLUMNS} FROM custom_foods WHERE id = ?`, [id]);
}

/** El alimento propio con ese código de barras, si existe (se ignoran los ceros delante). */
export function findCustomByBarcode(code: string): Promise<CustomFood | null> {
  return getUserDb().getFirstAsync<CustomFood>(
    `SELECT ${COLUMNS} FROM custom_foods WHERE barcode IS NOT NULL AND ltrim(barcode, '0') = ? LIMIT 1`,
    [barcodeKey(code)],
  );
}

/** Crea o actualiza un alimento propio. Devuelve su id. */
export async function saveCustomFood(food: CustomFoodInput, id?: number): Promise<number> {
  const values = [
    food.name, food.brand, food.barcode ?? null, food.kcal, food.protein, food.carbs, food.fat,
    food.sugars, food.fiber, food.salt, searchText(food),
  ];
  if (id === undefined) {
    const result = await getUserDb().runAsync(
      `INSERT INTO custom_foods (name, brand, barcode, kcal, protein, carbs, fat, sugars, fiber, salt, search_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    );
    return result.lastInsertRowId;
  }
  await getUserDb().runAsync(
    `UPDATE custom_foods SET name = ?, brand = ?, barcode = ?, kcal = ?, protein = ?, carbs = ?, fat = ?,
       sugars = ?, fiber = ?, salt = ?, search_text = ? WHERE id = ?`,
    [...values, id],
  );
  return id;
}

/** Borrar un alimento propio no toca el diario: cada registro guarda su propia copia de los valores. */
export async function deleteCustomFood(id: number): Promise<void> {
  await getUserDb().runAsync('DELETE FROM custom_foods WHERE id = ?', [id]);
}

/** Alimentos propios que contienen todas las palabras buscadas (ya normalizadas, sin tildes). */
export async function searchCustomFoods(tokens: string[], limit: number): Promise<FoodRow[]> {
  const where = tokens.map(() => 'search_text LIKE ?').join(' AND ');
  const rows = await getUserDb().getAllAsync<Omit<FoodRow, 'source'>>(
    `SELECT ${COLUMNS}, search_text FROM custom_foods WHERE ${where} LIMIT ?`,
    [...tokens.map((t) => `%${t}%`), limit],
  );
  return rows.map((r) => ({ ...r, source: 'custom' as const }));
}
