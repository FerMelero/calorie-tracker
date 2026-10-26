/** Deja solo los dígitos. Devuelve null si no parece un código de barras de producto (6 a 14 dígitos). */
export function cleanBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return /^\d{6,14}$/.test(digits) ? digits : null;
}

/**
 * Clave para comparar códigos: un EAN-13 y su versión UPC de 12 dígitos son el mismo código con
 * un cero delante, y en las bases de datos aparecen de las dos formas. Sin ceros delante coinciden.
 */
export function barcodeKey(code: string): string {
  return code.replace(/^0+/, '');
}
