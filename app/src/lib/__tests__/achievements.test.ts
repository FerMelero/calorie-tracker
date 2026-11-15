import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS, bannerText, evaluateAll, type EntryRow, type Stats } from '@/lib/achievements';
import { addDays } from '@/lib/dates';

const TODAY = '2026-11-15'; // domingo
const GOALS = { kcal: 2000, protein: 100, carbs: 250, fat: 70 };

function entry(date: string, over: Partial<EntryRow> = {}): EntryRow {
  return {
    date, meal: 'comida', food_source: 'off', food_name: 'Arroz', food_brand: null,
    kcal: 2000, protein: 100, carbs: 250, fat: 70, ...over,
  };
}

function stats(over: Partial<Stats> = {}): Stats {
  return {
    today: TODAY, entries: [], weights: [], goals: GOALS,
    favoritesCount: 0, customFoodsCount: 0, servingsCount: 0, ...over,
  };
}

/** n días seguidos terminando en `end` */
const run = (n: number, end = TODAY) => Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
const rows = (dates: string[], over: Partial<EntryRow> = {}) => dates.map((d) => entry(d, over));

function get(s: Stats, id: string) {
  const found = evaluateAll(s).find((e) => e.achievement.id === id);
  if (!found) throw new Error(`no existe ${id}`);
  return found.result;
}

describe('catálogo', () => {
  it('ids únicos y datos completos', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });
  it('sin datos no hay ningún logro conseguido', () => {
    expect(evaluateAll(stats()).filter((e) => e.result.done)).toEqual([]);
  });
});

describe('constancia', () => {
  it('primer paso con una entrada', () => {
    expect(get(stats({ entries: rows([TODAY]) }), 'first-entry').done).toBe(true);
  });
  it('racha de 7: 6 días no, 7 sí', () => {
    expect(get(stats({ entries: rows(run(6)) }), 'streak-7').done).toBe(false);
    expect(get(stats({ entries: rows(run(7)) }), 'streak-7').done).toBe(true);
  });
  it('los logros de racha usan la racha más larga, aunque ya se haya roto', () => {
    const old = run(7, '2026-09-10');
    expect(get(stats({ entries: rows(old) }), 'streak-7').done).toBe(true);
  });
  it('días totales no se pierden al romper la racha', () => {
    const dates = [...run(5, '2026-09-10'), ...run(5, '2026-10-20')];
    expect(get(stats({ entries: rows(dates) }), 'total-10').done).toBe(true);
  });
  it('semana completa exige lunes a domingo, no 7 días a caballo', () => {
    // 2026-11-09 es lunes: la semana 9–15 está completa
    expect(get(stats({ entries: rows(run(7)) }), 'full-week').done).toBe(true);
    // 7 seguidos de miércoles a martes: ninguna semana natural completa
    expect(get(stats({ entries: rows(run(7, '2026-11-10')) }), 'full-week').done).toBe(false);
  });
  it('mes casi perfecto: 25 en un mes natural', () => {
    const nov = Array.from({ length: 24 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    expect(get(stats({ entries: rows(nov) }), 'almost-perfect-month').done).toBe(false);
    expect(get(stats({ entries: rows([...nov, '2026-10-25']) }), 'almost-perfect-month').done).toBe(true);
    // 25 repartidos en dos meses no valen
    const split = [...run(13, '2026-10-31'), ...run(12, '2026-11-12')];
    expect(get(stats({ entries: rows(split) }), 'almost-perfect-month').done).toBe(false);
  });
  it('has vuelto: hueco de 7 días en blanco sí, 6 no', () => {
    expect(get(stats({ entries: rows(['2026-11-01', '2026-11-09']) }), 'comeback').done).toBe(true); // 7 en blanco
    expect(get(stats({ entries: rows(['2026-11-01', '2026-11-08']) }), 'comeback').done).toBe(false); // 6 en blanco
  });
  it('día completo: 5 franjas distintas', () => {
    const meals4 = ['desayuno', 'comida', 'merienda', 'cena'].map((m) => entry(TODAY, { meal: m }));
    expect(get(stats({ entries: meals4 }), 'full-day').done).toBe(false);
    expect(get(stats({ entries: [...meals4, entry(TODAY, { meal: 'snacks' })] }), 'full-day').done).toBe(true);
  });
  it('desayunador: 7 desayunos seguidos; un día sin desayuno corta', () => {
    const d = run(7);
    expect(get(stats({ entries: rows(d, { meal: 'desayuno' }) }), 'breakfast-7').done).toBe(true);
    const cut = [...rows(d.slice(0, 3), { meal: 'desayuno' }), entry(d[3], { meal: 'cena' }), ...rows(d.slice(4), { meal: 'desayuno' })];
    expect(get(stats({ entries: cut }), 'breakfast-7').done).toBe(false);
  });
  it('ignora entradas futuras', () => {
    expect(get(stats({ entries: rows([addDays(TODAY, 1)]) }), 'first-entry').done).toBe(false);
  });
});

describe('objetivos', () => {
  const one = (over: Partial<EntryRow>) => stats({ entries: [entry(TODAY, over)] });

  it('en la diana: 90 % y 110 % valen, 89 % y 111 % no', () => {
    expect(get(one({ kcal: 1800 }), 'on-target').done).toBe(true);
    expect(get(one({ kcal: 2200 }), 'on-target').done).toBe(true);
    expect(get(one({ kcal: 1780 }), 'on-target').done).toBe(false);
    expect(get(one({ kcal: 2220 }), 'on-target').done).toBe(false);
  });
  it('sin objetivos no se consiguen', () => {
    const s = stats({ goals: null, entries: [entry(TODAY)] });
    for (const a of ACHIEVEMENTS.filter((x) => x.needsGoals)) expect(get(s, a.id).done).toBe(false);
  });
  it('proteína: 90 % vale, 89 % no; pasarse sí vale', () => {
    expect(get(one({ protein: 90 }), 'protein-day').done).toBe(true);
    expect(get(one({ protein: 89 }), 'protein-day').done).toBe(false);
    expect(get(one({ protein: 200 }), 'protein-day').done).toBe(true);
  });
  it('todo en su sitio exige calorías y cada macro', () => {
    expect(get(one({}), 'all-macros').done).toBe(true);
    expect(get(one({ carbs: 100 }), 'all-macros').done).toBe(false);
    expect(get(one({ fat: 10 }), 'all-macros').done).toBe(false);
    expect(get(one({ protein: 150 }), 'all-macros').done).toBe(false);
  });
  it('un macro con objetivo 0 se ignora', () => {
    const s = stats({ goals: { ...GOALS, fat: 0 }, entries: [entry(TODAY, { fat: 999 })] });
    expect(get(s, 'all-macros').done).toBe(true);
  });
  it('un macro con objetivo 0 se ignora también en carbohidratos y proteína', () => {
    const s = stats({ goals: { ...GOALS, carbs: 0, protein: 0 }, entries: [entry(TODAY, { carbs: 999, protein: 999 })] });
    expect(get(s, 'all-macros').done).toBe(true);
    expect(get(s, 'protein-day').done).toBe(false); // sin objetivo de proteína no hay nada que cumplir
  });
  it('los días futuros no cuentan para los objetivos', () => {
    expect(get(stats({ entries: [entry(addDays(TODAY, 1))] }), 'on-target').done).toBe(false);
  });
  it('suma las entradas del día', () => {
    const s = stats({ entries: [entry(TODAY, { kcal: 1000 }), entry(TODAY, { kcal: 1000, meal: 'cena' })] });
    expect(get(s, 'on-target').done).toBe(true);
  });
  it('tres en la diana: seguidos; un día fuera lo corta', () => {
    expect(get(stats({ entries: rows(run(3)) }), 'three-on-target').done).toBe(true);
    const gap = [...rows(run(2)), entry(addDays(TODAY, -2), { kcal: 500 }), ...rows([addDays(TODAY, -3)])];
    expect(get(stats({ entries: gap }), 'three-on-target').done).toBe(false);
    // dos días buenos separados por un día sin registro tampoco son seguidos
    expect(get(stats({ entries: rows([TODAY, addDays(TODAY, -2), addDays(TODAY, -3)]) }), 'three-on-target').done).toBe(false);
  });
  it('semana en la diana: 5 de la misma semana natural', () => {
    const week = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
    expect(get(stats({ entries: rows(week) }), 'week-on-target').done).toBe(false);
    expect(get(stats({ entries: rows([...week, '2026-11-13']) }), 'week-on-target').done).toBe(true);
    // 5 buenos repartidos entre dos semanas no valen
    expect(get(stats({ entries: rows(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']) }), 'week-on-target').done).toBe(false);
  });
  it('semana de proteína: 5 días', () => {
    const w = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
    expect(get(stats({ entries: rows(w.slice(0, 4), { kcal: 100 }) }), 'protein-week').done).toBe(false);
    expect(get(stats({ entries: rows(w, { kcal: 100 }) }), 'protein-week').done).toBe(true);
  });
  it('no hay logros de comer poco: 500 kcal no cuenta como en la diana', () => {
    expect(get(one({ kcal: 500 }), 'on-target').done).toBe(false);
  });
});

describe('peso', () => {
  const w = (dates: string[]) => dates.map((date) => ({ date, kg: 70 }));
  it('primera pesada', () => {
    expect(get(stats({ weights: w([TODAY]) }), 'first-weight').done).toBe(true);
  });
  it('constancia: 4 semanas naturales seguidas; un salto la corta', () => {
    expect(get(stats({ weights: w(['2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10']) }), 'weigh-weekly-4').done).toBe(true);
    expect(get(stats({ weights: w(['2026-10-20', '2026-10-27', '2026-11-10', '2026-11-11']) }), 'weigh-weekly-4').done).toBe(false);
    // varias pesadas en una semana cuentan como una
    expect(get(stats({ weights: w(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']) }), 'weigh-weekly-4').done).toBe(false);
  });
  it('10 y 30 pesos', () => {
    expect(get(stats({ weights: w(run(9)) }), 'weights-10').done).toBe(false);
    expect(get(stats({ weights: w(run(10)) }), 'weights-10').done).toBe(true);
    expect(get(stats({ weights: w(run(29)) }), 'weights-30').done).toBe(false);
    expect(get(stats({ weights: w(run(30)) }), 'weights-30').done).toBe(true);
  });
  it('no hay logros por perder kilos', () => {
    const ids = ACHIEVEMENTS.filter((a) => a.group === 'peso').map((a) => a.id);
    const s = stats({ weights: [{ date: '2026-10-01', kg: 90 }, { date: TODAY, kg: 60 }] });
    expect(ids.filter((id) => get(s, id).done)).toEqual(['first-weight']);
  });
});

describe('descubrir la app', () => {
  it('favoritos, alimento propio y ración', () => {
    expect(get(stats({ favoritesCount: 1 }), 'first-favorite').done).toBe(true);
    expect(get(stats({ favoritesCount: 9 }), 'favorites-10').done).toBe(false);
    expect(get(stats({ favoritesCount: 10 }), 'favorites-10').done).toBe(true);
    expect(get(stats({ customFoodsCount: 1 }), 'first-custom-food').done).toBe(true);
    expect(get(stats({ servingsCount: 1 }), 'first-serving').done).toBe(true);
  });
  it('variedad: 20 alimentos distintos en una semana natural', () => {
    const foods = (n: number, date: string) => Array.from({ length: n }, (_, i) => entry(date, { food_name: `A${i}` }));
    expect(get(stats({ entries: foods(19, TODAY) }), 'variety-20').done).toBe(false);
    expect(get(stats({ entries: foods(20, TODAY) }), 'variety-20').done).toBe(true);
    // repetir el mismo alimento no suma
    expect(get(stats({ entries: rows(run(7)) }), 'variety-20').current).toBe(1);
    // 10 en una semana y 10 en otra no valen
    expect(get(stats({ entries: [...foods(10, '2026-11-02'), ...foods(10, '2026-11-09').map((e) => ({ ...e, food_name: `B${e.food_name}` }))] }), 'variety-20').done).toBe(false);
  });
  it('el mismo nombre con otra marca es otro alimento', () => {
    const s = stats({ entries: [entry(TODAY), entry(TODAY, { food_brand: 'Hacendado' })] });
    expect(get(s, 'variety-20').current).toBe(2);
  });
});

describe('bannerText', () => {
  it('sin logros nuevos, nada', () => {
    expect(bannerText([])).toBe('');
    expect(bannerText(['no-existe'])).toBe('');
  });
  it('uno: con su nombre', () => {
    expect(bannerText(['streak-7'])).toContain('Una semana seguida');
  });
  it('varios: cuenta y lista los 3 primeros, y dice cuántos más', () => {
    const t = bannerText(['first-entry', 'streak-3', 'streak-7', 'total-10', 'full-day']);
    expect(t).toContain('5 logros');
    expect(t).toContain('y 2 más');
    expect(t).not.toContain('Día completo');
    expect(bannerText(['first-entry', 'streak-3', 'streak-7'])).not.toContain('más');
  });
});
