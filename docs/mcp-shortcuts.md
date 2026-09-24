# Siri, App Intents y MCP de VIDKAR

## Estado y arquitectura

La integración usa App Intents (iOS 16.4+), el módulo Expo nativo `modules/vidkar-mcp` y el backend MCP existente. No usa SiriKit legacy, no duplica lógica de negocio Swift y no crea una extensión App Intents separada: las intents viven en el target principal de VIDKAR.

```text
Siri / Apple Intelligence / Atajos
  -> VIDKAR App Intents + AppShortcuts + AppEntity
  -> vidkar-mcp (HTTPS, token Keychain ligado al userId Meteor)
  -> POST https://www.vidkar.com/mcp
  -> tools/list / tools/call
  -> allowlist y autorización MCP backend
  -> resultado resumido + deep link vidkar:// validado
  -> Expo Router, después de restaurar sesión autenticada
```

El backend sigue siendo la autoridad. El catálogo MCP no constituye permisos y el cliente no acepta nombres de colección, selector Mongo ni campos arbitrarios.

## Intents y entidades

El módulo publica estos intents:

- `VIDKARGeneralQueryIntent`: consulta natural avanzada, herramienta opcional, `argumentsJSON`, tipo/id, acción y confirmación adicional.
- `VIDKARSearchContentIntent`: única intent pública de búsqueda; consulta texto, entidad y filtros, y devuelve resultados estructurados para Siri sin abrir la app.
- `VIDKAROpenEntityIntent`: abre un `AppEntity` en VIDKAR.
- `VIDKARPlayContentIntent`: solo película, capítulo o lección; siempre solicita confirmación antes de añadir `play=true`.
- `VIDKARListUserDataIntent`: única intent pública para datos privados; recibe el tipo de datos (compras, ventas, órdenes, usuarios, mensajes o suscripción) y solicita confirmación antes de consultar.
- `VIDKARExecuteActionIntent`: llamadas MCP de solo lectura; rechaza herramientas sin `readOnlyHint`.
- `VIDKARToolCatalogIntent`: devuelve el catálogo JSON como valor de Atajos y un diálogo de voz breve.

`AppEntity` usa un ID estable `tipo:id`, título, subtítulo, descripción, tipo, enlace seguro e imagen opcional. Se definen `MovieEntity`, `SeriesEntity`, `EpisodeEntity`, `CourseEntity`, `LessonEntity`, `UserEntity`, `PurchaseEntity`, `SaleEntity`, `ProductEntity`, `MessageEntity` y `DownloadEntity`. Las entidades privadas no se ofrecen como sugerencias silenciosas a EntityQuery; se buscan por una intent que confirma primero. `DownloadEntity` está definido, pero sus búsquedas quedan deshabilitadas hasta que exista una herramienta backend segura.

Las frases preconfiguradas usan `\(.applicationName)` para adaptarse al nombre instalado e incluyen:

- “Buscar en VIDKAR” y “Consultar VIDKAR”.
- “Buscar una película/serie/curso/usuario en VIDKAR” se resuelve mediante `VIDKARSearchContentIntent` con el filtro correspondiente; no existen intents duplicadas por tipo.
- “Consultar mis compras/ventas en VIDKAR”.
- “Consultar el estado de mi suscripción en VIDKAR”.
- “Abrir contenido en VIDKAR” y “Reproducir contenido en VIDKAR”.

Las frases específicas de compras, ventas y suscripción también reutilizan
`VIDKARListUserDataIntent` con el tipo preconfigurado en cada `AppShortcut`.
Se eliminaron las intents especializadas equivalentes para que Siri y Atajos
no ofrezcan varias acciones con el mismo contrato.

Siri presenta diálogos concisos; las búsquedas/listados devuelven resultados `AppEntity` y los datos estructurados se conservan como valor para Shortcuts.
Apple limita `AppShortcutsProvider` a diez shortcuts preconfigurados; el catálogo y la intent genérica avanzada siguen disponibles como acciones VIDKAR dentro de la app Atajos, sin consumir otro shortcut de voz.

## Descubrimiento y seguridad del catálogo

`tools/list` se descubre dinámicamente; no se replica la lista de tools en Swift. El catálogo muestra nombre, descripción, `inputSchema`, anotaciones MCP, permisos, clase de datos, lectura y confirmación.

El servidor marca tools de consulta con `readOnlyHint`, y adjunta `_meta["vidkar/security"]` con permisos/clase/confirmación. Swift y JavaScript solo permiten ejecutar tools marcadas de solo lectura; la validación backend se repite en cada llamada.

La configuración valida HTTPS, host `vidkar.com`/`www.vidkar.com`, ruta `/mcp`, ausencia de credenciales/query/fragment en la URL y el token Bearer en Keychain. Al configurar, el cliente llama `get_current_user` y exige que el ID propietario del token coincida con el `Meteor.userId()` actual antes de conservar la configuración. Cambiar usuario o cerrar sesión elimina las credenciales por los flujos logout existentes. No se registra el token.

Las intents que confirman playback revalidan el ID en `search_entities` con los guards del backend, y luego emiten un grant nativo de un solo uso, ligado a tipo/ID/owner y con vencimiento corto en Keychain. React Native lo consume al aceptar el deep link; un enlace `play=true` sin grant válido se degrada a abrir/consultar y no inicia streaming. El player de películas también exige sesión Meteor y `subscipcionPelis === true` antes de preparar HLS.

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

## Deep links y navegación

`services/navigation/universalLinks.ts` conserva Universal Links HTTPS y añade un allowlist para `vidkar://`. `app/index.native.tsx` registra la URL inicial y eventos de enlace, espera sesión y navegación autenticada; Spotlight comparte el resolver. Los destinos incluyen búsqueda, película, detalle de serie, capítulo, curso/lección, usuario, compra/venta/orden y mensajes.

Abrir un resultado no inicia streaming. Solo los intents/acciones que recibieron confirmación agregan `play=true`; la reproducción de cursos llega a `CursoDetalle` y usa `cursos.media.solicitarReproduccion`, que vuelve a autorizar el acceso en Meteor. Las rutas de descargas y ciertos detalles (orden/venta) aún muestran la pantalla de dominio existente sin detalle por ID, dado que no existe una pantalla profunda dedicada.

## Configuración y ejecución

1. Inicia sesión en VIDKAR.
2. Crea un token MCP personal en el perfil web, o configúralo en `/(normal)/MCPSettings`.
3. Usa un development build o distribución iOS nativa. Expo Go no contiene el módulo MCP ni App Intents.
4. En Atajos o Siri, usa las frases VIDKAR; para reproducción/consultas privadas confirma la solicitud.

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
