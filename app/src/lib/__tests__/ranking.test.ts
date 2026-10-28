import { describe, expect, it } from 'vitest';

import { BONUS_CUSTOM, rankBonus, similarity } from '@/lib/ranking';
import { tokenize } from '@/lib/text';

const sim = (query: string, name: string, brand = '') => {
  const tokens = tokenize(query);
  const searchText = `${name} ${brand}`.trim().toLowerCase();
  return similarity(tokens.join(' '), tokens, { name, search_text: searchText });
};

describe('parecido', () => {
  it('exacto = 100, empieza igual >= 90, y más parecido puntúa más', () => {
    expect(sim('arroz', 'Arroz')).toBe(100);
    expect(sim('arroz', 'Arroz integral')).toBeGreaterThanOrEqual(90);
    expect(sim('arroz', 'Arroz integral')).toBeGreaterThan(sim('arroz', 'Tarta de queso'));
  });

  it('cuenta la marca: "campofrio pavo" encuentra "Pavo" de Campofrío', () => {
    expect(sim('campofrio pavo', 'Pavo cocido', 'Campofrio')).toBeGreaterThan(sim('campofrio pavo', 'Pavo cocido', 'Otra marca'));
  });
});

describe('bonus por marca y popularidad', () => {
  it('supermercado > marca conocida > sin marca', () => {
    expect(rankBonus(1, 0)).toBeGreaterThan(rankBonus(100, 0));
    expect(rankBonus(100, 0)).toBeGreaterThan(rankBonus(null, 0));
    expect(rankBonus(null, 0)).toBe(0);
  });

  it('el orden de la lista de supermercados importa (Mercadona antes que Carrefour)', () => {
    expect(rankBonus(1, 0)).toBeGreaterThan(rankBonus(2, 0));
  });

  it('"se vende en un supermercado" queda entre el supermercado y la marca conocida', () => {
    expect(rankBonus(51, 0)).toBeLessThan(rankBonus(1, 0));
    expect(rankBonus(51, 0)).toBeGreaterThan(rankBonus(100, 0));
  });

  it('la popularidad ayuda pero tiene tope', () => {
    expect(rankBonus(null, 100)).toBeGreaterThan(rankBonus(null, 1));
    expect(rankBonus(null, 1_000_000)).toBe(rankBonus(null, 100_000));
    expect(rankBonus(null, 1_000_000)).toBeLessThanOrEqual(10);
  });

  it('un alimento propio gana a todo lo demás con el mismo parecido', () => {
    expect(BONUS_CUSTOM).toBeGreaterThan(rankBonus(1, 100_000));
  });

  it('un supermercado algo menos parecido supera a un resultado exacto de marca desconocida', () => {
    const exactoDesconocido = sim('carne picada', 'Carne picada') + rankBonus(null, 3);
    const mercadona = sim('carne picada', 'Carne picada de vacuno', 'Hacendado') + rankBonus(1, 0);
    expect(mercadona).toBeGreaterThan(exactoDesconocido);
  });
});
