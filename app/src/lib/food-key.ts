import { normalize } from '@/lib/text';

/**
 * Identifica un alimento por su origen, nombre y marca (no por el id, que cambia si se regenera
 * foods.db). Sirve para los favoritos y para las raciones que define el usuario.
 */
export function foodKey(food: { source: string; name: string; brand: string | null }): string {
  return normalize(`${food.source}|${food.name}|${food.brand ?? ''}`);
}
