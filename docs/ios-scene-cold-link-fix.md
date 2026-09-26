# Enlace inicial iOS con ciclo de vida UIScene

La fuente de verdad es `plugins/with-vidkar-ios-scene-lifecycle.js`. Este cambio
no actualiza todavía los archivos generados de `ios/` ni el binario instalado.

## Contrato verificado

Inspección de dependencias instaladas: Expo 57.0.17, Linking 57.0.8,
Router 57.0.17 y React Native 0.86.3.

- `expo-router/build/link/linking.js` usa `Linking.getLinkingURL()` en iOS.
- `expo-linking/ios/ExpoLinkingModule.swift` lee el registro `initialURL`.
- `LinkingAppDelegateSubscriber` llena ese registro en `application(open:)` y
  `application(continue:)`, no mediante `didFinishLaunching`.
- `ExpoAppDelegate` entrega ambos callbacks a sus suscriptores.
- `RCTLinkingManager.mm` lee `.url` o `.userActivityDictionary`; este último
  requiere el tipo `NSUserActivityTypeBrowsingWeb` y la actividad en
  `UIApplicationLaunchOptionsUserActivityKey`. El tipo usa la constante pública
  `UIApplication.LaunchOptionsKey.userActivityType.rawValue`.

## Orden del fix

1. El plugin conserva el diccionario original de `didFinishLaunching` en una
   propiedad de AppDelegate sin alterar su llamada a `super`.
2. `willConnectTo`, tras comprobar escena/factory, consume esas opciones una vez.
   Conserva claves ajenas y push; usa `notificationResponse` como fallback del
   payload push, sin repetir callbacks de notificaciones.
3. Selecciona un único destino inicial: contexto URL antes que actividad
   BrowsingWeb con `webpageURL`. Orden lexicográfico para conjuntos múltiples.
   Las opciones del proceso son fallback cuando la escena no trae un enlace.
   Una actividad no web se entrega a sus suscriptores, nunca se convierte en URL.
4. Entrega el destino por el AppDelegate existente **antes de arrancar JS**:
   el suscriptor Expo conserva `initialURL`, y la factory recibe las opciones RCT.
   No se repite `didFinishLaunching`, ni se encola un replay después del bootstrap.
5. Conserva literalmente los callbacks warm. Elimina solo el bloque de bootstrap
   conocido del template Expo, no otros bloques condicionales ni orientación.

No cambia el resolver, `app/+native-intent.tsx`, autenticación, contratos Meteor,
la acción de catálogo en segundo plano ni fallbacks Android/web. La validación y
autorización permanecen en sus capas existentes; recibir un enlace no autoriza
operaciones. No se añaden logs de URLs ni datos reales.

## Evidencia y límites

- `npm run test:ios-scene`: plugin de producción sobre template instalado y
  AppDelegate existente, doble aplicación, preservación del catálogo/orientación,
  manifest y alta única de fuente Xcode; fallo seguro ante bootstrap desconocido.
- Compilación aislada de AppDelegate/SceneDelegate generados contra UIKit real,
  iPhone y simulador arm64, mínimo iOS 16.4. Expo/factory usan stubs mínimos;
  subscriber y registry Linking se compilan desde el SDK instalado.
- Ejecución standalone en macOS con UIKit/factory simulados: 13 escenarios de
  inicio, opciones originales/push, URLs múltiples, actividades web/no web,
  ausencia de replay y eventos warm. Los resultados alimentan el Router instalado
  y el resolver real. RCT se verifica por su contrato fuente, no ejecutando su runtime.
- `npm run test:mcp`: 46 pruebas, incluidas conservación del destino durante
  restauración/login, seguridad de enlaces y búsqueda sin autoplay.
- Lint dirigido y diagnósticos sin errores. Lint global: 0 errores y 85
  advertencias en archivos ajenos al cambio.

Pendiente para un despliegue posterior: aplicar el plugin al proyecto nativo y
validar el binario completo en iPhone, con Siri/OpenURLIntent, terminación real
del proceso, login, Universal Links, push y reapertura warm. Estos tests no
ejecutan UIKit en iOS, la cadena completa de suscriptores ni el runtime JS/RCT
de una app real. No se ejecutó prebuild, build completo, instalación ni red de
producción durante este fix.
