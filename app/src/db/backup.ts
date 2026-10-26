import { favoriteKey, listFavoritesForBackup } from '@/db/favorites';
import { getGoals, saveGoals } from '@/db/goals';
import { getUserDb } from '@/db/user';
import { normalize } from '@/lib/text';
import {
  BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION,
  type Backup,
  type CustomFoodInput,
  type EntryInput,
} from '@/lib/validation';

/** Lee todo lo que el usuario ha creado (alimentos propios, diario y objetivos). */
export async function buildBackup(): Promise<Backup> {
  const db = getUserDb();
  const customFoods = await db.getAllAsync<CustomFoodInput>(
    'SELECT name, brand, barcode, kcal, protein, carbs, fat, sugars, fiber, salt FROM custom_foods ORDER BY id',
  );
  // food_id no se exporta: los ids de foods.db cambian al regenerar la base y no serían válidos.
  const entries = await db.getAllAsync<EntryInput>(
    `SELECT date, meal, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat,
            sugars, fiber, salt FROM entries ORDER BY date, id`,
  );
  return {
    app: BACKUP_APP_ID,
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    custom_foods: customFoods,
    favorites: await listFavoritesForBackup(),
    entries,
    goals: await getGoals(),
  };
}

export type ImportSummary = {
  addedFoods: number;
  skippedFoods: number;
  addedFavorites: number;
  addedEntries: number;
  skippedEntries: number;
  goalsReplaced: boolean;
};

const foodKey = (name: string, brand: string | null) => normalize(`${name}|${brand ?? ''}`);
const entryKey = (e: EntryInput) =>
  [e.date, e.meal, normalize(e.food_name), normalize(e.food_brand ?? ''), e.grams, e.kcal].join('|');

/**
 * Añade a lo que ya hay: los duplicados se saltan (así importar dos veces el mismo archivo no
 * duplica nada). Los objetivos del archivo reemplazan a los actuales. Todo en una transacción:
 * si algo falla no queda nada a medias.
 */
export async function importBackup(backup: Backup): Promise<ImportSummary> {
  const db = getUserDb();
  const summary: ImportSummary = {
    addedFoods: 0, skippedFoods: 0, addedFavorites: 0, addedEntries: 0, skippedEntries: 0, goalsReplaced: false,
  };

  await db.withTransactionAsync(async () => {
    const existingFoods = await db.getAllAsync<{ name: string; brand: string | null }>(
      'SELECT name, brand FROM custom_foods',
    );
    const foodKeys = new Set(existingFoods.map((f) => foodKey(f.name, f.brand)));
    for (const f of backup.custom_foods) {
      const key = foodKey(f.name, f.brand);
      if (foodKeys.has(key)) {
        summary.skippedFoods++;
        continue;
      }
      foodKeys.add(key);
      await db.runAsync(
        `INSERT INTO custom_foods (name, brand, barcode, kcal, protein, carbs, fat, sugars, fiber, salt, search_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.name, f.brand, f.barcode ?? null, f.kcal, f.protein, f.carbs, f.fat, f.sugars, f.fiber, f.salt,
         normalize(`${f.name} ${f.brand ?? ''}`.trim())],
      );
      summary.addedFoods++;
    }

    for (const f of backup.favorites) {
      // INSERT OR IGNORE: la clave es única, así que un favorito repetido simplemente se salta
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO favorites (key, source, source_id, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt)
         VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [favoriteKey(f), f.source, f.name, f.brand, f.kcal, f.protein, f.carbs, f.fat, f.sugars, f.fiber, f.salt],
      );
      summary.addedFavorites += result.changes;
    }

    const existingEntries = await db.getAllAsync<EntryInput>(
      'SELECT date, meal, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat, sugars, fiber, salt FROM entries',
    );
    const entryKeys = new Set(existingEntries.map(entryKey));
    for (const e of backup.entries) {
      const key = entryKey(e);
      if (entryKeys.has(key)) {
        summary.skippedEntries++;
        continue;
      }
      entryKeys.add(key);
      // food_id = 0: es solo informativo, cada registro guarda su propia copia de los valores
      await db.runAsync(
        `INSERT INTO entries
           (date, meal, food_id, food_source, food_name, food_brand, grams, kcal, protein, carbs, fat, sugars, fiber, salt)
         VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.date, e.meal, e.food_source, e.food_name, e.food_brand, e.grams, e.kcal, e.protein,
         e.carbs, e.fat, e.sugars, e.fiber, e.salt],
      );
      summary.addedEntries++;
    }
  });

  if (backup.goals) {
    await saveGoals(backup.goals);
    summary.goalsReplaced = true;
  }
  return summary;
}
