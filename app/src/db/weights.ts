import { getUserDb } from '@/db/user';
import type { WeightInput } from '@/lib/validation';

/** Registra el peso de un día. Si ya había uno ese día, se reemplaza. */
export async function setWeight(date: string, kg: number): Promise<void> {
  await getUserDb().runAsync('INSERT OR REPLACE INTO weights (date, kg) VALUES (?, ?)', [date, kg]);
}

export async function deleteWeight(date: string): Promise<void> {
  await getUserDb().runAsync('DELETE FROM weights WHERE date = ?', [date]);
}

/** Pesos entre dos fechas (incluidas), de más antiguo a más reciente. */
export function listWeightsBetween(fromDate: string, toDate: string): Promise<WeightInput[]> {
  return getUserDb().getAllAsync<WeightInput>(
    'SELECT date, kg FROM weights WHERE date >= ? AND date <= ? ORDER BY date',
    [fromDate, toDate],
  );
}

/** El último peso registrado (el de la fecha más reciente), o null si no hay ninguno. */
export function getLatestWeight(): Promise<WeightInput | null> {
  return getUserDb().getFirstAsync<WeightInput>('SELECT date, kg FROM weights ORDER BY date DESC LIMIT 1');
}

/** Para la copia de seguridad. */
export function listWeightsForBackup(): Promise<WeightInput[]> {
  return getUserDb().getAllAsync<WeightInput>('SELECT date, kg FROM weights ORDER BY date');
}
