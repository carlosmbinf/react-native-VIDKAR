# Siri, App Intents y MCP de VIDKAR

> Búsqueda nativa estable iOS 27: [siri-ai-integration.md](./siri-ai-integration.md). `VIDKARSearchInAppIntent` usa los criterios del sistema sin FoundationModels. Solo `VIDKARAskQuestionIntent` permanece detrás de `VIDKAR_EXPERIMENTAL_NATURAL_LANGUAGE`; el planner sigue fallando 3/8 casos y no se habilita.

## Estado actual de Siri (septiembre de 2026)

La superficie activa ofrece nueve App Intents nativos (siete contratos anteriores conservados):

- `VIDKARQueryCatalogIntent`: consulta informativa background con `query` requerido, cinco resultados transitorios como máximo y diálogo con datos reales. Frase «Consulta el catálogo en VIDKAR». No abre la app, no usa modelos ni consulta datos privados. Véase [contrato, pruebas y límites](./siri-catalog-background.md).

- `VIDKARQueryMCPIntent` (“Consulta MCP”) y `VIDKARExecuteMCPIntent` (“Ejecuta MCP”): mantienen la interfaz JSON para descubrir herramientas y ejecutar herramientas de solo lectura, con confirmación nativa cuando corresponde.
- `VIDKARSearchMoviesIntent`, `VIDKARSearchSeriesIntent`, `VIDKARSearchCoursesIntent` y `VIDKARSearchCommerceProductsIntent`: devuelven entidades App Intents tipadas, con título, subtítulo, descripción, enlace VIDKAR e icono de dominio. El servidor vuelve a comprobar visibilidad, suscripción/nivel y alcance antes de entregar cada resultado; los productos se consultan solo en `COMERCIO`.
- `VIDKARGetServiceUsageIntent`: devuelve una entity transitoria de Proxy o VPN después de solicitar confirmación. Solo incluye estado y consumo del titular del token; no ofrece sugerencias ni lookup posterior por ID.
- `VIDKARSearchInAppIntent` (iOS 27): schema `.system.searchInApp`; abre `SiriSearch` con `criteria.term`, sin ejecutar red/inferencia ni reproducir. Requiere desbloqueo local. Declara scopes Apple `.general`, `.movies`, `.tv`; las categorías de la app se eligen en pantalla, no son parámetros ni scopes inventados de Siri.
- `VidkarAppShortcutsProvider`, generado por el plugin en `AppDelegate.swift`, publica estas acciones en español. Las búsquedas devuelven resultados tipados para las superficies compatibles; Siri/Shortcuts decide cómo presenta cada entity y no se garantiza una tarjeta idéntica en todas las versiones de iOS.

`Consulta MCP` devuelve `{ success, count, tools }`. `Ejecuta MCP` devuelve `{ success, tool, data }` o `{ success: false, tool?, error: { code, message } }`. La respuesta MCP original se conserva dentro de `data` para poder encadenarla o analizarla como JSON en Atajos/otras herramientas. Los errores también mantienen la misma envoltura JSON. Las cuatro acciones de catálogo entregan colecciones de su tipo concreto, no JSON genérico.

Las intents usan el endpoint HTTPS/token ya configurados desde la pantalla MCP. El token permanece en Keychain, ligado al propietario validado por `get_current_user`; nunca se recibe en los parámetros de Siri. El backend vuelve a comprobar autorización y confirmación. Una herramienta que no sea de solo lectura no se ejecuta desde Siri.

El módulo local aporta las intents y el plugin Expo registra el paquete en `AppDelegate` de forma reproducible. Ambos workflows iOS verifican los metadatos del `.app` archivado y de la IPA exportada antes de publicar. `AppIntentsPackage` requiere iOS 17; se conserva el mínimo global 16.4, ocho shortcuts desde iOS 17 y el schema desde iOS 27, sin targets, entitlements ni perfiles nuevos. El plugin migra idempotentemente el bloque propio del provider histórico sin clean ni borrar código ajeno. La acción visual se descubre por el schema; la consulta informativa tiene el nuevo shortcut. En esta fase no se ejecutó prebuild ni build de la app.

Si no aparece ninguna acción en Atajos, consulta el [diagnóstico de descubrimiento y verificación del binario](./app-intents-discovery-diagnostics.md). La ausencia total de acciones no equivale a la búsqueda integrada experimental desactivada.

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

`entity=course` admite listado sin query ni ID y conserva publicación, nivel y permisos. `all`, `movie` y `user` siguen requiriendo texto o los identificadores admitidos por su contrato.

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

`services/navigation/universalLinks.ts` conserva Universal Links HTTPS y el allowlist `vidkar://`. `app/+native-intent.tsx` entrega búsquedas en frío/caliente directamente a `SiriSearch`, también cuando la pantalla inicial no está montada. La octava acción sí navega a resultados; no reproduce ni compra. La pantalla permite editar el término, elegir categoría, listar cursos sin texto y seleccionar una coincidencia. “Abrir” no reproduce; “Reproducir…” es otra acción con confirmación y autorización vigente.

Sin sesión, el login existente se presenta dentro de esa ruta y conserva los criterios. MCP debe estar configurado explícitamente; se ofrece acceso a su pantalla y reintento. Usuarios requieren confirmación nueva al cambiar consulta/cuenta/foco; ni `confirmed`, ni herramientas, tokens o playback pueden entrar por el enlace de búsqueda. El bridge `executeToolForOwner` ata cada consulta de la app al owner y revisión nativa; los binarios antiguos sin ese guard rechazan nuevas búsquedas hasta actualizarse. No se crean tokens automáticamente.

Las entidades de usuario, compra, ventas, mensajes y lecciones siguen sin exponerse como resultados Siri generales. Proxy/VPN no se indexa ni se sugiere: se obtiene solo con la intent confirmada y su entity transitoria contiene estado, bytes usados, límite, condición ilimitada y vencimiento; nunca servidor, IP, contraseña ni token.

## Configuración y ejecución

1. Inicia sesión y configura el token MCP desde la pantalla de configuración MCP de VIDKAR.
2. Usa un development build o distribución iOS nativa; Expo Go no contiene el módulo Swift ni App Intents.
3. Para información sin abrir la app, selecciona **Consulta el catálogo** e indica el título/tema, o prueba «Consulta el catálogo en VIDKAR» y responde al parámetro solicitado. Las cuatro acciones de búsqueda anteriores conservan tipos y ahora ofrecen diálogos informativos. Siri decide la selección ante frases libres; no se promete extraer automáticamente el tema de cualquier oración.
4. Para estado de cuenta, usa “Consulta mi Proxy/VPN en VIDKAR” y confirma la consulta. Prueba también “Consulta MCP”/“Ejecuta MCP” si necesitas inspeccionar o encadenar el JSON de herramientas.

El config plugin `plugins/with-vidkar-app-intents.js` registra el paquete del pod MCP en el `AppDelegate` generado; no se crea un target de extensión adicional. Para compilar y probar App Intents se requiere Xcode y un iPhone real; la compilación de simulator es útil pero no sustituye esa prueba.

## Validación

Desde `react-download/`:

- `npm run mcp:build`
- `npm run mcp:test`

Desde `react-native-VIDKAR/`:

- `npm run test:mcp`
- `npm run test:mcp:ios` (incluye extracción real de metadatos con Xcode)
- `npm run lint`
- `xcodebuild -project ios/Pods/Pods.xcodeproj -scheme VidkarMCP -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

El workspace iOS completo incluye `VidkarWatch`; su asset catalog actual falla por no tener contenido aplicable para `AppIcon`. Este bloqueo es independiente del módulo MCP. El lint global puede conservar warnings preexistentes.
