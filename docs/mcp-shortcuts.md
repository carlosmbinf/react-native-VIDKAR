# Siri, App Intents y MCP de VIDKAR

## Estado y arquitectura

La integración usa App Intents (iOS 16.4+), el módulo Expo nativo `modules/vidkar-mcp` y el backend MCP existente. No usa SiriKit legacy ni una extensión App Intents separada. Expo registra el paquete del framework mediante `with-vidkar-app-intents.js`.

```text
Siri / Apple Intelligence / Atajos
  -> VIDKARSearchContentIntent / VIDKARAccountQueryIntent
  -> ReturnsValue<AppEntity[]> + ProvidesDialog
  -> vidkar-mcp (HTTPS, token Keychain ligado al userId Meteor)
  -> POST https://www.vidkar.com/mcp
  -> tools/list / tools/call
  -> allowlist y autorización MCP backend
  -> resultados tipados de entidad, sin abrir la app ni navegar

OpenEntity y PlayContent son flujos independientes: solo ellos usan deeplinks y Expo Router ante una petición explícita de abrir o reproducir.
```

El backend sigue siendo la autoridad. El catálogo MCP no constituye permisos y el cliente no acepta nombres de colección, selector Mongo ni campos arbitrarios.

## Intents y entidades

El paquete publica cuatro intents:

- `VIDKARSearchContentIntent`: busca contenido público con `query`, `entityType`, período, orden y categoría tipados; devuelve `VIDKARSearchResultEntity` sin navegar.
- `VIDKARAccountQueryIntent`: consulta compras, ventas, órdenes, mensajes, suscripciones o perfil, exige autenticación y confirmación, y devuelve la misma entidad genérica.
- `VIDKAROpenEntityIntent`: abre el contenido indicado explícitamente.
- `VIDKARPlayContentIntent`: solo película, capítulo o lección; confirma y revalida autorización MCP antes del playback.

En iOS 27+ `VIDKARAssistantOpenEntityIntent` adopta `.system.open` y `isAssistantOnly`; es un adaptador del schema para Apple Intelligence, no otro shortcut público. El intent normal de apertura conserva compatibilidad con iOS 16.4+.

`VIDKARSearchResultEntity` es la única AppEntity de resultado. Tiene ID estable `tipo:id`, título, subtítulo, descripción y representación visible. El deeplink se conserva como dato interno para OpenEntity/PlayContent, no como propiedad que instruya a Siri a navegar. Su `EntityStringQuery` resuelve resultados públicos; los identificadores privados no se sugieren ni se resuelven por búsqueda global.

`VIDKARAppShortcuts` publica solo esos cuatro accesos. Las frases ayudan a Atajos a rellenar parámetros; no son un sustituto de App Schemas ni garantizan selección de un intent ante cualquier formulación de Apple Intelligence.

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

## App Schemas, Spotlight y navegación

No se usa `system.searchInApp`: Apple define ese schema como una acción que muestra resultados dentro de la app y requiere foreground. Tampoco hay un schema general de Apple para consultas MCP, cursos o datos privados; por eso las dos consultas son App Intents normales con parámetros tipados, `ReturnsValue`, diálogo y `AppEntity`.

`.system.open` sí corresponde a la acción explícita de abrir una entidad, pero requiere iOS 27. Se aplica en el adaptador `isAssistantOnly`; el intent clásico de apertura sigue disponible desde iOS 16.4. No se aplican los schemas de `Photos` o `Audio`: el catálogo VIDKAR no es la biblioteca de fotos del usuario ni un servicio de música/audio.

`VIDKARSearchResultEntity` se puede indexar en Spotlight desde iOS 18; la indexación filtra a película, serie, capítulo, curso y producto, excluyendo datos privados. No reemplaza las llamadas de búsqueda ni hace que una consulta abra la app.

`services/navigation/universalLinks.ts` conserva Universal Links HTTPS y un allowlist `vidkar://` para destinos concretos. `vidkar://search` y la ruta `/(normal)/SiriSearch` no existen. `app/index.native.tsx` espera sesión autenticada antes de abrir un deeplink explícito de contenido.

Abrir un resultado no inicia streaming. Solo los intents/acciones que recibieron confirmación agregan `play=true`; la reproducción de cursos llega a `CursoDetalle` y usa `cursos.media.solicitarReproduccion`, que vuelve a autorizar el acceso en Meteor. Las rutas de descargas y ciertos detalles (orden/venta) aún muestran la pantalla de dominio existente sin detalle por ID, dado que no existe una pantalla profunda dedicada.

## Configuración y ejecución

1. Inicia sesión en VIDKAR.
2. Crea un token MCP personal en el perfil web, o configúralo en `/(normal)/MCPSettings`.
3. Usa un development build o distribución iOS nativa. Expo Go no contiene el módulo MCP ni App Intents.
4. En Atajos/Siri, ejecuta “Buscar contenido” o “Consultar datos de mi cuenta”; para información privada confirma la solicitud. “Abrir” y “Reproducir” son acciones separadas y explícitas.

`with-vidkar-app-intents.js` genera el paquete host `VidkarAppIntentsPackage` durante `expo prebuild`; no se edita manualmente `ios/` ni se crea una extensión adicional. Para probar el schema `.system.open` se requiere iOS 27+; los cuatro intents públicos principales siguen disponibles desde iOS 16.4. La ejecución conversacional de Apple Intelligence debe validarse en hardware/idioma admitidos; una compilación de simulador no la sustituye.

## Validación

Desde `react-download/`:

- `npm run mcp:build`
- `npm run mcp:test`

Desde `react-native-VIDKAR/`:

- `npm run test:mcp`
- `npm run lint`
- `xcodebuild -project ios/Pods/Pods.xcodeproj -scheme VidkarMCP -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

El workspace iOS completo incluye `VidkarWatch`; su asset catalog actual falla por no tener contenido aplicable para `AppIcon`. Este bloqueo es independiente del módulo MCP. El lint global puede conservar warnings preexistentes.
