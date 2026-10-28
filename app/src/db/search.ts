import type { SQLiteDatabase } from 'expo-sqlite';

import { customToFood, findCustomByBarcode, searchCustomFoods } from '@/db/custom-foods';
import { barcodeKey, cleanBarcode } from '@/lib/barcode';
import { BONUS_CUSTOM, rankBonus, similarity } from '@/lib/ranking';
import { tokenize } from '@/lib/text';

export type Food = {
  id: number;
  /** 'db' = foods.db; 'custom' = alimento propio del usuario */
  source: 'db' | 'custom';
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

export type FoodRow = Food & { search_text: string };

const MIN_QUERY_LENGTH = 2;
const CANDIDATES_PER_QUERY = 100;
const MAX_RESULTS = 100;

type DbRow = Omit<FoodRow, 'source'> & { brand_rank: number | null; scans: number };

/**
 * Busca alimentos en español, sin importar mayúsculas ni tildes.
 * 1) FTS5: palabras que empiezan por lo escrito ("jam" -> "jamón"). Rápido.
 * 2) LIKE: lo escrito dentro de cualquier parte del texto ("serran" -> "serrano").
 * Los resultados se ordenan por parecido con la búsqueda, con ventaja para los supermercados,
 * las marcas conocidas y los productos más escaneados.
 */
export async function searchFoods(db: SQLiteDatabase, rawQuery: string): Promise<FoodResult[]> {
  const tokens = tokenize(rawQuery);
  const query = tokens.join(' ');
  if (query.length < MIN_QUERY_LENGTH) return [];

  const columns =
    'f.id, f.barcode, f.name, f.brand, f.kcal, f.protein, f.carbs, f.fat, f.sugars, f.fiber, f.salt, f.search_text, f.brand_rank, f.scans';

  // Con miles de coincidencias ("pollo"), los 100 más parecidos pueden no incluir ninguno de
  // supermercado. Por eso se piden tres listas de candidatas y se ordenan juntas al final.
  const ftsMatch = tokens.map((t) => `"${t}"*`).join(' ');
  const fts = (extra: string, order: string) =>
    db.getAllAsync<DbRow>(
      `SELECT ${columns} FROM foods_fts JOIN foods f ON f.id = foods_fts.rowid
       WHERE foods_fts MATCH ? ${extra} ORDER BY ${order} LIMIT ?`,
      [ftsMatch, CANDIDATES_PER_QUERY],
    );
  const [byRelevance, byBrand, byPopularity] = await Promise.all([
    fts('', 'rank'),
    fts('AND f.brand_rank IS NOT NULL', 'f.brand_rank, rank'),
    fts('', 'f.scans DESC, rank'),
  ]);

  const likeWhere = tokens.map(() => 'f.search_text LIKE ?').join(' AND ');
  const likeRows = await db.getAllAsync<DbRow>(
    `SELECT ${columns} FROM foods f WHERE ${likeWhere}
     ORDER BY (f.brand_rank IS NULL), f.brand_rank, f.scans DESC LIMIT ?`,
    [...tokens.map((t) => `%${t}%`), CANDIDATES_PER_QUERY],
  );

  type Candidate = FoodRow & { bonus: number };
  const found: Candidate[] = [...byRelevance, ...byBrand, ...byPopularity, ...likeRows].map(
    ({ brand_rank, scans, ...row }) => ({ ...row, source: 'db' as const, bonus: rankBonus(brand_rank, scans) }),
  );
  const custom: Candidate[] = (await searchCustomFoods(tokens, CANDIDATES_PER_QUERY)).map((row) => ({
    ...row,
    bonus: BONUS_CUSTOM,
  }));

  // foods.db y alimentos propios tienen ids distintos: se distinguen por source + id
  const unique = new Map<string, Candidate>();
  for (const row of [...found, ...custom]) unique.set(`${row.source}-${row.id}`, row);

  return [...unique.values()]
    .map(({ search_text, bonus, ...food }) => {
      const score = similarity(query, tokens, { ...food, search_text });
      return { food, score, rank: score + bonus };
    })
    .sort((a, b) => b.rank - a.rank || b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ food, score }) => ({ ...food, similarity: score }));
}

/**
 * Busca un producto por su código de barras. Primero entre los alimentos propios del usuario y
 * luego en foods.db. Un EAN-13 y su UPC de 12 dígitos cuentan como el mismo código.
 * Devuelve null si el código no es válido o no está en ninguna de las dos.
 */
export async function findFoodByBarcode(db: SQLiteDatabase, raw: string): Promise<Food | null> {
  const code = cleanBarcode(raw);
  if (code === null) return null;

  const custom = await findCustomByBarcode(code);
  if (custom) return customToFood(custom);

  const row = await db.getFirstAsync<Omit<Food, 'source'>>(
    `SELECT id, barcode, name, brand, kcal, protein, carbs, fat, sugars, fiber, salt
     FROM foods WHERE ltrim(barcode, '0') = ?
     ORDER BY (brand_rank IS NULL), brand_rank, scans DESC LIMIT 1`,
    [barcodeKey(code)],
  );
  return row ? { ...row, source: 'db' } : null;
}
