import { useCallback, useMemo, useState } from 'react';

import { evaluateAndUnlock, getLoggedDates } from '@/db/achievements';
import { getGamificationEnabled } from '@/db/settings';
import { todayISO } from '@/db/user';
import { computeStreak, weekDots } from '@/lib/streaks';

type State = {
  enabled: boolean;
  today: string;
  loggedDates: string[];
  /** Logros desbloqueados desde la última vez que se cerró el aviso */
  fresh: string[];
};

/**
 * Racha, semana y logros recién desbloqueados para la pantalla Hoy. `refresh` se llama cada vez que
 * el diario se recarga (al abrir la pantalla o tras añadir, editar o quitar algo): ahí se evalúan los
 * logros. Con "Mostrar rachas y logros" apagado no calcula nada.
 */
export function useProgression() {
  const [state, setState] = useState<State>({ enabled: true, today: todayISO(), loggedDates: [], fresh: [] });

  const refresh = useCallback(async () => {
    if (!(await getGamificationEnabled())) {
      setState((s) => ({ ...s, enabled: false, fresh: [] }));
      return;
    }
    const today = todayISO();
    const fresh = await evaluateAndUnlock(today);
    const loggedDates = await getLoggedDates();
    setState((s) => ({ enabled: true, today, loggedDates, fresh: [...s.fresh, ...fresh] }));
  }, []);

  const dismiss = useCallback(() => setState((s) => ({ ...s, fresh: [] })), []);

  const streak = useMemo(() => computeStreak(state.loggedDates, state.today), [state.loggedDates, state.today]);
  const dots = useMemo(() => weekDots(state.loggedDates, state.today), [state.loggedDates, state.today]);

  return { enabled: state.enabled, streak, dots, fresh: state.fresh, refresh, dismiss };
}
