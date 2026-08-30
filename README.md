# GymTracker App

App nativa de seguimiento de entrenamiento (Android e iOS) construida con **Expo + React Native + TypeScript + Supabase**. Es el rebuild profesional de la PWA [gymtracker](https://github.com/Jose-L-Gr-Se/gymtracker): conserva sus funciones y su identidad visual (tema oscuro + lima eléctrico) y las reorganiza sobre una arquitectura pensada para publicar en Google Play y App Store.

## Funcionalidades

- **Login real** con Supabase (email + contraseña, recuperación de contraseña) y **modo invitado** 100 % local.
- **Onboarding** en 4 pasos: nombre, objetivo, experiencia, unidades, meta semanal y rutina inicial desde plantilla (PPL, Upper/Lower, Full Body).
- **Rutinas**: ejercicios con series objetivo, rangos de reps y RIR, descansos por ejercicio y **superseries**.
- **Entreno activo**: registro de peso/reps/RPE/RIR, tipos de serie (calentamiento, drop, fallo), autocompletar desde la última sesión, temporizador de descanso con notificación local y pantalla siempre encendida. El borrador se persiste en cada cambio: **cerrar la app no pierde el entreno**.
- **Historial**: sesiones con detalle, estado de ánimo, notas y timeline de **PRs**.
- **Progreso**: volumen semanal (8 semanas), distribución de rangos de reps, peso corporal, medidas, progresión por ejercicio con **e1RM** y **proyección a 12 semanas** (regresión lineal).
- **Inteligencia semanal**: alertas de consistencia, cobertura muscular, desequilibrios, sugerencia de deload y detección de fatiga (RPE alto sostenido).
- **Offline-first**: todo se lee y escribe en local; una cola de operaciones sincroniza con Supabase cuando hay conexión (last-write-wins por `updatedAt`).

## Estructura

```
src/
  domain/      Tipos, constantes, sanitización y analítica (funciones puras, con tests)
  data/        Almacén local (AsyncStorage), cola de sync y motor push/pull
  services/    Cliente Supabase y notificaciones locales
  state/       Stores zustand: useAuth, useAppData, useWorkout
  components/  Kit UI (Button, Card, Input, Chip, …)
  features/    Componentes de features (RestTimerBar, …)
  theme/       Design tokens
  app/         Rutas expo-router: (auth), onboarding, (tabs), workout, routine/[id], …
supabase/schema.sql   Esquema SQL (tablas + RLS + trigger de perfil)
```

## Puesta en marcha

```bash
npm install
cp .env.example .env   # rellena con tu URL y anon key de Supabase (opcional)
npx expo start         # escanea el QR con Expo Go, o pulsa "a" para Android
```

Sin `.env` la app arranca en modo solo-local (invitado), sin login ni nube.

### Configurar Supabase (para login + sync)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. SQL Editor → pega y ejecuta `supabase/schema.sql`.
3. Settings → API: copia la URL y la `anon key` a tu `.env`.
4. Authentication → Providers → Email: habilitado por defecto. Si quieres iniciar sesión sin verificar el correo durante el desarrollo, desactiva "Confirm email".

El esquema es compatible con el de la PWA v2: si ya usabas Supabase con la PWA, la app leerá tus datos existentes con la misma cuenta.

### Verificación

```bash
npm run typecheck   # TypeScript estricto
npm test            # tests unitarios del dominio (analítica, sanitización, entreno)
npm run lint        # ESLint (config Expo + React Compiler)
```

## Build para Android (Google Play)

Se usa [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login                      # cuenta de expo.dev (gratuita)
eas build -p android --profile preview     # APK instalable para probar
eas build -p android --profile production  # AAB para subir a Google Play
eas submit -p android                      # (opcional) subida directa a Play Console
```

Las variables de entorno para builds se configuran con `eas env:create` (EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY) o en `eas.json`.

Identificadores ya configurados en `app.json`: paquete Android/iOS `com.joselgrse.gymtracker`.

## Build para iOS (App Store)

Requiere cuenta de Apple Developer (99 $/año):

```bash
eas build -p ios --profile production
eas submit -p ios
```

## Migrar este código a su propio repositorio

Este árbol vive en la rama `claude/pwa-native-app-rebuild-tbohah` del repo de la PWA. Para moverlo a un repo propio (p. ej. `gymtracker-app`):

1. Crea el repositorio vacío en GitHub (sin README).
2. Desde un clon de `gymtracker`:

```bash
git checkout claude/pwa-native-app-rebuild-tbohah
git push https://github.com/Jose-L-Gr-Se/gymtracker-app.git HEAD:main
```

El historial de la app queda como `main` del nuevo repo.

## Roadmap sugerido

- [ ] Migrar el almacén local de AsyncStorage a SQLite (`expo-sqlite`) cuando crezca el volumen de sesiones.
- [ ] Importador de datos desde la PWA (export JSON → import en la app).
- [ ] Reordenar ejercicios con drag & drop (`react-native-draggable-flatlist`).
- [ ] Gráficas avanzadas (victory-native) y comparativas entre periodos.
- [ ] Widget/Live Activity del temporizador de descanso.
- [ ] Monetización: plan Pro (analítica avanzada, coach automático) vía RevenueCat.
- [ ] Localización EN (los strings están en español; extraerlos a i18n).
