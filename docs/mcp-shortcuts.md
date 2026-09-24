# Siri, App Intents y MCP de VIDKAR

## Estado actual de Siri (septiembre de 2026)

La superficie activa de App Intents se redujo a una sola capacidad nativa:

- `VIDKARCurrentUserIntent`: responde “Dime el usuario de VIDKAR” con el nombre de la cuenta sincronizada desde la sesión Meteor autenticada.
- `VIDKARCurrentUserEntity`: devuelve una tarjeta con nombre y `@username`; la entidad solo resuelve el ID de la cuenta actual y no se ofrece como sugerencia.
- `VIDKARCurrentUserShortcuts`: publica frases en español para Siri/Atajos. `openAppWhenRun` es `false`; la app no se abre para responder.
- La identidad mínima se cifra con Keychain, se actualiza cuando la sesión y el perfil están listos y se borra al detectar logout. No se comparte con el indexado semántico de Spotlight.
- La intent no depende de MCP ni de una llamada de red durante `perform()`. El valor es una instantánea del último estado autenticado sincronizado por la app; si la sesión se revoca desde otro dispositivo, se actualiza cuando este dispositivo vuelve a conectarse/abrir VIDKAR.
- El intent exige autenticación del dispositivo. Siri/Apple Intelligence puede decidir no elegir VIDKAR para una frase libre; el App Shortcut aumenta la posibilidad de descubrimiento, pero no garantiza una interpretación concreta.

Codemagic permanece sin cambios: su workflow iOS elimina `ios/` y ejecuta `expo prebuild`; el nuevo Swift está dentro del módulo local ya autolinkeado, sin targets, entitlements, perfiles ni pasos nuevos.

## MCP móvil (independiente de Siri)

La app conserva el módulo Expo `modules/vidkar-mcp` y el backend MCP para la pantalla de configuración/consultas dentro de VIDKAR. Esta integración no forma parte del intent simple de identidad. El MCP sigue validando tokens, permisos y datos en backend.

```text
Pantalla MCP de VIDKAR -> módulo Expo vidkar-mcp -> backend MCP HTTPS
Siri / Apple Intelligence -> VIDKARCurrentUserIntent -> Keychain de identidad actual
```

El backend sigue siendo la autoridad para las operaciones MCP. La intent de identidad solo lee la instantánea local y no acepta IDs de usuario de entrada.

## Capacidad Siri actual

El intent produce un diálogo de voz con el nombre completo y una entidad retornable cuya representación muestra nombre y `@username`. Para datos personales no se implementa `suggestedEntities()` con resultados, no se indexa la entidad en Spotlight y no se acepta una identidad arbitraria desde Siri.

Las intents MCP anteriores y sus entidades de catálogo ya no se compilan en la app. Se conservaron detrás de la condición Swift `VIDKAR_LEGACY_INTENTS` únicamente como referencia de migración; Codemagic no define esa condición. La antigua indexación semántica MCP se eliminó.

## Descubrimiento y seguridad del catálogo

`tools/list` se descubre dinámicamente; no se replica la lista de tools en Swift. El catálogo muestra nombre, descripción, `inputSchema`, anotaciones MCP, permisos, clase de datos, lectura y confirmación.

El servidor marca tools de consulta con `readOnlyHint`, y adjunta `_meta["vidkar/security"]` con permisos/clase/confirmación. Swift y JavaScript solo permiten ejecutar tools marcadas de solo lectura; la validación backend se repite en cada llamada.

La configuración valida HTTPS, host `vidkar.com`/`www.vidkar.com`, ruta `/mcp`, ausencia de credenciales/query/fragment en la URL y el token Bearer en Keychain. Al configurar, el cliente llama `get_current_user` y exige que el ID propietario del token coincida con el `Meteor.userId()` actual antes de conservar la configuración. Cambiar usuario o cerrar sesión elimina las credenciales por los flujos logout existentes. No se registra el token.

Las antiguas intents de playback ya no se compilan ni están disponibles desde Siri. Independientemente de App Intents, el player de películas exige sesión Meteor y `subscipcionPelis === true` antes de preparar HLS.

Todas las tools requieren token Bearer en `/mcp`; también en modo stdio los handlers rechazan llamadas de datos sin identidad. Tools de usuarios, finanzas, órdenes, compras y mensajes requieren confirmación explícita en el cliente y `confirmed: true` en el servidor. Películas, series, cursos, niveles, suscripciones y ownership se autorizan del lado backend. No existen tools MCP de escritura; una llamada no declarada de solo lectura se rechaza con “No tienes permisos para realizar esa acción en VIDKAR.”

## `search_entities`

Herramienta creada porque no existía búsqueda MCP general. Trabaja en backend con allowlist de tipos/colecciones/proyecciones; los identificadores Mongo, campos y selectores no se aceptan desde el cliente.

Tipos disponibles: `all`, `movie`, `series`, `episode`, `course`, `lesson`, `user`, `purchase`, `sale`, `order`, `product`, `message` y `subscription`.

Admite query de hasta 120 caracteres, categoría/estado, período natural o `from`/`to` en ISO, orden, `limit` máximo 50 y `offset` máximo 10 000 (global `all` hasta 200). Responde entidades resumidas con paginación y deep link; no devuelve documentos Mongo completos ni URLs de stream/video. Imágenes se exponen solo si usan HTTPS bajo `vidkar.com`.

- Las búsquedas de películas requieren que sean visibles.
- Series/capítulos requieren usuario autenticado con `subscipcionPelis === true` y contenido visible.
- Cursos publicados aplican el nivel de evaluación del usuario; las búsquedas de lecciones requieren confirmación, suscripción activa, curso publicado y nivel autorizado.
- Usuarios respetan el alcance del token (self / subordinados autorizados / admin principal) y requieren confirmación.
- Compras/ventas/órdenes se restringen al alcance MCP; mensajes se filtran siempre a `from == userId || to == userId` y requieren confirmación.
- `subscription` consulta la suscripción de películas del usuario actual y sus suscripciones propias de cursos; requiere confirmación y nunca admite un `userId` arbitrario.
- Productos se limitan a catálogos existentes y proyección permitida. El precio solo se presenta si el documento realmente tiene precio, sin inferir moneda.
- No hay búsqueda de proveedores, TV, audio, descargas o precios oficiales: no se inventaron rutas ni permisos para ellos.

## Deep links y navegación (pantallas MCP/Spotlight existentes)

`services/navigation/universalLinks.ts` conserva Universal Links HTTPS y el allowlist `vidkar://` para pantallas existentes. La intent simple de identidad no abre deep links ni navega a Expo Router.

Los flujos de búsqueda, apertura y reproducción descritos aquí pertenecían a los intents anteriores y ya no están disponibles desde Siri. Las pantallas internas de MCP/Spotlight conservan sus propios contratos y autorizaciones; la intent actual de identidad no navega ni inicia reproducción.

## Configuración y ejecución

1. Inicia sesión en VIDKAR y deja que la sesión y el perfil terminen de cargar.
2. Usa un development build o distribución iOS nativa; Expo Go no contiene el módulo Swift ni App Intents.
3. Prueba “Dime el usuario de VIDKAR” en Siri/Atajos. No hace falta configurar un token MCP.
4. Cierra sesión y comprueba que Siri deja de devolver el perfil guardado.

No se añadió config plugin: los targets Apple existentes y el módulo Expo local incluyen el código Swift. No se crea un target de extensión adicional. Para compilar y probar App Intents se requiere Xcode y un iPhone real; la compilación de simulator es útil pero no sustituye esa prueba.

## Validación

Desde `react-download/`:

- `npm run mcp:build`
- `npm run mcp:test`

Desde `react-native-VIDKAR/`:

- `npm run test:mcp`
- `npm run lint`
- `xcodebuild -project ios/Pods/Pods.xcodeproj -scheme VidkarMCP -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

El workspace iOS completo incluye `VidkarWatch`; su asset catalog actual falla por no tener contenido aplicable para `AppIcon`. Este bloqueo es independiente del módulo MCP. El lint global puede conservar warnings preexistentes.
