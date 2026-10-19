import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

/** Stack con cabecera nativa que sigue los colores de la app (claro/oscuro). */
export function ThemedStack(props: ComponentProps<typeof Stack>) {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
      }}
      {...props}
    />
  );
}
