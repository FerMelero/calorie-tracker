/** true si el texto es una fecha real con formato YYYY-MM-DD (rechaza 2026-02-31, por ejemplo). */
export function isValidISODate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** "Lunes 19 de octubre" a partir de "2026-10-19" (en hora local). */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Días que hay de `from` a `to` (fechas YYYY-MM-DD). Positivo si `to` es posterior. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  // A mediodía, para que el cambio de hora no afecte a la división
  const a = new Date(fy, fm - 1, fd, 12).getTime();
  const b = new Date(ty, tm - 1, td, 12).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "Ayer", "Anteayer" o la fecha larga ("Lunes 19 de octubre"). */
export function relativeDayLabel(iso: string, todayIso: string): string {
  const diff = daysBetween(iso, todayIso);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff === 2) return 'Anteayer';
  return formatLongDate(iso);
}

/** Suma (o resta, con negativos) días a una fecha YYYY-MM-DD, en hora local y sin problemas de cambio de hora. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days, 12);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "8 nov" a partir de "2026-11-08" (para los ejes de las gráficas). */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
