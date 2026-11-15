import { describe, expect, it } from 'vitest';

import { addDays } from '@/lib/dates';
import { computeStreak, GRACE_EVERY_DAYS, MAX_GRACE, recentDays, streakMessage, weekDots, type StreakInfo } from '@/lib/streaks';

const TODAY = '2026-11-15'; // domingo
/** Fechas de los N días terminando en `end` (incluido). */
const run = (end: string, n: number) => Array.from({ length: n }, (_, i) => addDays(end, -i));

describe('racha: lo básico', () => {
  it('sin registros no hay nada', () => {
    const s = computeStreak([], TODAY);
    expect(s).toMatchObject({ current: 0, longest: 0, totalDays: 0, loggedToday: false, atRisk: false, lastLogged: null });
  });

  it('un solo día, hoy: racha de 1 y activa', () => {
    const s = computeStreak([TODAY], TODAY);
    expect(s).toMatchObject({ current: 1, longest: 1, loggedToday: true, atRisk: false, totalDays: 1, lastLogged: TODAY });
  });

  it('días seguidos hasta hoy suman uno por día', () => {
    expect(computeStreak(run(TODAY, 5), TODAY).current).toBe(5);
  });

  it('las fechas repetidas no suman dos veces', () => {
    expect(computeStreak([TODAY, TODAY, TODAY], TODAY).totalDays).toBe(1);
  });

  it('el orden de las fechas no importa', () => {
    const a = computeStreak(run(TODAY, 6), TODAY);
    const b = computeStreak([...run(TODAY, 6)].reverse(), TODAY);
    expect(b).toEqual(a);
  });

  it('las fechas futuras no cuentan', () => {
    const s = computeStreak([TODAY, addDays(TODAY, 1), addDays(TODAY, 5)], TODAY);
    expect(s.current).toBe(1);
    expect(s.totalDays).toBe(1);
  });
});

describe('racha: el día de hoy', () => {
  it('hoy sin registrar no rompe la racha: queda "en juego"', () => {
    const s = computeStreak(run(addDays(TODAY, -1), 4), TODAY); // ayer y los 3 anteriores
    expect(s.current).toBe(4);
    expect(s.loggedToday).toBe(false);
    expect(s.atRisk).toBe(true);
  });

  it('registrar hoy la suma y deja de estar en riesgo', () => {
    const antes = computeStreak(run(addDays(TODAY, -1), 4), TODAY);
    const despues = computeStreak([TODAY, ...run(addDays(TODAY, -1), 4)], TODAY);
    expect(despues.current).toBe(antes.current + 1);
    expect(despues.atRisk).toBe(false);
  });

  it('si ayer no se registró y no hay gracia, la racha ya está rota al empezar hoy', () => {
    const s = computeStreak(run(addDays(TODAY, -2), 3), TODAY); // anteayer y los 2 anteriores; ayer no
    expect(s.current).toBe(0);
    expect(s.atRisk).toBe(false);
    expect(s.longest).toBe(3);
  });

  it('empezar de nuevo tras una racha rota arranca en 1 sin perder la mejor', () => {
    const viejo = run(addDays(TODAY, -10), 6);
    const s = computeStreak([TODAY, ...viejo], TODAY);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(6);
    expect(s.totalDays).toBe(7);
  });
});

describe('racha: día de gracia', () => {
  it('una racha de 7 días gana un día de gracia', () => {
    expect(GRACE_EVERY_DAYS).toBe(7);
    expect(computeStreak(run(TODAY, 7), TODAY).graceStock).toBe(1);
    expect(computeStreak(run(TODAY, 6), TODAY).graceStock).toBe(0);
  });

  it('con 14 días hay dos; y nunca más del máximo', () => {
    expect(computeStreak(run(TODAY, 14), TODAY).graceStock).toBe(2);
    expect(MAX_GRACE).toBe(2);
    expect(computeStreak(run(TODAY, 40), TODAY).graceStock).toBe(MAX_GRACE);
  });

  it('un día perdido con gracia no rompe la racha, y el día perdonado no suma', () => {
    // 7 días seguidos, un día en blanco, y 2 días más hasta hoy
    const fechas = [...run(addDays(TODAY, -3), 7), TODAY, addDays(TODAY, -1)];
    // días: -9..-3 registrados (7), -2 en blanco, -1 y 0 registrados
    const s = computeStreak(fechas, TODAY);
    expect(s.current).toBe(9); // 7 + 2: el día perdonado no cuenta
    expect(s.graceStock).toBe(0); // ganó 1 al llegar a 7 y la gastó
  });

  it('el día perdonado se nota: sin gracia, el mismo hueco rompe la racha', () => {
    const fechas = [...run(addDays(TODAY, -3), 5), TODAY, addDays(TODAY, -1)]; // solo 5 días antes del hueco
    const s = computeStreak(fechas, TODAY);
    expect(s.current).toBe(2); // el hueco la rompió; después, 2 días
    expect(s.longest).toBe(5);
  });

  it('dos días seguidos sin registrar con una sola gracia sí rompen la racha', () => {
    const fechas = [...run(addDays(TODAY, -4), 7), TODAY]; // hueco de 3 días: -3, -2, -1 (hoy sí)
    const s = computeStreak(fechas, TODAY);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(7);
    expect(s.graceStock).toBe(0);
  });

  it('tres días en blanco seguidos rompen la racha aunque haya dos gracias guardadas', () => {
    const base = run(addDays(TODAY, -4), 14); // 14 días → 2 gracias
    const s = computeStreak([...base, TODAY], TODAY); // huecos: -3, -2, -1
    expect(s.current).toBe(1); // las dos gracias no alcanzan para tres huecos
    expect(s.graceStock).toBe(0);
    expect(s.longest).toBe(14);
  });

  it('dos huecos con dos gracias: la racha sigue', () => {
    const base = run(addDays(TODAY, -3), 14); // 14 días → 2 gracias; huecos: -2 y -1
    const s = computeStreak([...base, TODAY], TODAY);
    expect(s.current).toBe(15);
    expect(s.graceStock).toBe(0);
  });

  it('tras romperse, la gracia empieza de cero y hay que ganarla otra vez', () => {
    const viejo = run(addDays(TODAY, -20), 14); // 14 días: 2 gracias… y luego un hueco largo la rompe
    const s = computeStreak([TODAY, ...viejo], TODAY);
    expect(s.current).toBe(1);
    expect(s.graceStock).toBe(0);
  });

  it('el día en blanco de hoy no gasta gracia', () => {
    const s = computeStreak(run(addDays(TODAY, -1), 7), TODAY); // 7 días hasta ayer; hoy en juego
    expect(s.current).toBe(7);
    expect(s.graceStock).toBe(1);
    expect(s.atRisk).toBe(true);
  });
});

describe('racha: casos largos y cambios de hora', () => {
  it('una racha de un año seguido da 365 y no es lenta', () => {
    const t = Date.now();
    const s = computeStreak(run(TODAY, 365), TODAY);
    expect(s.current).toBe(365);
    expect(s.longest).toBe(365);
    expect(Date.now() - t).toBeLessThan(500);
  });

  it('cruzar el cambio de hora no deja huecos ni los inventa', () => {
    // 2026-10-25 es el fin del horario de verano en España; también 2026-03-29
    const otono = computeStreak(run('2026-10-28', 8), '2026-10-28');
    expect(otono.current).toBe(8);
    const primavera = computeStreak(run('2026-04-02', 8), '2026-04-02');
    expect(primavera.current).toBe(8);
  });

  it('un historial de años con huecos no se rompe', () => {
    const fechas = [...run('2024-03-10', 30), ...run('2025-06-01', 100), ...run(TODAY, 3)];
    const s = computeStreak(fechas, TODAY);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(100);
    expect(s.totalDays).toBe(133);
  });
});

describe('puntos de la semana', () => {
  it('siempre son siete, de lunes a domingo, y hoy está marcado', () => {
    const d = weekDots([TODAY], TODAY); // el 15 de noviembre de 2026 es domingo
    expect(d.map((x) => x.label)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
    expect(d[0].date).toBe('2026-11-09'); // el lunes de esa semana
    expect(d[6].date).toBe(TODAY);
    expect(d.filter((x) => x.isToday)).toHaveLength(1);
    expect(d[6].isToday).toBe(true);
    expect(d.every((x) => !x.isFuture)).toBe(true);
  });

  it('a mitad de semana, los días que faltan son futuros', () => {
    const miercoles = '2026-11-11';
    const d = weekDots([], miercoles);
    expect(d.map((x) => x.isFuture)).toEqual([false, false, false, true, true, true, true]);
    expect(d[2].isToday).toBe(true);
  });

  it('marca los registrados, incluso de otras semanas ignorando los que no son de esta', () => {
    const d = weekDots(['2026-11-09', '2026-11-11', '2026-11-02'], '2026-11-12');
    expect(d.map((x) => x.logged)).toEqual([true, false, true, false, false, false, false]);
  });

  it('la semana cambia en lunes', () => {
    expect(weekDots([], '2026-11-16')[0].date).toBe('2026-11-16'); // lunes
    expect(weekDots([], '2026-11-15')[0].date).toBe('2026-11-09'); // domingo anterior
  });
});

describe('últimos días (calendario)', () => {
  it('devuelve N días terminando hoy, ordenados', () => {
    const d = recentDays([TODAY, addDays(TODAY, -2)], TODAY, 5);
    expect(d).toHaveLength(5);
    expect(d[4].date).toBe(TODAY);
    expect(d[0].date).toBe(addDays(TODAY, -4));
    expect(d.map((x) => x.logged)).toEqual([false, false, true, false, true]);
  });
});

describe('streakMessage', () => {
  const info = (over: Partial<StreakInfo>): StreakInfo => ({
    current: 0, longest: 0, graceStock: 0, loggedToday: false, atRisk: false, totalDays: 0, lastLogged: null, ...over,
  });
  it('sin historial invita a empezar', () => {
    expect(streakMessage(info({})).title).toBe('Empieza tu racha');
  });
  it('con racha: singular y plural, y avisa si hoy falta', () => {
    expect(streakMessage(info({ current: 1, loggedToday: true })).title).toBe('🔥 1 día');
    const m = streakMessage(info({ current: 5, atRisk: true }));
    expect(m.title).toBe('🔥 5 días');
    expect(m.subtitle).toContain('hoy');
    expect(streakMessage(info({ current: 5, loggedToday: true })).subtitle).toContain('Hoy ya cuenta');
  });
  it('racha rota: anima sin culpar y recuerda la mejor', () => {
    const m = streakMessage(info({ totalDays: 20, longest: 9 }));
    expect(m.title).toBe('Empieza una racha');
    expect(m.subtitle).toContain('9 días');
  });
});
