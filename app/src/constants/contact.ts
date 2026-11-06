import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

/**
 * Correo al que los usuarios envían sugerencias (alimentos que faltan, ideas, fallos).
 * Si se deja vacío, los botones y la tarjeta de sugerencias no se muestran.
 */
// `as string`: sin esto TypeScript deduce que nunca está vacío y se queja de las comprobaciones `=== ''`
export const SUGGESTIONS_EMAIL = 'calorieuserservice@gmail.com' as string;

/** Datos útiles para que quien recibe el correo sepa qué versión y móvil tiene el usuario. */
function appInfo(): string {
  return `App: Contador de Calorías ${Constants.expoConfig?.version ?? ''} (${Platform.OS} ${Platform.Version})`;
}

/**
 * Abre la aplicación de correo con un mensaje ya preparado. No envía nada por sí sola: el usuario
 * lo revisa y decide si lo manda. Devuelve false si no hay correo configurado o no se pudo abrir.
 */
export async function openSuggestionMail(subject: string, body: string): Promise<boolean> {
  if (SUGGESTIONS_EMAIL === '') return false;
  const url =
    `mailto:${SUGGESTIONS_EMAIL}?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(`${body}\n\n---\n${appInfo()}`)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
