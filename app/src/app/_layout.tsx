import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

// Si regeneras foods.db, cambia el número del nombre: así la app copia la versión nueva.
const FOODS_DB_NAME = 'foods-1.db';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
        <SQLiteProvider
          databaseName={FOODS_DB_NAME}
          assetSource={{ assetId: require('@/assets/db/foods.db') }}
          useSuspense>
          <AppTabs />
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
