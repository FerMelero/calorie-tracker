import type { Food } from '@/db/search';
import { getUserDb } from '@/db/user';
import { normalize } from '@/lib/text';
import type { FavoriteInput } from '@/lib/validation';

type FavoriteRow = Omit<Food, 'id' | 'barcode'> & { id: number; source_id: number };

/** Identifica un alimento favorito por su origen, nombre y marca (no por el id, que puede cambiar). */
export function favoriteKey(food: Pick<Food, 'source' | 'name' | 'brand'>): string {
  return normalize(`${food.source}|${food.name}|${food.brand ?? ''}`);
}

const COLUMNS = 'id, source, source_id, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt';

function toFood(row: FavoriteRow): Food {
  const { source_id, id: _id, ...rest } = row;
  return { ...rest, id: source_id, barcode: null };
}

export async function listFavorites(): Promise<Food[]> {
  const rows = await getUserDb().getAllAsync<FavoriteRow>(
    `SELECT ${COLUMNS} FROM favorites ORDER BY name COLLATE NOCASE`,
  );
  return rows.map(toFood);
}

/** Añade o quita un favorito. Devuelve true si ha quedado como favorito. */
export async function toggleFavorite(food: Food): Promise<boolean> {
  const db = getUserDb();
  const key = favoriteKey(food);
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM favorites WHERE key = ?', [key]);
  if (existing) {
    await db.runAsync('DELETE FROM favorites WHERE id = ?', [existing.id]);
    return false;
  }
  await db.runAsync(
    `INSERT INTO favorites (key, source, source_id, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [key, food.source, food.id, food.name, food.brand, food.kcal, food.protein, food.carbs, food.fat,
     food.sugars, food.fiber, food.salt],
  );
  return true;
}

/** Para la copia de seguridad. */
export function listFavoritesForBackup(): Promise<FavoriteInput[]> {
  return getUserDb().getAllAsync<FavoriteInput>(
    'SELECT source, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt FROM favorites ORDER BY id',
  );
}
