/\*\*

- @fileoverview Base de conocimiento técnico del proyecto de migración VIDKAR a Expo
-
- @description
- Este archivo documenta decisiones arquitectónicas, patrones técnicos y conocimiento crítico
- del proyecto de migración de la aplicación nativa Android VIDKAR hacia una solución multiplataforma
- usando Expo y React Native.
-
- @project Android VIDKAR → Expo Migration
- @framework Expo, React Native
- @status En Desarrollo - Fase de Migración
-
- @important
- - Cada sesión de desarrollo debe registrar hallazgos técnicos relevantes
- - Documentar incompatibilidades encontradas con APIs nativas de Android
- - Registrar soluciones implementadas para características específicas de VIDKAR
- - Mantener actualizado el stack tecnológico utilizado
-
- @sections
- - Arquitectura General: Estructura del proyecto y organización de módulos
- - Dependencias Críticas: Librerías esenciales y sus versiones
- - APIs Nativas: Mapeado de funcionalidades Android a React Native/Expo
- - Patrones de Código: Convenciones y soluciones recurrentes
- - Problemas Conocidos: Issues pendientes y workarounds implementados
- - Configuración Expo: eas.json, app.json, y setup del entorno
    \*/

---

Resumen tecnico - Tracking nativo del cadete como modulo local de Expo para sobrevivir prebuild

- Contexto validado:
  - El tracking de ubicacion del cadete ya tenia permisos, `UIBackgroundModes` y configuracion Expo correctos, pero la confiabilidad del background en iOS/Android seguia limitada por la capa JS/TaskManager.
  - Como este proyecto usa Expo con carpetas `ios/` y `android/` generadas, no conviene basar una solucion critica solo en parches manuales dentro de esos entrypoints nativos.

- Arquitectura aplicada:
  - Se creo un modulo local Expo en:
    - `modules/cadete-background-tracking/`
  - El modulo expone un contrato nativo comun `CadeteBackgroundTracking` con metodos:
    - `startTracking(userId, meteorUrl)`
    - `stopTracking()`
    - `syncTracking(enabled, userId, meteorUrl)`
    - `getStatus()`
  - La idea base es que el tracking critico viva en codigo nativo autolinkeable por Expo y no solo en `expo-task-manager`.

- Implementacion iOS aplicada:
  - `CadeteNativeLocationService.swift` usa `CLLocationManager` nativo con:
    - `allowsBackgroundLocationUpdates = true`
    - `pausesLocationUpdatesAutomatically = false`
    - `activityType = .otherNavigation`
    - heartbeat interno y envio por `POST /api/location`
    - verificacion periodica via `POST /api/cadete/isActive`
  - `CadeteBackgroundTrackingAppDelegateSubscriber.swift` restaura el tracking desde el arranque nativo usando `ExpoAppDelegateSubscriber`, evitando depender de que el router o una pantalla JS ya hayan montado.

- Implementacion Android aplicada:
  - `CadeteTrackingService.kt` usa `FusedLocationProviderClient` dentro de un `foreground service` propio del modulo.
  - El servicio mantiene:
    - notificacion persistente
    - `requestLocationUpdates(...)`
    - heartbeat de 30s
    - `getCurrentLocation(...)` como respaldo
    - envio HTTP a `/api/location`
    - gate por `/api/cadete/isActive`
  - La configuracion del servicio vive dentro del propio modulo, no en codigo de pantalla.

- Integracion JS aplicada:
  - `services/location/cadeteBackgroundLocation.native.js` ahora usa `requireOptionalNativeModule('CadeteBackgroundTracking')` y entra en modo `native-first` cuando el modulo esta disponible.
  - En ese modo:
    - `startCadeteBackgroundLocation` delega al modulo nativo
    - `stopCadeteBackgroundLocation` delega al modulo nativo
    - `syncCadeteBackgroundLocation` delega al modulo nativo
    - `readCadeteLocationStatus` fusiona estado persistido JS con estado nativo real
    - el bootstrap JS ya no intenta levantar el task Expo si existe el modulo nativo; solo restaura/sincroniza el servicio nativo
    - `useCadeteLocationTracking.native.js` deja de montar `watchPositionAsync(...)` y heartbeat JS cuando el modulo nativo esta disponible; en native-first el hook queda solo como capa de estado/UI
  - Se mantiene el fallback Expo actual para runtimes donde el modulo nativo aun no este compilado en el binario.

- Decisiones tecnicas importantes:
  - El modulo local necesita vivir en `modules/` con:
    - `expo-module.config.json`
    - codigo Swift/Kotlin
    - manifest/build propios
  - Esto es preferible a tocar directamente `AppDelegate.swift` o `MainApplication.kt` como solucion principal, porque Expo puede regenerar esos folders.
  - Si se recompila un binario sin incluir el modulo nativo, el servicio JS debe seguir funcionando como fallback y no romper el runtime.

- Regla practica:
  - Si una feature critica de background necesita mas confiabilidad que la capa JS de Expo, primero evaluar un modulo local Expo antes de editar manualmente `ios/` o `android/` generados.
  - El entrypoint JS del proyecto puede seguir coordinando estado y fallback, pero el tracking continuo del cadete debe considerarse responsabilidad del modulo nativo cuando este presente.

Resumen técnico – Parche reproducible para RNFirebase Messaging iOS tras error de `RCTPromiseRejectBlock`

- Problema detectado:
  - Tras resolver el fallo inicial de `non-modular header`, el archive iOS siguió rompiendo en `RNFBMessaging` con errores como:
    - `declaration of 'RCTPromiseRejectBlock' must be imported from module 'RNFBApp.RNFBAppModule' before it is required`
    - cascada posterior de errores en `RCT_EXPORT_METHOD(...)` (`implicit int`, `expected ')'`, etc.)

- Causa raíz validada:
  - El primer error real aparece en `node_modules/@react-native-firebase/messaging/ios/RNFBMessaging/RNFBMessaging+AppDelegate.h`.
  - Ese header declara propiedades y métodos con `RCTPromiseRejectBlock` / `RCTPromiseResolveBlock`.
  - Con `ios.useFrameworks = "static"` y New Architecture activa, Clang ya no acepta que ese typedef llegue solo por import directo de `React/RCTBridgeModule.h`; exige que el símbolo quede importado también desde el contexto modular de `RNFBApp`.
  - Los errores posteriores en `RNFBMessagingModule.m` son solo cascada por quedar roto el parseo de macros `RCT_EXPORT_METHOD`.

- Solución aplicada:
  - Se añadió un parche reproducible de postinstall en Expo:
    - `scripts/patch-rnfirebase-ios.js`
    - `package.json -> scripts.postinstall = "node ./scripts/patch-rnfirebase-ios.js"`
  - El script parchea de forma idempotente este archivo dentro de `node_modules`:
    - `@react-native-firebase/messaging/ios/RNFBMessaging/RNFBMessaging+AppDelegate.h`
  - Inserta explícitamente antes del import de React:
    - `#import <RNFBApp/RNFBAppModule.h>`

- Regla práctica:
  - Si RNFirebase Messaging falla en iOS con errores sobre `RCTPromiseRejectBlock` o `RCT_EXPORT_METHOD` después de habilitar frameworks estáticos, revisar primero el primer header que usa esos typedefs y no los errores en cascada del `.m`.
  - En builds EAS no conviene depender de ediciones manuales en `node_modules`; si el parche debe sobrevivir a reinstalaciones, dejarlo en `postinstall` o config plugin local.

- Validación esperada:
  - Después de `npm install`, el header parcheado debe contener `#import <RNFBApp/RNFBAppModule.h>`.
  - Si reaparece el mismo error en EAS, revisar que el `postinstall` realmente haya corrido antes del prebuild/`pod install`.

Notas adicionales – Error `RCT_EXTERN` dentro de `RNFBMessaging+NSNotificationCenter.m`

- Hallazgo adicional en el mismo build:
  - El mismo archive iOS mostró también errores de React como:
    - `unknown type name 'RCT_EXTERN'`
    - `expected method body`
    - `duplicate declaration of method 'RCT_CONCAT'`
  - En este caso el bloque salía al compilar `RNFBMessaging+NSNotificationCenter.m`, entrando por `RCTRootView.h` hacia `RCTEventDispatcherProtocol.h`.

- Causa probable validada:
  - Dentro del framework modular `RNFBMessaging`, los imports transitivos desde `RCTRootView.h` no estaban dejando visibles a tiempo las macros/base declarations de React (`RCTDefines.h`, `RCTBridgeModule.h`).
  - Cuando `RCT_EXTERN` no queda definido, el parser rompe `RCTBridgeModule.h` y de ahí aparece la cascada con `RCT_CONCAT` y `expected method body`.

- Ajuste aplicado al parche reproducible:
  - `scripts/patch-rnfirebase-ios.js` también parchea:
    - `@react-native-firebase/messaging/ios/RNFBMessaging/RNFBMessaging+NSNotificationCenter.m`
  - Inserta imports explícitos antes de `RCTRootView`:
    - `#import <React/RCTDefines.h>`
    - `#import <React/RCTBridgeModule.h>`

- Regla práctica:
  - Si un módulo iOS dentro de RNFirebase falla con `RCT_EXTERN` o `RCT_CONCAT`, no asumir enseguida que el problema está en React Native base.
  - Primero revisar si el archivo del módulo está entrando a headers de React complejos como `RCTRootView.h` sin haber importado explícitamente `RCTDefines.h` / `RCTBridgeModule.h` en el contexto del framework que compila.

Notas adicionales – Error `RCT_EXPORT_MODULE` en `RNFBMessagingModule.m`

- Hallazgo adicional en el build siguiente:
  - Tras parchear `RNFBMessaging+AppDelegate.h` y `RNFBMessaging+NSNotificationCenter.m`, el primer error real pasó a ser:
    - `unknown type name 'RCT_EXTERN'`
    - `duplicate declaration of method 'RCT_CONCAT'`
    - `expected method body`
  - Esta vez el punto exacto de entrada fue `node_modules/@react-native-firebase/messaging/ios/RNFBMessaging/RNFBMessagingModule.m`, empezando en `RCT_EXPORT_MODULE();`.

- Causa probable validada:
  - En el contexto de framework estático modular (`ios.useFrameworks = "static"`), no bastó con que `RNFBMessagingModule.h` importara `React/RCTBridgeModule.h`.
  - El archivo `.m` necesitó también importar explícitamente `RCTDefines.h` y `RCTBridgeModule.h` antes de usar macros como `RCT_EXPORT_MODULE` y `RCT_EXPORT_METHOD`.
  - Cuando `RCT_EXTERN` no queda visible al expandir esas macros, el compilador cae en la misma cascada de `RCT_CONCAT` y errores de método que ya se vio en otros puntos de RNFirebase.

- Ajuste aplicado al parche reproducible:
  - `scripts/patch-rnfirebase-ios.js` ahora también parchea:
    - `@react-native-firebase/messaging/ios/RNFBMessaging/RNFBMessagingModule.m`
  - Inserta antes de `RCTConvert` / `RCTUtils`:
    - `#import <React/RCTDefines.h>`
    - `#import <React/RCTBridgeModule.h>`

- Regla práctica:
  - Si RNFirebase Messaging falla directamente en `RCT_EXPORT_MODULE()` dentro de un `.m`, no asumir que el header asociado ya aporta suficiente contexto modular.
  - En builds iOS con frameworks estáticos, forzar imports explícitos en el `.m` puede ser necesario aunque el `.h` ya importe esos mismos headers.

Resumen técnico – Espejo estricto de components legacy en Expo

- Se validó una regla de migración crítica para este proyecto: la app Expo no debe inventar una jerarquía nueva para las pantallas que vienen del proyecto React Native legacy si el objetivo es portar módulos completos con el menor costo posible.

- Criterio aplicado:
  - La carpeta `components` en Expo debe reflejar la estructura del legacy lo más literalmente posible.
  - Los entrypoints principales deben existir con el mismo nombre y ubicación conceptual que en el proyecto original, especialmente:
    - `components/loguin/Loguin.js`
    - `components/Main/MenuPrincipal.jsx`
    - `components/cadete/CadeteNavigator.jsx`
    - `components/empresa/EmpresaNavigator.jsx`

- Decisión técnica importante:
  - Se descartó seguir creciendo una estructura tipo `src/features/*` como superficie principal de integración, porque eso obliga a rehacer imports, rutas y contratos al copiar código desde el legacy.
  - La infraestructura compatible con Expo puede seguir existiendo como soporte, pero las rutas que consumirán los módulos migrados deben vivir bajo `components/*`.

- Trabajo realizado en esta conversación:
  - Se reconstruyó un esqueleto amplio del árbol `components` para alinearlo con el legacy.
  - Se crearon carpetas espejo y archivos placeholder con nombres reales del proyecto original, incluyendo módulos como comercio, empresa, mensajes, permissions, productos, property, proxy, remesas, users, ventas y vpn.
  - Se añadió una base de routing/session para Expo compatible con el criterio anterior, usando soporte web/nativo sin perder las rutas espejo.

- Lección práctica:
  - Si se quiere migrar rápido y con bajo riesgo, primero se replica la forma del proyecto legacy y después se sustituye archivo por archivo.
  - Migrar primero la arquitectura y después intentar copiar carpetas enteras introduce deuda innecesaria y rompe la meta de “migrar sin afectar nada”.

- Recomendación para próximos pasos:
  - Cada nuevo módulo migrado debe empezar verificando que su destino exista exactamente bajo el mismo path del legacy.
  - Antes de crear un placeholder o un wrapper, contrastar contra el árbol real del legacy para evitar nombres inventados o archivos extra que no aporten a la migración.

Resumen técnico – Base de migración Expo para VIDKAR (Meteor + Paper + preparación de login)

- Se instalaron las dependencias base para comenzar la migración desde React Native CLI hacia Expo sin romper el enfoque visual del proyecto original:
  - @meteorrn/core
  - @react-native-community/netinfo
  - react-native-paper

- Decisión arquitectónica aplicada:
  - La conexión a Meteor deja de depender de la pantalla de login y se centraliza en el arranque global del proyecto Expo.
  - Esto replica mejor el comportamiento del proyecto legacy, donde gran parte de la app depende del estado global de sesión, colecciones y subscriptions desde etapas tempranas del ciclo de vida.

- Infraestructura creada en Expo:
  - AppProviders globales para envolver toda la app con:
    - SafeAreaProvider
    - PaperProvider
    - Portal.Host
    - ThemeProvider de React Navigation
  - Tema unificado Paper + Navigation, alineado con la identidad previa del proyecto (primary cercano a #3f51b5).
  - Servicio base de Meteor para:
    - resolver meteorUrl desde app.json
    - asegurar conexión con Meteor.connect() desde una capa centralizada
  - Archivo de colecciones compartidas con nombres equivalentes al proyecto original para facilitar copiado progresivo de componentes sin reescribir imports desde cero.

- Hallazgos técnicos del login legacy analizado:
  - El login actual no es una pantalla aislada; depende de infraestructura global:
    - conexión Meteor
    - react-native-paper
    - ConfigCollection para toggles de login social
    - utilidades compartidas de autenticación
  - Login clásico:
    - usa Meteor.loginWithPassword(username, password)
  - Login con Google:
    - llama Meteor.call('login', { googleSignIn: true, ...tokens })
  - Login con Apple:
    - tiene dos rutas:
      - login estándar via Meteor.call('login', ...)
      - fallback via Meteor.call('auth.appleSignIn', ...)
    - depende de lógica específica de iOS y del backend Meteor para consolidar la sesión local con token.

- Implicaciones para próximos pasos:
  - Antes de migrar el UI del login, validar compatibilidad Expo para social auth:
    - Google: preferible evaluar expo-auth-session o Google Identity actual para Expo
    - Apple: usar expo-apple-authentication si se mantiene flujo nativo Expo
  - No conviene copiar directamente la implementación de Google/Apple del proyecto CLI porque depende de librerías nativas distintas a las recomendadas en Expo.
  - Sí conviene mantener:
    - estructura visual
    - shape del payload enviado al backend Meteor
    - lógica de feature flags desde ConfigCollection

- Recomendación de migración profesional:
  - Migrar en este orden:
    1. Infraestructura global (providers, Meteor, tema, colecciones)
    2. Login usuario/contraseña
    3. Toggle de login social por properties
    4. Google Sign-In compatible con Expo
    5. Apple Sign-In compatible con Expo
    6. Gate raíz de sesión y navegación por rol/modo

- Lección técnica clave:
  - En esta app, auth, theming y estado global están fuertemente acoplados al bootstrap. Si se intenta portar primero solo la pantalla de login, se duplica lógica y se introduce deuda técnica innecesaria.

---

Resumen técnico – Compatibilidad de @meteorrn/core con Expo Router y web

- Problema detectado al arrancar Expo Router:
  - El proyecto intentaba compilar también la salida web.
  - `@meteorrn/core` importa internals nativos de React Native y rompe el bundle web.
  - Además, la importación crítica del provider global desde `app/_layout.tsx` falló con alias, por lo que convino usar ruta relativa en el punto de entrada.

- Solución aplicada:
  - Separación del provider global por plataforma:
    - `src/providers/app-providers.native.tsx`: incluye conexión real a Meteor.
    - `src/providers/app-providers.tsx`: versión segura para web, sin importar `@meteorrn/core`.
  - `app/_layout.tsx` ahora importa el provider mediante ruta relativa para evitar problemas de resolución en el arranque.

- Criterio técnico:
  - En proyectos Expo Router que también renderizan web, cualquier dependencia estrictamente nativa debe aislarse con archivos `.native.tsx` o importación condicional real, no con simples checks de `Platform.OS` dentro del mismo módulo.
  - Un `if (Platform.OS !== 'web')` no evita el error si el import nativo está en el tope del archivo, porque Metro/Web igual intenta resolverlo.

- Resultado validado:
  - `expo lint` limpio.
  - `npx expo export --platform web` completado correctamente.

- Recomendación para próximas migraciones:
  - Cualquier módulo heredado de `android-VIDKAR` que use Meteor, Firebase nativo, notificaciones nativas o APIs de dispositivo debe evaluarse primero por compatibilidad web antes de conectarlo al árbol global de Expo Router.

---

Resumen técnico – Primer login migrado a Expo (usuario/contraseña + layout base)

- Se reemplazó el template inicial de Expo Router por una primera pantalla de login alineada con la estructura visual del proyecto legacy.

- Implementación aplicada:
  - `app/(tabs)/index.tsx` ahora renderiza un `LoginScreen` propio en lugar del contenido de ejemplo del starter.
  - `app/(tabs)/_layout.tsx` se dejó sin tab bar visible para que el flujo actual funcione como pantalla de acceso y no como demo con tabs expuestas.
  - Se separó la pantalla por plataforma:
    - `src/features/auth/components/login-screen.native.tsx`: login real con Meteor.
    - `src/features/auth/components/login-screen.tsx`: variante web segura, visualmente equivalente, sin autenticación real.
  - Se creó `src/features/auth/components/login-screen.styles.ts` para centralizar el estilo y mantener consistencia entre web y nativo.

- Comportamiento del login nativo:
  - Conecta a Meteor al montar usando la capa centralizada creada previamente.
  - Ejecuta `Meteor.loginWithPassword(username, password)` para el acceso clásico.
  - Si la sesión ya existe, cambia a estado de “Sesión activa” y permite cerrar sesión con `Meteor.logout()`.
  - Se mantuvo el comando oculto `change server` en el input de usuario para mostrar el campo de reconexión de servidor, heredando una capacidad útil del proyecto original.

- Comportamiento web:
  - No intenta cargar `@meteorrn/core`.
  - Muestra la misma intención visual del login, pero como vista previa segura para no romper el bundle web.
  - Esto permite seguir usando `expo export --platform web` mientras la autenticación real se mantiene enfocada en Android/iOS.

- Criterio técnico aplicado:
  - El objetivo de este tramo no fue terminar auth completa, sino dejar lista una base visual y funcional mínima para conectar luego:
    - gate raíz de sesión
    - navegación por modo/rol
    - Google Sign-In compatible con Expo
    - Apple Sign-In compatible con Expo
  - Se evitó portar todavía los providers sociales del proyecto CLI porque dependen de librerías nativas distintas y requieren adaptación específica para Expo.

- Resultado validado:
  - `expo lint` limpio.
  - `npx expo export --platform web` exitoso tras introducir la nueva pantalla.

- Próximo paso recomendado:
  - Crear el gate raíz de sesión en Expo para que, cuando `Meteor.userId()` exista en nativo, se redirija fuera del login hacia el shell principal que sustituirá progresivamente a `Main.js` y `App.js` del proyecto original.

---

Resumen técnico – Gate raíz de sesión y shells por modo en Expo Router

- Se reemplazó la dependencia inicial del grupo `(tabs)` por una estructura de rutas más cercana a la arquitectura real del proyecto legacy:
  - `app/index.tsx`: gate raíz de sesión.
  - `app/(auth)`: flujo de acceso.
  - `app/(normal)`: shell del menú principal normal.
  - `app/(cadete)`: shell del modo cadete.
  - `app/(empresa)`: shell del modo empresa.

- Regla de decisión portada desde `Main.js`:
  - Si no hay `Meteor.userId()` → `/(auth)`.
  - Si `user.modoCadete === true` → `/(cadete)`.
  - Si `user.modoEmpresa === true` y `user.profile.roleComercio` incluye `EMPRESA` → `/(empresa)`.
  - En cualquier otro caso autenticado → `/(normal)`.

- Implementación aplicada:
  - `src/features/navigation/utils/session-route.ts`: función única para resolver la ruta del modo según sesión y flags del usuario.
  - `src/features/navigation/components/session-gate.native.tsx`: gate con `@meteorrn/core` para iOS/Android.
  - `src/features/navigation/components/session-gate.tsx`: fallback web que dirige a auth sin tocar Meteor.
  - `src/features/navigation/components/mode-shell(.native).tsx`: shell visual reutilizable para los tres modos.

- Shells creados:
  - `NormalHomeScreen`: menú principal base para módulos generales.
  - `CadeteHomeScreen`: entrada operativa del flujo de pedidos del cadete.
  - `EmpresaHomeScreen`: base para pedidos, tiendas y productos del comercio.

- Comportamiento adicional importante:
  - El login nativo ahora redirige automáticamente al shell correcto al autenticarse.
  - El botón de salir en los shells nativos ejecuta `Meteor.logout()` antes de volver a `/(auth)`.

- Criterio técnico:
  - En Expo Router conviene separar primero la navegación por grupos y shells antes de portar pantallas complejas del proyecto legacy.
  - Esto permite migrar `App.js`, `CadeteNavigator.jsx` y `EmpresaNavigator.jsx` por partes sin mezclar responsabilidades ni romper el gate de sesión.

- Resultado validado:
  - `expo lint` limpio.
  - `npx expo export --platform web` exitoso con las nuevas rutas.

- Próximo paso recomendado:
  - Empezar a sustituir cada shell placeholder por pantallas reales del legacy, comenzando por el menú principal normal y luego por `PedidosPreparacion` y `HomePedidosComercio`.

---

Resumen técnico – Regla de migración de estructura: Expo debe reflejar el árbol `components` del legacy

- Corrección de criterio aplicada:
  - No conviene seguir creando piezas migradas bajo `src/features/*` si el objetivo es copiar progresivamente la carpeta `components` del proyecto legacy.
  - Para minimizar fricción, Expo debe exponer la misma jerarquía principal del legacy, empezando por rutas clave como:
    - `components/loguin/Loguin`
    - `components/Main/MenuPrincipal`
    - `components/cadete/CadeteNavigator`
    - `components/empresa/EmpresaNavigator`

- Ajuste aplicado en esta sesión:
  - El router Expo ya no importa login y shells desde `src/features/*`.
  - Ahora consume componentes espejo bajo `components/*`, respetando los nombres y carpetas del proyecto React Native legacy.
  - `components/loguin/Loguin(.native).tsx` quedó como punto real de entrada del login en Expo.
  - `components/Main/MenuPrincipal.tsx`, `components/cadete/CadeteNavigator.tsx` y `components/empresa/EmpresaNavigator.tsx` quedaron como shells iniciales en la misma ubicación conceptual del legacy.

- Criterio técnico importante:
  - Se puede mantener lógica auxiliar compartida en `src/` durante la transición, pero la superficie de integración que usará Expo Router debe vivir en rutas equivalentes al legacy para facilitar copiar archivos sin rehacer imports masivamente.
  - Si una pantalla legacy se va a migrar “sin afectar nada”, primero se debe crear su carpeta espejo en `components/` y luego adaptar dependencias de Expo alrededor de esa misma ruta, no al revés.

- Recomendación operativa para próximos pasos:
  - Migrar módulo por módulo respetando este orden:
    1. crear carpeta espejo en `components/`
    2. mover o crear entrypoint equivalente
    3. adaptar dependencias Expo alrededor de esa ruta
    4. recién después sustituir placeholders por pantallas reales del legacy

---

Resumen técnico – Expo Router con nombres de pantallas cercanos al Stack legacy

- Se validó que, para esta migración, la carpeta `app/` también debe reducir la distancia conceptual respecto al legacy aunque siga usando Expo Router.

- Criterio aplicado:
  - Los grupos de navegación siguen separados por modo:
    - `(auth)`
    - `(normal)`
    - `(cadete)`
    - `(empresa)`
  - Pero dentro de cada grupo conviene usar archivos de ruta con nombres equivalentes a las pantallas legacy, por ejemplo:
    - `app/(auth)/Loguin.tsx`
    - `app/(normal)/Main.tsx`
    - `app/(normal)/User.tsx`
    - `app/(normal)/Dashboard.tsx`
    - `app/(cadete)/CadeteNavigator.tsx`
    - `app/(empresa)/EmpresaNavigator.tsx`
    - `app/(empresa)/PedidosPreparacion.tsx`

- Ajuste realizado:
  - Se añadieron `_layout.tsx` por grupo y rutas explícitas en vez de depender solo de `index.tsx` genéricos.
  - Los índices de grupo ahora redirigen a una pantalla concreta del flujo, no solo al grupo vacío.
  - `resolveSessionRoute()` se alineó con ese criterio y devuelve la pantalla inicial real por modo.

- Ventaja técnica:
  - Esto simplifica la futura migración desde React Navigation legacy porque el mapa mental de rutas queda mucho más cerca de `App.js`, `CadeteNavigator.jsx` y `EmpresaNavigator.jsx`.
  - También reduce ambigüedad al depurar navegación o al migrar deep links y accesos directos a pantallas específicas.

- Recomendación para próximos pasos:
  - Cada vez que se migre una pantalla registrada en el Stack legacy, crear primero su archivo equivalente en `app/` y apuntarlo al módulo espejo en `components/`.
  - Evitar depender solo de `index.tsx` cuando el legacy ya tenía nombres de pantallas explícitos y relevantes para la operación del negocio.

---

Resumen técnico – Gate raíz de sesión en Expo replicando Main.js

- Se validó un ajuste estructural importante para que el login Expo se comporte como en el proyecto legacy:
  - La autenticación no debe depender solo de un redirect disparado desde `components/loguin/Loguin.native.js`.
  - El root nativo debe reevaluar sesión y modo, igual que `Main.js`, y decidir qué superficie renderizar.

- Implementación aplicada:
  - `app/index.native.tsx` dejó de ser un redirect simple y pasó a funcionar como gate raíz de sesión.
  - Usa `Meteor.userId()`, `Meteor.user()` y una suscripción al usuario (`Meteor.subscribe('user', { _id: userId })`) para alinear el comportamiento con el `withTracker` del legacy.
  - Reproduce el criterio operativo principal:
    - sin sesión -> `Loguin`
    - sesión normal -> `MenuPrincipal`
    - `modoCadete` -> `CadeteNavigator`
    - `modoEmpresa` + rol empresa -> `EmpresaNavigator`

- Ajuste adicional importante:
  - El layout raíz de Expo ahora incluye `Portal.Host`, acercando el bootstrap al contrato global de `Main.js` donde Paper y Portal envuelven toda la app.

- Lección técnica:
  - Si el root no resuelve sesión por sí mismo, el usuario puede autenticarse correctamente pero seguir viendo el login o no percibir el cambio de superficie.
  - En esta migración, Expo Router sirve para navegación interna, pero la decisión de qué “app shell” mostrar debe vivir en el arranque nativo.

- Recomendación para próximos pasos:
  - Mantener este gate raíz al portar más lógica de `Main.js` como permisos, actualización mínima y notificaciones.
  - Cuando se migre `App.js` real, conectarlo como superficie normal autenticada detrás de este mismo gate en vez de volver a depender de redirects como mecanismo principal de sesión.

---

Resumen técnico – MenuPrincipal Expo con estructura general antes de migrar módulos pesados

- Se validó un criterio de migración importante para `components/Main/MenuPrincipal` en Expo:
  - Antes de portar widgets concretos de negocio como Cubacel, Proxy, VPN o Comercio, conviene cerrar primero la estructura visual general del menú.
  - Eso incluye header, drawer lateral, jerarquía de contenido, accesos base y separación por rol, sin depender de módulos que todavía no existen o no están listos para Expo.

- Implementación aplicada:
  - `components/Main/MenuPrincipal` se dividió por plataforma para mantener compatibilidad real con web y nativo:
    - `MenuPrincipal.native.jsx`: obtiene el usuario con Meteor y resuelve logout real.
    - `MenuPrincipal.jsx`: fallback seguro para web/previsualización, sin depender de `@meteorrn/core`.
    - `MenuPrincipalScreen.jsx`: shell compartido puramente visual y navegacional.
  - Se reconstruyó `components/Header/MenuHeader.jsx` como Appbar funcional con:
    - botón de abrir drawer
    - branding `VIDKAR`
    - menú contextual con accesos a usuario, mensajes y cerrar sesión
  - Se reconstruyó `components/drawer/DrawerOptionsAlls.js` como drawer real con:
    - bloque superior visual de usuario
    - secciones por rol
    - navegación solo hacia rutas Expo ya disponibles o con placeholder estable

- Decisión técnica clave:
  - No se añadieron entradas activas a Cubacel, Proxy, VPN ni Comercio en el menú principal nuevo.
  - En su lugar, esos módulos quedaron solamente como referencia visual de “siguiente etapa” dentro del layout, evitando navegación prematura a superficies aún no migradas.

- Rutas consideradas seguras para esta etapa:
  - `/(normal)/User`
  - `/(normal)/Mensajes`
  - `/(normal)/Dashboard`
  - `/(normal)/Users`
  - `/(normal)/Ventas`
  - `/(normal)/Servidores`
  - `/(normal)/PropertyList` solo para el rol equivalente a admin general

- Compatibilidad y arquitectura:
  - La lógica de sesión Meteor quedó encapsulada en la variante `.native.jsx` para no repetir el problema conocido de romper la salida web con imports nativos.
  - El drawer no depende de `react-native-drawer`; se resolvió con `Portal` + `Animated` + overlay propio, reduciendo dependencia externa y dejando control total sobre apertura/cierre.
  - El contenido principal del menú quedó desacoplado del origen de datos: el shell navega y renderiza estructura, mientras la sesión real entra por props.

- Validación realizada:
  - Los diagnósticos del editor quedaron limpios en los archivos modificados.
  - `npx eslint --no-cache components/Header/MenuHeader.jsx components/drawer/DrawerOptionsAlls.js components/Main/MenuPrincipalScreen.jsx` terminó con `EXIT:0`.
  - `expo lint` sigue mostrando warnings heredados del workspace y además un parse error aparentemente desfasado para esos mismos módulos; al contrastarlo con ESLint directo sin caché, los archivos editados sí validan correctamente.

- Lecciones técnicas:
  - En esta migración, primero conviene estabilizar shells y navegación antes de integrar bloques de negocio con alta dependencia de backend, colecciones o librerías nativas.
  - Separar `*.native.*` de la versión compartida evita acoplar el layout a Meteor cuando solo se necesita estructura visual en web o preview.
  - Si un menú depende de módulos aún no migrados, es mejor reservarles espacio visual o conceptual que publicar accesos rotos o placeholders engañosos dentro del drawer.
  - Para validaciones de lint en este proyecto, cuando `expo lint` muestre resultados sospechosos o desfasados, conviene contrastar con `eslint --no-cache` sobre los archivos tocados antes de asumir que el código sigue roto.

---

Resumen técnico – Error AsyncStorage nativo nulo en login Meteor dentro de Expo

- Problema detectado:
  - Al autenticarse con `Meteor.loginWithPassword`, `@meteorrn/core` intentaba persistir el token de sesión usando `@react-native-async-storage/async-storage`.
  - En este proyecto Expo eso terminaba en `AsyncStorageError: Native module is null, cannot access legacy storage` durante `_handleLoginCallback`.

- Causa raíz validada:
  - `@meteorrn/core` usa AsyncStorage por defecto si no se le inyecta una implementación propia en `Meteor.connect(...)`.
  - En Expo, aunque el paquete pueda existir en `node_modules` de forma transitiva, eso no garantiza que la implementación nativa efectiva sea la adecuada para este runtime concreto.
  - Además, la pantalla de login tenía una reconexión manual que llamaba `Meteor.connect(...)` directamente, saltándose cualquier futura abstracción centralizada.

- Solución aplicada:
  - Se instaló `expo-secure-store` con versión compatible del SDK mediante `npx expo install expo-secure-store`.
  - Se creó `services/meteor/client.native.js` para iOS/Android con un adapter de storage basado en SecureStore:
    - `getItem -> SecureStore.getItemAsync`
    - `setItem -> SecureStore.setItemAsync`
    - `removeItem -> SecureStore.deleteItemAsync`
  - La conexión Meteor nativa ahora pasa explícitamente ese adapter:
    - `Meteor.connect(endpoint, { AsyncStorage: meteorAsyncStorage })`
  - Se añadió `connectToMeteor(endpoint)` como helper central para que toda conexión/reconexión use exactamente el mismo storage.
  - `components/loguin/Loguin.native.js` dejó de llamar `Meteor.connect(...)` directamente y ahora usa `connectToMeteor(...)` también al cambiar de servidor.

- Consideraciones técnicas importantes:
  - Para MeteorRN, el almacenamiento de sesión solo necesita la interfaz mínima `getItem / setItem / removeItem`; no hace falta depender forzosamente de AsyncStorage clásico si Expo ofrece una alternativa más estable.
  - El token de sesión de Meteor es un caso adecuado para SecureStore porque su tamaño es pequeño y la semántica de persistencia es simple.
  - Mantener un `client.native.js` separado evita arrastrar dependencias nativas Expo a la variante web.
  - La versión compartida `services/meteor/client.js` quedó con un adapter web-safe basado en `localStorage` para no romper futuras importaciones en navegador.

- Validación realizada:
  - Diagnósticos del editor limpios en:
    - `components/loguin/Loguin.native.js`
    - `services/meteor/client.native.js`
    - `services/meteor/client.js`
  - `npx eslint --no-cache components/loguin/Loguin.native.js services/meteor/client.native.js services/meteor/client.js` terminó con `EXIT:0`.
  - `app.json` quedó actualizado con el plugin `expo-secure-store` y `package.json` con la dependencia directa correspondiente.

- Recomendación operativa:
  - Cualquier flujo futuro que reconecte Meteor debe pasar por `connectToMeteor(...)`, no por llamadas directas a `Meteor.connect(...)` dispersas.
  - Si vuelve a aparecer un error similar de storage en Expo, revisar primero qué implementación concreta está llegando en `options.AsyncStorage` dentro de `Meteor.connect` antes de depurar el login en sí.

---

Resumen técnico – Migración del módulo users a Expo (UserDetails, UsersHome, CreateUsers, ConsumoUsersHome y cards)

- Se completó una primera migración funcional del módulo `components/users` manteniendo el criterio del proyecto: usar superficie espejo del legacy y aislar dependencias nativas con archivos `.native.js` cuando `@meteorrn/core` podría romper la salida web.

- Estructura aplicada:
  - Implementación nativa real en:
    - `components/users/UserDetails.native.js`
    - `components/users/UsersHome.native.js`
    - `components/users/CreateUsers.native.js`
    - `components/users/ConsumoUsersHome.native.js`
  - Los archivos `.js` base quedaron como fallback seguro para web usando `ScreenFallback`, evitando importar Meteor nativo en el bundle web.

- Cards migrados y adaptados en `components/users/componentsUserDetails`:
  - `PersonalDataCard.js`
  - `UserDataCard.js`
  - `OptionsCardAdmin.js`
  - `ProxyCard.js`
  - `ProxyCardAdmin.js`
  - `ProxyCardUser.js`
  - `VpnCard.js`
  - `VpnCardAdmin.js`
  - `VpnCardUser.js`
  - `VentasCard.js`
  - `SaldoRecargasCard.jsx`
  - `TarjetaDebitoCard.jsx`
  - `DeleteAccountCard.jsx`

- Decisiones técnicas importantes:
  - Se agregó `Online = new Mongo.Collection('conexiones')` en `components/collections/collections.js` porque `UsersHome` depende del estado de conexión del usuario.
  - `TarjetaDebitoCard.jsx` NO se migró con `react-native-credit-card`; se reemplazó por una tarjeta visual propia y `expo-clipboard`, reduciendo dependencia nativa innecesaria y manteniendo la función de consulta/copiado.
  - `DeleteAccountCard.jsx` se adaptó para usar `expo-router` (`router.replace('/(auth)/Loguin')`) tras `Meteor.logout()` en vez de `navigation.reset(...)` del stack legacy.
  - `UsersHome.native.js` se migró sin `react-native-drawer`; en Expo se deja como pantalla operativa de lista/filtros porque el shell principal y drawer global ya viven en `MenuPrincipal`.
  - `UserDetails.native.js` mantiene la composición principal del legacy (datos personales, datos de usuario, ventas, saldo, proxy, vpn, opciones y eliminación de cuenta), pero deliberadamente se omitió `SendPushMessageCard` porque la capa `services/notifications/PushMessaging` todavía no existe en Expo.

- Rutas Expo añadidas o actualizadas:
  - `app/(normal)/Users.tsx` ahora exporta el módulo real `components/users/UsersHome`.
  - Se crearon:
    - `app/(normal)/CreateUsers.tsx`
    - `app/(normal)/ConsumoUsersHome.tsx`

- Dependencias usadas por esta migración:
  - `moment`
  - `react-native-calendar-picker`
  - `react-native-element-dropdown`
  - `expo-clipboard`

- Validación realizada:
  - El módulo `components/users` y las rutas nuevas quedaron sin errores reportados por el verificador del editor tras corregir el orden de hooks y pequeños artefactos del patch.

- Consideraciones para próximos desarrolladores:
  - Si se necesita soporte web real para users, no importar directamente los `.native.js`; mantener el patrón actual de base `.js` como fallback web y `.native.js` como implementación Meteor.
  - Si luego se migra `SendPushMessageCard`, primero crear una capa Expo equivalente a `services/notifications/PushMessaging` antes de volver a insertarlo en `UserDetails.native.js`.
  - Si se desea mayor fidelidad visual con el legacy, el siguiente paso no es reescribir estas pantallas, sino extraer componentes reutilizables para listas y cards manteniendo la misma superficie actual.

  ***

  Resumen técnico – Confusión de edición en login Expo por nombre real del archivo y hook faltante
  - Hallazgo principal:
    - En el proyecto Expo no existe `Login.native.js`; el archivo real que usa la pantalla es `components/loguin/Loguin.native.js`.
    - También existe la ruta wrapper `app/(auth)/Loguin.native.tsx`, pero solo reexporta el componente real desde `components/loguin/Loguin.native`.

  - Causa probable de confusión:
    - El proyecto conserva el nombre legacy `Loguin` en carpetas, archivos e imports para respetar el espejo estructural del código original.
    - Si un desarrollador busca `Login.native.js`, VS Code no encontrará el archivo correcto y parecerá que “no deja editar” el login esperado.

  - Corrección técnica aplicada:
    - Se corrigió el import de Meteor en `components/loguin/Loguin.native.js` para incluir `useTracker` desde `@meteorrn/core`.
    - Sin ese import, el archivo quedaba con errores de compilación por `useTracker is not defined`.

  - Verificaciones realizadas:
    - `components/loguin/Loguin.native.js` no está en modo solo lectura (`IsReadOnly: false`).
    - El archivo activo no tenía bloqueo de atributos en Windows; el problema no provenía del sistema de archivos.

  - Recomendación para próximos desarrolladores:
    - Cuando se revise auth en Expo, editar el componente fuente en `components/loguin/Loguin.native.js`.
    - Considerar el wrapper `app/(auth)/Loguin.native.tsx` solo como entrypoint de Expo Router, no como lugar principal de lógica.
    - Mantener consistente el naming `Loguin` mientras siga vigente el criterio de espejo exacto del legacy, o planificar una futura normalización global con rename semántico controlado.

  ***

  Resumen técnico – UserDetails Expo con fallback al usuario autenticado cuando la ruta no envía `item`
  - Problema detectado:
    - `components/users/UserDetails.native.js` esperaba siempre `params.item` desde `useLocalSearchParams()`.
    - Pero la misma ruta `/(normal)/User` se invoca en dos contextos distintos:
      - desde listados de usuarios, donde sí se hace `router.push({ pathname: '/(normal)/User', params: { item: item._id } })`
      - desde accesos directos como “Mi usuario” en menú y drawer, donde solo se navega a `/(normal)/User` sin parámetros.

  - Causa raíz:
    - Se reutilizó una única pantalla para “detalle de usuario arbitrario” y “perfil del usuario autenticado”, pero el componente solo contemplaba el primer caso.
    - Como resultado, `itemId` quedaba `undefined` al entrar desde menú/drawer y la pantalla no podía suscribirse al usuario.

  - Solución aplicada:
    - `UserDetails.native.js` ahora obtiene `currentUserId` reactivamente con `useTracker(() => Meteor.userId())`.
    - Se resolvió el identificador objetivo con prioridad:
      1. `params.item`
      2. `currentUserId`
    - De este modo, la pantalla funciona tanto para navegación con parámetro como para perfil propio sin query params.

  - Ajuste adicional:
    - Se dejó de usar `Meteor.useTracker(...)` en este archivo y se importó explícitamente `useTracker` desde `@meteorrn/core`, alineando el patrón con otros módulos Expo y evitando warnings del editor sobre el named export disponible.

  - Lección técnica:
    - Cuando una ruta Expo Router representa tanto “recurso específico” como “mi recurso”, el componente no debe asumir que siempre habrá query params; debe tener un fallback de identidad consistente.
    - Para accesos tipo “Mi usuario”, es válido navegar sin params si la pantalla sabe resolver el usuario autenticado como fallback.

  - Recomendación para próximos desarrolladores:
    - Si una pantalla depende de `useLocalSearchParams()`, revisar siempre si también puede ser invocada desde accesos globales sin parámetros.
    - Si en el futuro se separan ambas responsabilidades, considerar rutas distintas como `/(normal)/User` para perfil propio y `/(normal)/UserDetails` o `/(normal)/users/[item]` para detalle explícito.

  ***

  Resumen técnico – Convención local de `Meteor.useTracker` y ajuste de headers en Expo
  - Preferencia de implementación confirmada para este proyecto Expo:
    - Cuando se use tracking reactivo con MeteorRN, en este workspace se debe priorizar la forma `Meteor.useTracker(...)` en lugar del named import `useTracker`.
    - Mantener esa convención ayuda a que el código quede homogéneo con el resto de módulos ya migrados y evita mezclar dos estilos en la misma base.

  - Ajuste aplicado en `UserDetails.native.js`:
    - Se volvió a `Meteor.useTracker(...)` para obtener `currentUserId` y los datos reactivos de la pantalla.
    - Para evitar warnings del editor sin abandonar esa convención, se tipó localmente el import default de Meteor con JSDoc usando `typeof import('@meteorrn/core').useTracker` y luego se siguió consumiendo como `Meteor.useTracker(...)`.
    - Se añadió un header propio con `Appbar.Header`, porque la ruta se renderiza con `headerShown: false` en Expo Router y necesitaba una cabecera explícita para navegación y jerarquía visual.
    - El back action usa `router.back()` y, si no hay historial, cae a una ruta segura según el grupo actual.

  - Ajuste aplicado en `MenuHeader.jsx`:
    - Se normalizó el espaciado superior usando `useSafeAreaInsets()` y `statusBarHeight={0}` para evitar doble compensación entre `SafeAreaView` y `Appbar.Header`.
    - Esto deja el header del menú principal con una altura más controlada y consistente en dispositivos con notch/status bar alta.

  - Lección técnica:
    - Si una pantalla ya está dentro de `SafeAreaView`, no conviene dejar que `Appbar.Header` vuelva a calcular el espacio del status bar por defecto; eso puede producir headers “inflados”.
    - En rutas con `headerShown: false`, cualquier pantalla importante que necesite contexto y navegación debe proveer su propio header con espaciado explícito y consistente.

---

Resumen técnico – Normalización masiva de `Meteor.useTracker` en pantallas Expo

- Objetivo aplicado:
  - Unificar las pantallas activas del proyecto Expo bajo la convención local `Meteor.useTracker(...)` sin dejar warnings del editor por tipos incompletos del default export de `@meteorrn/core`.

- Archivos ajustados:
  - `app/index.native.tsx`
  - `components/loguin/Loguin.native.js`
  - `components/users/UsersHome.native.js`
  - `components/users/ConsumoUsersHome.native.js`
  - `components/users/componentsUserDetails/OptionsCardAdmin.js`

- Estrategia técnica usada:
  - En archivos JavaScript se tipó el import default como alias local `Meteor` usando JSDoc e incorporando la firma de `useTracker` vía `typeof import('@meteorrn/core').useTracker`.
  - En el archivo TypeScript `app/index.native.tsx` se creó un cast explícito del import default hacia un objeto con una firma manual de `useTracker`, además de `userId`, `user` y `subscribe`, porque el módulo no expone un tipo reutilizable estable para esa API desde el punto de vista del editor.
  - Se mantuvo la convención pedida por el proyecto y por el usuario: uso de `Meteor.useTracker(...)` en vez de importar `useTracker` directamente.

- Hallazgo adicional en `OptionsCardAdmin.js`:
  - Existía un error real de orden de hooks: el componente hacía `return null` antes de ejecutar `Meteor.useTracker(...)` y luego calculaba `useMemo(...)` después del early return.
  - Se corrigió moviendo la resolución de `itemId` antes del hook, dejando `Meteor.useTracker(...)` siempre en el mismo orden y reemplazando `useMemo` por una lectura directa de `Meteor.user()?.username` para evitar un hook innecesario.

- Lección técnica:
  - En este proyecto, el principal problema con `Meteor.useTracker(...)` no era funcional sino de tipado del editor; por eso conviene encapsular el cast una vez por archivo en lugar de volver al named import.
  - Si un componente tiene early returns, todos los hooks reactivos deben declararse antes de cualquier salida condicional o deben depender de valores ya normalizados como `itemId`.

---

Resumen técnico – Headers sin suma de `insets.top` en pantallas Expo

- Ajuste aplicado por criterio visual del proyecto:
  - En pantallas con `Appbar.Header` donde se estaba usando el patrón:
    - `paddingTop: insets.top`
    - `height: 56 + insets.top`
  - Se eliminó la suma del `safe area inset` para evitar headers más altos de lo deseado.

- Pantallas corregidas:
  - `components/users/UsersHome.native.js`
  - `components/users/UserDetails.native.js`

- Criterio final aplicado:
  - El header queda con altura fija base de `56` y sin `paddingTop` derivado de `insets.top`.
  - Si una pantalla necesita compensación de status bar, debe resolverse por otro mecanismo explícito y no inflando el `Appbar.Header` con el inset superior.

- Lección técnica:
  - Sumar `insets.top` directamente al `Appbar.Header` cambia demasiado la altura visual del toolbar y rompe consistencia entre pantallas.
  - En este proyecto, la preferencia validada es no usar `insets.top` para agrandar los headers de pantallas operativas.

---

Resumen técnico – Drawer legacy migrado a Expo con rutas espejo y visibilidad por rol

- Se actualizó `components/drawer/DrawerOptionsAlls.js` para reflejar mucho más de cerca la estructura funcional del drawer del proyecto React Native CLI, manteniendo el criterio del proyecto Expo: la navegación debe acercarse al naming y a la intención del legacy aunque la implementación real todavía esté en migración.

- Estructura del drawer aplicada en Expo:
  - `Navegación general`:
    - `/(normal)/User`
    - `/(normal)/Mensajes`
  - `Servicios VidKar`:
    - `/(normal)/PeliculasVideos` solo si `user.subscipcionPelis === true`
    - `/(normal)/ProductosCubacelCards`
    - `/(normal)/ProxyPackages`
    - `/(normal)/VPNPackages`
    - `/(normal)/ProxyVPNHistory`
    - `/(normal)/ComerciosList`
    - `/(normal)/remesas` solo si `user.permiteRemesas === true`
  - `Opciones de administradores`:
    - `/(normal)/Dashboard`
    - `/(normal)/Users`
    - `/(normal)/AllMensajesUser`
    - `/(normal)/ListaArchivos`
    - `/(normal)/CreateUsers`
    - `/(normal)/Logs`
    - `/(normal)/Servidores`
  - `Opciones privadas` solo para `carlosmbinf`:
    - `/(normal)/Ventas`
    - `/(normal)/ListaPropertys`
    - `/(normal)/MapaUsuarios`

- Criterio técnico validado:
  - Si una opción del drawer legacy todavía no tiene pantalla Expo real, no conviene dejar un link roto ni depender de componentes `() => null` como superficie visible.
  - En esos casos es preferible crear una ruta Expo explícita con `ScreenFallback`, dejando el entrypoint operativo y profesional desde ya.
  - Esto permite que el drawer quede estable y que luego solo se sustituya el contenido interno sin volver a tocar navegación, permisos ni estructura del menú.

- Rutas nuevas añadidas en `app/(normal)`:
  - `PeliculasVideos.tsx`
  - `ProductosCubacelCards.tsx`
  - `ProxyPackages.tsx`
  - `VPNPackages.tsx`
  - `ProxyVPNHistory.tsx`
  - `AllMensajesUser.tsx`
  - `ListaArchivos.tsx`
  - `Logs.tsx`
  - `remesas.tsx`
  - `ListaPropertys.tsx` como alias del route existente de properties
  - `MapaUsuarios.tsx`

- Ajuste complementario importante:
  - `app/(normal)/_layout.tsx` se amplió para registrar explícitamente esas rutas en el stack del grupo normal.
  - `components/Main/MenuPrincipalScreen.jsx` se actualizó para no seguir mostrando textos obsoletos que decían que Cubacel, Proxy, VPN y Comercio estaban “fuera del menú”, porque ahora sí están expuestos en el drawer mediante rutas espejo.

- Modo cadete:
  - Se añadió una acción inferior de drawer para alternar `modoCadete` desde Expo nativo, manteniendo la idea operativa del drawer legacy.
  - La llamada real a `Meteor.call('users.toggleModoCadete', nextState)` se dejó encapsulada en `components/Main/MenuPrincipal.native.jsx` para no romper la variante preview/web.
  - Regla validada: cuando una acción del drawer requiere Meteor o runtime nativo, conviene pasarla como prop desde el shell `.native.jsx` en lugar de acoplar el drawer compartido a imports nativos.

- Lecciones técnicas:
  - En esta migración, el drawer debe ser un mapa estable de capacidades del sistema, no solo una lista de pantallas ya terminadas.
  - Alias de ruta como `ListaPropertys.tsx` pueden ser útiles para conservar el naming mental del legacy aunque internamente Expo ya tenga una ruta equivalente con otro nombre.
  - El copy del shell principal también debe mantenerse consistente con el estado real del drawer; si la navegación cambia, los textos del menú no pueden seguir describiendo una situación vieja.

---

Resumen técnico – Header del menú principal con popup de mensajes igual al legacy

- Problema detectado en Expo:
  - `components/Header/MenuHeader.jsx` exponía “Mensajes” solo como opción del menú de tres puntos.
  - El componente espejo `components/components/MenuIconMensajes.js` seguía como placeholder nulo, así que el header no replicaba el comportamiento real del proyecto legacy.

- Criterio validado:
  - En el legacy, el header no calcula mensajes dentro de `MenuHeader`; delega toda la lógica a `MenuIconMensajes`.
  - Si se quiere igualdad funcional y visual, Expo debe conservar esa misma separación: botón de email independiente + popup `Menu` con `List.Item`, `Avatar`, `Badge`, `Divider` y el mismo cálculo de conversaciones.

- Lógica replicada de forma intencional:
  - Suscripción a `mensajes` filtrada por `{ to: Meteor.userId() }`.
  - Construcción del array de usuarios desde los remitentes únicos de los mensajes recibidos, no desde una lista global de chats.
  - Badge superior con el conteo exacto de no leídos usando `{ to: currentUserId, leido: false }`.
  - Cada fila del popup sigue usando el último mensaje bidireccional entre ambos usuarios y antepone `TU: ` cuando el último mensaje lo envió el usuario autenticado.
  - Badge por fila con el conteo exacto de no leídos por remitente.

- Ajuste estructural aplicado:
  - `MenuHeader.jsx` volvió a la composición conceptual del legacy:
    - botón hamburguesa
    - branding
    - `MenuIconMensajes`
    - menú de tres puntos solo para perfil y logout
  - Se añadió la ruta espejo `app/(normal)/Mensaje.tsx` y se registró en el stack normal para que el popup tenga un destino estable por conversación.

- Recomendación para próximos desarrolladores:
  - Si se migra después `components/mensajes/MensajesHome.js`, mantener `MenuIconMensajes.native.js` como fuente de verdad del popup del header y evitar duplicar el cálculo en `MenuHeader` o en el shell principal.
  - Si se moderniza la consulta de conversaciones, primero validar contra el comportamiento actual del legacy porque este popup no agrupa “chats”, agrupa remitentes de mensajes recibidos.

---

Resumen técnico – Botón de mensajes siempre visible en header Expo

- Problema detectado:
  - Tras portar `MenuIconMensajes.native.js`, el header podía quedar sin botón de mensajes porque el componente devolvía `null` cuando `users.length === 0`.
  - Eso hacía que, si todavía no había conversaciones recibidas cargadas, desapareciera toda la acción del header y pareciera rota.

- Ajuste aplicado:
  - El botón de email ahora queda visible siempre que exista sesión (`Meteor.userId()`).
  - Si existen conversaciones, el botón abre el popup con la misma lógica replicada del legacy.
  - Si no existen conversaciones aún, el botón usa el fallback `onOpenMessages()` para abrir la ruta general de mensajes en lugar de desaparecer.

- Lección técnica:
  - En Expo conviene separar dos responsabilidades:
    - visibilidad de la acción global del header
    - disponibilidad de datos para poblar el popup
  - El popup puede depender de conversaciones cargadas; el botón del header no.

---

Resumen técnico – Migración de MensajesHome a Expo sin dependencias terceras

- Objetivo aplicado:
  - Migrar la conversación de usuarios del legacy (`components/mensajes/MensajesHome.js`) manteniendo la interfaz y el flujo operativo, pero sin depender de librerías terceras como `moment`.

- Estrategia aplicada:
  - Se creó `components/mensajes/MensajesHome.native.js` como implementación real para iOS/Android y se dejó `components/mensajes/MensajesHome.js` como fallback seguro para web.
  - Las rutas `app/(normal)/Mensaje.tsx`, `app/(empresa)/Mensaje.tsx` y `app/(normal)/Mensajes.tsx` consumen el mismo módulo espejo, evitando duplicar la pantalla.
  - El fallback del botón del header ya no abre un placeholder; abre la propia pantalla de conversación, incluso sin `item`, mostrando la misma superficie visual con estado vacío.

- Compatibilidad técnica lograda:
  - Se mantuvo la lógica de suscripción Meteor para mensajes bidireccionales y marcado automático de leídos.
  - Se mantuvo la composición visual principal:
    - lista invertida de mensajes
    - burbujas propias y ajenas
    - avatar condicional
    - timestamp por mensaje
    - composer inferior con overlay translúcido
  - Se reemplazó `moment` por helpers basados en `Intl.DateTimeFormat` y `Date` para reproducir:
    - `HH:mm`
    - `Hoy`
    - `Ayer`
    - nombre del día en semana actual
    - fecha corta fuera de ese rango

- Recomendación importante:
  - Si luego se migra `ChatUsersHome`, no mezclar su responsabilidad con `MensajesHome`; este módulo debe seguir representando la conversación directa con un usuario concreto, no el selector/listado de conversaciones.

---

Resumen técnico – Color unificado de SafeArea y headers oscuros

- Ajuste visual validado:
  - En `MenuPrincipalScreen`, el `SafeAreaView` ya usaba fondo `#0f172a`, pero `MenuHeader` mantenía otro color y dejaba visible un corte entre status bar/safe area y toolbar.
  - La solución correcta fue unificar ambos con el mismo color oscuro, en lugar de cambiar el SafeArea al color del header anterior.

- Cambios aplicados:
  - `components/Header/MenuHeader.jsx` ahora usa `#0f172a` como fondo del header.
  - `components/components/MenuIconMensajes.native.js` cambió el icono de email con badge a blanco para conservar contraste sobre el header oscuro.
  - `components/mensajes/MensajesHome.native.js` recibió header propio con el mismo color `#0f172a`, `Appbar.BackAction` y subtítulo con el nombre del usuario de la conversación.

- Lección técnica:
  - Si un `SafeAreaView` pinta el área superior y el header usa otro color, el corte visual se nota inmediatamente aunque el layout sea correcto.
  - Cuando el header se oscurece, cualquier acción iconográfica que antes usaba negro debe revisarse por contraste antes de dar el cambio por terminado.

---

Resumen técnico – Header base configurable con color por parámetro

- Objetivo aplicado:
  - Unificar los headers activos de Expo con el color del menú principal, pero evitando hardcodear ese color en cada pantalla.

- Solución implementada:
  - Se creó `components/Header/AppHeader.jsx` como wrapper reutilizable sobre `Appbar.Header`.
  - El componente acepta `backgroundColor` como parámetro y usa por defecto `#0f172a` (`DEFAULT_HEADER_COLOR`).
  - También permite inyectar `left`, `actions`, `title`, `subtitle` y estilos específicos de título/subtítulo.

- Pantallas adaptadas al header base:
  - `components/Header/MenuHeader.jsx`
  - `components/mensajes/MensajesHome.native.js`
  - `components/users/UsersHome.native.js`
  - `components/users/UserDetails.native.js`
  - `components/users/ConsumoUsersHome.native.js`
  - `components/shared/ScreenFallback.jsx`
  - `components/shared/ModeShell.js`

- Lección técnica:
  - Si se quiere consistencia visual real, el color del header no debe vivir en múltiples `StyleSheet.create` dispersos.
  - El color por defecto debe centralizarse, pero el componente debe seguir permitiendo sobrescritura por parámetro para flujos especiales futuros.

---

Resumen técnico – Safe area superior centralizado en AppHeader

- Problema detectado:
  - Varias pantallas ya usaban `AppHeader`, pero este wrapper no gestionaba el `top` safe area por sí mismo.
  - En pantallas sin `SafeAreaView` envolvente, el header quedaba demasiado arriba y visualmente recortado por la zona de estado/notch.

- Solución aplicada:
  - `components/Header/AppHeader.jsx` ahora envuelve el toolbar con `SafeAreaView` usando `edges={['top', 'left', 'right']}` por defecto.
  - Se añadió la prop `includeSafeAreaTop` para desactivar ese comportamiento cuando el padre ya maneja el inset superior.
  - `components/Header/MenuHeader.jsx` usa `includeSafeAreaTop={false}` porque `MenuPrincipalScreen` ya tiene `SafeAreaView` propio en la raíz.

- Regla práctica:
  - Si una pantalla renderiza `AppHeader` directamente y no tiene `SafeAreaView` superior propio, dejar el comportamiento por defecto.
  - Si el screen ya está envuelto por un `SafeAreaView` con `top`, desactivar el manejo interno del header para evitar doble espacio.

---

Resumen técnico – Migración inicial del módulo Cubacel a Expo (productos, cards y tabla de recargas)

- Se dejó operativa una primera migración real del módulo `components/cubacel` respetando el criterio del proyecto: espejo de estructura legacy, lógica Meteor equivalente y sustitución de dependencias no deseadas por módulos Expo o RN Paper ya disponibles.

- Estructura aplicada:
  - Implementación nativa creada en:
    - `components/cubacel/CubaCelCard.native.jsx`
    - `components/cubacel/Productos.native.jsx`
    - `components/cubacel/TableRecargas.native.jsx`
    - `components/cubacel/ProductosScreen.native.jsx`
  - Los archivos base `.jsx` quedaron como fallback seguro mediante `ScreenFallback`, evitando placeholders silenciosos fuera de iOS/Android.

- Colecciones Meteor añadidas en Expo para recuperar el contrato de datos del legacy:
  - `VentasRechargeCollection`
  - `TransaccionRecargasCollection`
  - `DTShopProductosCollection`
  - `EvidenciasVentasEfectivoCollection`
  - y colecciones auxiliares de recharge (`CarritoCollection`, `OrdenesCollection`, `PreciosRechargeCollection`, etc.) para no seguir rompiendo imports futuros del módulo.

- Card Cubacel migrado:
  - Se preservó la lógica principal del legacy:
    - lectura de promociones
    - detección de promo activa/adelantada
    - extracción de imagen desde markdown o URL plana
    - fallback a imagen local
    - chips de precio en USD/CUP/UYU
    - diálogo de recarga con campos dinámicos según `required*Fields`
    - inserción en carrito vía `Meteor.call('insertarCarrito', ...)`
  - Se evitó `BlurView`; cuando el fondo debe atenuarse se usa overlay translúcido, consistente con la decisión previa del proyecto.
  - Se reemplazó el formateo de fechas promocionales por `Intl.DateTimeFormat` en lugar de `moment`.

- Lista de productos migrada:
  - `Productos.native.jsx` ya suscribe `productosDtShop` y consume `DTShopProductosCollection`.
  - Se mantuvo el criterio del legacy al ordenar:
    - primero productos con promoción
    - luego por precio ascendente
    - finalmente por `id`
  - Para replicar el fondo superior legacy se usó `expo-linear-gradient`, no `react-native-linear-gradient`.

- Tabla de recargas migrada:
  - `TableRecargas.native.jsx` usa `DataTable` de RN Paper, modal de detalle y refresco manual de estado vía `Meteor.call('dtshop.getStatusTransaccionById', ...)`.
  - Se mantuvo la derivación de estado visual por venta/transacción (`ENTREGADA`, `PENDIENTE_PAGO`, `PENDIENTE_ENTREGA`, `CANCELADA`).
  - El detalle conserva tarjetas por recarga, badges visuales por estado, comentario y contenedor de evidencia para pagos en efectivo.

- Ruta Expo conectada:
  - `app/(normal)/ProductosCubacelCards.tsx` ya no usa `ScreenFallback`; ahora apunta a `components/cubacel/ProductosScreen`.
  - `ProductosScreen.native.jsx` compone la superficie como en el flujo legacy: header propio + strip de productos + bloque de tabla/historial.

- Limitación técnica actual importante:
  - `components/archivos/SubidaArchivos.jsx` sigue siendo placeholder en Expo.
  - El legacy depende de `react-native-image-crop-picker` y `react-native-permissions`, pero el proyecto Expo actual no tiene instalado un picker compatible (`expo-image-picker` o equivalente).
  - Por tanto, la tabla ya deja el punto de integración preparado para evidencia en `EFECTIVO`, pero la carga real de archivos todavía requiere migrar ese módulo con una estrategia Expo-compatible.

- Regla práctica validada:
  - Antes de migrar un módulo de negocio con Meteor, primero restaurar sus colecciones y contratos de publicación/métodos. Si no, el UI puede verse correcto pero la pantalla queda vacía o inconsistente.
  - En Expo, si un módulo legacy usaba una librería visual o nativa reemplazable, conviene preferir la alternativa oficial del stack actual (`expo-linear-gradient`, overlays propios, Paper) en vez de forzar compatibilidad artificial con la dependencia vieja.

- Próximos pasos recomendados:
  - Migrar `SubidaArchivos` usando un picker compatible con Expo antes de considerar el flujo de recargas en efectivo como cerrado.
  - Revisar si falta algún publish Meteor para `productosDtShop`, `ventasRecharge` o `transacciones` en el entorno Expo conectado.
  - Añadir ajuste fino responsive al modal de detalle si se detectan pantallas pequeñas con mucho contenido vertical.

---

Resumen técnico – CubaCelCard defensivo contra promociones nulas o mal serializadas

- Hallazgo detectado en Expo:
  - Algunos productos de Cubacel no entregan `promotions` como array limpio; pueden llegar como `null`, `undefined` o como objeto indexado.
  - Eso rompía el render en `CubaCelCard.native.jsx` dentro de `extractPromoImageUrl(...)` al asumir una estructura iterable estable.

- Solución aplicada:
  - Se añadió una normalización central `normalizeToArray(value)` que acepta:
    - arrays
    - objetos indexados
    - `null` / `undefined`
  - Esa normalización ahora se usa para:
    - `promotions`
    - grupos dinámicos `required*Fields`
  - Con eso el card ya no depende de que el backend entregue un shape perfecto para renderizar promos, imagen promo o inputs dinámicos.

- Regla práctica:
  - En este proyecto, los payloads Meteor heredados no deben asumirse siempre homogéneos.
  - Si un campo legacy puede venir como lista o diccionario serializado, normalizar primero y recién después aplicar `map`, `flat`, `for...of` o lecturas de índices.

---

Resumen técnico – Paridad visual del fallback en CubaCelCard

- Problema detectado:
  - Al retirar el asset local vacío del card de Cubacel, el fallback visual quedó como un bloque plano de color.
  - Eso alteró demasiado la percepción del card respecto al legacy, aunque la lógica siguiera funcionando.

- Corrección aplicada:
  - `CubaCelCard.native.jsx` volvió a usar un `ImageBackground` único para toda la tarjeta.
  - Cuando no hay imagen promocional remota disponible, el fallback usa `components/files/space-bg-shadowcodex.jpg` en vez de un color plano.
  - También se restauró el copy visual del ribbon tal como en legacy:
    - `🎁 PROMOCIÓN ACTIVA`
    - `⏰ ADELANTA PROMO`

- Regla práctica:
  - En cards visuales migradas desde el legacy, si se elimina un asset roto no conviene reemplazarlo por un color arbitrario si el componente original dependía de textura/fondo fotográfico para su identidad.
  - Si el asset primario falla, usar un fallback visual ya existente en el proyecto antes que simplificar la tarjeta a un bloque plano.

---

Resumen técnico – Asset fallback correcto de CubaCelCard en Expo

- Hallazgo validado al contrastar visualmente legacy vs Expo:
  - El fondo fallback correcto del card de Cubacel no es `components/files/space-bg-shadowcodex.jpg`.
  - El legacy usa específicamente `components/cubacel/Gemini_Generated_Image_rtg44brtg44brtg4.png` como imagen local por defecto del card.

- Impacto visual:
  - Aunque ambos assets sean válidos, cambiar el fondo por una imagen genérica del proyecto altera demasiado la identidad del card.
  - La imagen `Gemini_Generated_Image_rtg44brtg44brtg4.png` aporta la paleta y composición esperadas cuando no existe imagen promocional remota.

- Regla práctica:
  - Si se busca paridad visual con el legacy, el fallback de un card debe conservar el asset específico del módulo siempre que ese archivo exista y esté sano.
  - No sustituir un fondo de módulo por un asset genérico del proyecto salvo que el original esté realmente roto o ausente.

---

Resumen técnico – Overlay absoluto bloqueando visualmente ImageBackground en CubaCelCard

- Problema detectado en Expo:
  - El `ImageBackground` sí estaba cargando la imagen local correcta, pero el card seguía viéndose mal porque un `View` absoluto con tinte se renderizaba siempre cuando `!promoImageUrl`.
  - Justamente el fallback local se usa en ese mismo caso, así que el overlay estaba cubriendo visualmente el fondo del card y daba la impresión de que la imagen no funcionaba.

- Corrección aplicada:
  - El overlay absoluto ahora solo se renderiza cuando `ocultarFondo === true`.
  - También se restauró `paddingTop: 12` en `imageBackground` para volver a la composición vertical del legacy.

- Regla práctica:
  - Si un `ImageBackground` usa fallback local y además existe una capa absoluta de blur/tinte, esa capa debe condicionarse con precisión; si se activa en el mismo escenario del fallback, termina anulando visualmente la imagen aunque técnicamente sí esté cargada.

---

Resumen técnico – ImageBackground como capa absoluta en CubaCelCard

- Hallazgo detectado al revisar el render real en Expo:
  - Aunque el asset correcto y el overlay ya estaban ajustados, la imagen de fondo seguía viéndose como una franja superior.
  - La causa era que `ImageBackground` seguía participando en el flujo del layout del contenido del card, en lugar de comportarse como una capa de fondo desacoplada.

- Corrección aplicada:
  - `ImageBackground` pasó a renderizarse con `StyleSheet.absoluteFillObject` dentro de un contenedor relativo (`cardLayer`).
  - El contenido del card quedó en una capa superior separada (`imageBackground` + `cardContent`).
  - Esto fuerza que la imagen ocupe toda la tarjeta independientemente de cómo React Native Paper distribuya el contenido interno del `Card`.

- Regla práctica:
  - Si un fondo debe cubrir visualmente toda una card en Expo/RN Paper, es más estable tratarlo como capa absoluta dentro de un contenedor relativo que usar `ImageBackground` como wrapper directo del contenido.

---

Resumen técnico – BlurView oficial de Expo en CubaCelCard

- Cambio aplicado por requerimiento visual explícito:
  - Se integró `BlurView` desde `expo-blur` en `components/cubacel/CubaCelCard.native.jsx`.
  - El blur se renderiza en el mismo punto donde antes estaba el overlay translúcido, manteniendo la estructura del card alineada con legacy.

- Criterio técnico:
  - Si el proyecto Expo necesita recuperar un fondo borroso en una superficie concreta, conviene usar `expo-blur` antes que volver a dependencias nativas removidas del stack anterior.
  - En este card el blur solo se aplica cuando `ocultarFondo === true` o cuando no existe imagen promocional remota, respetando la lógica visual del componente.

---

Resumen técnico – BlurView no visible en CubaCelCard por falta de layout y activación Android

- Hallazgo puntual en este card:
  - El diseño general del componente estaba correcto; el único problema era el bloque del `BlurView`.
  - El blur no se percibía porque el componente se renderizaba sin `style` de overlay absoluto, así que no ocupaba realmente el área del fondo.
  - En Android además faltaba activar el modo experimental de blur soportado por `expo-blur ~15`.

- Corrección mínima aplicada:
  - Se mantuvo intacta la estructura del card, la imagen y el resto del contenido.
  - Solo se ajustó el `BlurView` para usar:
    - `style={StyleSheet.absoluteFillObject}`
    - `experimentalBlurMethod="dimezisBlurView"` en Android
    - `blurReductionFactor={1}` para que el blur no quedara demasiado atenuado
    - una intensidad visible en vez de valores casi imperceptibles

- Lección práctica:
  - Si un `BlurView` en Expo parece “no funcionar” pero no da error, revisar primero dos cosas antes de tocar el layout completo del componente:
    - si realmente ocupa el área que debe cubrir
    - si en Android está activado el método experimental compatible con la versión instalada

---

Resumen técnico – Migración de evidencias de ventas a Expo (`archivos/*`)

- Objetivo aplicado:
  - Se migró a Expo el flujo visual y funcional de evidencias de ventas en efectivo del legacy:
    - `components/archivos/SubidaArchivos`
    - `components/archivos/AprobacionEvidenciasVenta`
    - `components/archivos/ListaArchivos`
  - También se restauró el soporte visual requerido por estos módulos con `components/drawer/DrawerBottom.native.jsx`.

- Sustitución técnica clave:
  - Se eliminó la dependencia conceptual de `react-native-image-crop-picker` para el flujo Expo.
  - El picker ahora usa `expo-image-picker`, manteniendo cámara, galería, base64, permisos y edición básica compatibles con Expo.

- Decisiones de implementación validadas:
  - En Expo SDK 54 conviene resolver permisos de cámara y galería con `expo-image-picker` mismo, en lugar de portar `react-native-permissions` al nuevo proyecto.
  - Para copiar datos de pago y cuentas se usó `expo-clipboard`, alineado con el stack Expo ya presente en el repo.
  - `ListaArchivos` dejó de ser `ScreenFallback` en nativo y pasó a renderizar la lista real de aprobaciones.
  - `SubidaArchivos` y `AprobacionEvidenciasVenta` se implementaron en archivos `.native.jsx` para no comprometer la salida web del proyecto.

- Alcance funcional migrado:
  - consulta reactiva de ventas y evidencias con `Meteor.useTracker(...)`
  - cards visuales de aprobación con resumen de productos, comisiones y evidencias
  - preview de evidencias con bottom sheet
  - aprobación/rechazo de evidencia y aprobación/rechazo de venta
  - subida de evidencia con cámara o galería
  - obtención de base64 para `Meteor.call('archivos.upload', ...)`
  - UI de cuentas/tarjeta y copiado al portapapeles

- Consideración importante sobre el reemplazo del picker:
  - `expo-image-picker` no replica exactamente todas las capacidades UI de cropping de `react-native-image-crop-picker`.
  - Para preservar el flujo con mínima desviación, se mantuvo la misma intención de UX y se usó edición básica compatible con Expo cuando aplica.
  - Si en el futuro se exige paridad total de recorte avanzado, habrá que evaluar una estrategia adicional específica para Expo.

- Infraestructura adicional aplicada:
  - Se instaló `expo-image-picker`.
  - Se añadió el plugin correspondiente en `app.json` con textos de permisos de cámara y fotos orientados al caso de uso de evidencias.

- Lección práctica:
  - Cuando se migra un módulo legacy dependiente de APIs nativas a Expo, no conviene copiar literalmente el paquete original si el ecosistema Expo ya ofrece una alternativa oficial razonable.
  - En esta migración, la prioridad correcta fue mantener la superficie visual y el contrato de negocio, sustituyendo solo la capa de acceso a imagen/permisos.

---

Resumen técnico – Imports nativos explícitos para evitar placeholders `null`

- Problema detectado en Expo:
  - Algunos archivos `.native.jsx` estaban importando módulos por su ruta base, por ejemplo:
    - `../archivos/SubidaArchivos`
    - `./AprobacionEvidenciasVenta`
    - `../drawer/DrawerBottom`
  - En este proyecto, varios de esos archivos base `.jsx` todavía existen como placeholders seguros para web y devuelven `null`.

- Síntoma visible:
  - La UI mostraba el bloque contenedor correcto, pero el componente interno no aparecía, dejando un hueco debajo del texto o dentro del flujo esperado.
  - Esto afectó directamente el caso de `TableRecargas.native.jsx`, donde se veía el aviso para subir evidencia pero no aparecía `SubidaArchivos` debajo.

- Causa raíz validada:
  - Aunque React Native normalmente resuelve `.native.*` antes que la variante base, en una base migrada con wrappers/fallbacks conviene no dejar esa resolución implícita cuando el archivo importado tiene un placeholder homónimo.
  - Si un archivo nativo importa una ruta base cuyo archivo `.jsx` devuelve `null`, el resultado perceptible puede ser exactamente “no sale nada” sin que el editor marque error.

- Corrección aplicada:
  - Se cambiaron imports nativos a rutas explícitas de implementación real:
    - `components/cubacel/TableRecargas.native.jsx` -> `../archivos/SubidaArchivos.native`
    - `components/archivos/ListaArchivos.native.jsx` -> `./AprobacionEvidenciasVenta.native`
    - `components/archivos/SubidaArchivos.native.jsx` -> `../drawer/DrawerBottom.native`
    - `components/archivos/AprobacionEvidenciasVenta.native.jsx` -> `../drawer/DrawerBottom.native`

- Regla práctica para próximos desarrolladores:
  - Si un archivo `.native.*` depende de otro módulo que también tiene variante base placeholder para web, preferir import explícito a la versión `.native` cuando se trate de una integración crítica de UI.
  - No asumir que la ausencia visual de un componente implica un problema de estilos; en migraciones espejo con placeholders, primero revisar si el import está cayendo en un wrapper base que devuelve `null`.

---

Resumen técnico – ProxyPackages no mostraba paquetes por ausencia total de variante `.native`

- Problema detectado en Expo:
  - La ruta `/(normal)/ProxyPackages` sí existía y abría correctamente, pero renderizaba solo un `ScreenFallback` en vez del catálogo real de paquetes Proxy.

- Causa raíz validada:
  - `app/(normal)/ProxyPackages.tsx` importa `components/proxy/ProxyPackageCard`.
  - En ese path solo existía `ProxyPackageCard.jsx`, que en Expo está definido como wrapper placeholder para web y preview.
  - No existía todavía `components/proxy/ProxyPackageCard.native.jsx`, por lo que en runtime nativo no había ninguna implementación real que resolver.

- Impacto visible:
  - El usuario podía entrar a “Productos Proxy”, pero no veía la pantalla de compra de paquetes ni el flujo legado esperado.

- Corrección aplicada:
  - Se creó `components/proxy/ProxyPackageCard.native.jsx` con la UI real de paquetes Proxy adaptada a Expo Router.
  - Se creó `components/proxy/ProxyPackageCardItem.native.jsx` para preservar la card visual del legacy y reutilizarla también en futuros listados horizontales.
  - Se creó `components/proxy/ProxyPurchaseScreen.native.jsx` para habilitar la confirmación de compra y el alta en carrito desde Expo.

- Lección práctica:
  - Si una ruta Expo apunta a un módulo espejo bajo `components/*`, no basta con que exista el archivo base `.jsx`; para runtime nativo debe existir la variante `.native.*` si el archivo base se usa como fallback seguro.
  - Cuando una pantalla “abre pero no muestra la funcionalidad”, revisar primero si falta la implementación `.native` completa antes de depurar estilos o datos.

---

Resumen técnico – Migración inicial de Proxy/VPN a Expo (pantallas, compra, carrusel e historial)

- Alcance aplicado en Expo:
  - Se añadieron implementaciones nativas reales para:
    - `components/proxy/ProxyPackageCard.native.jsx`
    - `components/proxy/ProxyPackageCardItem.native.jsx`
    - `components/proxy/ProxyPurchaseScreen.native.jsx`
    - `components/vpn/VPNPackageCard.native.jsx`
    - `components/vpn/VPNPackageCardItem.native.jsx`
    - `components/vpn/VPNPurchaseScreen.native.jsx`
    - `components/proxyVPN/ProxyVPNPackagesHorizontal.native.jsx`
    - `components/ventas/TableProxyVPNHistory.native.jsx`

- Criterio de migración validado:
  - Se preservó el diseño legacy de cards premium, badges “Más popular”, precio en pill, bloque de saldo y CTA de compra.
  - La adaptación principal fue de navegación: en Expo Router la compra navega con `router.push(...)` y los params complejos del paquete se serializan en JSON.

- Flujos cubiertos:
  - carga de paquetes por `Meteor.call('precios.getAllProxyVPNPackages', type)`
  - validación defensiva de servicio activo antes de permitir nueva compra:
    - Proxy: `user.baneado === false && !isIlimitado`
    - VPN: `user.vpn === true && !vpnIsIlimitado`
  - pantalla de confirmación de compra con cálculo de precio vía `ventas.calcularPrecioProxyVPN`
  - alta en carrito vía `carrito.addProxyVPN`
  - carrusel horizontal en menú principal con consumo actual y CTA hacia compra
  - historial de compras Proxy/VPN con detalle por venta y soporte de evidencia para `EFECTIVO`

- Consideración técnica importante:
  - `MenuPrincipalScreen.jsx` ya importaba `components/proxyVPN/ProxyVPNPackagesHorizontal` desde la ruta base. Una vez creada la variante `.native.jsx`, el runtime nativo ya puede resolver el módulo real sin tocar la versión fallback de web.
  - Lo mismo aplica para `ProxyPackages`, `VPNPackages`, `ProxyPurchase`, `VPNPurchase` y `ProxyVPNHistory`: los entrypoints Expo ya existían; faltaban sus implementaciones `.native.*` reales.

- Regla práctica:
  - En este proyecto, cuando un módulo espejo ya está expuesto por una ruta o por el menú, la ausencia de UI suele indicar una de dos cosas:
    - falta total de la variante `.native.*`
    - import que cae en un wrapper base placeholder
  - Antes de depurar datos o estilos, validar siempre cuál archivo está resolviendo realmente Metro en nativo.

---

Resumen técnico – Paridad visual exacta en pantallas Proxy/VPN de Expo

- Hallazgo validado durante el ajuste fino visual:
  - La mayor diferencia perceptible entre Expo y legacy no estaba en los archivos item (`ProxyPackageCardItem` / `VPNPackageCardItem`), sino en las pantallas padre (`ProxyPackageCard.native.jsx` y `VPNPackageCard.native.jsx`).
  - El problema principal era haber simplificado el render del paquete premium/ilimitado usando el item genérico, cuando en legacy existe un renderer dedicado con layout, ancho y jerarquía visual propios.

- Corrección aplicada:
  - Se reemplazó el uso del item genérico para el premium por un `renderUnlimitedPackageCard()` específico en Proxy y VPN, replicando la estructura del legacy.
  - Se restauraron los deltas de ancho del premium usados en legacy:
    - Proxy: `premiumWidthDelta = 8`
    - VPN: `premiumWidthDelta = 100`
  - Se restauraron estilos del premium y de cards normales a nivel pantalla:
    - `unlimitedCard`
    - `unlimitedTitle`
    - `unlimitedDescription`
    - `priceContainerShadow`
    - `recommendedCard`
    - `recommendedBadge`
    - `packageContentMobile`
    - `historyButtonTablet`
    - `currentStatus.maxHeight = 30`

- Ajustes de fidelidad visual importantes:
  - Se eliminó el texto de vencimiento bajo el chip de saldo en Expo porque no forma parte de la superficie legacy en esas pantallas.
  - VPN volvió a usar exactamente el copy del legacy:
    - `Navegación segura y privada 🔒`
  - El chip de estado de VPN volvió a usar `database` en lugar de `shield`, alineando iconografía con legacy.
  - El empty state de VPN volvió a usar `package-variant-closed` como en el proyecto original.

- Lección práctica para próximos desarrolladores:
  - En esta migración, si una pantalla legacy tiene una card premium visualmente distinta, no conviene abstraerla demasiado pronto a un item reutilizable “parecido”.
  - Primero hay que clonar la composición exacta del legacy y solo después evaluar si existe una abstracción segura que no cambie:
    - ancho
    - altura
    - jerarquía del header
    - sombra del precio
    - padding vertical
    - copy del subtítulo y badges

---

Resumen técnico – Theme global de React Native Paper en Expo debe resolverse en el arranque raíz

- Problema detectado:
  - El proyecto Expo ya tenía `PaperProvider` en el layout raíz, pero estaba fijado a `MD3LightTheme`.
  - Eso impedía que los componentes Paper reaccionaran correctamente al modo oscuro del sistema, aunque la app ya estuviera usando un provider global.

- Corrección aplicada:
  - `app/_layout.tsx` ahora resuelve el tema de Paper de forma dinámica con `useColorScheme()`.
  - Se alterna entre `MD3LightTheme` y `MD3DarkTheme` manteniendo los colores de marca (`primary` y `secondary`).
  - `IndexScreen` consume el tema actual con `useTheme()` para sincronizar:
    - `StatusBar`
    - `ActivityIndicator`
    - fondo del estado de carga

- Regla práctica importante:
  - Si React Native Paper ya está montado en el root, no conviene añadir un segundo `PaperProvider` dentro de una pantalla solo para “arreglar” dark mode.
  - El arreglo correcto es que el provider raíz use el esquema activo del sistema y que las pantallas consuman ese tema con `useTheme()`.

- Lección técnica:
  - Un `PaperProvider` global fijo en light mode produce fallos visuales sutiles en toda la app: superficies, textos, loaders y colores semánticos quedan desacoplados del modo real.
  - En este proyecto Expo, el punto de verdad del tema debe seguir siendo el arranque raíz en `app/_layout.tsx`, mientras `app/index.native.tsx` solo refleja ese estado para el shell principal.

---

Resumen técnico – AppHeader como estándar de navegación en pantallas Expo

- Criterio validado:
  - Las pantallas operativas de Expo deben usar `components/Header/AppHeader.jsx` como header base cuando no estén dentro del `MenuHeader` principal.
  - El botón de regreso no debe duplicarse manualmente en cada pantalla si el caso es el estándar de navegación.

- Mejora aplicada:
  - `AppHeader` ahora soporta navegación hacia atrás reutilizable mediante:
    - `showBackButton`
    - `backHref`
    - `onBack`
  - Si no se provee `left` y existe historial de navegación, `AppHeader` muestra automáticamente `Appbar.BackAction`.
  - Si no hay historial pero se define `backHref`, el header puede volver a una ruta segura con `router.replace(...)`.

- Pantallas alineadas en esta conversación:
  - `components/proxy/ProxyPackageCard.native.jsx`
  - `components/vpn/VPNPackageCard.native.jsx`
  - `components/proxy/ProxyPurchaseScreen.native.jsx`
  - `components/vpn/VPNPurchaseScreen.native.jsx`
  - `components/ventas/TableProxyVPNHistory.native.jsx`

- Regla práctica para próximos desarrolladores:
  - Si una pantalla Expo representa una superficie secundaria o de detalle, debe montar `AppHeader` arriba del contenido y declarar `showBackButton`.
  - Usar `backHref` cuando la pantalla pueda abrirse sin historial previo y aun así necesite una salida segura.
  - Solo conservar un `left` manual cuando la navegación tenga lógica especial distinta al patrón estándar.

---

Resumen técnico – MenuPrincipal Expo con foco en módulos reales ya migrados

- Ajuste aplicado en esta conversación:
  - `components/Main/MenuPrincipalScreen.jsx` dejó de mostrar bloques auxiliares temporales como stats, accesos rápidos, roadmap y resúmenes de migración.
  - La pantalla principal quedó reducida intencionalmente a tres superficies visibles:
    - card principal superior
    - `components/cubacel/Productos` con `isDegradado={false}`
    - `components/proxyVPN/ProxyVPNPackagesHorizontal`

- Criterio técnico validado:
  - Si Cubacel y Proxy/VPN ya están migrados y operativos, conviene mostrarlos directamente en la pantalla principal en vez de mantener cards narrativas o placeholders de estado.
  - El menú principal debe parecerse cada vez más a una superficie operativa del legacy y cada vez menos a una pantalla transitoria de migración.

- Lección práctica:
  - Cuando se limpie una pantalla principal después de migrar módulos reales, revisar imports y utilidades sobrantes para evitar que queden residuos del layout temporal anterior.

---

Resumen técnico – Remesas y carrito wizard restaurados en Expo con adaptación nativa

- Alcance aplicado:
  - `app/(normal)/remesas.tsx` dejó de usar fallback y ahora apunta a una pantalla real del módulo.
  - Se crearon implementaciones nativas funcionales para:
    - `components/remesas/RemesasScreen.native.jsx`
    - `components/remesas/FormularioRemesa.native.jsx`
    - `components/remesas/TableListRemesa.native.jsx`
    - `components/remesas/VentasStepper.native.jsx`
    - `components/carritoCompras/WizardConStepper.native.jsx`
    - `components/carritoCompras/ListaPedidosRemesa.native.jsx`
    - `components/carritoCompras/MapLocationPicker.native.jsx`

- Integración en header:
  - `components/Header/MenuHeader.jsx` volvió a montar el carrito junto al botón de mensajes, igual que en el legacy.
  - El componente responsable es `WizardConStepper.native.jsx`, que muestra badge reactivo leyendo `CarritoCollection`.

- Decisión técnica validada:
  - No conviene frenar la migración por ausencia de librerías legacy no instaladas en Expo, en este caso:
    - `react-native-progress-steps`
    - `react-native-maps`
  - En su lugar se implementó:
    - stepper visual propio dentro del wizard
    - selector de ubicación basado en `expo-location` con soporte manual por coordenadas
  - Para que el selector de ubicación tenga permisos correctos en builds Expo, se añadió también el plugin `expo-location` en `app.json` con textos de permiso orientados al flujo de entrega.

- Remesas:
  - `FormularioRemesa.native.jsx` mantiene el contrato funcional con backend usando `insertarCarrito`.
  - Se respetó la carga dinámica de properties para precios, monedas, método de pago en Cuba y descuentos por admin.
  - `VentasStepper.native.jsx` conserva el seguimiento de remesas, evidencia de pago y acciones de admin para marcar entregado/no entregado.

- Wizard de carrito:
  - El wizard nativo ya cubre el flujo principal:
    - resumen de ítems
    - método de pago
    - ubicación cuando hay items `COMERCIO`
    - aceptación de términos
    - generación/finalización de la orden
  - Se preservaron los métodos backend del legacy para cálculo y creación de órdenes:
    - `paypal.totalAPagar`
    - `mercadopago.totalAPagar`
    - `efectivo.totalAPagar`
    - `creandoOrden`
    - `mercadopago.createOrder`
    - `efectivo.createOrder`
    - `cancelarOrdenesPaypalIncompletas`

- Lista de carrito:
  - `ListaPedidosRemesa.native.jsx` ya renderiza cards resumidas para los tipos principales:
    - `REMESA`
    - `RECARGA`
    - `PROXY`
    - `VPN`
    - `COMERCIO`
  - En esta fase el objetivo fue restaurar primero el flujo operativo completo y dejar la paridad milimétrica de cada subtipo para una iteración de refinamiento visual.

- Lección práctica:
  - En módulos de checkout con Meteor + múltiples métodos de pago, primero conviene recuperar el circuito extremo a extremo y luego ajustar el detalle visual fino.
  - Cuando un archivo base `.jsx` sigue siendo placeholder en Expo, las integraciones nativas críticas deben apuntar explícitamente a `.native` para no caer en wrappers que devuelven `null`.

---

Resumen técnico – Carrito Expo ajustado para paridad visual real con legacy

- Hallazgo validado:
  - La primera migración funcional del carrito dejaba el flujo operativo listo, pero la desviación visual seguía siendo grande en dos puntos:
    - `components/carritoCompras/ListaPedidosRemesa.native.jsx`
    - `components/carritoCompras/WizardConStepper.native.jsx`
  - El problema no era solo de estilos sueltos; la estructura visual estaba demasiado simplificada frente al legacy.

- Corrección aplicada:
  - `ListaPedidosRemesa.native.jsx` se rehízo siguiendo la jerarquía del legacy:
    - cards especializadas por tipo (`RECARGA`, `REMESA`, `PROXY`, `VPN`, `COMERCIO`)
    - `Surface` con borde lateral por color
    - rows de detalle con iconografía y tipografía equivalente
    - chips de estado y chip ilimitado para Proxy/VPN
    - card colapsable para `COMERCIO` con resumen y detalles
  - `WizardConStepper.native.jsx` dejó de usar una composición demasiado minimalista y volvió a una estructura visual más cercana a legacy:
    - overlay completo dentro del `Modal`
    - cabecera superior con título `Carrito de compras:` y botón cerrar
    - stepper vertical propio con círculos, conectores y labels por paso
    - paso de método de pago con `Dropdown`
    - selector de país cuando aplica pago efectivo sin Proxy/VPN
    - bloque completo de términos con secciones visuales
    - card de total con pill morada y copy similar al legacy

- Criterio técnico importante:
  - En esta migración no basta con mantener el flujo funcional del wizard; para que el usuario perciba continuidad real con la app legacy, hay que respetar también:
    - la composición del modal
    - la segmentación por pasos
    - la semántica visual por tipo de item
    - la densidad de información en cada card

- Lección práctica:
  - Si un módulo transaccional se siente “distinto” aunque haga lo mismo, revisar primero si el problema está en la estructura visual completa y no solo en colores o paddings.
  - En checkout, la percepción de fidelidad depende mucho más de preservar la jerarquía visual del flujo que de copiar solo el contenido textual.

---

Resumen técnico – Error de bundling por corrupción de imports en WizardConStepper.native

- Problema detectado:
  - Expo dejó de bundlear iOS y Android por un `SyntaxError: Unexpected keyword 'import'` en `components/carritoCompras/WizardConStepper.native.jsx`.
  - La causa no era Metro ni Expo Router; el archivo tenía un bloque de imports pegado dentro de otro bloque de imports al inicio del archivo.

- Causa raíz validada:
  - Durante una edición previa quedó duplicada la cabecera del módulo, incluyendo líneas como `import MeteorBase...` dentro de un `import { ...` ya abierto.
  - Ese tipo de corrupción rompe el parseo de Babel antes de cualquier validación lógica del componente.

- Corrección aplicada:
  - Se reescribió la cabecera del archivo dejando una única sección válida de imports.
  - Se restauraron los imports correctos de:
    - `MeteorBase`
    - `React`
    - `Alert`, `Linking`, `ScrollView`, `StyleSheet`, `View`
    - componentes de `react-native-paper`
    - `Dropdown`
    - colecciones y componentes locales del carrito

- Lección práctica:
  - Cuando un error de bundling marca `Unexpected keyword 'import'` dentro de un archivo `.jsx`, revisar primero si hubo corrupción de cabecera o pegado accidental de imports duplicados.
  - Un archivo puede quedar visualmente “parecido” a uno válido, pero si un `import` aparece dentro de otro bloque, Babel falla antes de que ESLint o la app den contexto más útil.

---

Resumen técnico – Token inesperado por bloque residual al final de WizardConStepper.native

- Problema detectado:
  - Después de corregir la cabecera de imports, Expo siguió fallando con `Unexpected token` cerca del final de `components/carritoCompras/WizardConStepper.native.jsx`.
  - Babel apuntaba a una línea con `},` inmediatamente después de `export default WizardConStepper;`.

- Causa raíz validada:
  - Quedó un fragmento residual de estilos duplicados al final del archivo, por fuera de `StyleSheet.create(...)`.
  - Ese bloque incluía propiedades como `stepItem`, `stepLabel`, `stepperRow`, `termsPreview` y `totalText`, pero ya no pertenecía a ningún objeto válido.

- Corrección aplicada:
  - Se eliminó el bloque residual sobrante y se dejó un único cierre correcto de `StyleSheet.create(...)` seguido de `export default WizardConStepper;`.

- Lección práctica:
  - Si Babel marca un `Unexpected token` cerca del final de un archivo React Native, no asumir que el problema está en JSX complejo; revisar primero si quedó un resto de estilos u objeto parcialmente duplicado por un patch previo.

---

Resumen técnico – Wizard del carrito: salto sin comercio y aceptación implícita de términos

- Ajuste funcional aplicado en Expo:
  - Cuando el carrito no contiene items `COMERCIO`, el wizard no debe exigir interacción real con el paso de ubicación para continuar el flujo.
  - Desde `Método de Pago`, el avance correcto va directo a `Términos y Condiciones` si `tieneComercio === false`.
  - El retroceso desde `Términos y Condiciones` debe volver a `Método de Pago` cuando no hay comercio, y a `Ubicación` cuando sí lo hay.

- Regla UX importante:
  - El botón `Aceptar` dentro del paso de términos ya constituye la aceptación de los términos y condiciones.
  - No debe añadirse un checkbox, combobox u otro control extra para confirmar aceptación si el legacy no lo requiere.

- Criterio visual aplicado:
  - El stepper del wizard en Expo quedó en disposición horizontal por requerimiento del flujo actual, pero manteniendo la misma semántica de pasos y el mismo salto lógico entre pasos según el contenido del carrito.

---

Resumen técnico – EAS Workflows para distribución automática a Internal Testing

- Se configuró el proyecto Expo para que EAS Workflows pueda construir y distribuir automáticamente en ambos stores con el mismo criterio operativo del proyecto legacy:
  - Android -> Google Play Internal Testing
  - iOS -> TestFlight para testers internos

- Ajustes aplicados:
  - `app.json` ahora declara explícitamente `expo.ios.bundleIdentifier = "com.vidkar"`.
  - `eas.json` quedó con `submit.production` definido para ambas plataformas:
    - `android.track = "internal"`
    - `ios.ascAppId = "6751348594"`
  - `.eas/workflows/create-production-builds.yml` ahora encadena:
    - `build_android` -> `submit_android_internal`
    - `build_ios` -> `submit_ios_testflight`

- Decisión técnica importante:
  - Para Android no se usa un profile extra; se construye con `build.production` y la distribución al track interno se resuelve en `submit.production.android.track`.
  - Para iOS se usa el job `testflight` en lugar de `submit`, porque es el job específico de EAS Workflows para distribuir builds a grupos de TestFlight.

- Configuración de triggers validada:
  - El workflow corre automáticamente en pushes a `master` y `main`.
  - También queda disponible manualmente con `workflow_dispatch` para lanzarlo desde EAS CLI o dashboard sin necesidad de empujar commits.

- Hallazgo útil para futuras configuraciones:
  - Si el objetivo en iOS es que el build no solo se suba sino que además quede asignado automáticamente a testers internos concretos, hay que declarar `internal_groups` en el job `testflight`.
  - En este proyecto se reutilizó el grupo conocido del pipeline legacy: `carlitoPruebas`.

- Prerrequisitos operativos que deben existir fuera del YAML:
  - Credenciales de Google Play cargadas en EAS para submit Android.
  - App Store Connect API Key o credenciales de submit configuradas en EAS para iOS.
  - La app Android debe haber tenido al menos una primera subida manual en Google Play Console, por limitación de Google.
  - El grupo `carlitoPruebas` debe existir como grupo interno en App Store Connect; si cambia el nombre, también debe actualizarse el workflow.

- Regla práctica:
  - En EAS, `build` y `submit/testflight` deben tratarse como etapas separadas aunque se ejecuten dentro del mismo workflow. La política de distribución debe quedar en `eas.json` o en los params del job de distribución, no mezclada en el job de build.

---

Resumen técnico – `workflow_dispatch` en EAS Workflows no puede ser nulo

- Hallazgo puntual al ejecutar `npx eas-cli workflow:run create-production-builds.yml`:
  - Declarar `workflow_dispatch:` sin contenido hace que EAS lo interprete como `null` y rechace el workflow con:
    - `Invalid workflow definition. [on.workflow_dispatch]: Invalid input: expected object, received null.`

- Corrección válida mínima:
  - Usar `workflow_dispatch: {}` cuando no se necesitan inputs manuales.

- Regla práctica:
  - En EAS Workflows, los nodos opcionales de tipo objeto no deben dejarse “vacíos” en YAML si el parser los convierte a `null`.
  - Si no hay inputs para ejecución manual, preferir objeto vacío explícito antes que la clave desnuda.

---

Resumen técnico – Icono de app Expo alineado con el asset real del legacy

- Problema detectado:
  - El proyecto Expo seguía usando los assets por defecto del starter (`icon.png`, `android-icon-*`, `favicon.png`), por lo que iOS y Android no reflejaban la identidad real de VIDKAR.

- Asset fuente de verdad validado:
  - El icono maestro reutilizado desde el proyecto legacy fue:
    - `android-VIDKAR/ios/Vidkar/Images.xcassets/AppIcon.appiconset/1024.png`

- Ajustes aplicados:
  - Se copiaron assets derivados al proyecto Expo:
    - `assets/images/icon.png`
    - `assets/images/adaptive-icon.png`
    - `assets/images/favicon.png`
  - `app.json` quedó configurado para usar:
    - `expo.icon = ./assets/images/icon.png`
    - `expo.android.adaptiveIcon.foregroundImage = ./assets/images/adaptive-icon.png`
    - `expo.android.adaptiveIcon.backgroundColor = #ffffff`

- Decisión técnica importante:
  - Se eliminó la composición adaptive anterior basada en `android-icon-background.png`, `android-icon-foreground.png` y `android-icon-monochrome.png` porque seguía mezclando el branding azul del template con la identidad real de la app.
  - Para esta migración era preferible un adaptive icon simple y consistente antes que mantener capas visuales incorrectas.

- Regla práctica:
  - Cuando el proyecto legacy ya tiene un `1024.png` maestro en el AppIcon set de iOS, ese archivo suele ser la mejor fuente para alimentar Expo `icon` y una primera versión estable del adaptive icon.
  - Antes de diseñar un icono nuevo en Expo, contrastar siempre contra el asset maestro real del proyecto legacy para no degradar la identidad visual del cliente.

---

Resumen técnico – Pantalla previa a JS en iOS era de Expo Go, no del splash real de la app

- Hallazgo validado:
  - Cuando el proyecto se abre con Expo Go, iOS puede mostrar una pantalla previa con icono y nombre de la app antes de cargar el bundle JavaScript.

---

Resumen técnico - Proyección mínima de suscripciones Meteor fuera del menú principal

- Alcance aplicado:
  - Se extendió la estrategia de `fields` mínimos más allá del flujo del menú principal y se recortaron suscripciones en módulos administrativos, mensajería, comercio/cadete, empresa, remesas, recargas, evidencias y historiales Proxy/VPN.
  - La intención no fue “minificar por minificar”, sino reducir payload sin romper documentos anidados usados por UI, acciones y métodos Meteor posteriores.

- Hallazgo crítico de backend validado antes de recortar:
  - En `react-download/server/publicaciones.js`, las publicaciones relevantes aceptan `selector` y `option` y pasan `option` a `find(...)`.
  - Eso confirma que `fields` sí reduce datos entregados por servidor y no es solo un filtro local de Minimongo.
  - Antes de recortar flujos sensibles se contrastaron también métodos backend que consumen esos documentos, especialmente en:
    - remesas
    - recargas DTShop
    - checkout/carrito
    - comisiones de comercio

- Patrón aplicado por módulo:
  - Definir constantes `*_FIELDS` cerca del `Meteor.useTracker(...)` para documentar explícitamente qué shape necesita la pantalla.
  - Reutilizar esas mismas constantes tanto en:
    - `Meteor.subscribe(..., { fields })`
    - `Collection.find/findOne(..., { fields })`
  - Esto evita que la query local vuelva a leer más campos de los necesarios cuando Minimongo tiene un subset proyectado.

- Áreas optimizadas en esta conversación:
  - Config/admin:
    - `components/property/PropertyTable.native.js`
    - `components/servers/ServerList.native.jsx`
    - `components/dashboard/RechargeProfitCard.native.jsx`
  - Auth/config:
    - `components/loguin/Loguin.native.js`
  - Users:
    - `components/users/UserDetails.native.js`
    - `components/users/componentsUserDetails/OptionsCardAdmin.js`
  - Mensajes:
    - `components/mensajes/MensajesHome.native.js`
  - Comercio / catálogo / empresa:
    - `components/productos/ProductosScreen.native.jsx`
    - `components/empresa/screens/ProductoFormScreen.native.jsx`
    - `components/empresa/screens/TiendaDetailScreen.native.jsx`
    - `components/empresa/screens/MisTiendasScreen.native.jsx`
    - `components/empresa/screens/PedidosPreparacionScreen.native.jsx`
  - Cadete / pedidos comercio:
    - `components/comercio/pedidos/HomePedidosComercio.native.jsx`
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx`
    - `components/comercio/pedidos/components/PedidoCard.native.jsx`
    - `components/comercio/pedidos/PedidosComerciosList.native.jsx`
    - `components/comercio/maps/MapaPedidoConCadete.native.jsx`
  - Remesas / recargas / evidencias / historiales:
    - `components/remesas/VentasStepper.native.jsx`
    - `components/remesas/TableListRemesa.native.jsx`
    - `components/cubacel/TableRecargas.native.jsx`
    - `components/archivos/SubidaArchivos.native.jsx`
    - `components/archivos/AprobacionEvidenciasVenta.native.jsx`
    - `components/archivos/ListaArchivos.native.jsx`
    - `components/ventas/TableProxyVPNHistory.native.jsx`

- Regla crítica para `ventasRecharge`:
  - No conviene recortar esa colección mirando solo los textos visibles de una pantalla.
  - Hay que revisar siempre si la pantalla o sus hijos usan campos anidados de:
    - `producto.carritos.*`
    - `producto.comisiones`
    - estados de pago/cobro/cancelación
    - ids de carrito reutilizados por evidencias o transacciones
  - En historiales y pantallas de aprobación se validó especialmente que siguieran presentes campos como:
    - `_id`
    - `createdAt`
    - `metodoPago`
    - `cobrado`
    - `isCobrado`
    - `isCancelada`
    - `comentario`
    - `monedaCobrado`
    - `precioOficial`
    - nested `producto.carritos.*` según cada flujo

- Regla crítica para `evidenciasVentasEfectivoRecharge`:
  - Las pantallas de evidencia no usan un shape limpio único; hacen fallback entre varios nombres legacy del documento.
  - Por eso la proyección segura debe conservar variantes como:
    - `base64`, `dataBase64`, `data`, `dataB64`
    - `createdAt`, `fecha`, `fechaSubida`
    - `descripcion`, `detalles`
    - `size`, `tamano`
    - flags `aprobado`, `rechazado`, `denegado`, `cancelado`, `cancelada`, `isCancelada`, `estado`
  - Si se quita alguna de esas alternativas sin revisar `mapEvidenciaDoc(...)`, la UI puede parecer “vacía” aunque la evidencia exista.

- Regla crítica para `transacciones` de recargas:
  - En `TableRecargas.native.jsx` no hace falta traer todo el documento de transacción.
  - Pero sí conviene conservar al menos:
    - `_id`
    - `externalId`
    - `status`
  - La pantalla deriva el estado visual desde `status`, así que recortar solo ids rompe el resumen del pago.

- Regla práctica con `user` / `userID`:
  - Si una pantalla solo necesita nombre o username, no suscribir el documento completo del usuario.
  - En esta conversación se confirmó que `user` y `userID` también aceptan `fields`, así que el patrón correcto es proyectar explícitamente `username`, `profile.name`, `_id` u otros campos mínimos según el caso.

- Validación realizada:
  - Tras los cambios se ejecutó verificación de errores sobre todos los archivos tocados y el resultado quedó limpio.
  - Esto es importante porque al introducir constantes de proyección es fácil romper firmas de `Meteor.subscribe`, dependencias de hooks o contextos de `find/findOne`.

- Lección práctica:
  - En este proyecto, optimizar `fields` solo es seguro cuando se valida a la vez:
    1. la publicación Meteor
    2. el shape realmente usado por la pantalla
    3. los métodos backend o diálogos hijos que reutilizan el mismo documento
  - Si un módulo usa documentos nested complejos, es mejor una proyección conservadora pero explícita que una minimización agresiva que rompa silenciosamente acciones o detalles.
  - Esa pantalla no corresponde al splash nativo final configurable de la app y no conviene intentar corregirla desde componentes React.

- Solución aplicada:
  - Se instaló `expo-dev-client` para sacar el proyecto del flujo de Expo Go cuando se necesite validar arranque nativo real.
  - `eas.json` quedó con un perfil `development` activo usando `developmentClient: true` y `distribution: internal`.
  - `app.json` se configuró con splash nativo limpio usando un asset transparente mínimo y fondo oscuro de marca para que el launch screen del build propio no muestre iconografía extraña antes de React Native.

- Regla práctica:
  - Si el problema ocurre “antes de que cargue el código JavaScript”, primero confirmar si la app se está ejecutando en Expo Go.
  - Para validar splash, permisos nativos, notificaciones, launch screen o comportamiento de arranque real, usar dev build o build EAS, no Expo Go.

---

Resumen técnico – EAS bloquea builds si `extra.eas.projectId` y `slug` no coinciden exactamente

- Problema detectado:
  - `npx eas build --platform ios --profile development` falló con:
    - `Project config: Slug for project identified by "extra.eas.projectId" (vidkar) does not match the "slug" field (Vidkar)`

- Causa raíz validada:
  - El proyecto EAS ya estaba enlazado al slug `vidkar` en minúsculas.
  - En `app.json`, el campo `expo.slug` seguía como `Vidkar`, lo que rompe la validación estricta de EAS.
  - Además, `scheme` también estaba con mayúscula inicial, lo que ya venía siendo incompatible con el patrón esperado del schema de Expo.

- Solución aplicada:
  - `expo.slug` se normalizó a `vidkar`.
  - `expo.scheme` se normalizó a `vidkar`.
  - El nombre visible de la app se mantuvo como `Vidkar` en `expo.name`, así que no se pierde branding en UI.

- Regla práctica:
  - En Expo/EAS, `name` es display name, pero `slug` es identidad técnica del proyecto enlazado y debe coincidir exactamente, incluyendo mayúsculas/minúsculas, con el proyecto registrado en EAS.
  - Si el build falla por `projectId`/`slug`, corregir `app.json`; no tocar archivos generados dentro de `dist/`.

---

Resumen técnico – `name` visible puede ser `Vidkar` aunque `slug` siga en minúsculas

- Criterio validado:
  - No hay que elegir entre branding visible y compatibilidad con EAS.
  - El nombre mostrado al usuario puede mantenerse como `Vidkar` mientras `slug` y `scheme` permanecen en minúsculas para cumplir el contrato técnico del proyecto enlazado.

- Ajuste aplicado:
  - `expo.name` se mantiene como `Vidkar`.
  - En iOS se forzó además `CFBundleDisplayName` y `CFBundleName` a `Vidkar` dentro de `ios.infoPlist`.
  - En web se añadieron `web.name` y `web.shortName` con valor `Vidkar`.

- Regla práctica:
  - Si el usuario pide cambiar el nombre visible de la app, revisar primero `name`, `ios.infoPlist` y `web.name`.
  - Si el problema es de builds EAS o project linking, revisar `slug` y `scheme`, no el nombre visible.

---

Resumen técnico – Google Login de Expo volvió a proveedor nativo por bloqueo OAuth 2.0 de Google

- Problema detectado:
  - El login con Google en Expo usando `expo-auth-session` abría `accounts.google.com`, pero Google devolvía:
    - `Acceso bloqueado: Error de autorización`
    - `Error 400: solicitud no válida`
    - mensaje de incumplimiento de política OAuth 2.0.

- Causa raíz validada:
  - El legacy funciona con `@react-native-google-signin/google-signin`, es decir, con el SDK nativo de Google Sign-In.
  - La migración Expo había cambiado ese flujo por OAuth web con `expo-auth-session`, lo que introdujo una superficie distinta de redirect/validación y terminó siendo rechazada por Google en Android.
  - En este caso, el problema no estaba en Meteor ni en el método backend `login`, sino antes: en el proveedor de autenticación del cliente.

- Solución aplicada:
  - Se instaló `@react-native-google-signin/google-signin` en el proyecto Expo.
  - `components/loguin/Loguin.native.js` dejó de usar `expo-auth-session/providers/google` y `expo-web-browser`.
  - El login de Google en Expo ahora replica el patrón funcional del legacy:
    - `GoogleSignin.configure(...)`
    - `GoogleSignin.hasPlayServices(...)`
    - `GoogleSignin.signIn()` o `signInSilently()` si ya existe sesión previa
    - `GoogleSignin.getTokens()`
    - `Meteor.call('login', { googleSignIn: true, ... })`
    - `Meteor._handleLoginCallback(...)`
  - Se añadió también el plugin Expo del paquete:
    - `./node_modules/@react-native-google-signin/google-signin/app.plugin.js`

- Configuración importante validada:
  - Con la versión actual del paquete, el parámetro clave ya no es `androidClientId`; debe usarse `webClientId` para obtener correctamente `idToken` y mantener compatibilidad con el flujo nativo moderno del paquete.
  - En este proyecto se reutilizó el Web Client ID existente en la configuración Firebase/Google:
    - `1043110071233-5mf355rcrf02hq4ja99uaq9kspokur1t.apps.googleusercontent.com`

- Regla práctica para próximos desarrolladores:
  - Si el login social ya funciona en el legacy con proveedor nativo, no conviene sustituirlo por OAuth web en Expo sin una razón fuerte y sin revalidar toda la configuración Google Cloud.
  - Si Google muestra un bloqueo por política OAuth 2.0 en una app nativa Expo, revisar primero si se cambió indebidamente de SDK nativo a flujo web.
  - Tras agregar o cambiar este paquete, recompilar el binario nativo. Reiniciar solo Metro no inyecta el módulo en una app ya compilada.

Notas adicionales – El catch de Google Login no debe asumir `statusCodes` siempre disponible

- Hallazgo puntual:
  - Al hacer carga dinámica de `@react-native-google-signin/google-signin`, puede ocurrir que el módulo no exista en el runtime activo o falle antes de exponer `statusCodes`.
  - Si el `catch` intenta leer `googleStatusCodes.SIGN_IN_CANCELLED` sin validar primero, se genera un error secundario y se oculta el error real.

- Regla práctica:
  - En flujos con import dinámico de módulos nativos, el `catch` debe tratar los códigos de error como opcionales:
    - `googleStatusCodes?.SIGN_IN_CANCELLED`
    - `googleStatusCodes?.IN_PROGRESS`
  - El objetivo es que, si el módulo no está presente, la app muestre el mensaje útil del runtime/binario en lugar de crashear por una lectura de propiedad sobre `undefined`.

---

Resumen técnico – `Modal` de React Native Paper no ocupa fullscreen real si no se anula su wrapper

- Problema detectado en `components/carritoCompras/WizardConStepper.native.jsx`:
  - El `Portal` parecía no llenar el 100% de la pantalla y quedaban huecos arriba y abajo.
  - La causa no era el `Portal`, sino el `Modal` de React Native Paper.

- Causa raíz validada:
  - `react-native-paper/src/components/Modal.tsx` aplica por defecto en el wrapper:
    - `marginTop: top`
    - `marginBottom: bottom`
    - `justifyContent: 'center'`
  - Además, el wizard tenía padding extra propio:
    - `containerStyle.paddingBottom = 30`
    - `modalRoot.paddingTop = 30`

- Solución aplicada:
  - Pasar `style={styles.modalWrapper}` al `Modal`.
  - En ese wrapper forzar:
    - `marginTop: 0`
    - `marginBottom: 0`
    - `justifyContent: 'flex-start'`
  - En el contenido usar `containerStyle.flex = 1` y eliminar los paddings verticales que recortaban el fullscreen perceptible.

- Superficies donde quedó validado:
  - `components/carritoCompras/WizardConStepper.native.jsx`
  - `components/cubacel/TableRecargas.native.jsx`
  - `components/ventas/TableProxyVPNHistory.native.jsx`

- Regla práctica:
  - En React Native Paper, `contentContainerStyle` no controla el wrapper externo del modal.
  - Si un modal debe cubrir pantalla completa real, revisar siempre la prop `style` del `Modal`, no solo `contentContainerStyle`.

Notas adicionales – Safe area superior dentro de modales fullscreen

- Una vez anulado el `marginTop`/`marginBottom` del wrapper del `Modal`, el contenido puede quedar demasiado arriba en dispositivos con notch o status bar alta.
- La solución correcta no es volver a poner un `marginTop` fijo en el wrapper, sino aplicar `paddingTop` dinámico dentro del `contentContainerStyle` usando `useSafeAreaInsets()`.
- Patrón recomendado:
  - wrapper del `Modal` sin márgenes automáticos
  - contenedor fullscreen con `flex: 1`
  - `paddingTop: Math.max(topInset, 16)` para que el primer elemento no quede debajo de la barra de notificaciones

---

Resumen técnico – El menú de mensajes del header no debe posicionarse manualmente

- Problema detectado:
  - El popup de mensajes del header podía dejar de abrir perceptiblemente aunque el estado `menuVisible` cambiara.
  - La causa probable no estaba en la navegación, sino en el anclaje/posicionamiento del `Menu` de React Native Paper dentro del header.

- Causa raíz validada:
  - El componente usaba `style` en `Menu` con offsets manuales (`top`, `width`, `height`, `paddingRight`), interfiriendo con el posicionamiento natural que Paper calcula desde el anchor.
  - Además, el anchor estaba montado dentro de un `View` sin layout explícito, lo que puede volver inestable la medición del nodo ancla en algunos headers.

- Solución aplicada:
  - Se eliminó el posicionamiento manual del `Menu`.
  - Se usó `anchorPosition="bottom"` para dejar que Paper abra el popup debajo del icono.
  - Se añadió un `anchorContainer` con tamaño mínimo y `collapsable={false}` para que el ancla sea medible de forma consistente.
  - El tamaño del menú pasó a `contentStyle` y el scroll interno a `menuScroll`, evitando alterar la geometría del wrapper del popup.

- Regla práctica:
  - En headers, no usar offsets manuales en `Menu.style` salvo que estén totalmente justificados.
  - Preferir `anchorPosition`, un anchor con tamaño explícito y `contentStyle` para el tamaño visual del popup.

---

Resumen técnico – Crash Android al abrir chat por `outlineStyle` en React Native Paper TextInput

- Problema detectado:
  - En Android, al abrir una conversación desde `MenuIconMensajes`, la app crasheaba con:
    - `Error while updating property 'outlineStyle' of a view managed by: AndroidTextInput`
    - `ReadableNativeMap cannot be cast to java.lang.String`

- Causa raíz validada:
  - El fallo no estaba en el menú del header, sino en el render de `components/mensajes/MensajesHome.native.js`.
  - El `TextInput` del composer usaba `mode="flat"` y además pasaba `outlineStyle={styles.composerOutline}`.
  - En Android esa prop terminó llegando al `AndroidTextInput` como un objeto nativo (`ReadableNativeMap`) donde el host esperaba otro tipo, produciendo el crash.

- Solución aplicada:
  - Se eliminó `outlineStyle` del `TextInput`.
  - Se mantuvo el aspecto del composer mediante `style={styles.composerInput}` y colores del `theme`, sin depender de la prop conflictiva.

- Regla práctica:
  - En este proyecto, si un `TextInput` de React Native Paper usa `mode="flat"`, evitar pasar `outlineStyle` salvo que esté totalmente validado en ambas plataformas.
  - Si Android muestra un error de `ReadableNativeMap cannot be cast ...` al montar inputs, revisar primero props visuales avanzadas (`outlineStyle`, `underlineStyle`, `contentStyle`) antes de culpar a navegación o datos.

---

Resumen técnico – Paridad funcional del carrito Expo con WizardConStepper legacy

- Problema detectado:
  - `components/carritoCompras/WizardConStepper.native.jsx` ya tenía paridad visual con el legacy, pero no estaba replicando el contrato funcional del checkout.
  - La desviación principal estaba en efectivo: el botón final estaba llamando `efectivo.createOrder` otra vez, cuando en el legacy ese método se ejecuta al entrar al paso de pago y el botón final llama `generarVentaEfectivo` después de convertir el total a USD.

- Diferencias funcionales corregidas:
  - Se restauró la secuencia del legacy al entrar al paso `Pago`:
    - `cancelarOrdenesPaypalIncompletas`
    - `creandoOrden` para PayPal
    - `mercadopago.createOrder` para MercadoPago
    - `efectivo.createOrder` para Efectivo
  - Se corrigió `handleGenerarVenta` para que haga exactamente la cadena del legacy:
    - `moneda.convertir(Number(totalAPagar), monedaFinalUI, 'USD', null, ...)`
    - construir `ventaData = { producto: compra, precioOficial, comisionesComercio }`
    - `generarVentaEfectivo(ventaData, monedaFinalUI || 'CUP', ...)`

- Hallazgo técnico importante:
  - En la versión Expo se estaban enviando `null` donde el legacy envía `comisionesComercio`.
  - Eso alteraba el cálculo real del checkout en estos métodos:
    - `paypal.totalAPagar`
    - `mercadopago.totalAPagar`
    - `efectivo.totalAPagar`
    - `creandoOrden`
    - `mercadopago.createOrder`
    - `efectivo.createOrder`
  - Si el carrito tiene items `COMERCIO`, esas comisiones son parte del contrato funcional, no un dato decorativo del UI.

- Cálculo de comisiones restaurado en Expo:
  - Se volvió a calcular `comisionesComercio` llamando `comercio.calcularCostosEntrega(pedidosRemesa, monedaFinalUI, ...)` cuando los items `COMERCIO` ya tienen coordenadas.
  - Se mantuvo la actualización de ubicación vía `carrito.actualizarUbicacion`, pero ahora el wizard ya no queda “ciego” a ese cambio: el cálculo de comisiones se recalcula con la estructura del carrito suscrita desde Meteor, como en el legacy.

- Gates funcionales alineados:
  - Se restauró `cargadoPago` para no permitir avanzar al submit final si el total aún no fue calculado.
  - Se añadió bloqueo por comisiones para carritos con `COMERCIO` si:
    - faltan comisiones
    - el cálculo sigue cargando
    - el cálculo devolvió error
  - Se mantuvo prevención de doble ejecución con flags de procesamiento para evitar ventas u órdenes duplicadas.

- Lección práctica:
  - En esta migración, si un flujo transaccional parece correcto visualmente pero usa el método Meteor equivocado en el último paso, el problema no es de UI sino de secuencia de negocio.
  - Para checkout legacy, no basta con copiar nombres de métodos: hay que respetar exactamente en qué paso se invoca cada uno y con qué argumentos, especialmente cuando existe `comisionesComercio` y una orden base previa (`compra`).

---

Resumen técnico – GestureHandlerRootView obligatorio para módulos con zoom/pan en Expo

- Problema detectado:
  - `components/archivos/AprobacionEvidenciasVenta.native.jsx` usa `PanGestureHandler` y `PinchGestureHandler` para `ZoomableImage`.
  - La app Expo estaba renderizando Expo Router, Paper y Safe Area en el root, pero no tenía `GestureHandlerRootView` envolviendo el árbol completo.
  - Eso provoca el error runtime: `PanGestureHandler must be used as a descendant of GestureHandlerRootView`.

- Solución aplicada:
  - Se envolvió `app/_layout.tsx` completo con `GestureHandlerRootView` usando `style={{ flex: 1 }}`.
  - La corrección se hizo en la raíz y no dentro del componente de evidencias, porque el requisito de `react-native-gesture-handler` es estructural y debe cubrir todo el subárbol de navegación.

- Regla práctica:
  - Si cualquier pantalla o componente migrado usa `PanGestureHandler`, `PinchGestureHandler`, `Swipeable`, `BottomSheet` u otro handler de `react-native-gesture-handler`, el root nativo de Expo debe estar envuelto por `GestureHandlerRootView`.
  - No conviene “parchar” cada pantalla con wrappers locales si el problema real es que el árbol global de Expo Router no está bajo ese root view.

---

Resumen técnico – Crash al mover evidencia con zoom en Expo/Fabric

- Problema detectado:
  - En `components/archivos/AprobacionEvidenciasVenta.native.jsx`, la imagen de evidencia se cerraba o tumbaba la app al hacer pinch y luego arrastrar.
  - El componente `ZoomableImage` mezclaba `Animated.diffClamp`, `setOffset`, `flattenOffset` y `Animated.event` sobre los mismos valores durante pan y pinch.

- Causa raíz probable:
  - Ese patrón puede tolerarse en algunos runtimes legacy, pero en Expo con Fabric resulta más frágil porque combina valores derivados (`diffClamp`) con updates gestuales directos y offsets mutables en el mismo ciclo de interacción.
  - El punto más sensible era usar `Animated.diffClamp(translateX/translateY)` como destino de `translationX/translationY` dentro de `Animated.event`, y luego además reescribir offsets manualmente al terminar el gesto.

- Solución aplicada:
  - Se reescribió `ZoomableImage` con un patrón más estable:
    - `baseScale` + `pinchScale`
    - `offsetX/offsetY` + `panX/panY`
    - `Animated.multiply` para escala final
    - `Animated.add` para traslación final
  - El clamp ya no ocurre durante el evento de pan, sino al cerrar el gesto (`onHandlerStateChange`), donde se consolidan offsets y se limita el desplazamiento permitido según el zoom actual.
  - Se agregó `resetTransform()` para volver de forma consistente a escala 1 y offsets 0 cuando corresponde.

- Regla práctica:
  - En Expo/Fabric, evitar usar `Animated.diffClamp` como sink directo de `Animated.event` para gestos complejos si luego también se manipulan offsets manuales.
  - Para zoom/pan robusto, preferir separar:
    - valores base persistentes
    - valores temporales del gesto actual
    - consolidación y clamp al terminar el gesto

---

Resumen técnico – Reactividad real en aprobaciones de evidencias y ventas

- Problema detectado en Expo:
  - `components/archivos/AprobacionEvidenciasVenta.native.jsx` sí estaba suscrito reactivamente a evidencias, pero la UI seguía usando snapshots locales en dos puntos críticos:
    - la venta venía solo por prop desde la lista padre
    - el preview guardaba el documento completo seleccionado en estado local (`preview`), no solo su id
  - Resultado:
    - al aprobar/rechazar una evidencia, el drawer podía seguir mostrando el estado anterior hasta cerrar y abrir otra vez
    - al rechazar una venta, la card podía quedarse visible o con flags viejos aunque Minimongo ya hubiera cambiado

- Corrección aplicada:
  - Se añadió lectura reactiva de la venta actual por `_id` dentro del propio componente:
    - `Meteor.subscribe('ventasRecharge', { _id: ventaId })`
    - `VentasRechargeCollection.findOne({ _id: ventaId })`
  - Se unificó el render para depender de `ventaActual` (documento reactivo) en vez de seguir usando la prop inicial `venta`.
  - El preview dejó de almacenar el documento entero y pasó a almacenar `previewId`.
  - El documento mostrado en el drawer ahora se deriva en cada render desde `evidencias.find(ev => ev._id === previewId)`.
  - Si la evidencia deja de existir en la colección reactiva, el preview se cierra automáticamente.
  - Cuando la venta reactiva ya aparece cancelada (`isCancelada === true`), el componente devuelve `null` para no seguir renderizando una card obsoleta mientras la lista padre se resincroniza.

- Lección técnica:
  - En MeteorRN no alcanza con que exista `Meteor.useTracker(...)` en algún nivel del árbol; si el componente guarda snapshots completos de documentos en `useState`, esa rama deja de ser realmente reactiva.
  - Para drawers, modales, previews y dialogs que muestran documentos de Minimongo:
    - guardar ids en estado local
    - resolver el documento actual desde la colección reactiva en cada render

---

Resumen técnico – Registro dual de tokens push en Expo y proveedor explícito por token

- Problema detectado:
  - El cliente Expo podía terminar registrando un único token por sesión y dejar que el backend adivinara el proveedor.
  - En iOS eso llevaba a confundir token nativo APNs con `fcm`, porque `getDevicePushTokenAsync()` no devuelve Expo Push Token ni necesariamente FCM.

- Corrección aplicada:
  - `services/notifications/PushMessaging.native.ts` ahora registra todos los tokens válidos disponibles del runtime en vez de uno solo:
    - token nativo del dispositivo
    - token Expo Push
  - Cada registro se envía con `provider` explícito al método Meteor `push.registerToken`.
  - El `platform` ya no se arma con un proveedor fijo por OS; ahora se genera por token real, por ejemplo:
    - `android_fcm_...`
    - `android_expo_...`
    - `ios_apns_...`
    - `ios_expo_...`

- Criterio técnico validado:
  - En Expo, el OS no basta para inferir el transport push.
  - Un mismo dispositivo puede exponer más de un token útil para entrega y cada uno debe persistirse de forma independiente.
  - La fuente de verdad para envío ya no debe ser “plataforma iOS/Android”, sino la pareja `token + provider`.

- Regla práctica:
  - Si se reintenta el registro tras login, refresh de token o arranque, volver a registrar todos los tokens disponibles y dejar que el backend haga `upsert` por `token`.
  - No reutilizar un `buildPlatformString()` fijo por plataforma cuando el runtime puede producir tokens de proveedores distintos.

---

Resumen técnico – Migración completa de la pantalla `Ventas` a Expo con lógica legacy intacta

- Alcance aplicado:
  - Se migró la pantalla administrativa de ventas del legacy a Expo en variante nativa real:
    - `components/ventas/VentasList.native.jsx`
    - `components/ventas/DialogVenta.native.jsx`
  - `components/ventas/VentasList.js` dejó de ser `null` y ahora usa `ScreenFallback` para web/previews, manteniendo el patrón profesional del proyecto.

- Contrato funcional preservado del legacy:
  - Suscripción reactiva a `ventas` con `limit: 200` y orden `createdAt desc`.
  - Suscripción a `user` para resolver `username` de `adminId` y `userId` igual que en el código legacy.
  - Mapeo de `VentasCollection` a un array enriquecido con:
    - `type`
    - `adminusername`
    - `userusername`
    - `comentario`
    - `precio`
    - `gananciasAdmin`
    - `createdAt`
    - `cobrado`
  - Filtros equivalentes por:
    - búsqueda libre (`comentario`, `type`, `adminusername`, `userusername`, `precio`)
    - `type`
    - admin
    - usuario
    - estado de pago (`TODOS`, `PAGADO`, `PENDIENTE`)
  - Paginación mantenida con opciones `50 / 75 / 100`.
  - Cambio de estado de pago preservado mediante `Meteor.call('changeStatusVenta', ventaId)`.
  - Edición preservada en diálogo vía `VentasCollection.update(data._id, { $set: ... })`.
  - Eliminación preservada mediante `Meteor.call('eliminarVenta', data._id)`.

- Mejoras de diseño aplicadas sin recortar funcionalidad:
  - La pantalla usa `AppHeader` porque el stack normal de Expo corre con `headerShown: false`.
  - El listado dejó de ser una tabla plana y pasó a tarjetas presionables con mejor jerarquía visual, manteniendo toda la información operativa del legacy y agregando contexto útil como precio, ganancias y preview de comentario.
  - El diálogo pasó de un `Dialog` básico a un `Portal + Modal` más robusto con:
    - backdrop con `BlurView`
    - tarjeta principal de contexto de la venta
    - secciones separadas para datos originales y campos editables
    - acciones inferiores claras para guardar o eliminar
  - Se mantuvo visible toda la información que ya mostraba el legacy (admin, usuario, fecha, precio, ganancias, comentario) y se añadió contexto extra (`_id`, estado de pago, IDs reales) sin quitar nada.

- Regla práctica:
  - En pantallas legacy administrativas con lógica de negocio pequeña pero crítica, no conviene migrar solo el layout; también hay que portar sus métodos Meteor, filtros, paginación y la forma exacta en que enriquecen documentos con datos de `Meteor.users`.
  - Si una pantalla Expo del grupo normal depende de cabecera propia, usar `AppHeader` en la superficie nativa en lugar de intentar reactivar el header del stack global.
  - Cuando se mejore visualmente un diálogo legacy, la mejora correcta es reorganizar jerarquía y presentación sin tocar el contrato de guardado/eliminación que ya usa la colección o los métodos Meteor existentes.

---

Resumen técnico – Datos de venta reactivos en `DialogVenta` con `Meteor.useTracker`

- Problema detectado:
  - La pantalla de `Ventas` ya era reactiva a nivel listado, pero el diálogo seguía abriéndose con un snapshot completo de la venta guardado en estado local.
  - Si la venta cambiaba en Minimongo después de abrir el modal, el diálogo podía seguir mostrando datos desactualizados hasta cerrarse y abrirse otra vez.

- Solución aplicada:
  - `components/ventas/VentasList.native.jsx` dejó de guardar el objeto completo seleccionado y ahora conserva solo `selectedVentaId`.
  - `components/ventas/DialogVenta.native.jsx` ahora resuelve la venta con `Meteor.useTracker(...)` usando ese `_id` directamente desde `VentasCollection.findOne(ventaId)`.
  - El view model del diálogo se reconstruye de forma reactiva, incluyendo usernames desde `Meteor.users` cuando ya están disponibles en el cliente.

- Resultado funcional:
  - Si cambia `precio`, `comentario`, `gananciasAdmin`, `cobrado` u otros campos de la venta mientras el diálogo está abierto, la UI del modal se resincroniza rápidamente con Minimongo.
  - La pantalla ya no depende de snapshots para el detalle de una venta seleccionada.

- Regla práctica:
  - En Expo + MeteorRN, cuando un modal o drawer edita un documento, guardar solo el `id` seleccionado y resolver el documento actual dentro del componente con `Meteor.useTracker(...)`.
  - No pasar objetos completos persistidos en `useState` si se espera que los cambios del servidor o de otros flujos se reflejen en caliente dentro del detalle abierto.

Notas adicionales – El modal no debe desaparecer mientras espera el documento reactivo

---

Resumen técnico – Rediseño minimalista del listado de usuarios y su acordeón en Expo

- Problema detectado:
  - `components/users/UsersHome.native.js` usaba `List.Accordion` casi sin personalización visual, lo que dejaba una cabecera demasiado cuadrada y genérica frente al resto del lenguaje visual del proyecto.
  - La funcionalidad del listado estaba bien, pero la jerarquía visual del bloque de secciones (`Administradores`, `Usuarios`) no acompañaba el nivel del resto de pantallas migradas.

- Solución aplicada:
  - Se sustituyó la superficie visual del acordeón por una cabecera propia construida con:
    - `Surface`
    - `Pressable`
    - contador en chip
    - subtítulo con cantidad visible
    - control explícito de expand/collapse
  - Se mantuvo intacta la funcionalidad actual:
    - filtros superiores
    - navegación al detalle de usuario
    - cards internas con consumo VPN/Proxy
    - separación entre administradores y usuarios normales

- Criterio de diseño validado:
  - El resultado debía sentirse:
    - minimalista
    - más limpio
    - más profesional
    - sin perder la utilidad operativa del layout existente
  - Para eso se evitó añadir elementos decorativos innecesarios y se trabajó sobre:
    - espaciado
    - mejor jerarquía tipográfica
    - una cabecera de sección más sobria
    - cards internas con respiración y alineación mejoradas

- Detalles visuales importantes:
  - Cada sección ahora tiene:
    - punto/acento cromático
    - título
    - subtítulo con cantidad de usuarios visibles
    - chip de conteo
    - chevron de expansión claro
  - Los items de usuario ya no dependen de `List.Item`; ahora usan una composición más controlada para evitar sensación de bloque rígido.
  - Se preservaron los colores ya existentes de los pills VPN/PROXY para no romper la semántica visual de consumo.

- Regla práctica:
  - Si una pantalla administrativa en Expo se siente “correcta pero cuadrada”, antes de rehacer toda la lógica conviene reemplazar primero los shells por superficies propias (`Surface + Pressable + Text + Chip`) y dejar los datos intactos.
  - En este proyecto, cuando una sección agrupada necesita verse premium pero seguir siendo funcional, es preferible un acordeón custom sobrio a depender del look por defecto de `List.Accordion`.

- Hallazgo puntual:
  - En `components/ventas/DialogVenta.native.jsx`, devolver `null` cuando `venta` aún no estaba disponible hacía que el modal no llegara a montarse visualmente.
  - Aunque `visible === true`, si el componente sale por `return null` antes de renderizar `Portal + Modal`, el usuario percibe que el diálogo “no abre”.

- Ajuste aplicado:
  - El diálogo ahora se monta siempre que la pantalla lo invoque.
  - La propia variante nativa se suscribe a `ventas` por `_id` y, si todavía no tiene el documento, renderiza un estado de carga o vacío dentro del modal en lugar de desaparecer.

- Regla práctica:
  - Si un modal depende de datos reactivos, no condicionar el render completo del `Portal/Modal` a que el documento ya exista.
  - Mantener el contenedor del modal visible y resolver dentro del body los estados:
    - cargando
    - sin documento
    - documento disponible

Notas adicionales – Apertura estable de `DialogVenta` desde cards presionables

- Hallazgo puntual:
  - En `components/ventas/VentasList.native.jsx`, abrir `DialogVenta` desde el tap de toda la card puede volverse frágil si el modal queda montado permanentemente o si el backdrop permite dismiss inmediato en el mismo gesto.
  - En `components/ventas/DialogVenta.native.jsx`, además no conviene introducir early returns antes de los hooks para “ocultarlo”, porque rompe el orden de hooks.

- Ajuste aplicado:
  - `VentasList.native.jsx` ahora monta `DialogVenta` solo cuando `showDialog === true`.
  - `DialogVenta.native.jsx` mantiene todos sus hooks en orden estable.
  - El `Modal` usa `dismissable={false}` y se apoya en el botón de cierre explícito, evitando cierres accidentales del backdrop justo al abrir desde la card.
  - El `BlurView` del fondo quedó con `pointerEvents="none"` para no interferir con la interacción de la superficie principal.

- Regla práctica:
  - Si un modal se abre desde una card completa o desde una superficie grande presionable, preferir montaje condicional en el padre y cierre explícito antes que dejar el modal siempre montado con backdrop dismiss por defecto.
  - Si hace falta ocultar un modal por `visible`, hacerlo desde el render del padre o desde el propio `Modal`, pero nunca antes de los hooks del componente.

Notas adicionales – `TouchableRipple` en cards de ventas fue inestable en iOS

- Hallazgo puntual:
  - En `components/ventas/VentasList.native.jsx`, el tap sobre la card de venta funcionaba en Android pero no abría de forma confiable el diálogo en iOS.
  - La diferencia por plataforma apuntó al uso de `TouchableRipple` envolviendo toda la card dentro de un `ScrollView`.

- Ajuste aplicado:
  - Se reemplazó `TouchableRipple` por `Pressable` de React Native para abrir `DialogVenta` desde toda la tarjeta.
  - Se mantuvo feedback visual con:
    - `android_ripple` en Android
    - leve reducción de opacidad/escala en estado `pressed`

- Regla práctica:
  - En este proyecto, si una card completa debe abrir un modal y el gesto resulta inconsistente en iOS, preferir `Pressable` antes que `TouchableRipple`.
  - Reservar `TouchableRipple` para superficies donde ya esté probado en ambas plataformas o donde el feedback Material sea imprescindible y estable.

---

Resumen técnico – Puntico de conexión del avatar en `UsersHome` debe respetar exactamente el legacy

- Hallazgo validado:
  - El puntico del avatar en la lista de usuarios no debe reinterpretarse con una paleta nueva en Expo.
  - La fuente de verdad sigue siendo `components/users/UserAvatar.jsx` del legacy junto con el cálculo de `connectionType` en `UsersHome.js`.

- Mapeo cromático correcto del badge:
  - `web` -> `#10ffE0`
  - `proxy` -> `#102dff`
  - `vpn` -> `#10ff00`
  - fallback conectado -> `#10ff00`

- Regla funcional importante:
  - El badge solo debe renderizarse cuando `isConnected === true`.
  - La prioridad del tipo de conexión debe mantenerse igual que en legacy:
    - primero `web`
    - luego `proxy`
    - finalmente `vpn`
  - Si el usuario no está conectado, no corresponde mostrar puntico gris ni otro estado visual alternativo.

- Recomendación para próximos desarrolladores:
  - Si se toca `UserAvatar` en Expo, contrastar siempre contra el archivo legacy antes de cambiar colores o lógica del badge.
  - No mezclar los colores del puntico con la semántica visual de otros chips o cards del listado; el avatar tiene su propio contrato histórico.
  - En `components/users/UsersHome.native.js`, conviene resolver `hasWebConnection`, `hasProxyConnection`, `hasVpnConnection` y `connectionType` desde un único helper compartido dentro de la pantalla para que filtros y avatar usen exactamente la misma prioridad visual del legacy.
  - El matching entre `online.userId` y `user._id` no debe asumirse con el mismo shape exacto en Expo; si uno llega serializado distinto, conviene normalizar ambos a string dentro del helper para conservar el mismo efecto práctico que el `==` del legacy.

Notas adicionales – `router.back()` en flujo de users debe tener fallback seguro

- Hallazgo puntual:
  - En Expo Router, si una pantalla del flujo de usuarios se abre como entrypoint directo o por replace profundo, `router.back()` puede disparar el warning `GO_BACK was not handled by any navigator`.

- Ajuste aplicado:
  - `components/users/CreateUsers.native.js` ahora usa un handler de cancelación seguro:
    - si `router.canGoBack()` -> `router.back()`
    - si no -> `router.replace('/(normal)/Users')`

- Regla práctica:
  - En pantallas secundarias del módulo users, no usar `router.back()` desnudo en botones de cancelar o cerrar.
  - Siempre definir una ruta fallback explícita cuando la pantalla pueda abrirse sin historial previo.

- Limitación importante actual:
  - El cliente ya registra `apns`, `expo` y `fcm` donde corresponda, pero el backend actual solo envía por Expo Push API y Firebase Admin.
  - Los tokens `apns` quedan correctamente identificados para no romper el envío, pero todavía requieren un transport APNs dedicado si se quiere entrega directa por Apple.
  - Si una pantalla lista documentos y un child también toma decisiones críticas por flags (`isCancelada`, `isCobrado`, `estado`), conviene que el child pueda reconsultar su documento por id en vez de depender solo de la prop inicial.

Notas adicionales – Aprobación de venta debe reflejarse localmente igual que rechazo

- Hallazgo puntual:
  - El rechazo de venta ya estaba haciendo `VentasRechargeCollection.update(... isCancelada: true ...)`, por lo que la card se ocultaba apenas Minimongo cambiaba.
  - La aprobación de venta dependía solo de `Meteor.call('ventas.aprobarVenta', ...)` y de que el servidor/publicación devolvieran el cambio a tiempo.

- Ajuste aplicado:
  - Tras un `success` de `ventas.aprobarVenta`, se hace también un `VentasRechargeCollection.update(...)` local marcando al menos:
    - `isCobrado: true`
    - `estado` usando el valor devuelto por el método si existe, o fallback seguro.
  - El componente ahora trata `isCobrado === true` como condición suficiente para salir del render, no solo estados textuales como `PAGADA` o `COMPLETADA`.

- Regla práctica:
  - Si una acción del servidor saca un documento de la query actual del listado, conviene reflejar ese mismo flag en Minimongo local cuando el callback de éxito vuelve, para evitar ventanas donde la UI sigue mostrando una card ya procesada.

---

Resumen técnico – Evitar duplicado de push en Expo y usar Alert en foreground

- Problema detectado:
  - En Expo, al recibir un push con payload de notificación mientras la app estaba activa, el usuario veía la notificación dos veces o veía una notificación del sistema cuando en realidad debía ver solo una alerta dentro de la app.

- Causa raíz validada:
  - `services/notifications/PushMessaging.native.ts` estaba haciendo dos cosas incompatibles con el comportamiento esperado del proyecto:
    - en `messagingInstance.onMessage(...)` siempre llamaba `displayLocalNotification(...)`, agendando una notificación local incluso en foreground
    - `Notifications.setNotificationHandler(...)` permitía `shouldShowBanner: true` y `shouldShowList: true`, dejando que Expo presentara visualmente notificaciones mientras la app seguía abierta
  - Esa combinación reintroduce duplicado perceptible cuando el push remoto ya trae título/body o cuando el foreground debería manejarse como UI interna y no como notificación del sistema.

- Corrección aplicada:
  - En foreground, el flujo pasó a usar `Alert.alert(...)` mediante un helper dedicado (`showForegroundAlert`) en lugar de `scheduleNotificationAsync(...)`.
  - `Notifications.setNotificationHandler(...)` quedó configurado para no mostrar banner ni lista mientras la app está activa:
    - `shouldShowBanner: false`
    - `shouldShowList: false`
    - `shouldPlaySound: false`
  - La notificación local con `expo-notifications` se mantiene reservada para el flujo que realmente la necesita fuera del foreground, especialmente data-only en background.

- Regla práctica:
  - Si el comportamiento esperado en foreground es “mostrar mensaje dentro de la app”, no agendar notificación local; usar `Alert`, modal o UI interna.
  - Si además existe `Notifications.setNotificationHandler(...)`, revisar que no esté permitiendo banner/lista en foreground, porque eso puede volver a mostrar visualmente una notificación que la app ya procesó por su cuenta.

- Lección técnica:
  - En Expo, el duplicado no siempre viene de dos listeners duplicados; también puede venir de mezclar:
    - listener manual de RN Firebase (`onMessage`)
    - presentación local con `scheduleNotificationAsync`

---

Resumen técnico – Step de ubicación del carrito con mapa real en Expo

- Problema detectado:
  - `components/carritoCompras/MapLocationPicker.native.jsx` había quedado degradado a un formulario de latitud/longitud manual.
  - Eso rompía la paridad esperada con el legacy, donde el usuario selecciona la ubicación de entrega tocando directamente un mapa dentro del stepper.

- Contrato visual y funcional validado contra legacy:
  - El step de ubicación debe mostrar un mapa real dentro del wizard.
  - El usuario debe poder tocar el mapa para fijar el punto de entrega.
  - La ubicación actual debe poder usarse para centrar y seleccionar rápidamente.
  - La selección debe propagarse al estado del wizard sin exigir entrada manual de coordenadas.

- Solución aplicada en Expo:
  - `MapLocationPicker.native.jsx` ahora usa `react-native-maps` con:
    - `PROVIDER_GOOGLE` en Android
    - `PROVIDER_DEFAULT` en iOS
  - La ubicación del dispositivo se resuelve con `expo-location`, manteniendo el stack oficial ya usado en el proyecto Expo.
  - Al tocar el mapa:
    - se actualiza el marker local
    - se llama inmediatamente a `onLocationSelect(...)`
  - El botón `Usar mi ubicación`:
    - vuelve a pedir permisos si hace falta
    - obtiene coordenadas actuales
    - actualiza el marker
    - recentra el mapa

- Decisión técnica importante:
  - No se reintrodujo captura manual por `TextInput` para latitud/longitud.
  - En este flujo, si ya existe `react-native-maps` en el proyecto y el legacy depende de selección visual sobre mapa, la migración correcta es restaurar esa interacción, no mantener un fallback manual como solución final.

- Regla práctica:
  - En módulos Expo donde el legacy usa mapa para elegir una coordenada del usuario, no degradar el UX a coordenadas manuales salvo que el runtime realmente no soporte mapas.
  - Si el selector vive dentro de un stepper o modal, preferir un `MapView` embebido con marker y callback inmediato antes que un diálogo adicional o una doble confirmación innecesaria.

- Validación realizada:
  - `get_errors` sin errores en:
    - `components/carritoCompras/MapLocationPicker.native.jsx`
    - `components/carritoCompras/WizardConStepper.native.jsx`
  - `npx eslint --no-cache components/carritoCompras/MapLocationPicker.native.jsx components/carritoCompras/WizardConStepper.native.jsx` sin problemas tras corregir dependencias del hook.
    - handler global de Expo Notifications con banner/list habilitados
  - Para paridad con el legacy VIDKAR, foreground debe resolverse como alerta interna y background como notificación del sistema o notificación local de respaldo, pero no ambos a la vez.

Notas adicionales – Background/cerrada y payload visible en `data`

- Hallazgo importante:
  - En background o app cerrada no alcanza con revisar solo `message.notification` para decidir si hay que programar una notificación local de respaldo.
  - En este proyecto el backend puede enviar también `title` y `body` dentro de `message.data`, y el sistema igualmente terminar mostrando la remota.

- Regla práctica:
  - Antes de disparar una notificación local en `setBackgroundMessageHandler`, tratar como payload visible cualquiera de estos casos:
    - `message.notification.title`
    - `message.notification.body`
    - `message.data.title`
    - `message.data.body`
  - Si alguno existe, no programar la local porque se corre alto riesgo de duplicado en la barra de notificaciones.

Notas adicionales – Estrategia final adoptada en Expo: sin notificaciones locales programadas por la app

- Decisión aplicada:
  - En este proyecto Expo se descartó seguir programando notificaciones locales desde la app para pushes remotos.
  - La responsabilidad de mostrar la notificación en background/cerrada queda del lado del sistema operativo y del payload FCM remoto.
  - La app solo hace dos cosas:
    - en foreground muestra `Alert.alert(...)`
    - al abrir una notificación consume `onNotificationOpenedApp`, `getInitialNotification` y los datos asociados

- Regla práctica:
  - No usar `scheduleNotificationAsync(...)` como reflejo de un push remoto si la intención es que Android/iOS manejen la presentación por defecto.
  - Mantener `setBackgroundMessageHandler(...)` solo para tareas silenciosas o procesamiento de datos, no para mostrar notificaciones duplicadas.

Notas adicionales – Apertura de notificación debe mostrar alerta con el contenido

- Decisión aplicada:
  - Cuando el usuario toca una notificación remota, la app debe mostrar una alerta con el título y cuerpo del mensaje al abrirse.
  - Esto aplica tanto para:
    - apertura desde background con `onNotificationOpenedApp`
    - apertura desde estado cerrado con `getInitialNotification`

- Regla práctica:
  - Si la notificación ya fue mostrada por el sistema y el usuario la abre, la app no necesita volver a renderizar una notificación; solo debe consumir los datos y, si el flujo UX lo pide, mostrar `Alert.alert(...)` con el contenido.

---

Resumen técnico – RN Firebase no debe cargarse con imports estáticos si el binario nativo todavía no lo incluye

- Problema detectado:
  - El arranque de Expo nativo podía crashear inmediatamente con:
    - `Native module RNFBAppModule not found`
  - La causa no era la lógica de listeners en sí, sino que `services/notifications/PushMessaging.native.ts` importaba `@react-native-firebase/messaging` en tiempo de módulo.
  - Si la app se ejecuta en Expo Go o en un binario que aún no fue recompilado con RN Firebase, ese import estático revienta antes de que exista cualquier fallback.

- Corrección aplicada:
  - `@react-native-firebase/messaging` quedó con carga dinámica mediante `import()` y caché local, en vez de import estático al tope del archivo.
  - Todas las operaciones dependientes de Firebase Messaging ahora pasan por un resolver defensivo (`getFirebaseMessagingModule` / `getMessaging`).
  - Antes de intentar el `import()`, el servicio valida si realmente existe runtime nativo compatible:
    - aborta directamente en Expo Go (`Constants.appOwnership === 'expo'`)
    - aborta si `NativeModules.RNFBAppModule` no existe en el binario actual
  - Si el módulo nativo no está disponible:
    - no se registra background handler
    - no se montan listeners FCM
    - no se intenta registrar token
    - la app no crashea y solo deja un warning claro en consola

- Regla práctica:
  - En este proyecto Expo, cualquier dependencia nativa opcional o dependiente del binario instalado no debe importarse estáticamente si su ausencia tiene que ser tolerable en desarrollo.
  - Si el comportamiento correcto es “degradar sin romper”, usar carga dinámica y fallback explícito.
  - Si además el paquete JS puede llegar a lanzar error durante su evaluación interna, no alcanza con `import().catch(...)`; primero hay que gatear por señales del runtime nativo disponible.

- Lección importante para push:
  - `app/_layout.native.tsx` puede seguir importando el servicio push por side effect, pero el propio servicio debe ser seguro aunque RN Firebase todavía no exista en el runtime.
  - El soporte real de Firebase Messaging sigue requiriendo dev build o build EAS recompilado; esta corrección evita el crash, no sustituye la necesidad del binario nativo correcto.

---

Resumen técnico – Migración de push notifications Firebase a Expo con paridad funcional del legacy

- Objetivo aplicado:
  - Portar el flujo push del legacy a Expo manteniendo el backend Meteor existente (`push.registerToken`, `push.unregisterToken`, `messages.send`) y el comportamiento operativo de recepción/notificación.

- Decisión técnica importante:
  - En Expo se mantuvo Firebase Messaging para el token nativo FCM y los listeners remotos.
  - Para la presentación local de notificaciones en foreground se usó `expo-notifications` en lugar de portar Notifee completo.
  - Esta combinación preserva el contrato del backend legado basado en tokens Firebase y evita depender de una migración completa de la capa visual de Notifee en esta etapa.

- Dependencias agregadas en Expo:
  - `@react-native-firebase/app`
  - `@react-native-firebase/messaging`
  - `expo-notifications`

- Configuración Firebase reutilizada desde legacy:
  - `GoogleService-Info.plist`
  - `google-services.json`
  - Ambos se copiaron al root del proyecto Expo y se referencian desde `app.json` con:
    - `ios.googleServicesFile`
    - `android.googleServicesFile`

- Hallazgo importante sobre config plugins:
  - En este proyecto Expo, apuntar `plugins` a `@react-native-firebase/app` y `@react-native-firebase/messaging` por nombre simple produjo error de resolución de plugin en el editor.
  - La forma estable validada fue usar la ruta explícita a:
    - `./node_modules/@react-native-firebase/app/app.plugin.js`
    - `./node_modules/@react-native-firebase/messaging/app.plugin.js`
  - `npx expo config --json` confirmó que Expo resuelve correctamente esos plugins y registra su `pluginHistory`.

- Arquitectura aplicada en Expo:
  - `services/notifications/PushMessaging.native.ts`
    - registra `messaging().setBackgroundMessageHandler(...)` a nivel de módulo
    - expone `registerPushTokenForUser`, `registerPushTokenForActiveSession`, `unregisterPushTokenForUser`, `sendMessage`, `setupPushListeners`, `displayLocalNotification` y `badgeManager`
    - crea canal Android `default` con importancia alta
    - usa `messaging().getToken()` como fuente del token nativo
    - registra el token en Meteor con `push.registerToken`
  - `services/notifications/PushMessaging.ts`
    - fallback no-op para superficies no nativas
  - `app/_layout.native.tsx`

---

Resumen técnico – El contenido del `StoreCard` debe renderizarse como child real del mapa

- Ajuste aplicado:
  - `components/empresa/maps/MapaTiendaCardBackground.native.jsx` ahora acepta `children` y los monta dentro de su propio wrapper, por encima del `MapView` y del scrim.
  - `components/empresa/screens/MisTiendasScreen.native.jsx` dejó de armar el hero de la tienda con overlays hermanos del mapa.
  - La composición visible del card (`status chip`, menú, panel informativo, métricas y CTA) ahora vive como child real de `MapaTiendaCardBackground`.

- Criterio técnico validado:
  - Si el mapa es el componente padre visual del card, el contenido asociado también debe vivir dentro de ese mismo árbol.
  - Esto simplifica el layering y hace más coherente la composición del hero que dejar el mapa como fondo aislado y el resto como capas externas.

- Regla práctica:
  - En este proyecto, si un componente de media o mapa actúa como contenedor principal del card, preferir inyectar el contenido superpuesto como `children` del componente de fondo antes que envolverlo con capas hermanas usando `absoluteFill`.

---

Resumen técnico – En React Native Maps los overlays del card no deben renderizarse dentro de `MapView`

- Problema detectado:
  - En iOS/Fabric apareció el crash:
    - `RCTComponentViewRegistry: Attempt to recycle a mounted view`
  - La causa fue montar `children` arbitrarios del card dentro del árbol nativo de `MapView` en `MapaTiendaCardBackground.native.jsx`.

- Corrección aplicada:
  - `MapaTiendaCardBackground.native.jsx` mantiene al mapa como padre visual del card, pero el contenido superpuesto ya no se renderiza dentro de `MapView`.
  - La estructura correcta quedó así:
    - `MapView`
    - `scrim`
    - `overlayContent` con `children`
  - Todo eso vive dentro del mismo wrapper del mapa, pero solo `Marker` queda como hijo del `MapView`.

- Regla práctica:
  - Si un card necesita overlays sobre un mapa en Expo/React Native Maps, esos overlays deben vivir en el wrapper del componente y no como hijos directos de `MapView`.
  - En este proyecto, dentro de `MapView` dejar solo elementos compatibles del mapa como `Marker`, `Polyline`, etc.; no montar ahí paneles, menús, botones o vistas de layout general.

---

Resumen técnico – `StoreCard` de Mis Tiendas con CTA principal en toda la tarjeta

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` dejó de usar un botón explícito `Abrir tienda` dentro del hero.
  - La navegación principal ahora vive en el propio `Card` usando `onPress`, de modo que tocar cualquier parte de la tarjeta abre el detalle de la tienda y sus productos.
  - El menú de tres puntos se mantiene como acción secundaria para editar o eliminar la tienda.

- Criterio UX validado:
  - En este card, el CTA principal no debe competir visualmente con la información del negocio.
  - La tarjeta debe leerse primero como una superficie informativa del local y, a la vez, comportarse completa como acceso natural al detalle.
  - El contenido del hero debe quedar más resumido y mejor jerarquizado:
    - firma del local
    - fecha/antigüedad
    - nombre
    - descripción breve
    - estado operativo
    - cantidad de productos
    - ubicación
    - hint final de interacción

- Regla práctica:
  - Si una card ya representa una entidad navegable completa, preferir que toda la superficie sea el target principal y dejar botones internos solo para acciones secundarias o destructivas.

---

Resumen técnico – `StoreCard` de Mis Tiendas con chips blur y jerarquía editorial

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` ahora usa chips con `BlurView` dentro del hero del mapa para reforzar el look premium del card.
  - El patrón blur se aplicó a:
    - estado de ubicación
    - fecha/antigüedad de la tienda
    - contador principal de productos
    - contenedor visual del botón de menú contextual

- Criterio UX validado:
  - El card debe sentirse como un mapa editorial con información superpuesta, no como un bloque común con widgets dispersos.
  - La estructura aprobada para el contenido del hero quedó así:
    - fila superior con estado blur + menú
    - metadatos de firma/antigüedad
    - nombre y descripción
    - bloque resumido de estado y perfil
    - ubicación registrada
    - hint de navegación al detalle

- Regla técnica importante:
  - En este proyecto, `BlurView` debe usar:
    - `tint="dark"` o `tint="light"` literal
    - `experimentalBlurMethod="dimezisBlurView"` en Android
    - `renderToHardwareTextureAndroid={true}` cuando el blur esté dentro de overlays complejos
  - Si se usan chips blur dentro de cards con mapa, el contenido superpuesto debe seguir viviendo fuera de `MapView` y solo en el wrapper del componente.

- Regla práctica:
  - Si se vuelve a iterar esta tarjeta, mantener los blur chips solo en puntos de lectura rápida; no convertir todo el panel inferior en glass para no perder contraste ni claridad comercial.
    - importa el servicio push por side effect para asegurar que el handler global quede registrado desde el arranque nativo
  - `app/index.native.tsx`
    - inicializa listeners globales con `setupPushListeners()`
    - registra el token cuando existe `Meteor.userId()`
  - `components/loguin/Loguin.native.js`
    - tras `Meteor.loginWithPassword(...)` exitoso fuerza un registro explícito con `registerPushTokenForActiveSession()` para no depender solo del `onToken` inicial

- Hallazgo funcional importante sobre registro de token:
  - El token inicial de FCM puede resolverse cuando todavía no existe sesión Meteor activa.
  - Si el registro depende solo del `onToken` del arranque, ese primer token puede quedar sin asociarse a ningún usuario.
  - En este proyecto Expo conviene cubrir ambos momentos:
    - arranque global con `setupPushListeners()`
    - reintento explícito después del login exitoso
  - También conviene reutilizar el token ya resuelto por `onToken` / `onTokenRefresh` al llamar `push.registerToken`, en vez de depender siempre de una nueva lectura de `getToken()`.

- Comportamiento funcional resultante:
  - foreground:
    - cuando llega un push FCM para el usuario actual, se agenda una notificación local con `expo-notifications`
    - se incrementa badge y se resetea al volver a `active`
  - background/quit:
    - Firebase Messaging queda registrado a nivel global
    - para mensajes data-only se puede mostrar local desde el background handler
    - para mensajes con payload de notificación, se evita duplicar la alerta local y se deja al sistema operativo presentar la remota
  - apertura desde notificación:
    - se resetea badge en `onNotificationOpenedApp`, `getInitialNotification` y `Notifications.getLastNotificationResponseAsync()`

- Regla crítica para próximos desarrolladores:
  - Este sistema NO debe validarse en Expo Go.
  - Requiere dev build o build EAS porque usa módulos nativos (`@react-native-firebase/app`, `@react-native-firebase/messaging`, `expo-notifications` con configuración nativa real).
  - Si el usuario reporta que “no llegan push” y está corriendo Expo Go, el problema no está necesariamente en el código.

- Validación realizada:
  - los archivos nuevos/modificados de servicio y root quedaron sin errores del editor:
    - `services/notifications/PushMessaging.native.ts`
    - `services/notifications/PushMessaging.ts`
    - `app/_layout.native.tsx`
    - `app/index.native.tsx`
  - `npx expo config --json` resolvió correctamente Firebase y `expo-notifications` en la configuración del proyecto.

  ***

  Resumen técnico – Push UX con diálogo global de React Native Paper e imagen opcional
  - Ajuste visual aplicado:
    - El flujo push en Expo dejó de usar `Alert.alert(...)` para foreground y apertura.
    - Ahora el servicio emite un estado reactivo global y la UI real se renderiza con un `Dialog` de React Native Paper montado en la raíz nativa.

  - Arquitectura implementada:
    - `services/notifications/PushMessaging.native.ts` expone:
      - `subscribeToPushDialog(...)`
      - `dismissPushDialog()`
      - `PushDialogPayload`
    - `components/shared/PushNotificationDialogHost.native.tsx` se suscribe a ese estado y renderiza el diálogo dentro de `Portal`.
    - `app/index.native.tsx` monta el host una sola vez por superficie activa, de modo que el diálogo queda disponible en login, menú principal, modo cadete, modo empresa y estado de carga.

  - Comportamiento funcional resultante:
    - **Foreground**:
      - al llegar una notificación para el usuario actual, se incrementa badge y se abre un diálogo Paper con estilo visual más cuidado.
    - **Apertura de notificación**:
      - al tocar una notificación desde background o app cerrada, se resetea badge y se muestra exactamente el mismo diálogo visual, sin copy alterno para “abierta”.
    - **Background/cerrada**:
      - el sistema operativo sigue siendo responsable de mostrar la notificación remota; la app no programa notificaciones locales.

  - Soporte de imagen:
    - El servicio ahora intenta resolver imagen remota desde varios campos comunes del payload, cubriendo variantes vistas o plausibles entre Android, iOS y `data` payload:
      - `notification.imageUrl`
      - `notification.image`
      - `notification.android.imageUrl`
      - `notification.ios.imageUrl`
      - `fcmOptions.imageUrl`
      - `fcmOptions.image`
      - `apns.fcmOptions.image`
      - `data.image`
      - `data.imageUrl`
      - `data.image_url`
      - `data.media`
      - `data.mediaUrl`
      - `data.media_url`
      - `data.picture`
      - `data.photo`
      - `data.foto`
      - `data.thumbnail`
      - `data.attachment`
      - `data.attachmentUrl`
      - `data.attachment_url`
    - Si encuentra una URL válida, el diálogo muestra la imagen dentro del contenido.
    - Si la imagen falla al cargar, el host la oculta de forma defensiva sin romper el diálogo.

  - Regla práctica:
    - Si se necesita cambiar la apariencia de las notificaciones visibles dentro de la app, la fuente de verdad ya no es `Alert` ni `expo-notifications`, sino `PushNotificationDialogHost.native.tsx`.
    - Si se agregan nuevos campos de imagen desde backend, incorporarlos en `getImageUrl(...)` para no duplicar lógica en la UI.

  - Ajuste visual posterior validado:
    - El diálogo no debe mostrar textos como “notificación abierta” o “nueva notificación” como estados distintos, porque el usuario pidió una experiencia idéntica al recibir o abrir el push.
    - La solución correcta fue usar una sola identidad visual estable del módulo de notificaciones y dejar que el contenido cambie solo por `title`, `body` e imagen.

---

Resumen técnico – Login de Google en Expo usando AuthSession y contrato legacy de Meteor

- Objetivo aplicado:
  - Se activó el botón real de Google en `components/loguin/Loguin.native.js` sin cambiar el contrato backend existente.
  - La autenticación ahora usa `expo-auth-session` en lugar de portar directamente la librería nativa legacy de Google Sign-In.

- Decisión técnica importante:
  - En este proyecto Expo conviene resolver Google Login con `expo-auth-session` porque encaja mejor con el stack actual y evita añadir otra capa nativa específica solo para auth social.
  - El backend Meteor sigue recibiendo el mismo payload conceptual del legacy vía `Meteor.call('login', { googleSignIn: true, ... })`.

  ***

  Resumen técnico – EAS iOS fallando por `date-fns` faltante en `react-native-calendar-picker`
  - Problema detectado:
    - El paso de bundle iOS en EAS falló con:
      - `Unable to resolve module date-fns/addMonths`
    - El import rompía dentro de `node_modules/react-native-calendar-picker/CalendarPicker/index.js`.

  - Causa raíz validada:
    - `react-native-calendar-picker@8.0.5` declara `date-fns` como `peerDependency`, no como dependencia directa.
    - El proyecto usaba el calendario desde:
      - `components/users/componentsUserDetails/ProxyCardAdmin.js`
      - `components/users/componentsUserDetails/VpnCardAdmin.js`
    - Como `date-fns` no estaba declarado en `package.json`, el bundler de EAS no podía resolver imports como:
      - `date-fns/addMonths`
      - `date-fns/getMonth`

    ***

    Resumen tecnico - Trailer inline de YouTube en el drawer de Peliculas Expo
    - Alcance aplicado:
      - `components/downloadVideos/DownloadVideosHome.native.jsx` ya no abre el trailer de YouTube fuera de la app.
      - Cuando una pelicula tiene `urlTrailer` valida de YouTube, el drawer de detalle reproduce ese trailer inline exactamente en el bloque donde normalmente se muestra el poster principal.

    - Libreria y dependencias aplicadas:
      - Se integro `react-native-youtube-iframe` como reproductor del trailer dentro del drawer.
      - Tambien se instalo `react-native-webview`, requerida por el embed para funcionar correctamente en Expo.
      - La instalacion en este repo debe hacerse forzando `npm` porque `npx expo install` intenta usar `yarn` por defecto y este entorno no lo tiene disponible.

    - Contrato funcional resultante:
      - El drawer extrae el `videoId` real desde `urlTrailer` con un helper dedicado y tolerante a distintos formatos de URL de YouTube.
      - Si existe trailer valido:
        - se renderiza `YoutubePlayer` inline
        - el poster deja de ser la superficie principal del hero
        - desaparece el boton separado `Trailer`
      - Si no existe trailer valido:
        - el drawer mantiene el poster como hero visual normal
      - El boton `Reproducir` de la pelicula principal no cambia de contrato; sigue perteneciendo al flujo del player de pelicula y no al trailer.

    - Criterio UX validado:
      - El trailer no debe sentirse como accion secundaria que saca al usuario a YouTube.
      - Si la pelicula tiene trailer, el drawer debe mostrarlo directamente en la misma zona protagonista del detalle.
      - La superficie de acciones debe quedar mas limpia: solo se conserva el boton principal de reproduccion y no un segundo CTA redundante para trailer.

    - Regla practica:
      - Si se vuelve a tocar el drawer de Peliculas Expo, no reintroducir `Linking.openURL(...)` para trailers de YouTube.
      - El flujo correcto es:
        1. resolver `videoId` desde `urlTrailer`
        2. renderizar `react-native-youtube-iframe` inline en el hero del drawer
        3. mostrar poster solo como fallback cuando no haya trailer valido
      - Mantener el embed localizado al drawer del catalogo; no mezclar esta logica con el player principal de peliculas.
      - `date-fns/getYear`

  - Solución aplicada:
    - Se instaló explícitamente `date-fns` en el proyecto Expo con `yarn add date-fns`.
    - El resultado quedó reflejado en `package.json` como dependencia directa.

  - Validación realizada:
    - Se confirmó leyendo el `package.json` del paquete instalado que `react-native-calendar-picker` exige `date-fns` como peer dependency.
    - Se reejecutó el paso equivalente de bundle iOS:
      - `npx expo export:embed --eager --platform ios --dev false`
    - El bundle completó correctamente, confirmando que la falla original quedó resuelta.

  - Regla práctica:
    - Si una librería RN en Expo falla en EAS con imports faltantes dentro de `node_modules`, revisar primero sus `peerDependencies` antes de asumir un problema del bundler.
    - En este proyecto, cualquier componente que use `react-native-calendar-picker` debe considerar `date-fns` parte obligatoria del stack.

- Payload mantenido hacia Meteor:
  - `googleSignIn: true`
  - `accessToken`
  - `idToken`
  - `serverAuthCode`
  - `email`
  - `imageUrl`
  - `userId`

- Estrategia aplicada en cliente:
  - `Google.useAuthRequest(...)` con:
    - `androidClientId = 1043110071233-pbeoteq8ua30rsbqmk8dtku6hcmeekci.apps.googleusercontent.com`
    - `iosClientId = 1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com`
    - scopes `profile` y `email`
  - Tras el success de OAuth se consulta `https://www.googleapis.com/oauth2/v3/userinfo` con el `accessToken` para completar perfil público (`email`, `picture`, `sub`).
  - Luego se replica el patrón legacy de sesión Meteor:
    - `Meteor._startLoggingIn?.()`
    - `Meteor.call('login', payload, callback)`
    - `Meteor._endLoggingIn?.()`
    - `Meteor._handleLoginCallback?.(error, response)`
  - Después del login exitoso se vuelve a registrar el token push del usuario activo.

- Regla práctica:
  - Si el login social usa un método Meteor custom y no `Meteor.loginWithPassword`, hay que seguir pasando por `_handleLoginCallback` para que la sesión del cliente quede persistida correctamente.
  - Si en el futuro el backend exige más campos para Google, el lugar correcto para extender el payload es `completeGoogleLogin(...)` dentro de `Loguin.native.js`.

---

Resumen técnico – Google Sign-In en iPadOS puede romperse por restauración silenciosa previa

- Problema detectado:
  - El inicio de sesión con Google podía funcionar en iPhone y Android, pero fallar en iPadOS aun usando la misma configuración OAuth.
  - El punto frágil estaba en `components/loguin/Loguin.native.js`, donde el flujo intentaba primero `GoogleSignin.signInSilently()` si `hasPreviousSignIn()` devolvía true.

- Causa raíz probable validada:
  - En iPadOS puede existir un estado previo inválido o inconsistente de Google/Keychain aunque `hasPreviousSignIn()` siga devolviendo true.
  - Si `signInSilently()` falla en ese escenario, el código anterior abortaba todo el login y nunca llegaba al `GoogleSignin.signIn()` interactivo.
  - Eso explica un comportamiento asimétrico por dispositivo sin implicar necesariamente un problema de client IDs o de configuración Firebase.

- Solución aplicada:
  - `signInSilently()` quedó envuelto en `try/catch`.
  - Si falla, ahora se registra el warning y se hace limpieza defensiva con `GoogleSignin.signOut().catch(() => null)`.
  - Después de eso el flujo continúa hacia `GoogleSignin.signIn(...)` interactivo, en vez de cancelar completamente el login.
  - También se añadió `loginHint` cuando el usuario escribe un email, para mejorar la experiencia en iOS.

- Regla práctica:
  - En iOS/iPadOS no asumir que `hasPreviousSignIn()` implica que `signInSilently()` será recuperable.
  - Si la restauración silenciosa falla, degradar a sign-in interactivo en lugar de cortar el flujo completo.
  - Cuando un bug aparece solo en iPad pero no en iPhone, revisar primero estados previos del proveedor y presentación del flujo nativo antes de culpar a OAuth o al backend.

Notas adicionales – `expo-auth-session` requiere `expo-crypto` como dependencia directa en este proyecto

- Hallazgo importante:
  - En Android apareció `Cannot find native module 'ExpoCrypto'` al cargar `expo-auth-session/providers/google`.
  - La causa práctica en este proyecto fue que `expo-auth-session` estaba instalada pero `expo-crypto` no figuraba como dependencia directa del app Expo.

- Corrección aplicada:
  - Se instaló `expo-crypto` con `npx expo install expo-crypto`.

- Regla práctica:
  - En este workspace no conviene asumir que una dependencia transitiva Expo quedará enlazada nativamente solo por existir dentro de `node_modules`.
  - Si `expo-auth-session` usa `expo-crypto`, mantener `expo-crypto` explícitamente en `package.json`.
  - Tras agregarla, recompilar el binario con `npx expo run:android` o el build correspondiente; reiniciar solo Metro no alcanza para inyectar el módulo nativo en una app ya compilada.

  ***

  Resumen técnico – Registro push simplificado a Expo-only en cliente VIDKAR
  - Decisión aplicada:
    - El cliente Expo dejó de registrar tokens nativos del dispositivo para backend (`FCM` en Android o `APNs` en iOS).
    - La única fuente de verdad para registro de push pasó a ser `ExpoPushToken` obtenido con `expo-notifications`.

  - Archivo ajustado:
    - `services/notifications/PushMessaging.native.ts`

  - Cambios funcionales:
    - `registerPushTokenForUser()` ahora envía un solo token con `provider: 'expo'`.
    - `unregisterPushTokenForUser()` elimina únicamente ese token Expo.
    - `setupPushListeners()` ya no depende de tokens nativos para callbacks iniciales o refresh; si llega un refresh nativo no Expo, recalcula el `ExpoPushToken` antes de registrar.
    - `platform` sigue codificando Android/iOS en el string persistido, pero siempre con sufijo `_expo_...`.

  - Regla práctica:
    - En este proyecto no usar `Notifications.getDevicePushTokenAsync()` como base de persistencia backend mientras el transporte oficial siga siendo Expo Push API.
    - Si se prueba foreground en la app, recordar que el banner del sistema sigue desactivado y la visualización activa se hace con el diálogo interno del proyecto.

---

Resumen técnico – Versión visible `4.0.x` derivada del build remoto de EAS

- Objetivo aplicado:
  - En el proyecto Expo, la versión visible de la app ya no depende de un patch hardcodeado en `app.json` durante los builds de producción.
  - Ahora el formato operativo queda como `4.0.x`, donde `x` se calcula a partir del número remoto que EAS va a usar como siguiente compilación.

- Hallazgo técnico importante:
  - Con `cli.appVersionSource = remote` y `build.production.autoIncrement = true`, EAS ignora `android.versionCode` e `ios.buildNumber` del app config como fuente de verdad y los incrementa remotamente.
  - Por eso no alcanza con leer `app.json` para construir una versión visible consistente con el build real.

- Solución aplicada:
  - Se creó `app.config.js` para resolver dinámicamente `expo.version`.
  - La base `4.0` se conserva tomando major/minor del `version` actual.
  - El patch final se inyecta mediante `APP_VERSION_PATCH` cuando el build corre en EAS.

- Workflow EAS ajustado:
  - En `.eas/workflows/create-production-builds.yml` se añadieron jobs previos para Android e iOS que ejecutan:
    - `eas build:version:get -p android -e production --json`
    - `eas build:version:get -p ios -e production --json`
  - Cada job calcula `current + 1`, porque `autoIncrement: true` hace que el build use precisamente el siguiente número remoto.
  - Ese valor se pasa al job de build vía `env.APP_VERSION_PATCH` para que `app.config.js` construya la versión visible correcta antes de compilar.

- Consideración importante:
  - Android e iOS pueden tener secuencias remotas distintas en EAS. Si eso ocurre, el `x` visible puede diferir por plataforma en builds separados, lo cual es coherente con haber pedido que el patch siga el número auto-generado real de cada compilación.

- Recomendación para próximos desarrolladores:
  - Si se ejecutan builds productivos fuera de este workflow, hay que inyectar también `APP_VERSION_PATCH` o replicar la consulta previa a `eas build:version:get`; de lo contrario, la versión visible caerá al fallback del config dinámico.
  - Si se quiere mantener más limpio el estado local, conviene usar periódicamente `eas build:version:sync` para alinear los valores locales con la fuente remota de EAS.

---

Resumen técnico – Error de pods iOS con RNFirebase en Expo por falta de `useFrameworks`

- Problema detectado:
  - El build iOS fallaba en `pod install` con el mensaje:
    - `The Swift pod FirebaseCoreInternal depends upon GoogleUtilities, which does not define modules`
  - El contexto del log indicaba que CocoaPods estaba integrando dependencias como `static libraries`, no como frameworks estáticos.

- Causa raíz validada:
  - En proyectos Expo managed que usan `@react-native-firebase/app`, la configuración iOS necesita `use_frameworks!` en modo estático.
  - Como este proyecto no versiona un `ios/Podfile` definitivo y depende de prebuild/EAS para generarlo, el ajuste no debe intentarse manualmente en un Podfile local inexistente.

- Solución aplicada:
  - Se instaló `expo-build-properties`.
  - En `app.json` se añadió el plugin:
    - `expo-build-properties` con `ios.useFrameworks = "static"`
  - Este es el mecanismo correcto para que Expo prebuild genere la configuración CocoaPods compatible con RNFirebase en iOS.

- Regla práctica:
  - Si un proyecto Expo managed usa RNFirebase en iOS, asumir desde el inicio que debe configurarse `useFrameworks: "static"` mediante `expo-build-properties`.
  - No depender de editar `ios/Podfile` manualmente salvo que el proyecto ya esté en bare workflow y ese archivo sea parte estable del repositorio.

---

Resumen técnico – En jobs custom de EAS Workflows no asumir `eas` en PATH

- Problema detectado:
  - Los jobs `resolve_android_version` y `resolve_ios_version` del workflow fallaron con:
    - `eas: command not found`
  - El error apareció antes del parsing de JSON y antes de llegar al build real.

- Causa raíz validada:
  - En jobs custom de EAS Workflows no se debe asumir que el binario `eas` esté disponible directamente en el PATH del runner.
  - Aunque el entorno sea de Expo/EAS, eso no equivale a tener el comando shell `eas` expuesto como ejecutable global en cada step.

- Solución aplicada:
  - Las llamadas del workflow se cambiaron a:
    - `npx --yes eas-cli build:version:get ...`
  - Con eso el job ejecuta la CLI explícitamente vía Node y deja de depender de un binario global inexistente.

- Regla práctica:
  - En custom jobs de EAS Workflows, cuando se necesite la CLI de Expo/EAS dentro de un `run`, preferir `npx --yes eas-cli ...` salvo que el job documente explícitamente otro wrapper disponible.
  - No asumir que porque el workflow corre en EAS, el comando `eas` existe directamente en shell.

---

Resumen técnico – Resolución robusta de `meteorUrl` en builds Expo

- Problema detectado:
  - En el runtime compilado de Expo, la conexión a Meteor podía arrancar sin URL efectiva aunque `extra.meteorUrl` estuviera definido en la configuración del proyecto.
  - El patrón `Constants.expoConfig?.extra?.meteorUrl` por sí solo resultó demasiado frágil para asumir que siempre existiría en todas las superficies de ejecución.

- Hallazgo técnico importante:
  - En este proyecto existen dos clientes Meteor separados:
    - `services/meteor/client.js`
    - `services/meteor/client.native.js`
  - El problema relevante para app compilada afecta sobre todo la variante `.native.js`, no solo la versión web-safe.

- Solución aplicada:
  - Se centralizó una resolución por candidatos para `getMeteorUrl()` usando, en orden:
    - `process.env.EXPO_PUBLIC_METEOR_URL`
    - `Constants.expoConfig?.extra?.meteorUrl`
    - `Constants.manifest2?.extra?.expoClient?.extra?.meteorUrl`
    - `Constants.manifest2?.extra?.meteorUrl`
    - `Constants.manifest?.extra?.meteorUrl`
    - fallback fijo `ws://38sljhvg-3000.brs.devtunnels.ms/websocket`
  - También se endureció `connectToMeteor(endpoint)` para que, si recibe un endpoint vacío o inválido, vuelva a resolver la URL central antes de lanzar error.

- Regla práctica:
  - En Expo, no asumir que una única ruta de `Constants` cubre de forma estable Expo Go, dev build, standalone build y posibles manifests modernos/legacy.

---

Resumen técnico – Caché local de última ubicación para comercio y carrito en Expo

- Objetivo aplicado:
  - Cada vez que la app necesita la ubicación del teléfono en flujos de cliente, primero reutiliza la última ubicación guardada localmente mientras resuelve la posición actual.
  - Cuando llega la ubicación fresca del dispositivo, esa nueva posición se persiste y pasa a ser la nueva fuente de caché.

- Servicio central creado:
  - `services/location/deviceLocationCache.native.js`
  - Responsabilidades:
    - leer última ubicación persistida desde `expo-secure-store`
    - normalizar lat/lng/accuracy/altitude/timestamp
    - pedir permiso de ubicación
    - resolver posición actual con `expo-location`
    - guardar automáticamente la posición fresca en caché

- Integración en comercio:
  - `components/productos/ProductosScreen.native.jsx` ya no espera siempre a la posición actual para empezar el flujo.
  - Primero intenta hidratar `userLocation` con la última ubicación guardada y con esa posición:
    - ordena/busca tiendas cercanas
    - permite mostrar contenido útil más rápido
  - Después solicita la ubicación actual y, si llega correctamente:
    - reemplaza la ubicación previa
    - actualiza backend con `cadete.updateLocation`
    - vuelve a consultar tiendas cercanas con la posición real
  - Si falla la ubicación actual pero ya había caché, no se degrada la UI a “sin ubicación”; se mantiene la última posición útil.

- Integración en carrito:
  - `components/carritoCompras/MapLocationPicker.native.jsx` usa la ubicación cacheada solo como valor inicial mientras resuelve la actual.
  - Cuando llega la posición fresca del teléfono:
    - actualiza marker y selección por defecto
    - la guarda como nueva caché local
  - Regla crítica del flujo:
    - si el usuario toca manualmente el mapa para elegir otra dirección de entrega, esa selección manual NO debe ser sobreescrita por la respuesta tardía de la ubicación actual del teléfono.
  - El botón `Usar mi ubicación` sí puede volver a forzar la posición actual y resetear esa prioridad manual.

- Decisión técnica importante:
  - La caché local guarda ubicación del dispositivo, no la selección manual arbitraria del mapa.
  - En carrito hay que distinguir entre:
    - ubicación automática del teléfono
    - ubicación manual de entrega elegida por el usuario
  - Mezclar ambas como si fueran lo mismo rompe el checkout de comercio.

- Regla práctica:
  - Si otro módulo Expo vuelve a necesitar GPS para hidratar UI rápido, debe reutilizar este servicio en lugar de volver a llamar `Location.getCurrentPositionAsync(...)` directo.
  - Si el flujo permite mover manualmente un pin o elegir una ubicación distinta a la del teléfono, la respuesta de geolocalización fresca no debe pisar esa selección manual salvo acción explícita del usuario.

- Validación realizada:
  - `get_errors` sin errores en:
    - `services/location/deviceLocationCache.native.js`
    - `components/productos/ProductosScreen.native.jsx`
    - `components/carritoCompras/MapLocationPicker.native.jsx`
  - `npx eslint --no-cache services/location/deviceLocationCache.native.js components/productos/ProductosScreen.native.jsx components/carritoCompras/MapLocationPicker.native.jsx` sin problemas.
  - Si una URL crítica de backend vive en `extra`, resolverla con varios orígenes y dejar un fallback explícito cuando el negocio requiera un servidor por defecto conocido.

Notas adicionales – Comercio debe inyectar su ubicación viva al carrito cuando ya la resolvió

- Hallazgo importante:
  - Aunque `MapLocationPicker.native.jsx` ya puede leer la ubicación cacheada, el camino más rápido para el usuario dentro de comercio es no esperar ni siquiera esa lectura si `ProductosScreen.native.jsx` ya tiene `userLocation` resuelta en memoria.

- Ajuste aplicado:
  - `components/productos/ProductosScreen.native.jsx` ahora pasa `userLocation` directamente a `components/carritoCompras/WizardConStepper.native.jsx` como `initialLocation`.
  - `WizardConStepper.native.jsx` conserva esa ubicación inicial y la entrega al `MapLocationPicker` cuando el step de ubicación se abre.
  - Así el carrito abre ya posicionado con la misma ubicación usada para buscar tiendas cercanas, mientras la actualización real del GPS sigue ocurriendo en segundo plano.

- Regla práctica:
  - Si un flujo hijo se abre desde una pantalla que ya resolvió GPS, primero reutilizar esa ubicación viva en memoria y solo dejar la caché persistida como respaldo para otros entrypoints.
  - En `MapLocationPicker.native.jsx`, si ya existe ubicación usable por prop o por caché, no dejar el componente bloqueado en un spinner mientras se obtiene la nueva posición; la UI debe mostrarse de inmediato y refrescar luego.

Notas adicionales – La prioridad correcta del render de ubicación es memoria, luego caché persistida y al final GPS

- Regla funcional final validada:
  - Comercio y carrito no deben depender del GPS actual para decidir si muestran o no la superficie principal.
  - El orden correcto quedó así:
    1. ubicación viva en memoria de la sesión actual
    2. última ubicación persistida en `expo-secure-store`
    3. solo si no existe ninguna de las dos, esperar la ubicación actual del GPS

- Ajuste aplicado:
  - `services/location/deviceLocationCache.native.js` ahora mantiene también una caché en memoria de proceso (`inMemoryCachedDeviceLocation`).
  - `ProductosScreen.native.jsx` inicializa `userLocation` desde esa caché en memoria cuando existe, antes de pedir GPS.
  - `WizardConStepper.native.jsx` inicializa `location` desde `initialLocation` o, si falta, desde la caché en memoria.
  - `MapLocationPicker.native.jsx` deja de entrar en modo de espera si ya tiene una ubicación inmediata usable por prop o por caché en memoria.

- Regla práctica:
  - Si en la misma sesión una pantalla ya resolvió GPS, los hijos o flujos posteriores no deben volver a comportarse como si no existiera ubicación.
  - El GPS debe refrescar y guardar la nueva posición por detrás, pero no bloquear el render inicial cuando ya hay una última ubicación conocida utilizable.

---

Resumen tecnico - Evitar búsquedas repetidas de `comercio.getTiendasCercanas` en `ProductosScreen`

- Problema detectado en `components/productos/ProductosScreen.native.jsx`:
  - La pantalla recalculaba `initialCachedLocation` en cada render y ese valor entraba en las dependencias del `useEffect` de arranque.
  - Como la ubicación actual también actualiza la caché en memoria, ese patrón podía volver a disparar `obtenerUbicacion()` y `buscarTiendasCercanas()` varias veces con coordenadas prácticamente iguales.

- Corrección aplicada:
  - La ubicación cacheada inicial ahora se congela en un `useRef` de arranque en lugar de recalcularse en cada render.
  - Se añadió `radioKmRef` para desacoplar la búsqueda del cambio de identidad de callbacks por radio actual.
  - Se añadió `lastSearchSignatureRef` para no volver a pedir exactamente la misma combinación de:
    - latitud
    - longitud
    - radio

- Criterio funcional validado:
  - Cambiar el radio sí debe forzar una nueva búsqueda.
  - Rehidratar desde caché y luego resolver GPS real puede producir una segunda búsqueda legítima si la ubicación cambió.
  - Lo que se evita es repetir llamadas idénticas por renders/recreaciones de callback y no por una necesidad real del flujo.

- Regla practica:
  - Si una pantalla Expo arranca con caché local y luego refresca GPS, no poner el valor cacheado recalculado inline dentro de dependencias de efectos de bootstrap.
  - Para métodos costosos o sensibles como `comercio.getTiendasCercanas`, conviene deduplicar la misma firma de búsqueda antes de volver a llamar al backend.

  ***

  Resumen técnico – Step 5 del carrito en Expo debe reconstruir el desglose legacy, no reutilizar `totalAPagar` como subtotal
  - Hallazgo validado al contrastar Expo, legacy y backend:
    - El desajuste principal del paso `Pago` no estaba en los métodos Meteor de totales, sino en la UI Expo del wizard.
    - `totalAPagar` ya viene compuesto desde backend y no debe mostrarse como si fuera `Subtotal (productos)`.

  - Contrato real confirmado:
    - `paypal.totalAPagar` y `mercadopago.totalAPagar` hacen:
      - subtotal de productos convertido
      - `+ comisionesComercio.totalFinal`
      - `+ comisión de pasarela`
    - `efectivo.totalAPagar` hace:
      - subtotal de productos convertido
      - `+ comisionesComercio.totalFinal`
      - sin comisión de pasarela

  - Criterio aplicado en Expo (`components/carritoCompras/WizardConStepper.native.jsx`):
    - Se portó la misma lógica visual del legacy para el paso 5:
      - card de comisiones (`renderComisionesCard()`)
      - subtotal de productos convertido a `monedaFinalUI`
      - comisiones convertidas a `monedaFinalUI`
      - comisión PayPal/MercadoPago calculada por diferencia
      - total final usando `totalAPagar`
    - El subtotal de productos se reconstruye desde cada item del carrito usando:
      - `cantidad * cobrarUSD`
      - convertido desde `monedaACobrar` hacia `monedaFinalUI` con `moneda.convertir`
    - Las comisiones se reconstruyen separadas desde:
      - `costoTotalEntrega`
      - suma de `comisionesComercio.comisiones[*].valor`
      - convertidas desde `comisionesComercio.moneda` a `monedaFinalUI`

  - Regla práctica:
    - Si se vuelve a tocar el resumen del paso 5, no usar `totalAPagar` como proxy de subtotal.
    - Para mantener paridad con legacy:
      - `Subtotal (productos)` = suma convertida de items
      - `Comisiones (envío + adicionales)` = suma convertida de comisiones de comercio
      - `Comisión PayPal/MercadoPago` = `totalAPagar - (subtotalProductosConvertido + comisionesConvertidas)`
      - `TOTAL A PAGAR` = `totalAPagar`

  - Lección técnica:
    - Cuando el backend ya entrega un total compuesto, la UI no puede inferir el desglose correcto reutilizando ese mismo número en varias filas.
    - En este wizard, el desglose exacto requiere recomponer en cliente las piezas visuales del resumen aunque el total final ya venga calculado.

  ***

  Resumen técnico – Card de comisiones del paso 5 debe colapsarse por defecto para priorizar productos y total
  - Ajuste UX validado en `components/carritoCompras/WizardConStepper.native.jsx`:
    - La card de costos de envío y comisiones adicionales ya no debe abrirse completa por defecto.
    - En el paso `Pago`, la prioridad visual correcta es:
      - productos del carrito
      - total de comisiones
      - total de la venta
    - El desglose detallado de comisiones queda disponible solo bajo demanda con un toggle explícito.

  - Patrón aplicado:
    - Estado inicial colapsado.
    - Header compacto mostrando:
      - label `Total de comisiones`
      - hint corto (`Incluye envío y cargos adicionales`)
      - chip con `comisionesComercio.totalFinal`
    - Acción secundaria `Ver detalles` / `Ocultar detalles` para expandir o colapsar:
      - costos de envío por tienda
      - subtotal de envío
      - comisiones adicionales

  - Regla práctica:
    - Si una card secundaria compite por altura con el listado principal del checkout, no conviene dejarla expandida por defecto.
    - En este wizard, el usuario debe poder comprender el costo agregado sin perder visibilidad del carrito; el detalle queda como capa opcional, no como carga visual inicial.

---

Resumen técnico – Peek effect y menú contextual con preview de promo en CubaCelCard

- Ajuste aplicado en `components/cubacel/CubaCelCard.native.jsx`:
  - El tap corto del card se mantiene como acción principal para abrir el diálogo de recarga.
  - Se añadió interacción secundaria por `onLongPress` para abrir un menú contextual anclado por coordenadas (`pageX`, `pageY`) usando `Menu` de React Native Paper.

- Patrón visual validado para el peek effect:
  - Se envolvió el card en `Animated.View` y se animaron solo transforms ligeros:
    - `scale`
    - `translateY`
  - Se sumó una capa translúcida (`peekOverlay`) con opacidad animada para reforzar la sensación de “peek” sin alterar el layout interno del card.
  - Este enfoque es más estable que intentar animar propiedades de layout del `Card` de Paper directamente.

- Menú contextual con imagen de promo:
  - El menú muestra una cabecera preview con `ImageBackground` reutilizando la misma fuente visual del card:
    - imagen promo remota si existe y cargó correctamente
    - fallback local del módulo si no existe promo o la imagen falla
  - Se incluyó copy contextual (título, fechas y términos) más acciones operativas como abrir la recarga/detalles.

- Regla práctica importante:
  - Si se necesita un menú verdaderamente contextual sobre un card en React Native Paper, conviene usar `Menu` con `anchor` por coordenadas en vez de forzar un anchor visual fijo dentro del card.
  - Esto evita contaminar la composición principal del módulo con botones extra solo para posicionar el popup.

- Lección técnica:
  - En superficies transaccionales donde el tap principal ya tiene una acción fuerte, la mejor jerarquía es:
    - tap corto -> acción principal
    - long press -> contexto adicional

---

Resumen técnico – Botones de acción en `DialogVenta` deben neutralizar el layout implícito de Paper

- Problema detectado:
  - En `components/ventas/DialogVenta.native.jsx`, la zona inferior de acciones no quedaba consistente entre tamaños de pantalla.
  - La combinación de `Dialog.Actions` con botones usando solo `flex: 1` dejaba anchos inestables y una composición poco fiable, especialmente al entrar en modo compacto.

- Corrección aplicada:
  - Los botones `Eliminar` y `Guardar` ahora usan estilos base compartidos para ocupar correctamente el espacio disponible:
    - `minWidth: 0`
    - `margin: 0`
    - `contentStyle` con altura mínima uniforme
  - `Dialog.Actions` ahora fuerza:
    - `alignItems: 'stretch'`
    - `width: '100%'`
  - En modo compacto se eliminó `column-reverse` y se pasó a `column`, evitando que el orden visual de acciones cambie de forma extraña en móvil.

- Regla práctica:
  - En este proyecto, si `Dialog.Actions` contiene botones que deben repartirse el ancho o apilarse en responsive, no confiar solo en el layout por defecto de React Native Paper.
  - Para acciones primarias/secundarias en diálogos administrativos, conviene definir explícitamente ancho, margen y altura del botón para evitar desalineaciones entre iOS y Android.
  - Así se añade descubribilidad visual y preview de promo sin romper el flujo principal de compra.

Notas adicionales – El peek real no debe resolverse con `Menu` si se espera que las opciones queden debajo del card

- Hallazgo práctico:
  - Un `Menu` de React Native Paper sirve para contexto ligero, pero no reproduce bien la sensación de “acercamiento progresivo del card + opciones debajo”.
  - Cuando la intención UX es parecerse más a un preview nativo, el patrón correcto es un overlay propio con `Portal` + `Animated`, no un popup estándar.

- Patrón final validado en `CubaCelCard.native.jsx`:
  - El card original se mide con `measureInWindow(...)`.
  - Se abre una capa fullscreen en `Portal`.
  - Se renderiza un clon visual del card en posición absoluta.
  - El card flotante anima `scale` y `translateY` para dar sensación de acercamiento gradual.
  - Debajo se revela una bandeja propia (`peekTray`) con preview de promo y acciones.

- Regla práctica:
  - Si el diseño pide que el contenido contextual quede “debajo” del elemento presionado, no usar `Menu` anclado por coordenadas como solución final.
  - Conviene construir una micro-superficie propia con:
    - backdrop suave
    - card flotante
    - action tray debajo
  - Esto da más control visual, mejor jerarquía y una percepción más premium sin depender de librerías terceras.

---

Resumen técnico – Rediseño profesional del diálogo de recarga en CubaCelCard

- Objetivo aplicado:
  - Se mantuvo intacta la lógica del flujo de recarga en `components/cubacel/CubaCelCard.native.jsx`.
  - El cambio se concentró en la UX visual del `Dialog`: mejor presentación para cliente, jerarquía más clara de oferta y un formulario más cómodo al usar teclado.

- Estructura nueva validada:
  - Hero superior con `ImageBackground`, título de la oferta, operador y bloque principal de precio.
  - Cuerpo central scrolleable con tres niveles de lectura:
    - resumen de la oferta
    - beneficios y condiciones/promociones
    - formulario de datos para procesar la recarga
  - Footer fijo con resumen del pago y CTA principal de confirmación.

- Criterio UX aplicado:
  - El usuario debe entender primero qué promoción está comprando antes de ver los campos del formulario.
  - Las promociones Cubacel se presentaron como oferta comercial, no como formulario técnico desnudo.
  - El CTA de confirmación quedó al final con un bloque previo de “Pago estimado” para reforzar claridad comercial antes de enviar.

- Manejo de teclado y scroll:
  - Se añadió `KeyboardAvoidingView` dentro del diálogo.
  - El contenido informativo y el formulario se movieron a un único `ScrollView` dentro de `Dialog.ScrollArea`, en lugar de dejar el formulario fuera del área scrolleable.
  - El alto máximo del cuerpo se adapta con base en `windowHeight` y `keyboardHeight`, reduciendo el riesgo de que inputs queden ocultos al escribir.
  - `keyboardDismissMode` quedó configurado por plataforma para una sensación más natural al arrastrar.

- Regla práctica:
  - Si un diálogo transaccional mezcla información comercial y captura de datos, no conviene abrir directamente con inputs; primero hay que establecer contexto visual de la compra.
  - Cuando existe teclado, el formulario debe vivir dentro del área realmente scrolleable; dejar inputs fijos fuera del scroll suele degradar la UX en pantallas medianas o pequeñas.

---

Resumen técnico – La recarga Cubacel pasó de dialog embebido a pantalla dedicada

- Cambio arquitectónico aplicado:
  - El flujo de detalle y captura de datos para recargas Cubacel ya no vive dentro de `CubaCelCard.native.jsx` como `Dialog` local.
  - Ahora el card y el peek navegan a una pantalla dedicada del grupo normal:
    - `app/(normal)/CubacelOferta.tsx`
    - `components/cubacel/CubacelOfertaScreen.native.jsx`

- Motivo UX validado:
  - El contenido de una oferta Cubacel ya tenía suficiente peso visual y operativo como para dejar de sentirse bien dentro de un modal.
  - En una pantalla completa hay más espacio para:
    - explicar la oferta con jerarquía comercial
    - capturar datos con teclado sin compresión visual excesiva
    - mantener un footer de acción más claro y estable

- Ajuste importante de contenido:
  - Se eliminó la duplicación visual entre “Resumen de la oferta” y “Promociones y condiciones”.
  - La oferta principal ahora se presenta solo una vez en el bloque resumen con el diseño fuerte.
  - Las promociones restantes, si existen, se muestran como “Promociones adicionales”, evitando repetir la misma información principal en dos secciones distintas.

- Regla práctica:
  - Si un card de catálogo necesita mostrar contexto comercial + formulario + CTA principal, suele ser mejor migrarlo a pantalla dedicada antes que seguir ampliando un `Dialog`.
  - Cuando hay una promoción principal clara, mostrarla una vez con diseño dominante y relegar el resto a secciones secundarias evita fatiga visual y duplicación de contenido.

---

Resumen técnico – GlassView dentro de `Menu` puede no renderizar el efecto en la primera apertura

- Problema detectado:
  - En `MenuIconMensajes.native.js` y en el menú de perfil de `MenuHeader.jsx`, el `GlassView` no aparecía correctamente la primera vez que se abría el `Menu` tras lanzar la app.
  - Al cerrar y volver a abrir, el efecto sí se veía, lo que apuntaba a un problema de montaje inicial y no de estilos permanentes.

- Causa raíz probable:
  - `react-native-paper` monta `Menu` de forma perezosa en un portal.
  - `expo-glass-effect` puede entrar “frío” cuando su primera instancia visible nace dentro de ese portal y del layout calculado del popup.
  - En ese escenario, la primera apertura puede resolver el contenido pero no el efecto glass real hasta el siguiente montaje.

- Solución aplicada:
  - Se creó `components/shared/GlassMenuSurface.jsx` como wrapper reutilizable.
  - Ese componente hace un prewarm del `GlassView` con una instancia mínima e invisible montada desde el inicio y luego renderiza la superficie visible real para el menú.
  - Ambos menús pasaron a usar ese wrapper en lugar de montar `GlassView` directamente como hijo del `Menu`.

- Ajustes complementarios:
  - `contentStyle` del `Menu` se dejó con `backgroundColor: 'transparent'`, `padding: 0` y `overflow: 'visible'` para no interferir con la superficie visual interna.
  - Se evitó seguir maquillando Android con un fondo semitransparente de fallback dentro del `Menu` si el objetivo real es que el glass nativo aparezca desde la primera apertura.

- Regla práctica:
  - Si un efecto visual nativo complejo se usa dentro de un popup portalizado (`Menu`, `Modal`, `Popover`), no asumir que la primera instancia visible montada “en frío” será estable.
  - Para superficies premium repetidas en menús, conviene encapsular el efecto en un wrapper reutilizable con prewarm o montaje previo controlado.

---

Resumen técnico – `build:version:get` necesita dependencias instaladas si la app config usa plugins locales

- Problema detectado:
  - Los jobs de workflow que resolvían el patch de versión remota seguían fallando aunque ya usaban `npx --yes eas-cli ...`.
  - El error real pasó a ser:
    - `Failed to read the app config from the project using "npx expo config"`
    - `Failed to resolve plugin for module "expo-router" relative to "/home/expo/workingdir/build"`

- Causa raíz validada:
  - `eas-cli build:version:get` intenta evaluar la app config del proyecto.
  - Si el job custom solo hace `eas/checkout` pero no instala `node_modules`, Expo no puede resolver plugins declarados en `app.json` o `app.config.js`, por ejemplo `expo-router`.

- Solución aplicada:
  - En los jobs:
    - `resolve_android_version`
    - `resolve_ios_version`
  - Se añadió `- uses: eas/install_node_modules` inmediatamente después de `eas/checkout`.

- Regla práctica:
  - Si un custom job de EAS ejecuta una CLI que termina evaluando `app.json` o `app.config.js`, asumir que necesita dependencias instaladas salvo que la config no use ningún plugin o import local.
  - `eas/checkout` por sí solo no basta cuando la resolución de config depende de paquetes del proyecto.

---

Resumen técnico – Migración completa del Dashboard legacy a Expo

- Alcance aplicado:
  - `app/(normal)/Dashboard.tsx` dejó de usar `ScreenFallback` y ahora apunta a una pantalla real del módulo.
  - Se creó `components/dashboard/DashboardScreen.native.jsx` como superficie completa del dashboard en Expo.
  - Se creó `components/dashboard/DashBoardPrincipal.native.jsx` como bloque reutilizable por período, manteniendo el patrón visual del legacy donde la ruta monta tres secciones consecutivas:
    - `HORA`
    - `DIARIO`
    - `MENSUAL`
  - También quedaron implementados los auxiliares reales del módulo en Expo:
    - `KPICard.jsx`
    - `CustomSegmentedButtons.jsx`
    - `ChartSkeleton.jsx`
    - `styles/dashboardStyles.js`
    - `utils/formatUtils.js`

- Extracción de datos validada:
  - El consumo NO sale de una publicación reactiva; el dashboard lo obtiene mediante `Meteor.call('getDatosDashboardByUser', tipo, null, ...)`.
  - Ese método backend agrega registros de `RegisterDataUsersCollection` por rango temporal y separa:
    - `type === 'proxy'` usando `megasGastadosinBytes`
    - `type === 'vpn'` usando `vpnMbGastados`
  - El resultado se convierte a GB dividiendo por `1024000000` y devuelve arrays con shape:
    - `{ name, PROXY, VPN }`
  - Las métricas de ventas siguen otro contrato distinto:
    - suscripción reactiva a `ventas`
    - suscripción a `user`
    - lectura de `VentasCollection`
    - enriquecimiento de nombres de admin desde `Meteor.users`

- Decisiones técnicas importantes en Expo:
  - Se mantuvo la convención local del proyecto: `Meteor.useTracker(...)` en vez de importar `useTracker` por separado.
  - La pantalla usa `react-native-chart-kit` + `react-native-svg` para preservar el mismo tipo de visualización del legacy sin reinventar las gráficas.
  - Se sustituyeron dependencias del legacy por equivalentes del stack Expo actual:
    - `react-native-linear-gradient` -> `expo-linear-gradient`
    - `react-native-vector-icons` -> `@expo/vector-icons/MaterialCommunityIcons`
  - La ruta completa quedó bajo `AppHeader` y `SafeAreaView`, no como placeholder aislado.

- Reglas funcionales preservadas del legacy:
  - Cada bloque detecta automáticamente el tipo de período a partir de las etiquetas devueltas por el método (`HORA`, `DIA`, `MES`).
  - La pestaña `Ventas` solo aparece cuando:
    - el período no es horario
    - el usuario actual es `carlosmbinf`
  - El bloque diario de ventas muestra resumen del mes actual por admin.
  - El bloque mensual de ventas muestra 12 meses + histórico total.

- Regla práctica para próximos desarrolladores:
  - Si se toca esta pantalla, no mezclar los dos contratos de datos del dashboard; consumo y ventas vienen de orígenes distintos y no deben unificarse artificialmente en una sola consulta.
  - Si se quiere migrar más vistas analíticas del sistema, primero contrastar si el legacy usa `Meteor.call(...)` o colecciones reactivas; en este módulo usa ambas estrategias en paralelo.

---

Resumen técnico – Fallo de archive iOS por provisioning profile sin Push Notifications

- Problema detectado:
  - El archive de iOS falló en Fastlane/Xcode con errores explícitos de firma:
    - `Provisioning profile ... doesn't support the Push Notifications capability`
    - `Provisioning profile ... doesn't include the aps-environment entitlement`

- Causa raíz validada:
  - El proyecto Expo sí está incluyendo capacidad/entitlement de push en iOS, lo cual es consistente con el stack actual:
    - `expo-notifications`
    - `@react-native-firebase/messaging`
    - código real de registro/uso de push en `services/notifications/PushMessaging.native.ts`
  - Por tanto, el problema no está en que falte declarar push en JavaScript, sino en que el provisioning profile usado para `com.vidkar` fue generado sin la capability Push Notifications habilitada en Apple Developer.

- Decisión técnica importante:
  - No conviene “arreglar” este fallo quitando librerías o desactivando entitlements en la app si la app realmente usa push en iOS.
  - La corrección correcta es regenerar credenciales/perfil con Push Notifications habilitado para el App ID, no degradar la app para que firme sin push.

- Acción operativa requerida fuera del repo:
  - Verificar en Apple Developer que el App ID `com.vidkar` tenga habilitada la capability `Push Notifications`.
  - Regenerar el provisioning profile App Store asociado después de habilitar esa capability.
  - Si se usa Expo/EAS managed credentials, refrescar las credenciales iOS con `eas credentials` o disparar un build tras corregir la capability para que EAS regenere el perfil correcto.
  - Si las push credentials/APNs key están vencidas o ausentes, renovarlas también desde el flujo de credenciales iOS.

- Regla práctica:
  - Si Xcode reporta específicamente ausencia de `aps-environment` en el provisioning profile, priorizar revisión de Apple Developer / provisioning profile antes de tocar código de la app.
  - Cuando un proyecto ya usa push real, un error de signing por capability faltante casi siempre es de credenciales/perfil, no de React Native/Expo runtime.

---

Resumen técnico – Fondo de respaldo compartido para menús con GlassView

- Ajuste visual aplicado:
  - `components/shared/GlassMenuSurface.jsx` ahora renderiza un fondo de respaldo permanente por detrás del `GlassView`.
  - El fallback ya no usa un color fijo: toma el mismo `tintColor` que recibe el glass, para que la base visual del popup coincida con el tinte real del efecto.
  - Se definieron tintes compartidos para menú:
    - claro: `#f5f7ffcc`
    - oscuro: `#5a58c559`
  - `MenuIconMensajes.native.js` y `MenuHeader.jsx` resuelven el tinte según `theme.dark` y lo pasan a `GlassMenuSurface`.

- Motivo técnico:
  - En este proyecto ya se había detectado que `expo-glass-effect` puede no pintar correctamente en la primera apertura de superficies portalizadas como `Menu`.
  - Aunque el prewarm mejora el caso principal, conviene que los popups tengan una base visual sólida aunque el glass no llegue a materializarse por completo.
  - Si además existe modo claro y oscuro, esa base no debe quedarse congelada en un solo fondo porque rompe la coherencia del popup respecto al `tintColor` real del glass.

- Regla práctica:
  - Si un menú usa `GlassMenuSurface`, el fondo semitransparente base debe vivir en ese wrapper compartido y no repetirse manualmente en cada menú.
  - El fallback del popup debe derivarse del mismo `tintColor` que usa `GlassView`; no conviene mantener un fondo hardcodeado independiente del tema.
  - Si se ajusta la identidad visual de estos popups en el futuro, hacerlo primero en `GlassMenuSurface.jsx` y en las constantes de tinte compartidas para mantener consistencia entre menú de mensajes, menú de perfil y futuras superficies similares.

---

Resumen técnico – Error de componente `undefined` por mezcla de default export y named import

- Problema detectado:
  - `MenuIconMensajes.native.js` y `MenuHeader.jsx` importaban `GlassMenuSurface` como named import.
  - `components/shared/GlassMenuSurface.jsx` solo lo exportaba por default, por lo que React terminaba recibiendo `undefined` al renderizar el menú.

- Síntoma visible:
  - Error runtime:
    - `Element type is invalid ... but got: undefined`
  - El stack apuntaba a `MenuIconMensajesNative`, aunque la causa real estaba en el contrato de export/import del wrapper compartido.

- Solución aplicada:
  - `GlassMenuSurface.jsx` ahora exporta el componente también como named export:
    - `export const GlassMenuSurface = ...`
  - Se mantuvo además el `export default GlassMenuSurface` para compatibilidad hacia atrás.

- Regla práctica:
  - Si un componente compartido empieza a consumirse con imports nombrados en varios archivos, conviene alinear explícitamente su archivo fuente en lugar de confiar en que todos los consumidores usarán siempre el default export.
  - Cuando React reporta `Element type is invalid`, revisar primero si el componente llega `undefined` por mezcla de:
    - `import Foo from ...`
    - `import { Foo } from ...`

---

Resumen técnico – Apple Sign-In en Expo alineado con el contrato legacy de Meteor

- Objetivo aplicado:
  - Se activó el inicio de sesión con Apple en `components/loguin/Loguin.native.js` usando el stack oficial de Expo en lugar de portar la librería nativa legacy.
  - La integración conserva el contrato de backend existente del proyecto legacy con Meteor y su fallback específico.

- Dependencia y configuración nativa aplicadas:
  - Se instaló `expo-apple-authentication` con versión compatible del SDK actual.
  - `app.json` quedó configurado con:
    - `expo.ios.usesAppleSignIn = true`
    - plugin `expo-apple-authentication`
    - `CFBundleAllowMixedLocalizations = true`
  - Esto permite que EAS/prebuild inyecte la capability correcta y que el botón oficial respete la localización del dispositivo.

- Flujo funcional implementado en Expo:
  - Se valida disponibilidad con `AppleAuthentication.isAvailableAsync()` antes de exponer el botón.
  - El botón visible en login ahora es el oficial de Apple (`AppleAuthenticationButton`), no un botón custom de Paper, para respetar la guía de Apple.
  - Al presionar:
    1. `AppleAuthentication.signInAsync(...)`
    2. `AppleAuthentication.getCredentialStateAsync(user)`
    3. intento de login estándar con `Meteor.call('login', { appleSignIn: true, ... })`
    4. si falla, fallback a `Meteor.call('auth.appleSignIn', appleAuthData)`
    5. si el fallback devuelve token y todavía no existe sesión local, se completa con `Meteor.loginWithToken(...)`
    6. tras éxito se vuelve a registrar el token push del usuario activo

- Payloads preservados:
  - Login estándar:
    - `appleSignIn: true`
    - `accessToken`
    - `authorizationCode`
    - `idToken`
    - `identityToken`
    - `email`
    - `user`
    - `userId`
    - `fullName`
    - `realUserStatus`
  - Fallback `auth.appleSignIn`:
    - `authorizationCode`
    - `identityToken`
    - `email`
    - `user`
    - `fullName`
    - `realUserStatus`

- Consideraciones técnicas importantes:
  - Apple solo entrega `email` y `fullName` de forma confiable en el primer login del usuario; el cliente debe tolerar `null` en logins posteriores.
  - La verificación de `credentialState === AUTHORIZED` conviene hacerla antes de tocar Meteor para cortar respuestas inválidas desde el origen.
  - El flujo legacy tenía varias ramas históricas para Apple; en Expo conviene priorizar primero el login estándar tipo Google y dejar `auth.appleSignIn` como fallback real del backend.
  - Si el botón no aparece en iOS aunque la property `LOGIN_WITH_APPLE` esté activa, revisar primero disponibilidad del dispositivo y que el binario haya sido recompilado con la capability habilitada.

- Regla práctica para próximos desarrolladores:
  - Si se modifica Apple login en Expo, la fuente de verdad ya no es `@invertase/react-native-apple-authentication`; ahora el cliente usa `expo-apple-authentication`.
  - Si se cambia el contrato backend de Apple, actualizar en paralelo las dos ramas del cliente:
    - login estándar `Meteor.call('login', ...)`
    - fallback `Meteor.call('auth.appleSignIn', ...)`
  - No reemplazar el botón oficial por un botón custom si la intención es publicar en App Store.

Notas adicionales – Botón visual de Apple unificado con Google por criterio UX local

- Ajuste aplicado posteriormente:
  - En `components/loguin/Loguin.native.js` el disparador visual de Apple dejó de usar `AppleAuthenticationButton` y pasó a reutilizar `Button` de React Native Paper con el mismo patrón que Google:
    - `mode="outlined"`
    - `icon="apple"`
    - texto `Entrar con Apple`
    - `loading` y `disabled` equivalentes

- Criterio específico de este proyecto:
  - Aunque Apple recomienda su botón oficial para guideline de App Store, en este workspace se pidió igualar visualmente Google y Apple dentro del login.
  - El flujo nativo sigue resolviéndose con `expo-apple-authentication`; solo cambió la superficie visual que dispara `onAppleLogin`.

- Regla práctica:
  - Si más adelante se prioriza cumplimiento estricto de guideline visual para revisión de App Store, el cambio a revertir está únicamente en el render del botón; la lógica nativa de autenticación ya queda separada y no depende del componente visual.

---

Resumen técnico – Control de tamaño de subtítulos en el player móvil de películas

- Alcance aplicado:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` ahora permite agrandar o achicar los subtítulos desde la propia UI del reproductor.
  - La selección quedó expuesta en los dos puntos donde el usuario ya gestionaba subtítulos:
    - diálogo normal de subtítulos
    - sheet fullscreen de subtítulos

- Decisión técnica importante:
  - No se cambió backend HLS ni el contrato de subtítulos externos.
  - La solución se implementó del lado del player VLC reutilizando `initOptions` de `react-native-vlc-media-player`.
  - Se confirmo previamente que tanto Android como iOS reciben esos `initOptions` en los nativos del wrapper.

- Implementación aplicada:
  - Se añadieron presets internos de tamaño:
    - `sm`
    - `md`
    - `lg`
  - El `vlcSource` ahora inyecta opciones VLC para el subtítulo:
    - `--freetype-rel-fontsize=...`
    - `--sub-text-scale=...`
  - Al cambiar el tamaño, el player reinicia la sesión HLS/VLC manteniendo la posición actual del playback para que el ajuste se vea de inmediato sin perder el punto de reproducción.
  - La `key` del `VLCPlayer` también incluye `subtitleSizeId` para forzar reconfiguración limpia cuando el tamaño cambia.

- Criterio UX validado:
  - El usuario no debe salir del reproductor ni tocar settings globales del dispositivo para ajustar subtítulos.
  - El control correcto vive junto al selector de pista, porque ambos pertenecen a la experiencia de subtítulos de la película actual.

- Regla práctica:
  - Si luego se quieren ajustar mejor los tamaños visibles, tocar primero los presets de `SUBTITLE_SIZE_OPTIONS` antes de parchear el wrapper VLC.
  - Si en algún dispositivo el cambio de tamaño no surte efecto suficiente, la siguiente vía correcta es un parche reproducible sobre `react-native-vlc-media-player`, reutilizando la infraestructura ya existente del proyecto para patches en `node_modules`.
  - No mover esta lógica al backend ni al flujo HLS: el tamaño de subtítulos es una responsabilidad local del player móvil.

---

Resumen técnico – Rediseño interno de CubaCelCard cuando no hay promoción activa

- Objetivo aplicado:
  - Se mejoró la UX del card de Cubacel específicamente para el estado sin promo.
  - No se tocaron las dimensiones del componente:
    - ancho `280`
    - alto `150`
  - El cambio se concentró solo en la composición interna del contenido.

- Ajuste visual implementado:
  - Se reemplazó el layout plano anterior por una jerarquía más comercial y legible:
    - tag superior `Recarga directa`
    - badge de disponibilidad `Disponible 24/7`
    - bloque principal con icono, operador y subtítulo
    - panel compacto de beneficios con máximo de dos líneas útiles
    - bloque inferior de precios con USD dominante y monedas secundarias en pills laterales
  - Se añadió un overlay oscuro específico para el estado sin promo para mejorar contraste sobre el fondo fallback sin alterar el tamaño del card.

- Regla práctica:
  - Cuando una card de catálogo no tiene promoción activa, no conviene dejarla solo como una variante “vacía” del layout promocional.
  - Debe comunicar claramente que sigue siendo una oferta comprable y disponible, con jerarquía visual propia.
  - Si el espacio es fijo y pequeño, priorizar:
    - disponibilidad
    - operador
    - resumen corto de beneficios
    - precio principal
  - En este módulo, si se vuelve a tocar el estado sin promo, preservar primero la densidad visual lograda antes de intentar agregar más texto o más acciones.

---

Resumen técnico – Chip de precio en CubaCelCard sin promoción debe resolverse como franja compacta

- Problema detectado:
  - En el estado sin promoción de `components/cubacel/CubaCelCard.native.jsx`, el bloque inferior de precios usaba una tarjeta principal demasiado alta y una columna secundaria muy apretada.
  - Eso hacía que el último chip de moneda secundaria se percibiera cortado o visualmente ahogado dentro del alto fijo del card.

- Ajuste aplicado:
  - El bloque inferior pasó a una composición más compacta:
    - chip principal tipo pill para el precio USD
    - columna secundaria más estrecha con pills compactas para CUP/UYU
    - alturas y paddings reducidos para que los tres valores respiren dentro del alto fijo del card
  - Se mantuvo la jerarquía comercial, pero el cierre visual ahora se comporta como una franja de precios y no como una mini-card pesada dentro de otra card.

- Regla práctica:
  - En cards pequeñas de catálogo, si el contenedor tiene altura fija, los bloques de precio deben diseñarse como pills compactas y no como subcards voluminosas.
  - Cuando existen varias monedas, conviene dar protagonismo a la principal y comprimir las secundarias con tipografía más apretada antes que aumentar altura o forzar overflow.

---

Resumen técnico – Soporte de `ws://` en producción para Meteor

- Problema operativo:
  - El servidor Meteor de este proyecto no expone `wss://`, por lo que el cliente productivo debe poder conectarse por `ws://` en texto plano.
  - No basta con tener `extra.meteorUrl = ws://...`; iOS y Android pueden bloquear tráfico inseguro a nivel nativo aunque la URL del cliente sea correcta.

- Ajustes aplicados:
  - `app.json` mantiene `extra.meteorUrl = ws://38sljhvg-3000.brs.devtunnels.ms/websocket` como origen explícito para Meteor.
  - En `expo-build-properties` se añadió:
    - `android.usesCleartextTraffic = true`
  - En `ios.infoPlist` se agregó `NSAppTransportSecurity` con excepción para `www.vidkar.com` permitiendo cargas inseguras y subdominios.
  - `services/meteor/client.js` quedó alineado usando `DEFAULT_METEOR_URL` como fallback real, evitando una constante sin uso y dejando más claro que el fallback esperado es `ws://`.

- Validación realizada:
  - `npx expo config --json` resolvió correctamente la configuración final del proyecto con estas excepciones nativas presentes.

- Regla práctica:
  - Si el backend Meteor sigue dependiendo de `ws://`, cualquier build nuevo debe conservar tanto la URL `ws://` como las excepciones nativas de red; cambiar solo la URL no basta.
  - Este tipo de ajuste requiere recompilar el binario nativo. Reiniciar Metro no aplica cambios de ATS ni de manifest Android al build ya instalado.

---

Resumen técnico – Compactación de user cards para mejorar el zoom del peek

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` redujo la huella visual del card sin cambiar su lógica.
  - La intención fue dejar más margen perceptual para que el efecto de zoom del peek se sienta más claro y menos pesado.

- Cambios visuales aplicados:
  - avatar base más pequeño
  - menor `padding` interno del card
  - menores `gap` entre bloques
  - tipografías ligeramente más compactas en título, username y pills
  - chevron lateral más pequeño
  - menor separación vertical entre cards

- Regla práctica:
  - Si un efecto de zoom o elevación necesita sentirse más evidente, muchas veces conviene reducir primero el tamaño base de la card antes que exagerar la escala del overlay.
  - En este módulo, el peek funciona mejor cuando el card original tiene menos densidad vertical y deja más aire visual alrededor.

Notas adicionales – Más margen horizontal para cards dentro de secciones de usuarios

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` ahora agrega `paddingHorizontal` en `sectionContent` para que los cards queden más separados de los bordes del bloque de sección.

- Criterio técnico:
  - El margen lateral se aplicó al contenedor de la sección y no al `itemCard` compartido.
  - Así el inset afecta solo a la lista visible de usuarios y no altera la geometría del card reutilizado por el overlay del peek.

- Regla práctica:
  - Si se quiere dar más aire lateral a los cards de una lista que también se reutilizan en overlays o previews, preferir ajustar el contenedor de la lista antes que el estilo base del card.

---

Resumen técnico – Error iOS de RNFirebase por `non-modular header` con `useFrameworks: static`

- Problema detectado:
  - El build iOS en EAS/Xcode falló dentro del paso `Run fastlane` con errores como:
    - `include of non-modular header inside framework module 'RNFBApp...'`
  - Los headers señalados pertenecían a React Native (`RCTConvert.h`, `RCTBridgeModule.h`, `RCTEventEmitter.h`) y el módulo que explotaba era `RNFBApp`.

- Causa raíz validada:
  - El proyecto necesita `ios.useFrameworks = "static"` para resolver la integración base de Firebase en Expo managed.
  - Pero con esa configuración, RNFirebase puede compilar como framework estático y Xcode endurece el chequeo de headers no modulares dentro de los Pods.
  - Poner `ios.buildSettings` en `app.json` no es la vía fiable para tocar los targets de Pods; el ajuste debe entrar en el `post_install` del Podfile generado por prebuild.

- Solución aplicada:
  - Se creó el plugin local:
    - `plugins/with-rnfirebase-non-modular-ios.js`
  - Ese plugin usa `withPodfile` y agrega dentro de `post_install do |installer|` el patch:
    - `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
    - aplicado sobre `installer.pods_project.targets`
  - `app.json` ahora registra explícitamente ese plugin local además de `expo-build-properties`.
  - Se eliminó el intento de resolverlo con `ios.buildSettings` directo en `app.json`.

- Validación realizada:
  - `npx expo config --json` resolvió correctamente el plugin local y la configuración final del proyecto.
  - El editor puede seguir mostrar un warning tipo `Plugin not found` sobre la ruta local del plugin en `app.json`, pero si `expo config` lo resuelve, el dato importante es el resultado del CLI, no el warning estático del schema.

- Regla práctica:
  - Si un error de CocoaPods/Xcode afecta targets dentro de `Pods`, la solución rara vez vive en `infoPlist` o en build settings superficiales del app target; normalmente hay que parchear `Podfile` o `post_install`.
  - En Expo managed, ese tipo de parche debe entrar por config plugin local, no editando un `ios/Podfile` inexistente en el repo.

---

Resumen técnico – Background Modes iOS en Expo para `fetch` y `remote-notification`

- Verificación realizada:
  - El proyecto ya tenía `expo-notifications` instalado y declarado en `app.json`, pero no estaba configurado para habilitar background remote notifications en iOS.
  - Tampoco existía `UIBackgroundModes` dentro de `expo.ios.infoPlist`, así que la capability `Background Modes` aún no estaba expresada completamente desde Expo config.

- Configuración aplicada en Expo:
  - `expo.ios.infoPlist.UIBackgroundModes = ["fetch", "remote-notification"]`
  - `expo-notifications` puede habilitar `remote-notification` vía plugin, pero en este proyecto se dejó explícito directamente en `infoPlist` para que la capability quede visible y declarada en una sola fuente de verdad dentro de `app.json`.

- Criterio técnico validado con la documentación de Expo:
  - Expo soporta ambas estrategias para `remote-notification` en proyectos con CNG: vía plugin de `expo-notifications` o declarando `UIBackgroundModes` manualmente.
  - Para `Background fetch`, no hay un flag equivalente en `expo-notifications`; debe declararse manualmente en `ios.infoPlist.UIBackgroundModes`.
  - Si se deja `remote-notification` ya explícito en `infoPlist`, no hace falta mantener además `enableBackgroundRemoteNotifications` como segunda fuente de configuración.

- Resultado esperado en iOS:
  - La app queda preparada para que el target generado incluya `UIBackgroundModes` con ambos valores efectivos ya declarados desde config:
    - `fetch`
    - `remote-notification`
  - Esto cubre la capability visible en Xcode como `Background Modes` con los submodos `Background fetch` y `Remote notifications`.

- Regla práctica:
  - Si el proyecto usa Continuous Native Generation / EAS Build, no conviene activar estas opciones manualmente en Xcode y dejarlas fuera del repo.
  - La fuente de verdad debe quedar en `app.json` para que cualquier prebuild o build limpio regenere la misma capability.

- Nota operativa:
  - Este cambio requiere recompilar iOS (`npx expo run:ios`, prebuild o EAS Build) para que el Info.plist nativo generado refleje la capability nueva.

---

Resumen técnico – Capability de Push Notifications iOS ya inyectada por Expo

- Verificación realizada:
  - Se inspeccionó la salida nativa resultante con `npx expo config --type introspect --json`.
  - La introspección confirmó que iOS queda con:
    - `ios.infoPlist.UIBackgroundModes = ["fetch", "remote-notification"]`
    - `ios.entitlements["aps-environment"] = "development"`

- Conclusión técnica:
  - La capability de `Push Notifications` sí queda aplicada por la configuración actual del proyecto Expo.
  - No hizo falta agregar `ios.entitlements` manualmente en `app.json`, porque `expo-notifications` ya está inyectando la entitlement APNs requerida.
  - En builds release/archive, Xcode cambia ese entitlement de `development` a `production` durante el proceso de firmado, según el flujo documentado por Expo.

- Regla práctica:
  - Para verificar capabilities reales en Expo no basta con mirar solo `app.json`; conviene usar `npx expo config --type introspect --json` para ver el resultado nativo final de `infoPlist` y `entitlements`.
  - Si falta `aps-environment` en un archive iOS aun cuando la introspección lo muestra, el problema normalmente ya no está en `app.json`, sino en Apple Developer, certificados o provisioning profiles.

---

Resumen técnico – Eliminación de RNFirebase Messaging y estandarización en `expo-notifications`

- Decisión arquitectónica aplicada:
  - Se retiró la dependencia funcional de `@react-native-firebase/app` y `@react-native-firebase/messaging` del proyecto Expo.
  - El sistema push del cliente quedó centralizado en `expo-notifications` para reducir fragilidad nativa en iOS y eliminar el mantenimiento de parches manuales sobre RNFirebase.

- Limpieza técnica realizada:
  - `services/notifications/PushMessaging.native.ts` se reescribió para dejar de usar:
    - imports de RNFirebase
    - carga dinámica de `@react-native-firebase/messaging`
    - checks de `RNFBAppModule`
    - listeners `onMessage`, `onTokenRefresh`, `onNotificationOpenedApp`, `getInitialNotification` de RNFirebase
  - `app.json` dejó de registrar:
    - `./plugins/with-rnfirebase-non-modular-ios.js`
    - `./node_modules/@react-native-firebase/app/app.plugin.js`
    - `./node_modules/@react-native-firebase/messaging/app.plugin.js`
  - `package.json` dejó de ejecutar el postinstall `scripts/patch-rnfirebase-ios.js`.
  - Se eliminaron los archivos ya obsoletos:
    - `plugins/with-rnfirebase-non-modular-ios.js`
    - `scripts/patch-rnfirebase-ios.js`
  - Se desinstalaron `@react-native-firebase/app` y `@react-native-firebase/messaging` del proyecto.

- Nuevo contrato del servicio push en Expo:
  - Permisos, badge, listeners de foreground y apertura de notificación quedan bajo `expo-notifications`.
  - Registro de token nativo ahora usa `Notifications.getDevicePushTokenAsync()`.
  - Refresh de token usa `Notifications.addPushTokenListener(...)`.
  - Recepción en foreground usa `Notifications.addNotificationReceivedListener(...)`.
  - Apertura desde system tray usa `Notifications.addNotificationResponseReceivedListener(...)` y `Notifications.getLastNotificationResponseAsync()`.

- Consideración técnica crítica:
  - `getDevicePushTokenAsync()` devuelve token nativo por plataforma:
    - Android: normalmente FCM
    - iOS: normalmente APNs
  - Si el backend Meteor asume que todos los tokens son FCM, habrá que revisar `push.registerToken` y el pipeline de envío para aceptar correctamente APNs en iOS o migrar el backend al servicio Expo Push si se desea unificar proveedor.
  - Este cambio limpia el cliente, pero no convierte automáticamente el backend a Expo Push Service.

- Regla práctica para próximos desarrolladores:
  - Si el objetivo prioritario es estabilidad de builds Expo/iOS, no reintroducir RNFirebase Messaging salvo que exista una necesidad funcional muy concreta que `expo-notifications` no cubra.
  - Antes de volver a meter parches de Podfile o `node_modules`, validar primero si el caso realmente requiere RNFirebase o si puede resolverse dentro del stack oficial de Expo.
  - Si tras este cambio las push llegan en Android pero no en iOS, revisar primero el tipo de token almacenado y el proveedor real que usa el backend para enviar, antes de tocar otra vez el cliente.

---

Resumen técnico – Registro diferenciado de token push en Expo: Android nativo, iOS Expo Push

- Objetivo aplicado:
  - Mantener Android con el flujo actual basado en token nativo FCM.
  - Registrar iOS con `ExpoPushToken` para que el backend pueda entregar por Expo Push API en lugar de tratar iOS como FCM/APNs directo.

- Archivo ajustado:
  - `services/notifications/PushMessaging.native.ts`

- Cambio de criterio en cliente:
  - `registerPushTokenForUser()` y `registerPushTokenForActiveSession()` ya no leen siempre `Notifications.getDevicePushTokenAsync()`.
  - Ahora resuelven el token según plataforma:
    - Android -> `Notifications.getDevicePushTokenAsync()`
    - iOS -> `Notifications.getExpoPushTokenAsync({ projectId })`

- Fuente de `projectId` validada:
  - El token Expo de iOS se resuelve usando `extra.eas.projectId` del app config.
  - El helper consulta en orden fuentes compatibles de `Constants` para no depender de una sola variante del manifest.

- Ajuste adicional importante:
  - `buildPlatformString()` ahora deja explícito el proveedor esperado dentro del string persistido, por ejemplo:
    - `android_fcm_...`
    - `ios_expo_...`
  - Esto ayuda al backend a distinguir transportes sin romper compatibilidad con el campo `platform` existente.

- Listener de refresh:
  - El `addPushTokenListener(...)` de `expo-notifications` no debe asumirse como token final para iOS cuando el backend necesita Expo Push.
  - Por eso, en iOS el refresh recalcula el token de registro final con `getExpoPushTokenAsync(...)` antes de volver a llamar `push.registerToken`.

- Regla práctica:
  - Si iOS debe entregar por Expo Push, no registrar APNs/device token en Meteor como si fuera el token final de transporte.
  - Si Android ya funciona por FCM, no forzar Expo Push también en Android salvo que exista una decisión backend explícita para unificar proveedor.

---

Resumen técnico – AppHeader con BlurView como efecto base y eliminación de GlassView en header

- Ajuste aplicado:
  - `components/Header/AppHeader.jsx` dejó de depender de una superficie visual externa para el efecto del header.
  - El blur ahora vive en el propio `AppHeader` usando `BlurView` de `expo-blur` como capa absoluta de fondo.
  - `components/Header/MenuHeader.jsx` eliminó el `GlassView` que estaba superpuesto dentro de `actionsRow`.

- Implementación técnica validada:
  - El patrón estable para header fue:
    - contenedor relativo (`headerFrame`)
    - `BlurView` absoluto
    - overlay de color translúcido derivado del `backgroundColor`
    - `Appbar.Header` transparente por encima
  - En Android se activó `experimentalBlurMethod="dimezisBlurView"` para asegurar compatibilidad real del blur.
  - El `backgroundColor` visible del header ya no debe aplicarse directamente al `Appbar.Header`, porque eso tapa el blur; debe pasar por una capa overlay separada.

- Regla práctica:
  - Si un header debe tener efecto premium compatible con Android e iOS, preferir `BlurView` sobre `GlassView` en esta base Expo.
  - No volver a montar `GlassView` dentro de `MenuHeader` o de las acciones del toolbar si el objetivo es el fondo del header completo.
  - Cuando se quiera mantener identidad cromática del header, mezclar blur + overlay translúcido es más estable que usar solo un color opaco o solo el blur crudo.

---

Resumen técnico – `DialogVenta` en Expo debe usar `Dialog` de React Native Paper, no `Modal`

- Problema detectado:
  - El detalle de ventas se había migrado a `Portal + Modal`, pero en iOS el comportamiento visual y de apertura no estaba quedando estable.
  - Para este flujo administrativo no hacía falta un contenedor fullscreen custom; la superficie correcta ya existía en el legacy: `Dialog` de React Native Paper.

- Corrección aplicada:
  - `components/ventas/DialogVenta.native.jsx` dejó de usar `Modal` y volvió a `Dialog` dentro de `Portal`.
  - Se mantuvo la lógica ya migrada y necesaria del flujo Expo:
    - resolución reactiva por `ventaId` con `Meteor.useTracker(...)`
    - estados de carga / vacío / venta disponible
    - guardado vía `VentasCollection.update(...)`
    - eliminación vía `Meteor.call('eliminarVenta', ...)`
  - El cuerpo ahora vive dentro de `Dialog.ScrollArea` con `ScrollView`, y el tamaño del diálogo se calcula con `useWindowDimensions()` para no repetir el problema de layouts rígidos en iOS.

- Regla práctica:
  - En este proyecto, si una pantalla administrativa tipo CRUD ya funciona semánticamente como popup de edición, preferir `Dialog` de Paper antes que `Modal` custom cuando no se necesita fullscreen real.
  - Evitar fijar anchos/altos mínimos grandes dentro de diálogos usados en iPhone o iPad; usar límites responsivos calculados con dimensiones de ventana e insets.

---

Resumen técnico – Edición y eliminación de ventas con confirmación y restricción por usuario

- Ajuste aplicado en `components/ventas/DialogVenta.native.jsx`:
  - Antes de guardar cambios en una venta, ahora se muestra un `Alert` de confirmación para evitar ediciones accidentales.
  - La eliminación sigue pidiendo confirmación explícita antes de ejecutar `Meteor.call('eliminarVenta', ...)`.
  - Tanto editar como eliminar quedaron restringidos al usuario `carlosmbinf`.

- Criterio funcional validado:
  - Usuarios distintos de `carlosmbinf` pueden abrir el detalle de la venta, pero solo en modo lectura.
  - En ese caso:
    - los campos editables pasan a `editable={false}`
    - los botones `Guardar` y `Eliminar` quedan deshabilitados
    - se muestra un mensaje claro indicando que la edición y eliminación están restringidas

- Regla práctica:
  - Si una operación administrativa modifica datos sensibles y puede ejecutarse por error táctil, añadir confirmación previa aunque el botón ya esté dentro de un diálogo.
  - Si la restricción de negocio depende de un usuario principal explícito en el sistema legacy, reflejarla en la UI además del backend para evitar intentos de acción que el usuario no debería realizar.

---

Resumen técnico – Responsividad de cards de ventas y meta-cards del `DialogVenta`

- Problema detectado:
  - En pantallas pequeñas, los cards resumen de `Ventas cargadas`, `Pagadas` y `Pendientes` quedaban demasiado rígidos por su `minWidth` fijo.
  - Dentro de `components/ventas/DialogVenta.native.jsx`, las tarjetas de `Fecha`, `Admin ID` y `User ID` también conservaban una composición horizontal demasiado apretada para anchos reducidos.

- Corrección aplicada:
  - `components/ventas/VentasList.native.jsx` ahora usa `useWindowDimensions()` para detectar pantallas compactas y hacer que los summary cards pasen a ocupar ancho completo cuando el viewport es estrecho.
  - `components/ventas/DialogVenta.native.jsx` ahora calcula un estado `isCompactDialog` a partir del ancho útil del `Dialog`.
  - Cuando el diálogo entra en modo compacto:
    - reduce padding general del scroll y de los state cards
    - la cabecera hero compacta sus espacios
    - `Fecha`, `Admin ID` y `User ID` dejan de competir en fila y se apilan verticalmente con ancho completo
    - las acciones inferiores (`Eliminar` y `Guardar`) también pasan a una columna para evitar compresión lateral

- Regla práctica:
  - En este proyecto, cualquier card administrativa con `minWidth` fijo debe tener una variante compacta si puede aparecer en iPhone o en diálogos angostos.
  - Si un bloque de meta información tiene 3 tarjetas o más, en ancho reducido conviene apilarlo antes que dejar wrap forzado con columnas estrechas y texto truncado.

  ***

  Resumen técnico – Migración de Propertys a Expo con `Meteor.useTracker` y CRUD reactivo
  - Alcance aplicado:
    - `app/(normal)/PropertyList.tsx` dejó de usar `ScreenFallback` y ahora apunta al módulo espejo real `components/property/PropertyTable`.
    - `components/property/PropertyTable.jsx` quedó como fallback profesional para web/previews.
    - Se crearon implementaciones nativas reales para:
      - `components/property/PropertyTable.native.js`
      - `components/property/PropertyDialog.native.js`

  - Contrato funcional preservado del legacy:
    - Suscripción reactiva a `propertys` con `Meteor.useTracker(...)`.
    - Lectura de `ConfigCollection.find({}, { sort: { createdAt: -1, clave: 1 } })`.
    - Búsqueda local por:
      - `type`
      - `clave`
      - `valor`
      - `comentario`
      - administrador configurador
    - CRUD directo sobre `ConfigCollection`:
      - `insert`
      - `update`
      - `remove`
    - En edición se mantienen bloqueados `type`, `clave` e `idAdminConfigurado`, respetando el criterio ya validado en legacy.

  - UX/UI aplicada en Expo:
    - Header con `AppHeader` y acciones para:
      - mostrar/ocultar filtros
      - crear nueva property
    - Hero superior con contexto del módulo y resumen visual.
    - Métricas rápidas en cards para:
      - total
      - activas
      - inactivas
      - tipos distintos
    - Cards administrativas compactas por property en lugar de una tabla literal.
    - Diálogo `Dialog` de React Native Paper para crear, editar o consultar detalle, con jerarquía visual por secciones:
      - resumen superior
      - auditoría
      - identificadores
      - contenido
      - estado

  - Decisiones técnicas importantes:
    - Se mantuvo la convención local del proyecto: `Meteor.useTracker(...)` en vez de importar `useTracker` por separado.
    - El nombre del admin configurador se resuelve reactivamente desde `Meteor.users` cuando existe publicación; si no, la UI cae a un fallback seguro usando el ID parcial.
    - El diálogo se renderiza siempre dentro de `Portal + Dialog`, no como `Modal` custom, porque el caso de uso es CRUD administrativo y no fullscreen real.
    - La ruta sigue siendo usable en modo lectura aunque el usuario no tenga permisos de escritura; en ese caso el diálogo oculta acciones destructivas y de guardado.

  - Regla práctica:
    - En este proyecto, cuando una pantalla administrativa legacy usa `DataTable`, no conviene copiar la tabla literalmente a Expo si la superficie objetivo es móvil.
    - La estrategia estable es preservar el contrato de datos y mover la lectura a cards compactas más un diálogo de detalle/edición.
    - Si un documento de configuración tiene campos estructurales (`type`, `clave`, `idAdminConfigurado`), esos campos deben quedar bloqueados en edición para no degradar la integridad del sistema.

  ***

  Resumen técnico – Migración de la ruta Logs a Expo con contrato legacy/web intacto
  - Alcance aplicado:
    - `app/(normal)/Logs.tsx` dejó de usar `ScreenFallback` y ahora apunta al módulo espejo real `components/logs/LogsList`.
    - Se creó `components/logs/LogsList.native.js` como implementación nativa funcional.
    - `components/logs/LogsList.js` quedó como fallback profesional para web/previews, siguiendo el patrón del proyecto.

  - Contrato funcional preservado:
    - Suscripción a `logs` con `sort: { createdAt: -1 }` y `limit` configurable desde la UI.
    - Resolución reactiva de usuarios relacionados mediante `Meteor.subscribe('user', { _id: { $in: ids } })` para enriquecer cada log con nombres legibles de admin y usuario afectado.
    - Scope de consulta alineado con legacy/web:
      - si existe `id` en ruta, filtrar por `{ $or: [{ userAfectado: id }, { userAdmin: id }] }`
      - admin principal o rol admin ve todo
      - usuario no admin ve solo logs propios/relacionados

  - UX/UI aplicada:
    - Header con `AppHeader` y acción para mostrar/ocultar filtros, siguiendo el patrón ya validado en Servidores y Ventas.
    - Hero superior con contexto operativo, métricas de cargados/visibles/filtros/límite y panel de filtros desacoplable.
    - Buscador propio con `TextInput` nativo dentro de `Surface`, no `Searchbar`, para controlar mejor cursor, contraste y comportamiento visual.
    - Cards táctiles por log en lugar de tabla plana, manteniendo el mismo contenido esencial del legacy:
      - tipo
      - fecha
      - admin
      - usuario afectado
      - preview del mensaje
    - Detalle completo en `Dialog` con mensaje íntegro, metadatos y composición más legible para soporte móvil.

  - Decisiones técnicas importantes:
    - Se usó `Meteor.useTracker(...)` como convención local del proyecto Expo.
    - La colección de Expo para logs es `Logs` y no `LogsCollection`; conviene validar siempre el nombre exportado real en `components/collections/collections.js` antes de copiar contratos desde legacy o web.
    - El valor `SERVER` en `userAdmin` no debe intentar resolverse contra `Meteor.users`; debe mostrarse tal cual como actor del sistema.

  - Regla práctica:
    - En pantallas administrativas migradas desde `DataTable`, no conviene copiar la tabla del legacy de forma literal en Expo si la experiencia objetivo es móvil; es mejor conservar el contrato de datos y mover la lectura a cards + diálogo de detalle.
    - Si una ruta administrativa permite muchos filtros, el toggle del panel en header mejora mucho la densidad útil de pantalla sin perder capacidad operativa.

---

Resumen técnico – Límite configurable de consulta y toggle de filtros en `VentasList`

- Problema detectado:
  - La pantalla de ventas estaba fija a `limit: 100` tanto en la suscripción Meteor como en la consulta local a `VentasCollection`.
  - Además, el panel de filtros ocupaba demasiado espacio vertical y no existía una forma rápida de ocultarlo sin perder el contexto de búsqueda actual.

- Corrección aplicada:
  - `components/ventas/VentasList.native.jsx` ahora expone un estado `fetchLimit` configurable con opciones `100`, `200` y `300`.
  - Ese valor se usa tanto en `Meteor.subscribe('ventas', ..., { limit: fetchLimit })` como en `VentasCollection.find(..., { limit: fetchLimit })`, manteniendo consistencia entre publicación y Minimongo.
  - Se añadió una acción en `AppHeader` para mostrar u ocultar el panel de filtros.
  - Cuando el panel está oculto, la pantalla conserva una barra compacta con el límite activo y el conteo de filtros activos, además de un acceso para limpiar filtros si hace falta.

  ***

  Resumen técnico - Crash en `TiendaDetailScreen` por import inválido de `FAB` y reactividad frágil en `MenuIconMensajes`
  - Problema detectado:
    - `components/empresa/screens/TiendaDetailScreen.native.jsx` estaba importando `FAB` desde `react-native`.
    - En runtime eso deja `FAB` como `undefined` y dispara el error clásico:
      - `Element type is invalid ... but got: undefined`
    - El stack podía señalar líneas cercanas del `FlatList` o `refreshControl`, aunque la causa real estuviera en otro nodo del mismo árbol renderizado.

  - Corrección aplicada:
    - `FAB` debe importarse desde `react-native-paper`, no desde `react-native`.
    - Esto restaura correctamente el botón flotante de `TiendaDetailScreen` sin tocar la lógica de la pantalla.

  - Hallazgo adicional en `components/components/MenuIconMensajes.native.js`:
    - El componente estaba haciendo `Meteor.subscribe(...)` dentro de un loop reactivo sobre mensajes.
    - Ese patrón es frágil y puede terminar provocando warnings de montaje del tipo:
      - `Can't perform a React state update on a component that hasn't mounted yet`

  - Ajuste aplicado al menú de mensajes:
    - Se separó la carga reactiva en dos pasos estables:
      - primero suscripción a `mensajes` y derivación de IDs únicos de remitentes
      - luego una sola suscripción agregada a `user` con `{ _id: { $in: users } }`
    - Con esto el componente deja de abrir suscripciones dentro de un `map(...)` reactivo y queda más estable al montar/desmontar headers.

  - Regla práctica:
    - Si un componente usa `FAB`, `Portal`, `Dialog`, `Surface` u otras piezas de Paper, verificar siempre que el import venga de `react-native-paper` y no de `react-native`.
    - En este proyecto, no abrir `Meteor.subscribe(...)` dentro de loops reactivos por mensaje o por item; derivar primero los IDs necesarios y luego hacer una única suscripción agregada.

- Regla práctica:
  - Si una pantalla administrativa usa `limit` fijo en Meteor, conviene convertirlo en estado controlado cuando el volumen operativo puede variar por contexto.
  - Si el panel de filtros consume mucho espacio, no hace falta eliminarlo ni simplificarlo: es mejor añadir un toggle de visibilidad y dejar una versión colapsada con la información mínima relevante.

---

Resumen técnico – Migración de `UpdateRequired` a Expo con gate root alineado a legacy

- Alcance aplicado:
  - `components/update/UpdateRequired.jsx` dejó de ser placeholder y ahora replica la superficie visual real del legacy.
  - `app/index.native.tsx` incorporó el gate de validación de versión para decidir si se bloquea la app con `UpdateRequired` después del login.
  - Se añadió `expo-application` para leer el build nativo en Expo como equivalente profesional de `react-native-device-info` en el proyecto legacy.

- Contrato funcional preservado del legacy:
  - La validación de actualización obligatoria corre solo cuando existe `Meteor.userId()`.
  - Antes de consultar la versión mínima, el root espera a que Meteor esté conectado con timeout defensivo de 10s.
  - La property consultada sigue dependiendo de la plataforma:
    - Android -> `CONFIG/androidVersionMinCompilation`
    - iOS -> `CONFIG/iosVersionMinCompilation`
  - La comparación real se hace por build number, no por `expo.version` visible.
  - Si la property no existe, vale `0`, el servidor tarda demasiado o ocurre cualquier error, el flujo queda en fail-open y la app no se bloquea.

- Decisiones técnicas importantes:
  - En Expo no conviene derivar el build actual desde strings visibles de versión; la fuente de verdad debe ser `Application.nativeBuildVersion`.
  - Se dejó fallback secundario a `Constants.expoConfig` para Android/iOS por robustez cuando el runtime no exponga el valor nativo esperado.
  - El gate vive en `app/index.native.tsx`, no dentro de `Loguin` ni de un shell secundario, porque el legacy lo resuelve en el arranque raíz antes de decidir `App`, `CadeteNavigator` o `EmpresaNavigator`.

- Paridad visual preservada en `UpdateRequired`:
  - Se mantuvieron:
    - animación de fade + scale de entrada
    - rotación continua del icono `update`
    - card de comparación `Tu versión -> Requerida`
    - lista fija de mejoras
    - CTA `Actualizar Ahora`
  - En Expo el icono se resolvió con `@expo/vector-icons/MaterialCommunityIcons`, manteniendo la misma iconografía visual del legacy.

- Ajuste deliberado y profesional:
  - La lógica del botón sigue siendo `Platform.select(...)`, pero en iOS ya no se dejó el placeholder histórico del legacy; se apuntó al App Store ID real disponible en el proyecto (`6751348594`).

- Regla práctica:
  - Si se migra cualquier gate de arranque desde el legacy, no limitarse a portar la pantalla visual; primero validar dónde vive la decisión de bloqueo en el root.
  - En este proyecto, cualquier validación de versión que dependa del backend debe seguir el mismo patrón:
    - esperar conexión Meteor
    - consultar property por plataforma
    - comparar build number
    - fallar en modo abierto si el backend no responde

---

Resumen técnico – `VentasList` dejó de usar `Searchbar` y pasó a un input de búsqueda propio

- Problema detectado:
  - El componente `Searchbar` de React Native Paper no daba el nivel de control visual deseado para la pantalla de ventas.
  - Para este flujo administrativo la prioridad era una caja de búsqueda más simple, estable y alineada con el estilo local del panel de filtros.

- Corrección aplicada:
  - `components/ventas/VentasList.native.jsx` dejó de importar `Searchbar`.
  - Se creó un input de búsqueda propio dentro del módulo usando:
    - `Surface` como contenedor visual
    - `TextInput` de React Native Paper para la edición
    - `IconButton` para icono de búsqueda y limpieza
  - Se mantuvo intacta la lógica existente:
    - `searchQuery`
    - `onChangeText={setSearchQuery}`
    - limpieza rápida del texto

- Regla práctica:
  - Si una pantalla necesita una búsqueda visualmente más controlada que `Searchbar`, conviene construir una superficie propia con primitivas de Paper en vez de forzar overrides del componente original.
  - En este módulo, la fuente de verdad del campo de búsqueda ya no es `Searchbar`, sino el wrapper local `SearchInput` dentro de `VentasList.native.jsx`.

Notas adicionales – En ventas, el buscador propio conviene usar `TextInput` nativo si el cursor o el color del texto fallan

- Hallazgo puntual:
  - La primera versión del buscador propio en `VentasList.native.jsx` seguía usando `TextInput` de React Native Paper.
  - Eso podía dejar un comportamiento visual no deseado para este caso: cursor poco visible o texto que no quedaba forzado a negro al escribir.

- Ajuste aplicado:
  - El campo interno del wrapper `SearchInput` pasó a usar `TextInput` de React Native.
  - Se fijó explícitamente:
    - `color: '#000000'`
    - `cursorColor: '#000000'`
    - `selectionColor: 'rgba(0, 0, 0, 0.22)'`

- Regla práctica:
  - Si un input personalizado necesita control estricto sobre cursor, color de texto y selección, preferir `TextInput` nativo dentro del contenedor custom antes que seguir ajustando el de Paper.

---

Resumen técnico – Migración de la ruta Servidores a Expo corrigiendo el contrato real del módulo

- Hallazgo clave del legacy móvil:
  - `components/servers/ServerList.js` tiene una responsabilidad operativa muy concreta:
    - suscripción reactiva `Meteor.subscribe('servers')`
    - lectura de `ServersCollection`
    - solicitud de reinicio con `Meteor.call('actualizarEstadoServer', serverId, { estado: 'PENDIENTE_A_REINICIAR', idUserSolicitandoReinicio: Meteor.userId() })`
  - `components/servers/DialogServer.js` del legacy NO es una fuente de verdad del módulo:
    - usa `VentasCollection`
    - renderiza campos de ventas (`precio`, `comentario`, `ganancias`, admin/user)
    - no se llega a abrir desde `ServerList`
  - Conclusión práctica: no conviene portarlo literalmente a Expo; debe reemplazarse por un detalle real de servidor.

- Contraste útil con backend y panel web:
  - El backend Meteor real publica `servers` sin lógica adicional en la publicación y el método `actualizarEstadoServer` solo hace `$set` del payload recibido.
  - La superficie web `imports/ui/pages/servers/ServerTable.js` confirma campos relevantes adicionales del documento:
    - `active`
    - `lastUpdate`
    - `lastupdateAsync` usado por tareas backend para degradar el estado a `INACTIVO`
    - `usuariosAprobados`
  - En web el reinicio se considera válido solo cuando `estado === 'ACTIVO'`; este criterio es más robusto que el bloqueo mínimo del card legacy móvil.

- Estrategia aplicada en Expo:
  - Se creó `components/servers/ServerList.native.jsx` como implementación real de `/(normal)/Servidores`.
  - `components/servers/ServerList.js` quedó como `ScreenFallback` para web/previews sin Meteor nativo.
  - Se sustituyó el placeholder por un `DialogServer` coherente con servidores, no con ventas.
  - Se centralizó la presentación del dominio en `components/servers/serverUtils.js` para no duplicar:
    - normalización del documento
    - resolución de `lastUpdate` / `lastupdateAsync`
    - formateo de fecha absoluta y relativa
    - meta visual por estado

- UX/UI migrada sin perder funcionalidad:
  - Header propio con `AppHeader`.
  - Hero card de infraestructura con resumen de registros, activos, activados y pendientes.
  - Búsqueda por nombre, dominio, IP o estado.
  - Filtros por `estado` y activación.
  - Cards móviles con:
    - estado
    - activación
    - IP
    - última señal
    - descripción
    - CTA de reinicio
    - acceso a detalle

- Regla funcional importante:
  - En Expo el CTA de reinicio quedó alineado con el criterio más seguro del dominio:
    - solo permitir cuando `estado === 'ACTIVO'` y `active === true`
  - `PENDIENTE_A_REINICIAR` debe reflejar loading y bloquear nuevas solicitudes desde la UI incluso antes de que el operador cierre el ciclo del reinicio.

---

Resumen técnico – Servidores Expo: fallback seguro de tiempo relativo y gestión de usuarios VPN aprobados

- Problema detectado:
  - `components/servers/serverUtils.js` estaba instanciando `Intl.RelativeTimeFormat` al cargar el módulo.
  - En este runtime Expo/React Native esa API no siempre existe, y el resultado fue el crash:
    - `TypeError: Cannot read property 'prototype' of undefined`

- Corrección aplicada:
  - Los formatters de fecha y tiempo relativo pasaron a resolverse de forma perezosa y defensiva.
  - Si `Intl.RelativeTimeFormat` o `Intl.DateTimeFormat` no existen, el módulo usa fallback manual en vez de romper el bundle al importarse.

- Nueva funcionalidad portada desde el front web de servidores:
  - El detalle del servidor ahora permite administrar `usuariosAprobados` desde Expo.
  - La lógica sigue el contrato del sistema web:
    - solo se listan usuarios con `vpn: true`
    - admins ven todos los usuarios VPN
    - el resto usa el filtro por `bloqueadoDesbloqueadoPor` o su propio `_id`
  - La persistencia se hace mediante `Meteor.call('actualizarEstadoServer', serverId, { usuariosAprobados: [...] })` para evitar depender de `ServersCollection.update(...)` directo desde el cliente Expo.

- Criterio funcional validado:
  - `usuariosAprobados` es la lista que determina qué usuarios pueden conectarse a la VPN de ese servidor.
  - El diálogo de Expo debe mostrar dos grupos claros:
    - usuarios ya aprobados
    - usuarios VPN disponibles para agregar
  - La pantalla principal puede mostrar el conteo de aprobados como dato operativo rápido, pero la edición vive en el detalle.

- Regla práctica:
  - Si una utilidad compartida se importa desde una ruta Expo crítica, evitar cualquier dependencia de APIs opcionales del runtime en el scope global del módulo.
  - Si un flujo web legacy actualiza un documento directamente desde cliente, en Expo conviene reutilizar un método Meteor existente cuando el backend ya permite `$set` del payload requerido.

---

Resumen técnico – Toggle de filtros en header para `UsersHome`

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` ahora controla la visibilidad del bloque de filtros con estado local `showFilters`.
  - El valor inicial queda en `false`, así que la pantalla abre con el panel de filtros oculto por defecto.

- Integración con header:
  - Se añadió una acción de filtro en `AppHeader` junto al botón de crear usuario.
  - El icono cambia según el estado actual del panel:
    - oculto -> `filter-variant`
    - visible -> `filter-off-outline`

- Regla práctica:
  - En pantallas administrativas con paneles de filtros altos, conviene colapsarlos detrás de una acción del header para ganar espacio vertical sin perder funcionalidad.
  - Si el usuario ya conoce la pantalla y entra con frecuencia, abrir con filtros ocultos mejora densidad útil y deja la lista como foco principal.

---

Resumen técnico – Sistema visual de modo oscuro validado en Servidores como referencia global

- Decisión de diseño validada:
  - El criterio correcto para dark mode en Expo no es cambiar solo el color del texto.
  - Cada superficie debe cambiar en conjunto:
    - fondo
    - borde
    - color de texto
    - color de iconos
    - color de chips y estados secundarios

- Patrón visual que quedó aprobado en `components/servers/ServerList.native.jsx` y `components/servers/DialogServer.js`:
  - Fondo raíz oscuro profundo:
    - `#020617`
  - Hero / bloque principal oscuro elevado:
    - `#0b1220`
  - Cards principales de contenido:
    - `rgba(15, 23, 42, 0.94)`
  - Cards internas secundarias / métricas:
    - `rgba(30, 41, 59, 0.82 ~ 0.86)`
  - Inputs o barras de búsqueda sobre dark mode:
    - `rgba(15, 23, 42, 0.78)` o `rgba(30, 41, 59, 0.92)`
  - Chips informativos neutrales/operativos:
    - usar bases oscuras teñidas, no grises claros heredados del light mode
    - ejemplo aprobado: `rgba(67, 56, 202, 0.32)` con texto claro `#e9e7ff`
  - Chips seleccionados en filtros:
    - `rgba(59, 130, 246, 0.28)` con borde `rgba(96, 165, 250, 0.38)` y texto `#dbeafe`

- Regla práctica importante:
  - Si un chip o card cambia a dark mode, no dejar su fondo fijo del modo claro mientras el texto pasa a blanco.
  - Ese desajuste genera exactamente el problema detectado en Servidores: contraste roto aunque el typography responda al tema.

- Recomendación de implementación para futuras pantallas:
  - Resolver una `palette` local derivada de `theme.dark` y consumirla en toda la pantalla.
  - No dispersar valores hardcodeados independientes por cada `Chip`, `Surface` o `TextInput`.
  - El patrón aprobado es construir un objeto con claves de intención, por ejemplo:
    - `screen`
    - `cardSurface`
    - `metricSurface`
    - `searchSurface`
    - `filterChipBackground`
    - `filterChipSelectedBackground`
    - `metaChipBackground`
    - `title`
    - `subtitle`
    - `copy`
    - `icon`

- Tokens cromáticos recomendados para reutilizar en la app completa:
  - Texto principal dark:
    - `#f8fafc`
  - Texto secundario dark:
    - `#cbd5e1`
  - Texto terciario / labels dark:
    - `#94a3b8`
  - Azul de selección dark:
    - `#dbeafe`
  - Azul de énfasis light ya compatible:
    - `#1d4ed8`
  - Base neutra oscura reusable:
    - `#0f172a`
  - Base oscura más profunda para fondo general:
    - `#020617`

- Alcance recomendado:
  - Este lenguaje visual debe tomarse como referencia para toda la app Expo, especialmente en:
    - listados administrativos
    - diálogos de detalle
    - filtros con chips
    - métricas en cards

---

Resumen tecnico - `ProductoCard` de TiendaDetail sin altura rigida ni estiramiento en modo compacto

- Problema detectado:
  - `components/empresa/components/ProductoCard.native.jsx` seguia usando `height: "100%"` en la card.
  - En `TiendaDetailScreen.native.jsx`, la variante compacta del card se renderiza en columna (`contentCompact`), pero el bloque `info` seguia con:
    - `flex: 1`
    - `justifyContent: 'space-between'`
  - Esa combinacion hacia que el card se estirara visualmente y dejara demasiado aire vertical, especialmente en movil con una sola columna.

- Correccion aplicada:
  - Se elimino la altura rigida del `Card`.
  - Se agrego una variante `infoCompact` con:
    - `flex: 0`
    - `justifyContent: 'flex-start'`
  - Se ajusto tambien la densidad del modo compacto con:
    - `contentCompact.gap = 12`
    - radio levemente mas compacto en la card
    - `overflow: 'hidden'` para una superficie mas limpia.

- Criterio visual validado:
  - En cards verticales de producto, la altura debe salir del contenido real y no de una regla de estiramiento artificial.
  - Si el card pasa de layout horizontal a layout columna, no conviene conservar la misma logica de `space-between` pensada para llenar altura disponible.

- Regla practica:
  - En este proyecto, si una card cambia a modo compacto/columna, revisar siempre si sigue teniendo `flex: 1` o `justifyContent: 'space-between'` en el bloque principal de contenido.
  - Para listas moviles de productos, evitar `height: '100%'` salvo que exista una grilla con altura de fila realmente controlada por el contenedor padre.

---

Resumen tecnico - Flujo legacy real de imagenes de productos en modo Empresa

- Fuente de verdad validada en legacy:
  - La imagen del producto NO vive dentro del documento de `ProductosComercioCollection`.
  - El frontend legacy resuelve la foto llamando:
    - `Meteor.call('findImgbyProduct', productoId)`
  - El backend busca en `ImagesCollection` por:
    - `meta.idProducto = productoId`
  - Si encuentra archivo, devuelve la URL publica usando `imageDoc.link()` + `replaceUrl(..., ROOT_URL)`.

- Visualizacion en legacy:
  - `components/empresa/components/ProductoImage.jsx`:
    - llama `findImgbyProduct` en `useEffect`
    - mientras carga muestra `ActivityIndicator`
    - si no hay imagen o falla, muestra placeholder con `image-off`
    - si existe, renderiza `Image` con `resizeMode='cover'`
  - `components/empresa/components/ProductoCard.jsx` solo monta `ProductoImage productoId={producto._id}` y no consume ningun campo de imagen dentro del producto.

- Flujo de edicion/creacion de imagen en modo empresa:
  - El shell de empresa se activa en legacy cuando:
    - `user.profile.roleComercio` incluye `EMPRESA`
    - y `user.modoEmpresa === true`
  - La navegacion relevante del modulo es:
    - `MisTiendas -> TiendaDetail -> ProductoForm`
  - `TiendaDetailScreen.jsx` abre `ProductoForm` pasando:
    - `producto` existente para editar, o
    - objeto base con `idTienda` para crear.

- ProductoForm legacy:
  - En modo edicion, `ProductoFormScreen.jsx` hace dos cosas al montar:
    - hidrata `formData` desde el producto
    - carga imagen actual con `findImgbyProduct(producto._id)` para poblar `imagenPreview`
  - La seleccion de nueva imagen usa `launchImageLibrary` de `react-native-image-picker`.
  - El archivo local se valida por:
    - tipo `image/*`
    - peso maximo `5MB`
  - Para subir la imagen:
    - lee el archivo local con `react-native-fs` en base64
    - construye `data:<mime>;base64,...`
    - llama `Meteor.call('comercio.uploadProductImage', productoId, fileData)`

- Contrato backend confirmado:
  - `addProducto` solo inserta el documento del producto y devuelve `productoId`.
  - `comercio.editProducto` solo actualiza datos del producto; NO manipula imagen.
  - `comercio.uploadProductImage`:
    - valida autenticacion y permisos (dueno de tienda o admin)
    - valida archivo
    - elimina primero cualquier imagen previa de ese producto en `ImagesCollection`
    - escribe el archivo nuevo con metadata incluyendo `idProducto`, `idTienda`, `userId` y `type: 'COMERCIO'`
  - `comercio.deleteProductImage` existe como metodo separado para borrar explicitamente la imagen asociada.

- Matiz funcional importante del legacy:
  - En `ProductoFormScreen.jsx`, `handleRemoveImage()` solo limpia el estado local (`imagen` e `imagenPreview`).
  - Si el usuario quita la preview en modo edicion y guarda SIN seleccionar una nueva imagen, el flujo normal de guardado no llama `comercio.deleteProductImage`.
  - La imagen remota solo se reemplaza de forma efectiva cuando se selecciona otra nueva y luego se ejecuta `comercio.uploadProductImage`.
  - O sea: en el legacy, "quitar la foto" desde la UI no necesariamente borra la imagen del backend salvo que se dispare el metodo explicito de borrado o un upload nuevo la reemplace.

- Regla practica:
  - Si se migra o ajusta este flujo en Expo, mantener estas responsabilidades separadas:
    - producto -> `addProducto` / `comercio.editProducto`
    - imagen -> `findImgbyProduct` / `comercio.uploadProductImage` / `comercio.deleteProductImage`
  - No asumir que la imagen viene embebida en el documento del producto.
  - Si se quiere soportar borrado real de foto sin reemplazo, hay que llamar explicitamente `comercio.deleteProductImage` en el flujo de guardar, porque el legacy no lo deja resuelto solo con limpiar la preview local.
    - buscadores y barras de entrada sobre superficies oscuras

- Lección práctica:
  - El dark mode profesional del proyecto debe definirse por superficies y estados, no por un simple intercambio de texto negro por blanco.
  - Si se mantiene esta regla, futuras rutas podrán verse coherentes con Servidores sin rehacer contraste pantalla por pantalla.

---

Resumen técnico – Migración de MapaUsuarios a Expo con `react-native-maps` y contrato legacy corregido

- Alcance aplicado:
  - `app/(normal)/MapaUsuarios.tsx` dejó de usar `ScreenFallback` directo y ahora apunta al módulo espejo real `components/comercio/maps/MapaUsuariosScreen`.
  - Se creó implementación nativa real en:
    - `components/comercio/maps/MapaUsuariosScreen.native.jsx`
    - `components/comercio/maps/MapaUsuarios.native.jsx`
  - `components/comercio/maps/MapaUsuariosScreen.jsx` quedó como fallback profesional para web/previews.

- Contrato funcional confirmado desde legacy:
  - El módulo depende de la publicación Meteor `usuarios.conCoordenadas`.
  - El criterio de visibilidad es administrativo; la publicación está pensada solo para admins.
  - Los documentos pueden traer ubicación en cualquiera de estos campos:
    - `cordenadas`
    - `coordenadas`
  - El legacy filtraba por rol en cliente y calculaba estadísticas de:
    - total
    - online
    - cadetes
    - admins
    - empresas

- Decisión técnica importante en Expo:
  - No se replicó el patrón legacy de suscribirse una vez en el screen y otra vez dentro del componente del mapa.
  - En Expo la lectura reactiva se elevó a `MapaUsuariosScreen.native.jsx` y el mapa quedó como componente visual controlado por props.
  - Esto evita suscripciones duplicadas, facilita filtros/búsqueda/estadísticas en una sola fuente de verdad y hace más estable el render del mapa.

---

Resumen tecnico - `PeliculaPlayer` Expo con duracion real HLS y flujo de reanudacion local

- Alcance aplicado:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` ya no depende solo del tiempo reportado por VLC para mostrar la duracion total.
  - El player movil incorpora persistencia local del progreso y un prompt para continuar donde el usuario se habia quedado, siguiendo el patron funcional ya validado en la web.

- Fuente de verdad confirmada para la duracion:
  - Cuando existe reproduccion HLS server-side, la duracion visible debe priorizar:
    - `hlsPlayback.durationSeconds`
  - Solo si esa metadata no existe, se puede caer a:
    - `playback.duration`
    - `videoInfo.duration`
    - o la duracion cacheada localmente
  - Regla practica: en este modulo no usar `playback.duration` como primera fuente si HLS ya expone `durationSeconds`.

- Persistencia local aplicada:
  - Se usa `expo-secure-store` con key valida para el proyecto:
    - `vidkar.moviePlaybackCache.v1`
  - Cada pelicula guarda un bloque por `_id` con al menos:
    - `currentTime`
    - `duration`
    - `completed`
    - `updatedAt`
    - metadata minima de la pelicula para trazabilidad local
  - Regla practica: en este repo no usar `:` en keys de SecureStore; mantener `.` o `-`.

- Flujo de reanudacion aplicado:
  - Al abrir una pelicula se lee el progreso cacheado por `movieId`.
  - Solo se ofrece `Continuar reproducción` cuando:
    - el progreso guardado es mayor a `15s`
    - y la pelicula no estaba practicamente terminada (`currentTime < duration - 15s`)
    - y no estaba marcada como completada
  - El prompt se resolvio con `Dialog` de React Native Paper, no con un modal externo.

- Coordinacion con HLS:
  - La preparacion de la sesion HLS debe esperar a que el usuario decida:
    - `Continuar`
    - o `Empezar de nuevo`
  - Si el usuario decide continuar, el player actualiza `hlsStartAtRequest` con el progreso guardado antes de preparar la playlist.
  - Si decide empezar de nuevo, el progreso local se reinicia a `0` y la sesion HLS arranca desde el inicio.

- Guardado incremental del progreso:
  - El player persiste avance de forma incremental mientras reproduce.
  - Para no escribir en cada tick, solo guarda cuando el tiempo avanza al menos un umbral practico (`5s`).
  - Si la pelicula llega al final o queda dentro de la ventana final de cierre, el cache se marca como `completed` y el punto de reanudacion deja de ofrecerse.

- Criterio funcional importante:
  - El flujo correcto del movil ya no debe parecerse a “entra siempre desde cero”.
  - Debe seguir la semantica ya validada en la web:
    1. resolver metadata real de duracion
    2. consultar progreso local
    3. decidir si se reanuda
    4. preparar HLS con `startAt` si corresponde

- Regla practica:
  - Si se vuelve a tocar este player, no mezclar la apertura de la pelicula con la decision de resume ni con un fetch profundo innecesario.
  - Si reaparece una duracion incorrecta o resume roto, revisar primero estos puntos en este orden:
    - prioridad de `hlsPlayback.durationSeconds`
    - lectura/escritura de `vidkar.moviePlaybackCache.v1`
    - gate `resumePromptVisible/resumeStateReady`
    - `hlsStartAtRequest` antes de preparar la sesion HLS

---

Resumen técnico – Lista de usuarios en grilla responsiva con cards de ancho máximo

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` dejó de renderizar la lista expandida solo como columna única.
  - Ahora usa una grilla responsiva con `FlatList` + `numColumns`, calculando cuántas cards caben por fila según el ancho disponible.

- Patrón implementado:
  - Se añadió `getUsersLayout(width)` para resolver:
    - número de columnas
    - ancho máximo por card
    - separación horizontal entre cards
    - tamaño de avatar y compactación del contenido interno cuando la card entra en modo grilla
  - Cada item se renderiza dentro de una celda con ancho fijo derivado del layout, mientras `itemCard` queda con `width: '100%'` para llenar esa celda.

- Criterio técnico:
  - El máximo de ancho por card evita que en tablets o pantallas amplias una card se estire demasiado.
  - El número de columnas aumenta solo cuando el ancho real permite mostrar varias cards sin degradar la legibilidad del contenido.
  - El card del peek sigue reutilizando la misma superficie visual, pero la lista visible ya no depende de una sola columna rígida.

- Regla práctica:
  - Si esta pantalla sigue evolucionando, cualquier cambio de densidad o número de columnas debe pasar por `getUsersLayout(width)` y no por `numColumns` hardcodeado o anchos fijos dispersos.
  - Cuando una lista necesita mostrar varias cards en horizontal, primero limitar el ancho máximo de la card y luego calcular columnas; no dejar que la card crezca sin control con el ancho de pantalla.

- Mejoras aplicadas respecto al legacy:
  - Header unificado con `AppHeader` en lugar del toolbar manual antiguo.
  - Hero superior con métricas, búsqueda y filtros por rol antes del mapa.
  - Mapa interactivo con:
    - centrado automático de todos los usuarios filtrados
    - acción para enfocar la ubicación actual
    - detalle visual del usuario seleccionado dentro de la superficie del mapa
  - Estado restringido explícito cuando el usuario no tiene permisos para consumir la publicación.
  - Estado vacío más claro cuando no existen usuarios con coordenadas para el filtro activo.

- Dependencias y plataforma:
  - Se añadió `react-native-maps` al proyecto Expo porque el workspace aún no lo tenía instalado.
  - La implementación nativa usa:
    - `PROVIDER_GOOGLE` en Android
    - `PROVIDER_DEFAULT` en iOS
  - La ubicación del operador se resuelve con `expo-location`, sin inventar un contrato nuevo distinto al stack ya validado en Expo.

- Hallazgo técnico útil para próximos desarrolladores:
  - En la referencia web encontrada, la publicación `usuarios.conCoordenadas` usa `Meteor.users.findOneAsync(this.userId)` sin `await`, por lo que no conviene copiar esa implementación de forma ciega como fuente de verdad del control de acceso.
  - Para la migración Expo conviene consumir el contrato de publicación existente, pero no reproducir errores del backend o de superficies auxiliares.

- Regla práctica:
  - Si un módulo legacy mezcla mapa, estadísticas y filtros, no hace falta portar literalmente su estructura de componentes; lo importante es conservar el contrato de datos y mejorar la jerarquía visual en Expo.
  - Cuando existan campos legacy duplicados o inconsistentes como `cordenadas` vs `coordenadas`, normalizarlos en un único view model antes de renderizar markers o aplicar filtros.

Notas adicionales – Para ver todos los usuarios conviene seguir `Meteor.subscribe('user', selector)` como en legacy

- Hallazgo validado al contrastar la pantalla legacy con el backend web:
  - `MapaUsuariosScreen.jsx` del legacy calcula estadísticas suscribiéndose a `user` con selector por coordenadas.
  - La publicación genérica `user` acepta `selector` y `option`, por lo que devuelve correctamente los `Meteor.users` que cumplan:
    - `cordenadas.latitude`
    - `coordenadas.latitude`

- Problema detectado en la publicación especializada:
  - `usuarios.conCoordenadas` en backend usa `Meteor.users.findOneAsync(this.userId)` sin `await`.
  - Ese detalle hace que la validación de admin sea poco confiable y puede terminar devolviendo `this.ready()` sin publicar usuarios.

- Decisión aplicada en Expo:
  - Para recuperar todos los usuarios visibles del módulo legacy, `MapaUsuariosScreen.native.jsx` dejó de depender de `usuarios.conCoordenadas` y ahora usa:
    - `Meteor.subscribe('user', LOCATION_SELECTOR, { fields: LOCATION_FIELDS })`
    - `Meteor.users.find(LOCATION_SELECTOR, { fields: LOCATION_FIELDS })`

- Regla práctica:
  - Si una migración necesita igualar el resultado visible del legacy, priorizar el contrato que realmente alimenta la pantalla en producción aunque exista una publicación “más específica” en backend.
  - Si una publicación especializada parece correcta pero da menos resultados que la suscripción genérica usada por el legacy, revisar primero errores de async/permissions en servidor antes de culpar al mapa o al filtro de cliente.

---

Resumen tecnico - Badge de conexion en UsersHome: CORRECCION CRITICA - campo real es `address`, NO `hostname`

- **Hallazgo confirmado** al inspeccionar documentos reales de MongoDB de `conexiones` y `react-download/server/main.js`:
  - Documentos reales: `{ "address": null, "userId": "..." }` y `{ "address": "186.54.121.204", "userId": "..." }`
  - El campo `address` distingue web vs proxy. **`hostname` NUNCA se escribe en el servidor.**

- **Causa raiz** - `react-download/server/main.js`:
  - `Meteor.onConnection` inserta solo: `{ _id: connection.id, address: connection.clientAddress }`
  - `hostname` existe en SimpleSchema como `optional: true` pero ningun codigo lo popula.

- **Bug historico en legacy** (`android-VIDKAR/UsersHome.js`):
  - `online.hostname != null` siempre era `false` -> `hasWebConnection` siempre `false`
  - `!online.hostname` siempre era `true` -> todos aparecian como **proxy** en legacy tambien

- **Correccion aplicada en Expo** (`components/users/UsersHome.native.js`):
  - `hasWebConnection`: `matchesUserId(online.userId, user._id) && online.address != null`
  - `hasProxyConnection`: `matchesUserId(online.userId, user._id) && !online.address`
  - Suscripcion y `Online.find`: `{ fields: { userId: 1, address: 1 } }` (NO `hostname: 1`)

- **Logica de badge correcta y definitiva**:
  - `address != null` -> badge web (cyan `#10ffE0`)
  - `address == null` -> badge proxy (azul `#102dff`)
  - `vpnplusConnected || vpn2mbConnected` -> badge VPN (verde `#10ff00`)
  - Sin coincidencia en `conexiones` -> offline (sin badge)
  - Prioridad: web -> proxy -> vpn

- **Regla practica definitiva**:
  - Usar `address`, NUNCA `hostname`, en documentos de `conexiones`.
  - Si el badge parece incorrecto, verificar el campo `address` en documentos reales y el cruce de IDs con `matchesUserId()`.
  - Los helpers `normalizeUserId()` y `matchesUserId()` siguen siendo validos y necesarios.
  - No reintroducir logica basada en `hostname`; ese campo no existe en los datos reales.

Notas adicionales - `router.back()` en flujo de users debe tener fallback seguro

- Hallazgo puntual:
  - En Expo Router, si una pantalla del flujo de usuarios se abre como entrypoint directo o por replace profundo, `router.back()` puede disparar el warning `GO_BACK was not handled by any navigator`.

- Ajuste aplicado:
  - `components/users/CreateUsers.native.js` ahora usa un handler de cancelacion seguro:
    - si `router.canGoBack()` -> `router.back()`
    - si no -> `router.replace('/(normal)/Users')`

- Regla practica:
  - En pantallas secundarias del modulo users, no usar `router.back()` desnudo en botones de cancelar o cerrar.
  - Siempre definir una ruta fallback explicita cuando la pantalla pueda abrirse sin historial previo.

---

Resumen tecnico - CreateUsers Expo debe contemplar que `addUser` legacy devuelve errores en `result`

- Hallazgo validado al contrastar `components/users/CreateUsers.js` del legacy con `react-download/server/metodos/usuarios.js`:
  - El metodo backend `addUser` no hace `throw` de forma consistente cuando falla.
  - En su `catch`, retorna directamente el objeto `error`.
  - Eso implica que en el cliente puede llegar un callback sin `error`, pero con un `result` que en realidad representa un fallo.

- Riesgo detectado en Expo:
  - Si `components/users/CreateUsers.native.js` trataba cualquier callback sin `error` como exito, podia mostrar `Usuario creado` aunque el servidor hubiese devuelto un error serializado en `result`.

- Correccion aplicada en Expo:
  - La pantalla ahora normaliza el resultado del callback de `Meteor.call('addUser', ...)`.
  - Considera fallo cuando:
    - existe `error`
    - o `result` existe y no es string de exito
  - Se centralizo un helper `getServerErrorMessage(...)` para extraer `reason` o `message` del objeto retornado por el backend.

- Alineacion funcional adicional con legacy/backend:
  - Se dejo de forzar transformaciones del username en cada pulsacion; el valor visible ya no se lowercasa ni se le eliminan espacios automaticamente desde el input.
  - El submit mantiene `trim()` al construir el payload final, pero la pantalla no debe reinterpretar silenciosamente el username del usuario.
  - La validacion local de contraseña se relajo a 6 caracteres para no endurecer mas que el flujo historico del sistema.

- Regla practica:
  - Si un metodo legacy atrapa errores y los retorna como valor, no confiar solo en el parametro `error` del callback en MeteorRN.
  - Antes de modernizar validaciones de formularios legacy, confirmar que no se este bloqueando un caso que el backend historico aun acepta.
  - En pantallas Expo que llaman metodos Meteor antiguos, validar siempre el contrato real del metodo servidor, no solo la forma ideal esperada del callback.

  ---

  Resumen tecnico - Flujo cadete: la card del pedido necesita `producto.carritos` completo

  - Hallazgo validado:
    - `components/comercio/pedidos/HomePedidosComercio.native.jsx` estaba suscribiendo `ventasRecharge` para el flujo cadete con una proyeccion minima por subcampos de `producto.carritos`.
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx` descarta el render si el carrito llega vacio o inutilizable:
      - `if (!venta || !comprasEnCarrito.length) return null;`
    - Eso puede dejar la pantalla mostrando pedidos activos en el resumen, pero sin card visible, porque el join `pedido + venta` si existe y el descarte ocurre ya dentro del card.

  - Correccion aplicada:
    - Para el flujo cadete se dejo de proyectar `producto.carritos` por subcampos minimos y se paso a pedir el array completo:
      - `"producto.carritos": 1`
    - Este criterio queda alineado con otros modulos del proyecto que ya consumen ventas de comercio usando el carrito embebido completo.

  - Regla practica:
    - Si una pantalla necesita iterar items de `producto.carritos`, no usar una proyeccion agresiva por subcampos si el componente depende de que el array llegue estable y util.
    - Si el resumen indica que hay pedidos activos pero la card no aparece, revisar primero la proyeccion de `ventasRecharge` antes de reabrir el cron o la publicacion `pedidosAsignados`.

  Notas adicionales - Mis pedidos del cadete debe excluir ventas `ENTREGADO`

  - Problema detectado:
    - `HomePedidosComercio.native.jsx` filtraba pedidos activos usando solo `PedidosAsignadosComercioCollection` con `entregado: false`.
    - Si la venta asociada ya tenia `estado: 'ENTREGADO'` pero el documento de pedido asignado aun no habia salido de la publicacion o no habia actualizado `entregado`, la card seguia apareciendo en `Mis pedidos activos`.

  - Correccion aplicada:
    - El arreglo `pedidosConVentas` ahora filtra tambien por el estado real de la venta asociada.
    - Un pedido solo cuenta como activo si:
      - `pedido.entregado !== true`
      - `pedido.venta.estado !== 'ENTREGADO'`
    - Al completar la entrega desde el card, se actualiza Minimongo localmente para reflejar de inmediato:
      - `VentasRechargeCollection.estado = 'ENTREGADO'`
      - `PedidosAsignadosComercioCollection.entregado = true`

  - Regla practica:
    - En el flujo cadete, no tratar `pedidosAsignados.entregado` como unica fuente de verdad para decidir si un pedido sigue activo.
    - El estado operativo de `VentasRechargeCollection.estado` tambien debe excluir `ENTREGADO` del listado activo.
    - Si una card entregada queda visible por unos segundos despues del slide final, aplicar refresco local de Minimongo solo despues de exito confirmado del metodo `comercio.pedidos.avanzar`.

---

Resumen tecnico - Version real y numero de compilacion en MenuPrincipal Expo

- Ajuste aplicado:
  - `components/Main/MenuPrincipalScreen.jsx` dejo de mostrar un patch hardcodeado con `process.env.EXPO_PUBLIC_APP_BUILD`.
  - El hero principal ahora muestra dos datos distintos y reales:
    - version visible de la app, por ejemplo `v4.0.875`
    - numero de compilacion nativo, por ejemplo `Comp. 872`

- Decisión técnica importante:
  - Como `MenuPrincipalScreen.jsx` es una superficie compartida entre nativo y preview/web, no conviene importar `expo-application` directamente ahi.
  - La resolucion de version/build se movio a helpers por plataforma:
    - `services/app/appVersion.native.js`
    - `services/app/appVersion.js`
  - Luego `MenuPrincipal.native.jsx` y `MenuPrincipal.jsx` pasan esos valores al screen por props.

- Regla practica:
  - Si una pantalla compartida necesita datos nativos reales como `Application.nativeBuildVersion`, resolverlos en el wrapper `.native.*` o en un helper con variantes por plataforma.
  - La version visible debe salir de `expoConfig.version`; el numero de compilacion debe salir de `Application.nativeBuildVersion` cuando exista, con fallback a `android.versionCode` o `ios.buildNumber`.

---

Resumen tecnico - Migracion de ComerciosList desde `components/productos/ProductosScreen` respetando legacy

- Fuente de verdad validada:
  - La pantalla real del modulo comercio para usuarios finales no vive bajo `components/comercio/poductos`, sino en `components/productos/ProductosScreen.jsx` del legacy.
  - La UI visible depende de tres piezas acopladas del mismo modulo:
    - `ProductosScreen`
    - `TiendaCard`
    - `ProductoCard`
    - `AddToCartDialog`

- Contrato funcional preservado en Expo:
  - obtencion de ubicacion del usuario al montar
  - envio de coordenadas al backend con `cadete.updateLocation`
  - busqueda de tiendas cercanas usando `comercio.getTiendasCercanas`
  - suscripcion reactiva a `productosComercio`
  - suscripcion reactiva a `tiendas` solo para los `_id` cercanos devueltos por backend
  - filtro local por nombre de tienda, descripcion y productos
  - orden por distancia cuando existe
  - cards expandibles de tienda con carrusel horizontal de productos
  - dialogo de agregar al carrito via `addAlCarrito`

- Decision tecnica importante:
  - En Expo se adapto solo la capa nativa de ubicacion, usando `expo-location` en lugar de `@react-native-community/geolocation`, pero manteniendo la misma UX del legacy:
    - solicitud de permiso
    - alertas para ir a configuracion
    - reintento
    - mensaje cuando no hay ubicacion disponible
  - El resto del contrato de negocio se mantuvo sin inventar metodos nuevos.

- Regla practica:
  - Si una ruta Expo espejo apunta a un modulo legacy grande, revisar primero donde esta realmente la fuente de verdad funcional; en este caso la ruta `ComerciosList` debia apuntar a `components/productos/ProductosScreen`, no a placeholders bajo `components/comercio/*`.
  - Cuando un modulo legacy depende de distancia calculada en backend, la lista debe respetar primero `comercio.getTiendasCercanas` y solo usar `calcularDistancia` en la card como fallback o refuerzo visual, no como fuente primaria del ranking.

---

Resumen tecnico - Migracion del listado de compras de comercio a Expo

- Fuente de verdad validada:
  - La pantalla legacy del historial/listado de pedidos de comercio es `components/comercio/pedidos/PedidosComerciosList.jsx`.
  - Su UI real depende de estos componentes:
    - `components/comercio/pedidos/components/PedidoCard.jsx`
    - `components/comercio/pedidos/components/PedidoStepper.jsx`
    - `components/comercio/maps/MapaPedidoConCadete.jsx`
    - `components/archivos/SubidaArchivos`

- Contrato funcional preservado en Expo:
  - suscripcion a `ventasRecharge` filtrando por:
    - `userId = Meteor.userId()`
    - `producto.carritos.type = 'COMERCIO'`
  - orden por `createdAt desc`
  - stepper derivado de `estado` con el mismo mapping:
    - `PREPARANDO -> 1`
    - `CADETEENLOCAL -> 2`
    - `ENCAMINO -> 3`
    - `CADETEENDESTINO -> 4`
    - `ENTREGADO -> 5`
    - cancelado -> `-1`
  - upload de evidencia cuando:
    - `isCobrado === false`
    - `isCancelada !== true`
    - `metodoPago === 'EFECTIVO'`
  - mapa de seguimiento solo cuando:
    - hay `cadeteid`
    - el estado esta en `CADETEENLOCAL`, `ENCAMINO` o `CADETEENDESTINO`
    - existe tienda y coordenadas de destino

- Decision tecnica importante:
  - En Expo el mapa se porto con `react-native-maps`, manteniendo provider Google en Android y default en iOS, igual que el criterio ya validado en otros modulos del proyecto.
  - Para iconografia se uso `@expo/vector-icons/MaterialCommunityIcons` en lugar de `react-native-vector-icons`, sin cambiar la semantica visual del legacy.
  - El header se adapto a Expo Router manteniendo la estructura visual del legacy: back action, mensajes, carrito y menu de perfil/logout sobre Appbar azul.

- Regla practica:
  - Si un pedido de comercio mezcla tracking, evidencia y estados de entrega, no conviene migrar solo la lista principal; hay que portar tambien el card expandible y el mapa, porque forman parte del comportamiento visible del modulo.
  - En este modulo, `VentasRechargeCollection` sigue siendo la coleccion fuente de verdad aunque el dominio sea comercio; no sustituirla por otra coleccion solo por el nombre de la pantalla.

---

Resumen tecnico - Cards del carrito resumidas por defecto con detalle expandible e imagen en comercio

- Ajuste UX aplicado en Expo:
  - `components/carritoCompras/ListaPedidosRemesa.native.jsx` dejo de mostrar las cards de carrito como bloques siempre extensos para `RECARGA`, `REMESA`, `PROXY` y `VPN`.
  - Ahora todas esas variantes usan una superficie comun resumida por defecto y con detalle expandible bajo demanda.
  - `COMERCIO` mantuvo su card propia, pero se rediseño con la misma filosofia visual: hero compacto, informacion clave arriba y detalle solo al expandir.

- Patron visual validado:
  - helper comun `CompactCartCard` para:
    - header compacto
    - badge opcional
    - grid de metricas resumen
    - footer con estado/accion secundaria
    - seccion expandible con filas de detalle
  - helpers auxiliares:
    - `CartSummaryMetric`
    - `CartDetailItem`
    - `useExpandableCardState`

- Regla funcional importante:
  - El cambio debe ser solo visual.
  - No se alteran:
    - estructura de `CarritoCollection`
    - logica de borrado
    - flujo del wizard/checkout
    - tipos de item ni metodos Meteor asociados
  - Todos los datos que antes se mostraban siguen disponibles, pero algunos pasan a vivir dentro del panel expandido.

- Comercio en carrito:
  - La imagen del producto se obtiene con el mismo contrato ya validado en catalogo:
    - `Meteor.call('findImgbyProduct', producto._id, ...)`
  - Si no existe imagen, la card muestra fallback visual neutro con icono, no un hueco vacio.
  - La card de comercio debe priorizar arriba:
    - imagen
    - nombre del producto
    - tienda
    - descripcion corta
    - cantidad y total
  - El detalle expandido conserva datos operativos como:
    - tipo de producto
    - precio unitario
    - direccion de entrega
    - notas adicionales

- Regla practica:
  - En cards del carrito, la vista inicial debe responder a la pregunta “que es esto y cuanto cuesta” sin obligar a leer toda la ficha.
  - Los datos secundarios o largos deben ir al estado expandido, no eliminarse.
  - Si otra variante de item se agrega despues, conviene integrarla al patron `CompactCartCard` antes que crear otra card verbose independiente.

- Validacion realizada:
  - `get_errors` limpio en `components/carritoCompras/ListaPedidosRemesa.native.jsx`.

---

Resumen tecnico - Comercio debe distinguir permiso concedido de GPS apagado

- Hallazgo validado:
  - En Expo no basta con revisar `Location.getForegroundPermissionsAsync()` para decidir si comercio puede buscar tiendas cercanas.
  - Existe un caso real donde:
    - la app ya tiene permiso concedido
    - pero los servicios de ubicacion del dispositivo estan apagados
  - Si la UI solo mira `granted === true`, el aviso de ubicacion no aparece aunque comercio ya no pueda refrescar tiendas cercanas correctamente.

- Correccion aplicada:
  - `services/location/deviceLocationCache.native.js` ahora incluye `servicesEnabled` dentro de `getDeviceLocationPermissionState()` usando `Location.hasServicesEnabledAsync()`.
  - `components/productos/ProductosScreen.native.jsx` y `components/productos/ComercioHomeSection.native.jsx` muestran la card de acceso a ubicacion tambien cuando:
    - `locationPermissionState.servicesEnabled === false`

- Regla funcional importante:
  - Tener una ubicacion cacheada no debe ocultar el aviso de ubicacion apagada.
  - La cache puede servir para hidratar UI rapidamente, pero si el GPS del dispositivo esta apagado el usuario debe seguir viendo una card persistente para reactivar ubicacion o ir a configuracion.

- Regla practica:
  - En comercio distinguir siempre entre:
    - permiso de la app
    - servicios de ubicacion del dispositivo
  - Si el usuario reporta que no ve el componente de ubicacion apagada, revisar primero `servicesEnabled` y no solo `granted` o `locationError`.
  - `npx eslint --no-cache components/carritoCompras/ListaPedidosRemesa.native.jsx` con `EXIT:0`.

Notas adicionales - La card de comercio en carrito debe resumirse aun mas que el resto

- Criterio UX final validado:
  - En `COMERCIO`, la vista inicial no debe competir con el detalle operativo completo.
  - El resumen superior debe mostrar solo lo esencial de compra:
    - imagen del producto
    - nombre de lo comprado
    - cantidad
    - costo total

- Regla practica:
  - La descripcion del producto no debe quedarse visible en el resumen colapsado.
  - Si el usuario quiere ampliar informacion, la descripcion debe aparecer dentro del panel expandido junto con los demas datos secundarios.
  - La tienda tambien puede vivir en el detalle expandido si el objetivo del resumen es centrarse en “que compro el cliente y cuanto cuesta”.

---

Resumen tecnico - Step 5 del carrito sin scroll interno ni altura fija en el bloque de productos

- Problema detectado:
  - En `components/carritoCompras/WizardConStepper.native.jsx`, el paso `Pago` seguia usando un `ScrollView` propio y ademas envolvia `ListaPedidosRemesa` con `listWrapper.maxHeight = 300`.
  - Eso rompia la relacion visual correcta del layout: al expandir productos, el listado no se mostraba completo y el bloque de comisiones/totales no fluia naturalmente debajo.

- Correccion aplicada:
  - El paso `Pago` dejo de renderizarse dentro de un `ScrollView` interno.
  - Ahora usa un contenedor normal de flujo (`stepPayFlowContainer`) para que los componentes se apilen en orden natural.
  - `listWrapper` dejo de usar `maxHeight` y quedo con `position: 'relative'` y `overflow: 'visible'`.

- Regla funcional/visual validada:
  - En el step 5, el orden correcto siempre debe ser:
    - productos comprados
    - total de comisiones
    - resumen/final total a pagar
  - Ninguno de esos bloques debe depender de una altura fija artificial en el listado.
  - Si una card de producto se expande, el bloque de comisiones y el total deben correrse hacia abajo dentro del mismo flujo relativo, no quedar atrapados en una sub-superficie scrolleable.

- Regla practica:
  - No reintroducir `ScrollView` interno solo para el paso `Pago` si el objetivo es que el listado y los totales mantengan continuidad visual.
  - No volver a usar `maxHeight` en el wrapper de `ListaPedidosRemesa` dentro del step 5.
  - Si hace falta ajustar el comportamiento visual del paso, hacerlo con layout relativo y espaciado, no con recortes de altura del bloque de productos.

Notas adicionales - El listado del carrito tambien debe poder renderizarse sin su propio ScrollView

- Hallazgo importante:
  - No bastaba con quitar el `ScrollView` de `WizardConStepper.native.jsx` en el paso `Pago`.
  - `components/carritoCompras/ListaPedidosRemesa.native.jsx` seguia renderizando internamente un `ScrollView` con un contenedor que antes ocupaba todo el alto disponible, por lo que el listado seguia tapando o empujando fuera de vista las cards de comisiones y total.

- Correccion aplicada:
  - `ListaPedidosRemesa.native.jsx` ahora acepta `useScroll`.
  - En contexts normales puede seguir usando scroll propio.
  - En el step 5 se debe invocar como:
    - `ListaPedidosRemesa items={pedidosRemesa} useScroll={false}`

- Regla practica:
  - Si un listado reutilizable se monta dentro de otra superficie compuesta que ya necesita flujo vertical natural, ese listado debe poder renderizarse como `View` simple y no forzar siempre `ScrollView` interno.

Notas adicionales - El step 5 si necesita scroll, pero a nivel del contenedor completo

- Hallazgo final:
  - Quitar el `ScrollView` interno del bloque de productos era correcto, pero dejar el paso `Pago` completamente sin scroll hacia imposible ver todos los componentes cuando el contenido total excedia la altura del modal.

- Correccion aplicada:
  - `WizardConStepper.native.jsx` mantiene el paso 5 dentro de un `ScrollView` externo del paso completo.
  - Dentro de ese scroll, `ListaPedidosRemesa` se renderiza con `useScroll={false}` para que:
    - los productos crezcan completos
    - comisiones quede debajo
    - total quede debajo de comisiones
    - todo el conjunto pueda desplazarse como una sola columna

- Regla practica:
  - En el checkout del step 5, el scroll correcto es del contenedor total del paso, no del listado interno de productos.
  - Si vuelve a faltar visibilidad del total o de comisiones, revisar primero esta jerarquia:
    - `ScrollView` externo del step
    - `ListaPedidosRemesa` sin scroll interno

Notas adicionales - El step 5 debe separar visualmente productos y bloque financiero

- Ajuste UX validado:
  - En `components/carritoCompras/WizardConStepper.native.jsx`, entre el listado de productos y las cards de comisiones/total conviene renderizar un separador visual propio.
  - El patron aprobado fue:
    - `Divider` horizontal
    - pill/label centrado encima del divider
    - copy breve tipo `Resumen de costos y pago`

- Regla practica:
  - En el paso `Pago`, los productos y el bloque financiero deben percibirse como dos secciones distintas aunque formen parte del mismo flujo vertical.
  - Si se retoca esa pantalla, mantener una separacion visual clara entre:
    - productos comprados
    - comisiones
    - total / pago

- Validacion realizada:
  - `get_errors` limpio en `components/carritoCompras/WizardConStepper.native.jsx`.
  - `npx eslint --no-cache components/carritoCompras/WizardConStepper.native.jsx` con `EXIT:0`.

---

Resumen tecnico - Step 5 del carrito con cabeceras visuales para ambas secciones principales

- Ajuste UX aplicado:
  - En `components/carritoCompras/WizardConStepper.native.jsx`, el paso `Pago` ahora usa el mismo patron visual de separador para las dos zonas importantes del flujo:
    - antes del bloque de productos
    - antes del bloque financiero de comisiones y total

- Patron validado:
  - `Divider` horizontal
  - pill centrado superpuesto
  - copy corto por seccion, por ejemplo:
    - `Productos comprados`
    - `Resumen de costos y pago`

- Regla practica:
  - Si el step 5 sigue creciendo en contenido, mantener estas cabeceras como puntos de lectura rapida para que el usuario distinga de inmediato:
    - que compro
    - cuanto se le cobrara
  - No reemplazar este patron por titulos sueltos sin separador, porque se pierde la jerarquia visual ya aprobada para el checkout.

---

Resumen tecnico - Card de recarga en carrito con resumen minimo y beneficios en detalle

- Ajuste UX aplicado en `components/carritoCompras/ListaPedidosRemesa.native.jsx`:
  - El card `RECARGA` ya no debe usar el bloque superior para mostrar el texto completo de beneficios o descripcion comercial.
  - El resumen visible queda limitado a cuatro piezas rapidas:
    - numero
    - cliente
    - precio
    - estado de promocion (`Con promoción` / `Sin promoción`)

- Criterio funcional validado:
  - Los beneficios de la recarga siguen viniendo de `item.comentario` desde el flujo Cubacel.
  - Ese contenido no se elimina; se mueve al panel expandido como `Beneficios`.
  - El estado de promocion se deriva del producto asociado, revisando `item.producto.promotions` de forma defensiva porque puede no venir siempre como array limpio.

- Regla practica:
  - En cards de carrito para recargas, el resumen inicial debe responder solo a lo esencial de compra y no competir con el detalle comercial.
  - Si existe copy promocional largo o beneficios multilinea, mostrarlo solo dentro de `Ver más detalles`.

---

Resumen técnico – `BlurView.tint` en Expo acepta enums, no colores hex/RGBA

- Problema detectado:
  - En Android la app podía romper al abrir menús con blur con un error similar a:
    - `Cannot set prop 'tint' on view 'class expo.modules.blur.ExpoBlurView'`
  - La causa fue pasar colores tipo `#f5f7ff8b` o `#5a58c559` al prop `tint` de `BlurView`.

- Causa raíz validada:
  - En `expo-blur`, el prop `tint` no acepta un color arbitrario; espera un valor enum como:
    - `light`
    - `dark`
    - `default`
  - En este proyecto, los menús estaban reutilizando constantes visuales de glass (`LIGHT_MENU_GLASS_TINT`, `DARK_MENU_GLASS_TINT`) como si fueran válidas para `BlurView.tint`.

- Corrección aplicada:
  - En superficies como `MenuHeader.jsx` y `MenuIconMensajes.native.js`, el blur debe usar:
    - `tint={theme.dark ? 'dark' : 'light'}`
  - Los colores hex/RGBA deben quedarse solo en capas visuales como:
    - `backgroundColor`
    - overlays
    - bordes

- Regla práctica:
  - No reutilizar colores de diseño como valor de `BlurView.tint`.
  - Si se quiere mantener identidad cromática del popup o header, combinar:
    - `BlurView` con `tint` válido
    - `backgroundColor` translúcido por encima o en la misma superficie
  - Si reaparece un crash parecido en Expo Android, revisar primero todos los `BlurView` que reciban props dinámicos desde constantes de tema o glass.

---

Resumen técnico – Chips de estado de ventas alineados en una sola fila

- Ajuste UX aplicado en `components/ventas/VentasList.native.jsx`:
  - El chip `Sin confirmar al admin` / `Confirmado al admin` ya no se renderiza en una fila separada.
  - Ahora vive en la misma fila visual que el estado principal de cobro (`Pagado` / `Pendiente`) dentro del header de la card.

- Criterio visual validado:
  - Ambos chips representan estado operativo de la venta, así que deben leerse juntos y no como bloques independientes.
  - El patrón correcto para esta card es:
    - bloque izquierdo: tipo + fecha
    - bloque derecho: chips de estado en la misma línea o wrap natural si falta espacio

- Ajuste de estilo aplicado:
  - Los chips de estado pasaron a usar un radio más alto tipo pill (`borderRadius: 999`) para una lectura más suave y moderna.

- Regla práctica:
  - Si una card administrativa muestra varios estados de la misma entidad, agruparlos en la misma fila visual mejora jerarquía y reduce ruido vertical.
  - Cuando se busque un look más elegante en chips de estado, preferir radio alto tipo pill antes que bloques rectangulares con esquinas apenas redondeadas.

---

Resumen técnico – Cards de ventas en grilla responsiva con comportamiento por ancho

- Ajuste UX aplicado en `components/ventas/VentasList.native.jsx`:
  - El listado de ventas dejó de depender de una sola columna rígida.
  - Ahora calcula una grilla responsiva por ancho de pantalla y permite:
    - 1 columna en móvil
    - 2 columnas en anchos intermedios
    - 3 columnas en pantallas amplias

- Patrón técnico validado:
  - Se centralizó el cálculo en un helper `getVentasGridLayout(windowWidth)`.
  - El helper resuelve:
    - cantidad de columnas
    - ancho útil por card
    - gap entre cards
    - si la card debe entrar en modo compacto

- Ajustes de UX dentro de cada card:
  - En cards angostas:
    - header y fila de chips toleran mejor el wrap
    - la botonera inferior pasa a columna
    - los estados siguen siendo legibles sin apretar el contenido
  - En cards amplias se conserva el layout más horizontal y editorial.

- Regla práctica:
  - Si una pantalla administrativa debe funcionar bien en teléfono, tablet y ventanas amplias, no dejar el card siempre a ancho completo.
  - La forma profesional en Expo es calcular columnas y activar variantes compactas del layout cuando el ancho real del card baja de cierto umbral, en lugar de depender solo de `flexWrap` sin control.

---

Resumen técnico – User cards minimalistas con Peek & Pop en `UsersHome.native.js`

- Objetivo aplicado:
  - El card de usuario en `components/users/UsersHome.native.js` dejó de ser una fila simple y pasó a una superficie más editorial, pero manteniendo lectura rápida y sin abandonar `ServiceProgressPill`.
  - Se añadió interacción secundaria tipo Peek & Pop por `onLongPress`, con menú inferior blur y tres acciones reales.

- Criterio visual validado:
  - El card debe concentrar primero identidad y estado, luego servicios.
  - La jerarquía final aprobada fue:
    - avatar + nombre + username
    - estado de conexión
    - meta pills compactas (`Administrador/Usuario`, `Telegram activo/vinculado/sin Telegram`)
    - resumen corto de estado de VPN y Proxy
    - `ServiceProgressPill` para consumo detallado
    - footer mínimo con hints de interacción

- Peek & Pop implementado:
  - La interacción se abre con `measureInWindow(...)` sobre el card real para posicionar un clon flotante dentro de `Portal`.
  - El overlay usa:
    - backdrop con opacidad animada
    - card elevado animado con `scale` + `translateY`
    - bandeja inferior con `BlurView`
  - Acciones rápidas actuales:
    - `Ver perfil`
    - `Enviar mensaje`
    - `Copiar usuario`

- Decisiones técnicas importantes:
  - El card visible y el card flotante del peek comparten el mismo renderer (`UserCardContent`) para evitar drift visual entre ambos estados.
  - La apertura del peek se resolvió en el screen, no dentro de `FlatList`, para mantener una sola fuente de verdad del overlay activo.
  - La acción de copiar reutiliza `expo-clipboard` y feedback con `Alert`, evitando introducir un sistema adicional de toast solo para esta acción.
  - El `BlurView` del menú usa `tint={theme.dark ? 'dark' : 'light'}` y `experimentalBlurMethod="dimezisBlurView"` en Android, consistente con el patrón ya validado en el proyecto.

- Regla práctica:
  - Si un listado móvil necesita más acciones sin ensuciar el layout principal, usar tap corto para navegación primaria y long press para menú contextual.
  - Si el peek muestra un clon del card, ese clon debe renderizar la misma composición visual del card base; no conviene crear una segunda versión "parecida".
  - En cards de usuarios o entidades operativas, primero mostrar estado y resumen utilizable; los accesos secundarios deben vivir en el peek, no en una hilera de botones permanentes.

---

Resumen técnico – `MapaTiendaCardBackground` con modo fill para ocupar todo el alto del `StoreCard`

- Ajuste aplicado:
  - `components/empresa/maps/MapaTiendaCardBackground.native.jsx` ahora soporta `fill` para comportarse como fondo full-height del card.
  - Cuando `fill === true`, el wrapper usa `flex: 1` y el `MapView` deja de depender de `minHeight` fijo.
  - `components/empresa/screens/MisTiendasScreen.native.jsx` ya consume ese modo con `fill` en lugar de pasar una altura intermedia manual.

- Criterio visual validado:
  - Si el mapa es el hero del `StoreCard`, no debe quedarse con una altura parcial mientras el resto del contenido sigue creciendo encima.
  - El mapa debe ocupar todo el alto real del card y actuar como lienzo de fondo completo, igual que la imagen en `ProductoCard`.

- Regla práctica:
  - Si una superficie usa `MapaTiendaCardBackground` como fondo completo del card, preferir `fill` en lugar de pasar `height="100%"` o `minHeight` mezclados desde el padre.
  - Reservar `height` fijo solo para contextos donde el mapa realmente deba renderizarse como bloque parcial y no como hero full-bleed.

---

Resumen técnico – `StoreCard` con altura estable para descripciones de hasta 3 líneas

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` ahora reserva altura real para el bloque editorial del card de tienda.
  - La descripción quedó limitada a `3` líneas visibles y con `minHeight` fijo para que una tienda con copy corto no rompa la composición frente a otra con copy más largo.
  - También se aumentó ligeramente la `minHeight` del hero para que el card respire bien incluso cuando usa las 3 líneas completas.

- Criterio visual validado:
  - En este módulo, el card no debe verse “encogido” cuando la descripción ocupa 1 línea ni “forzado” cuando ocupa 3.
  - La composición correcta es reservar el espacio editorial y mantener estable la relación entre:
    - badge superior
    - título y descripción
    - bloque de productos
    - panel de estado
    - nota operativa inferior

- Regla práctica:
  - Si se vuelve a ajustar el copy visible del `StoreCard`, primero modificar la altura reservada del bloque de texto antes de tocar toda la geometría del card.
  - Para cards de tienda con layout editorial, la estabilidad visual debe salir de `minHeight` y límites de líneas, no de dejar que cada descripción cambie libremente la altura del componente.

---

Resumen tecnico - `react-native-vlc-media-player` muta `source` y rompe en React Native moderno

- Problema detectado:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` estaba pasando `source` a `VLCPlayer` sin errores propios de lint, pero el runtime lanzaba:
    - `You attempted to set the key isNetwork with the value true on an object that is meant to be immutable and has been frozen`
  - La causa real no estaba en la pantalla sino dentro de:
    - `node_modules/react-native-vlc-media-player/VLCPlayer.js`
  - Ese componente muta directamente el prop recibido:
    - `source.isNetwork = ...`
    - `source.autoplay = ...`
    - `source.initOptions.push(...)`

- Causa raiz validada:
  - En el stack actual (`React 19` + `React Native 0.81`), el objeto recibido por props puede llegar congelado/inmutable.
  - Si una libreria de tercero intenta escribir sobre ese objeto en render, el fallo aparece inmediatamente aunque el componente padre no este mutando nada.

- Correccion aplicada:
  - Se parcheo `node_modules/react-native-vlc-media-player/VLCPlayer.js` para clonar el `source` resuelto antes de modificarlo.
  - La copia tambien normaliza `initOptions` como array mutable nuevo y deja de reutilizar el array original.

- Persistencia del parche:
  - Se creo el script:
    - `scripts/patch-vlc-media-player.js`
  - `package.json` ahora lo ejecuta en `postinstall` junto al patch ya existente del proyecto.
  - El script es idempotente: si detecta el parche aplicado, no vuelve a tocar el archivo.

- Validacion realizada:
  - `node ./scripts/patch-vlc-media-player.js` -> `Parche ya aplicado.`
  - `npx eslint --no-cache scripts/patch-vlc-media-player.js components/downloadVideos/PeliculaPlayer.native.jsx` sin errores.

- Regla practica:
  - Si una libreria RN de tercero muta `props` en runtime, no intentar compensarlo desde la pantalla con mas `useMemo` o clones parciales; el arreglo correcto esta en el paquete que hace la mutacion.
  - Si el proyecto depende de un hotfix en `node_modules`, dejar siempre un `postinstall` reproducible para que el arreglo sobreviva a reinstalaciones.
  - El warning de UIKit/MobileVLCKit sobre `VLCOpenGLES2VideoView` apunta a internals nativos de VLC en iOS y es un problema distinto del crash por objeto congelado; no mezclar ambos diagnosticos.

---

Resumen técnico – Safe area real en drawers de Expo

- Ajuste aplicado:
  - `components/drawer/DrawerOptionsAlls.js`, `components/cadete/CadeteDrawerContent.native.jsx` y `components/empresa/EmpresaDrawerContent.native.jsx` ahora respetan safe area real del dispositivo.
  - Los drawers se envolvieron con `SafeAreaView` usando `edges={["top", "bottom", "left"]}` para evitar contenido bajo la hora, la Dynamic Island o la zona inferior del sistema.
  - Además se añadió padding inferior dinámico con `useSafeAreaInsets()` en el `ScrollView` y en los footers para que botones y bloques finales no queden pegados al home indicator.

- Criterio UX validado:
  - En drawers laterales no basta con reservar solo `top`; el contenido largo y las acciones finales también deben respirar respecto al borde inferior.
  - El inset lateral izquierdo también debe contemplarse como parte del layout seguro del drawer, especialmente en dispositivos con esquinas redondeadas o futuras variaciones de ventana.

- Regla práctica:
  - Si un drawer Expo monta header, scroll y footer propios, aplicar safe area al contenedor completo y no confiar en paddings fijos dispersos.
  - Si existe footer persistente dentro del drawer, sumar `insets.bottom` también en esa zona y no solo en el cuerpo scrolleable.

  ***

  Resumen tecnico - Runtime HLS publico consumido desde Expo sin login del servicio
  - Ajuste aplicado:
    - El panel HLS del cliente Expo ya no depende de una sesion administrativa del servicio HLS.
    - `components/hls/HlsAdminScreen.native.jsx` ahora consume:
      - `${baseUrl}/api/runtime`
        en lugar de:
      - `${baseUrl}/admin/api/runtime`
    - La llamada ya no usa `credentials: 'include'` ni CTA a `/admin/login`.

  - Contrato funcional validado:
    - El servicio HLS expone el runtime publico con el mismo shape operativo que ya usaba la app.
    - La normalizacion sigue saliendo de:
      - `components/hls/hlsRuntimeUtils.js`
    - Por tanto, el cambio en mobile es de ruta y acceso, no de modelo de datos.

  - Variantes afectadas:
    - Implementacion nativa real:
      - `components/hls/HlsAdminScreen.native.jsx`
    - Variante preview/web dentro del repo mobile:
      - `components/hls/HlsAdminScreen.jsx`
    - Ambas deben usar el endpoint publico y no mostrar mensajes de sesion protegida del servicio.

  - Regla de acceso en la app:
    - Que el endpoint sea publico no elimina el gate administrativo local de la pantalla.
    - La superficie HLS dentro de Expo sigue siendo una herramienta de administracion y debe mantenerse restringida por rol/admin en la propia UI.

  - Regla practica:
    - Si otra pantalla Expo necesita leer estado del servicio HLS, debe consumir `/api/runtime` directamente.
    - No volver a agregar manejo especial de `401/403` o login HLS dentro de la app mientras el contrato publico del runtime siga vigente.

---

Resumen técnico – `ServiceProgressPill` más compacto y con fondo visual moderno en `UsersHome.native.js`

- Ajuste aplicado:
  - El card de usuario se compactó principalmente reduciendo la huella visual de `ServiceProgressPill` y los espacios que lo rodean.
  - La lógica funcional del pill no cambió:
    - sigue usando `ratio`
    - sigue usando `label`
    - sigue usando `rightText`
    - sigue respetando el color principal definido por `palette.fill` o por `getUsageTone(...)`

- Cambio visual validado:
  - El fondo del pill ya no depende de un bloque plano de color track.
  - Ahora se compone con capas suaves:
    - base teñida usando el color principal con alpha
    - glow lateral sutil
    - fill de progreso translúcido
    - chip superior con tinte derivado del mismo color
  - Esto mantiene la semántica del progreso pero da una lectura más premium y menos pesada.

- Compactación aplicada alrededor del pill:
  - menor altura del pill
  - menor padding horizontal interno
  - tipografías ligeramente más pequeñas en chip y valor
  - menor gap entre pills
  - reducción de paddings/gaps del card para que el bloque de servicios no domine tanto la superficie completa

- Decisión técnica importante:
  - Se añadió un helper local `hexToRgba(...)` para derivar capas visuales desde el color principal del servicio sin duplicar colores hardcodeados por estado.
  - Ese helper permite construir fondos modernos manteniendo coherencia con el color funcional del servicio.

- Regla práctica:
  - Si un pill de progreso ya comunica bien la lógica, conviene modernizar primero sus capas visuales y su densidad antes de reescribir el componente completo.
  - En este proyecto, para pills informativos compactos, el patrón recomendado es:
    - base translúcida
    - fill suave
    - chip discreto
    - texto alineado a la derecha
  - Si luego se reutiliza este patrón en otras pantallas, conservar la lógica del ratio y solo variar la densidad o la paleta según el contexto.

---

Resumen técnico – `ServiceProgressPill` extraído como componente compartido para Users y Proxy/VPN

- Alcance aplicado:
  - El pill de progreso dejó de vivir solo dentro de `components/users/UsersHome.native.js`.
  - Ahora existe un componente compartido en:
    - `components/shared/ServiceProgressPill.jsx`
  - Ya se reutiliza desde:
    - `components/users/UsersHome.native.js`
    - `components/proxyVPN/ProxyVPNPackagesHorizontal.native.jsx`

- Contrato visual preservado:
  - El componente compartido mantiene:
    - `label`
    - `ratio`
    - `rightText`
    - `palette`
    - `width`
  - La lógica de tono por consumo (`ok / warn / danger`) sigue centralizada dentro del propio pill y no en cada pantalla consumidora.

- Decisiones técnicas importantes:
  - El componente resuelve internamente `theme.dark` con `useTheme()` para que la misma API funcione igual en superficies claras y oscuras.
  - Se soportan tanto paletas con `fill` fijo como paletas con claves por estado (`ok`, `warn`, `danger`), de modo que Users y Proxy/VPN no necesiten wrappers distintos.
  - El helper `hexToRgba(...)` se movió al componente compartido para evitar duplicar derivación de capas visuales en varias pantallas.

- Regla práctica:
  - Si otra pantalla necesita mostrar consumo o progreso de servicio con este mismo lenguaje visual, debe importar `components/shared/ServiceProgressPill` y no volver a redefinir un pill local.
  - Si se desea ajustar densidad, glow, fondo o chip del pill, hacerlo primero en el componente compartido para mantener consistencia visual global.

---

Resumen técnico – Color progresivo real por porcentaje en `ServiceProgressPill`

- Ajuste aplicado:
  - El color del fill ya no cambia solo por tramos rígidos de estado.
  - Ahora el componente interpola color de forma progresiva según el porcentaje exacto de `ratio`.

- Comportamiento visual final:
  - 10%, 15% y 20% ya no comparten exactamente el mismo color.
  - De 0 a 75% el fill progresa gradualmente dentro de la familia `ok`.
  - De 75 a 90% transiciona de `ok` a `warn`.
  - De 90 a 100% transiciona de `warn` a `danger`.

- Decisión técnica importante:
  - Se añadieron helpers de mezcla de color (`hexToRgb`, `rgbToHex`, `mixHexColors`) dentro del componente compartido.
  - La interpolación se hace sobre hex base de la paleta recibida, así que el comportamiento sigue siendo compatible con paletas distintas para Proxy y VPN.

- Regla práctica:
  - Si un indicador de progreso necesita transmitir consumo gradual, evitar thresholds visuales demasiado bruscos cuando el requerimiento de UX pide sensibilidad fina por porcentaje.
  - Si se ajustan colores de `ok/warn/danger`, revisar el componente compartido porque la interpolación ahora depende directamente de esos colores base.

---

Resumen técnico – `ProductoCard` de empresa con imagen integrada como fondo del card

- Ajuste aplicado:
  - `components/empresa/components/ProductoCard.native.jsx` dejó de separar visualmente la imagen del resto del contenido.
  - La imagen del producto ahora funciona como superficie hero/fondo del card completo y los elementos principales viven dentro de esa misma zona visual:
    - chip de disponibilidad
    - menú de acciones
    - nombre del producto
    - descripción
    - precio
    - resumen de disponibilidad
    - observaciones

- Decisión técnica importante:
  - No se cambió el contrato de obtención de imagen.
  - `components/empresa/components/ProductoImage.native.jsx` sigue resolviendo la media con `Meteor.call('findImgbyProduct', productoId, ...)`.
  - Solo se amplió el componente para soportar modo `fill`, permitiendo reutilizar la misma fuente de verdad como capa full-bleed dentro del card.

- Criterio UX validado:
  - En este módulo empresa, la imagen debe sentirse como parte del producto y no como un bloque aislado.
  - Si el card necesita comunicar disponibilidad, precio y contexto comercial rápido, conviene integrar esos overlays sobre el hero visual en lugar de dividir foto y contenido en dos secciones desconectadas.

- Regla práctica:
  - Si se vuelve a tocar este card, preservar primero la integración visual de la imagen como fondo antes de reintroducir layouts partidos tipo `media + info`.
  - Si la imagen falla o no existe, el fallback debe seguir viviendo en `ProductoImage` y no duplicarse dentro del card.

---

Resumen técnico – `StoreCard` de Mis Tiendas con hero más comercial y CTA más claro

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` mejoró el card de tienda sin cambiar su lógica de datos.
  - El bloque superior con `MapaTiendaCardBackground` se mantuvo como hero del negocio, pero ahora incorpora mejor jerarquía visual:
    - estado de ubicación listo/revisar
    - menú contextual
    - nombre de tienda
    - contador de productos en pill dentro del hero

- Mejora de contenido inferior:
  - El cuerpo del card se simplificó para que primero comunique el estado operativo de la tienda (`Catálogo disponible` / `Lista para publicar`) y luego la ubicación.
  - El CTA inferior pasó a una acción más clara y comercial: `Abrir tienda`.

- Regla práctica:
  - En cards de tiendas para Expo, el mapa debe sentirse como cabecera visual de la tienda y no solo como decoración.
  - Si una card necesita mostrar métrica, estado y acceso rápido, priorizar una sola narrativa visual compacta en lugar de sumar chips sueltos sin jerarquía.

---

Resumen técnico – `TextInput` de búsqueda en header de `FlatList` no debe remount en iOS

- Problema detectado:
  - En `components/empresa/screens/TiendaDetailScreen.native.jsx`, el buscador vivía dentro del header de un `FlatList` y al escribir en iOS el teclado se cerraba tras cada caracter.

- Causa raíz validada:
  - El header se estaba regenerando como función en cada render de la pantalla.
  - En este contexto, el `TextInput` puede perder foco por remount del `ListHeaderComponent`, especialmente en iOS.

- Corrección aplicada:
  - El header pasó a renderizarse como elemento memoizado (`useMemo`) y se entrega a `ListHeaderComponent` como nodo estable, no como callback recreado en cada pulsación.

- Regla práctica:
  - Si un `TextInput` vive dentro del header de un `FlatList` o `SectionList` y pierde foco al escribir, revisar primero si el header se está remontando por identidad inestable del componente.
  - En este proyecto, para headers con inputs interactivos conviene memoizar el elemento del header o extraerlo a un componente estable antes de depurar el teclado.

---

Resumen tecnico - Card de carga de Mensajes responsivo y centrado

- Problema detectado:
  - En `components/mensajes/MensajesHome.native.js`, el estado `Cargando conversacion` se veia desproporcionado en pantallas anchas/horizontal.
  - El contenedor ocupaba correctamente toda la superficie, pero la card tenia `maxWidth` demasiado bajo (`360`), quedando visualmente pegada hacia un lado dentro de una zona amplia.

- Correccion aplicada:
  - Se agrego `LOADING_CARD_MAX_WIDTH` calculado desde `SCREEN_WIDTH` para que el card escale mejor entre telefono vertical y landscape/tablet.
  - El `loadingCard` conserva `width: '100%'`, pero ahora su `maxWidth` puede crecer hasta un limite profesional sin volverse excesivo.
  - El wrapper de carga mantiene `alignItems: 'center'` y `justifyContent: 'center'`, con padding horizontal un poco mas amplio para que el centrado se perciba limpio.

- Regla practica:
  - En estados vacios o de carga que viven dentro de superficies full-screen, no usar `maxWidth` fijo pensado solo para telefono vertical.
  - Calcular anchos maximos responsivos cuando la misma pantalla puede verse en iPad, tablet o landscape.
  - Si una card parece descentrada dentro de un contenedor amplio, revisar primero el `maxWidth` antes de tocar la logica de carga o la suscripcion Meteor.

---

Resumen técnico – `StoreCard` final con mapa full-hero y contenido completo dentro del mismo lienzo

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` dejó de usar una estructura separada de `mapa arriba + contenido abajo + acciones aparte`.
  - El mapa ahora funciona como componente padre visual del card completo y todo lo demás vive como overlays internos:
    - estado de ubicación
    - menú contextual
    - nombre de tienda
    - contador de productos
    - estado operativo
    - coordenadas
    - CTA `Abrir tienda`

- Criterio UX validado:
  - Para que el card de tiendas se sienta al nivel del card de producto, el hero visual no debe quedar aislado de la información útil.
  - La composición correcta es una sola superficie inmersiva donde el mapa aporte identidad del negocio y el contenido comercial quede integrado encima.

- Hallazgo técnico adicional:
  - Durante el ajuste apareció una contaminación accidental en estilos (`dialogContent` con props absolutas heredadas de otro bloque).
  - En pantallas con muchos estilos locales, después de refactors grandes conviene revisar el bloque `StyleSheet.create(...)` completo y no solo el JSX visible.

- Regla práctica:
  - Si un card usa mapa o media como hero principal, evitar repartir el contenido importante en secciones separadas debajo salvo que sea estrictamente necesario.
  - En este módulo empresa, el patrón aprobado queda así:
    - hero full-bleed
    - scrim/fade para legibilidad
    - contenido comercial dentro del mismo hero
    - CTA integrado en la misma superficie

---

Resumen técnico – `StoreCard` refinado con identidad comercial más útil y menos cajas internas

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` dejó de apoyarse en varios bloques blancos grandes dentro del mapa.
  - La información del negocio ahora se resume en una sola narrativa más comercial dentro del hero:
    - especialidad del local
    - nombre de la tienda
    - cantidad de productos
    - descripción breve
    - estado operativo
    - antigüedad de la tienda
    - coordenadas
    - CTA principal

- Datos reales considerados:
  - Las tiendas del proyecto traen por defecto:
    - `title`
    - `descripcion`
    - `coordenadas`
    - `createdAt`
    - `pinColor`
  - A partir de esos campos, el card ahora aprovecha mejor:
    - `pinColor` como acento visual
    - `createdAt` para mostrar contexto tipo `Activa desde ...`
    - `title` + `descripcion` para derivar una firma comercial simple (`Pizzería`, `Sabores cubanos`, `Cocina regional`, etc.)

- Criterio UX validado:
  - En cards de tiendas, las coordenadas no deben competir como bloque principal con la identidad del negocio.
  - La especialidad del local y su estado operativo aportan más valor inicial que una caja grande solo para `Operación actual` o una pill sobredimensionada de lat/lng.
  - Si el mapa ya es el fondo completo del card, conviene reducir el número de paneles sólidos para no lavar la imagen.

- Regla práctica:
  - Si se vuelve a iterar este card, primero ajustar la jerarquía del contenido antes de añadir más chips o más overlays.
  - El mapa debe seguir leyéndose claramente detrás del contenido; si el card vuelve a verse demasiado blanco o plano, revisar primero la opacidad del fade y la cantidad de contenedores internos.

---

Resumen técnico – Fade in escalonado al expandir secciones de usuarios

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` ahora anima cada `UserListCard` cuando una sección expandida monta su `FlatList`.
  - La animación vive dentro del propio card para aprovechar que la lista se desmonta al colapsar y se vuelve a montar al expandirse.

- Patrón implementado:
  - Se pasa `index` desde `renderItem` hacia `UserListCard`.
  - Cada card crea dos `Animated.Value` locales:
    - `fadeOpacity` iniciando en `0`
    - `fadeTranslateY` iniciando en `10`
  - En `useEffect` del card se ejecuta una animación paralela con delay escalonado por índice:
    - `opacity: 0 -> 1`
    - `translateY: 10 -> 0`

- Criterio técnico validado:
  - No conviene animar el contenedor completo de la sección si se quiere que cada item entre de forma más elegante y progresiva.
  - Como el `FlatList` solo se renderiza cuando `expanded === true`, montar la animación por item da naturalmente el efecto de entrada cada vez que la sección se vuelve a expandir.

- Regla práctica:
  - Si en esta pantalla se agregan nuevas variantes de card o secciones adicionales, mantener la animación de entrada en el nivel del item y seguir pasando `index` desde `renderItem` para conservar el stagger visual.

---

Resumen técnico – Peek de usuarios debe ocultar el card fuente con placeholder, no solo con opacidad

- Problema detectado:
  - En `components/users/UsersHome.native.js`, al abrir el Peek & Pop por long press todavía podía percibirse el card original detrás del overlay.
  - Ocultarlo solo con `opacity: 0` no daba la sensación correcta de que el componente “se traslada”; visualmente seguía existiendo una referencia del card fuente en la lista.

- Solución aplicada:
  - Se añadió `peekSourceId` en el screen para identificar explícitamente el item que originó el peek.
  - `UserListCard` ahora recibe `hidden` por ese `peekSourceId`, no por la presencia del overlay.
  - Cuando el card está oculto, ya no se renderiza el `Surface` original; se reemplaza por un placeholder transparente del mismo alto medido con `onLayout`.

- Patrón implementado:
  - `onPeekStart(item)` se dispara desde el long press antes de abrir el overlay.
  - El card guarda su altura real en estado local (`cardHeight`).
  - Mientras ese item es la fuente activa del peek, se renderiza:
    - `View` transparente
    - mismo espacio vertical
    - sin contenido visual ni shadow residual

- Regla práctica:
  - Si un overlay debe dar sensación de “movimiento” desde un item de lista, no basta con bajar la opacidad del item fuente.
  - Lo correcto es sustituir temporalmente el componente original por un placeholder que conserve layout pero elimine por completo su presencia visual.

Notas adicionales – El traslado del peek debe sincronizar source y overlay, no cortar uno antes que entre el otro

- Hallazgo práctico:
  - Ocultar el card fuente demasiado pronto hace que el efecto se perciba intermitente o como un corte, no como un traslado continuo.
  - El origen y el clon flotante deben convivir brevemente en el mismo lugar mientras el overlay toma protagonismo.

- Ajuste aplicado:
  - `UsersHome.native.js` ahora deja el card fuente visible al inicio del peek y lo desvanece con `peekProgress`.
  - El overlay flotante también usa `peekProgress` para entrar con opacidad, escala y elevación progresivas.
  - El menú inferior se retrasa un poco más para que primero se lea el “despegue” del card y luego aparezcan las acciones.

- Regla práctica:
  - Si se quiere un efecto real de traslado, sincronizar siempre:
    - fade out del card fuente
    - fade in del card flotante
    - pequeño cambio de escala/translate del overlay
  - No esconder el origen antes de que el clon ya esté visible sobre la misma posición.

---

Resumen técnico – Inset horizontal de 16px para cards de usuarios en modo una columna

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` ahora aplica `paddingHorizontal: 16` al contenedor expandido de la sección solo cuando el layout resuelve una sola card por fila.

- Criterio visual validado:
  - En modo teléfono o cualquier escenario de una sola columna, las cards no deben quedar pegadas al borde interno de la sección.
  - Cuando la lista entra en modo grilla con varias columnas, ese inset extra ya no se aplica para no comprimir innecesariamente el ancho útil de cada card.

- Regla práctica:
  - Si se vuelve a ajustar la densidad horizontal de `UsersHome`, mantener este criterio:
    - una columna -> inset lateral explícito para respiración visual
    - varias columnas -> sin inset adicional en `sectionContent`, dejando que el ancho útil se lo repartan las cards del grid

---

Resumen técnico – Chip de usuarios basado en `push_tokens` en vez de Telegram

- Cambio aplicado:
  - En `components/users/UsersHome.native.js`, el segundo meta pill del card ya no muestra estado de Telegram.
  - Ahora muestra estado de notificaciones push usando la colección `push_tokens`.

- Estructura confirmada desde backend (`react-download/server/metodos/mensajeriaPush.tsx`):
  - `push_tokens` guarda al menos:
    - `userId`
    - `token`
    - `platform`
    - `provider`
    - `deviceId`
    - `updatedAt`
    - `createdAt`
  - El flujo vigente del proyecto conserva solo tokens `provider: 'expo'` como fuente de verdad activa para push.

- Integración aplicada en Expo:
  - Se añadió `PushTokens` a `components/collections/collections.js` como dependencia ya existente del módulo.
  - `UsersHome.native.js` ahora suscribe `push_tokens` filtrando por:
    - `userId: { $in: userIdsVisibles }`
    - `provider: 'expo'`
  - El card calcula `hasPush` por usuario buscando tokens Expo asociados a su `_id`.

- Regla visual aplicada:
  - Con tokens Expo registrados:
    - label `Push activo` o `Push N disp.`
    - paleta verde
  - Sin tokens:
    - label `Sin push`
    - paleta neutra

- Regla práctica:
  - Si otra pantalla necesita saber si un usuario tiene push habilitado, no inferirlo desde flags del perfil ni desde Telegram.
  - La fuente de verdad actual es la existencia de documentos en `push_tokens` con `provider: 'expo'`.

Notas adicionales – Filtro de usuarios con push usando la misma fuente `push_tokens`

- Ajuste aplicado:
  - `components/users/UsersHome.native.js` ahora incluye `filtroPush` junto a VPN, Proxy y conexión.
  - El panel de filtros expone tres estados:
    - `Push: Todos`
    - `Push Activo`
    - `Sin Push`

- Criterio técnico:
  - El filtro no usa campos del perfil del usuario.
  - Reutiliza `getPushState(user, pushTokens)` para mantener una única fuente de verdad entre:
    - pill visual del card
    - lógica de filtrado

- Regla práctica:
  - Si un estado visible ya se deriva de una colección auxiliar, el filtro correspondiente debe reutilizar exactamente esa misma derivación en vez de duplicar lógica con heurísticas distintas.

---

Resumen técnico – `BlurView` del peek de usuarios en Android necesita intensidad real y overlay menos opaco

- Problema detectado:
  - En `components/users/UsersHome.native.js`, el menú inferior del Peek & Pop prácticamente no mostraba blur en Android aunque `expo-blur` estuviera montado correctamente.

- Causa raíz validada:
  - El `BlurView` estaba usando `intensity={10}`, demasiado bajo para un overlay portalizado sobre fondo oscuro.
  - Además, encima del blur se estaba pintando una capa muy opaca (`rgba(15,23,42,0.82)` en dark), lo que terminaba tapando visualmente casi todo el efecto.

- Corrección aplicada:
  - Se elevó la intensidad del blur a `36`.
  - Se añadió `renderToHardwareTextureAndroid={true}` al `BlurView` del peek.
  - Se añadió base translúcida y borde suave directamente al `BlurView`.
  - La capa `peekMenuOverlay` se volvió mucho menos opaca para dejar leer el blur real.

- Regla práctica:
  - En Android, si un `BlurView` está dentro de `Portal`/overlay y parece “no funcionar”, revisar primero estas tres cosas antes de tocar toda la UI:
    - intensidad demasiado baja
    - overlay superior demasiado opaco
    - falta de `renderToHardwareTextureAndroid={true}` en superficies complejas

---

Resumen técnico – Acción rápida de users hacia Logs filtrados por usuario

- Ajuste aplicado:
  - En `components/users/UsersHome.native.js`, la tercera acción del Peek & Pop dejó de copiar el username y ahora navega a `/(normal)/Logs` enviando `params: { id: user._id }`.

- Contrato reutilizado:
  - `components/logs/LogsList.native.js` ya soporta `useLocalSearchParams()` y, cuando recibe `id`, arma la query:
    - `{ $or: [{ userAfectado: routeId }, { userAdmin: routeId }] }`
  - Eso permite ver en una sola pantalla todos los logs donde el usuario participa como admin o como afectado, sin crear otra ruta ni otro modo de filtro especial.

- Regla práctica:
  - Si otra superficie necesita abrir logs contextuales de un usuario, reutilizar la misma ruta `/(normal)/Logs` con `id` en params en lugar de duplicar pantallas o filtros locales.

---

Resumen técnico – Peek de users con menú adaptable arriba o abajo según espacio disponible

- Problema detectado:
  - Cuando el long press ocurría sobre cards muy bajas en la pantalla, la bandeja de acciones del Peek & Pop salía siempre por debajo y podía quedar cortada fuera del viewport.

- Corrección aplicada:
  - En `components/users/UsersHome.native.js`, el cálculo de `measureInWindow(...)` ahora evalúa espacio libre arriba y abajo del card.
  - La bandeja de acciones guarda en el target del peek:
    - `menuPlacement: 'top' | 'bottom'`
    - `menuOffset` relativo al card flotante
  - El contenedor del menú pasó a `position: 'absolute'`, permitiendo renderizarlo por encima o por debajo sin empujar la composición del card.
  - La animación de entrada del menú también invierte su `translateY` según la dirección real de apertura.

- Regla práctica:
  - Si un popover o action tray depende de un elemento medido en pantalla, no asumir que siempre debe abrir hacia abajo.
  - Evaluar siempre el espacio disponible en ambos lados y escoger la dirección con mejor cabida antes de abrir el overlay.

Notas adicionales – El gap del menú superior debe calcularse desde el borde inferior del tray

- Hallazgo puntual:
  - Cuando el tray del peek abría hacia arriba, usar un offset basado en `availableSpaceAbove` hacía que el espacio aparente quedara “del lado de arriba” del menú en vez de percibirse como separación contra el card.

- Regla práctica:
  - Si el menú abre debajo del card, el offset correcto es:
    - `cardHeight + gap`
  - Si el menú abre arriba del card, el offset correcto es:
    - `-(menuHeight + gap)`
  - El gap debe representar siempre la separación entre el menú y el card, no entre el menú y el borde libre del viewport.

Notas adicionales – El card flotante también debe alejarse del menú según la dirección del tray

- Hallazgo puntual:
  - Aunque el offset del menú sea correcto, el gap visual puede desaparecer si el card flotante siempre anima hacia arriba.
  - Cuando el tray abre arriba, el card debe moverse ligeramente hacia abajo; cuando el tray abre abajo, el card puede levantarse hacia arriba.

- Regla práctica:
  - La animación de `translateY` del card flotante no debe ser fija.
  - Debe invertirse según `menuPlacement` para que card y menú se separen en lugar de acercarse.

---

Resumen técnico – Acción rápida de users hacia Ventas filtradas por usuario

- Ajuste aplicado:
  - En `components/users/UsersHome.native.js`, el menú del Peek & Pop ahora incluye también `Ver ventas` debajo de `Ver logs`.
  - Esa acción navega a `/(normal)/Ventas` enviando `params: { id: user._id }`.

- Contrato reutilizado en ventas:
  - `components/ventas/VentasList.native.jsx` ahora consume `useLocalSearchParams()` y, cuando recibe `id`, arma la query:
    - `{ $or: [{ userId: routeId }, { adminId: routeId }] }`
  - Eso permite ver en una sola pantalla todas las ventas donde el usuario participa como comprador o como admin, sin crear una ruta adicional.

- Consideración importante:
  - Al crecer el menú de acciones del peek con una cuarta opción, también se debe revisar la constante de altura esperada del tray (`PEEK_MENU_HEIGHT`) para que el cálculo de apertura arriba/abajo siga siendo realista.

- Regla práctica:
  - Si otra superficie necesita abrir ventas contextuales de un usuario, reutilizar la misma ruta `/(normal)/Ventas` con `id` en params en lugar de duplicar pantallas o filtros locales.

---

Resumen técnico – `VentasCard` en detalle de usuario abre ventas pendientes por ruta

- Ajuste aplicado:
  - En `components/users/UserDetails.native.js`, el botón `Ver historial` de `components/users/componentsUserDetails/VentasCard.js` ahora navega a `/(normal)/Ventas` con:
    - `id: item._id`
    - `pago: 'PENDIENTE'`

- Contrato reutilizado:
  - `components/ventas/VentasList.native.jsx` ya filtra por usuario/admin cuando recibe `id`.
  - Ahora además acepta `pago` desde `useLocalSearchParams()` para inicializar `selectedPago` con:
    - `PENDIENTE`
    - `PAGADO`
    - fallback `TODOS`

- Resultado funcional:
  - Desde el detalle de un usuario, el card de ventas abre directamente las ventas donde ese usuario participa y que tienen `cobrado === false`.

- Regla práctica:
  - Si otra superficie necesita abrir Ventas ya filtrada por estado, preferir params de ruta iniciales (`id`, `pago`) y reutilizar `VentasList.native.jsx` antes que crear pantallas nuevas para pendientes o pagadas.

---

Resumen técnico – Rediseño UX del card de deuda en `VentasCard`

- Ajuste aplicado:
  - `components/users/componentsUserDetails/VentasCard.js` dejó de ser una tarjeta mínima con monto y botón genérico.
  - Ahora presenta la deuda como una superficie más orientada a acción, con mejor jerarquía visual y copy más claro para administración.

- Mejoras visuales y de UX:
  - Header con eyebrow `Cobros del usuario` y título `Ventas pendientes`.
  - Bloque principal de monto con label más explícito: `Saldo pendiente por cobrar`.
  - Texto helper contextual según el nivel de deuda (`sin pendientes`, `seguimiento recomendado`, `revisión prioritaria`, `atención inmediata`).
  - Franja informativa secundaria con dos campos:
    - `Estado`
    - `Acción sugerida`
  - CTA principal más coherente con el flujo real:
    - icono `cash-clock`
    - texto `Ver pendientes` o `Ver ventas` cuando no hay deuda

- Criterio técnico validado:
  - El card no calcula nuevas métricas de negocio; sigue usando la misma función `deuda()` y la misma categorización por monto.
  - La mejora correcta estuvo en explicar mejor el estado y en alinear el botón con el flujo real de ventas no cobradas.

- Regla práctica:
  - Si un card administrativo ya abre una vista filtrada específica, el texto del botón debe reflejar esa acción real y no un label genérico como `Ver historial`.

---

Resumen tecnico - Deuda pendiente del admin visible en `MenuPrincipal` Expo

- Ajuste aplicado:
  - `components/Main/MenuPrincipal.native.jsx` ahora calcula reactivamente la deuda pendiente del admin autenticado usando `VentasCollection`.
  - La consulta sigue la misma fuente de verdad ya validada en el modulo de users:
    - `adminId: currentUser._id`
    - `cobrado: false`
  - El wrapper nativo pasa al screen compartido dos props nuevas:
    - `pendingDebt`
    - `pendingVentasCount`
  - Tambien expone una accion `onOpenPendingVentas` que navega a:
    - `/(normal)/Ventas?id=<adminId>&pago=PENDIENTE`

- Criterio funcional validado:
  - La deuda del menu principal debe mostrarse solo para usuarios admin.
  - La superficie no debe aparecer si el monto pendiente es `0`.
  - El acceso directo debe abrir exactamente las ventas pendientes del admin actual, no una vista generica de historial.

- UX/UI aplicada en `components/Main/MenuPrincipalScreen.jsx`:
  - Se agrego un bloque visual dentro del hero principal cuando existe deuda pendiente.
  - La superficie muestra:
    - eyebrow `Cobros pendientes`
    - titulo explicando que existe deuda administrativa por cobrar
    - chip con cantidad de ventas pendientes
    - monto total pendiente en CUP
    - CTA `Ver pendientes`
  - El bloque es presionable y funciona como acceso rapido al modulo de ventas filtrado.

- Compatibilidad de preview:
  - `components/Main/MenuPrincipal.jsx` ahora envia valores por defecto seguros para estas nuevas props.
  - Esto evita romper previews o superficies no nativas del menu principal.

- Regla practica:
  - Si otra superficie necesita resumir deuda administrativa, reutilizar la misma derivacion desde `VentasCollection` por `adminId` y `cobrado: false`.
  - Si el destino operativo sigue siendo Ventas pendientes, pasar params de ruta (`id`, `pago`) en lugar de crear una pantalla nueva solo para deuda.

---

Resumen tecnico - Campañas push Expo con imagen subida previamente al backend

- Alcance aplicado:
  - `components/users/PushOffersScreen.native.jsx` ahora permite adjuntar una imagen opcional a la campaña antes de enviarla.
  - La imagen no se manda inline en el push; primero se sube al backend mediante `images.upload` y luego se reutiliza la `url` publica devuelta por ese metodo dentro de `data`.

- Flujo tecnico validado:
  - Seleccion de imagen con `expo-image-picker` en la propia pantalla de campañas.
  - Upload unico previo al envio usando:
    - `Meteor.call('images.upload', fileData, metadata)`
  - La metadata enviada para este caso debe incluir como minimo:
    - `type: 'NOTIFICACION'`
  - Para dejar mejor trazabilidad futura, el cliente Expo tambien envia campos adicionales de contexto como:
    - `category: 'PUSH_CAMPAIGN'`
    - `channel: 'PUSH'`
    - `source: 'PushOffersScreen.native'`
    - `sourceApp: 'expo'`
    - `senderMode`
    - `targetAudience: 'CLIENTES'`
    - `recipientCount`

- Contrato de envio de push aplicado:
  - La URL publica de la imagen viaja dentro de `data`, no como binario:
    - `imageUrl`
    - `image`
    - `image_url`
  - Tambien se adjuntan datos auxiliares del recurso subido:
    - `notificationAssetType: 'NOTIFICACION'`
    - `notificationImageFileId`
    - `notificationImageFileName`
  - El backend duplica esa misma URL en aliases adicionales (`attachment*`, `media*`) para que futuras superficies o integraciones no dependan de una sola clave.

- Compatibilidad Expo validada:
  - `services/notifications/PushMessaging.native.ts` ya extraia imagen desde `data.image`, `data.imageUrl`, `data.image_url`, `attachment*` y `media*`.
  - Se añadió tambien soporte a `data.notificationImageUrl` como fallback extra.
  - Esto garantiza que el dialogo interno `PushNotificationDialogHost.native.tsx` pueda renderizar la imagen aunque el sistema no la muestre como rich push nativa.

- Regla practica:
  - Si una nueva pantalla Expo quiere mandar push con imagen, no debe subir la imagen por su cuenta a otro endpoint ni mandar base64 en `messages.send`.
  - Debe seguir este orden:
    1. seleccionar imagen
    2. subir con `images.upload`
    3. usar la `url` resultante dentro de `data`
    4. marcar la metadata del archivo con `type: 'NOTIFICACION'`

Notas adicionales - CTA visual dentro del banner de deuda debe leerse como boton real

- Ajuste UX aplicado en `components/Main/MenuPrincipalScreen.jsx`:
  - El texto `Ver pendientes ->` se reemplazo por una micro-superficie tipo pill dentro del banner.
  - El patron aprobado usa:
    - contenedor redondeado translúcido
    - borde suave
    - texto fuerte
    - icono encapsulado en un circulo interno

- Regla practica:
  - Aunque todo el banner siga siendo presionable, el CTA visible debe parecer un boton real para mejorar descubribilidad.
  - Si se reutiliza este patron en hero banners o alertas operativas, mantener el CTA como sub-superficie elegante y no como texto con flecha ASCII.

Notas adicionales - En el banner de deuda el tap debe vivir en el CTA, no en toda la superficie

- Ajuste UX aplicado en `components/Main/MenuPrincipalScreen.jsx`:
  - El banner de deuda dejo de ser presionable completo.
  - La accion de navegar a ventas pendientes ahora vive solo en el boton interno `Ver pendientes`.
  - El resto del banner queda como superficie informativa para evitar taps accidentales y hacer mas clara la jerarquia de interaccion.

- Regla practica:
  - Si una card o banner administrativo contiene informacion + CTA, no siempre conviene que toda la superficie navegue.
  - Cuando el mensaje principal es informativo y existe una accion puntual, concentrar el `onPress` en el CTA mejora precision y deja mas clara la intencion del usuario.

---

Resumen tecnico - Eliminacion de `Mensajes de usuarios` del drawer y del stack normal

- Ajuste aplicado:
  - Se elimino la opcion administrativa `Mensajes de usuarios` de `components/drawer/DrawerOptionsAlls.js`.
  - Tambien se retiro `AllMensajesUser` del stack en `app/(normal)/_layout.tsx`.
  - Se elimino el entrypoint `app/(normal)/AllMensajesUser.tsx` porque solo era un `ScreenFallback` placeholder y ya no debia seguir expuesto.

- Criterio funcional validado:
  - Este cambio no toca el sistema de mensajeria normal del usuario.
  - Solo retira la ruta administrativa placeholder de bandeja global que no estaba implementada realmente en Expo.

- Regla practica:
  - Si una opcion del drawer deja de formar parte del producto o sigue siendo solo placeholder, hay que retirarla tambien del stack y borrar su route file para no dejar navegacion huerfana.
  - No dejar rutas administrativas vacias visibles desde drawer si no existe una superficie funcional detras.

---

Resumen tecnico - `Ventas` pasa a administradores y su alcance depende del usuario actual

- Ajuste aplicado en drawer:
  - `Ventas` se movio de `Opciones privadas` a `Opciones de administradores` en `components/drawer/DrawerOptionsAlls.js`.
  - `Opciones privadas` queda reservada solo para rutas realmente exclusivas de `carlosmbinf`.

- Regla de acceso aplicada en `components/ventas/VentasList.native.jsx`:
  - Si `currentUsername === 'carlosmbinf'`:
    - la pantalla conserva el comportamiento amplio actual
    - sin `routeId` muestra todas las ventas
    - con `routeId` filtra por `{ userId: routeId }` o `{ adminId: routeId }`
  - Si el usuario NO es `carlosmbinf`:
    - la query base se restringe siempre a ventas donde participa el usuario actual
    - criterio: `{ $or: [{ userId: currentUserId }, { adminId: currentUserId }] }`
    - en ese caso `routeId` no debe ampliar el alcance de datos

- Criterio funcional validado:
  - El menu puede mostrar `Ventas` a cualquier admin, pero la coleccion visible ya no depende solo de tener acceso a la ruta.
  - La autorizacion efectiva de lectura se refuerza tambien desde la query del cliente, alineando UX y alcance esperado.

- Regla practica:
  - Cuando una pantalla administrativa se comparte entre superadmin y admins normales, no basta con esconder o mostrar la opcion del drawer.
  - La query reactiva tambien debe resolver el scope correcto segun el usuario actual para evitar que params de ruta o accesos indirectos amplien la visibilidad de datos.

---

Resumen tecnico - Cambio de estado de ventas segun el usuario que confirma

- Ajuste aplicado en backend:
  - `react-download/server/metodos/ventas.js` ahora trata `changeStatusVenta` como confirmacion unidireccional y no como toggle generico.
  - Si el usuario actual es `carlosmbinf`:
    - setea `cobrado: true`
    - setea `cobradoAlAdmin: true`
  - Si el usuario actual es otro admin:
    - solo setea `cobradoAlAdmin: true`
    - NO modifica `cobrado`

- Ajuste aplicado en frontend Expo:
  - `components/ventas/VentasList.native.jsx` ahora mapea tambien `cobradoAlAdmin` desde `VentasCollection`.
  - La card muestra dos estados distintos:
    - estado real de pago (`cobrado`)
    - confirmacion al admin (`cobradoAlAdmin`)
  - El boton ya no se comporta como toggle reversible:
    - `carlosmbinf` ve `Marcar pagado` y luego queda en `Pagado`
    - otros admins ven `Confirmar al admin` y luego `Reportado al admin`

- Criterio funcional validado:
  - Solo `carlosmbinf` puede dejar la venta realmente pagada.
  - Los otros admins solo pueden reportar o confirmar al admin principal que la venta ya fue revisada.
  - El dialogo de edicion sigue restringido a `carlosmbinf` y ahora el boton de la lista tambien refleja mejor esa jerarquia operativa.

- Regla practica:
  - Si un flujo administrativo tiene dos niveles de confirmacion (`confirmado al admin` vs `pagado real`), no reutilizar un unico booleano para ambos estados.
  - La UI debe mostrar y accionar cada estado de forma distinta para no inducir a error al operador.

---

Resumen tecnico - Chips de estado de ventas en una sola linea para altura consistente de cards

- Ajuste aplicado en `components/ventas/VentasList.native.jsx`:
  - La fila de estados del card ya no debe hacer wrap entre `Pendiente/Pagado` y `Sin confirmar al admin/Confirmado al admin`, porque eso desalineaba la altura entre cards del grid.
  - Se forzo la fila a una sola linea con `flexShrink` y sin `flexWrap`.

- Criterio visual validado:
  - En cards angostas se deben compactar los chips antes que permitir una segunda linea en el header.
  - Para esos casos se aprobaron labels abreviados solo en modo compacto:
    - `Conf. admin`
    - `Sin conf. admin`
  - El objetivo es mantener el significado del estado sin romper la uniformidad del card.

- Regla practica:
  - Si un par de chips de estado comparte la misma entidad visual del card, priorizar una sola linea estable para no generar cards con alturas diferentes dentro de la grilla.
  - Primero reducir padding, font-size o copy en modo compacto; dejar el wrap como ultimo recurso.

---

Resumen tecnico - Login Expo con paleta dinamica real para light y dark mode

- Problema detectado:
  - `components/loguin/Loguin.native.js` y `components/loguin/Loguin.js` estaban usando una composicion visual casi completamente fijada a colores de dark mode.
  - Aunque el overlay general cambiaba un poco por `Appearance`, el resto del modulo seguia dejando textos, cards, highlights, divisores e inputs con semantica visual de oscuro, lo que rompia el contraste en la otra variante.

- Correccion aplicada:
  - Se dejo de depender de `Appearance` como fuente principal de estilo y se alineo el modulo con el `theme` global de React Native Paper usando `useTheme()`.
  - Se creo `getLoginPalette(isDarkMode)` en `components/loguin/Loguin.styles.js` para centralizar colores por tema sin duplicar layout.
  - Tanto la variante nativa como la de preview ahora consumen esa paleta para:
    - overlay de fondo
    - glass card del formulario
    - textos del panel de marca
    - tarjetas highlight
    - divisores
    - footer y estados
    - server card
    - borde y texto de botones secundarios
    - fondos y colores de `TextInput`

- Decision tecnica importante:
  - El layout y las medidas del login se mantuvieron en `loginScreenStyles`; solo se movio la semantica cromatica a una paleta dinamica.
  - Esto evita tener dos hojas de estilo casi duplicadas para claro y oscuro.

- Regla practica:
  - En pantallas de acceso con branding fuerte, no basta con cambiar el color del overlay principal al alternar tema.
  - Si el modulo tiene superficies de marca, cards translúcidas e inputs custom, todas esas capas deben resolverse desde una paleta por tema y no con colores hardcodeados dispersos.
  - En este proyecto, si otra pantalla premium necesita convivir bien en light/dark, conviene replicar este patron: estilos estructurales fijos + helper `get...Palette(theme.dark)`.

---

Resumen tecnico - BlurView del login Expo debe usar tint valido y metodo experimental en Android

- Problema detectado en `components/loguin/Loguin.native.js`:
  - El `BlurView` del card principal estaba usando `tint="regular"`, valor que no forma parte de los enums validos de `expo-blur` en este proyecto.
  - Ademas, a diferencia de otros blur ya estables del workspace, no estaba declarando `experimentalBlurMethod="dimezisBlurView"` en Android.
  - El overlay interno de color tambien habia quedado comentado, lo que dejaba peor legibilidad y hacia mas dificil percibir correctamente el efecto final.

- Correccion aplicada:
  - `tint` ahora se resuelve por tema real:
    - dark mode -> `dark`
    - light mode -> `light`
  - Se agrego `experimentalBlurMethod` condicional para Android.
  - Se restauro una capa interna translúcida con `palette.blurCardOverlay` encima del blur para conservar contraste del contenido.

- Regla practica:
  - En este proyecto, no usar `tint="regular"` en `expo-blur`.
  - Para superficies blur importantes en Android, seguir el patron ya validado:
    - `tint={theme.dark ? 'dark' : 'light'}`
    - `experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}`
    - overlay translúcido adicional si el contenido necesita legibilidad consistente.

Notas adicionales - Fabric puede tolerar mejor `BlurView` con `tint` literal que con expresion dinamica

- Hallazgo puntual:
  - En `components/loguin/Loguin.native.js`, aunque `tint={isDarkMode ? 'dark' : 'light'}` devuelve un string valido en JavaScript, en runtime Android/Fabric puede terminar llegando al bridge como un valor dinamico no aceptado por `ExpoBlurView`.
  - El error visible fue:
    - `Couldn't convert ... to TintStyle where value is the enum parameter`

- Ajuste aplicado:
  - Se reemplazo la expresion dinamica por renderizado por ramas con `tint` literal:
    - rama dark -> `tint="dark"`
    - rama light -> `tint="light"`
  - Tambien se restauro el import de `StyleSheet` porque el overlay interno del blur usa `StyleSheet.absoluteFill`.

- Regla practica:
  - Si `expo-blur` falla en Android/Fabric con errores de enum sobre `tint`, probar primero un valor literal directo en JSX antes de asumir un problema de tema o de estilos.

---

Resumen tecnico - `renderToHardwareTextureAndroid` no habilita blur en Expo Android

- Hallazgo puntual en `components/loguin/Loguin.native.js`:
  - Tener `renderToHardwareTextureAndroid={true}` no hace que `BlurView` funcione por si solo en Android.
  - En `expo-blur`, el blur real en Android depende del prop:
    - `experimentalBlurMethod="dimezisBlurView"`

- Criterio tecnico validado:
  - Si el `BlurView` no muestra desenfoque en Android pero no crashea, lo primero a revisar no es `intensity`, sino si falta `experimentalBlurMethod`.
  - `renderToHardwareTextureAndroid` puede ayudar a la composicion visual en algunos casos, pero no sustituye el metodo experimental del blur.

- Regla practica:
  - Para cualquier `BlurView` importante en Android dentro de este proyecto, usar ambos cuando aplique:
    - `experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}`
    - `renderToHardwareTextureAndroid={true}`

  ***

  Resumen tecnico - Card de login con blur elegante y tema real en Expo
  - Ajuste aplicado:
    - `components/loguin/Loguin.native.js` dejo de tratar la card del formulario como una superficie casi oscura fija.
    - La card ahora usa el `theme.dark` real para decidir su rama visual y monta un blur mas fuerte con capas internas de soporte:
      - overlay translúcido
      - glow/accent orb
      - sheen superior suave
    - El objetivo no fue cambiar la logica de autenticacion, sino dar una superficie premium y consistente en claro/oscuro.

  - Decisiones visuales validadas:
    - La card del login debe sentirse como una unica superficie de vidrio, no como blur + formulario suelto.
    - Para eso conviene combinar:
      - `BlurView`
      - una capa translúcida con contraste controlado
      - acentos internos suaves para profundidad
    - Los inputs no deben quedar completamente transparentes sobre la card blur; necesitan su propia superficie translúcida con borde suave para mantener legibilidad en ambos temas.

  - Regla tecnica importante:
    - No volver a hardcodear `isDarkMode={true}` al renderizar la card de login.
    - La fuente de verdad del aspecto visual debe seguir siendo `useTheme()` + `getLoginPalette(theme.dark)`.
    - Si se ajusta el blur del login en Android, mantener este patron minimo:
      - `tint="dark"` o `tint="light"` literal segun la rama
      - `experimentalBlurMethod="dimezisBlurView"`
      - `renderToHardwareTextureAndroid={true}`

  - Regla practica:
    - En superficies premium del login, el contraste no debe resolverse solo con texto blanco/negro; debe vivir tambien en:
      - overlay del blur
      - fondo de inputs
      - chips o micro-pills de apoyo
      - copy del panel de marca
    - Si en una futura iteracion el login vuelve a verse "oscuro disfrazado" en modo claro, revisar primero si la card blur, los inputs y el copy siguen consumiendo la paleta dinamica correcta.

  ***

  Resumen tecnico - El fondo del login debe permanecer visible y el blur vivir solo en la card
  - Ajuste visual validado:
    - En `components/loguin/Loguin.native.js` no conviene cubrir toda la pantalla con una capa adicional si la imagen de fondo ya tiene buena presencia visual.
    - El efecto premium correcto para este login es:
      - fondo visible tal cual
      - blur localizado solo en la card del formulario
      - tipografia e inputs ajustados al azul oscuro real del backdrop

  - Decision tecnica importante:
    - Se descarto la idea de una variante clara del card con apariencia blanquecina porque, sobre este fondo especifico, terminaba tapando demasiado la imagen y rompia el lenguaje visual del login.
    - Para este modulo, aunque exista light mode en el tema global, la card del formulario funciona mejor con una logica de glass oscuro translúcido y texto claro.

  - Regla practica:
    - No montar un `backgroundOverlay` global opaco en esta pantalla salvo que el asset de fondo cambie radicalmente.
    - Si se quiere reforzar legibilidad, hacerlo dentro de la propia `LoginBlurCard` con:
      - overlay interno sutil
      - borde suave
      - glow leve
      - inputs translúcidos
    - Si el login vuelve a sentirse como un panel blanco encima del fondo, revisar primero `blurCardOverlay`, `inputBackground` y si reaparecio una capa global sobre toda la pantalla.

  ***

  Resumen tecnico - `CubacelOfertaScreen` debe respetar el inset inferior real en Android
  - Problema detectado:
    - En `components/cubacel/CubacelOfertaScreen.native.jsx`, la pantalla solo aplicaba `SafeAreaView` en `left/right`.
    - Cuando Android muestra botones o barra de navegación inferior, el footer fijo puede quedar demasiado pegado o visualmente montado sobre esa zona del sistema.

  - Correccion aplicada:
    - La pantalla ahora incluye `bottom` en `edges` del `SafeAreaView`.
    - Se usa `useSafeAreaInsets()` para aplicar el inset inferior real al footer fijo con `paddingBottom: Math.max(insets.bottom, 18)`.

  - Criterio UX validado:
    - En pantallas con footer persistente de acciones, no basta con envolver la vista en `SafeAreaView` si el edge inferior no esta activo o si el footer usa padding fijo.
    - El bloque de acciones debe respirar respecto a la barra del sistema tanto en Android con botones tradicionales como con navegación gestual.

  - Regla practica:
    - Si una pantalla Expo tiene CTA fijo al fondo, usar `useSafeAreaInsets()` y no confiar solo en padding hardcodeado.
    - En este proyecto, el `bottom inset` debe aplicarse especialmente en footers de compra, checkout y formularios con acción principal persistente.

  ***

  Resumen tecnico - Ventas filtradas por usuario al entrar desde Users
  - Ajuste aplicado en `components/ventas/VentasList.native.jsx`:
    - La ruta `/(normal)/Ventas` ahora respeta `id` como contexto de usuario tambien para admins no generales.
    - Si el usuario actual no es `carlosmbinf`, la query final se arma como interseccion entre:
      - las ventas donde participa el admin actual
      - las ventas donde participa el usuario recibido por ruta
    - Esto mantiene el alcance seguro del admin y a la vez evita perder el filtro de contexto al abrir Ventas desde Users.

  - Mejora de UX:
    - La pantalla de Ventas ahora muestra un chip y texto de contexto cuando entra con `routeId`, dejando visible que el listado ya esta filtrado para un usuario concreto.
    - El subtitulo del header tambien cambia para reflejar ese contexto y no parecer una lista general.

  - Regla practica:
    - Si una pantalla administrativa recibe params de filtro por navegacion contextual, la UI debe mostrarlos explicitamente y la query reactiva debe respetarlos sin romper el scope de permisos del usuario actual.

  ***

  Resumen tecnico - Footer inferior de `CubacelOfertaScreen` con padding por inset, sin reservar el bottom safe area en el contenedor padre
  - Ajuste aplicado en `components/cubacel/CubacelOfertaScreen.native.jsx`:
    - El `SafeAreaView` principal no debe consumir `bottom` en `edges` porque esa superficie padre debe poder ocupar tambien el area inferior.
    - El respiro real se deja solo en el footer fijo de acciones usando `useSafeAreaInsets()` y `paddingBottom: Math.max(insets.bottom, 18)`.

  - Criterio UX validado:
    - En esta pantalla, el problema no era el contenedor completo sino los botones fijos del bloque inferior.
    - La solucion correcta es dejar que el layout padre llegue al borde inferior y aplicar el inset solo donde hace falta evitar choque con la navegacion del sistema.

  - Regla practica:
    - Si una pantalla tiene footer fijo, no agregar `bottom` al `SafeAreaView` principal por defecto.
    - Primero validar si basta con aplicar el inset inferior solo en el contenedor de acciones o CTA persistente.

  ***

  Resumen tecnico - `CubacelOfertaScreen` no debe reservar safe area lateral en el contenedor raiz
  - Ajuste aplicado en `components/cubacel/CubacelOfertaScreen.native.jsx`:
    - El `SafeAreaView` raiz dejo de consumir tambien `left` y `right`.
    - La pantalla ahora ocupa todo el ancho disponible y el respiro lateral queda a cargo de los bloques internos que ya usan margenes/paddings propios.

  - Criterio UX validado:
    - En esta pantalla, el contenedor padre no debe encoger ni vertical ni horizontalmente por safe areas.
    - Las separaciones laterales deben vivir en el layout del contenido, no en el wrapper raiz.

  - Regla practica:
    - Si una superficie ya tiene tarjetas, hero, formulario y footer con paddings internos, no envolver todo el screen con `left/right` safe area por defecto.
    - Usar el `SafeAreaView` raiz solo para el comportamiento que realmente deba afectar al contenedor completo.

  ***

  Resumen tecnico - Google Maps Android en Expo reutiliza la API key legacy del manifest nativo
  - Hallazgo validado:
    - El proyecto legacy ya tenia una key especifica de Google Maps Android declarada en:
      - `react-native-VIDKAR-LEGACY/android/app/src/main/AndroidManifest.xml`
    - Esa key NO coincide con la key generada por Firebase (`google_api_key` de `google-services.json`).
    - Para `react-native-maps` en Android, la fuente de verdad correcta es el `meta-data`:
      - `com.google.android.geo.API_KEY`

  - Valor legacy localizado:
    - `AIzaSyD1r5uJ1PBgUaZkqKtlCgInLJtrA-Fem5g`

  - Correccion aplicada en Expo:
    - Se agrego el mismo `meta-data` al manifest nativo actual:
      - `react-native-VIDKAR/android/app/src/main/AndroidManifest.xml`

  - Regla practica:
    - Si Google Maps falla en Android con errores de key o carga del mapa, no asumir que la key de Firebase sirve para Maps.
    - Revisar primero si existe `com.google.android.geo.API_KEY` en el `AndroidManifest.xml` del build activo.
    - Si el proyecto viene de un legacy RN CLI, contrastar siempre el manifest viejo antes de inventar una key nueva o reutilizar `google-services.json`.

  Notas adicionales - En Expo la fuente de verdad de Google Maps debe vivir en `app.json`, no en `android/` generado
  - Correccion de criterio aplicada:
    - Aunque se haya localizado la key correcta en el `AndroidManifest.xml` del legacy, en este proyecto Expo no debe mantenerse manualmente dentro de `android/app/src/main/AndroidManifest.xml`.
    - La configuracion correcta queda en:
      - `expo.android.config.googleMaps.apiKey`
      - dentro de `app.json`

  - Regla practica:
    - Si una key nativa de Android o iOS necesita sobrevivir a `prebuild` o a compilaciones limpias de Expo, moverla a `app.json` o a un config plugin.
    - No usar `android/` o `ios/` generados como fuente de verdad persistente salvo que exista una razon excepcional y controlada.

  ***

  Resumen tecnico - Safe area lateral unificada en pantallas Expo
  - Ajuste aplicado en pantallas raiz activas del proyecto Expo:
    - `components/Header/AppHeader.jsx` ahora solo reserva `top` cuando monta su propio `SafeAreaView`.
    - Las pantallas con header custom propio mantienen solo `edges={["top"]}` en el root.
    - Las pantallas cuyo header ya usa `AppHeader` pasan a `edges={[]}` en el contenedor raiz para no volver a encoger lateral o inferiormente toda la superficie.

  - Pantallas alineadas con este criterio:
    - `components/Main/MenuPrincipalScreen.jsx`
    - `components/drawer/DrawerOptionsAlls.js`
    - `components/mensajes/MensajesHome.native.js`
    - `components/dashboard/DashboardScreen.native.jsx`
    - `components/cubacel/ProductosScreen.native.jsx`
    - `components/loguin/Loguin.native.js`
    - `components/loguin/Loguin.js`

  - Criterio UX validado:
    - El safe area lateral no debe encoger por defecto toda la pantalla.
    - Los margenes horizontales deben salir del layout interno de cada modulo.
    - El inset superior se reserva solo donde una cabecera propia realmente lo necesita.

  - Regla practica:
    - Si una pantalla usa `AppHeader`, el root normalmente no debe volver a reservar `left/right/bottom`.
    - Si una pantalla usa header custom dentro del screen, dejar como maximo `top` en el `SafeAreaView` raiz.

  ***

  Resumen tecnico - Deteccion real de conexion web/proxy/VPN en Expo Users
  - Hallazgo validado al contrastar legacy con backend:
    - El legacy intentaba distinguir `web` y `proxy` usando `online.hostname`, pero esa heuristica no representa bien la forma real de los documentos en `conexiones`.
    - En el backend actual:
      - conexiones web normales se crean desde `Meteor.onConnection` con `address = connection.clientAddress` y luego se les agrega `userId` en `Accounts.onLogin`
      - conexiones proxy se insertan desde `serverproxy3002.js` con `address = "proxy: <ip>"` y `userId`
    - Por tanto, la regla correcta en Expo no es `address != null => web`.

  - Correccion aplicada en `components/users/UsersHome.native.js`:
    - `hasWebConnection` ahora exige:
      - `userId` que haga match con el usuario
      - `address` presente
      - `address` que NO empiece con `proxy:`
    - `hasProxyConnection` ahora exige:
      - `userId` que haga match con el usuario
      - `address` que empiece con `proxy:`
    - `hasVpnConnection` sigue saliendo de `vpnplusConnected || vpn2mbConnected`.

  - Regla practica:
    - Para el proyecto Expo, la fuente de verdad para distinguir web vs proxy en `conexiones` debe ser el contenido de `address` y no la presencia/ausencia del campo.
    - Si un usuario aparece conectado solo por VPN cuando deberia salir web o proxy, revisar primero el valor real de `address` en la coleccion `conexiones`.

  ***

  Resumen tecnico - Chips multiples por conexion activa en Users Expo
  - Ajuste aplicado en `components/users/UsersHome.native.js`:
    - El card de usuario ya no resume las conexiones en un solo chip por prioridad.
    - Ahora genera un chip por cada conexion activa detectada:
      - `Web`
      - `Proxy`
      - `VPN`
    - Si no existe ninguna conexion activa, mantiene un unico chip `Offline`.

  - Criterio visual validado:
    - Si un usuario esta conectado por `Proxy` y `VPN` al mismo tiempo, el card debe mostrar ambos chips para que el operador identifique todos los canales activos y no solo uno dominante.
    - La prioridad unica sigue siendo util para el badge puntual del avatar, pero no para el resumen textual del card.

  - Regla practica:
    - Cuando una entidad puede tener varios estados de conexion simultaneos, no colapsarlos a una sola etiqueta si la UI necesita diagnostico operativo.
    - En este modulo, los chips del card deben representar el conjunto completo de conexiones activas, no solo la primera coincidencia.

  Notas adicionales - Soporte dual de `hostname` legacy y `address` backend en Users Expo
  - Hallazgo importante:
    - Para diagnosticar conexiones en `Users`, no conviene depender solo de `address` ni solo de `hostname`.
    - El legacy filtraba con `hostname`, mientras que el backend actual tambien distingue proxy por `address = "proxy: ..."`.

  - Ajuste aplicado:
    - `components/users/UsersHome.native.js` ahora suscribe y lee ambos campos en `conexiones`:
      - `address`
      - `hostname`
    - La deteccion de `web` se considera positiva si:
      - existe `hostname`, o
      - existe `address` y no empieza con `proxy:`
    - La deteccion de `proxy` se considera positiva si:
      - `address` empieza con `proxy:`

  - Regla practica:
    - Si una heuristica de conexion deja de detectar usuarios en Expo, contrastar siempre contra los dos contratos historicos del proyecto antes de simplificar la logica a un solo campo.

  ***

  Resumen tecnico - Filtro de conexion por tipo en `UsersHome` y APP cuenta como conexion activa
  - Ajuste aplicado en `components/users/UsersHome.native.js`:
    - El filtro general de `Conexión` dejo de ser solo binario (`conectado` / `desconectado`).
    - Ahora permite filtrar por:
      - cualquier conexion activa
      - `WEB`
      - `PROXY`
      - `VPN`
      - `APP`
      - `desconectado`

  - Correccion funcional importante:
    - `getUserConnectionState(...)` ahora cuenta `hasAppConnection` dentro de `isConnected`.
    - Antes, un usuario que solo tuviera conexion por app podia quedar fuera del filtro de conectados aunque el estado de APP ya estuviera calculado.

  - Criterio aplicado:
    - El filtro por tipo no exige exclusividad.
    - Si un usuario tiene varias conexiones activas, debe aparecer en cualquiera de los filtros que le correspondan.
    - Ejemplo:
      - si tiene `PROXY` y `VPN`, aparece tanto en `PROXY` como en `VPN`

  - Regla practica:
    - Si el modulo ya deriva un estado compuesto de conexion, el filtro no debe volver a inferirlo con reglas paralelas dispersas.
    - Conviene centralizar el matching del filtro contra `getUserConnectionState(...)` para que chips visuales, avatar y filtros usen la misma fuente de verdad.

  ***

  Resumen tecnico - `MapaUsuarios` debe derivar online desde `conexiones`, no desde `user.online`
  - Ajuste aplicado en `components/comercio/maps/MapaUsuariosScreen.native.jsx`:
    - La pantalla del mapa ahora suscribe `conexiones` ademas de `user`.
    - El campo `online` de cada usuario se recalcula con la misma logica usada en `components/users/UsersHome.native.js`.

  - Criterio funcional validado:
    - `hasAppConnection` se considera activo cuando existe alguna conexion del usuario con `address` o `hostname` no vacios.
    - `isConnected` del mapa ahora sale de:
      - `hasWebConnection`
      - `hasProxyConnection`
      - `hasVpnConnection`
      - `hasAppConnection`
    - Con eso, la metrica `En línea`, el ordenado y el filtro `online` del mapa ya no dependen del flag legacy `user.online`.

  - Regla practica:
    - Si una pantalla Expo necesita estado de conexion del usuario y existe la coleccion `conexiones`, no usar `user.online` como fuente primaria.
    - Reutilizar los helpers de derivacion de `UsersHome` evita inconsistencias entre listado de usuarios y mapa.

  ***

  Resumen tecnico - Copy de bienvenida del menu principal debe sonar institucional, no tecnico
  - Ajuste aplicado en `components/Main/MenuPrincipalScreen.jsx`:
    - El texto principal del hero se reemplazo por un mensaje de bienvenida mas profesional y neutral para cliente final.

  - Criterio de contenido validado:
    - En la pantalla principal no conviene usar copy tecnico ni enumeraciones funcionales demasiado operativas si el objetivo inmediato es dar la bienvenida.
    - El mensaje correcto para esta superficie debe sentirse:
      - claro
      - cercano
      - profesional
      - orientado al usuario final

  - Regla practica:
    - En heroes de entrada o menues principales, priorizar lenguaje institucional y de servicio.
    - Dejar el detalle tecnico o funcional para cards, modulos y CTAs especificos dentro de la pantalla.

  ***

  Resumen tecnico - Saludo del menu principal debe priorizar `profile.firstName`
  - Ajuste aplicado en `components/Main/MenuPrincipalScreen.jsx`:
    - `formatGreeting(...)` dejo de usar `username` para construir el saludo principal.
    - Ahora prioriza `user.profile.firstName` y usa fallback simple `Bienvenido` si no existe.

  - Criterio UX validado:
    - En la pantalla principal, el saludo debe sonar personal y limpio.
    - `username` puede contener aliases tecnicos o valores poco presentables para un hero de bienvenida.
    - `firstName` es la fuente mas adecuada cuando existe en el perfil.

  - Regla practica:
    - En copys personalizados dirigidos al usuario final, preferir `profile.firstName` antes que `username` salvo que el flujo sea estrictamente tecnico o administrativo.

  ***

  Resumen tecnico - Chip de rol en `MenuPrincipal` solo para administradores
  - Ajuste aplicado en `components/Main/MenuPrincipalScreen.jsx`:
    - El chip con `shield-account` y `getRoleLabel(user)` ya no se muestra para usuarios normales.
    - Ahora solo se renderiza cuando el usuario es admin o administrador general.

  - Criterio UX validado:
    - En el hero principal no conviene ocupar espacio visual con un badge de rol para usuarios finales si ese dato no aporta valor operativo.
    - El chip de rol si tiene sentido para perfiles administrativos porque contextualiza permisos y responsabilidad dentro del sistema.

  - Regla practica:
    - En superficies de bienvenida, mostrar metadatos de rol solo cuando aporten contexto real al flujo del usuario.

  ***

  Resumen tecnico - Boton de mensajes solo visible cuando existen mensajes reales
  - Ajuste aplicado en `components/components/MenuIconMensajes.native.js`:
    - El icono de mensajes deja de renderizarse si no hay mensajes o conversaciones disponibles para el usuario actual.
    - Tambien se oculta durante `loading` para evitar mostrar un acceso transitorio que luego desaparezca.

  - Criterio UX validado:
    - Si el menu de mensajes no tiene contenido, no conviene mostrar el icono en el header.
    - Un acceso visible que no puede abrir nada util solo genera ruido visual y expectativa falsa de funcionalidad.

  - Regla practica:
    - En menus o acciones contextuales del header, renderizar el acceso solo cuando exista contenido real detras de esa accion.

  ***

  Resumen tecnico - Pantalla Expo para notificaciones de conexiones VPN con alcance por admin
  - Alcance aplicado:
    - Se migro la funcionalidad de `imports/ui/pages/notificacionUsersConnectionVPN` del proyecto React web a Expo bajo una superficie nativa nueva:
      - `components/notificacionUsersConnectionVPN/NotificacionUsersConnectionVPN.native.jsx`
      - `components/notificacionUsersConnectionVPN/NotificacionRuleDialog.native.jsx`
    - La ruta Expo nueva quedo registrada en:
      - `app/(normal)/NotificacionUsersConnectionVPN.tsx`
      - `app/(normal)/_layout.tsx`
    - El acceso se expuso en el drawer de administradores con label `Notificaciones VPN`.

  - Contrato Meteor preservado:
    - La coleccion cliente Expo agregada en `components/collections/collections.js` es:
      - `NotificacionUsersConectadosVPNCollection = new Mongo.Collection('notificacionUsersConectadosVPN')`
    - La pantalla sigue usando la misma publicacion del backend:
      - `Meteor.subscribe('notificacionUsersConnectionVPN', selector, option)`
    - El alta sigue siendo directa sobre la coleccion, igual que en React web:
      - `NotificacionUsersConectadosVPNCollection.insert({ userIdConnected, adminIdSolicitud, mensajeaenviarConnected, mensajeaenviarDisconnected })`
    - La eliminacion tambien se mantiene directa sobre la coleccion:
      - `NotificacionUsersConectadosVPNCollection.remove(_id)`
    - Se mantiene auditoria con `Meteor.call('registrarLog', ...)` tanto en creacion como en eliminacion.

  - Regla de acceso y alcance validada en Expo:
    - `carlosmbinf` ve y administra todas las reglas (`selector = {}`).
    - Cualquier otro admin solo ve sus reglas:
      - `selector = { adminIdSolicitud: Meteor.userId() }`
    - Para seleccionar usuario objetivo al crear una regla:
      - admin general puede consultar todo el universo visible de usuarios
      - admin normal usa el criterio operativo del sistema para sus subordinados:
        - `bloqueadoDesbloqueadoPor: Meteor.userId()`
    - La pantalla muestra estado `Sin acceso` si entra un usuario no admin por ruta directa.

  - Decision UX/UI aplicada:
    - La funcionalidad no se porto como formulario plano + tabla literal del web.
    - En Expo se resolvio como pantalla administrativa movil con:
      - hero superior de contexto
      - resumen de metricas
      - buscador reactivo
      - cards por regla con ambos mensajes (`conecte` / `desconecte`)
      - dialogo dedicado para crear reglas nuevas
      - picker de usuarios dentro de dialogo usando `react-native-paper`
    - Esta decision conserva el contrato de datos legacy pero adapta mejor la lectura a movil.

  - Consideraciones tecnicas importantes:
    - El observer real del backend dispara la logica cuando cambia `vpnplusConnected` en `Meteor.users`, por lo que la pantalla solo administra reglas; no ejecuta la notificacion por si misma.
    - El payload minimo requerido por la coleccion sigue siendo:
      - `userIdConnected`
      - `adminIdSolicitud`
      - `mensajeaenviarConnected`
      - `mensajeaenviarDisconnected`
    - La fecha se sigue resolviendo del lado del schema backend con `autoValue`, por lo que el cliente Expo no debe intentar setear `fecha` manualmente.

  - Regla practica:
    - Si mas adelante se agregan edicion o duplicado de reglas, mantener el mismo alcance por admin en el selector de consulta antes de abrir cualquier accion destructiva o de mutacion.
    - Si se toca esta funcionalidad, contrastar siempre contra estos tres puntos antes de cambiar la UI:
      - nombre exacto de la coleccion `notificacionUsersConectadosVPN`
      - publicacion `notificacionUsersConnectionVPN`
      - logica servidor en `server/observers.js` basada en `vpnplusConnected`

  ***

  Resumen tecnico - Notificaciones VPN con cards minimalistas y responsable editable solo por carlosmbinf
  - Ajuste aplicado:
    - `components/notificacionUsersConnectionVPN/NotificacionUsersConnectionVPN.native.jsx` ahora usa cards mas compactas y directas para cada regla.
    - Se elimino la composicion pesada con rail superior y bloques grandes por mensaje; la card quedo reducida a:
      - usuario monitoreado
      - responsable
      - fecha
      - resumen corto de mensajes de conectar y desconectar
      - acciones `Editar` y `Eliminar`

  - Flujo nuevo de edicion:
    - `components/notificacionUsersConnectionVPN/NotificacionRuleDialog.native.jsx` ya no es solo de alta.
    - Acepta `editingRule` y persiste cambios con `NotificacionUsersConectadosVPNCollection.update(...)`.
    - La pantalla conserva `editingRule` en estado local y abre el dialogo en modo create o edit segun el caso.

  - Regla funcional critica:
    - El campo responsable real sigue siendo `adminIdSolicitud`.
    - Solo `carlosmbinf` puede cambiar ese responsable desde el dialogo.
    - Los demas admins pueden editar mensajes y regla visible dentro de su propio alcance, pero el responsable se les muestra como solo lectura.

  - Alcance de datos aplicado:
    - La pantalla ahora suscribe tambien admins visibles para poblar el picker de responsable:
      - `username === 'carlosmbinf'`
      - o `profile.role === 'admin'`
    - Esto no cambia el alcance de reglas visibles; solo alimenta el selector de responsable cuando el usuario actual tiene permiso para reasignarlo.

  - Regla practica:
    - Si se vuelve a tocar este modulo, no mover la logica de permiso del responsable a una heuristica visual; la fuente de verdad sigue siendo:
      - `currentUsername === 'carlosmbinf'`
    - Si se agrega validacion backend futura, debe proteger explicitamente mutaciones de `adminIdSolicitud` y no confiar solo en el cliente Expo.

  ***

  Resumen tecnico - Responsable de notificaciones VPN puede ser cualquier usuario visible
  - Ajuste aplicado:
    - El selector de responsable en `components/notificacionUsersConnectionVPN/NotificacionRuleDialog.native.jsx` ya no se limita a admins.
    - Para `carlosmbinf`, el picker ahora puede mostrar cualquier usuario visible dentro del alcance cargado por la pantalla.

  - Regla funcional validada:
    - Solo `carlosmbinf` puede reasignar `adminIdSolicitud`.
    - Pero el destino de esa reasignacion puede ser cualquier usuario disponible, no solo perfiles administrativos.

  - Ajuste importante en modo edicion:
    - Si la regla editada ya apunta a un usuario o responsable que no aparece en el listado filtrado actual, el dialogo debe seguir mostrando ese valor cargado usando los datos de la propia regla.
    - Esto evita que al abrir `Editar` parezca que el usuario monitoreado o el responsable actual se perdieron.

  - Criterio UX aplicado:
    - En esta pantalla se eliminaron textos tecnicos visibles para el usuario final o el operador.
    - El copy debe hablar del funcionamiento del negocio y del seguimiento del servicio, no de implementacion interna, colecciones o infraestructura.

  ***

  Resumen tecnico - Historial de mensajes a pantalla completa con paginacion incremental de 20
  - Ajuste aplicado en `components/mensajes/MensajesHome.native.js`:
    - La pantalla de conversacion dejo de renderizar el card superior/resumen del chat y tambien elimino el bloque interno tipo cabecera de historial.
    - El cuerpo del chat ahora ocupa toda la superficie disponible entre `AppHeader` y el composer inferior.

  - Criterio UX validado:
    - En una vista de chat, la prioridad debe ser el historial de mensajes y no una tarjeta introductoria arriba.
    - Si el usuario entra a conversar, la mayor parte de la pantalla debe quedar para leer y desplazarse por mensajes, no para resumen decorativo del canal.

  - Paginacion reactiva aplicada:
    - La suscripcion Meteor `mensajes` ahora se hace con `limit` incremental.
    - Carga inicial:
      - ultimos `20` mensajes
    - Al desplazarse hacia arriba:
      - se aumenta el `limit` en bloques de `20`
    - Para detectar si existen mas mensajes sin desbordar la UI, se consulta internamente con `limit = messageLimit + 1` y luego se renderizan solo los primeros `messageLimit` visibles.

  - Regla tecnica importante:
    - En listas invertidas de chat no conviene hacer auto-scroll al fondo cada vez que aumenta la cantidad total de items.
    - El scroll automatico solo debe dispararse si cambia el mensaje mas reciente; si lo que entra son mensajes antiguos por paginacion, la posicion visible del usuario debe mantenerse.

  - Soporte visual agregado:
    - La lista muestra indicador de carga de mensajes anteriores al paginar.
    - Cuando aun hay historial disponible, aparece un hint discreto para seguir desplazandose hacia arriba.

  - Regla practica:
    - Si otra pantalla de mensajeria o timeline usa Meteor + `FlatList` invertido, seguir este patron:
      1. suscripcion con `sort: { createdAt: -1 }`
      2. carga inicial corta (`20`)
      3. aumento progresivo del `limit`
      4. deteccion de `hasMore` con `limit + 1`
      5. evitar auto-scroll cuando solo se agregan mensajes antiguos

    ***

    Resumen tecnico - Menu de adjuntos tipo chat para enviar imagenes
    - Ajuste aplicado en `components/mensajes/MensajesHome.native.js`:
      - El composer del chat ahora incluye un boton `+` con menu contextual tipo mensajeria.
      - Por el momento el menu expone solo una accion real:
        - `Fotos y videos`
      - La interfaz se resolvio con `Menu` de React Native Paper anclado al boton de adjuntos, sin introducir un modal nuevo ni romper el layout del composer.

    - Flujo funcional implementado:
      1. pedir permiso de galeria con `expo-image-picker`
      2. abrir selector de imagenes
      3. subir la imagen usando `Meteor.call('images.upload', ...)`
      4. insertar mensaje en `mensajes` con `type: 'image'`
      5. renderizar la imagen como burbuja dentro del historial del chat

    - Metadata de upload aplicada para chat:
      - `type: 'CHAT'`
      - `category: 'CHAT_MESSAGE'`
      - `channel: 'CHAT'`
      - `source: 'MensajesHome.native'`
      - `sourceApp: 'expo'`
      - `recipientId`

    - Contrato visual del mensaje imagen:
      - Si el mensaje trae `imageUrl`, la burbuja renderiza primero la imagen.
      - Si ademas existe `mensaje`, ese texto se trata como caption y se muestra debajo de la imagen dentro de la misma burbuja.
      - Si no existe caption, el mensaje queda solo como imagen con su timestamp.

    - Regla practica:
      - Si luego se agregan mas opciones al menu `+` (archivo, contacto, encuesta, evento), mantener el mismo patron del composer y agregar cada accion como item del menu, no como nueva fila de botones fija.
      - Si otra pantalla necesita enviar imagenes por chat, reutilizar el flujo actual `expo-image-picker -> images.upload -> mensaje type image` antes de inventar un endpoint dedicado.

    Notas adicionales - El menu `+` del composer debe abrir arriba del boton
    - Ajuste UX aplicado en `components/mensajes/MensajesHome.native.js`:
      - El menu de adjuntos ya no debe sentirse montado encima del propio boton `+`.
      - El patron aprobado es anclarlo con `anchorPosition="top"` para que aparezca por encima del composer, mas cercano al comportamiento esperado en apps de mensajeria.

    - Regla practica:
      - Si luego se agregan nuevas acciones al menu del chat, mantener la apertura superior y no dejar que el popup tape el boton ancla ni la caja de texto.

    Notas adicionales - El cliente de chat ya prepara adjuntos genericos aunque solo renderice imagenes
    - Ajuste tecnico aplicado:
      - Aunque por ahora el soporte visual completo es solo para imagenes, el mensaje que se inserta desde Expo ya guarda tambien campos genericos de adjunto:
        - `attachmentKind`
        - `attachmentUrl`
        - `attachmentFileId`
        - `attachmentFileName`
        - `attachmentMimeType`
        - `attachmentFileSize`
        - `attachmentWidth`
        - `attachmentHeight`
        - `attachments[]`

    - Regla practica:
      - Si despues se agrega audio, video o archivo, reutilizar estos campos genericos como fuente principal y dejar `image*` como compatibilidad de la fase actual.

  ***

  Resumen tecnico - Push de chat con imagen reutilizando el mismo adjunto subido
  - Ajuste aplicado en `components/mensajes/MensajesHome.native.js`:
    - Cuando el usuario envia una foto por chat, el cliente ya no dispara la push solo con texto (`Imagen` o caption).
    - Ahora `enviarMensajeDirecto2` recibe tambien `options.data` con la metadata visual de la imagen:
      - `imageUrl`
      - `image`
      - `attachmentUrl`
      - `notificationImageUrl`
      - `attachments[]`
    - La URL usada para push se normaliza contra el `meteorUrl` activo del cliente para no depender del host fijo devuelto por `ROOT_URL` cuando la app esta conectada a un server Meteor local.

  - Regla practica:
    - Si un mensaje de chat incluye imagen, la push debe reutilizar la misma URL publica ya generada por `images.upload`; no volver a subir el archivo ni mandar base64 dentro del payload push.
    - Si en el futuro se agregan audio/video/documentos al chat, mantener este mismo patron: persistir primero el adjunto y luego pasar su metadata en `options.data` del metodo que dispara la notificacion.

---

Resumen tecnico - Migracion del flujo Cadete a Expo sin tocar el flujo normal

- Alcance aplicado:
  - Se implementaron variantes nativas reales para la rama cadete en Expo:
    - `components/cadete/CadeteNavigator.native.jsx`
    - `components/cadete/CadeteDrawerContent.native.jsx`
    - `components/comercio/pedidos/HomePedidosComercio.native.jsx`
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx`
    - `components/comercio/maps/MapaPedidos.native.jsx`
    - `components/empresa/screens/pedidos/components/SlideToConfirm.native.jsx`
    - `app/(cadete)/HomePedidosComercio.native.tsx`
  - Se mantuvo intacto el gate existente de `app/index.native.tsx` para que el flujo se active solo cuando `user?.modoCadete === true`.

- Colecciones cliente agregadas en Expo:
  - `VentasComercioCollection = COMERCIO_ventas`
  - `PedidosAsignadosComercioCollection = COMERCIO_pedidosAsignados`
  - `ColaCadetesPorTiendasComercioCollection = COMERCIO_colacadetesxtiendas`
  - La pantalla de home del cadete usa estas colecciones junto a `VentasRechargeCollection` para reconstruir el flujo real de asignacion.

- Shell y navegacion:
  - El shell cadete en Expo ya no usa `ModeShell`; ahora replica el patron operativo del legacy con:
    - `AppHeader` verde
    - drawer lateral propio montado con `Portal + Animated`
    - render directo de `HomePedidosComercio`
  - No se introdujo `react-native-drawer`; se reutilizo el patron de overlay del menu principal de Expo para evitar dependencias extra y mantener consistencia tecnica.

- Home del cadete:
  - `HomePedidosComercio.native.jsx` suscribe y combina:
    - `pedidosAsignados`
    - `ventasRecharge`
    - `colacadetesxtiendas`
  - Cada pedido asignado se enriquece por `idVentas` con su venta correspondiente antes de renderizarse.
  - El refresh manual sigue llamando `comercio.pedidos.getPedidosCadete({ cadeteId })` como reconciliacion del lado servidor.
  - La pantalla muestra tambien el conteo de tiendas en cola para reflejar el mecanismo real de asignacion, incluso cuando no hay pedidos activos.

- Seguimiento de ubicacion del cadete:
  - Se creo `hooks/useCadeteLocationTracking.native.js` como capa Expo de seguimiento foreground.
  - El hook:
    - pide permiso foreground de ubicacion
    - hidrata desde cache local existente (`deviceLocationCache.native.js`)
    - hace `watchPositionAsync(...)`
    - envia actualizaciones via `Meteor.call('cadete.updateLocation', locationData)`
    - refresca tambien al volver la app a `active`
  - La logica evita spam con distancia minima + heartbeat temporal antes de volver a mandar la misma ubicacion.

- Card operativo del pedido:
  - `CardPedidoComercio.native.jsx` porta el flujo real del legacy y reusa componentes ya migrados donde conviene:
    - `PedidoStepper.native.jsx`
    - `SlideToConfirm.native.jsx`
    - `MapaPedidos.native.jsx`
  - El slider avanza usando la maquina de estados activa del backend:
    - `PREPARACION_LISTO -> CADETEENLOCAL -> ENCAMINO -> CADETEENDESTINO -> ENTREGADO`
  - El CTA de ruta abre tienda o destino segun el estado actual del pedido.
  - La confirmacion fuerte solo se deja para la entrega final.

- Utilidades nuevas:
  - `components/comercio/pedidos/cadetePedidoUtils.js` centraliza:
    - colores de estado
    - labels del slider
    - siguiente estado
    - paso actual del stepper
    - helpers de subtotal, entrega y coordenadas
  - Esto evita depender de `data/comercio/mockData` del legacy dentro del proyecto Expo.

- Consideraciones tecnicas importantes:
  - La paridad actual de ubicacion es foreground/in-session. El servicio foreground persistente de Android del legacy (`Main.js` + `NotificacionAndroidForeground.js`) no se porto en esta iteracion.
  - Si mas adelante se exige paridad total en background, debe tratarse como una capa separada del UI cadete y no mezclarse con la migracion de pantallas.
  - El flujo de usuario normal no debe reutilizar estos componentes; los pedidos del cadete y los pedidos del cliente siguen siendo superficies distintas aunque compartan parte del dominio comercio.

- Validacion realizada:
  - `get_errors` limpio en todos los archivos nuevos de cadete.
  - `npx eslint --no-cache` limpio sobre:
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx`
    - `components/comercio/pedidos/HomePedidosComercio.native.jsx`
    - `components/cadete/CadeteNavigator.native.jsx`
    - `components/cadete/CadeteDrawerContent.native.jsx`
    - `hooks/useCadeteLocationTracking.native.js`
    - `components/comercio/maps/MapaPedidos.native.jsx`
    - `components/empresa/screens/pedidos/components/SlideToConfirm.native.jsx`
    - `app/(cadete)/HomePedidosComercio.native.tsx`

---

Resumen tecnico - Geolocalizacion en segundo plano profesional para modo Cadete en Expo

- Alcance aplicado:
  - El seguimiento de ubicacion del cadete dejo de depender solo del hook foreground de la pantalla.
  - Ahora existe un servicio nativo centralizado en:
    - `services/location/cadeteBackgroundLocation.native.js`
  - La activacion se controla desde el root de la app y solo corre cuando:
    - existe `userId`
    - `user?.modoCadete === true`

- Arquitectura validada:
  - Registro global del task con:
    - `expo-task-manager`
    - `expo-location`
  - El task se define una sola vez usando guard con `TaskManager.isTaskDefined(...)` para no duplicarse en Fast Refresh.
  - La importacion side-effect del servicio se hace en:
    - `app/_layout.native.tsx`
  - El arranque/parada del tracking se sincroniza en:
    - `app/index.native.tsx`
    - mediante `syncCadeteBackgroundLocation({ enabled, userId })`

- Decision tecnica importante:
  - En segundo plano no se usa `Meteor.call(...)` para enviar ubicacion.
  - El servicio resuelve la base HTTP a partir de `getMeteorUrl()` y envia por fetch a:
    - `POST /api/location`
  - Tambien consulta periodicamente:
    - `POST /api/cadete/isActive`
  - Si el backend responde que el cadete ya no esta activo, el servicio se detiene y limpia su configuracion local.

- Comportamiento por plataforma:
  - Android:
    - `timeInterval` de `30000ms`
    - `distanceInterval` de `15m`
    - foreground service notification activa mientras el modo cadete esta corriendo
  - iOS:
    - `UIBackgroundModes` incluye `location`
    - `activityType` configurado como `Location.ActivityType.OtherNavigation`
    - tracking pensado para actualizacion por movimiento con background location real

- Persistencia y estado:
  - El servicio usa `expo-secure-store` para guardar:
    - config activa del tracking (`userId`, `meteorUrl`)
    - ultimo estado del servicio (`lastSentAt`, `lastSentLocation`, `lastError`, `permissionStatus`)
  - Esto permite que el hook de UI pueda hidratarse sin depender de que la pantalla haya estado abierta todo el tiempo.

  - `hooks/useCadeteLocationTracking.native.js` ya no es la fuente de verdad del tracking.

- Hook de UI refactorizado:
  - Ahora:
    - lee estado del servicio background
    - se suscribe a cambios de estado
    - consulta si el task sigue corriendo
    - usa `sendCadeteLocationNow(...)` para refresh manual
  - El refresh manual y la sincronizacion inicial fuerzan envio inmediato al backend, aunque no haya habido suficiente desplazamiento desde el ultimo punto.

- Integracion visual:
  - `components/comercio/pedidos/HomePedidosComercio.native.jsx` ahora muestra que el seguimiento puede permanecer activo incluso en segundo plano.
  - La UI distingue cuando el tracking esta operando en modo `Segundo plano`.

- Configuracion Expo requerida:
  - En `app.json` se habilito para `expo-location`:
    - `isIosBackgroundLocationEnabled: true`
    - `isAndroidBackgroundLocationEnabled: true`
    - `isAndroidForegroundServiceEnabled: true`
    - permisos `Always` en iOS
  - En Android se agregaron permisos:
    - `ACCESS_BACKGROUND_LOCATION`
    - `FOREGROUND_SERVICE`
    - `FOREGROUND_SERVICE_LOCATION`

- Regla practica:
  - Este flujo debe validarse en dev build o build nativo real; no asumir paridad completa en Expo Go para background execution.
  - Si otra pantalla necesita reflejar el estado del tracking del cadete, debe leer el servicio centralizado y no volver a crear otro `watchPositionAsync(...)` paralelo.
  - Si se toca el contrato con backend, mantener siempre estos dos endpoints como fuente de verdad del tracking en background:
    - `/api/location`
    - `/api/cadete/isActive`

- Validacion realizada:
  - `npx expo config --json` resolvio correctamente la configuracion actualizada.
  - `get_errors` limpio en:
    - `services/location/cadeteBackgroundLocation.native.js`
    - `hooks/useCadeteLocationTracking.native.js`
    - `app/index.native.tsx`
    - `app/_layout.native.tsx`
    - `components/comercio/pedidos/HomePedidosComercio.native.jsx`
  - `npx eslint --no-cache` limpio sobre esos mismos archivos.

---

Resumen tecnico - Slider de Mis pedidos del cadete con gesto robusto y bloqueo temporal del scroll

- Problema detectado:
  - El slider de `components/empresa/screens/pedidos/components/SlideToConfirm.native.jsx` estaba capturando el gesto de forma fragil dentro de la pantalla scrolleable `HomePedidosComercio.native.jsx`.
  - Solo se sentia realmente arrastrable sobre el pulgar y podia competir con el scroll vertical de `Mis pedidos`, dando la sensacion de que “no deja deslizar bien”.

- Correccion aplicada:
  - El gesture handling se hizo mas tolerante y preciso:
    - el `PanResponder` ahora vive sobre toda la pista, no solo sobre el thumb
    - calcula offset real del toque para que el pulgar siga el dedo incluso si se inicia fuera del centro exacto
    - exige predominio horizontal en `onMoveShouldSetPanResponder` para reducir activaciones accidentales
    - bloquea la terminacion del responder mientras el gesto esta activo
  - El slider ahora expone `onInteractionChange(...)` y la pantalla `HomePedidosComercio.native.jsx` desactiva temporalmente el `ScrollView` mientras el usuario esta arrastrando.

- Mejora UX aplicada:
  - Se endurecio el flujo de confirmacion para evitar dobles disparos:
    - estado interno `isCompleting`
    - el thumb queda al final mientras el pedido se esta actualizando
    - el reset ocurre de forma mas natural al terminar la transicion
  - Se reforzo visualmente el thumb con sombra dinamica segun drag/confirmacion para hacerlo mas legible y tactil.

- Regla practica:
  - Si un slider horizontal vive dentro de una lista o `ScrollView` vertical, no basta con que el thumb sea arrastrable; tambien hay que coordinar el gesto con el scroll padre.
  - En este proyecto, cualquier confirmacion por slide dentro de superficies scrolleables debe poder notificar al contenedor para pausar temporalmente el scroll durante el arrastre.

Notas adicionales - `MapView` dentro de cards puede dibujarse por encima de siblings

- Hallazgo validado en el card de pedidos del cadete:
  - `react-native-maps` renderiza una superficie nativa que puede quedar visualmente por encima de componentes previos del mismo card, aunque el orden JSX parezca correcto.
  - El sintoma visible fue el `PedidoStepper` apareciendo por detras del mapa cuando el pedido estaba en estado `Cadete en local`.

- Correccion aplicada:
  - `CardPedidoComercio.native.jsx` ahora envuelve el stepper en una capa propia con `position: 'relative'`, `zIndex` y `elevation` superiores.
  - La seccion real del mapa y `MapaPedidos.native.jsx` quedan explicitamente en una capa base con `zIndex: 0` / `elevation: 0`.
  - En Android, `MapaPedidos.native.jsx` usa `liteMode` porque el mapa dentro del card es una previsualizacion de ruta y asi se evita que Google Maps use una superficie nativa interactiva que atraviese el layout.

- Regla practica:
  - Si un `MapView` vive dentro de una card junto a steppers, chips o overlays, no confiar solo en el orden del JSX.
  - Definir capas explicitas para los elementos que deben quedar por encima y mantener el mapa en una capa base.
  - Para mapas de preview dentro de listas/cards en Android, preferir `liteMode` salvo que el usuario realmente necesite interaccion completa dentro de esa miniatura.
  - No meter overlays generales como hijos directos de `MapView`; dentro del mapa dejar solo elementos compatibles como `Marker` y `Polyline`.

  ***

  Resumen tecnico - Modo cadete: Surface sin fondo forzado, botones alineados al theme y slider con drag real hasta el final
  - Ajuste aplicado en:
    - `components/comercio/pedidos/HomePedidosComercio.native.jsx`
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx`
    - `components/empresa/screens/pedidos/components/SlideToConfirm.native.jsx`

  - Criterio visual validado para React Native Paper:
    - `Surface` no debe recibir `backgroundColor` hardcodeado cuando se espera que conserve el comportamiento natural del theme.
    - Si una sub-superficie necesita color personalizado (bloque de comentario, metrica, estado completado, etc.), conviene usar `View` o una capa interna propia y dejar el `Surface` contenedor sin forzar fondo.
    - En botones Paper no conviene fijar colores de texto de forma arbitraria si la accion puede resolverse con el tema actual; si se personaliza, debe revisarse explicitamente en claro y oscuro.

  - Ajustes aplicados en modo cadete:
    - Se eliminaron fondos fijos de varios `Surface` del flujo de pedidos del cadete.
    - Los colores de textos auxiliares, chips y bloques suaves ahora se derivan del `theme` (`onSurface`, `onSurfaceVariant`, `background`) en lugar de asumir paleta light.
    - Los bloques internos que si necesitan tinte visual quedaron como `View` con fondo controlado por palette local, sin romper la superficie Paper principal.

  - Slider de `Mis pedidos`:
    - El bug de deslizamiento venia de un calculo fragil basado en `locationX` y offset del pulgar.
    - Se cambio a un modelo mas robusto basado en:
      - valor inicial del thumb en el momento del `grant`
      - `gestureState.dx` como delta real del arrastre
      - clamp contra `maxSlide`
    - Esto hace que el slider llegue correctamente al final incluso en pantallas pequenas o cuando el gesto empieza fuera del centro exacto del thumb.
    - El umbral de confirmacion tambien se suavizo (`0.82`) para reducir falsos negativos al finalizar el gesto.

  - Responsividad aplicada:
    - `HomePedidosComercio` ahora ajusta padding horizontal y ancho maximo util segun `useWindowDimensions()`.
    - `CardPedidoComercio` adapta su densidad para anchos compactos, especialmente en los bloques de metricas.
    - La idea es que el flujo funcione de forma consistente en telefonos estrechos y pantallas mas amplias sin reventar columnas ni forzar overflow visual.

  - Regla practica:
    - En este proyecto, cuando se trabaje con React Native Paper en pantallas operativas, asumir que el soporte light/dark ya viene del componente. Solo personalizar color cuando realmente haga falta y siempre con una palette dependiente de `theme.dark`, no con hex fijos pensados para una sola apariencia.

  ***

  Resumen tecnico - Task de background del cadete debe registrarse antes de `expo-router`
  - Problema detectado:
    - El runtime de `expo-task-manager` estaba lanzando:
      - `Task "vidkar-cadete-background-location-v1" not found for app ID 'mainApplication'`
    - La definicion del task existia en `services/location/cadeteBackgroundLocation.native.js`, pero su carga dependia de `app/_layout.native.tsx`.

  - Causa raiz validada:
    - Para tareas de background, importar el modulo desde el arbol de rutas no es suficientemente temprano.
    - En ciertos arranques en segundo plano, Expo despierta la app para resolver el task antes de que `expo-router` haya montado el layout y, por tanto, antes de que ese modulo haya sido evaluado.

  - Solucion aplicada:
    - Se creo un entrypoint propio en la raiz del proyecto:
      - `index.js`
    - Ese entrypoint importa primero los side effects globales:
      - `./services/location/cadeteBackgroundLocation.native`
      - `./services/notifications/PushMessaging.native`
    - Y luego carga:
      - `expo-router/entry`
    - `package.json` dejo de usar `expo-router/entry` como `main` directo y ahora apunta a `./index.js`.
    - `app/_layout.native.tsx` dejo de importar esos servicios para evitar dependencia redundante del arbol de navegacion.

  - Regla practica:
    - Cualquier task de `expo-task-manager` o side effect global critico del runtime debe registrarse desde el entrypoint mas temprano posible del bundle, no desde una pantalla, layout o rama del router.
    - Si un task falla con `Task not found for app ID ...`, revisar primero si el modulo que hace `TaskManager.defineTask(...)` realmente se importa antes de `expo-router` y no solo dentro del arbol `app/`.

  ***

  Resumen tecnico - SecureStore en Expo no acepta `:` en las keys
  - Problema detectado:
    - El tracking del cadete y la cache de ubicacion estaban intentando leer/escribir claves como:
      - `cadete:background-location:config:v1`
      - `cadete:background-location:status:v1`
      - `device:last-location:v1`
    - En `expo-secure-store`, esas keys son invalidas porque el runtime solo acepta caracteres alfanumericos, `.`, `-` y `_`.

  - Sintoma visible:
    - Warnings repetidos del estilo:
      - `Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".`
    - Eso rompe silenciosamente lectura de cache, estado del tracking y persistencia de configuracion aunque la logica de ubicacion sea correcta.

  - Solucion aplicada:
    - Se normalizaron las keys a formatos validos:
      - `cadete.background-location.config.v1`
      - `cadete.background-location.status.v1`
      - `device.last-location.v1`

  - Regla practica:
    - En este proyecto no usar `:` en claves de `expo-secure-store`.
    - Si una feature necesita versionado de key, usar separadores permitidos como `.` o `-`.

  ***

  Resumen tecnico - `deliveryFee` del cadete debe convertirse a la moneda cobrada del pedido
  - Hallazgo validado:
    - En `components/comercio/pedidos/cadetePedidoUtils.js`, `venta.producto.comisiones.costoTotalEntrega` no debe mostrarse crudo si `venta.producto.comisiones.moneda` difiere de la moneda en la que se presenta o cobra el pedido.
    - La fuente de verdad del backend para conversion de moneda ya existe y se usa en Expo en el wizard del carrito:
      - `Meteor.call('moneda.convertir', precio, monedaOrigen, monedaDestino, adminId?)`

  - Correccion aplicada:
    - `getDeliveryFee(...)` paso a resolver la conversion de forma async reutilizando `moneda.convertir`.
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx` ahora hidrata `costoEntrega` en estado local y actualiza el valor convertido segun la moneda cobrada visible del pedido.

  - Regla practica:
    - Si se muestra costo de entrega, comision o subtotal derivado de `comisionesComercio`, no asumir que ya esta en la misma moneda del card o del checkout.
    - Reutilizar `moneda.convertir` con el mismo patron async ya usado en `WizardConStepper.native.jsx` en lugar de convertir manualmente o mezclar monedas en UI.

  ***

  Resumen tecnico - No renderizar conversiones async directamente en JSX de comercio/cadete
  - Hallazgo validado:
    - `convertMoney(...)` en `components/comercio/pedidos/cadetePedidoUtils.js` devuelve una `Promise` porque internamente usa `Meteor.call('moneda.convertir', ...)`.
    - Si se usa directo dentro del JSX, por ejemplo en una metrica como `Costo por KM`, React no renderiza el valor numerico y la UI queda vacia o inconsistente.

  - Correccion aplicada:
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx` ahora resuelve `costoPorKm` en `useEffect` y lo guarda en estado local antes de renderizar.
    - El JSX solo consume valores ya resueltos (`number` o fallback), nunca una promesa.

  - Regla practica:
    - En este proyecto no llamar helpers async dentro del render de React.
    - Si una conversion depende de `Meteor.call`, resolverla en `useEffect`, hook o view-model previo y luego pintar el resultado sincronico en la UI.

  ***

  Resumen tecnico - Geolocalizacion en tiempo real para modo Cadete con watcher foreground + heartbeat
  - Ajuste aplicado:
    - `hooks/useCadeteLocationTracking.native.js` ahora inicia un `Location.watchPositionAsync(...)` mientras la app esta activa.
    - Ademas mantiene un heartbeat cada `30s` reutilizando `sendCadeteLocationNow(...)` para garantizar envio periodico al backend incluso si no entra un cambio de posicion inmediato.

  - Contrato funcional final:
    - app activa:
      - enviar ubicacion cuando cambia la posicion del cadete
      - reenviar tambien cada `30s`
    - app en segundo plano:
      - el envio queda a cargo de `startLocationUpdatesAsync(...)` y del task `vidkar-cadete-background-location-v1`

  - Decisiones tecnicas importantes:
    - `sendCadeteLocationNow(...)` ahora acepta `locationOverride`, `trackingMode` y un umbral de distancia configurable para reutilizar el mismo pipeline de envio tanto desde watcher foreground como desde el task background.
    - El watcher foreground usa un umbral mas sensible que background para reaccionar mejor a cambios reales de ubicacion mientras el cadete esta usando la app.
    - El hook no sigue enviando en background por su cuenta; cuando `AppState` deja de estar en `active`, se evita duplicar envios y se deja el segundo plano al task nativo.

  - Regla practica:
    - Si en modo cadete se quiere “tiempo real” con la app abierta, no alcanza con leer estado o hacer refresh manual; hace falta un watcher foreground real.
    - Si ya existe task background, el watcher foreground debe apagarse logicamente fuera de `active` para no competir con el servicio nativo.

  ***

  Resumen tecnico - No solapar consultas GPS pendientes en tracking del cadete
  - Ajuste aplicado:
    - `services/location/cadeteBackgroundLocation.native.js` ahora serializa las llamadas que necesitan pedir una ubicacion nueva con `Location.getCurrentPositionAsync(...)`.
    - Si heartbeat, refresh manual u otro disparador vuelven a llamar `sendCadeteLocationNow(...)` mientras la consulta GPS anterior sigue pendiente, reutilizan la misma promesa en curso en vez de abrir otra lectura paralela.

  - Criterio tecnico validado:
    - El riesgo real no era solo duplicar envios al backend, sino disparar varias consultas lentas al GPS cuando una sola podia tardar mas de `30s`.
    - El lock debe vivir en el servicio central, no en el componente UI, porque varios disparadores distintos pueden terminar llamando el mismo metodo.

  - Regla practica:
    - Si `sendCadeteLocationNow(...)` necesita obtener la ubicacion actual por su cuenta, no debe lanzar una segunda consulta mientras exista otra pendiente del mismo tipo.
    - Las actualizaciones que ya traen `locationOverride` desde `watchPositionAsync(...)` pueden seguir entrando por separado; el guard aplica especificamente a las consultas activas de `getCurrentPositionAsync(...)`.

  ***

  Resumen tecnico - Tracking del cadete no debe depender solo del montaje de la UI
  - Hallazgo importante:
    - Si el servicio de ubicacion del cadete solo se reinicia desde `app/index.native.tsx` cuando el shell ya resolvio al usuario, puede haber ventanas de arranque donde `userId` aun no exista y el tracking se detenga por error.
    - Eso es especialmente delicado al relanzar la app o cuando el runtime levanta el bundle por trabajo de background.

  - Ajuste aplicado:
    - `services/location/cadeteBackgroundLocation.native.js` ahora intenta restaurar automaticamente el tracking persistido al cargar el modulo, leyendo la config guardada y volviendo a registrar `startLocationUpdatesAsync(...)` si hace falta.
    - `app/index.native.tsx` ya no debe llamar a `syncCadeteBackgroundLocation(...)` mientras `userId` siga sin resolverse; primero debe existir una sesion concreta.

  - Regla practica:
    - El servicio del cadete debe poder auto-recuperarse desde su propia config persistida y no depender unicamente de que la pantalla del cadete o el shell principal lleguen a montarse.
    - En el root, no tratar `userId === null` durante bootstrap como señal suficiente para apagar el tracking; puede ser solo una sesion aun no rehidratada.

  ***

  Resumen tecnico - Modulo local Expo del cadete: errores de build por archivos duplicados y validacion final iOS/Android
  - Hallazgo validado:
    - Al crear el modulo local `modules/cadete-background-tracking`, varios archivos quedaron concatenados dos veces por un patch defectuoso.
    - El patron de fallo fue consistente en varios tipos de archivo:
      - JSON duplicado
      - Gradle duplicado
      - AndroidManifest duplicado
      - clases Kotlin duplicadas
      - clases Swift duplicadas
    - En iOS esto se manifesto con errores como:
      - `invalid redeclaration of 'CadeteBackgroundTrackingModule'`
      - `invalid redeclaration of 'CadeteBackgroundTrackingAppDelegateSubscriber'`
      - `invalid redeclaration of 'CadeteNativeLocationService'`
      - `consecutive statements on a line must be separated by ';'`

  - Correccion aplicada:
    - Se limpiaron los duplicados en los archivos Swift del modulo:
      - `ios/CadeteBackgroundTrackingModule.swift`
      - `ios/CadeteBackgroundTrackingAppDelegateSubscriber.swift`
      - `ios/CadeteNativeLocationService.swift`
    - Tambien se habian limpiado previamente los duplicados equivalentes en Android y archivos de configuracion del modulo.

  - Validacion final realizada:
    - `pod install` exitoso con el pod local `CadeteBackgroundTracking` instalado.
    - `:app:compileDebugKotlin` exitoso en Android.
    - `npx expo run:ios --device` completo, con app instalada y Metro levantado.

  - Ajuste funcional importante adicional:
    - `services/location/cadeteBackgroundLocation.native.js` ahora exporta un flag para saber si el modulo nativo esta disponible.
    - `hooks/useCadeteLocationTracking.native.js` ya no debe iniciar `watchPositionAsync(...)` ni heartbeat JS cuando el modulo nativo existe.
    - En modo native-first, el hook debe actuar solo como capa de estado/UI para evitar duplicar envios de ubicacion en foreground.

  - Regla practica:
    - Si un modulo local Expo falla con redeclaraciones o errores absurdos de parseo despues de un patch grande, revisar primero si el archivo completo quedo pegado dos veces.
    - No dar por valido un modulo local solo porque el editor no marque errores; validar siempre con:
      - `pod install`
      - compilacion Android/Kotlin
      - un `expo run:ios` o build nativo real
    - Si el proyecto entra en modo native-first, cualquier watcher JS previo debe apagarse explicitamente para no competir con el servicio nativo.

  ***

  Resumen tecnico - Google Maps Android en Expo con plugin local explicito para forzar `com.google.android.geo.API_KEY`
  - Hallazgo validado:
    - Aunque `app.json` ya tenia `expo.android.config.googleMaps.apiKey`, el `prebuild` no estaba dejando la meta-data `com.google.android.geo.API_KEY` dentro de `android/app/src/main/AndroidManifest.xml`.
    - En este proyecto no conviene volver a editar `android/` manualmente porque esas carpetas son generadas por Expo.

  - Correccion aplicada:
    - Se creo un config plugin local en:
      - `plugins/with-vidkar-google-maps-key.js`
    - Ese plugin llama explicitamente a:
      - `AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey(config)`
    - El plugin se registro en `app.json` dentro de `expo.plugins`.

  - Criterio tecnico validado:
    - `react-native-maps` en Expo puede depender de auto-plugins/versioned plugins de `@expo/prebuild-config`, pero si la inyeccion no aterriza en el manifest real conviene fijarla con un plugin local explicito y reproducible.
    - La fuente de verdad sigue siendo `app.json`; el plugin local solo garantiza que esa config llegue al manifest Android generado.

  - Regla practica:
    - Si Android vuelve a fallar por Google Maps API key en Expo, primero verificar el manifest generado tras `prebuild`.
    - Si falta `com.google.android.geo.API_KEY`, corregir la cadena de config plugins, no el `android/` generado a mano.

  ***

  Resumen tecnico - Android native-first del cadete debe exponer ubicacion viva a la app, no solo estado del servicio
  - Problema detectado:
    - En Android, el servicio foreground nativo del cadete seguia corriendo, pero la app Expo no reflejaba cambios reales de ubicacion salvo cuando el usuario tocaba el boton manual de `Actualizar ubicación`.
    - La causa no estaba en el endpoint backend ni en el boton, sino en la integracion entre el modulo nativo y la capa JS.

  - Causa raiz validada:
    - En modo `native-first`, `useCadeteLocationTracking.native.js` deja de enviar ubicacion con `watchPositionAsync(...)` y pasa a confiar en `NativeCadeteBackgroundTracking.getStatus()`.
    - Pero el servicio Android (`CadeteTrackingService.kt`) solo persistia estado basico:
      - `trackingActive`
      - `trackingMode`
      - `lastError`
      - `lastSentAt`
    - No persistia ni exponia:
      - `lastKnownLocation`
      - `lastSentLocation`
    - Resultado: la app sabia que el servicio seguia activo, pero no tenia coordenadas nuevas para refrescar la UI con ubicacion real.

  - Correccion aplicada:
    - `CadeteTrackingService.kt` ahora persiste en `SharedPreferences` tanto:
      - `lastKnownLocation`
      - `lastSentLocation`
        como JSON normalizado con lat/lng/accuracy/speed/timestamp.
    - `getStatus(context)` del modulo nativo ahora devuelve esas ubicaciones a JS.
    - El servicio actualiza ese estado en cada muestra de ubicacion (`handleLocationSample`) y no solo despues de un envio HTTP exitoso.

  - Ajuste complementario en Expo JS:
    - `useCadeteLocationTracking.native.js` ya no hidrata `lastLocation` solo desde cache JS/local.
    - Ahora prioriza en este orden:
      - `statusSnapshot.lastKnownLocation`
      - `statusSnapshot.lastSentLocation`
      - cache persistida previa
    - Incluso cuando el modulo nativo esta disponible, la app mantiene un `watchPositionAsync(...)` solo para refrescar la UI local con ubicacion viva mientras la app esta activa.
    - En ese modo el watcher NO vuelve a enviar ubicacion al backend; solo alimenta el estado visual para no duplicar trafico con el servicio nativo.

  - Consideracion importante sobre foreground notification:
    - El servicio sigue usando notificacion foreground persistente, pero ahora se refuerza semanticamente con categoria de servicio (`CATEGORY_SERVICE`).
    - Aun asi, el problema principal reportado por el usuario no era la existencia del servicio, sino la falta de reflejo de ubicacion real en la app.

  - Regla practica:
    - En este proyecto, cuando un modulo local Expo entra en modo `native-first`, no basta con exponer `trackingActive` y `lastSentAt`.
    - La UI necesita tambien una ubicacion viva o al menos la ultima muestra nativa util.
    - Si un boton manual parece ser la unica forma de “despertar” la ubicacion en pantalla, revisar primero si el modulo nativo realmente esta exportando coordenadas y no solo flags de estado.

  ***

  Resumen tecnico - Android del cadete debe copiar el patron legacy: el servicio nativo decide y envia
  - Problema detectado:
    - El modulo Expo habia terminado con una mezcla de responsabilidades entre JS y Android nativo.
    - Aunque el servicio Android existia, el root seguia arrancandolo y deteniendolo con `user?.modoCadete` local y el hook JS todavia conservaba parte de la logica de ubicacion/envio.
    - Eso hacia mas fragil el flujo y se alejaba del contrato real del legacy `MyTrackingService.java`.

  - Patron legacy confirmado:
    - El servicio Android se arranca por sesion y se queda vivo.
    - Cada ~20s consulta `POST /api/cadete/isActive` con el `userId` persistido.
    - Si el backend responde activo:
      - inicia foreground
      - activa `requestLocationUpdates(...)`
    - Si el backend responde inactivo:
      - detiene `requestLocationUpdates(...)`
      - baja el foreground
    - Cada callback de ubicacion envía directamente al backend por `POST /api/location`.
    - El cliente JS no decide el envio ni el gate final de `modoCadete`.

  - Correccion aplicada en Expo:
    - `CadeteTrackingService.kt` se reestructuro para seguir ese patron:
      - checker nativo cada 20s
      - gate por `/api/cadete/isActive`
      - encendido/apagado de location updates desde el propio servicio
      - envio HTTP al backend desde el callback nativo de ubicacion
    - Se quitaron del servicio Android las heuristicas extra que no eran la fuente de verdad del legacy, como la mezcla de heartbeat JS/foreground state para decidir cuando enviar.

  - Ajuste de wiring en Expo:
    - `app/index.native.tsx` ya no sincroniza el servicio con `user?.modoCadete` local.
    - Ahora lo sincroniza por sesion (`userId`) y deja que el modulo nativo consulte al backend para saber si debe trackear o no.
    - `useCadeteLocationTracking.native.js` queda como lector de estado/UI y ya no intenta enviar ubicacion cuando el modulo nativo Android esta disponible.

  - Regla practica:
    - Si el objetivo es paridad con el legacy en Android, el flujo correcto es:
      - JS inicia/rehidrata el servicio por sesion
      - el servicio nativo consulta `modoCadete` al backend
      - el servicio nativo decide si enciende tracking
      - el servicio nativo hace el `POST /api/location`
    - No volver a mezclar el gate final de `modoCadete` ni el envio principal en el hook JS cuando el modulo Android nativo ya existe.

  Notas adicionales - En Android moderno el servicio del cadete debe subir a foreground inmediatamente al arrancar
  - Hallazgo importante:
    - Copiar literalmente el legacy `startService(...)` + `startForeground(...)` diferido no es suficiente con targetSdk moderno.
    - Si el servicio se arranca sin `startForegroundService(...)` o tarda demasiado en llamar `startForeground(...)`, Android puede impedir que siquiera llegue al checker del endpoint.

  - Ajuste aplicado:
    - `CadeteTrackingService.start(...)` ahora usa `ContextCompat.startForegroundService(...)`.
    - `onStartCommand(...)` sube inmediatamente el servicio a foreground con una notificacion de estado base antes de que el checker consulte `/api/cadete/isActive`.
    - El checker mantiene viva esa foreground notification y solo prende o apaga `requestLocationUpdates(...)` segun la respuesta del backend.

  - Regla practica:
    - En este proyecto, el servicio Android del cadete debe permanecer vivo en foreground aunque aun este “esperando activacion” del backend.
    - Lo que cambia por endpoint es el tracking de ubicacion, no la existencia del servicio una vez arrancado por sesion.

  ***

  Resumen tecnico - Servicio Android del cadete con foreground inmediato y trazas nativas minimas
  - Hallazgo validado:
    - El servicio del cadete podia quedar en un estado donde Android aceptaba el `startForegroundService(...)`, pero sin una subida inmediata a foreground el proceso seguia siendo fragil y dificil de diagnosticar en runtime.
    - Ademas, hacia falta visibilidad nativa minima para confirmar si el ciclo real estaba ocurriendo:
      - arranque del servicio
      - consulta a `/api/cadete/isActive`
      - activacion de `requestLocationUpdates(...)`
      - envio a `/api/location`

  - Ajuste aplicado en `modules/cadete-background-tracking/.../CadeteTrackingService.kt`:
    - El servicio mantiene el patron native-first ya validado, pero ahora deja logs claros con tag:
      - `CadeteTrackingService`
    - Se agregaron trazas en puntos criticos:
      - `onCreate()`
      - `onStartCommand(...)`
      - checker backend
      - `startLocationUpdates()`
      - cada muestra de ubicacion
      - exito/error al consultar `modoCadete`
      - exito/error al enviar ubicacion

  - Validacion realizada:
    - `:cadete-background-tracking:compileDebugKotlin` OK
    - `:app:compileDebugKotlin` OK

  - Regla practica:
    - Si el tracking del cadete vuelve a fallar en Android, revisar primero `adb logcat | grep CadeteTrackingService` antes de asumir que el problema esta en Expo Router o en el hook JS.
    - En este modulo, el hook JS no es la fuente principal del envio; el diagnostico correcto del runtime debe empezar por el servicio nativo y sus logs.

---

Resumen tecnico - `PedidoStepper.native.jsx`: evitar `Surface` de Paper en nodos pequenos del stepper

- Problema detectado:
  - En el flujo cadete, `components/comercio/pedidos/components/PedidoStepper.native.jsx` podia lanzar en runtime:
    - `TypeError: Cannot read property 'forEach' of null`
  - El stack apuntaba a la linea del circulo del stepper donde se renderizaba `Surface`.
  - La constante local `steps` no era la causa real; el fallo quedaba asociado al render interno de `Surface` en ese contexto.

- Correccion aplicada:
  - El circulo de cada paso dejo de usar `Surface` y paso a renderizarse con `View` simple.
  - Tambien se normalizo `currentStep` a numero valido con fallback `1` para evitar comparaciones raras si llega `null`, `undefined` o string inesperado.

- Criterio tecnico validado:
  - En elementos pequenos, puramente decorativos y repetidos como los nodos de un stepper, `Surface` no aporta valor funcional suficiente como para justificar riesgo de runtime.
  - Si solo se necesita:
    - fondo
    - borde
    - radio
    - centrado
      conviene usar `View` y dejar `Surface` para contenedores donde realmente importe elevation o integracion visual de Paper.

- Regla practica:
  - Si un error runtime apunta a un `Surface` dentro de un item pequeno y repetido, considerar primero reemplazarlo por `View` antes de perseguir un bug fantasma en los datos del componente.

  ***

  Resumen tecnico - Log nativo de `KEY_METEOR_URL` al arrancar el servicio del cadete
  - Ajuste aplicado en `CadeteTrackingService.kt`:
    - `onStartCommand(...)` ahora imprime explicitamente en logcat:
      - el valor de la constante `KEY_METEOR_URL`
      - y el valor persistido actual de `getStoredMeteorUrl()`

  - Criterio tecnico:
    - Para depurar el modulo nativo del cadete, no basta con saber que el servicio arrancó; tambien conviene confirmar desde logcat que la key esperada del `SharedPreferences` y la URL almacenada coinciden con el wiring JS.

  - Regla practica:
    - Si hay dudas sobre por que el servicio consulta mal el backend o no resuelve el endpoint correcto, revisar primero la linea:
      - `KEY_METEOR_URL=... storedMeteorUrl=...`
    - El comando util de diagnostico sigue siendo `adb logcat | grep CadeteTrackingService`.

  ***

  Resumen tecnico - Endpoint Android del cadete alineado con host fijo del legacy
  - Hallazgo validado:
    - El servicio Expo estaba derivando la base HTTP desde `storedMeteorUrl`, por ejemplo:
      - `ws://38sljhvg-3000.brs.devtunnels.ms/websocket -> http://38sljhvg-3000.brs.devtunnels.ms`
    - Pero el servicio Android legacy `MyTrackingService.java` no usa esa derivacion para tracking; consulta siempre el backend fijo:
      - `https://www.vidkar.com/api/cadete/isActive`
      - `https://www.vidkar.com/api/location`

  - Correccion aplicada en `CadeteTrackingService.kt`:
    - `isCadeteModeActive(...)` y `postLocation(...)` ahora usan:
      - `LEGACY_API_BASE_URL = "https://www.vidkar.com"`
    - Se elimino la derivacion HTTP desde `meteorUrl` dentro del servicio Android.
    - `onStartCommand(...)` ahora loggea tambien:
      - `legacyApiBaseUrl=https://www.vidkar.com`

  - Regla practica:
    - Para el tracking nativo Android del cadete, la fuente de verdad del host backend debe seguir el contrato legacy mientras no se rediseñe explicitamente toda la infraestructura de tracking.
    - No asumir que `meteorUrl` del cliente es automaticamente la base correcta para los endpoints HTTP del servicio Android del cadete.

  ***

  Resumen tecnico - Notificacion foreground del cadete no removible salvo por el propio servicio
  - Ajuste aplicado en `CadeteTrackingService.kt`:
    - La notificacion foreground ahora se publica con endurecimiento explicito de persistencia:
      - `setOngoing(true)`
      - `setAutoCancel(false)`
      - `Notification.FLAG_ONGOING_EVENT`
      - `Notification.FLAG_NO_CLEAR`
      - `NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE`
    - El servicio ya no depende solo del comportamiento implicito de `startForeground`; ahora usa `ServiceCompat.startForeground(...)` con `FOREGROUND_SERVICE_TYPE_LOCATION` cuando aplica.

  - Criterio funcional validado:
    - La notificacion del modo cadete no debe poder deslizarse ni desaparecer por acciones normales del usuario.
    - Solo debe eliminarse cuando el propio servicio lo haga explicitamente, por ejemplo si deja de aplicar el flujo de cadete y se ejecuta `stopForeground(STOP_FOREGROUND_REMOVE)`.

  - Regla practica:
    - Si esta notificacion vuelve a poder quitarse manualmente, revisar primero tres puntos en el servicio:
      - flags `ONGOING_EVENT` y `NO_CLEAR`
      - `setAutoCancel(false)`
      - `ServiceCompat.startForeground(...)` con el tipo correcto de foreground service

---

Resumen tecnico - Tracking/foreground del cadete solo mientras `modoCadete` este activo

- Problema detectado:
  - El wiring visible del root en `app/index.native.tsx` estaba sincronizando el tracking del cadete con `Boolean(userId)` y no con `user?.modoCadete`.
  - Efecto practico:
    - Android podia mantener el foreground service aunque el usuario ya no estuviera en modo cadete.
    - iOS podia seguir restaurando tracking persistido y mostrar actividad de ubicacion al minimizar aunque `modoCadete` ya no correspondiera.

- Correccion aplicada en Expo root:
  - `app/index.native.tsx` ahora espera a resolver sesion/documento de usuario antes de sincronizar el servicio.
  - La condicion efectiva de tracking quedo alineada a:
    - `userId` existente
    - `ready === true`
    - `user?.modoCadete === true`
  - Si la sesion aun no esta rehidratada (`!connected && !userId`) o el documento de usuario todavia no esta listo (`userId && !ready`), el root no fuerza ni start ni stop prematuros.

- Correccion aplicada en Android nativo:
  - `CadeteTrackingService.kt` ya no mantiene foreground “idle” cuando el backend responde que `modoCadete` esta inactivo.
  - Ahora, si `/api/cadete/isActive` devuelve `false`:
    - se desactiva tracking
    - se limpia config persistida
    - se hace `stopForeground(STOP_FOREGROUND_REMOVE)`
    - se hace `stopSelf()`
  - Importante:
    - se distinguio explicitamente `modoCadete = false` de un error transitorio al consultar backend
    - si la validacion falla por red/backend, el servicio mantiene su estado actual y reintenta luego; no se apaga como si fuera un `false` real

- Correccion aplicada en iOS nativo:
  - `CadeteNativeLocationService.restoreTrackingIfNeeded()` ahora valida primero `shouldCadeteRemainActive()` antes de reactivar `CLLocationManager` desde config persistida.
  - Si el backend ya no considera activo el modo cadete, limpia config y no vuelve a encender la ubicacion.

- Ajuste UX inmediato al salir del modo cadete:
  - `components/cadete/CadeteDrawerContent.native.jsx` ahora llama tambien `syncCadeteBackgroundLocation({ enabled: false })` tras `users.toggleModoCadete(false)` exitoso.
  - Esto evita depender solo de la reactividad posterior del usuario para apagar foreground/ubicacion.

- Validacion realizada:
  - `get_errors` limpio en:
    - `app/index.native.tsx`
    - `components/cadete/CadeteDrawerContent.native.jsx`
    - `modules/cadete-background-tracking/.../CadeteTrackingService.kt`
    - `modules/cadete-background-tracking/.../CadeteNativeLocationService.swift`
  - `./gradlew :app:compileDebugKotlin` OK tras los cambios del servicio Android.

- Regla practica:
  - En este proyecto, la condicion de foreground/location del cadete debe seguir el estado real de `modoCadete`, no solo la existencia de sesion.
  - Si reaparece una notificacion foreground con `modoCadete` inactivo, revisar primero estos tres puntos en este orden:
    - gating del root en `app/index.native.tsx`
    - shutdown del servicio Android en `CadeteTrackingService.kt`
    - restauracion persistida en `CadeteNativeLocationService.swift`

---

Resumen tecnico - Checkout Expo en efectivo debe esperar la orden base reactiva antes de generar la venta

- Problema detectado:
  - En `components/carritoCompras/WizardConStepper.native.jsx`, el paso final de `efectivo` podia habilitar el boton de generar venta apenas terminaba `Meteor.call('efectivo.createOrder', ...)`.
  - Pero `compra` sigue dependiendo de que la orden llegue reactivamente a `OrdenesCollection` por la publicacion `ordenes`.
  - Resultado visible: el usuario llegaba al final y recibia el mensaje:
    - `Aún no se ha creado la orden base. Espera unos segundos e intenta nuevamente.`

- Causa raiz validada:
  - El callback de `efectivo.createOrder` confirma que el backend ya respondio, pero no garantiza que Minimongo ya tenga el documento disponible en ese mismo instante.
  - El wizard estaba tratando como equivalentes dos hitos distintos:
    - fin del metodo Meteor
    - disponibilidad reactiva real de `compra`

- Correccion aplicada:
  - Se agrego un gate local `esperandoOrdenBase` solo para `metodoPago === 'efectivo'`.
  - Cuando el wizard entra a `STEP_PAY` con efectivo, mantiene el checkout bloqueado hasta que `compra` exista de verdad en `OrdenesCollection`.
  - Solo entonces se libera la accion final que llama `generarVentaEfectivo`.

- Regla practica:
  - En este checkout Expo, no asumir que `efectivo.createOrder` implica que `compra` ya esta lista para el siguiente paso.
  - Si vuelve a aparecer un bloqueo parecido, revisar primero el gate entre:
    - callback de creacion de orden
    - llegada reactiva de `compra`
  - No tocar PayPal o MercadoPago para este caso; el ajuste correcto vive solo en el branch de `efectivo`.

---

Resumen tecnico - Step 5 del carrito: total visible de comisiones y total a pagar deben seguir el resumen convertido

- Hallazgo validado:
  - En `components/carritoCompras/WizardConStepper.native.jsx`, el chip superior `Total de comisiones` podia mostrar `comisionesComercio.totalFinal`, mientras la fila correcta del resumen ya usaba `comisionesConvertidas`.
  - Ademas, en `efectivo`, el `TOTAL A PAGAR` visible del card final debia corresponder exactamente a `subtotalProductosConvertido + comisionesConvertidas`.

- Correccion aplicada:
  - El chip `Total de comisiones` ahora usa el mismo monto visible convertido (`comisionesConvertidas`) y la misma moneda del resumen (`monedaFinalUI`).
  - Para `metodoPago === 'efectivo'`, el `TOTAL A PAGAR` visible ahora usa `totalResumenConvertido` en lugar de depender del valor bruto interno de `totalAPagar`.

- Regla practica:
  - Si arriba y abajo vuelven a salir montos distintos de comisiones en el step 5, la fuente de verdad visual debe ser `comisionesConvertidas`.
  - Si el usuario espera que en `efectivo` el total visible sea exactamente `subtotal + comisiones`, revisar primero `totalAPagarVisible` y no el calculo backend interno de `totalAPagar`.

---

Resumen tecnico - Implementacion completa del modulo Empresa en Expo con contratos reales de Meteor

- Alcance aplicado:
  - Se dejo operativo el flujo principal de empresa bajo `app/(empresa)` con implementaciones nativas reales para:
    - `components/empresa/EmpresaNavigator.native.jsx`
    - `components/empresa/EmpresaDrawerContent.native.jsx`
    - `components/empresa/components/EmpresaTopBar.native.jsx`
    - `components/empresa/screens/MisTiendasScreen.native.jsx`
    - `components/empresa/screens/TiendaDetailScreen.native.jsx`
    - `components/empresa/screens/ProductoFormScreen.native.jsx`
    - `components/empresa/screens/PedidosPreparacionScreen.native.jsx`
  - Tambien se crearon componentes de soporte del modulo:
    - `LocationPicker.native.jsx`
    - `ProductoCard.native.jsx`
    - `ProductoImage.native.jsx`
    - `TiendaHeader.native.jsx`
    - `EmptyProductos.native.jsx`
    - `MapaTiendaCardBackground.native.jsx`

- Decision tecnica importante:
  - Las rutas Expo del grupo empresa dejaron de apuntar a placeholders y ahora reexportan modulos reales desde `components/empresa/screens/*`.
  - Los archivos base no nativos (`.jsx`) se dejaron como `ScreenFallback` explicitos y no como `null`, para evitar superficies silenciosamente vacias en preview/web.

- Contrato backend preservado:
  - El modulo empresa se construyo sobre contratos ya existentes del sistema y no sobre metodos inventados.
  - Publicaciones/colecciones usadas como fuente de verdad:
    - `tiendas`
    - `productosComercio`
    - `ventasRecharge`
    - `propertys`
    - `TiendasComercioCollection`
    - `ProductosComercioCollection`
    - `VentasRechargeCollection`
    - `ConfigCollection`
  - Metodos reutilizados:
    - `addEmpresa`
    - `tiendas.update`
    - `removeTienda`
    - `addProducto`
    - `comercio.editProducto`
    - `removeProducto`
    - `comercio.uploadProductImage`
    - `comercio.deleteProductImage`
    - `comercio.pedidos.avanzar`
    - `users.toggleModoEmpresa(false)`

- UX/UI validada:
  - Se mantuvo el criterio pedido para React Native Paper:
    - no forzar colores o `backgroundColor` sobre `Surface`/componentes Paper salvo que sea estrictamente necesario
    - cuando hubo que customizar bloques visuales, se hizo con `View` y palette dependiente de `theme.dark`
  - El shell de empresa usa drawer lateral, top bar propia, cards moviles y estados vacios profesionales sin reducir funcionalidad respecto al legado.
  - `PedidosPreparacion` filtra y ordena pedidos de las tiendas reales del usuario empresa y avanza estados usando el metodo backend ya existente.

- Hallazgo tecnico importante sobre archivos e imagenes:
  - En este workspace Expo, para leer archivos locales como base64 dentro del formulario de producto no conviene importar `expo-file-system` moderno si se necesita `readAsStringAsync(...)` con `EncodingType.Base64`.
  - La variante que valida correctamente en este proyecto es:
    - `import * as FileSystem from 'expo-file-system/legacy'`
  - Esto resolvio el bloqueo final de lint en `ProductoFormScreen.native.jsx`.

- Validacion realizada:
  - `get_errors` limpio en los archivos del modulo empresa y sus wrappers de ruta.
  - `npx eslint --no-cache` limpio sobre el conjunto de archivos nuevos/modificados del modulo empresa tras ajustar imports y el uso de `expo-file-system/legacy`.

- Regla practica:
  - Si se migra otro modulo grande del legacy a Expo, primero validar contratos reales de Meteor y luego apuntar las rutas Expo a pantallas nativas reales; no dejar wrappers vivos sobre placeholders.
  - Si un componente Expo necesita transformar una imagen local a base64 y el tipado/lint no reconoce `EncodingType` en `expo-file-system`, revisar primero la variante `expo-file-system/legacy` antes de reescribir todo el flujo de upload.

---

Resumen tecnico - Crash del stepper de pedidos corregido evitando `Surface` en nodos pequenos repetidos

- Problema detectado:
  - En `components/comercio/pedidos/components/PedidoStepper.native.jsx` aparecia el runtime:
    - `TypeError: Cannot read property 'forEach' of null`
  - El fallo quedaba asociado al render de los nodos del stepper usando `Surface` dentro de una composicion pequena y repetida.

- Correccion aplicada:
  - Los nodos visuales del stepper pasaron a renderizarse con `View` simple.
  - Tambien se normalizo el paso activo a un numero valido mediante `resolvedCurrentStep` para no depender de valores nulos o inesperados.

- Regla practica:
  - En este proyecto, para circulos de stepper, bullets y nodos decorativos pequenos no conviene usar `Surface` de Paper si no aporta valor real de elevation o composicion.
  - Si aparece un error runtime raro dentro de un item pequeno y repetido, probar primero con `View` antes de perseguir un bug fantasma en los datos.

---

Resumen tecnico - `renderHeader` de Mis Tiendas compacto y estable en altura

- Problema detectado:
  - En `components/empresa/screens/MisTiendasScreen.native.jsx`, la cabecera del `FlatList` estaba creciendo mas de lo necesario.
  - La altura visible se inflaba por una combinacion de:
    - `marginBottom` demasiado alto en `headerContent`
    - `TextInput` outlined a altura completa
    - cards de metricas con `flex` pero sin base estable, lo que podia generar wrap o distribucion vertical poco consistente en anchos pequenos

- Correccion aplicada:
  - Se introdujo `isCompactHeader` derivado de `useWindowDimensions()` para compactar la cabecera en anchos estrechos.
  - Se redujo el espacio vertical general del header:
    - `headerContent.marginBottom` bajo
    - variante `headerContentCompact`
    - variante `heroCardCompact`
  - El buscador paso a `dense` y suma `searchInputCompact` para bajar la huella vertical sin perder legibilidad.
  - Las metricas del hero ahora usan layout mas estable:
    - `flexBasis: 0`
    - `minWidth: 0`
    - variante `metricCardCompact`
  - Esto evita que una card de resumen fuerce una segunda linea o altere la altura total del `renderHeader` en pantallas pequenas.

- Regla practica:
  - En headers de `FlatList` con hero + metricas + buscador, no apilar espaciados redundantes si `contentContainerStyle` ya aporta separacion con los items.
  - Si varias metricas comparten una fila, darles base flexible explicita (`flexBasis: 0`, `minWidth: 0`) antes de asumir que `flex: 1` bastara.
  - Para buscadores en headers moviles, usar `dense` cuando el problema principal sea altura y no ancho.

---

Resumen tecnico - `StoreCard` de Mis Tiendas sin altura rigida ni hueco visual en el footer

- Problema detectado:
  - En `components/empresa/screens/MisTiendasScreen.native.jsx`, el card de tienda se veia demasiado alto y con aire sobrante en la parte inferior.
  - La causa principal era el uso de `height: '100%'` sobre el `Card`, combinado con un bloque de mapa grande y un footer de acciones demasiado separado visualmente.

- Correccion aplicada:
  - Se elimino la altura rigida del `Card` y se dejo que la superficie calcule su alto por contenido real.
  - Se agrego una variante compacta del card para la lista de una sola columna:
    - `storeCardCompact`
    - `mapSlotCompact`
    - `storeCardContentCompact`
    - `storeActionsCompact`
  - El bloque de mapa en el card compacto bajo de `156` a `144` para mejorar proporcion visual sin perder contexto de ubicacion.
  - El footer de acciones quedo mas cerca del contenido y sin padding superior sobrante.

- Regla practica:
  - En cards de listas moviles no usar `height: '100%'` sobre `Card` de React Native Paper salvo que exista un contenedor padre con altura controlada y realmente se necesite igualar celdas.
  - Si una card se siente demasiado larga, compactar primero el bloque hero/mapa y el footer antes de tocar la informacion principal.

---

Resumen tecnico - HTTP global habilitado para cargas remotas en iOS y Android

- Hallazgo validado:
  - Android ya estaba listo para cargar recursos `http` porque el proyecto tenia `usesCleartextTraffic: true` en la configuracion nativa.
  - El bloqueo real quedaba en iOS, donde `NSAppTransportSecurity` solo tenia excepcion puntual para `www.vidkar.com`.
  - Si una imagen o recurso remoto llegaba por `http` desde otra IP o dominio, iOS podia bloquearlo aunque Android lo mostrara bien.

- Correccion aplicada:
  - En `app.json` se amplio `expo.ios.infoPlist.NSAppTransportSecurity` con:
    - `NSAllowsArbitraryLoads: true`
    - `NSAllowsLocalNetworking: true`
  - Se alineo tambien `ios/vidkar/Info.plist` actual con esos mismos valores para que el proyecto nativo generado refleje ya el cambio.

- Criterio tecnico:
  - La fuente de verdad sigue siendo `app.json`.
  - El ajuste en `ios/vidkar/Info.plist` sirve para dejar consistente el proyecto nativo actual, pero cualquier regeneracion o prebuild debe seguir leyendo el cambio desde Expo config.

- Regla practica:
  - Si una pantalla Expo muestra imagenes remotas que solo fallan en iOS y vienen por `http`, revisar primero `NSAppTransportSecurity` antes de tocar el componente visual.
  - En Android, si el proyecto ya tiene `usesCleartextTraffic: true`, normalmente no hace falta otro cambio para `http` basico en `Image` o fetch.
  - Este ajuste amplia permisos de red en iOS; si mas adelante se quiere endurecer seguridad para release, conviene volver a excepciones por dominio en lugar de mantener cargas arbitrarias globales.

---

Resumen tecnico - Recuperacion y rediseño profesional de `ProductoCard` en modo Empresa

- Problema detectado:
  - `components/empresa/components/ProductoCard.native.jsx` quedo corrupto tras varios intentos grandes de refactor, mezclando bloques duplicados, imports repetidos y residuos literales de patch (`+` en el codigo).
  - El sintoma mas enganoso fue que el editor siguio reportando errores sobre offsets viejos incluso despues de reescrituras parciales; la fuente de verdad termino siendo el archivo real en disco y la validacion por terminal.

- Correccion aplicada:
  - Se rehizo el card con una composicion mas profesional para empresa, manteniendo intacta la forma de obtener la imagen mediante `ProductoImage` y el metodo legacy ya validado (`findImgbyProduct`).
  - El card ahora prioriza:
    - bloque visual de producto
    - badge de disponibilidad con semantica comercial
    - jerarquia fuerte de precio
    - resumen de disponibilidad
    - observaciones opcionales sin lenguaje tecnico
  - El contenido final se depuro hasta dejar:
    - una sola definicion de imports
    - una sola definicion de `ProductoCard`
    - un solo `export default ProductoCard;`

- Hallazgo tecnico importante:
  - En este proyecto, cuando un archivo JSX queda contaminado por recreaciones parciales, no basta con editar trozos visibles desde el editor.
  - Conviene validar en disco con comandos como:
    - `wc -l`
    - `grep` sobre exports/imports duplicados
    - `npx eslint --no-cache <archivo>`
  - Si el archivo muestra mas lineas de las esperadas o varios `export default` del mismo componente, la forma segura es truncar o recrear el archivo completo antes de seguir ajustando UI.

- Regla practica:
  - Si se rediseña una card de negocio ya conectada a Meteor, primero preservar sus contratos funcionales y luego modernizar solo la superficie visual.
  - Si una reescritura grande deja residuos de patch o contenido duplicado, verificar el archivo real en disco antes de confiar en diagnosticos viejos del editor.
  - Para `ProductoCard` de empresa, no cambiar la estrategia de imagen actual; cualquier mejora futura debe seguir usando `ProductoImage` como fuente de verdad de media remota.

---

Resumen tecnico - Proyeccion minima de suscripciones Meteor en el flujo del menu principal

- Alcance aplicado:
  - Se optimizo el flujo real del menu principal en Expo para que las suscripciones Meteor devuelvan solo los campos consumidos por esa superficie y sus controles inmediatos.
  - Archivos ajustados:
    - `app/index.native.tsx`
    - `components/Main/MenuPrincipal.native.jsx`
    - `components/Main/MenuPrincipalScreen.jsx`
    - `components/cubacel/Productos.native.jsx`
    - `components/components/MenuIconMensajes.native.js`
    - `components/carritoCompras/WizardConStepper.native.jsx`
    - `components/carritoCompras/ListaPedidosRemesa.native.jsx`

- Regla importante del user raiz:
  - El `Meteor.subscribe('user', { _id: currentUserId })` del root tambien forma parte del flujo del menu principal.
  - El shape minimo validado para no romper menu, drawer y branching principal incluye al menos:
    - `username`
    - `picture`
    - `modoCadete`
    - `modoEmpresa`
    - `permiteRemesas`
    - `subscipcionPelis`
    - `profile.firstName`
    - `profile.role`
    - `profile.roleComercio`
  - `picture` es critico porque el mismo documento parcial alimenta tambien los drawers de cadete y empresa.

- Proyecciones seguras del menu:
  - `MenuPrincipal.native.jsx`:
    - `ventas` para deuda pendiente solo necesita `precio`.
    - `ventasRecharge` para resumen de pendientes en efectivo solo necesita `createdAt`, `type`, `producto.type` y `producto.carritos.type`.
  - `Productos.native.jsx`:
    - `productosDtShop` puede proyectarse de forma agresiva si conserva solo los campos que realmente usa el carrusel y `CubaCelCard` (`name`, `description`, `id`, `operator.name`, `prices.retail.amount`, `benefits.*`, `ocultarFondo`, `promotions.*`).
  - `MenuIconMensajes.native.js`:
    - Para el popup de mensajes bastan `createdAt`, `from`, `to`, `leido`, `mensaje`.
    - Para usuarios remitentes basta `picture`, `profile.firstName` y `profile.lastName`.

- Regla critica del carrito/header:
  - `WizardConStepper.native.jsx` y `ListaPedidosRemesa.native.jsx` NO deben recortar `carrito` y `ordenes` solo mirando el JSX visible.
  - Aunque la UI use menos campos, el checkout reutiliza esos documentos en metodos backend que dependen de datos embebidos.
  - Para no romper el flujo, la proyeccion conservadora validada debe preservar como minimo:
    - en `carrito`: `type`, `cantidad`, `cobrarUSD`, `monedaACobrar`, `idUser`, `megas`, `metodoPago`, `coordenadas`, `idTienda`, `tienda`, `producto`, `extraFields`, `comentario`, `entregado` y datos de remesa/recarga usados por checkout
    - en `ordenes`: `carritos` completos y links/url de pago (`approvalUrl`, `init_point`, `link`, `linkPago`, `url`)

- Contrato tecnico validado detras de esa decision:
  - `comercio.calcularCostosEntrega` necesita datos de tienda, coordenadas y tipo de item del carrito.
  - `paypal.totalAPagar`, `mercadopago.totalAPagar` y `efectivo.totalAPagar` necesitan `idUser`, `cobrarUSD`, `cantidad`, `monedaACobrar` y `type`.
  - `generarVentaEfectivo` inspecciona `producto: compra` con `carritos` embebidos.
  - `dtshop.createTransaccion` necesita `carrito._id`, `extraFields`, `producto.id` y arrays `required*Fields` dentro de `producto`.

- Criterio de implementacion importante:
  - Si una pantalla ya recibe `user` por props desde una suscripcion proyectada, no debe volver a depender de `Meteor.user()` global para campos accesorios del render.
  - En este flujo se corrigio `MenuPrincipalScreen.jsx` para usar `user?.username` en vez de `Meteor.user()?.username` al decidir chips administrativos de version/build.

- Validacion realizada:
  - `get_errors` limpio en todos los archivos modificados.
  - `npx eslint --no-cache` limpio sobre los archivos del flujo del menu principal tras aplicar las proyecciones.

- Regla practica:
  - En este proyecto, optimizar `fields` en Meteor solo es seguro si se valida tambien el contrato de metodos backend que consumen esos mismos documentos, no solo el arbol JSX visible.

---

Resumen tecnico - Aprobacion/rechazo de ventas desde Expo y Watch debe usar metodos Meteor

- Hallazgo validado al contrastar Expo, Watch y el backend React/Meteor:
  - La aprobacion real de una venta con evidencia no debe resolverse con update directo sobre `VentasRechargeCollection`.
  - La fuente de verdad de aprobacion es el metodo servidor:
    - `Meteor.call('ventas.aprobarVenta', ventaId, {})`
  - Ese metodo no solo marca `isCobrado`; tambien procesa carritos, activa recargas/Proxy/VPN, marca items entregados, registra logs y dispara notificaciones.

- Ajuste aplicado en Expo/Watch:
  - `components/archivos/AprobacionEvidenciasVenta.native.jsx` mantiene aprobacion por `ventas.aprobarVenta`.
  - El rechazo de venta dejo de hacer update directo como accion principal y ahora usa:
    - `Meteor.call('efectivo.cancelarVenta', ventaId)`
  - `components/watch/WatchSyncHost.native.tsx` aplica el mismo contrato para mensajes `rejectSale` recibidos desde Apple Watch.

- Criterio tecnico importante:
  - Los `VentasRechargeCollection.update(...)` que quedan despues del callback exitoso solo son refresco local de Minimongo/UI.
  - No deben considerarse la mutacion de negocio principal.
  - Watch debe responder al reloj solo despues de que el metodo Meteor termine, para no mostrar exito si el servidor rechazo la operacion.

- Regla practica:
  - Si se toca el flujo de aprobacion/rechazo de ventas con evidencia, no reemplazar los metodos Meteor por updates directos de coleccion.
  - Aprobacion: `ventas.aprobarVenta`.
  - Rechazo/cancelacion: `efectivo.cancelarVenta`.
  - El update local posterior solo es aceptable como optimizacion visual tras exito confirmado del servidor.

---

Resumen tecnico - Carrito Proxy/VPN debe mostrar paquetes por tiempo como ilimitados

- Problema detectado:
  - En `components/carritoCompras/ListaPedidosRemesa.native.jsx`, algunos items `PROXY`/`VPN` por tiempo llegaban al carrito con `megas` vacio o `0`.
  - El card interpretaba ese valor como capacidad real y mostraba `0 GB`, aunque funcionalmente el paquete era ilimitado por 30 dias.

- Correccion aplicada:
  - `isUnlimitedProxyVpnItem(...)` ahora solo aplica a tipos `PROXY`/`VPN` y considera ilimitado cuando:
    - `esPorTiempo === true`
    - `producto.esPorTiempo === true`
    - `megas === null`
    - `megas` no es numerico
    - `megas <= 0`
    - `megas === 999999`
  - El resumen de la card usa `getProxyVpnCapacityLabel(...)` para que badge, metrica y texto visible no vuelvan a divergir.

- Regla practica:
  - En cards del carrito, `0 GB` no debe mostrarse para paquetes Proxy/VPN por tiempo.
  - Si el item no trae limite de megas util, mostrar `Ilimitado` y mantener el contexto de duracion (`ILIMITADO - 30 dias`) en el badge principal.

---

Resumen tecnico - Callbacks MeteorRN de evidencias pueden llegar como wrapper `{ error, success }`

- Problema detectado:
  - En `components/archivos/AprobacionEvidenciasVenta.native.jsx`, aprobar evidencia ya estaba recibiendo el callback de `Meteor.call` con forma wrapper:
    - `{ error: undefined, success: { ... } }`
  - Rechazar evidencia seguia tratandolo como callback clasico `(error, result)`.
  - Resultado: una respuesta valida del servidor podia interpretarse como error y mostrar un `Alert` con mensaje `INVALID`.

- Correccion aplicada:
  - Se centralizo `normalizeMeteorMethodCallback(...)` para aceptar ambas formas:
    - wrapper MeteorRN `{ error, success }`
    - callback clasico `(error, result)`
  - El mismo criterio se aplico en:
    - `components/archivos/AprobacionEvidenciasVenta.native.jsx`
    - `components/watch/WatchSyncHost.native.tsx`

- Regla practica:
  - En acciones de evidencia (`archivos.aprobarEvidencia` / `archivos.denegarEvidencia`) no asumir una sola firma de callback en MeteorRN.
  - Antes de mostrar error o responder al Watch, normalizar la respuesta para evitar tratar un success wrapper como fallo.

---

Resumen tecnico - Compra Proxy/VPN en Expo debe enviar `producto` completo al carrito

- Problema detectado:
  - La web nueva agregaba paquetes Proxy/VPN al carrito enviando `producto: selectedPackage` en `Meteor.call('carrito.addProxyVPN', ...)`.
  - En Expo, `ProxyPurchaseScreen.native.jsx` y `VPNPurchaseScreen.native.jsx` llamaban al mismo metodo, pero omitian `producto`.
  - Como el backend persiste literalmente ese parametro dentro de `CarritoCollection`, los carritos creados desde la app quedaban con `producto: {}` aunque la web guardaba el documento completo del paquete.

- Correccion aplicada:
  - Las pantallas de confirmacion de Proxy y VPN ahora envian:
    - `producto: paquete`
    - `precioBaseProxyVPN` normalizado a numero
  - Esto preserva en el carrito campos necesarios para flujos posteriores, especialmente en paquetes por tiempo/ilimitados:
    - `_id`
    - `type`
    - `megas`
    - `comentario`
    - `detalles`
    - `createdAt`
    - `esPorTiempo`

- Regla practica:
  - Si se toca el flujo de compra Proxy/VPN en Expo, mantener paridad con la web: `carrito.addProxyVPN` debe recibir el paquete completo en `producto`.
  - No confiar solo en campos top-level como `megas`, `comentario` o `esPorTiempo`, porque el checkout, historial y cards posteriores pueden necesitar el documento original embebido.

---

Resumen tecnico - Checkout Proxy/VPN en Expo no debe proyectar carrito ni orden cuando genera venta

- Problema detectado:
  - Aunque la compra Proxy/VPN ya enviaba `producto: paquete` al carrito, la venta generada desde Expo seguia quedando distinta a la web.
  - La causa estaba en `components/carritoCompras/WizardConStepper.native.jsx`:
    - al abrir el wizard, `pedidosRemesa` se leia desde `CarritoCollection` con una proyeccion limitada
    - `compra` se leia desde `OrdenesCollection` con `ORDER_CHECKOUT_FIELDS`
  - Luego `efectivo.createOrder` persiste literalmente el array `carritos` que recibe del cliente, y `generarVentaEfectivo` embebe literalmente la orden `compra`.
  - Resultado: la orden/venta creada desde Expo perdia campos como `idOrder`, `type`, `comisiones`, `idAdmin`, `megas`, `precioBaseProxyVPN`, `descuentoAdmin`, `producto`, `createdAt`, etc.

- Contrato web validado:
  - `imports/ui/compraVentas/Ventas/DialogVenta.jsx` no proyecta `carrito` ni `ordenes` en el flujo de checkout.
  - La web llama:
    - `Meteor.call('efectivo.createOrder', userId, pedidosRemesa, comisionesComercio, ...)`
    - `Meteor.call('generarVentaEfectivo', { producto: compra, precioOficial, comisionesComercio }, ...)`
  - Como `pedidosRemesa` y `compra` llegan completos, la venta final conserva el shape correcto.

- Correccion aplicada en Expo:
  - Con el wizard cerrado, el badge del carrito puede seguir usando proyeccion minima (`_id`, `idUser`).
  - Con el wizard abierto, `CarritoCollection` se suscribe y consulta sin `fields` para que `pedidosRemesa` llegue completo.
  - `OrdenesCollection` tambien se suscribe y consulta sin proyeccion durante checkout.
  - La orden activa se filtra igual que la web por:
    - `userId`
    - `status: { $nin: ['COMPLETED', 'CANCELLED'] }`

- Regla practica:
  - En este checkout, no optimizar `fields` de `carrito` u `ordenes` durante el flujo abierto si esos documentos se enviaran a metodos Meteor que los persisten o procesan.
  - `efectivo.createOrder`, `creandoOrden`, `mercadopago.createOrder` y `generarVentaEfectivo` dependen del documento completo que el cliente les pasa.
  - Si vuelve a aparecer una venta con `producto.carritos.producto: {}` o una orden sin `idOrder/type/comisiones`, revisar primero las proyecciones del wizard antes de tocar backend.

---

Resumen tecnico - Saldo de recargas visible en Watch solo para `carlosmbinf`

- Alcance aplicado:
  - La pantalla principal del Apple Watch ahora puede mostrar un card compacto de `Saldo Disponible Recargas` inspirado en el card iOS de usuarios.
  - El card se renderiza solo cuando el usuario sincronizado tiene:
    - `username === 'carlosmbinf'`

- Contrato de datos aplicado:
  - El Watch no consulta Meteor directamente.
  - `components/watch/WatchSyncHost.native.tsx` consulta el saldo desde el iPhone usando:
    - `Meteor.call('dtshop.getBalance', ...)`
  - El resultado se normaliza y viaja dentro del snapshot del dashboard como:
    - `rechargeBalance.amount`
    - `rechargeBalance.currency`
    - `rechargeBalance.updatedAt`

- Archivos Watch involucrados:
  - `targets/VidkarWatch/Models/WatchModels.swift` define `WatchRechargeBalanceSnapshot`.
  - `targets/VidkarWatch/Views/WatchComponents.swift` renderiza `WatchRechargeBalanceCard`.
  - `targets/VidkarWatch/Views/WatchDashboardViews.swift` monta el card en `ContentView` solo para el usuario principal.

- Regla practica:
  - Si otra metrica administrativa debe aparecer en el Watch, primero agregarla al payload sincronizado desde el iPhone y luego al modelo Swift; no intentar llamar Meteor desde watchOS.
  - Para datos privados de administrador principal, mantener el gate visible por `username === 'carlosmbinf'` en la UI del Watch aunque el iPhone ya controle el payload.

---

Resumen tecnico - Watch debe limpiar contexto cuando cambia el usuario autenticado

- Problema detectado:
  - Al cerrar sesion en el iPhone y entrar con otro usuario, el Apple Watch podia seguir mostrando datos del usuario anterior.
  - La causa practica es que `VidkarWatchBridge` mantiene `lastUserContext` para responder `requestUserSnapshot`, y el Watch tambien conserva cache local del ultimo `WatchDashboardContext`.
  - Si el nuevo snapshot tarda en estar listo, el reloj puede pedir contexto y recibir todavia el usuario viejo.

- Correccion aplicada:
  - `components/watch/WatchSyncHost.native.tsx` ahora guarda el `userId` anterior en un `useRef`.
  - Cuando `userId` cambia, limpia inmediatamente el snapshot del Watch con `clearWatchUserSnapshot()` y resetea datos derivados como `rechargeBalance`.
  - Luego, cuando las suscripciones del nuevo usuario estan listas, se sincroniza el nuevo dashboard como de costumbre.
  - `targets/VidkarWatch/Session/WatchSessionManager.swift` ahora interpreta un snapshot vacio (`user: {}`) como orden explicita de limpieza.
  - Esa limpieza borra `context`, cache de `UserDefaults`, previews de evidencias y cambios locales pendientes, evitando que el reloj conserve el usuario anterior.
  - `services/watch/watchConnectivity.native.js` envia el clear tanto por application context como por mensaje vivo cuando el Watch esta alcanzable.
  - Ademas, el Watch ya no hidrata automaticamente el ultimo `WatchDashboardContext` guardado al iniciar; borra esa cache en `init` y espera un snapshot actual del iPhone.
  - Si llega un snapshot con otro `currentUser`, tambien limpia caches volatiles de previews y cambios pendientes antes de aplicar el nuevo contexto.

- Regla practica:
  - En integraciones WatchConnectivity, no basta con enviar el nuevo payload cuando este listo; tambien hay que invalidar el contexto anterior al detectar cambio de identidad.
  - En watchOS, un payload vacio no debe tratarse como dato invalido; en este proyecto significa `sin sesion activa` y debe borrar cache local.
  - No mostrar automaticamente `Datos guardados` como usuario activo al arrancar el Watch; para datos de identidad, el snapshot vigente debe venir del iPhone.
  - Si el Watch parece “aferrarse” a un usuario viejo, revisar primero el cache del bridge (`lastUserContext`) y la limpieza al cambiar `Meteor.userId()` antes de depurar las vistas Swift.

Notas adicionales - Trazas end-to-end para diagnosticar cambio de usuario en Watch

- Ajuste aplicado:
  - Se agregaron logs compactos con prefijos estables en los cuatro puntos del pipeline:
    - `components/watch/WatchSyncHost.native.tsx` -> estado de sesion Meteor, clear por cambio de `userId`, espera de subscriptions y sync del payload.
    - `services/watch/watchConnectivity.native.js` -> `updateUserContext`, envio live, dedupe, clear y estado `reachable`.
    - `modules/vidkar-watch-bridge/ios/VidkarWatchBridgeModule.swift` -> `lastUserContext`, respuesta a `requestUserSnapshot`, `sendMessage`, activacion y reachability nativa.
    - `targets/VidkarWatch/Session/WatchSessionManager.swift` -> recepcion de application context/live message, clear de contexto, decode del payload y cambio de `currentUser`.

- Criterio tecnico:
  - Los logs no deben imprimir payloads completos de usuarios o evidencias; deben mostrar ids, usernames, conteos y keys para diagnostico sin inundar consola ni exponer datos innecesarios.
  - Para rastrear un cambio de usuario, seguir este orden de prefijos:
    1. `[WatchSyncHost]`
    2. `[WatchConnectivity]`
    3. `[VidkarWatchBridge]`
    4. `[VidkarWatch]`

- Regla practica:
  - Si el Watch no refleja el usuario nuevo, revisar primero si aparece el clear en `[WatchSyncHost]` y si luego `[VidkarWatchBridge] requestUserSnapshot reply` sigue devolviendo el `currentUserId` viejo.
  - Si el bridge ya responde el usuario nuevo pero la UI no cambia, revisar `[VidkarWatch] handlePayload decoded` y `[VidkarWatch] currentUser changed`.
  - Si no hay logs del Watch, validar que el target Watch actualizado este realmente instalado; refrescar JS del iPhone no actualiza el codigo Swift de watchOS.

Notas adicionales - Snapshot inmediato del usuario antes del dashboard completo

- Hallazgo validado con logs:
  - Al iniciar con `carlosmbinf`, el Watch recibia primero un clear y luego un payload completo con `currentUser`.
  - Al cerrar sesion, tambien llegaba el clear correctamente, aunque podia entrar antes algun application context viejo ya encolado por WatchConnectivity.
  - Al iniciar con otro usuario como `cronos`, el Watch no mostraba nuevos logs, lo que indica que no estaba recibiendo snapshot nuevo desde el iPhone.

- Ajuste aplicado:
  - `components/watch/WatchSyncHost.native.tsx` ahora envia un snapshot minimo inmediato apenas `Meteor.user()` existe para el nuevo usuario.
  - Este envio ya no espera `ready === true` de la suscripcion raiz, porque en usuarios normales o admins no principales eso podia demorar o bloquear el primer reflejo de identidad en el Watch.
  - Ese snapshot se construye con `buildWatchDashboardPayload(...)`, pero solo contiene:
    - `currentUser`
    - `users: [currentUser]`
    - sin depender de deudas, evidencias, conexiones ni aprobaciones.
  - Luego, cuando todas las suscripciones del dashboard completo terminan, se vuelve a ejecutar el sync normal con el payload completo.

- Regla practica:
  - El cambio visible de identidad en el Watch no debe depender de que terminen las suscripciones pesadas del dashboard ni del `ready` de la suscripcion root si `Meteor.user()` ya esta disponible.
  - Para cambio de usuario, primero sincronizar un payload minimo de identidad y despues enriquecerlo con el dashboard completo cuando este listo.
  - Si el Watch vuelve a quedar sin logs tras login de un usuario normal, buscar primero `[WatchSyncHost] immediate snapshot waiting` y `[WatchSyncHost] syncing immediate user snapshot` en el log del iPhone.

Notas adicionales - Payload WatchConnectivity debe ser property-list-safe y el primer login no debe limpiar en paralelo

- Hallazgo validado con logs:
  - Para usuarios como `prueba`, el iPhone si construia y trataba de enviar el snapshot minimo (`currentUsername: prueba`).
  - El fallo real era:
    - `La carga útil contiene un tipo incompatible.`
  - Eso viene de `WCSession.updateApplicationContext(...)` cuando el diccionario contiene valores no compatibles con property list, por ejemplo `null`/`NSNull`, `NaN`, funciones u objetos no serializables.

- Correccion aplicada:
  - `services/watch/watchConnectivity.native.js` sanea recursivamente el payload antes de enviarlo al bridge nativo:
    - elimina `null` / `undefined`
    - elimina numeros no finitos
    - convierte `Date` a ISO string
    - limpia arrays y objetos anidados
  - El debug log `[WatchConnectivity] sanitized payload` muestra cuantos paths fueron descartados y hasta 12 ejemplos.

- Ajuste de carrera aplicado:
  - `components/watch/WatchSyncHost.native.tsx` ya no ejecuta `clearWatchUserSnapshot()` en el primer render conocido del host.
  - Tampoco limpia cuando el cambio observado es `null -> userId`, porque ese caso representa un login nuevo despues de una sesion vacia y el snapshot inmediato debe ganar.
  - Antes, si `previousUserId` empezaba como `null` y entraba un usuario nuevo, el clear podia competir en paralelo con el snapshot inmediato y terminar enviando `user: {}` despues del payload correcto.

- Regla practica:
  - Todo payload que vaya a `WCSession.updateApplicationContext`, `sendMessage` o `transferUserInfo` debe ser property-list-safe antes de cruzar al modulo Swift.
  - Si vuelve a aparecer `La carga útil contiene un tipo incompatible`, revisar primero el saneamiento del payload y no el decoder Swift del Watch.
  - En cambios de sesion, distinguir entre primer usuario conocido del host, login despues de sesion vacia (`null -> userId`) y cambio real entre dos usuarios; solo el cambio real o logout necesitan clear explicito.

---

Resumen tecnico - Catalogo de Peliculas en Expo usando contrato real de backend

- Alcance aplicado:
  - `app/(normal)/PeliculasVideos.tsx` dejo de usar `ScreenFallback` y ahora apunta a `components/downloadVideos/DownloadVideosHome`.
  - Se creo `components/downloadVideos/DownloadVideosHome.native.jsx` como pantalla nativa real de catalogo audiovisual.
  - `components/downloadVideos/DownloadVideosHome.js` quedo como fallback profesional para web/previews.
  - `components/collections/collections.js` ahora expone `PelisCollection = new Mongo.Collection('pelisRegister')` para consumir la publicacion Meteor existente.

- Contrato backend validado:
  - La coleccion fuente de verdad es `pelisRegister`.
  - La publicacion principal es `Meteor.subscribe('pelis', selector, option)` y acepta `fields`, `sort` y `limit`.
  - El detalle completo se obtiene con `Meteor.call('getPelicula', id)`.
  - El conteo de vistas se incrementa con `Meteor.call('addVistas', id)`.
  - Las imagenes no vienen como binario en el documento; se sirven por HTTP usando:
    - `/imagenesPeliculas?calidad=low|mid|hig&&idPeli=<id>`
  - El video se reproduce desde `urlPeliHTTPS` cuando existe, con fallback a `urlPeli`.
  - El trailer se toma de `urlTrailer`.

- Visibilidad del drawer:
  - Peliculas se movio al bloque `Opciones de administradores` en `components/drawer/DrawerOptionsAlls.js`.
  - Ya no depende de `user.subscipcionPelis` para aparecer en el drawer de Expo.
  - La pantalla tambien valida el rol y muestra acceso restringido si entra un usuario no admin por ruta directa.

- UX/UI aplicada:
  - La pantalla usa una composicion estilo streaming/Netflix:
    - hero con imagen de pelicula destacada
    - buscador superior
    - chips de genero
    - filas horizontales por populares, recientes y generos
    - cards poster con vistas, ano y genero
    - dialogo de detalle con acciones `Reproducir` y `Trailer`
  - Se usa una paleta oscura con acento rojo y superficies con radio contenido para mantener una lectura profesional.
  - No se agrego un player nativo nuevo; `Reproducir` abre la URL real del backend con `Linking.openURL(...)` y antes llama `addVistas`.

- Reglas practicas:
  - Si se vuelve a tocar este modulo, no inventar una coleccion nueva: usar `PelisCollection` sobre `pelisRegister`.
  - Para imagenes de peliculas en Expo, construir URL absoluta hacia `/imagenesPeliculas` usando el origen HTTP derivado de Meteor, con produccion apuntando a `https://www.vidkar.com`.
  - Las queries deben contemplar que `mostrar` puede venir como boolean `true` o string `'true'`, porque el legacy uso ambas formas.
  - Mantener Peliculas como acceso de administradores si el requerimiento sigue siendo gestion interna; no devolverlo a `Servicios VidKar` sin validar producto/roles.

---

Resumen tecnico - Logs de WatchConnectivity comentados sin tocar trazas de WatchSyncService

- Ajuste aplicado:
  - Se comentaron todos los `console.log` y `console.warn` que usan el prefijo exacto `[WatchConnectivity]` en runtime dentro de:
    - `services/watch/watchConnectivity.native.js`
    - `services/watch/watchSyncService.native.js`

- Criterio tecnico validado:
  - Solo se silenciaron las trazas asociadas al bridge de conectividad del Watch.
  - No se tocaron los logs con prefijo `[WatchSyncService]`, porque esos siguen siendo el canal de diagnostico de mas alto nivel para el flujo de sincronizacion y sesion.

- Regla practica:
  - Si luego se quiere reactivar diagnostico fino del bridge, basta con descomentar especificamente los bloques marcados de `[WatchConnectivity]` sin reintroducir ruido en los logs generales del servicio.
  - Si se necesita un apagado mas sistematico en el futuro, conviene encapsular estas trazas en un helper de debug o en un flag de entorno en lugar de volver a dispersar `console.*` activos por el modulo.

---

Resumen tecnico - Logs de WatchSyncService comentados en runtime

- Ajuste aplicado:
  - Se comentaron todos los `console.log` con el prefijo exacto `[WatchSyncService]` en:
    - `services/watch/watchSyncService.native.js`

- Criterio tecnico validado:
  - Se mantuvieron comentadas por separado las trazas ya apagadas de `[WatchConnectivity]` y no se altero la logica de sincronizacion, limpieza de snapshot ni el wiring del servicio.
  - El cambio fue solo de ruido de consola, no de comportamiento.

- Regla practica:
  - Si luego hace falta volver a depurar el ciclo de sincronizacion del Watch, basta con descomentar puntualmente los bloques `[WatchSyncService]` necesarios.
  - Si el proyecto vuelve a necesitar un control mas fino del logging, conviene mover estos prefijos a una compuerta de debug central en lugar de alternarlos manualmente archivo por archivo.

---

Resumen tecnico - Reproductor interno de Peliculas con `expo-video` y tema Paper

- Ajuste aplicado:
  - `Reproducir` en el catalogo de peliculas ya no abre el enlace externo con `Linking.openURL(...)`.
  - Ahora navega a una pantalla interna nueva:
    - `app/(normal)/PeliculaPlayer.tsx`
    - `components/downloadVideos/PeliculaPlayer.native.jsx`
  - La reproduccion se hace dentro de la app usando `expo-video`:
    - `useVideoPlayer(...)`
    - `VideoView`
    - controles nativos
    - soporte de pantalla completa desde la vista de video.

- Contrato backend preservado:
  - La pantalla player carga el detalle completo con `Meteor.call('getPelicula', id)`.
  - El stream usa `urlPeliHTTPS` con fallback a `urlPeli`.
  - El conteo de vistas sigue usando `Meteor.call('addVistas', id)` y se dispara una sola vez al preparar la reproduccion.
  - El trailer sigue saliendo de `urlTrailer` y puede abrirse externamente porque no forma parte del reproductor principal de pelicula.

- Theme y superficies:
  - `DownloadVideosHome.native.jsx` dejo de fijar una paleta oscura unica para toda la pantalla.
  - Las superficies principales ahora derivan de `theme.colors` de React Native Paper:
    - `background`
    - `surface`
    - `surfaceVariant`/elevation cuando aplica
    - `onSurface`
    - `onSurfaceVariant`
  - Se mantiene un acento rojo cinematografico, pero adaptado a modo claro/oscuro y sin convertir toda la pantalla en dark mode forzado.

- Criterio tecnico importante:
  - En este modulo, las imagenes/hero pueden conservar texto blanco encima del poster por legibilidad cinematografica.
  - Pero las secciones administrativas, busqueda, dialogs, filas y paneles deben respetar el theme real y no usar colores hardcodeados de modo oscuro.

- Regla practica:
  - Si se vuelve a tocar Peliculas, no reintroducir `Linking.openURL` para reproducir la pelicula principal.
  - La reproduccion principal debe pasar por `PeliculaPlayer.native.jsx` y `expo-video`.
  - Si luego se implementan subtitulos visuales dentro del player, validar primero la compatibilidad real de `expo-video` con tracks externos antes de prometerlos en UI.

---

Resumen tecnico - CocoaPods/xcodeproj no soporta `objectVersion = 70` en este entorno

- Problema detectado:
  - `npm run ios` fallaba durante `pod install` con:
    - `[Xcodeproj] Unable to find compatibility version string for object version \`70\``
  - El fallo ocurria antes de compilar la app, dentro de CocoaPods leyendo `ios/Vidkar.xcodeproj/project.pbxproj`.

- Causa raiz validada:
  - El CocoaPods instalado por Homebrew usa `xcodeproj 1.27.0`.
  - Esa version de `xcodeproj` reconoce object versions como `63` y `77`, pero no tiene entrada de compatibilidad para `70`.
  - El proyecto iOS generado tenia:
    - `objectVersion = 70;`

- Correccion aplicada:
  - Se agrego el config plugin local:
    - `plugins/with-vidkar-xcode-object-version.js`
  - El plugin corre como `withDangerousMod` de iOS y reemplaza de forma reproducible:
    - `objectVersion = 70;`
    - por `objectVersion = 77;`
  - Tambien se parcheo el proyecto nativo actual en:
    - `ios/Vidkar.xcodeproj/project.pbxproj`

- Validacion realizada:
  - `npx expo config --json` resolvio correctamente el plugin y lo registro en `pluginHistory`.
  - `pod install --repo-update` completo correctamente e instalo `ExpoVideo`.
  - `npm run ios` supero `pod install`, compilo, instalo/arranco la app y llego a logs JS del runtime.

- Consideracion operativa:
  - Los warnings repetidos de `expo-notifications` en simulador iOS sobre push token no son fallo de build; Apple recomienda dispositivo real para validar token push.
  - Los warnings de schema de `app.json` sobre `newArchEnabled` y `edgeToEdgeEnabled` ya existian y no bloquearon `expo config` ni el build local.

- Regla practica:
  - Si vuelve a aparecer el error de `object version 70` despues de un prebuild o regeneracion de `ios/`, revisar primero que el plugin local siga registrado en `app.json`.
  - No editar solo el `.pbxproj` a mano como solucion definitiva; el plugin es la fuente reproducible para que el parche sobreviva a regeneraciones de Expo.

---

Resumen tecnico - Headers de Peliculas con glass del menu principal y filtros arriba

- Ajuste aplicado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` dejo de pasar un color de superficie claro/oscuro al header.
  - El catalogo de peliculas ahora usa `DEFAULT_HEADER_COLOR` y `overlapContent`, igualando el glass oscuro/transparente del menu principal.
  - `components/downloadVideos/PeliculaPlayer.native.jsx` aplica el mismo patron para el reproductor interno de pelicula.

- Reordenamiento UX:
  - El bloque de busqueda y chips de genero del catalogo ahora se renderiza arriba, antes del hero de pelicula destacada.
  - El scroll del catalogo reserva el inset real del header con `useAppHeaderContentInset()` para que el filtro quede visible y no se meta debajo del toolbar transparente.
  - En el reproductor, el hero respeta el inset del header dentro de su contenido para conservar la sensacion de header flotante sin tapar el titulo.

- Verificacion de alcance:
  - La busqueda de `Appbar.Header` en `components/**/*.jsx` confirmo que el unico header manual queda encapsulado en `components/Header/AppHeader.jsx`.
  - Por tanto, las pantallas activas que usan `AppHeader` ya heredan el blur base; el problema visible en Peliculas era el tinte de superficie y la posicion del bloque de filtro.

- Regla practica:
  - En pantallas cinematograficas o con hero visual, no pasar `theme.colors.surface` como color de header si se espera la transparencia del menu principal.
  - Usar `DEFAULT_HEADER_COLOR` + `overlapContent` y reservar inset solo en el contenido que realmente deba quedar debajo del header.
  - Si una pantalla usa filtros principales, colocarlos arriba del hero cuando el usuario necesita filtrar antes de consumir el catalogo.

---

Resumen tecnico - Filtros sobre hero y detalle en bottom drawer para Peliculas

- Ajuste UX aplicado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` ahora renderiza el buscador y chips de genero directamente encima de la foto del hero.
  - La posicion aprobada del filtro queda debajo del label `VIDKAR CINEMA` y antes del titulo de la pelicula destacada.
  - Esto mantiene el filtro como parte de la experiencia cinematografica inicial, no como bloque administrativo separado encima del catalogo.

- Detalle de pelicula:
  - El detalle dejo de usar `Dialog` de React Native Paper.
  - Ahora se usa un bottom drawer custom con `Portal + Animated` que aparece desde abajo.
  - El drawer abre en estado parcial para mostrar lo esencial:
    - imagen hero
    - titulo
    - metadata
    - acciones principales
  - Al deslizar hacia arriba, el drawer se expande y muestra todo el detalle disponible.
  - Al deslizar hacia abajo desde expandido, vuelve al estado parcial; desde parcial puede cerrarse.

- Optimizacion de datos:
  - La suscripcion principal del catalogo sigue siendo una sola `Meteor.subscribe('pelis', selector, option)` con `fields` proyectados.
  - No se agregan nuevas suscripciones para abrir el detalle.
  - El detalle completo se obtiene bajo demanda con `Meteor.call('getPelicula', movieId)` solo cuando el usuario abre una pelicula.
  - Los detalles ya cargados se cachean localmente en memoria para no repetir llamadas al backend si se reabre la misma pelicula durante la sesion.

- Regla practica:
  - En este modulo, los filtros del catalogo deben vivir visualmente dentro del hero cuando exista pelicula destacada.
  - Para detalles cinematicos en movil, preferir bottom drawer progresivo antes que dialog centrado si el contenido puede crecer.
  - Si se agregan mas campos al detalle, no ampliar la publicacion principal sin necesidad; primero evaluar si deben llegar por `getPelicula` bajo demanda.

---

Resumen tecnico - Reproductor de Peliculas debe ser la primera superficie de la pantalla

- Ajuste UX aplicado:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` ya no muestra un hero de metadata antes del video.
  - El reproductor ahora aparece arriba como primera superficie real de la pantalla, inmediatamente bajo el header glass.
  - La informacion de la pelicula se movio debajo del video como ficha compacta con:
    - titulo
    - ano
    - vistas
    - formato
    - resumen
    - acciones principales

- Criterio visual:
  - En una pantalla de reproduccion, el video debe mandar visualmente.
  - La metadata debe acompañar y explicar, no desplazar el reproductor hacia abajo.
  - El player se presenta sobre fondo negro edge-to-edge para que se sienta como superficie audiovisual principal.

- Regla practica:
  - Si se vuelve a iterar `PeliculaPlayer`, no reintroducir un hero informativo encima del `VideoView`.
  - Cualquier mejora de ficha, reparto, trailer o controles debe vivir debajo del reproductor o como overlay ligero que no tape controles nativos.
  - Mantener el header con `DEFAULT_HEADER_COLOR + overlapContent` para conservar el glass del menu principal sin ocupar espacio extra sobre el video.

---

Resumen tecnico - Controles ocultables y subtitulos en vivo en `PeliculaPlayer`

- Problema detectado:
  - La pantalla de reproduccion tenia controles/badges fijos encima del video y el rail derecho interrumpia la imagen.
  - La botonera inferior de la ficha (`Pantalla completa`, `Picture-in-Picture`, `Recargar stream`, `Trailer`) podia pisarse en anchos moviles por usar botones largos con `minWidth` alto.
  - Los subtitulos externos podian aparecer como seleccionados pero no verse si se trataba `textSubtitle` como URL directa o si el cambio de pista forzaba un remount del player.

- Correccion aplicada:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` ahora permite ocultar/mostrar los controles superpuestos del video tocando la superficie o usando el boton de ojo.
  - Cuando los controles estan ocultos, solo queda un boton pequeno para recuperarlos y el video queda limpio.
  - La botonera inferior se compacto con labels cortos y layout responsive para evitar solapes.
  - El subtitulo externo se resuelve contra `/getsubtitle?idPeli=<id>` siguiendo el contrato real de la web.
  - El `key` del `VLCPlayer` no debe incluir la opcion de subtitulo seleccionada; cambiar subtitulos debe actualizar `subtitleUri` o `textTrack` en caliente sin reiniciar el stream.

- Regla practica:
  - Los overlays del reproductor deben ser ocultables; no dejar chips o acciones permanentes encima del video si pueden tapar contenido.
  - En botones de accion dentro de cards moviles, evitar labels largos + `minWidth` grande cuando la fila puede envolver.
  - Para subtitulos externos en VLC, no asumir que `textSubtitle` es una URL; en este proyecto es contenido VTT guardado en backend y se sirve por `/getsubtitle`.
  - Si los subtitulos no se ven, revisar primero el endpoint y la URL generada antes de reintroducir remounts del reproductor.

---

Resumen tecnico - `PeliculaPlayer` debe comportarse como pantalla de video pura

- Ajuste aplicado:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` ya no renderiza header, hero, ficha ni paneles inferiores cuando la pelicula esta disponible.
  - La superficie principal queda reducida al reproductor y a una salida minima con boton de regreso flotante.

- Problemas corregidos:
  - Existia una imagen redundante por detras del reproductor (`playerBackdrop`) y otra capa de poster dentro del stage.
  - `addVistas` se disparaba apenas existia `streamUrl`, antes de que VLC cargara metadatos reales.
  - Cambiar subtitulos remonteaba el `VLCPlayer` porque el `key` dependia de `selectedSubtitleOption` y porque el flujo hacia `null -> subtitleUri` forzaba reconfiguracion innecesaria.

- Correccion aplicada:
  - Se elimino la capa de fondo con imagen detras del reproductor.
  - La carga visual previa del player ahora usa solo overlay neutro con spinner sobre fondo negro.
  - El conteo de vistas ahora se hace en `handleLoad` y solo una vez por pelicula cuando VLC ya devolvio metadatos con `duration > 0`.
  - El `key` del `VLCPlayer` ya no depende de la opcion de subtitulo; solo cambia por recarga o modo del reproductor.
  - `subtitleUri` y `textTrack` se actualizan en caliente sin remount del stream.
  - Los subtitulos externos de peliculas deben resolverse igual que en la web: `/getsubtitle?idPeli=<id>`, porque `textSubtitle` es contenido VTT guardado en backend, no una URL remota que deba pasarse directo al player.

- Regla practica:
  - Si una pantalla de reproduccion ya tiene drawer o detalle externo, no duplicar ficha informativa debajo del video.
  - Para medir una vista real de pelicula, no sumar acceso al entrar a la pantalla; esperar al evento `onLoad` del player.
  - Si un cambio de subtitulo provoca buffering o reinicio, revisar primero el `key` del player y cualquier estado intermedio que fuerce remount del componente nativo.
  - Si se toca la resolucion de subtitulos, contrastar contra `react-download/imports/ui/pages/pelis/PeliDetails.jsx`: la web usa `onLoadedMetadata` para vistas y `<track src="/getsubtitle?idPeli=...">` para subtitulos.

---

Resumen tecnico - `PeliculaPlayer` bloquea landscape y usa controles tipo Netflix

- Ajuste aplicado:
  - `components/downloadVideos/PeliculaPlayer.native.jsx` ahora bloquea la orientacion en horizontal al montar la pantalla usando `expo-screen-orientation`.
  - Al desmontar, restaura `OrientationLock.DEFAULT` para no dejar el resto de la app forzado en landscape.
  - Se instalo `expo-screen-orientation` como dependencia directa del proyecto.

- UX del reproductor:
  - Se retiro la estructura anterior de chips superiores y rail vertical derecho.
  - El overlay activo ahora sigue un patron mas cercano a Netflix:
    - video en fondo negro como superficie principal
    - boton de regreso flotante
    - barra de progreso roja en la parte inferior
    - controles inferiores con pausa/play, retroceder 10s, adelantar 10s, subtitulos y pantalla completa
    - titulo centrado sobre la fila inferior
  - Los controles siguen ocultandose automaticamente durante reproduccion y pueden reaparecer al tocar la pantalla.

- Criterio tecnico:
  - El cambio de subtitulos no debe afectar el `key` del `VLCPlayer`; solo debe actualizar `subtitleUri` o `textTrack`.
  - El boton de pantalla completa puede seguir usando el modal existente, pero la pantalla base ya entra en landscape para que la experiencia inicial sea de reproductor horizontal.

- Regla practica:
  - Si se vuelve a tocar esta pantalla, no reintroducir badges/chips superiores ni un rail vertical de acciones porque compiten con el lenguaje visual tipo Netflix pedido para el reproductor.
  - Si se agregan nuevas acciones de video, ubicarlas en la fila inferior o en un menu contextual, no como controles permanentes sobre los laterales del video.

---

Resumen tecnico - Peliculas con hero detras del header, filtros legibles y player sin estados externos

- Ajuste aplicado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` ahora deja que el hero de la pelicula destacada empiece detras del `AppHeader` con blur.
  - El inset del header se aplica al contenido interno del hero, no al `ScrollView`, para que la imagen sea visible bajo el glass del toolbar.
  - Los filtros del hero aumentaron contraste en fondo, borde, texto y chips para que se lean sobre imagenes claras u oscuras.

- Drawer de detalle:
  - `MovieDetailBottomDrawer` mantiene comportamiento bottom sheet en movil vertical.
  - En anchos grandes/horizontal se centra con ancho maximo para no ocupar toda la pantalla.
  - Esto evita que el detalle se sienta demasiado ancho en landscape y conserva una lectura mas parecida a panel cinematografico.

- Player:
  - `PeliculaPlayer.native.jsx` ya no muestra chip de `Buffer`; el buffer no debe ser un estado visual permanente fuera de los controles.
  - Los errores de reproduccion y la accion `Reintentar` viven centrados dentro del escenario negro del player.
  - Si falla la carga inicial de la pelicula, tambien se muestra una superficie de error dentro del mismo escenario de reproduccion, no como card externa separada.

- Regla practica:
  - En Peliculas, el primer componente visual debe ser la imagen/hero y el header debe flotar encima con blur.
  - No volver a poner `paddingTop: headerInset` en el contenedor completo del scroll si se busca ese efecto.
  - Cualquier estado del player que requiera accion del usuario debe mostrarse dentro de la superficie de video, preferiblemente centrado, no como componente aparte fuera del reproductor.

---

Resumen tecnico - Drawers laterales completamente scrolleables en horizontal y con header/footer fijos en vertical

- Ajuste aplicado:
  - `components/drawer/DrawerOptionsAlls.js`
  - `components/cadete/CadeteDrawerContent.native.jsx`
  - `components/empresa/EmpresaDrawerContent.native.jsx`
    ahora cambian su estructura segun la orientacion del dispositivo.

- Comportamiento final validado:
  - En vertical:
    - se conserva el patron existente
    - header fijo arriba
    - cuerpo central con `ScrollView`
    - footer fijo abajo
  - En horizontal:
    - el drawer completo pasa a ser una sola superficie scrolleable
    - header, contenido y footer viajan dentro del mismo `ScrollView`
    - esto evita que header + footer consuman casi todo el alto util y dejen poco espacio real para el menu

- Criterio tecnico importante:
  - En `DrawerOptionsAlls.js` fue necesario introducir `useWindowDimensions()` porque el drawer normal no tenia deteccion propia de landscape.
  - En los drawers de cadete y empresa ya existia `isLandscapeDrawer`, pero faltaba usarlo para cambiar la estructura del render y no solo compactar estilos.
  - En horizontal, los footers ya no deben depender de `marginTop: 'auto'`; pasan a comportarse como bloques normales dentro del flujo scrolleable.

- Regla practica:
  - Si otro drawer lateral del proyecto sufre el mismo problema en landscape, aplicar esta misma regla:
    - horizontal -> un solo `ScrollView` para toda la superficie
    - vertical -> header/footer estaticos y solo el cuerpo con scroll
  - No intentar resolver este caso solo compactando paddings; el problema real aparece por la estructura fija del drawer, no solo por densidad visual.

---

Resumen tecnico - Migracion de pantalla Precios web a Expo respetando herencia por admin

- Alcance aplicado:
  - `app/(normal)/Precios.tsx` ahora apunta a una pantalla nativa real:
    - `components/precios/PreciosScreen.native.jsx`
  - `components/precios/PreciosScreen.jsx` queda como fallback profesional para web/previews.
  - La ruta se registro en `app/(normal)/_layout.tsx` y el drawer de administradores en `components/drawer/DrawerOptionsAlls.js` expone la entrada `Precios`.

- Contrato legacy preservado:
  - La coleccion fuente de verdad sigue siendo `PreciosCollection` sobre `precios`.
  - La pantalla usa la publicacion existente:
    - `Meteor.subscribe('precios', selector, option)`
  - Crear y eliminar precios sigue haciendose con operaciones directas sobre `PreciosCollection`, igual que la web:
    - `PreciosCollection.insert(...)`
    - `PreciosCollection.remove(...)`

- Logica de herencia validada desde la web:
  - `carlosmbinf` puede crear precios independientes y ver todos los precios.
  - Los demas admins trabajan con precios propios por `userId` y deben partir de una oferta oficial para crear su precio de venta.
  - Cuando un admin hereda una oferta oficial, el documento nuevo conserva:
    - `type`
    - `megas` cuando aplica
    - `comentario`
    - `detalles`
    - `heredaDe` apuntando al precio oficial
  - La oferta oficial ya heredada por el admin no debe volver a aparecer como disponible para crear otro precio propio.

- Tipos de precio soportados:
  - `megas` -> Proxy por capacidad
  - `fecha-proxy` -> Proxy ilimitado por 30 dias
  - `vpnplus` -> VPN por capacidad
  - `fecha-vpn` -> VPN ilimitado por 30 dias
  - `vpn2mb` -> VPN 2MB, conservado por compatibilidad con legacy

- Criterio UX aplicado:
  - La UI no muestra textos tecnicos como nombres de colecciones, `userId` o `heredaDe`.
  - El copy se expresa en lenguaje de negocio:
    - oferta base
    - precio de venta
    - mensaje comercial
    - condiciones visibles
    - responsable
  - Para admins que no son `carlosmbinf`, el flujo explica que deben elegir una oferta oficial y definir su propio importe.
  - Para `carlosmbinf`, el flujo explica que puede crear ofertas oficiales y revisar precios de administradores.

- Regla practica:
  - Si se toca este modulo, no reemplazar la herencia de precios por metodos nuevos sin revisar primero la web legacy.
  - El campo `heredaDe` es importante para impedir duplicados de ofertas oficiales por admin.
  - Los precios por fecha no deben pedir megas; deben guardarse con `megas: null` y mostrarse como ilimitados por 30 dias.
  - Mantener la diferencia operativa entre `carlosmbinf` y los demas admins tanto en la query como en el dialogo de creacion.

---

Resumen tecnico - PiP nativo Android para el reproductor VLC de Peliculas

- Alcance aplicado:
  - El reproductor real de peliculas en Expo sigue usando `react-native-vlc-media-player` dentro de `components/downloadVideos/PeliculaPlayer.native.jsx`.
  - `playInBackground` de VLC no equivale a Picture-in-Picture nativo, por lo que el PiP Android se resolvio a nivel de `MainActivity`.

- Arquitectura implementada:
  - Se creo el modulo local Expo `modules/vidkar-pip` con el modulo nativo Android `VidkarPip`.
  - El modulo expone estado simple hacia JS:
    - `setPlayerActive(active)`
    - `getStatus()`
  - `PeliculaPlayer.native.jsx` marca el player como activo solo cuando hay stream valido, usuario/admin y sin error de carga; al desmontar lo apaga.
  - `MainActivity` entra a PiP en `onUserLeaveHint()` solo si `VidkarPipState.isPlayerActive()` es verdadero.

- Configuracion reproducible:
  - Se creo el config plugin `plugins/with-vidkar-android-pip.js` para que Expo prebuild regenere:
    - imports y overrides de PiP en `MainActivity.kt`
    - `android:supportsPictureInPicture="true"`
    - `android:resizeableActivity="true"`
    - `smallestScreenSize` dentro de `android:configChanges`
  - La fuente de verdad es el plugin y `app.json`, no los archivos generados bajo `android/`.
  - Android `minSdkVersion` debe mantenerse en `26` porque `react-native-vlc-media-player` lo requiere.

- Limitacion importante:
  - Esta solucion cubre PiP nativo Android.
  - En iOS, PiP nativo real con el player VLC actual no queda resuelto por este cambio; para PiP iOS habria que evaluar una ruta con `AVPlayer`/`expo-video` o un modulo nativo especifico compatible con `AVPictureInPictureController`.

- Regla practica:
  - Si se toca el reproductor de peliculas y se quiere mantener PiP Android, no eliminar el llamado a `setNativePipPlayerActive(...)` ni el modulo local `vidkar-pip`.
  - Si se regenera `android/`, validar que el plugin vuelva a inyectar `onUserLeaveHint()` y las flags de manifest antes de probar PiP en dispositivo.

---

Resumen tecnico - Precios con glass, agrupacion por administradores y cards expandibles

- Ajuste aplicado:
  - `components/precios/PreciosScreen.native.jsx` ahora usa el `AppHeader` con glass/blur solapado al contenido, alineado con el patron visual del menu principal.
  - El dialogo de creacion de ofertas se convirtio en una superficie glass real con `BlurView`, overlay translúcido y soporte Android mediante `experimentalBlurMethod="dimezisBlurView"`.

- Organizacion de datos:
  - El listado ya no muestra precios como una lista plana.
  - Ahora agrupa las ofertas por el administrador que las creo, mostrando un bloque por responsable y el conteo de ofertas preparadas.
  - La busqueda tambien contempla el nombre del administrador creador.
  - Se agrego filtro horizontal por administrador para revisar rapidamente los precios de un responsable concreto.

- Comparacion de precios heredados:
  - Cuando un precio viene de una oferta base (`heredaDe`), la card muestra la comparacion de negocio:
    - precio oficial
    - precio propio del administrador
  - La referencia oficial se resuelve desde el mapa local de precios oficiales/cargados, sin cambiar el contrato backend.

- Cards solapadas y expansion:
  - Las cards dentro de cada grupo se renderizan con solape visual para dar sensacion de stack.
  - La informacion larga (`comentario` y `detalles`) queda oculta por defecto.
  - Al tocar una card, se expande con `LayoutAnimation` para mostrar mensaje comercial y condiciones visibles.

- Regla practica:
  - En pantallas nuevas o redisenadas que pidan efecto premium, usar blur de forma consistente:
    - `AppHeader` con `overlapContent` para headers glass.
    - `BlurView` con tint literal (`dark`/`light`) y `dimezisBlurView` en Android para dialogos o overlays.
  - Para precios heredados, no mostrar solo el precio final; si existe oferta base, mostrar siempre la comparacion entre oferta oficial y precio propio.
  - Si el listado puede pertenecer a varios administradores, agrupar por responsable antes de agregar mas filtros o duplicar pantallas.

---

Resumen tecnico - Precios compactos, responsivos y acciones en submenu

- Ajuste aplicado:
  - `components/precios/PreciosScreen.native.jsx` dejo de usar solape negativo fuerte entre cards de precios.
  - Las ofertas ahora se organizan en una grilla responsiva por administrador, con separacion pequena positiva y ancho controlado por pantalla.
  - La densidad de las cards se redujo para que el listado sea mas operativo en telefono y tablet.

- Patron responsive:
  - La pantalla usa un helper local `getPricesLayout(width)` inspirado en el patron ya validado de `UsersHome`.
  - El helper calcula:
    - cantidad de columnas
    - ancho maximo de card
    - gap de grilla
    - modo compacto
  - No hardcodear `numColumns` ni anchos fijos dispersos si se vuelve a ajustar este modulo.

- Acciones secundarias:
  - El boton visible `Eliminar` salio del cuerpo de la card.
  - Las acciones viven ahora en un submenu por card con:
    - `Editar`
    - `Eliminar`
  - Esto permite mantener la card pequena y dejar las acciones destructivas o administrativas fuera de la lectura principal.

- Edicion de precios:
  - El dialogo de precios ahora puede crear y editar ofertas usando el mismo contrato de `PreciosCollection`.
  - En edicion, la oferta base heredada se conserva para mantener claro el historial comercial.
  - Los admins normales solo deben editar precios dentro de su alcance; `carlosmbinf` conserva el alcance principal.

- Regla de rendimiento:
  - No agregar suscripciones por card ni por grupo de administrador.
  - La pantalla debe seguir resolviendo creadores con una suscripcion agregada por IDs y `fields` minimos.
  - Si se agregan nuevos datos visibles en las cards, primero extender las proyecciones existentes (`PRICE_FIELDS` / `USER_FIELDS`) de forma conservadora antes de abrir nuevas suscripciones.

- Regla practica:
  - En listados administrativos densos, primero compactar jerarquia visual y mover acciones a submenu antes de aumentar el tamano de la card.
  - Si una card requiere detalles largos como comentarios o condiciones, mantenerlos detras de expansion con `LayoutAnimation` en vez de renderizarlos siempre.

---

Resumen tecnico - Player de peliculas con estados exclusivos de carga e interrupcion

- Problema detectado:
  - En `components/downloadVideos/PeliculaPlayer.native.jsx`, el overlay `Preparando reproduccion` seguia renderizandose por `!hasRenderedFrame` aunque ya existiera `playerError`.
  - Eso provocaba que el card `Reproduccion interrumpida` apareciera encima de un spinner de carga, mezclando dos estados incompatibles.
  - Ademas, `onError` de VLC podia mostrar interrupcion inmediatamente durante el arranque del stream, antes de darle margen real a la carga inicial.

- Correccion aplicada:
  - Se agrego un timeout minimo de `30s` antes de mostrar interrupcion si todavia no existe un frame renderizado.
  - `onError` antes del primer frame ya no muestra el card inmediatamente; guarda el error pendiente y deja que el timeout decida.
  - El overlay de carga ahora solo se muestra cuando no hay frame y no existe `playerError`.
  - El card de interrupcion se centro usando `StyleSheet.absoluteFillObject`, padding horizontal y ancho maximo fijo para evitar que quede pegado al lado izquierdo en landscape.

- Regla practica:
  - En el reproductor, los estados visuales deben ser exclusivos:
    - preparando/cargando
    - reproduciendo
    - reproduccion interrumpida
  - No renderizar loading detras de un error.
  - Si VLC reporta error antes de renderizar el primer frame, no declarar interrupcion antes de esperar al menos `PLAYBACK_INTERRUPTION_TIMEOUT_MS`.
  - Limpiar cualquier timeout de interrupcion cuando el player empieza a reproducir, progresa con tiempo real, finaliza o se reintenta.

---

Resumen tecnico - Drawer de detalle de peliculas con apertura inmediata y gesto en toda la superficie

- Problema detectado:
  - En `components/downloadVideos/DownloadVideosHome.native.jsx`, el drawer de detalle se abria esperando a `Meteor.call('getPelicula', ...)` cuando no habia cache local.
  - Aunque `selectedMovie` ya traia suficiente informacion del catalogo para pintar casi todo el drawer, se hacia `setMovieDetail(null)` y eso hacia percibir una carga innecesaria.
  - Ademas, el drag del drawer solo estaba montado sobre la barrita superior (`drawerHandleZone`), no sobre el resto de la superficie.

- Correccion aplicada:
  - `openMovieDetail(...)` ahora siembra el drawer inmediatamente con `movie` cuando no existe detalle cacheado, y deja `getPelicula` completando el payload en background.
  - Se agrego `activeDetailMovieIdRef` para evitar que una respuesta tardia de otra pelicula pise el drawer activo.
  - El gesto del bottom drawer se movio al `Animated.View` completo.
  - Para no romper el scroll interno cuando el drawer esta expandido, el `PanResponder` solo toma el gesto si:
    - el drawer aun no esta expandido, o
    - el scroll interno esta en top y el usuario arrastra hacia abajo.

- Regla practica:
  - Si el catalogo ya trae suficiente metadata para un detalle inicial, no dejar el drawer vacio esperando una segunda llamada al backend.
  - Abrir primero con los datos ya visibles y completar despues el detalle profundo en background.
  - Si un bottom drawer tiene scroll interno, el drag global debe coordinarse con el `contentOffset.y`; no basta con ampliar el area del gesto sin esa compuerta o se rompe la navegacion vertical.

Notas adicionales - `openMovieDetail(...)` no debe mezclar apertura y fetch remoto

- Ajuste funcional aplicado:
  - En `components/downloadVideos/DownloadVideosHome.native.jsx`, el `onPress` del card ya no debe ejecutar `Meteor.call('getPelicula', ...)` como parte del mismo flujo de apertura.
  - La apertura instantanea correcta es:
    1. `setSelectedMovie(movie)`
    2. sembrar `movieDetail` con `cachedMovieDetail || movie`
    3. abrir el drawer de inmediato
    4. pedir el detalle completo despues, en un `useEffect` disparado por `selectedMovie`

- Criterio tecnico validado:
  - Aunque React procese el `setState` antes del callback Meteor, meter el fetch remoto dentro del mismo `openMovieDetail(...)` sigue acoplando la percepcion de apertura a un trabajo innecesario del mismo gesto.
  - Separar la apertura del fetch elimina esa sensacion de demora y deja el drawer listo con el snapshot del card desde el primer frame visible.

- Regla practica:
  - Si un drawer o bottom sheet ya tiene suficiente data local para una primera renderizacion util, nunca mezclar el fetch profundo con el handler de apertura.
  - El fetch complementario debe vivir en un efecto posterior asociado al item seleccionado, no en el `onPress` original.

---

Resumen tecnico - Duracion real HLS en `PeliculaPlayer` debe preservarse fuera del estado volatil

- Problema detectado:
  - El servidor HLS ya devuelve `durationSeconds` y `startAtSeconds`, igual que usa la web.
  - En Expo, `components/downloadVideos/PeliculaPlayer.native.jsx` guardaba esa duracion dentro de `hlsPlayback`, que tambien cambia durante estados transitorios como `starting`, `processing` o errores temporales.
  - Si un status posterior venia sin `durationSeconds`, el cliente podia volver a `0` y terminar usando duraciones relativas de VLC o cache anterior en vez de la duracion real de la pelicula.

- Correccion aplicada:
  - Se agrego un estado separado para la duracion real del servidor HLS (`serverHlsDurationMs`).
  - `applyHlsStatus(...)` solo actualiza esa duracion cuando recibe un valor valido mayor que cero.
  - Los cambios de estado de preparacion HLS ya no borran la duracion conocida.
  - La barra de progreso prioriza `playback.currentTime / durationMs` cuando existe duracion real, y deja `playback.position` solo como fallback cuando no hay duracion.

- Criterio tecnico validado:
  - En HLS por sesion con ventana deslizante, VLC puede reportar `position` o `duration` relativos a la playlist actual, no al total absoluto de la pelicula.
  - La fuente de verdad del total debe ser `durationSeconds` del backend HLS.
  - El tiempo actual visible y guardado debe seguir usando tiempo absoluto: `startAtSeconds + currentTime`.

- Regla practica:
  - No guardar la duracion real HLS solo dentro de un objeto de estado que se reinicia durante la preparacion del stream.
  - Si el backend ya entrego `durationSeconds`, preservarlo hasta cambiar de pelicula o reiniciar completamente el contexto.
  - Si vuelve a aparecer duracion `00:00` o progreso incorrecto en peliculas HLS, revisar primero que `serverHlsDurationMs` no se este reseteando por un status incompleto y que la barra no este priorizando `event.position` de VLC.

---

Resumen tecnico - Alta de peliculas en Expo con flujo manual y disparo anual no bloqueante

- Alcance aplicado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` ahora permite agregar peliculas desde la app Expo cuando el usuario autenticado es:
    - `username === 'carlosmbinf'`
  - La accion vive en el `AppHeader` del catalogo de peliculas como boton `+` y abre un dialogo con dos modos:
    - carga manual completa
    - importacion por año

- Contrato Meteor reutilizado:
  - Carga manual:
    - `Meteor.call('insertAsyncPelis', payload, true, callback)`
  - Importacion anual:
    - `Meteor.call('insertAsyncpelisbyyears', { year }, callback)`
  - La app no inventa endpoints nuevos ni cambia colecciones; consume los mismos metodos validados en la web.

- Regla funcional importante:
  - En el modo `Importar por año`, la app solo inicia el trabajo del servidor.
  - No debe esperar a que termine toda la ejecucion anual; el backend devuelve rapido con `{ started: true }` y sigue trabajando en segundo plano.
  - El feedback al operador debe indicar que el servidor continuara el proceso, permitiendo enviar otro año sin bloquear la UI.

- Campos preservados en carga manual:
  - `nombre`
  - `year`
  - `peli`
  - `poster`
  - `subtitle`
  - `urlPadre`
  - `descripcion`
  - `tamano`
  - `mostrar`

- Regla practica:
  - Si se amplia el modulo de peliculas Expo, mantener paridad con la web nueva primero.
  - No esconder ni cambiar el flujo por año mientras el backend siga soportando `insertAsyncpelisbyyears` como disparador de importacion anual.
  - Si se agregan nuevos campos visibles al formulario manual, confirmar tambien que `insertAsyncPelis` los persista y no los descarte.

---

Resumen tecnico - Dialog de alta de peliculas en Expo con UX responsiva y secciones

- Ajuste aplicado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` mejoro el dialogo de `Agregar pelicula` para que no se sienta como un formulario largo comprimido.
  - El dialogo ahora usa:
    - cabecera propia con titulo, subtitulo y boton de cierre
    - soporte de teclado con `KeyboardAvoidingView`
    - alto maximo calculado por `useWindowDimensions()`
    - `ScrollArea` con altura derivada del espacio disponible
    - modo compacto para pantallas angostas
    - acciones apiladas cuando el ancho no alcanza

- Criterio UX validado:
  - La carga manual debe organizarse por secciones de trabajo:
    - datos principales
    - archivos y origen
    - presentacion
  - El selector de flujo (`Carga manual` / `Importar por año`) debe mostrarse como panel compacto y no como texto suelto.
  - La importacion anual debe seguir siendo una superficie corta y clara, separada visualmente del formulario manual completo.

- Regla practica:
  - En dialogos Expo con muchos campos, no usar alturas fijas grandes como solucion principal.
  - Calcular el alto segun pantalla, dejar el body scrolleable y mantener las acciones visibles.
  - Si el dialogo tiene blur/glass, conservar `BlurView` con `tint` literal (`dark`/`light`) y `experimentalBlurMethod="dimezisBlurView"` en Android.

Notas adicionales - Los campos del dialog no deben encogerse como mini-cajas

- Ajuste UX aplicado:
  - El dialogo de alta de peliculas dejo de depender de `flex: 1` generico para todos los campos.
  - Los campos ahora usan proporciones explicitas segun su rol:
    - nombre como campo principal ancho
    - año/tamaño como campos compactos controlados
    - URLs y descripcion a ancho completo
  - Las secciones manuales se renderizan como bloques propios con borde suave para que el formulario se lea por tareas y no como una columna pesada de inputs.

- Regla practica:
  - En formularios largos de Expo, no dejar que campos cortos y largos compartan exactamente la misma regla de flex.
  - Si un campo termina viendose como una caja demasiado pequena, definir `flexBasis`, `minWidth` y variantes full-width segun el tipo de dato.
  - Para dialogos profesionales, primero agrupar campos por intencion de trabajo y luego ajustar densidad; no resolver todo aumentando altura del modal.

Notas adicionales - Responsive real del dialog de peliculas depende de ancho y alto

- Ajuste aplicado:
  - `AddMovieDialog` ya no decide su modo compacto solo por `windowWidth`.
  - Ahora tambien contempla `windowHeight` para activar una densidad compacta cuando el dispositivo tiene poco alto disponible.
  - El dialog calcula:
    - ancho util limitado por pantalla
    - alto maximo basado en margen vertical real
    - alto de scroll descontando cabecera y acciones
  - Cabecera, secciones, campos, multilinea, panel de año y acciones tienen variantes densas propias.

- Regla practica:
  - En dialogos moviles largos, responsive no significa solo cambiar columnas por ancho.
  - Tambien hay que responder al alto disponible, especialmente cuando hay teclado, pantallas pequenas o modo landscape.
  - Si vuelve a faltar contenido visible, revisar primero `dialogMaxHeight`, `scrollMaxHeight` y las variantes densas antes de tocar la logica del formulario.

---

Resumen tecnico - Panel administrativo HLS dentro de Expo y preview web

- Alcance aplicado:
  - Se agrego la superficie administrativa del runtime HLS en Expo bajo:
    - `components/hls/HlsAdminScreen.native.jsx`
    - `components/hls/HlsAdminScreen.jsx`
    - `components/hls/hlsRuntimeUtils.js`
  - La ruta queda registrada en:
    - `app/(normal)/HlsAdmin.tsx`
    - `app/(normal)/_layout.tsx`
  - El acceso vive en el drawer de administradores como `Streaming HLS`.

- Contrato real del servidor HLS:
  - La pantalla consume el runtime vivo desde:
    - `GET /admin/api/runtime`
  - Ese endpoint esta protegido por sesion administrativa del servicio HLS (`requireAdminApi`).
  - Si responde `401` o `403`, la app debe mostrar un estado claro de sesion HLS no activa y ofrecer abrir `/admin/login`.

- Shape del runtime validado contra `servidor-hls`:
  - `activeFfmpegJobs[]`
  - `activeDirectStreams[]`
  - `ffmpegPath`
  - `cacheDir`
  - `now`
  - `totals.activeStreams`
  - `totals.activeFfmpegJobs`
  - `totals.activeDirectStreams`
  - Los jobs FFmpeg incluyen datos como `pid`, `sessionId`, `movieTitle`, `progress`, `segmentsCount` y `recentOutput`.

- Resolucion de URL HLS:
  - En nativo se reutiliza `getHlsServerUrl()` de `services/meteor/client.native.js`.
  - En preview/web se agrego `getHlsServerUrl()` a `services/meteor/client.js` con fallback productivo `https://hls.vidkar.com`.

- Criterio UX aplicado:
  - La pantalla sigue el patron profesional del panel HLS web independiente:
    - hero operativo
    - metricas resumidas
    - conversiones FFmpeg separadas de streams directos
    - cards responsivas en una o dos columnas
    - estados vacios y errores visibles
  - El header usa `AppHeader` con glass/blur como el resto de superficies administrativas nuevas.

- Regla practica:
  - Si se amplia este panel, no consultar colecciones Meteor para saber que esta convirtiendo FFmpeg; la fuente de verdad es `/admin/api/runtime` del servicio HLS.
  - Mantener separados los conceptos de conversion HLS/FFmpeg y stream directo porque representan caminos operativos distintos.
  - Si se agregan acciones administrativas futuras, validar primero que el servidor HLS tenga endpoints protegidos equivalentes; no inferir mutaciones desde la app Expo.

---

Resumen tecnico - Busqueda de Peliculas Expo con selector servidor y debounce

- Problema detectado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` estaba cargando un lote inicial limitado de peliculas y luego filtraba localmente por texto/genero.
  - Eso podia ocultar peliculas existentes fuera del primer `MOVIE_LIMIT`, aunque el usuario escribiera exactamente el nombre.

- Correccion aplicada:
  - La app Expo ahora construye un selector Mongo equivalente al de la web para `Meteor.subscribe('pelis', selector, option)`.
  - El selector busca en servidor por:
    - `nombrePeli`
    - `descripcion`
    - `clasificacion`
    - `actors`
    - `idimdb`
    - `year` cuando el texto es un ano de 4 digitos
  - Cuando hay busqueda o genero activo, el limite sube a `MOVIE_SEARCH_LIMIT` para ampliar el resultado sin cargar todo el catalogo por defecto.

- Mejora compartida con web:
  - La busqueda usa debounce antes de cambiar la suscripcion.
  - Esto evita disparar una consulta distinta por cada tecla y reduce carreras visuales cuando el usuario escribe progresivamente nombres como `Transformer`.

- Regla practica:
  - En Peliculas, no resolver busquedas globales solo con `visibleMovies.filter(...)` sobre Minimongo si la suscripcion esta limitada.
  - La busqueda debe entrar al selector de `pelis` y conservar proyeccion ligera; no agregar `textSubtitle` al listado.
  - Si se ajusta la web o Expo, mantener el debounce para que la consulta final del usuario no compita con consultas intermedias mientras escribe.

---

Resumen tecnico - Peliculas sin pestañeo durante refresco de busqueda

- Problema detectado:
  - La busqueda de peliculas ya consultaba correctamente al servidor con selector dinamico y debounce.
  - El pestañeo visual venia de que al cambiar el selector de `Meteor.subscribe('pelis', ...)`, la publicacion snapshot podia quedar temporalmente en `loading` y `PelisCollection.find(selector)` devolvia una lista vacia hasta recibir el nuevo lote.
  - Eso hacia que el catalogo reemplazara la experiencia por loading/empty state aunque existieran resultados estables del filtro anterior.

- Correccion aplicada en Expo:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` ahora conserva valores estables de catalogo mientras la suscripcion nueva esta cargando.
  - La busqueda textual espera `2000ms` sin tecleo antes de aplicar el selector real de servidor.
  - Esto evita modificar `Meteor.subscribe('pelis', ...)` en cada caracter y reduce cambios de snapshot mientras el usuario todavia esta escribiendo.
  - Los resultados visibles (`displayMovies`) y los generos visibles (`displayGenreOptions`) mantienen siempre el ultimo estado confirmado durante `loading`, incluso si Minimongo ya tiene un subconjunto temporal no vacio.
  - El resultado nuevo solo debe reemplazar al anterior cuando la suscripcion termina y el snapshot esta listo.
  - El estado vacio solo debe mostrarse cuando la suscripcion ya termino y realmente no existen resultados para el filtro.

- Paridad web:
  - La pantalla web de peliculas usa el mismo criterio para no reemplazar el catalogo por loading entre suscripciones.
  - El debounce de `2000ms` tambien debe mantenerse en web para que ambas superficies consulten con la misma cadencia.
  - Esto mantiene la busqueda incremental transparente tanto en Expo como en la web.

- Regla practica:
  - No bajar el debounce de busqueda de peliculas a valores cortos si la publicacion sigue funcionando como snapshot; el objetivo es esperar a que el usuario deje de teclear antes de cambiar la suscripcion.
  - En publicaciones snapshot o consultas limitadas, no usar resultados parciales de Minimongo durante `loading` como si fueran el resultado final del filtro.
  - Para filtros de peliculas, conservar el ultimo resultado estable durante el refresh y solo mostrar `No hay peliculas` despues de que la nueva suscripcion este lista.

---

Resumen tecnico - Cache interna acumulativa para busqueda de Peliculas Expo

- Problema detectado:
  - Aunque la busqueda de peliculas ya consultaba al servidor con selector dinamico y debounce, la experiencia seguia dependiendo demasiado de esperar el snapshot remoto de `Meteor.subscribe('pelis', ...)`.
  - Al escribir una busqueda, la app podia tardar en devolver resultados aunque varias peliculas ya hubieran sido recibidas antes por otras consultas del catalogo.

- Correccion aplicada:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` ahora mantiene una cache local en memoria con `Map` por `_id` para los documentos de listado ya vistos.
  - Cada lote recibido desde la publicacion `pelis` y cada alta manual de pelicula se mergea dentro de esa cache.
  - El filtro visual del catalogo usa primero esa cache local acumulativa para responder mas rapido mientras la nueva suscripcion remota completa o refresca datos.
  - La suscripcion server-side no desaparece: sigue siendo la fuente para descubrir peliculas que todavia no estan en cache y para actualizar campos de peliculas ya conocidas.

- Criterio tecnico importante:
  - La cache de listado no debe mezclarse con la cache de detalle (`movieDetailsCacheRef`).
  - La cache acumulativa guarda solo campos livianos de catalogo; `textSubtitle` sigue fuera del listado y debe seguir llegando por `getPelicula` o `/getsubtitle` cuando haga falta.
  - Para evitar renders infinitos, la cache usa una firma de campos relevantes por pelicula antes de incrementar la version reactiva del catalogo.

- Regla practica:
  - En Peliculas Expo, no volver a depender solo de `movies` del lote activo para construir el catalogo visible.
  - El flujo correcto es:
    1. filtrar rapido sobre cache local acumulada
    2. mantener debounce para no cambiar la suscripcion en cada tecla
    3. dejar que `pelis` actualice/complete la cache por `_id`
    4. mostrar estado vacio solo cuando no hay resultados locales y la suscripcion ya termino
  - Si se agregan mas campos al card/listado de peliculas, actualizar la firma de cache para que los cambios remotos refresquen la UI sin limpiar todo el catalogo.

---

Resumen tecnico - Paridad de filtro de Peliculas Expo frente a la web

- Problema detectado:
  - La web podia devolver 3 resultados para una busqueda como `Transformer`, mientras Expo mostraba solo 2.
  - La causa practica era que la app mezclaba dos ritmos distintos:
    - la suscripcion `pelis` con debounce y snapshot de servidor
    - el filtro visual inmediato sobre la cache local disponible en ese instante
  - Eso podia dejar la UI mostrando solo peliculas ya cacheadas aunque el selector real de servidor todavia estuviera cargando el resultado completo.

- Correccion aplicada:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` filtra el catalogo visible con `debouncedSearchQuery`, igual que la web, y no con cada caracter inmediato mientras la suscripcion aun no se aplico.
  - La cache acumulativa sigue ayudando a responder rapido, pero el resultado final visible queda alineado con el query efectivo que viaja a `Meteor.subscribe('pelis', ...)`.
  - La proyeccion ligera del listado Expo se alineo con la web incluyendo tambien:
    - `subtitulo`
    - `urlPadre`
    - `urlPeli`
    - `urlPeliHTTPS`
  - La firma de cache se actualizo con esos campos para que los documentos ya vistos puedan refrescarse sin limpiar el catalogo.

- UX de carga:
  - Cuando la busqueda esta esperando debounce o la suscripcion no esta lista, la UI muestra una pastilla discreta dentro del filtro (`Actualizando catalogo`).
  - No debe volver a usarse un overlay global agresivo para este caso, porque la experiencia correcta es mantener visible el ultimo catalogo estable mientras se actualiza.

- Regla practica:
  - En Peliculas Expo, el texto visible del input puede cambiar inmediatamente, pero el filtro que decide la lista debe seguir el mismo `debouncedSearchQuery` que modifica la suscripcion.
  - El estado visual de carga del catalogo debe depender solo de `handle.ready()` / `loading` de la suscripcion real, no de `isSearchDebouncePending`.
  - Mientras el usuario escribe y aun no pasan los 2 segundos, la UI debe mantener el catalogo estable sin mostrar spinner de carga; ese periodo es espera de escritura, no consulta al backend.
  - Si la web y Expo vuelven a devolver conteos distintos para el mismo termino, revisar primero:
    - campos proyectados en `MOVIE_FIELDS`
    - firma de cache acumulativa
    - uso de `debouncedSearchQuery` vs `searchQuery`
    - selector servidor enviado a `pelis`
  - No incluir `textSubtitle` en el listado para resolver esta paridad; sigue perteneciendo al detalle o endpoint dedicado.

Notas adicionales - Diagnostico temporal de suscripcion de Peliculas Expo

- Ajuste aplicado:
  - `components/downloadVideos/DownloadVideosHome.native.jsx` tiene una bandera temporal `MOVIE_SUBSCRIPTION_DEBUG` para imprimir en consola el estado real del flujo de catalogo.
  - Los logs usan el prefijo estable:
    - `[PeliculasSubscription] snapshot`
    - `[PeliculasSubscription] render-pipeline`

- Que valida cada log:
  - `snapshot` muestra lo que la suscripcion/Minimongo devuelve para el selector aplicado:
    - `ready`
    - `loading`
    - `searchQuery`
    - `debouncedSearchQuery`
    - `selectedGenre`
    - `movieLimit`
    - `selector`
    - `total`
    - resumen de peliculas recibidas
  - `render-pipeline` compara lo que llego con las capas posteriores:
    - total en suscripcion
    - total en cache acumulativa
    - total visible por reglas de publicacion/extension
    - total filtrado
    - total finalmente mostrado

- Regla practica:
  - Si la suscripcion trae 3 peliculas pero la UI muestra 2, el bug esta despues de `snapshot`: cache, filtro local, visibilidad o `displayMovies`.
  - Si `snapshot` ya trae 2, revisar selector/proyeccion/publicacion/backend antes de tocar el render.
  - Estos logs son instrumentacion de diagnostico; retirarlos o apagar `MOVIE_SUBSCRIPTION_DEBUG` cuando se cierre la investigacion para no dejar ruido permanente en Metro.

---

Resumen tecnico - Autoplay de trailers YouTube inline en Peliculas Expo

- Problema detectado:
  - `react-native-youtube-iframe` podia cargar correctamente la miniatura del trailer en el drawer, pero no iniciar la reproduccion automaticamente.
  - El boton rojo de YouTube quedaba visible y el usuario percibia que el trailer no se autoreproducia.

- Causa practica:
  - En WebView/mobile, el autoplay con sonido suele ser bloqueado por politica del runtime o del propio iframe.
  - Para que el autoplay sea fiable, el trailer debe iniciar silenciado y el WebView debe permitir reproduccion inline sin gesto del usuario.

- Correccion aplicada en `components/downloadVideos/DownloadVideosHome.native.jsx`:
  - El `YoutubePlayer` del drawer ahora usa estado propio por trailer:
    - `trailerPlaying`
    - `trailerReady`
  - El player arranca con:
    - `play={trailerPlaying}`
    - `mute`
    - `forceAndroidAutoplay`
    - `webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }}`
  - En `onReady`, el player vuelve a forzar `setTrailerPlaying(true)`.
  - Mientras el iframe inicializa, se muestra un loader discreto encima del frame.

- Regla practica:
  - Si se vuelve a tocar trailers YouTube inline, no depender de autoplay con sonido.
  - Mantener el arranque silenciado y las props explicitas del WebView.
  - Si aun falla en algun dispositivo, el siguiente diagnostico correcto es instrumentar `onError` y `onChangeState`, no volver a `Linking.openURL(...)` ni reintroducir el boton `Trailer`.

Notas adicionales - Trailer YouTube del drawer debe usar HTML local y quedar fuera del gesto global

- Hallazgo validado:
  - En `components/downloadVideos/DownloadVideosHome.native.jsx`, el trailer inline podia quedarse en loading permanente si el `YoutubePlayer` dependia del host remoto por defecto de `react-native-youtube-iframe` o si el `PanResponder` del bottom drawer envolvia toda la superficie, incluyendo el `WebView`.

- Correccion aplicada:
  - El `YoutubePlayer` del drawer ahora usa `useLocalHTML` para cargar el HTML interno de la libreria y no depender de la pagina remota base del paquete.
  - El `PanResponder` del drawer ya no se monta sobre todo el `Animated.View`; queda limitado al `drawerHandleZone`, dejando el area del trailer/WebView libre para cargar y recibir interaccion.
  - Los gradientes superpuestos sobre el hero deben llevar `pointerEvents="none"` para no interceptar toques del iframe.
  - Se agrego fallback de reintento si el player no queda listo despues de un tiempo razonable o si `onError` reporta fallo.

- Regla practica:
  - Si un trailer YouTube inline queda cargando indefinidamente, revisar primero:
    - que `useLocalHTML` siga activo
    - que `baseUrlOverride` apunte a `https://www.youtube.com` para evitar error 153 por origen/referer invalido en WebView
    - que el WebView no este debajo de un responder global del drawer
    - que los overlays absolutos tengan `pointerEvents="none"` cuando no sean interactivos
  - No volver a resolver este caso abriendo YouTube externo; el contrato del modulo es reproducir el trailer dentro del hero del drawer y dejar solo el boton `Reproducir` para la pelicula principal.

---

Resumen tecnico - Mensajes con header y composer glass sobre el historial

- Ajuste aplicado:
  - `components/mensajes/MensajesHome.native.js` ahora usa `AppHeader` con `overlapContent` para que el header quede solapado sobre la conversacion y el blur pueda mostrar contenido real por detras.
  - El composer inferior dejo de ser una franja opaca en flujo normal y paso a ser un footer flotante con `BlurView`, overlay translúcido y contenido de input/botones encima.
  - La lista de mensajes conserva padding superior e inferior suficiente para que el contenido pueda desplazarse por detras del header y del composer sin quedar tapado al leer o escribir.

- Criterio UX validado:
  - En una pantalla de chat, el historial debe sentirse como la superficie principal y los controles deben flotar sobre el contenido, no cortar la pantalla en bloques solidos.
  - El header y el composer pueden tener blur, pero sus inputs y botones internos deben conservar fondos propios para seguir siendo legibles en light/dark mode.

- Regla tecnica importante:
  - Para `BlurView`, usar siempre `tint` valido (`dark`/`light`) y `experimentalBlurMethod="dimezisBlurView"` en Android cuando aplique.
  - No pasar colores hex/RGBA a `tint`; los colores translúcidos deben vivir en overlays o fondos propios.
  - Si se cambia la altura del composer o del header, revisar tambien `messagesList.paddingTop` y `messagesList.paddingBottom` para evitar que el primer/ultimo mensaje quede oculto.

- Regla practica:
  - Si otra pantalla de mensajeria necesita efecto glass, el patron correcto es:
    1. header con `AppHeader overlapContent`
    2. contenido/lista renderizando debajo
    3. footer absoluto con `BlurView` y overlay translúcido
    4. padding de lista equivalente a las zonas flotantes
  - No resolver este efecto con fondos opacos en header/footer, porque entonces el blur existe tecnicamente pero no se percibe visualmente.

---

Resumen tecnico - Modo cadete requiere ubicacion lista antes de activarse

- Ajuste aplicado:
  - `components/comercio/pedidos/HomePedidosComercio.native.jsx` ahora compensa el alto real de `AppHeader overlapContent` usando `useAppHeaderContentInset()`.
  - Esto evita que el contenido principal de `Mis pedidos` quede visualmente debajo del header glass del shell cadete.
  - La tarjeta de estado de ubicacion tambien recupera su accion visible para abrir ajustes o actualizar ubicacion.

- Gate funcional aplicado antes de entrar a modo cadete:
  - `components/Main/MenuPrincipal.native.jsx` ya no llama `users.toggleModoCadete(true)` como primer paso.
  - Antes de activar el modo cadete, la app ahora exige:
    - permisos completos de ubicacion mediante `ensureCadeteLocationPermissions({ request: true })`
    - una ubicacion actual real enviada por `sendCadeteLocationNow(...)`
  - Solo si ese preflight pasa se llama al metodo backend `users.toggleModoCadete(true)`.

- Arranque y rollback de tracking:
  - Despues de activar `modoCadete`, la app llama `syncCadeteBackgroundLocation({ enabled: true, userId })`.
  - Si el servicio de tracking no arranca correctamente, la app revierte el flag con `users.toggleModoCadete(false)` y apaga el tracking local.
  - Esto evita dejar al usuario en modo cadete si la ubicacion en tiempo real no quedo disponible.

- Regla practica:
  - En este proyecto, entrar a modo cadete no debe ser solo cambiar un booleano de usuario.
  - La secuencia correcta es:
    1. pedir permisos completos de ubicacion
    2. obtener/enviar ubicacion inicial
    3. activar `modoCadete` en backend
    4. sincronizar tracking background/native
    5. revertir si el tracking falla
  - Si se toca otra vez el flujo de entrada a cadete, no mover el preflight de ubicacion despues del toggle; debe seguir ocurriendo antes para evitar disponibilidad falsa.

Notas adicionales - Permisos bloqueados de ubicacion deben abrir ajustes de la app

- Ajuste aplicado:
  - `components/Main/MenuPrincipal.native.jsx` ya no se limita a mostrar un aviso cuando el preflight de ubicacion falla.
  - Si el usuario rechazo previamente permisos de ubicacion o el runtime no puede obtener ubicacion actual, el alert ofrece la accion real:
    - `Abrir configuracion`
  - Esa accion usa `Linking.openSettings()` para llevar al usuario directamente a la configuracion de la app y permitir que apruebe ubicacion.

- Criterio UX validado:
  - Entrar al modo cadete depende de ubicacion en tiempo real, asi que un permiso bloqueado debe ser recuperable desde el mismo flujo.
  - No basta con decirle al usuario que active permisos; hay que darle el camino inmediato para aprobarlos.

- Regla practica:
  - Si una feature requiere permisos criticos y el usuario ya los rechazo, el flujo debe ofrecer una accion hacia ajustes de la app.
  - En modo cadete, cualquier error de permisos o ubicacion no disponible durante el preflight debe mantenerse antes de `users.toggleModoCadete(true)` y no activar disponibilidad falsa.

---

Resumen tecnico - ProductoCard de Empresa con footer legible sobre imagen full-background

- Problema detectado:
  - En `components/empresa/components/ProductoCard.native.jsx`, el card usa la imagen del producto como fondo completo.
  - En modo claro, el titulo del producto usaba texto oscuro (`palette.title`), pero visualmente quedaba sobre la foto/fade y no dentro de una superficie clara propia.
  - Resultado: el titulo parecia salirse del footer del card y rompia la lectura del producto.

- Correccion aplicada:
  - El bloque inferior `contentFooter` paso a ser una bandeja visual real con:
    - fondo translucido propio segun `theme.dark`
    - borde suave
    - padding interno
    - radio consistente con el card
  - Titulo, descripcion, precio, disponibilidad y nota quedan dentro de ese mismo panel, en lugar de flotar directamente sobre la imagen.
  - En modo claro el texto oscuro queda respaldado por una superficie blanca translucida; en modo oscuro el mismo bloque usa una base oscura translucida.

- Criterio UX validado:
  - Cuando una card usa imagen full-background, el texto puede ser claro sobre imagen o oscuro sobre panel claro, pero no debe quedar en una zona intermedia sin respaldo visual.
  - En cards de producto del modo Empresa, la imagen debe seguir siendo protagonista, pero la informacion comercial debe estar agrupada en un footer legible y no dispersa encima del media.

- Regla practica:
  - Si se vuelve a redisenar `ProductoCard`, preservar primero esta jerarquia:
    - media full-background
    - badges superiores sobre la imagen
    - footer/panel inferior con titulo, descripcion, precio y disponibilidad
  - No usar texto oscuro directamente sobre la foto en light mode salvo que exista un panel o scrim claro detras.
  - Mantener la resolucion de imagen separada en `ProductoImage` / `findImgbyProduct`; el card solo debe encargarse de composicion y legibilidad.

Notas adicionales - La foto del producto debe seguir siendo protagonista

- Ajuste visual posterior:
  - El footer claro del `ProductoCard` resolvia legibilidad, pero tapaba demasiado la foto del producto.
  - La solucion aprobada fue volver a un tratamiento mas fotografico:
    - menos tinte global sobre la imagen
    - fade solo en el tramo inferior
    - footer oscuro/translucido compacto
    - texto claro dentro del overlay
  - Esto permite leer titulo, descripcion y precio sin convertir el card en una tarjeta blanca encima de la foto.

- Regla practica:
  - En `ProductoCard`, no resolver legibilidad en modo claro con un panel blanco dominante si eso hace que la imagen pierda protagonismo.
  - El patron correcto para este card es imagen visible + overlay inferior translucido y compacto.
  - Si vuelve a faltar contraste, ajustar opacidad del fade/footer antes de aumentar el alto o la solidez del panel.

Notas adicionales - Blur muy suave en el footer fotografico de ProductoCard

- Ajuste visual aplicado:
  - `components/empresa/components/ProductoCard.native.jsx` ahora usa `BlurView` en el footer donde viven titulo, descripcion, chip de catalogo, precio y disponibilidad.
  - El blur debe ser deliberadamente bajo (`intensity` suave) para mejorar lectura de textos sin esconder la foto del producto.
  - La capa de color encima del blur debe mantenerse muy translucida; no debe volver a sentirse como panel solido.

- Regla practica:
  - En este card, si falta contraste sobre imagen, preferir primero `BlurView` suave + overlay minimo antes que aumentar opacidad de fondo.
  - Mantener `tint="dark"` literal y `experimentalBlurMethod="dimezisBlurView"` en Android para evitar problemas de enum en `expo-blur`.
  - Si el footer vuelve a tapar demasiado la foto, bajar overlay/opacidad antes de tocar la imagen o la carga remota.

---

Resumen tecnico - StoreCard de Mis Tiendas alineado al patron visual de ProductoCard

- Ajuste aplicado:
  - `components/empresa/screens/MisTiendasScreen.native.jsx` dejo de presentar el card de tienda como varios bloques administrativos separados encima del mapa.
  - El mapa sigue siendo el fondo protagonista mediante `MapaTiendaCardBackground`, pero la informacion comercial vive ahora en un footer glass compacto inspirado en `ProductoCard`.
  - El footer agrupa en una sola bandeja:
    - firma/especialidad de la tienda
    - nombre
    - descripcion
    - cantidad de productos
    - estado comercial
    - ubicacion/antiguedad

- Correccion tecnica importante:
  - `components/empresa/maps/MapaTiendaCardBackground.native.jsx` ahora renderiza el `scrim` antes de `overlayContent`.
  - Esto evita que la capa oscura/lavada del mapa quede por encima del contenido del card y degrade texto, blur o acciones superpuestas.

- Criterio UX validado:
  - Las tiendas deben seguir el mismo lenguaje visual que productos dentro del modo Empresa:
    - media/fondo protagonista
    - badges superiores ligeros
    - footer translucido con blur bajo
    - texto claro y compacto
    - sin cajas blancas dominantes ni paneles administrativos desconectados
  - El card debe comunicar primero identidad comercial y catalogo disponible, no coordenadas o metadatos tecnicos como bloque principal.

- Regla practica:
  - Si se vuelve a iterar `StoreCard`, preservar el mapa como hero full-background y mantener el contenido dentro de una bandeja inferior integrada.
  - No volver a poner el `scrim` por encima de los children de `MapaTiendaCardBackground`.
  - Para mejorar legibilidad, ajustar opacidad del fade/footer o intensidad baja del `BlurView`; no convertir el footer en una superficie solida que tape el mapa.

---

Resumen tecnico - Servidor VPN persistente por usuario y activacion automatica Proxy/VPN cobrada

- Alcance aplicado en backend Meteor:
  - Se centralizo la asignacion/remocion de usuarios a servidores VPN en `react-download/server/helpers/vpnServers.js`.
  - La activacion de VPN ya no solo prende flags del usuario; tambien agrega el `username` a `ServersCollection.usuariosAprobados`.
  - La desactivacion/bloqueo de VPN remueve al usuario del servidor donde estaba aprobado y guarda ese dominio como referencia futura del usuario.

- Contrato de servidor VPN validado:
  - El servidor por defecto se resuelve por:
    - `domain: 'vpn.vidkar.com'`
  - Si el usuario ya tiene servidores recordados, se intenta reutilizar primero la lista canonica:
    - `vpnServerDomains`
  - El backend puede leer campos legacy antiguos como fallback de migracion, pero ya no debe escribirlos como fuente principal.
  - Si no existe ninguno o el servidor ya no esta disponible, se cae al servidor por defecto `vpn.vidkar.com`.

- Campos nuevos/operativos en usuario:
  - `vpnServerDomains`: lista canonica de dominios VPN donde el usuario debe volver a aprobarse cuando compre/reactive VPN.
  - No guardar aliases redundantes como `vpnDefaultServerDomain`, `lastVpnServerDomain` o ids cacheados si el helper ya puede resolver servidores por dominio.

- Reglas de activacion integradas:
  - `ventas.aprobarVenta` ahora llama al helper cuando procesa carritos `VPN`.
  - `ventas.activarServicioProxyVPN` tambien asigna servidor al activar VPN por contrato directo.
  - `habilitarVPNUser` mantiene paridad con las activaciones administrativas manuales y tambien aprueba al usuario en servidor.

- Reglas de desactivacion integradas:
  - `desactivarUserVPN` remueve al usuario de `usuariosAprobados` antes de apagar flags VPN.
  - El cron de vencimiento/consumo en `server/tareas.js` tambien remueve al usuario del servidor antes de bloquearlo.
  - La remocion debe persistir `vpnServerDomains` para que la proxima compra vuelva a todos los servidores donde estaba aprobado cuando sea posible.

- PayPal y MercadoPago:
  - Los webhooks/handlers de pago ya crean la venta en `VentasRechargeCollection`, pero antes no activaban Proxy/VPN automaticamente.
  - Ahora, si la orden cobrada contiene carritos `PROXY` o `VPN`, llaman a:
    - `Meteor.callAsync('ventas.aprobarVenta', ventaId, { force: true, onlyTypes: ['PROXY', 'VPN'], source })`
  - Ese flujo activa servicios Proxy/VPN y evita reprocesar recargas u otros items no relacionados dentro de la misma orden.

- Cambio importante en `ventas.aprobarVenta`:
  - Acepta opciones internas:
    - `force`
    - `onlyTypes`
    - `source`
  - Si una venta ya esta marcada como cobrada, aun puede procesar carritos pendientes de los tipos indicados cuando `force === true`.
  - Esto es necesario para pagos online donde la venta de recarga queda cobrada por el gateway, pero el servicio Proxy/VPN todavia necesita activacion de negocio.

- Regla practica:
  - Si se toca de nuevo el pipeline VPN, no manipular `usuariosAprobados` disperso en cada metodo.
  - Usar siempre helpers compartidos para asignar/remover usuarios de servidores VPN.
  - Si se agrega otro gateway de pago, debe seguir el mismo patron de PayPal/MercadoPago: despues de insertar la venta cobrada, invocar `ventas.aprobarVenta` con `onlyTypes: ['PROXY', 'VPN']` para activar esos servicios sin duplicar recargas.
  - Si una pantalla cliente muestra configuracion VPN, debe resolverla desde `vpnServerDomains` y los documentos reales de `servers`, no desde un dominio hardcodeado salvo fallback inicial `vpn.vidkar.com`.

---

Resumen tecnico - Card VPN de usuario debe listar servidores aprobados, no solo servidores en estado ACTIVO

- Problema detectado:
  - `components/users/componentsUserDetails/VpnCardUser.js` filtraba servidores con:
    - `active: true`
    - `estado: 'ACTIVO'`
    - `usuariosAprobados: username`
  - Pero el acceso real VPN del usuario se expresa en `servers.usuariosAprobados`.
  - Un servidor puede tener `estado: 'INACTIVO'` y aun asi conservar al usuario en `usuariosAprobados`, por lo que el card ocultaba accesos reales ya guardados en backend.

- Correccion aplicada:
  - El selector del card ahora consulta por:
    - `usuariosAprobados: { $in: [username] }`
  - La card muestra tambien el `estado` del servidor para que el operador vea si el acceso existe aunque el servidor no este operativo en ese momento.
  - El empty state dejo de decir `servidores VPN activos aprobados` y ahora habla de `servidores VPN aprobados`.

- Regla practica:
  - En la pagina de usuario, `usuariosAprobados` debe tratarse como autorizacion de acceso, no como sinonimo de servidor actualmente activo.
  - Si se necesita distinguir disponibilidad operativa, mostrar `estado`/`active` como dato visual adicional, no usarlo para ocultar el servidor aprobado.
  - Si vuelve a faltar un servidor en el card, revisar primero si el username esta en `servers.usuariosAprobados` antes de depurar la publicacion `servers`.

---

Resumen tecnico - Card de notificaciones apagadas en MenuPrincipal

- Alcance aplicado:
  - `components/Main/MenuPrincipalScreen.jsx` ahora muestra un card profesional cuando las notificaciones push no estan activas en el dispositivo.
  - El card se ubica en el menu principal despues del hero y antes de los avisos administrativos, siguiendo el lenguaje visual de las cards operativas existentes.

- Contrato tecnico preservado:
  - La lectura de permisos y la activacion de push siguen centralizadas en `services/notifications/PushMessaging.native.ts`.
  - No se debe duplicar logica de permisos ni registro de token dentro de la UI.
  - El wrapper nativo `components/Main/MenuPrincipal.native.jsx` consulta el estado real de `expo-notifications` y pasa al screen solo props visuales y acciones.

- Comportamiento funcional:
  - Si el permiso esta pendiente o denegado pero aun se puede solicitar, el CTA intenta activar notificaciones y registra el token Expo de la sesion activa.
  - Si el permiso esta bloqueado (`canAskAgain === false`), el CTA abre la configuracion de la app para que el usuario lo active manualmente.
  - Cuando las notificaciones ya estan concedidas, el card no se renderiza.

- Regla practica:
  - En el menu principal, cualquier alerta de permisos del dispositivo debe vivir como card operativa con copy claro para cliente final, no como texto tecnico ni modal invasivo al arrancar.
  - Si se agregan nuevos estados de push, extender primero el helper del servicio de notificaciones y mantener `MenuPrincipalScreen` como capa de presentacion.

Notas adicionales - Card de notificaciones debe reaccionar al volver desde ajustes

- Problema detectado:
  - Si el usuario activaba o desactivaba notificaciones desde la configuracion del sistema, el card del menu principal podia quedarse con el estado anterior hasta que otra accion refrescara la pantalla.
  - La causa era que `MenuPrincipal.native.jsx` solo leia el permiso en momentos puntuales y no al regresar la app a foreground.

- Correccion aplicada:
  - `components/Main/MenuPrincipal.native.jsx` ahora escucha `AppState` y vuelve a ejecutar `getPushNotificationPermissionState()` cuando la app pasa a `active`.
  - La lectura de permisos se centralizo en `refreshPushPermissionState(...)`, con guard por request id para evitar que una respuesta vieja pise una lectura mas reciente.
  - Despues de intentar activar notificaciones con `registerPushTokenForActiveSession(...)`, el CTA usa el permiso recien refrescado para ocultar el card inmediatamente si ya quedo concedido, aunque el registro del token tarde un poco mas.

- Regla practica:
  - Cualquier UI que refleje permisos del sistema debe refrescarse al volver de ajustes con `AppState`, no solo al montar.
  - Si el permiso controla visibilidad de un card, el estado visual debe depender del permiso real recien leido y no exclusivamente del resultado secundario de registrar tokens o ejecutar otro side effect.

---

Resumen tecnico - Comercio informa ubicacion apagada y usa headers con blur

- Alcance aplicado:
  - La app Expo ahora muestra una card profesional cuando comercio no puede obtener ubicacion del dispositivo.
  - El aviso aparece en las dos superficies donde el usuario espera encontrar tiendas cercanas:
    - `components/productos/ProductosScreen.native.jsx`
    - `components/productos/ComercioHomeSection.native.jsx`

- Componente reutilizable:
  - Se creo `components/productos/CommerceLocationAccessCard.jsx` para centralizar el copy y la accion del permiso.
  - La card diferencia dos casos:
    - ubicacion apagada o aun no concedida -> CTA `Activar ubicacion`
    - permiso bloqueado (`canAskAgain === false`) -> CTA `Abrir ajustes`
  - Si el permiso esta bloqueado, la UI debe abrir `Linking.openSettings()` para que el usuario lo active manualmente.

- Servicio de ubicacion:
  - `services/location/deviceLocationCache.native.js` ahora expone `getDeviceLocationPermissionState()` para leer el estado actual del permiso sin pedirlo nuevamente.
  - Las pantallas de comercio usan ese helper junto con `requestDeviceLocationPermission()` y `getCurrentDeviceLocation(...)` para mantener una unica fuente de verdad sobre permisos y posicion.

- Reactividad al volver desde ajustes:
  - Igual que con notificaciones, las superficies de comercio escuchan `AppState`.
  - Cuando la app vuelve a `active`, vuelven a leer el permiso de ubicacion.
  - Si el permiso ya esta concedido y aun no hay ubicacion util, intentan obtener la ubicacion y relanzar la busqueda de tiendas.

- Header de comercio:
  - `ProductosScreen.native.jsx` ya no debe usar un `Appbar` manual con fondo solido.
  - La pantalla usa `AppHeader` con `DEFAULT_HEADER_COLOR` y `overlapContent`, heredando el blur/glass comun del proyecto.
  - Las acciones existentes del header se mantienen como acciones dentro de `AppHeader`:
    - regreso
    - busqueda
    - mensajes
    - carrito
    - menu de perfil

- Regla practica:
  - Si otra pantalla depende de permisos del sistema para mostrar contenido de negocio, no limitarse a un `Alert` puntual; debe existir una superficie persistente y accionable.
  - En comercio, sin ubicacion no se pueden ordenar ni encontrar tiendas cercanas correctamente, por lo que el aviso debe ser visible tanto desde el menu principal como desde la pantalla completa.
  - No volver a crear headers manuales en pantallas operativas si `AppHeader` ya cubre el caso; todos los headers del modulo deben mantener el blur compartido.

---

Resumen tecnico - Cache de ubicacion no debe ocultar permisos bloqueados en Comercio

- Problema detectado:
  - En Comercio Expo, una ubicacion cacheada podia hacer que `ProductosScreen.native.jsx` y `ComercioHomeSection.native.jsx` mostraran estados como `No hay tiendas cerca` aunque iOS tuviera la ubicacion de la app en `Nunca`.
  - El bug visible no era falta de cache, sino que `userLocation` estaba ganando visualmente sobre el estado real de permisos/servicios.

- Correccion aplicada:
  - Ambas superficies derivan ahora un estado central:
    - `locationServicesDisabled = servicesEnabled === false`
    - `locationPermissionDenied = granted === false`
    - `locationUnavailable = locationServicesDisabled || locationPermissionDenied`
  - `CommerceLocationAccessCard` se muestra si la ubicacion esta apagada, bloqueada o hay error de ubicacion, incluso cuando existe una ubicacion cacheada.
  - La cache puede seguir hidratando la UI como fallback, pero no limpia el error ni oculta el aviso cuando la ubicacion real no esta disponible.

- Regla funcional importante:
  - Si `canAskAgain === false`, el CTA debe abrir ajustes con `Linking.openSettings()`.
  - Si `servicesEnabled === false`, el copy debe explicar que la ubicacion del dispositivo esta apagada.
  - Si existe cache y la ubicacion sigue no disponible, la UI debe hablar de `Resultados aproximados` y advertir que distancia/orden pueden no ser correctos.

- Regla practica:
  - En flujos basados en ubicacion, no usar `userLocation` como prueba de que la ubicacion esta operativa; puede venir de cache.
  - Los estados vacios de negocio (`No hay tiendas`, `No hay comercios cerca`) no deben ganar sobre permisos bloqueados o servicios apagados.
  - Al cambiar radio o refrescar comercios, no relanzar busquedas con cache como si fuera ubicacion actual si `locationUnavailable` sigue activo.

---

Resumen tecnico - Acceso a modo Empresa desde el drawer normal de Expo

- Ajuste aplicado:
  - `components/Main/MenuPrincipal.native.jsx` ahora expone `handleToggleModoEmpresa()` y llama al metodo backend existente:
    - `users.toggleModoEmpresa(enabled)`
  - `components/Main/MenuPrincipalScreen.jsx` propaga `onToggleModoEmpresa` hacia `DrawerOptionsAlls`.
  - `components/drawer/DrawerOptionsAlls.js` muestra una card de `Modo empresa` en el footer del drawer normal cuando el usuario tiene rol de comercio empresa.

- Criterio funcional validado:
  - La entrada a empresa no debe copiar el preflight de ubicacion del modo cadete.
  - El cliente solo muestra el CTA si `profile.roleComercio` incluye `EMPRESA`.
  - La validacion fuerte sigue en backend, donde `users.toggleModoEmpresa` revisa terminos, bloqueo y rol real antes de activar `modoEmpresa`.

- Regla practica:
  - No actualizar `Meteor.users` directamente desde cliente para entrar o salir de modo Empresa.
  - Si se vuelve a tocar este flujo, mantener el contrato:
    - normal drawer -> `users.toggleModoEmpresa`
    - root/session gate -> decide navegar al shell empresa cuando `modoEmpresa` queda activo.
  - Empresa y Cadete son modos distintos: Cadete requiere ubicacion/tracking; Empresa requiere rol y condiciones de negocio validadas por servidor.

---

Resumen tecnico - Onboarding carousel obligatorio antes de activar modo Empresa

- Alcance aplicado:
  - El CTA `Entrar al modo empresa` del menu principal ya no activa directamente `modoEmpresa`.
  - Ahora navega primero a una pantalla de bienvenida dedicada:
    - `app/(normal)/EmpresaWelcome.tsx`
    - `components/empresa/EmpresaWelcomeScreen.native.jsx`
    - `components/empresa/EmpresaWelcomeScreen.jsx` como fallback de preview/web.
  - La ruta `EmpresaWelcome` quedo registrada en el stack normal de Expo.

- Criterio funcional validado:
  - El modo Empresa no debe entrar solo por tocar el boton del drawer/menu.
  - Primero el usuario debe leer la presentacion del modo Empresa y aceptar los terminos y condiciones.
  - Solo despues de aceptar se ejecuta la secuencia real de backend:
    - `users.aceptarTerminosEmpresa()` cuando aun no habia aceptacion previa
    - `users.toggleModoEmpresa(true)` para activar el modo
  - El root/session gate sigue siendo quien entra finalmente al shell empresa cuando el usuario queda con:
    - `modoEmpresa === true`
    - `profile.roleComercio` incluyendo `EMPRESA`

- Contrato backend preservado:
  - No actualizar `Meteor.users` directo desde cliente para aceptar terminos ni para activar Empresa.
  - El backend sigue siendo la fuente de verdad para:
    - permiso `permiteEmpresa`
    - bloqueo `empresaBloqueada`
    - aceptacion `empresaTerminosCondicionesAcepted`
    - rol de comercio `EMPRESA`
  - Si el usuario ya habia aceptado terminos, la pantalla puede saltar la llamada de aceptacion y activar directamente con `users.toggleModoEmpresa(true)`.

- UX/UI aplicada:
  - La pantalla usa carousel horizontal con secciones de bienvenida, tiendas, productos y terminos.
  - El ultimo slide contiene aceptacion explicita con checkbox antes de activar.
  - Los terminos visibles deben dejar claro que no se pueden publicar productos ilegales o restringidos, incluyendo drogas, armas, municiones, productos robados/falsificados, articulos peligrosos, medicamentos controlados, documentos oficiales, servicios fraudulentos o contenido sexual explicito.

- Regla practica:
  - Si se vuelve a tocar el acceso a Empresa, no reintroducir `users.toggleModoEmpresa(true)` directamente desde `MenuPrincipal` o `DrawerOptionsAlls`.
  - El camino correcto para entrar es siempre:
    1. navegar a `/(normal)/EmpresaWelcome`
    2. aceptar terminos si hace falta
    3. llamar metodos Meteor del backend
    4. dejar que el gate raiz cambie al shell empresa.
  - Si se amplian los terminos, mantenerlos en lenguaje claro para operadores/clientes y no convertirlos en copy tecnico de implementacion.

---

Resumen tecnico - EmpresaWelcome fullscreen con un unico CTA de aceptacion

- Ajuste UX aplicado:
  - `components/empresa/EmpresaWelcomeScreen.native.jsx` ya no debe usar `AppHeader` ni botones de navegacion `Anterior` / `Continuar`.
  - La pantalla de bienvenida al modo Empresa funciona como experiencia fullscreen con hero propio, carousel horizontal y un unico boton inferior.
  - En slides intermedios, el boton inferior dice `Cancelar` y vuelve al menu normal.
  - En el ultimo slide, ese mismo boton se convierte en `Aceptar terminos y condiciones` y ejecuta el flujo real de activacion.

- Cambio funcional importante:
  - Ya no se usa checkbox visual dentro del slide de terminos.
  - La aceptacion ocurre al presionar el CTA final, manteniendo el contrato backend:
    - `users.aceptarTerminosEmpresa()` si aun no habia aceptacion previa
    - `users.toggleModoEmpresa(true)` despues de aceptar
  - Tras activar, la pantalla hace `router.replace("/")` para dejar que el gate raiz entre al shell Empresa con el usuario actualizado.

- Regla practica:
  - Si se vuelve a tocar `EmpresaWelcome`, no reintroducir header ni multiples botones de navegacion.
  - La navegacion por el carousel debe quedar por swipe y el unico CTA persistente debe cambiar de `Cancelar` a aceptacion en el ultimo slide.
  - El contenido de terminos puede crecer, pero la accion de aceptarlos debe seguir centralizada en el boton final para no duplicar estados visuales.

---

Resumen tecnico - Login debe esperar usuario completo antes de decidir modo Empresa

- Problema detectado:
  - Un usuario con `modoEmpresa === true` podia iniciar sesion y caer en el menu normal.
  - La causa practica era que `Loguin.native.js` redirigia con `resolveSessionRoute(userId, user)` apenas existia `userId`, pero `Meteor.user()` podia estar todavia incompleto y sin `modoEmpresa` / `profile.roleComercio`.

- Correccion aplicada:
  - `components/loguin/Loguin.native.js` ahora suscribe explicitamente el usuario actual con `WATCH_ROOT_USER_FIELDS` antes de resolver la ruta post-login.
  - `components/navigator/sessionRoute.js` centraliza `userHasEmpresaRole(user)` para tolerar `profile.roleComercio` como array o string legacy.
  - `app/index.native.tsx` usa ese mismo helper en el gate raiz.
  - `components/Main/MenuPrincipal.native.jsx` agrega una redireccion defensiva: si por cualquier carrera el usuario ya esta en el menu normal pero el documento dice `modoEmpresa + EMPRESA`, navega a `/(empresa)/EmpresaNavigator`.

- Regla practica:
  - No decidir la ruta post-login solo con `userId`; esperar el documento de usuario proyectado con los campos de modo.
  - Para modo Empresa, usar siempre el helper robusto de rol y no volver a hacer `roleComercio?.includes('EMPRESA')` disperso.
  - Si una ruta normal recibe un usuario ya marcado como empresa, debe autocorregirse hacia el shell Empresa en vez de dejar al usuario en `MenuPrincipal`.

---

Resumen tecnico - Stepper del pedido del cliente integrado en el header oscuro del mapa

- Ajuste aplicado:
  - En `components/comercio/pedidos/components/PedidoCard.native.jsx`, cuando el pedido del cliente tiene seguimiento con mapa (`CADETEENLOCAL`, `ENCAMINO` o `CADETEENDESTINO`), el `PedidoStepper` ya no debe renderizarse como bloque separado encima del mapa.
  - Ahora vive dentro del `mapWrapper`, sobre el `LinearGradient` oscuro superior, para que se lea como parte del header visual del mapa.
  - Cuando el card esta expandido pero no hay mapa disponible, el stepper se mantiene en la posicion normal para no perder el contexto de estado.

- Criterio tecnico validado:
  - No resolver este layout con margenes negativos como `marginTop: -85`; eso provoca solapes fragiles con `MapView` y empeora especialmente en Android.
  - Si el stepper debe ir sobre el mapa, renderizarlo como overlay explicito con `position: 'absolute'`, `zIndex` y `elevation` dentro del wrapper del mapa.
  - Mantener `liteMode={Platform.OS === 'android'}` en mapas embebidos en cards para reducir problemas de superficies nativas que se dibujan por encima de siblings.

- Regla practica:
  - En cards de pedido con mapa, el orden visual correcto debe ser intencional:
    - mapa como base
    - gradiente oscuro superior para legibilidad
    - stepper dentro de ese header oscuro
    - detalle de productos debajo del mapa
  - Si se ajusta otra vez el card de `Mis pedidos`, no duplicar el stepper fuera y dentro del mapa; usar una sola instancia segun exista o no seguimiento visible.

---

Resumen tecnico - Markers de mapas de pedidos con iconos y punta anclada

- Ajuste aplicado:
  - `components/comercio/maps/MapaPedidos.native.jsx` dejo de usar imagenes PNG fijas de 50x50 para los pins de tienda y destino.
  - Ahora usa el mismo patron visual ya validado en el mapa del cliente:
    - `Marker` con child custom
    - circulo con borde blanco
    - icono de `MaterialCommunityIcons`
    - triangulo inferior como punta real del pin

- Criterio tecnico validado:
  - Para markers con punta, la coordenada real debe coincidir con la punta inferior y no con el centro visual del icono.
  - El patron correcto es usar dimensiones estables del marker junto a:
    - `anchor={{ x: 0.5, y: 1 }}`
    - `centerOffset` calculado desde el alto total del marker
  - Esto aplica especialmente cuando el marker se renderiza como vista custom o cuando se migra desde imagenes PNG con tamano fijo.

- Regla practica:
  - En mapas de pedidos, no volver a usar `image={require(...pin_50x50.png)}` si se necesita precision visual de la punta del marker.
  - Mantener consistencia entre mapa del cliente y modo cadete usando los mismos iconos y colores:
    - tienda: `storefront` con naranja `#FF6F00`
    - destino: `home-map-marker` con verde `#4CAF50`
  - Si se agregan nuevos markers con forma de pin, definir primero alto/ancho, anchor y centerOffset antes de ajustar estilos visuales.

---

Resumen tecnico - Mis pedidos del cliente usa AppHeader con blur compartido

- Ajuste aplicado:
  - `components/comercio/pedidos/PedidosComerciosList.native.jsx` dejo de usar un `Appbar` manual con fondo solido para el header.
  - Ahora usa `components/Header/AppHeader.jsx`, reutilizando el mismo `BlurView`, overlay y estilo glass aplicado al resto de headers nuevos del proyecto.
  - Las acciones existentes del header se conservaron:
    - mensajes
    - carrito
    - menu de perfil
    - regreso seguro a comercio

- Criterio UX validado:
  - La pantalla `Mis pedidos` del cliente debe sentirse integrada al lenguaje visual actual de la app.
  - No conviene dejar headers solidos legacy en pantallas que ya viven dentro del sistema visual con blur/glass.

- Regla practica:
  - Si se vuelve a tocar `PedidosComerciosList.native.jsx`, no reintroducir `Appbar` manual para la cabecera principal.
  - Usar `AppHeader` para mantener blur, safe area, acciones y consistencia visual con el resto de pantallas operativas.

---

Resumen tecnico - Direccion textual de entrega para compras Comercio en checkout Expo

- Alcance aplicado:
  - El step de ubicacion del carrito para items `COMERCIO` ahora captura tambien:
    - `nombreCalle`
    - `numeroCasa`
  - Ambos valores se manejan como strings y se envian junto con `latitude` / `longitude` al metodo backend:
    - `carrito.actualizarUbicacion`

- Contrato de datos:
  - Los campos quedan guardados en cada item de carrito al mismo nivel que:
    - `coordenadas`
  - No deben vivir dentro de `coordenadas`, porque la coordenada y la direccion textual tienen responsabilidades distintas.
  - Al crear orden/venta, estos campos viajan con el carrito completo igual que el resto del payload de comercio.

- UX aplicada:
  - `MapLocationPicker.native.jsx` muestra inputs controlados para calle y numero de casa dentro del step de ubicacion.
  - `WizardConStepper.native.jsx` valida que ambos esten completos antes de avanzar cuando el carrito tiene comercio.
  - `ListaPedidosRemesa.native.jsx` y `PedidoCard.native.jsx` muestran la direccion textual para que el cliente/admin puedan verificar la entrega.

- Regla practica:
  - Si se toca checkout de `COMERCIO`, no proyectar ni renderizar solo `coordenadas`; incluir tambien `nombreCalle` y `numeroCasa` cuando el flujo necesite direccion visible.
  - Si se reutiliza `carrito.actualizarUbicacion` desde otra superficie, mandar los campos textuales cuando el usuario los haya capturado, pero mantener compatibilidad con llamadas antiguas que solo envian coordenadas.
  - No reemplazar estos strings por una direccion formateada unica si el backend/orden necesita mantener calle y numero separados.

---

Resumen tecnico - Entregas de comercio visibles en el inicio antes de Cubacel

- Alcance aplicado:
  - `components/Main/MenuPrincipalScreen.jsx` ahora muestra una seccion de entregas de comercio antes del bloque de productos Cubacel.
  - La seccion vive en:
    - `components/comercio/pedidos/ComercioHomeOrdersSection.native.jsx`
  - El objetivo es que el home reutilice la misma experiencia visual de `Mis pedidos` del cliente cuando existan entregas de tipo `COMERCIO` en seguimiento.

- Contrato reutilizado:
  - No se creo un metodo nuevo ni una coleccion paralela.
  - La fuente de verdad sigue siendo:
    - publicacion `ventasRecharge`
    - `VentasRechargeCollection`
    - selector por usuario actual y carritos comercio:
      - `userId: Meteor.userId()`
      - `"producto.carritos.type": "COMERCIO"`
  - El render usa el mismo card ya validado en el modulo de pedidos:
    - `components/comercio/pedidos/components/PedidoCard.native.jsx`

- Criterio funcional:
  - En el inicio solo se muestran entregas activas o en seguimiento.
  - Se excluyen ventas canceladas y pedidos con estado `ENTREGADO` para no contaminar el home con historial terminado.
  - La pantalla completa `Mis pedidos` sigue siendo la superficie para revisar el historial completo.

- Criterio UX:
  - La card compacta del home debe verse igual que en `Mis pedidos`: encabezado `Pedido #...`, fecha, chevron y `PedidoStepper`.
  - La seccion solo aparece si hay datos reales; si no hay entregas activas, no debe dejar placeholder vacio encima de Cubacel.
  - El acceso `Ver todos` debe abrir `/(normal)/PedidosComerciosList` para mantener un solo flujo de detalle/historial.

- Regla practica:
  - Si otra superficie del home necesita mostrar pedidos comercio, reutilizar `PedidoCard` y el selector real de `ventasRecharge` en lugar de crear una card nueva con otro shape.
  - No duplicar la logica del stepper de comercio en el menu principal; el componente fuente de verdad visual sigue siendo `PedidoCard.native.jsx`.
  - Si se quiere cambiar cuantos pedidos aparecen en el home, ajustar el limite local de la seccion sin alterar `PedidosComerciosList.native.jsx`.

---

Resumen tecnico - Visibilidad de registro Empresa y acceso al modo Empresa por flags reales

- Problema detectado:
  - El card de registro/entrada a Empresa en el inicio y el card `Modo empresa` del drawer normal estaban usando `profile.roleComercio` como condicion visual principal.
  - Eso no coincide con la regla operativa solicitada para la app Expo, donde las superficies visibles deben depender de flags especificos del usuario.

- Regla aplicada en el home:
  - `components/Main/MenuPrincipalScreen.jsx` muestra el card de registro/entrada a Empresa cuando:
    - `permiteEmpresa === true`
    - `empresaBloqueada !== true`
    - `empresaTerminosCondicionesAcepted !== true`
    - `modoEmpresa !== true`
  - Si `empresaBloqueada` viene como `null` o `undefined`, debe tratarse como `false` para este gate visual.
  - Si `empresaTerminosCondicionesAcepted === true`, el card de registro del home ya no debe mostrarse; el cambio de modo debe quedar en el drawer normal.

- Regla aplicada en el drawer normal:
  - `components/drawer/DrawerOptionsAlls.js` muestra el card `Modo empresa` solo cuando:
    - `empresaTerminosCondicionesAcepted === true`
  - Ese card representa cambio de modo para quien ya acepto terminos, no el registro inicial.

- Proyeccion de usuario requerida:
  - `services/watch/watchDashboard.js -> WATCH_ROOT_USER_FIELDS` debe incluir:
    - `permiteEmpresa`
    - `empresaBloqueada`
    - `empresaTerminosCondicionesAcepted`
  - El root de Expo usa esta proyeccion para alimentar `Meteor.user()` en el menu principal; si esos campos no viajan, el card puede quedar invisible aunque la condicion sea correcta.

- Regla practica:
  - No usar `profile.roleComercio` como condicion visual para mostrar registro Empresa en el home ni para mostrar el cambio de modo en el drawer.
  - `profile.roleComercio` sigue siendo util para el gate de shell/ruta cuando `modoEmpresa` ya esta activo, pero no debe sustituir los flags especificos de habilitacion, bloqueo y terminos.
  - Si se vuelve a tocar el onboarding Empresa, mantener la habilitacion inicial basada en `permiteEmpresa === true` y `empresaBloqueada !== true` antes de llamar a metodos de activacion.

---

Resumen tecnico - Drawer Empresa activa directo si los terminos ya fueron aceptados

- Problema detectado:
  - El boton `Entrar en modo empresa` del drawer normal siempre navegaba a `/(normal)/EmpresaWelcome`.
  - Eso era correcto solo para usuarios que todavia no habian aceptado terminos, pero no para usuarios con:
    - `empresaTerminosCondicionesAcepted === true`

- Correccion aplicada:
  - `components/Main/MenuPrincipal.native.jsx` ahora distingue dos casos:
    - si el usuario aun no acepto terminos, abre `EmpresaWelcome`
    - si ya acepto terminos, llama directamente a `Meteor.call('users.toggleModoEmpresa', true)`
  - El flujo de salida del modo empresa sigue usando el mismo metodo con `false`.

- Regla practica:
  - No enviar siempre al onboarding desde el drawer de cliente.
  - El onboarding Empresa es obligatorio solo antes de aceptar terminos.
  - Despues de `empresaTerminosCondicionesAcepted === true`, el drawer debe comportarse como cambio de modo directo y dejar que el gate raiz lleve al shell Empresa.

---

Resumen tecnico - Card de entregas Comercio en home usa tono oscuro aislado

- Problema detectado:
  - La seccion de entregas de comercio del home vive sobre una superficie oscura, pero reutiliza `PedidoCard.native.jsx`, que por defecto esta pensado para `Mis pedidos` con superficies claras.
  - El resultado era texto oscuro sobre fondo oscuro en partes del detalle expandido.

- Correccion aplicada:
  - `PedidoCard.native.jsx` acepta ahora `tone="dark"`.
  - `ComercioHomeOrdersSection.native.jsx` pasa ese tono solo en el home.
  - La variante oscura ajusta card, titulos, divisores, filas de productos, comentarios, direccion y estados de carga sin alterar la experiencia normal de `Mis pedidos`.

- Regla practica:
  - Si un card compartido se reutiliza dentro de un contenedor oscuro, preferir una prop de tono/contexto antes que cambiar estilos base globales.
  - No oscurecer por defecto `PedidoCard`, porque tambien se usa en pantallas claras donde el estilo original sigue siendo correcto.

---

Resumen tecnico - Salida de modo Empresa debe reemplazar ruta al menu normal

- Problema detectado:
  - Al salir del modo Empresa desde el drawer, `users.toggleModoEmpresa(false)` si podia dejar el flag del usuario en `false`, pero la app seguia visualmente dentro de `/(empresa)/EmpresaNavigator`.
  - La causa practica era que `EmpresaDrawerContent.native.jsx` solo cerraba el drawer despues del metodo y no forzaba navegacion al shell normal.
  - Ademas, `EmpresaNavigator.native.jsx` no tenia un guard reactivo para abandonar el shell si `modoEmpresa` cambiaba desde otra superficie o por refresco de usuario.

- Correccion aplicada:
  - `components/empresa/EmpresaDrawerContent.native.jsx` ahora, tras `users.toggleModoEmpresa(false)` exitoso, ejecuta:
    - `router.replace("/(normal)/Main")`
  - `components/empresa/EmpresaNavigator.native.jsx` resuelve la ruta vigente con `resolveSessionRoute(userId, user)` y reemplaza la ruta si el usuario ya no corresponde al shell Empresa.

- Regla practica:
  - No tratar la salida de modo Empresa como una accion local del drawer.
  - Desactivar `modoEmpresa` debe ir acompañado de un `router.replace` hacia el menu normal o de un guard reactivo equivalente en el navigator.
  - Si se cambia el criterio de rutas por modo, actualizar `resolveSessionRoute(...)` y reutilizarlo en guards defensivos para no duplicar reglas.

---

Resumen tecnico - Cards de modo Cadete/Empresa legibles en drawer oscuro

- Problema detectado:
  - En `components/drawer/DrawerOptionsAlls.js`, las cards inferiores de `Modo cadete` y `Modo empresa` vivian sobre el drawer oscuro, pero conservaban textos hardcodeados para superficies claras.
  - Eso dejaba titulo y descripcion con poco contraste en modo oscuro, especialmente sobre el fondo blur/translucido del drawer.

- Correccion aplicada:
  - `footerCard` ahora usa una base oscura translucida con borde sutil.
  - `footerTitle` y `footerCopy` usan colores claros (`#f8fafc` / `#cbd5e1`) para lectura consistente.
  - Los botones de accion fijan color de fondo y texto para no depender de contraste accidental del tema en esa superficie.

- Regla practica:
  - Si una card vive dentro de un drawer oscuro o glass oscuro, no reutilizar textos pensados para fondo claro.
  - En footers operativos del drawer, validar siempre titulo, descripcion, icono y boton juntos porque el contraste puede romperse aunque el card tenga blur correcto.

---

Resumen tecnico - Cards de pedidos comercio muestran el cadete asignado

- Alcance aplicado:
  - Las cards de pedidos de comercio en Expo ahora muestran de forma visible quien tiene asignado el pedido.
  - Superficies ajustadas:
    - `components/comercio/pedidos/components/PedidoCard.native.jsx` para el cliente normal y el home con entregas activas.
    - `components/comercio/pedidos/CardPedidoComercio.native.jsx` para el modo cadete.

- Contrato funcional reutilizado:
  - No se creo metodo backend nuevo para esta informacion.
  - La fuente de verdad de asignacion visible sigue siendo `VentasRechargeCollection.cadeteid`.
  - El nombre del cadete se resuelve con una suscripcion minima a `user` usando solo campos necesarios:
    - `_id`
    - `username`
    - `profile`
    - `picture`

- Comportamiento en cliente normal:
  - Si la venta tiene `cadeteid`, el card muestra un bloque `Cadete asignado` con nombre visible o username.
  - Si aun no tiene `cadeteid`, muestra `Esperando asignacion` con estado `Pendiente`.
  - El bloque respeta la variante `tone="dark"` usada por las entregas activas en el home, para no romper contraste cuando el card vive sobre superficies oscuras.

- Comportamiento en modo cadete:
  - La card operativa muestra `Pedido asignado a` con el usuario que esta gestionando el pedido.
  - Este dato se toma del `cadeteId` que ya recibe el componente y se enriquece desde `Meteor.users` con proyeccion minima.
  - El bloque se integra como mini-card de estado, sin alterar el stepper, mapa, slider ni flujo de avance del pedido.

- Regla practica:
  - Si se vuelve a tocar la visibilidad de asignacion en comercio, no duplicar estado en otra coleccion ni inventar otro endpoint.
  - Usar `cadeteid` de `ventasRecharge` como fuente de verdad y resolver datos humanos desde `Meteor.users` con fields minimos.
  - Si se cambia el diseño de `PedidoCard`, mantener una variante legible para `tone="dark"`, porque el mismo card se reutiliza dentro del home cliente.

---

Resumen tecnico - Preparacion de empresa tambien debe mostrar cadete asignado desde `cadeteid`

- Problema detectado:
  - Las cards de cliente normal y modo cadete ya mostraban el cadete asignado, pero la pantalla de preparacion del modo empresa seguia sin mostrarlo.
  - La captura correspondia a `components/empresa/screens/PedidosPreparacionScreen.native.jsx`, no a `PedidoCard.native.jsx` ni a `CardPedidoComercio.native.jsx`.

- Correccion aplicada:
  - `PREPARACION_VENTA_FIELDS` ahora incluye `cadeteid` para no perder el dato al proyectar `ventasRecharge`.
  - La pantalla recolecta los `cadeteid` visibles, suscribe `Meteor.users` con fields minimos y enriquece cada pedido con nombre/username del cadete.
  - `PedidoPreparacionCard` muestra una mini-card `Cadete asignado` cuando la venta tiene cadete, o `Esperando asignacion` cuando todavia no lo tiene.

- Regla practica:
  - En comercio, la fuente de verdad visible de asignacion sigue siendo `VentasRechargeCollection.cadeteid`.
  - No asumir que corregir `PedidoCard` cubre todas las superficies de pedidos; `Preparacion` de empresa tiene su propia card y su propia proyeccion de ventas.
  - Si otra pantalla proyecta `ventasRecharge` y necesita mostrar cadete, agregar `cadeteid` a sus fields y resolver el usuario con una suscripcion agregada por IDs, no con consultas por card.

---

Resumen tecnico - Preparacion Empresa con desasignacion de cadete y card responsive

- Alcance aplicado:
  - `components/empresa/screens/PedidosPreparacionScreen.native.jsx` muestra el cadete asignado en cada pedido de preparacion usando `VentasRechargeCollection.cadeteid` como fuente de verdad.
  - La pantalla permite desasignar cadete cuando el pedido esta en `PREPARACION_LISTO`, llamando al metodo backend reusable `comercio.pedidos.desasignarCadete`.

- Regla de datos:
  - Si una card de preparacion necesita mostrar nombre del cadete, la proyeccion de `ventasRecharge` debe incluir `cadeteid`.
  - Resolver nombres con una suscripcion agregada a `Meteor.users` por los `cadeteid` visibles y fields minimos (`username`, `profile`, `picture`).
  - No hacer suscripciones por card ni duplicar estado de asignacion en otra coleccion.

- UX aplicada:
  - El card de cadete asignado debe separar identidad/estado de la accion destructiva.
  - En compacto, el boton `Desasignar` debe ocupar su propia fila para no competir con el nombre, username o chip de estado.
  - Evitar meter icono, textos largos, chip y boton en una sola fila; en telefonos se rompe la lectura rapidamente.

- Regla practica:
  - Si se reutiliza la desasignacion en otra superficie, mantener la llamada al metodo backend y reflejar localmente Minimongo solo despues de exito confirmado.
  - Si se cambia el diseno del card, preservar primero legibilidad responsive antes de agregar mas metadatos visibles.
