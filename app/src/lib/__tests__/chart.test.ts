import { describe, expect, it } from 'vitest';

import { barLayout, lineLayout } from '@/lib/chart';

const size = { width: 360, height: 170 };
const pad = { left: 38, top: 8, bottom: 22 };
const bars = (values: (number | null)[]) => values.map((value, i) => ({ key: `d${i}`, value }));

describe('barras', () => {
  it('hay una barra por día y todas caben dentro del área de dibujo', () => {
    for (const n of [1, 7, 30, 90]) {
      const l = barLayout(bars(Array.from({ length: n }, (_, i) => 1500 + i * 10)), 2000, size, pad);
      expect(l.bars).toHaveLength(n);
      for (const b of l.bars) {
        expect(b.width).toBeGreaterThan(0);
        expect(b.height).toBeGreaterThan(0);
        expect(b.x).toBeGreaterThanOrEqual(pad.left - 1e-9);
        expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1e-9);
        expect(b.y).toBeGreaterThanOrEqual(l.topY - 1e-9);
        expect(b.y + b.height).toBeLessThanOrEqual(l.baseY + 1e-9);
      }
    }
  });

  it('una barra más alta ocupa más alto, y las barras no se solapan', () => {
    const l = barLayout(bars([1000, 2000, 1500]), null, size, pad);
    expect(l.bars[1].height).toBeGreaterThan(l.bars[0].height);
    expect(l.bars[1].height).toBeGreaterThan(l.bars[2].height);
    for (let i = 1; i < l.bars.length; i++) expect(l.bars[i].x).toBeGreaterThanOrEqual(l.bars[i - 1].x + l.bars[i - 1].width);
  });

  it('el eje llega al número limpio siguiente al máximo, o al objetivo si es mayor', () => {
    expect(barLayout(bars([1850]), null, size, pad).yMax).toBe(2000);
    expect(barLayout(bars([1200]), 2400, size, pad).yMax).toBe(2500);
    expect(barLayout(bars([3100]), 2000, size, pad).yMax).toBe(3500);
  });

  it('un día sin registro es una marca fina en la base, no una barra', () => {
    const l = barLayout(bars([1800, null, 2200]), 2000, size, pad);
    expect(l.bars[1].missing).toBe(true);
    expect(l.bars[1].height).toBe(2);
    expect(l.bars[1].y + l.bars[1].height).toBeCloseTo(l.baseY);
    expect(l.bars[0].missing).toBe(false);
  });

  it('un día de 0 kcal registrado no se confunde con un día sin registro', () => {
    const l = barLayout(bars([0, null]), 2000, size, pad);
    expect(l.bars[0].missing).toBe(false);
    expect(l.bars[1].missing).toBe(true);
  });

  it('marca las barras que pasan del objetivo (igual no cuenta)', () => {
    const l = barLayout(bars([1999, 2000, 2001]), 2000, size, pad);
    expect(l.bars.map((b) => b.over)).toEqual([false, false, true]);
    expect(barLayout(bars([9999]), null, size, pad).bars[0].over).toBe(false); // sin objetivo no hay "pasarse"
  });

  it('la línea del objetivo queda dentro del área y a la altura de su valor', () => {
    const l = barLayout(bars([1500]), 2000, size, pad);
    expect(l.goalY).not.toBeNull();
    expect(l.goalY!).toBeGreaterThanOrEqual(l.topY);
    expect(l.goalY!).toBeLessThanOrEqual(l.baseY);
    expect(barLayout(bars([1500]), null, size, pad).goalY).toBeNull();
    // el objetivo está más arriba que una barra de menos kcal
    expect(l.goalY!).toBeLessThan(l.bars[0].y);
  });

  it('las líneas de la cuadrícula van de la base al tope', () => {
    const l = barLayout(bars([1500]), 2000, size, pad);
    expect(l.grid.map((g) => g.value)).toEqual([0, l.yMax / 2, l.yMax]);
    expect(l.grid[0].y).toBeCloseTo(l.baseY);
    expect(l.grid[2].y).toBeCloseTo(l.topY);
  });

  it('no se rompe sin datos, sin ancho todavía, o con todo vacío', () => {
    expect(barLayout([], null, size, pad).bars).toEqual([]);
    const sinAncho = barLayout(bars([1500, 1600]), 2000, { width: 0, height: 170 }, pad);
    expect(sinAncho.bars.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.height))).toBe(true);
    const vacio = barLayout(bars([null, null]), null, size, pad);
    expect(vacio.yMax).toBeGreaterThan(0);
    expect(vacio.bars.every((b) => b.missing)).toBe(true);
  });
});

describe('línea de peso', () => {
  const pts = [
    { index: 0, value: 72 },
    { index: 10, value: 71 },
    { index: 29, value: 70 },
  ];

  it('los puntos caen dentro del área y un peso menor queda más abajo', () => {
    const l = lineLayout(30, pts, pts, 68, 74, size, pad);
    expect(l.dots).toHaveLength(3);
    for (const d of l.dots) {
      expect(d.x).toBeGreaterThanOrEqual(pad.left);
      expect(d.x).toBeLessThanOrEqual(size.width);
      expect(d.y).toBeGreaterThanOrEqual(pad.top);
      expect(d.y).toBeLessThanOrEqual(size.height - pad.bottom);
    }
    expect(l.dots[2].y).toBeGreaterThan(l.dots[0].y); // 70 kg está más abajo que 72 kg
    expect(l.dots[2].x).toBeGreaterThan(l.dots[0].x); // y más a la derecha (más reciente)
  });

  it('las columnas coinciden con las de las barras (mismo día, misma x)', () => {
    const b = barLayout(bars(Array.from({ length: 30 }, () => 1500)), 2000, size, { ...pad, right: 6 });
    const l = lineLayout(30, pts, pts, 68, 74, size, { ...pad, right: 6 });
    for (const d of l.dots) expect(d.x).toBeCloseTo(b.bars[d.index].x + b.bars[d.index].width / 2, 5);
  });

  it('la tendencia es un camino SVG con tantos tramos como puntos, y null con menos de dos', () => {
    const l = lineLayout(30, pts, pts, 68, 74, size, pad);
    expect(l.path).toMatch(/^M[\d.]+,[\d.]+( L[\d.]+,[\d.]+){2}$/);
    expect(lineLayout(30, pts.slice(0, 1), pts.slice(0, 1), 68, 74, size, pad).path).toBeNull();
    expect(lineLayout(30, [], [], 68, 74, size, pad).path).toBeNull();
  });

  it('con un solo día y un solo peso no divide por cero', () => {
    const l = lineLayout(1, [{ index: 0, value: 70 }], [], 69, 71, size, pad);
    expect(Number.isFinite(l.dots[0].x)).toBe(true);
    expect(Number.isFinite(l.dots[0].y)).toBe(true);
  });

  it('un peso en el máximo o el mínimo del eje queda en el borde, no fuera', () => {
    const l = lineLayout(7, [{ index: 3, value: 74 }, { index: 4, value: 68 }], [], 68, 74, size, pad);
    expect(l.dots[0].y).toBeCloseTo(pad.top);
    expect(l.dots[1].y).toBeCloseTo(size.height - pad.bottom);
  });
});
