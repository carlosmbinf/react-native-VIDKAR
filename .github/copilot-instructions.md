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
    - fallback fijo `ws://www.vidkar.com:3000/websocket`
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
  - `app.json` mantiene `extra.meteorUrl = ws://www.vidkar.com:3000/websocket` como origen explícito para Meteor.
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

  ---

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

  ---

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

  ---

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

  ---

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

  ---

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

  ---

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

  ---

  Resumen tecnico - Chip de rol en `MenuPrincipal` solo para administradores

  - Ajuste aplicado en `components/Main/MenuPrincipalScreen.jsx`:
    - El chip con `shield-account` y `getRoleLabel(user)` ya no se muestra para usuarios normales.
    - Ahora solo se renderiza cuando el usuario es admin o administrador general.

  - Criterio UX validado:
    - En el hero principal no conviene ocupar espacio visual con un badge de rol para usuarios finales si ese dato no aporta valor operativo.
    - El chip de rol si tiene sentido para perfiles administrativos porque contextualiza permisos y responsabilidad dentro del sistema.

  - Regla practica:
    - En superficies de bienvenida, mostrar metadatos de rol solo cuando aporten contexto real al flujo del usuario.

  ---

  Resumen tecnico - Boton de mensajes solo visible cuando existen mensajes reales

  - Ajuste aplicado en `components/components/MenuIconMensajes.native.js`:
    - El icono de mensajes deja de renderizarse si no hay mensajes o conversaciones disponibles para el usuario actual.
    - Tambien se oculta durante `loading` para evitar mostrar un acceso transitorio que luego desaparezca.

  - Criterio UX validado:
    - Si el menu de mensajes no tiene contenido, no conviene mostrar el icono en el header.
    - Un acceso visible que no puede abrir nada util solo genera ruido visual y expectativa falsa de funcionalidad.

  - Regla practica:
    - En menus o acciones contextuales del header, renderizar el acceso solo cuando exista contenido real detras de esa accion.

  ---

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

  ---

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

  ---

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
