import { normalize } from '@/lib/text';

// Cálculo del orden de los resultados de búsqueda. Sin dependencias de Expo, para poder probarlo.

function bigrams(text: string): string[] {
  const compact = ` ${text} `;
  const result: string[] = [];
  for (let i = 0; i < compact.length - 1; i++) result.push(compact.slice(i, i + 2));
  return result;
}

/** Coeficiente de Dice sobre pares de letras: 1 = idénticos, 0 = nada en común. */
function dice(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  const counts = new Map<string, number>();
  for (const g of bigramsB) counts.set(g, (counts.get(g) ?? 0) + 1);
  let common = 0;
  for (const g of bigramsA) {
    const left = counts.get(g) ?? 0;
    if (left > 0) {
      common++;
      counts.set(g, left - 1);
    }
  }
  return (2 * common) / (bigramsA.length + bigramsB.length);
}

/** Parecido (0-100) entre lo buscado y un alimento. `query` y `tokens` ya vienen normalizados. */
export function similarity(query: string, tokens: string[], row: { name: string; search_text: string }): number {
  const name = normalize(row.name);
  // Se compara con nombre + marca, para que "campofrio pavo" también puntúe bien
  let score = dice(query, row.search_text);
  if (name === query) score = 1;
  else if (name.startsWith(query)) score = Math.max(score, 0.9);
  // Si todas las palabras buscadas son palabras completas del texto, es un buen resultado
  else if (tokens.every((t) => row.search_text.split(/[^a-z0-9]+/).includes(t))) {
    score = Math.max(score, 0.75);
  }
  return Math.round(score * 100);
}

// --- Orden de los resultados: parecido + bonus por marca y popularidad -----------------------
// El orden final es: parecido (0-100) + bonus. Los bonus son grandes a propósito: entre dos
// resultados igual de relevantes gana el de supermercado, y uno de supermercado algo menos
// parecido puede ganar a uno exacto de marca desconocida. Ajusta estos números si hace falta.
const BONUS_SUPERMARKET = 40; // marca de supermercado (rank 1-49; resta 0,1 por cada puesto)
const BONUS_STORE_ONLY = 25; // sin marca conocida, pero se vende en un supermercado (rank 50-99)
const BONUS_KNOWN_BRAND = 20; // marca conocida (rank 100)
export const BONUS_CUSTOM = 50; // alimentos propios del usuario
const BONUS_POPULARITY_MAX = 10; // escaneos en Open Food Facts (escala logarítmica)

/** Ver pipeline/brands.py para el significado de brand_rank. */
export function rankBonus(brandRank: number | null, scans: number): number {
  let bonus = 0;
  if (brandRank !== null) {
    if (brandRank < 50) bonus = BONUS_SUPERMARKET - brandRank * 0.1;
    else if (brandRank < 100) bonus = BONUS_STORE_ONLY;
    else bonus = BONUS_KNOWN_BRAND;
  }
  return bonus + Math.min(BONUS_POPULARITY_MAX, Math.log10(1 + scans) * 4);
}
