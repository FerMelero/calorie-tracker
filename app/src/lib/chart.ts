/**
 * Geometría de las gráficas: dónde va cada barra, punto y línea dentro del área de dibujo.
 * Son funciones puras para poder probarlas sin pantalla; los componentes solo dibujan lo que sale de aquí.
 */

import { niceCeil, scale } from '@/lib/progress';

export type Size = { width: number; height: number };
export type Padding = { left: number; right?: number; top: number; bottom: number };

export type BarGeometry = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Ese día no se registró nada: se dibuja una marca fina en la base, no una barra */
  missing: boolean;
  /** Se pasó del objetivo */
  over: boolean;
};

export type BarLayout = {
  yMax: number;
  /** Ancho de cada columna (una por día) */
  slot: number;
  /** Coordenada y de la base (valor 0) y del tope (yMax) */
  baseY: number;
  topY: number;
  bars: BarGeometry[];
  goalY: number | null;
  grid: { value: number; y: number }[];
};

const MISSING_TICK = 2;

export function barLayout(
  items: { key: string; value: number | null }[],
  goal: number | null,
  size: Size,
  pad: Padding,
): BarLayout {
  const present = items.flatMap((b) => (b.value === null ? [] : [b.value]));
  const yMax = niceCeil(Math.max(...present, goal ?? 0, 1));
  const right = pad.right ?? 0;
  const innerW = Math.max(0, size.width - pad.left - right);
  const baseY = size.height - pad.bottom;
  const topY = pad.top;
  const slot = items.length > 0 ? innerW / items.length : 0;
  const width = Math.max(1.5, slot * 0.68);
  const y = (v: number) => scale(v, 0, yMax, baseY, topY);

  const bars = items.map((b, i) => {
    const x = pad.left + i * slot + (slot - width) / 2;
    if (b.value === null) return { key: b.key, x, y: baseY - MISSING_TICK, width, height: MISSING_TICK, missing: true, over: false };
    const top = y(b.value);
    return {
      key: b.key,
      x,
      y: top,
      width,
      height: Math.max(1, baseY - top),
      missing: false,
      over: goal !== null && b.value > goal,
    };
  });

  return {
    yMax,
    slot,
    baseY,
    topY,
    bars,
    goalY: goal === null ? null : y(goal),
    grid: [0, yMax / 2, yMax].map((value) => ({ value, y: y(value) })),
  };
}

export type LineLayout = {
  /** Coordenada x de la columna `index` (centrada, igual que en las barras) */
  x: (index: number) => number;
  y: (value: number) => number;
  grid: { value: number; y: number }[];
  /** Camino SVG de la tendencia, o null si hay menos de dos puntos */
  path: string | null;
  dots: { index: number; x: number; y: number }[];
};

export function lineLayout(
  total: number,
  points: { index: number; value: number }[],
  trend: { index: number; value: number }[],
  min: number,
  max: number,
  size: Size,
  pad: Padding,
): LineLayout {
  const innerW = Math.max(0, size.width - pad.left - (pad.right ?? 0));
  const baseY = size.height - pad.bottom;
  const x = (index: number) => pad.left + ((index + 0.5) / Math.max(1, total)) * innerW;
  const y = (value: number) => scale(value, min, max, baseY, pad.top);

  const path =
    trend.length > 1 ? trend.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.index).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ') : null;

  return {
    x,
    y,
    grid: [min, (min + max) / 2, max].map((value) => ({ value, y: y(value) })),
    path,
    dots: points.map((p) => ({ index: p.index, x: x(p.index), y: y(p.value) })),
  };
}
