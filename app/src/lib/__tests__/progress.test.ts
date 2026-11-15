import { describe, expect, it } from 'vitest';

import { addDays, shortDate } from '@/lib/dates';
import {
  average,
  fillDays,
  lastDays,
  macroCaloriePercent,
  niceCeil,
  scale,
  summarizeFood,
  weightBounds,
  weightChange,
  weightTrend,
  type DayTotals,
} from '@/lib/progress';

const day = (date: string, kcal: number, protein = 0, carbs = 0, fat = 0): DayTotals => ({ date, kcal, protein, carbs, fat });

describe('fechas de la gráfica', () => {
  it('suma y resta días, también entre meses, años bisiestos y cambios de hora', () => {
    expect(addDays('2026-11-08', 1)).toBe('2026-11-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // cambio de hora de octubre
    expect(addDays('2026-03-28', 3)).toBe('2026-03-31'); // cambio de hora de marzo
  });

  it('escribe la fecha corta', () => {
    expect(shortDate('2026-11-08')).toBe('8 nov');
    expect(shortDate('2026-01-31')).toBe('31 ene');
  });

  it('lastDays da los últimos N días, ordenados, terminando hoy', () => {
    expect(lastDays('2026-11-08', 3)).toEqual(['2026-11-06', '2026-11-07', '2026-11-08']);
    expect(lastDays('2026-03-02', 4)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(lastDays('2026-11-08', 90)).toHaveLength(90);
  });
});

describe('comida: huecos y medias', () => {
  const dates = lastDays('2026-11-07', 7);

  it('un día sin registro es un hueco, no un cero', () => {
    const points = fillDays(dates, [day('2026-11-05', 1800), day('2026-11-07', 2200)]);
    expect(points).toHaveLength(7);
    expect(points[0].totals).toBeNull();
    expect(points[4].totals?.kcal).toBe(1800);
    expect(points.filter((p) => p.totals).length).toBe(2);
  });

  it('la media solo cuenta los días registrados', () => {
    const s = summarizeFood(fillDays(dates, [day('2026-11-05', 1800, 100, 200, 60), day('2026-11-07', 2200, 140, 260, 80)]), 2000);
    expect(s.loggedDays).toBe(2);
    expect(s.totalDays).toBe(7);
    expect(s.avgKcal).toBe(2000); // (1800 + 2200) / 2, no entre 7
    expect(s.avgProtein).toBe(120);
    expect(s.daysOverGoal).toBe(1);
  });

  it('sin ningún día registrado no hay medias', () => {
    const s = summarizeFood(fillDays(dates, []), 2000);
    expect(s.loggedDays).toBe(0);
    expect(s.avgKcal).toBeNull();
    expect(average([])).toBeNull();
  });

  it('sin objetivo no hay días pasados', () => {
    expect(summarizeFood(fillDays(dates, [day('2026-11-07', 9000)]), null).daysOverGoal).toBe(0);
  });

  it('pasarse del objetivo es estrictamente más (igual no cuenta)', () => {
    expect(summarizeFood(fillDays(dates, [day('2026-11-07', 2000)]), 2000).daysOverGoal).toBe(0);
  });
});

describe('reparto de macros por calorías', () => {
  it('reparte por kcal (4, 4 y 9 por gramo) y suma 100 exactos', () => {
    // 100 g P = 400 kcal, 250 g C = 1000 kcal, 70 g G = 630 kcal -> 19,7 / 49,3 / 31,0 %
    expect(macroCaloriePercent(100, 250, 70)).toEqual({ protein: 20, carbs: 49, fat: 31 });
  });

  it('suma siempre 100, aunque haya decimales repartidos a tercios', () => {
    for (const [p, c, f] of [[10, 10, 10], [33, 33, 33], [1, 1, 1], [7, 13, 29], [100, 0, 0]]) {
      const r = macroCaloriePercent(p, c, f)!;
      expect(r.protein + r.carbs + r.fat, `${p}/${c}/${f}`).toBe(100);
    }
  });

  it('sin nada que repartir devuelve null', () => {
    expect(macroCaloriePercent(0, 0, 0)).toBeNull();
  });
});

describe('peso', () => {
  const pesos = [
    { date: '2026-11-01', kg: 80 },
    { date: '2026-11-02', kg: 81 },
    { date: '2026-11-05', kg: 79 },
    { date: '2026-11-12', kg: 78 },
  ];

  it('el cambio es último menos primero, y necesita al menos dos pesos', () => {
    expect(weightChange(pesos)).toBe(-2);
    expect(weightChange([pesos[0]])).toBeNull();
    expect(weightChange([])).toBeNull();
    expect(weightChange([...pesos].reverse())).toBe(-2); // el orden de entrada no importa
  });

  it('la tendencia es la media de los últimos 7 días naturales', () => {
    const t = weightTrend(pesos);
    expect(t[0].kg).toBe(80);
    expect(t[1].kg).toBe(80.5); // (80 + 81) / 2
    expect(t[2].kg).toBe(80); // (80 + 81 + 79) / 3
    expect(t[3].kg).toBe(78); // el 12 solo ve el suyo: el 5 queda a 7 días, fuera de la ventana
  });

  it('un peso nuevo no cambia la tendencia de los días anteriores', () => {
    const antes = weightTrend(pesos.slice(0, 3));
    const despues = weightTrend(pesos);
    expect(despues.slice(0, 3)).toEqual(antes);
  });
});

describe('escalas de los ejes', () => {
  it('niceCeil redondea hacia arriba a un número limpio', () => {
    expect(niceCeil(1850)).toBe(2000);
    expect(niceCeil(2000)).toBe(2000);
    expect(niceCeil(2350)).toBe(2500);
    expect(niceCeil(3100)).toBe(3500);
    expect(niceCeil(95)).toBe(100);
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(-5)).toBe(1);
  });

  it('niceCeil nunca queda por debajo del valor', () => {
    for (const v of [1, 7, 99, 1234, 1999, 2001, 4321, 9999, 12345]) expect(niceCeil(v)).toBeGreaterThanOrEqual(v);
  });

  it('los límites del peso dejan aire y al menos 2 kg de alto', () => {
    expect(weightBounds([72.4, 73.1, 71.8])).toEqual({ min: 70, max: 75 });
    const igual = weightBounds([70, 70]);
    expect(igual.max - igual.min).toBeGreaterThanOrEqual(2);
    expect(weightBounds([])).toEqual({ min: 60, max: 80 });
  });

  it('scale pasa de un rango a otro, también invertido (el eje Y de pantalla crece hacia abajo)', () => {
    expect(scale(50, 0, 100, 0, 200)).toBe(100);
    expect(scale(0, 0, 100, 200, 0)).toBe(200);
    expect(scale(100, 0, 100, 200, 0)).toBe(0);
    expect(scale(5, 5, 5, 0, 100)).toBe(50); // rango sin ancho: al centro, sin dividir por cero
  });
});
