import type { SQLiteDatabase } from 'expo-sqlite';

export type Food = {
  id: number;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars: number | null;
  fiber: number | null;
  salt: number | null;
};

export type FoodResult = Food & {
  /** Parecido con lo que se buscó, de 0 a 100 */
  similarity: number;
};

type FoodRow = Food & { search_text: string };

const MIN_QUERY_LENGTH = 2;
const CANDIDATES_PER_QUERY = 100;
const MAX_RESULTS = 100;

/** Minúsculas y sin tildes (ñ -> n). Debe coincidir con normalizar() de pipeline/02_build_db.py. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
}

/** Palabras de la búsqueda: solo letras y números, para poder usarlas sin riesgo en FTS5 y LIKE. */
function tokenize(query: string): string[] {
  return normalize(query)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

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

function similarity(query: string, tokens: string[], row: FoodRow): number {
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

/**
 * Busca alimentos en español, sin importar mayúsculas ni tildes.
 * 1) FTS5: palabras que empiezan por lo escrito ("jam" -> "jamón"). Rápido.
 * 2) LIKE: lo escrito dentro de cualquier parte del texto ("serran" -> "serrano").
 * Los resultados se ordenan por parecido con la búsqueda.
 */
export async function searchFoods(db: SQLiteDatabase, rawQuery: string): Promise<FoodResult[]> {
  const tokens = tokenize(rawQuery);
  const query = tokens.join(' ');
  if (query.length < MIN_QUERY_LENGTH) return [];

  const columns = 'f.id, f.barcode, f.name, f.brand, f.kcal, f.protein, f.carbs, f.fat, f.sugars, f.fiber, f.salt, f.search_text';

  const ftsMatch = tokens.map((t) => `"${t}"*`).join(' ');
  const ftsRows = await db.getAllAsync<FoodRow>(
    `SELECT ${columns} FROM foods_fts JOIN foods f ON f.id = foods_fts.rowid
     WHERE foods_fts MATCH ? ORDER BY rank LIMIT ?`,
    [ftsMatch, CANDIDATES_PER_QUERY],
  );

  const likeWhere = tokens.map(() => 'f.search_text LIKE ?').join(' AND ');
  const likeRows = await db.getAllAsync<FoodRow>(
    `SELECT ${columns} FROM foods f WHERE ${likeWhere} LIMIT ?`,
    [...tokens.map((t) => `%${t}%`), CANDIDATES_PER_QUERY],
  );

  const byId = new Map<number, FoodRow>();
  for (const row of [...ftsRows, ...likeRows]) byId.set(row.id, row);

  return [...byId.values()]
    .map(({ search_text, ...food }) => ({
      ...food,
      similarity: similarity(query, tokens, { ...food, search_text }),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RESULTS);
}
