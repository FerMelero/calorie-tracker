import { getUserDb } from '@/db/user';

/** Clave del ajuste "Mostrar rachas y logros". */
const GAMIFICATION_KEY = 'gamification';

/** Rachas y logros están activados salvo que el usuario los haya apagado. */
export async function getGamificationEnabled(): Promise<boolean> {
  const row = await getUserDb().getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
    GAMIFICATION_KEY,
  ]);
  return row?.value !== 'off';
}

export async function setGamificationEnabled(enabled: boolean): Promise<void> {
  await getUserDb().runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
    GAMIFICATION_KEY,
    enabled ? 'on' : 'off',
  ]);
}
