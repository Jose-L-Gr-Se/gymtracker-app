import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/**
 * Inicio de sesión con proveedores externos sobre Supabase.
 *
 * Se usa el flujo de id_token (no el de redirección web): el proveedor
 * devuelve un token de identidad que se canjea con `signInWithIdToken`. Es el
 * camino nativo, sin pasar por un navegador intermedio con vuelta a la app,
 * y funciona igual en build de desarrollo y en producción.
 *
 * Ambos proveedores requieren configuración externa (Google Cloud / Apple
 * Developer). Mientras falte, `isGoogleConfigured` / `isAppleAvailable` son
 * false y la interfaz no ofrece el botón, en vez de enseñar uno que falla.
 */

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** El client ID web es el que Supabase valida, así que es el mínimo imprescindible. */
export const isGoogleConfigured = GOOGLE_WEB_CLIENT_ID.length > 0;

export const googleAuthConfig: Partial<Google.GoogleAuthRequestConfig> = {
  webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  scopes: ['openid', 'profile', 'email'],
};

export { Google, AuthSession };

/** Sign in with Apple solo existe en iOS 13+ y requiere cuenta de desarrollador. */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export interface AppleCredential {
  idToken: string;
  /** Apple solo entrega el nombre en el PRIMER inicio de sesión: hay que guardarlo entonces. */
  fullName: string;
}

export class AppleSignInCancelled extends Error {}

export async function requestAppleCredential(): Promise<AppleCredential> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('Apple no devolvió un token de identidad.');
  }
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  return { idToken: credential.identityToken, fullName: name };
}

/** Distingue "el usuario canceló" de un error real, para no mostrar una alerta innecesaria. */
export function isCancellation(error: unknown): boolean {
  if (error instanceof AppleSignInCancelled) return true;
  const code = (error as { code?: string })?.code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
}
