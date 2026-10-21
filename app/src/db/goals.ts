import { getUserDb } from '@/db/user';
import type { Activity, Objective, Sex } from '@/lib/nutrition';

/**
 * Objetivos diarios de quien usa este móvil. No hay cuentas: cada persona tiene los suyos
 * en su propio dispositivo. kcal y macros son siempre los objetivos finales; el resto de
 * campos solo se rellenan en modo "auto" para poder recalcular o editar después.
 */
export type Goals = {
  mode: 'auto' | 'manual';
  sex: Sex | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity: Activity | null;
  objective: Objective | null;
  adjust_pct: number | null;
  protein_per_kg: number | null;
  fat_pct: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function getGoals(): Promise<Goals | null> {
  return getUserDb().getFirstAsync<Goals>(
    `SELECT mode, sex, age, weight_kg, height_cm, activity, objective, adjust_pct,
            protein_per_kg, fat_pct, kcal, protein, carbs, fat
     FROM goals WHERE id = 1`,
  );
}

export async function saveGoals(g: Goals): Promise<void> {
  await getUserDb().runAsync(
    `INSERT OR REPLACE INTO goals
       (id, mode, sex, age, weight_kg, height_cm, activity, objective, adjust_pct,
        protein_per_kg, fat_pct, kcal, protein, carbs, fat)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      g.mode, g.sex, g.age, g.weight_kg, g.height_cm, g.activity, g.objective, g.adjust_pct,
      g.protein_per_kg, g.fat_pct, g.kcal, g.protein, g.carbs, g.fat,
    ],
  );
}
