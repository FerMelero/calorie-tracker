import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Los tests solo cubren funciones puras de src/lib (sin Expo ni React Native).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
