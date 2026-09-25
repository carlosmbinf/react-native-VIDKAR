# Siri, App Intents y MCP de VIDKAR

## Estado actual de Siri (septiembre de 2026)

La superficie activa ofrece siete App Intents nativos:

- `VIDKARQueryMCPIntent` (“Consulta MCP”) y `VIDKARExecuteMCPIntent` (“Ejecuta MCP”): mantienen la interfaz JSON para descubrir herramientas y ejecutar herramientas de solo lectura, con confirmación nativa cuando corresponde.
- `VIDKARSearchMoviesIntent`, `VIDKARSearchSeriesIntent`, `VIDKARSearchCoursesIntent` y `VIDKARSearchCommerceProductsIntent`: devuelven entidades App Intents tipadas, con título, subtítulo, descripción, enlace VIDKAR e icono de dominio. El servidor vuelve a comprobar visibilidad, suscripción/nivel y alcance antes de entregar cada resultado; los productos se consultan solo en `COMERCIO`.
- `VIDKARGetServiceUsageIntent`: devuelve una entity transitoria de Proxy o VPN después de solicitar confirmación. Solo incluye estado y consumo del titular del token; no ofrece sugerencias ni lookup posterior por ID.
- `VIDKARMCPSiriShortcuts` publica estas acciones en español. Las búsquedas devuelven resultados tipados para las superficies compatibles; Siri/Shortcuts decide cómo presenta cada entity y no se garantiza una tarjeta idéntica en todas las versiones de iOS.

`Consulta MCP` devuelve `{ success, count, tools }`. `Ejecuta MCP` devuelve `{ success, tool, data }` o `{ success: false, tool?, error: { code, message } }`. La respuesta MCP original se conserva dentro de `data` para poder encadenarla o analizarla como JSON en Atajos/otras herramientas. Los errores también mantienen la misma envoltura JSON. Las cuatro acciones de catálogo entregan colecciones de su tipo concreto, no JSON genérico.

Las intents usan el endpoint HTTPS/token ya configurados desde la pantalla MCP. El token permanece en Keychain, ligado al propietario validado por `get_current_user`; nunca se recibe en los parámetros de Siri. El backend vuelve a comprobar autorización y confirmación. Una herramienta que no sea de solo lectura no se ejecuta desde Siri.

Codemagic permanece sin cambios: su workflow iOS elimina `ios/` y ejecuta `expo prebuild`; el módulo local aporta las intents y el plugin Expo registra el paquete en `AppDelegate` de forma reproducible. `AppIntentsPackage` requiere iOS 17; la app conserva su mínimo global 16.4 y las acciones Siri MCP quedan disponibles desde iOS 17, sin targets, entitlements, perfiles ni pasos nuevos.

## MCP móvil (independiente de Siri)

La app conserva el módulo Expo `modules/vidkar-mcp` y el backend MCP para la pantalla de configuración/consultas dentro de VIDKAR. Las dos acciones Siri reutilizan ese transporte y contrato; el MCP sigue validando tokens, permisos y datos en backend.

```text
Pantalla MCP de VIDKAR -> módulo Expo vidkar-mcp -> backend MCP HTTPS
Siri / Apple Intelligence -> Consulta MCP / Ejecuta MCP -> MCPTransport -> backend MCP HTTPS
```

El backend sigue siendo la autoridad para las operaciones MCP. Las intents no dependen del runtime JavaScript activo y no aceptan tokens, IDs de propietario ni credenciales como parámetros.

## Acciones MCP de Siri

`Consulta MCP` puede devolver todas las herramientas actuales o filtrar por `toolName`. El catálogo siempre se obtiene de `tools/list`, no de una lista fija en Swift. Incluye el schema de entrada para que Atajos u otra herramienta pueda seleccionar los argumentos requeridos.

`Ejecuta MCP` descubre de nuevo el catálogo antes de llamar `tools/call`; rechaza herramientas desconocidas/no marcadas `readOnlyHint`, argumentos que no sean un objeto JSON y el uso de `confirmed` como argumento. Si el servidor marca la llamada como sensible, solicita confirmación nativa y solo entonces envía `confirmed: true`. La autorización final, validación completa del schema, rate limit y auditoría permanecen en el backend.

Las intents y entidades de la experiencia Siri anterior quedan detrás de `VIDKAR_LEGACY_INTENTS` como referencia de migración; no se activa ese bloque para publicar las nuevas entidades. La superficie tipada nueva no indexa contenido en Spotlight y devuelve cero sugerencias iniciales. La antigua indexación semántica MCP se eliminó.

## Descubrimiento y seguridad del catálogo

`tools/list` se descubre dinámicamente; no se replica la lista de tools en Swift. El catálogo muestra nombre, descripción, `inputSchema`, anotaciones MCP, permisos, clase de datos, lectura y confirmación.

El servidor marca tools de consulta con `readOnlyHint`, y adjunta `_meta["vidkar/security"]` con permisos/clase/confirmación. Swift y JavaScript solo permiten ejecutar tools marcadas de solo lectura; la validación backend se repite en cada llamada.

La configuración valida HTTPS, host `vidkar.com`/`www.vidkar.com`, ruta `/mcp`, ausencia de credenciales/query/fragment en la URL y el token Bearer en Keychain. Al configurar, el cliente llama `get_current_user` y exige que el ID propietario del token coincida con el `Meteor.userId()` actual antes de conservar la configuración. Cambiar usuario o cerrar sesión elimina las credenciales por los flujos logout existentes. No se registra el token.

Las antiguas intents de playback ya no se compilan ni están disponibles desde Siri. Independientemente de App Intents, el player de películas exige sesión Meteor y `subscipcionPelis === true` antes de preparar HLS.

Todas las tools requieren token Bearer en `/mcp`; también en modo stdio los handlers rechazan llamadas de datos sin identidad. Tools de usuarios, finanzas, órdenes, compras y mensajes requieren confirmación explícita en el cliente y `confirmed: true` en el servidor. Películas, series, cursos, niveles, suscripciones y ownership se autorizan del lado backend. No existen tools MCP de escritura; una llamada no declarada de solo lectura se rechaza con “No tienes permisos para realizar esa acción en VIDKAR.”

## `search_entities`

Herramienta creada porque no existía búsqueda MCP general. Trabaja en backend con allowlist de tipos/colecciones/proyecciones; los identificadores Mongo, campos y selectores no se aceptan desde el cliente.

Tipos disponibles: `all`, `movie`, `series`, `episode`, `course`, `lesson`, `user`, `purchase`, `sale`, `order`, `product`, `message` y `subscription`.

Admite query de hasta 120 caracteres, categoría/estado, período natural o `from`/`to` en ISO, orden, `limit` máximo 50 y `offset` máximo 10 000 (global `all` hasta 200). Responde entidades resumidas con paginación y deep link; no devuelve documentos Mongo completos ni URLs de stream/video. Las imágenes requieren HTTPS y un host allowlisted de VIDKAR o de proveedores de avatar conocidos.

Las búsquedas Siri tipadas resuelven el ID persistente consultando de nuevo al backend. Para `product`, una búsqueda exacta por ID solo se acepta con `category=COMERCIO` y selecciona exclusivamente `COMERCIO_productos`; el ID Mongo de entrada se mantiene separado del ID de entity compuesto que incluye su fuente.

Los resultados de tipo `user` incluyen foto, rol y `serviceUsage` separado para Proxy/VPN: estado activo, bytes consumidos, límite en MB, condición ilimitada y vencimiento; VPN también indica conexión. La tarjeta muestra estos datos y al tocar cualquier parte abre `/(normal)/User` mediante el deep link validado. El resumen no expone email, contraseña VPN, IP ni credenciales.

- Las búsquedas de películas requieren que sean visibles.
- Series/capítulos requieren usuario autenticado con `subscipcionPelis === true` y contenido visible.
- Cursos publicados aplican el nivel de evaluación del usuario; las búsquedas de lecciones requieren confirmación, suscripción activa, curso publicado y nivel autorizado.
- Usuarios respetan el alcance del token (self / subordinados autorizados / admin principal) y requieren confirmación.
- Compras/ventas/órdenes se restringen al alcance MCP; mensajes se filtran siempre a `from == userId || to == userId` y requieren confirmación.
- `subscription` consulta la suscripción de películas del usuario actual y sus suscripciones propias de cursos; requiere confirmación y nunca admite un `userId` arbitrario.
- Productos se limitan a catálogos existentes y proyección permitida. El precio solo se presenta si el documento realmente tiene precio, sin inferir moneda.
- No hay búsqueda de proveedores, TV, audio, descargas o precios oficiales: no se inventaron rutas ni permisos para ellos.

## Deep links y navegación (pantallas MCP/Spotlight existentes)

`services/navigation/universalLinks.ts` conserva Universal Links HTTPS y el allowlist `vidkar://` para pantallas existentes. Las acciones Siri no inician reproducción, compra ni navegación automática. Las entities de catálogo incluyen un deep link validado como propiedad para que otro flujo explícito pueda abrir el contenido.

Las entidades de usuario, compra, ventas, mensajes y lecciones siguen sin exponerse como resultados Siri generales. Proxy/VPN no se indexa ni se sugiere: se obtiene solo con la intent confirmada y su entity transitoria contiene estado, bytes usados, límite, condición ilimitada y vencimiento; nunca servidor, IP, contraseña ni token.

## Configuración y ejecución

1. Inicia sesión y configura el token MCP desde la pantalla de configuración MCP de VIDKAR.
2. Usa un development build o distribución iOS nativa; Expo Go no contiene el módulo Swift ni App Intents.
3. En Siri/Atajos prueba “Busca la película … en VIDKAR”, “Busca la serie …”, “Busca el curso …” o “Busca el producto …”; cada acción devuelve resultados tipados del catálogo.
4. Para estado de cuenta, usa “Consulta mi Proxy/VPN en VIDKAR” y confirma la consulta. Prueba también “Consulta MCP”/“Ejecuta MCP” si necesitas inspeccionar o encadenar el JSON de herramientas.

El config plugin `plugins/with-vidkar-app-intents.js` registra el paquete del pod MCP en el `AppDelegate` generado; no se crea un target de extensión adicional. Para compilar y probar App Intents se requiere Xcode y un iPhone real; la compilación de simulator es útil pero no sustituye esa prueba.

## Validación

Desde `react-download/`:

- `npm run mcp:build`
- `npm run mcp:test`

Desde `react-native-VIDKAR/`:

- `npm run test:mcp`
- `npm run lint`
- `xcodebuild -project ios/Pods/Pods.xcodeproj -scheme VidkarMCP -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

El workspace iOS completo incluye `VidkarWatch`; su asset catalog actual falla por no tener contenido aplicable para `AppIcon`. Este bloqueo es independiente del módulo MCP. El lint global puede conservar warnings preexistentes.
