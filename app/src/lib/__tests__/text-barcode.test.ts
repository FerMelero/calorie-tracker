import { describe, expect, it } from 'vitest';

import { barcodeKey, cleanBarcode } from '@/lib/barcode';
import { normalize, tokenize } from '@/lib/text';

describe('normalize / tokenize (deben coincidir con pipeline/02_build_db.py)', () => {
  it('quita tildes y mayúsculas, y la ñ pasa a n', () => {
    expect(normalize('Jamón Serrano')).toBe('jamon serrano');
    expect(normalize('PIÑA')).toBe('pina');
    expect(normalize('Ñandú')).toBe('nandu');
  });

  it('separa palabras y descarta símbolos', () => {
    expect(tokenize('  Jamón  serrano!! ')).toEqual(['jamon', 'serrano']);
    expect(tokenize('"; DROP TABLE foods; --')).toEqual(['drop', 'table', 'foods']);
    expect(tokenize('***')).toEqual([]);
  });
});

describe('códigos de barras', () => {
  it('limpia a solo dígitos y exige entre 6 y 14', () => {
    expect(cleanBarcode('8480000123456')).toBe('8480000123456');
    expect(cleanBarcode('84 8000')).toBe('848000');
    expect(cleanBarcode('12345')).toBeNull();
    expect(cleanBarcode('123456789012345')).toBeNull();
    expect(cleanBarcode('abc')).toBeNull();
  });

  it('un EAN-13 y su UPC de 12 dígitos tienen la misma clave', () => {
    expect(barcodeKey('0012345678905')).toBe(barcodeKey('12345678905'));
  });
});
