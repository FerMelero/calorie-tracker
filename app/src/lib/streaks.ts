/**
 * Racha de días registrando, con "día de gracia". Sin dependencias de Expo, para poder probarla.
 *
 * Reglas (pensadas para premiar el hábito de registrar, no el resultado):
 *  - Un día cuenta si tiene al menos un registro. La racha son los días registrados seguidos.
 *  - El día de hoy sin registrar NO rompe la racha: sigue "en juego" hasta que acaba el día.
 *  - Cada 7 días registrados de la racha se gana un día de gracia (máximo 2 guardados). Si falta un
 *    día, se gasta uno y la racha sigue; el día perdonado no suma, pero tampoco rompe.
 *  - Si falta un día y no queda gracia, la racha vuelve a 0 y hay que volver a ganar la gracia.
 *  - Los días totales y la mejor racha no se pierden nunca.
 * Todo se calcula a partir de las fechas con registros: no hay nada que guardar.
 */

import { addDays, daysBetween, weekStart, weekdayIndex } from '@/lib/dates';

export const GRACE_EVERY_DAYS = 7;
export const MAX_GRACE = 2;

export type StreakInfo = {
  /** Días registrados seguidos (los días perdonados no suman) */
  current: number;
  /** La mejor racha de siempre */
  longest: number;
  /** Días de gracia que quedan */
  graceStock: number;
  loggedToday: boolean;
  /** Hay racha, pero hoy todavía no se ha registrado nada */
  atRisk: boolean;
  /** Días con algún registro, en total */
  totalDays: number;
  lastLogged: string | null;
};

export function computeStreak(loggedDates: string[], today: string): StreakInfo {
  // Las fechas futuras no cuentan; las repetidas, tampoco
  const logged = new Set(loggedDates.filter((d) => d <= today));
  if (logged.size === 0) {
    return { current: 0, longest: 0, graceStock: 0, loggedToday: false, atRisk: false, totalDays: 0, lastLogged: null };
  }
  const sorted = [...logged].sort();

  let streak = 0;
  let longest = 0;
  let stock = 0;
  const span = daysBetween(sorted[0], today);

  for (let i = 0; i <= span; i++) {
    const day = addDays(sorted[0], i);
    if (logged.has(day)) {
      streak += 1;
      longest = Math.max(longest, streak);
      if (streak % GRACE_EVERY_DAYS === 0) stock = Math.min(MAX_GRACE, stock + 1);
    } else if (day !== today && streak > 0) {
      // Falta un día de los pasados: se gasta una gracia o se rompe la racha
      if (stock > 0) stock -= 1;
      else streak = 0; // solo se rompe cuando no queda gracia, así que no hay gracia que perder
    }
  }

  const loggedToday = logged.has(today);
  return {
    current: streak,
    longest,
    graceStock: stock,
    loggedToday,
    atRisk: !loggedToday && streak > 0,
    totalDays: logged.size,
    lastLogged: sorted[sorted.length - 1],
  };
}

export type WeekDot = {
  date: string;
  /** L M X J V S D */
  label: string;
  logged: boolean;
  isToday: boolean;
  isFuture: boolean;
};

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Los siete días de la semana actual (de lunes a domingo) y cuáles están registrados. */
export function weekDots(loggedDates: string[], today: string): WeekDot[] {
  const logged = new Set(loggedDates);
  const monday = weekStart(today);
  return WEEK_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    return { date, label, logged: logged.has(date), isToday: date === today, isFuture: date > today };
  });
}

/** Los últimos `count` días (hasta hoy), de más antiguo a más reciente, con si están registrados. */
export function recentDays(loggedDates: string[], today: string, count: number): { date: string; logged: boolean }[] {
  const logged = new Set(loggedDates);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - (count - 1));
    return { date, logged: logged.has(date) };
  });
}

/** Texto de la racha según el estado.  */
export function streakMessage(s: StreakInfo): { title: string; subtitle: string } {
  if (s.current > 0) {
    return {
      title: `🔥 ${s.current} ${s.current === 1 ? 'día' : 'días'}`,
      subtitle: s.loggedToday ? 'Hoy ya cuenta. ¡Sigue así!' : 'Registra algo hoy para mantener la racha.',
    };
  }
  if (s.totalDays === 0) {
    return { title: 'Empieza tu racha', subtitle: 'Registra tu primera comida para empezar.' };
  }
  return {
    title: 'Empieza una racha',
    subtitle: s.longest > 1 ? `Tu mejor racha fue de ${s.longest} días. Hoy puedes empezar otra.` : 'Registra algo hoy para empezar otra.',
  };
}

export { weekdayIndex };
