/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111418',
    background: '#F4F5F2',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7E9E4',
    textSecondary: '#6B7078',
  },
  dark: {
    text: '#F5F6F7',
    background: '#0B0C0E',
    backgroundElement: '#17191C',
    backgroundSelected: '#24272B',
    textSecondary: '#9CA1A9',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Color principal de la app (botones, selección, tarjeta del total del día). */
export const Accent = '#2E9E6B';

/** Degradado de la tarjeta principal (de arriba-izquierda a abajo-derecha). */
export const AccentGradient = ['#3CC48A', '#1F8A5E'] as const;

/** Un color por macro, para reconocerlas de un vistazo en toda la app. */
export const MacroColors = {
  protein: '#3E7BFA',
  carbs: '#F5A524',
  fat: '#A855F7',
} as const;
