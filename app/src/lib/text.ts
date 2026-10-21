/** Minúsculas y sin tildes (ñ -> n). Debe coincidir con normalizar() de pipeline/02_build_db.py. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
}

/** Palabras de la búsqueda: solo letras y números, para poder usarlas sin riesgo en FTS5 y LIKE. */
export function tokenize(query: string): string[] {
  return normalize(query)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}
