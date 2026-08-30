# GymTracker App

App nativa de seguimiento de entrenamiento (Android e iOS) construida con **Expo + React Native + TypeScript + Supabase**. Es el rebuild profesional de la PWA [gymtracker](https://github.com/Jose-L-Gr-Se/gymtracker): conserva sus funciones y su identidad visual (tema oscuro + lima eléctrico) y las reorganiza sobre una arquitectura pensada para publicar en Google Play y App Store.

## Funcionalidades

- **Login real** con Supabase: email + contraseña con medidor de fuerza y errores traducidos, recuperación de contraseña, **Google Sign-In** y **Sign in with Apple** (cada botón aparece solo si su proveedor está configurado), y **modo invitado** 100 % local.
- **Onboarding** en 5 pasos con indicador de progreso: nombre, objetivo, experiencia, unidades y meta semanal, y rutina inicial desde plantilla.
- **Plantillas**: el programa completo **ATLAS v2.0** (8 sesiones, 12 semanas, con series/reps/RIR del programa) y las divisiones clásicas (PPL, Upper/Lower, Full Body), sobre una biblioteca de 63 ejercicios.
- **Rutinas**: ejercicios con series objetivo, rangos de reps y RIR, descansos por ejercicio y **superseries**.
- **Entreno activo**: registro de peso/reps/RPE/RIR, tipos de serie (calentamiento, drop, fallo), temporizador de descanso con notificación local y pantalla siempre encendida. Completar una serie en blanco **confirma los valores de la sesión anterior** que ya ves como referencia, en vez de guardar una serie vacía. El borrador se persiste en cada cambio: **cerrar la app no pierde el entreno**.
- **Técnica por ejercicio**: instrucciones y vídeo guardado, con búsqueda directa en YouTube para cualquier ejercicio sin vídeo propio. Se abre en navegador in-app sin salir del entreno.
- **Historial**: sesiones con detalle, estado de ánimo, notas y timeline de **PRs**.
- **Progreso**: volumen semanal con selector de periodo (4/8/12/24 semanas) y **comparativa entre periodos**, distribución de rangos de reps, peso corporal, medidas, progresión por ejercicio con **e1RM** y **proyección a 12 semanas** (regresión lineal), todo en gráficas interactivas (toca/arrastra para ver el valor exacto).
- **Inteligencia semanal**: alertas de consistencia, cobertura muscular, desequilibrios, sugerencia de deload y detección de fatiga (RPE alto sostenido).
- **Reordenar ejercicios por arrastre** en el editor de rutinas (asa de arrastre + flechas como alternativa accesible).
- **Importador desde la PWA**: trae tu historial completo (ejercicios, rutinas, sesiones, peso, medidas) desde un backup JSON exportado de la app web, fusionándolo sin pisar nunca un dato local más reciente.
- **Offline-first**: todo se lee y escribe en local; una cola de operaciones sincroniza con Supabase cuando hay conexión (last-write-wins por `updatedAt`).
- **Datos canónicos en kg**: el peso se guarda siempre en kilos y se convierte solo en el límite de entrada/salida, así cambiar entre kg y lbs nunca altera el histórico.
- **Accesible**: los tres niveles de texto pasan contraste WCAG AA y todo control interactivo respeta el suelo táctil de 44 px (importa: el check de completar serie se pulsa con las manos sudadas).

## Marca

El icono es un monograma "G" cuyo travesaño es la barra de una mancuerna, en lima
eléctrico (`#c8ff2e`) sobre negro (`#08080a`). Se genera desde una única fuente
vectorial, así que se puede retocar y regenerar todo el juego (iOS, adaptativo
Android, monocromo y splash) con:

```bash
node scripts/generate-icons.mjs
```

## Estructura

```
src/
  domain/      Tipos, constantes, sanitización, analítica e importador de la PWA (funciones puras, con tests)
  data/        Almacén local (AsyncStorage), cola de sync y motor push/pull
  services/    Cliente Supabase y notificaciones locales
  state/       Stores zustand: useAuth, useAppData, useWorkout
  components/  Kit UI (Button, Card, Input, Chip, …), ReorderableList, charts/ (BarChart, LineChart)
  features/    Componentes de features (RestTimerBar, …)
  theme/       Design tokens
  app/         Rutas expo-router: (auth), onboarding, (tabs), workout, routine/[id], import-pwa, …
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

### Configurar Google Sign-In (opcional)

Mientras no esté configurado, el botón de Google sencillamente no aparece — es preferible ocultarlo a mostrar uno que falla.

1. **Google Cloud Console** → *APIs y servicios* → *Credenciales* → crear IDs de cliente OAuth:
   - **Web**: obligatorio, es el que valida Supabase.
   - **Android**: con el paquete `com.joselgrse.gymtracker` y la huella **SHA-1** de la firma. La de tu build de EAS se obtiene con `eas credentials` → Android → *Keystore*.
   - **iOS**: con el mismo bundle identifier.
2. **Supabase** → *Authentication* → *Providers* → *Google*: pega el **client ID y el secret del cliente web**.
3. Copia los tres IDs a tu `.env` (ver `.env.example`).

Para builds de EAS, las variables se registran con `eas env:create` en vez de en el `.env` local.

### Configurar Sign in with Apple (opcional, solo iOS)

Requiere cuenta de Apple Developer de pago. En el portal de Apple hay que habilitar la capability *Sign in with Apple* para el bundle identifier, y en Supabase configurar el proveedor Apple. El botón solo se muestra en iOS 13+ y cuando el sistema lo reporta disponible.

Apple entrega el nombre del usuario **solo en el primer inicio de sesión**; la app lo guarda en ese momento, porque después ya no vuelve a enviarlo.

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

- [x] Importador de datos desde la PWA (export JSON → import en la app), fusión sin pérdida de datos.
- [x] Reordenar ejercicios con drag & drop (implementación propia sobre gesture-handler + reanimated).
- [x] Gráficas interactivas (react-native-svg) con comparativa entre periodos.
- [ ] Migrar el almacén local de AsyncStorage a SQLite (`expo-sqlite`) cuando crezca el volumen de sesiones.
- [ ] Widget/Live Activity del temporizador de descanso.
- [ ] Monetización: plan Pro (analítica avanzada, coach automático) vía RevenueCat.
- [ ] Localización EN (los strings están en español; extraerlos a i18n).
