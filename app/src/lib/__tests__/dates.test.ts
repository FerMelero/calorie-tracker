import { describe, expect, it } from 'vitest';

import { daysBetween, formatLongDate, isValidISODate, relativeDayLabel } from '@/lib/dates';

describe('fechas', () => {
  it('solo acepta fechas reales con formato AAAA-MM-DD', () => {
    expect(isValidISODate('2026-10-19')).toBe(true);
    expect(isValidISODate('2028-02-29')).toBe(true); // bisiesto
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-02-31')).toBe(false);
    expect(isValidISODate('19/10/2026')).toBe(false);
    expect(isValidISODate('2026-1-5')).toBe(false);
  });

  it('cuenta bien los días, también al cambiar la hora', () => {
    expect(daysBetween('2026-10-22', '2026-10-23')).toBe(1);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // cambio de hora de octubre
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // cambio de hora de marzo
    expect(daysBetween('2026-10-23', '2026-10-22')).toBe(-1);
  });

  it('etiqueta Hoy, Ayer y Anteayer, y da la fecha larga para el resto', () => {
    expect(relativeDayLabel('2026-10-23', '2026-10-23')).toBe('Hoy');
    expect(relativeDayLabel('2026-10-22', '2026-10-23')).toBe('Ayer');
    expect(relativeDayLabel('2026-10-21', '2026-10-23')).toBe('Anteayer');
    expect(relativeDayLabel('2026-10-10', '2026-10-23')).toMatch(/^Sábado,? 10 de octubre$/);
  });

  it('la fecha larga empieza en mayúscula', () => {
    expect(formatLongDate('2026-10-19')).toMatch(/^Lunes,? 19 de octubre$/);
  });
});
