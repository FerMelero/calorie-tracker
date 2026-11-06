import { describe, expect, it } from 'vitest';

import { foodKey } from '@/lib/food-key';
import { countFromGrams, describeCount, formatNumber, gramsFromCount, pluralize, stepCount } from '@/lib/serving';

describe('pluralize', () => {
  it.each([
    ['bolsita', 'bolsitas'],
    ['loncha', 'lonchas'],
    ['galleta', 'galletas'],
    ['ración', 'raciones'],
    ['porción', 'porciones'],
    ['unidad', 'unidades'],
    ['pan', 'panes'],
    ['lápiz', 'lápices'],
    ['  vaso  ', 'vasos'],
  ])('%s -> %s', (singular, plural) => {
    expect(pluralize(singular)).toBe(plural);
  });

  it('una palabra vacía se queda vacía', () => {
    expect(pluralize('   ')).toBe('');
  });
});

describe('cantidades de raciones', () => {
  it('escribe los números con coma y sin ceros sobrantes', () => {
    expect(formatNumber(1.5)).toBe('1,5');
    expect(formatNumber(2)).toBe('2');
    expect(formatNumber(0.3333)).toBe('0,33');
  });

  it('1 es singular y el resto plural, con la palabra del usuario', () => {
    expect(describeCount(1, null)).toBe('1 ración');
    expect(describeCount(1.5, null)).toBe('1,5 raciones');
    expect(describeCount(0.5, null)).toBe('0,5 raciones');
    expect(describeCount(2, 'bolsita')).toBe('2 bolsitas');
    expect(describeCount(1, 'bolsita')).toBe('1 bolsita');
    expect(describeCount(1, '  ')).toBe('1 ración'); // una palabra en blanco vale como ninguna
  });

  it('convierte entre gramos y raciones', () => {
    expect(gramsFromCount(1.5, 125)).toBe(187.5);
    expect(gramsFromCount(0.5, 12.7)).toBe(6.4); // 6,35 redondeado a un decimal
    expect(countFromGrams(250, 125)).toBe(2);
    expect(countFromGrams(60, 40)).toBe(1.5);
    expect(countFromGrams(100, 30)).toBe(3.33);
  });

  it('+ y − avanzan de media en media, y nunca bajan de 0,5', () => {
    expect(stepCount(1, 1)).toBe(1.5);
    expect(stepCount(1, -1)).toBe(0.5);
    expect(stepCount(0.5, -1)).toBe(0.5);
    expect(stepCount(1.3, 1)).toBe(1.5); // desde un valor intermedio, al siguiente múltiplo
    expect(stepCount(1.3, -1)).toBe(1);
    expect(stepCount(2.5, 1)).toBe(3);
  });
});

describe('clave de un alimento', () => {
  const yogur = { source: 'db', name: 'Yogur natural', brand: 'Hacendado' };

  it('no depende de mayúsculas ni tildes', () => {
    expect(foodKey({ ...yogur, name: 'YOGUR NATURAL' })).toBe(foodKey(yogur));
    expect(foodKey({ source: 'db', name: 'Jamón', brand: null })).toBe(foodKey({ source: 'db', name: 'jamon', brand: null }));
  });

  it('distingue el origen y la marca', () => {
    expect(foodKey({ ...yogur, source: 'custom' })).not.toBe(foodKey(yogur));
    expect(foodKey({ ...yogur, brand: 'Carrefour' })).not.toBe(foodKey(yogur));
    expect(foodKey({ ...yogur, brand: null })).not.toBe(foodKey(yogur));
  });
});
