/** Raciones: cómo se llama una ración y cómo se escribe una cantidad de raciones. Sin dependencias. */

export const DEFAULT_SERVING_LABEL = 'ración';
export const MAX_LABEL_LENGTH = 20;

/** Plural de la palabra que elige el usuario: bolsita → bolsitas, ración → raciones, unidad → unidades. */
export function pluralize(word: string): string {
  const w = word.trim();
  if (w === '') return w;
  if (/ón$/i.test(w)) return w.replace(/ón$/i, 'ones');
  if (/z$/i.test(w)) return w.replace(/z$/i, 'ces');
  if (/[aeiouáéíóú]$/i.test(w)) return `${w}s`;
  return `${w}es`;
}

/** Número con coma decimal y sin ceros sobrantes: 1.5 → "1,5", 2 → "2", 0.333 → "0,33". */
export function formatNumber(value: number, decimals = 2): string {
  const factor = 10 ** decimals;
  return String(Math.round(value * factor) / factor).replace('.', ',');
}

/** "1 ración", "1,5 bolsitas", "0,5 raciones" (en español, 1 es singular y todo lo demás plural). */
export function describeCount(count: number, label: string | null): string {
  const word = label?.trim() || DEFAULT_SERVING_LABEL;
  return `${formatNumber(count)} ${count === 1 ? word : pluralize(word)}`;
}

/** Cuántas raciones son estos gramos (con 2 decimales). */
export function countFromGrams(grams: number, servingGrams: number): number {
  return Math.round((grams / servingGrams) * 100) / 100;
}

/** Gramos de una cantidad de raciones, con 1 decimal. */
export function gramsFromCount(count: number, servingGrams: number): number {
  return Math.round(count * servingGrams * 10) / 10;
}

/**
 * El siguiente número de raciones al pulsar + o −: siempre de media en media (0,5; 1; 1,5…),
 * aunque ahora haya, por ejemplo, 1,3. Nunca baja de 0,5.
 */
export function stepCount(count: number, direction: 1 | -1): number {
  const next = direction === 1 ? Math.floor(count * 2 + 1e-9) / 2 + 0.5 : Math.ceil(count * 2 - 1e-9) / 2 - 0.5;
  return Math.max(0.5, next);
}
