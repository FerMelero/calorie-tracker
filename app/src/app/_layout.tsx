import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

/** Quita la pantalla de carga cuando la base de alimentos ya está lista. */
function HideSplashWhenReady() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return null;
}

// Si regeneras foods.db, cambia el número del nombre: así la app copia la versión nueva.
const FOODS_DB_NAME = 'foods-2.db';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
        <SQLiteProvider
          databaseName={FOODS_DB_NAME}
          assetSource={{ assetId: require('@/assets/db/foods.db') }}
          useSuspense>
          <HideSplashWhenReady />
          <AppTabs />
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
