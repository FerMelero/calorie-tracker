/**
 * Complementa app.json. Aquí solo se decide para qué procesadores se compila la app, según el
 * perfil de eas.json (variable BUILD_ARCHS). Sin la variable (Expo Go, desarrollo) no cambia nada.
 *
 * Una APK lleva el código nativo de cada arquitectura que incluyas, y cada una pesa unos 25 MB.
 * Un móvil solo usa una, así que compilar para todas hace la descarga mucho más grande de lo necesario.
 */
module.exports = ({ config }) => {
  const archs = (process.env.BUILD_ARCHS ?? '').split(',').filter(Boolean);
  if (archs.length === 0) return config;

  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android: { buildArchs: archs } }]],
  };
};
