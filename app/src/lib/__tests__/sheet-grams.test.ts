import { describe, expect, it } from 'vitest';

import { DISMISS_DISTANCE, DISMISS_VELOCITY, MIN_FLING_DISTANCE, shouldDismiss } from '@/lib/sheet';
import { GRAMS_RANGE, parseGrams, validateEntry } from '@/lib/validation';

describe('cierre de las ventanas inferiores al arrastrar', () => {
  it('se cierra al bajarla lo suficiente, aunque sea despacio', () => {
    expect(shouldDismiss(DISMISS_DISTANCE, 0)).toBe(true);
    expect(shouldDismiss(DISMISS_DISTANCE + 200, 0.1)).toBe(true);
  });

  it('vuelve a su sitio si se suelta antes y sin fuerza', () => {
    expect(shouldDismiss(DISMISS_DISTANCE - 1, 0.1)).toBe(false);
    expect(shouldDismiss(0, 0)).toBe(false);
    expect(shouldDismiss(-50, 0)).toBe(false); // arrastrada hacia arriba
  });

  it('un lanzamiento rápido hacia abajo la cierra aunque la distancia sea corta', () => {
    expect(shouldDismiss(MIN_FLING_DISTANCE, DISMISS_VELOCITY)).toBe(true);
    expect(shouldDismiss(60, 1.5)).toBe(true);
  });

  it('un roce rápido sin apenas recorrido no la cierra', () => {
    expect(shouldDismiss(MIN_FLING_DISTANCE - 1, 3)).toBe(false);
    expect(shouldDismiss(5, 2)).toBe(false);
  });

  it('un lanzamiento hacia arriba no la cierra', () => {
    expect(shouldDismiss(-40, -2)).toBe(false);
  });
});

describe('gramos que se pueden escribir al añadir o editar', () => {
  it('acepta de 0,1 a 10 000 g, con coma o con punto', () => {
    expect(parseGrams('100')).toBe(100);
    expect(parseGrams('12,5')).toBe(12.5);
    expect(parseGrams(' 12.5 ')).toBe(12.5);
    expect(parseGrams(String(GRAMS_RANGE.min))).toBe(0.1);
    expect(parseGrams(String(GRAMS_RANGE.max))).toBe(10000);
  });

  it('rechaza lo que no es un número o queda fuera del rango', () => {
    for (const bad of ['', '   ', 'abc', '0', '-5', '0,05', '10001', '50000', '1e999']) {
      expect(parseGrams(bad), bad).toBeNull();
    }
  });

  // El fallo que motivó esto: la ventana aceptaba 50 000 g y la copia de seguridad la rechazaba.
  it('todo lo que acepta la ventana lo acepta también la copia de seguridad', () => {
    for (const text of ['0.1', '0,1', '1', '37,5', '250', '1000', '9999.9', '10000']) {
      const grams = parseGrams(text);
      expect(grams, text).not.toBeNull();
      // un registro coherente con esos gramos: 1 kcal y 0,05 g de macros por gramo
      const r = validateEntry({
        date: '2026-11-06', meal: 'comida', food_source: 'db', food_name: 'Alimento de prueba', food_brand: null,
        grams, kcal: grams! * 1, protein: grams! * 0.05, carbs: grams! * 0.05, fat: grams! * 0.05,
        sugars: null, fiber: null, salt: null,
      });
      expect(r.ok, `${text} g`).toBe(true);
    }
  });

  it('y lo que rechaza la ventana también lo rechaza la copia (mismo rango)', () => {
    for (const grams of [0.05, 10001, 50000]) {
      expect(parseGrams(String(grams))).toBeNull();
      const r = validateEntry({
        date: '2026-11-06', meal: 'comida', food_source: 'db', food_name: 'Alimento de prueba', food_brand: null,
        grams, kcal: 0, protein: 0, carbs: 0, fat: 0, sugars: null, fiber: null, salt: null,
      });
      expect(r.ok, `${grams} g`).toBe(false);
    }
  });
});
