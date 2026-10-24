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
