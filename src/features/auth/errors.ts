/**
 * Supabase devuelve los errores de autenticación en inglés y con jerga de API.
 * Se traducen los casos habituales para que el usuario sepa qué hacer; el
 * resto se muestra tal cual, antes que inventar un mensaje genérico que
 * oculte la causa real del fallo.
 */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed'))
    return 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (m.includes('password should be at least')) return 'La contraseña es demasiado corta.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'El correo no es válido.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
  return message;
}
