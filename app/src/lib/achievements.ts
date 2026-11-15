/**
 * Logros. Cada uno es una función sobre un resumen de los datos del usuario (`Stats`), así que se
 * pueden probar con historiales inventados, sin móvil ni base de datos.
 *
 * Criterio de fondo: se premia el HÁBITO (registrar, pesarse, usar la app), nunca el resultado
 * (comer poco, perder peso, saltarse comidas). Por eso no hay logros de déficit, de kilos perdidos
 * ni de días con pocas calorías, y los de objetivos tienen un mínimo además de un máximo.
 */

import { daysBetween, weekStart } from '@/lib/dates';
import { foodKey } from '@/lib/food-key';
import { computeStreak, type StreakInfo } from '@/lib/streaks';

export type EntryRow = {
  date: string;
  meal: string;
  food_source: string;
  food_name: string;
  food_brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Stats = {
  today: string;
  entries: EntryRow[];
  weights: { date: string; kg: number }[];
  goals: { kcal: number; protein: number; carbs: number; fat: number } | null;
  favoritesCount: number;
  customFoodsCount: number;
  /** Raciones definidas por el usuario */
  servingsCount: number;
};

export type Group = 'constancia' | 'objetivos' | 'peso' | 'app';

export const GROUP_LABELS: Record<Group, string> = {
  constancia: 'Constancia',
  objetivos: 'Objetivos',
  peso: 'Peso',
  app: 'Descubrir la app',
};

export type Result = {
  done: boolean;
  /** Lo que llevas, para la barra de avance (puede pasar de `target`; la pantalla lo recorta) */
  current: number;
  target: number;
};

export type Achievement = {
  id: string;
  group: Group;
  emoji: string;
  title: string;
  description: string;
  /** Solo se puede conseguir si el usuario ha definido sus objetivos */
  needsGoals?: boolean;
  evaluate: (ctx: Context) => Result;
};

// ---------------------------------------------------------------- contexto: lo que se calcula una vez

type DayAgg = {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: Set<string>;
  foods: Set<string>;
};

export type Context = {
  stats: Stats;
  /** Días con registros (hasta hoy), de más antiguo a más reciente */
  days: DayAgg[];
  loggedDates: string[];
  streak: StreakInfo;
};

export function buildContext(stats: Stats): Context {
  const byDate = new Map<string, DayAgg>();
  for (const e of stats.entries) {
    if (e.date > stats.today) continue; // lo futuro no cuenta
    let day = byDate.get(e.date);
    if (!day) {
      day = { date: e.date, kcal: 0, protein: 0, carbs: 0, fat: 0, meals: new Set(), foods: new Set() };
      byDate.set(e.date, day);
    }
    day.kcal += e.kcal;
    day.protein += e.protein;
    day.carbs += e.carbs;
    day.fat += e.fat;
    day.meals.add(e.meal);
    day.foods.add(foodKey({ source: e.food_source, name: e.food_name, brand: e.food_brand }));
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const loggedDates = days.map((d) => d.date);
  return { stats, days, loggedDates, streak: computeStreak(loggedDates, stats.today) };
}

// ---------------------------------------------------------------- utilidades

const EPS = 1e-9;

/** El valor está dentro de ±tol del objetivo (objetivo 0 = sin referencia, no se puede cumplir). */
function within(value: number, goal: number, tol: number): boolean {
  return goal > 0 && value >= goal * (1 - tol) - EPS && value <= goal * (1 + tol) + EPS;
}

/** Racha más larga de días consecutivos dentro de una lista de fechas ordenadas. */
function longestDayRun(sortedDates: string[]): number {
  let best = 0;
  let run = 0;
  sortedDates.forEach((d, i) => {
    run = i > 0 && daysBetween(sortedDates[i - 1], d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** Cuántas fechas hay en cada semana (de lunes a domingo). Clave: el lunes. */
function countByWeek(dates: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(weekStart(d), (counts.get(weekStart(d)) ?? 0) + 1);
  return counts;
}

const maxOf = (values: Iterable<number>) => Math.max(0, ...values);

/** Resultado de "llegar a un número": done al alcanzarlo. */
const reach = (current: number, target: number): Result => ({ done: current >= target, current, target });
/** Resultado de un hito de una sola vez (sin barra de avance). */
const once = (done: boolean): Result => ({ done, current: done ? 1 : 0, target: 1 });

/** Días que cumplen una condición sobre los objetivos; vacío si no hay objetivos. */
function daysMeeting(ctx: Context, test: (d: DayAgg, g: NonNullable<Stats['goals']>) => boolean): string[] {
  const goals = ctx.stats.goals;
  return goals ? ctx.days.filter((d) => test(d, goals)).map((d) => d.date) : [];
}

const onTarget = (d: DayAgg, g: NonNullable<Stats['goals']>) => within(d.kcal, g.kcal, 0.1);
const proteinMet = (d: DayAgg, g: NonNullable<Stats['goals']>) => g.protein > 0 && d.protein >= g.protein * 0.9 - EPS;
const allMacros = (d: DayAgg, g: NonNullable<Stats['goals']>) =>
  within(d.kcal, g.kcal, 0.1) &&
  // un macro con objetivo 0 no tiene referencia: se ignora en lugar de exigir 0 exacto
  (g.protein <= 0 || within(d.protein, g.protein, 0.1)) &&
  (g.carbs <= 0 || within(d.carbs, g.carbs, 0.1)) &&
  (g.fat <= 0 || within(d.fat, g.fat, 0.1));

// ---------------------------------------------------------------- los logros

const streakAchievement = (days: number, emoji: string, title: string): Achievement => ({
  id: `streak-${days}`,
  group: 'constancia',
  emoji,
  title,
  description: `Registra comidas ${days} días seguidos.`,
  evaluate: (c) => reach(c.streak.longest, days),
});

const totalAchievement = (days: number, emoji: string): Achievement => ({
  id: `total-${days}`,
  group: 'constancia',
  emoji,
  title: `${days} días registrados`,
  description: `Suma ${days} días con comidas registradas, seguidos o no. Esto no se pierde si se rompe la racha.`,
  evaluate: (c) => reach(c.streak.totalDays, days),
});

export const ACHIEVEMENTS: Achievement[] = [
  // ---------------------------------------------------------------- constancia
  {
    id: 'first-entry', group: 'constancia', emoji: '🌱', title: 'Primer paso',
    description: 'Registra tu primera comida.',
    evaluate: (c) => reach(c.streak.totalDays, 1),
  },
  streakAchievement(3, '🔥', 'Racha de 3 días'),
  streakAchievement(7, '🔥', 'Una semana seguida'),
  streakAchievement(14, '🔥', 'Dos semanas seguidas'),
  streakAchievement(30, '🔥', 'Un mes seguido'),
  streakAchievement(60, '🔥', 'Dos meses seguidos'),
  streakAchievement(100, '💯', '100 días seguidos'),
  {
    id: 'full-week', group: 'constancia', emoji: '📅', title: 'Semana completa',
    description: 'Registra los 7 días de una semana, de lunes a domingo.',
    evaluate: (c) => reach(maxOf(countByWeek(c.loggedDates).values()), 7),
  },
  {
    id: 'almost-perfect-month', group: 'constancia', emoji: '🗓️', title: 'Mes casi perfecto',
    description: 'Registra 25 días en un mismo mes.',
    evaluate: (c) => {
      const perMonth = new Map<string, number>();
      for (const d of c.loggedDates) perMonth.set(d.slice(0, 7), (perMonth.get(d.slice(0, 7)) ?? 0) + 1);
      return reach(maxOf(perMonth.values()), 25);
    },
  },
  totalAchievement(10, '✨'),
  totalAchievement(30, '✨'),
  totalAchievement(100, '🌟'),
  totalAchievement(365, '🏆'),
  {
    id: 'comeback', group: 'constancia', emoji: '👋', title: 'Has vuelto',
    description: 'Vuelve a registrar tras 7 días o más sin hacerlo. Retomar también cuenta.',
    evaluate: (c) =>
      // entre dos días registrados seguidos en el historial hay 7 o más días en blanco
      once(c.loggedDates.some((d, i) => i > 0 && daysBetween(c.loggedDates[i - 1], d) - 1 >= 7)),
  },
  {
    id: 'full-day', group: 'constancia', emoji: '🍽️', title: 'Día completo',
    description: 'Registra algo en las 5 franjas el mismo día.',
    evaluate: (c) => reach(maxOf(c.days.map((d) => d.meals.size)), 5),
  },
  {
    id: 'breakfast-7', group: 'constancia', emoji: '🥐', title: 'Desayunador',
    description: 'Registra el desayuno 7 días seguidos.',
    evaluate: (c) => reach(longestDayRun(c.days.filter((d) => d.meals.has('desayuno')).map((d) => d.date)), 7),
  },

  // ---------------------------------------------------------------- objetivos
  {
    id: 'on-target', group: 'objetivos', emoji: '🎯', title: 'En la diana', needsGoals: true,
    description: 'Un día entre el 90 % y el 110 % de tus calorías.',
    evaluate: (c) => once(daysMeeting(c, onTarget).length > 0),
  },
  {
    id: 'protein-day', group: 'objetivos', emoji: '💪', title: 'Proteína cumplida', needsGoals: true,
    description: 'Llega al menos al 90 % de tu objetivo de proteína en un día.',
    evaluate: (c) => once(daysMeeting(c, proteinMet).length > 0),
  },
  {
    id: 'protein-week', group: 'objetivos', emoji: '💪', title: 'Semana de proteína', needsGoals: true,
    description: 'Cumple tu proteína 5 días de una misma semana.',
    evaluate: (c) => reach(maxOf(countByWeek(daysMeeting(c, proteinMet)).values()), 5),
  },
  {
    id: 'all-macros', group: 'objetivos', emoji: '🏅', title: 'Todo en su sitio', needsGoals: true,
    description: 'Calorías y macros dentro del ±10 % de tu objetivo el mismo día.',
    evaluate: (c) => once(daysMeeting(c, allMacros).length > 0),
  },
  {
    id: 'three-on-target', group: 'objetivos', emoji: '🎯', title: 'Tres en la diana', needsGoals: true,
    description: '3 días seguidos entre el 90 % y el 110 % de tus calorías.',
    evaluate: (c) => reach(longestDayRun(daysMeeting(c, onTarget)), 3),
  },
  {
    id: 'week-on-target', group: 'objetivos', emoji: '🏆', title: 'Semana en la diana', needsGoals: true,
    description: '5 días de una misma semana entre el 90 % y el 110 % de tus calorías.',
    evaluate: (c) => reach(maxOf(countByWeek(daysMeeting(c, onTarget)).values()), 5),
  },

  // ---------------------------------------------------------------- peso (el hábito, no el resultado)
  {
    id: 'first-weight', group: 'peso', emoji: '⚖️', title: 'Primera pesada',
    description: 'Registra tu peso por primera vez.',
    evaluate: (c) => reach(c.stats.weights.length, 1),
  },
  {
    id: 'weigh-weekly-4', group: 'peso', emoji: '⚖️', title: 'Constancia en la báscula',
    description: 'Pésate al menos una vez a la semana durante 4 semanas seguidas.',
    evaluate: (c) => {
      const weeks = [...countByWeek(c.stats.weights.filter((w) => w.date <= c.stats.today).map((w) => w.date)).keys()].sort();
      let best = 0;
      let run = 0;
      weeks.forEach((w, i) => {
        run = i > 0 && daysBetween(weeks[i - 1], w) === 7 ? run + 1 : 1;
        best = Math.max(best, run);
      });
      return reach(best, 4);
    },
  },
  {
    id: 'weights-10', group: 'peso', emoji: '📈', title: '10 pesos registrados',
    description: 'Registra 10 pesos en total.',
    evaluate: (c) => reach(c.stats.weights.length, 10),
  },
  {
    id: 'weights-30', group: 'peso', emoji: '📈', title: '30 pesos registrados',
    description: 'Registra 30 pesos en total.',
    evaluate: (c) => reach(c.stats.weights.length, 30),
  },

  // ---------------------------------------------------------------- descubrir la app
  {
    id: 'first-favorite', group: 'app', emoji: '⭐', title: 'Primer favorito',
    description: 'Marca un alimento como favorito.',
    evaluate: (c) => reach(c.stats.favoritesCount, 1),
  },
  {
    id: 'favorites-10', group: 'app', emoji: '⭐', title: '10 favoritos',
    description: 'Ten 10 alimentos favoritos.',
    evaluate: (c) => reach(c.stats.favoritesCount, 10),
  },
  {
    id: 'first-custom-food', group: 'app', emoji: '🥣', title: 'Cocinero',
    description: 'Crea tu primer alimento propio.',
    evaluate: (c) => reach(c.stats.customFoodsCount, 1),
  },
  {
    id: 'first-serving', group: 'app', emoji: '🥄', title: 'A tu medida',
    description: 'Define tu primera ración.',
    evaluate: (c) => reach(c.stats.servingsCount, 1),
  },
  {
    id: 'variety-20', group: 'app', emoji: '🥗', title: 'Variedad',
    description: 'Registra 20 alimentos distintos en una misma semana.',
    evaluate: (c) => {
      const perWeek = new Map<string, Set<string>>();
      for (const d of c.days) {
        const key = weekStart(d.date);
        const set = perWeek.get(key) ?? new Set<string>();
        d.foods.forEach((f) => set.add(f));
        perWeek.set(key, set);
      }
      return reach(maxOf([...perWeek.values()].map((s) => s.size)), 20);
    },
  },
];

export type Evaluated = { achievement: Achievement; result: Result };

/** Evalúa todos los logros sobre los datos del usuario. */
export function evaluateAll(stats: Stats): Evaluated[] {
  const ctx = buildContext(stats);
  return ACHIEVEMENTS.map((achievement) => ({ achievement, result: achievement.evaluate(ctx) }));
}

const MAX_TITLES = 3;

/** Texto del aviso: un logro con su nombre; varios (p. ej. la primera vez, con historial) agrupados. */
export function bannerText(ids: string[]): string {
  const found = ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter((a) => a !== undefined);
  if (found.length === 0) return '';
  if (found.length === 1) return `${found[0].emoji} Logro desbloqueado: ${found[0].title}`;
  const shown = found.slice(0, MAX_TITLES).map((a) => a.title).join(', ');
  const rest = found.length - MAX_TITLES;
  return `🏅 ${found.length} logros desbloqueados: ${shown}${rest > 0 ? ` y ${rest} más` : ''}`;
}
