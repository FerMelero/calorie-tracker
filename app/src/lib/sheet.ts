/** Cuándo una ventana inferior arrastrada hacia abajo se cierra. Sin dependencias, para poder probarlo. */

/** Distancia (en puntos) a partir de la cual, al soltar, la ventana se cierra. */
export const DISMISS_DISTANCE = 120;
/** Velocidad de un "lanzamiento" hacia abajo (puntos por milisegundo) que cierra aunque la distancia sea corta. */
export const DISMISS_VELOCITY = 0.8;
/** Distancia mínima para que un lanzamiento rápido cuente (así un roce no cierra la ventana). */
export const MIN_FLING_DISTANCE = 30;

export function shouldDismiss(dy: number, vy: number): boolean {
  return dy >= DISMISS_DISTANCE || (vy >= DISMISS_VELOCITY && dy >= MIN_FLING_DISTANCE);
}
