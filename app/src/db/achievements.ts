import { getGoals } from '@/db/goals';
import { getUserDb } from '@/db/user';
import { evaluateAll, type EntryRow, type Stats } from '@/lib/achievements';
import type { AchievementInput } from '@/lib/validation';

async function count(table: 'favorites' | 'custom_foods' | 'servings'): Promise<number> {
  const row = await getUserDb().getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return row?.n ?? 0;
}

/** Lee de user.db lo necesario para calcular rachas y logros (una sola consulta para todo el diario). */
export async function loadStats(today: string): Promise<Stats> {
  const db = getUserDb();
  const [entries, weights, goals, favoritesCount, customFoodsCount, servingsCount] = await Promise.all([
    db.getAllAsync<EntryRow>(
      'SELECT date, meal, food_source, food_name, food_brand, kcal, protein, carbs, fat FROM entries ORDER BY date',
    ),
    db.getAllAsync<{ date: string; kg: number }>('SELECT date, kg FROM weights ORDER BY date'),
    getGoals(),
    count('favorites'),
    count('custom_foods'),
    count('servings'),
  ]);
  return {
    today,
    entries,
    weights,
    goals: goals && { kcal: goals.kcal, protein: goals.protein, carbs: goals.carbs, fat: goals.fat },
    favoritesCount,
    customFoodsCount,
    servingsCount,
  };
}

/** Días con al menos un registro (para la racha y el calendario). */
export async function getLoggedDates(): Promise<string[]> {
  const rows = await getUserDb().getAllAsync<{ date: string }>('SELECT DISTINCT date FROM entries ORDER BY date');
  return rows.map((r) => r.date);
}

export async function listUnlocked(): Promise<Map<string, string>> {
  const rows = await getUserDb().getAllAsync<AchievementInput>('SELECT id, unlocked_on FROM achievements');
  return new Map(rows.map((r) => [r.id, r.unlocked_on]));
}

/**
 * Evalúa los logros y guarda los que se acaban de conseguir (con la fecha de hoy). Un logro
 * desbloqueado no se pierde aunque luego se borren los datos que lo provocaron. Devuelve los ids
 * recién desbloqueados; INSERT OR IGNORE hace que dos llamadas a la vez no cuenten el mismo dos veces.
 */
export async function evaluateAndUnlock(today: string): Promise<string[]> {
  const stats = await loadStats(today);
  const unlocked = await listUnlocked();
  const fresh: string[] = [];
  for (const { achievement, result } of evaluateAll(stats)) {
    if (!result.done || unlocked.has(achievement.id)) continue;
    const res = await getUserDb().runAsync('INSERT OR IGNORE INTO achievements (id, unlocked_on) VALUES (?, ?)', [
      achievement.id,
      today,
    ]);
    if (res.changes > 0) fresh.push(achievement.id);
  }
  return fresh;
}

/** Para la copia de seguridad. */
export function listAchievementsForBackup(): Promise<AchievementInput[]> {
  return getUserDb().getAllAsync<AchievementInput>('SELECT id, unlocked_on FROM achievements ORDER BY unlocked_on, id');
}
