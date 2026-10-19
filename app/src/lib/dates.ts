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
