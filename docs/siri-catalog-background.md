# Consulta informativa de catálogo — 26 de septiembre de 2026

## Contrato implementado

`VIDKARQueryCatalogIntent` es una acción personalizada background, no un schema
Apple genérico. `openAppWhenRun=false`, autenticación requerida y parámetro
`query: String` requerido **sin default**. Frase publicada:
**«Consulta el catálogo en VIDKAR»** (`\(.applicationName)` en el provider).
Al resolver la acción, el sistema puede solicitar «Qué quieres consultar».
El texto recibido se busca literalmente; no se extrae un tema de cualquier oración.

La ejecución directa de la acción llama nativamente a `search_entities` con
`entity=all`, `limit=5`, `offset=0`. Valida 1–120 unidades UTF-16 y rechaza controles
antes de recortar espacios. No elige herramientas arbitrarias, no usa un modelo,
no llama a JS, no abre URLs/UI ni inicia reproducción. `tools/list` se usa solo
para validar que la herramienta fija sigue disponible y es de lectura.

La sesión owner/revisión se captura antes de ejecutar y se verifica antes/después
de I/O y antes de entregar resultados. Token/endpoint siguen en la configuración
MCP existente; no se crean tokens ni parámetros de credenciales. El backend sigue
autorizando cada petición. No hay cambios de contratos Meteor ni de backend.

## Datos y respuesta

- Retorna `ReturnsValue<[VIDKARCatalogResultEntity]> & ProvidesDialog`.
- Entidad **transitoria** con `type`, `sourceId`, `title`, `subtitle`, `description`.
  El ID transitorio identifica esta ejecución; `sourceId` conserva el ID backend,
  incluido el prefijo de RECARGA/DT_SHOP/COMERCIO. No hay lookup persistente falso,
  sugerencias, Spotlight, URL de reproducción, campos privados ni persistencia nueva.
- `all` admite películas, cursos, productos y series/capítulos autorizados.
  Una respuesta con usuarios, lecciones, compras, ventas, mensajes, suscripciones
  o tipos desconocidos se rechaza completa; no se leen esos datos en voz.
- Hasta cinco coincidencias deduplicadas. Título/subtítulo/descripción acotados a
  160/120/240 caracteres. No se inventan sinopsis, precios, moneda ni disponibilidad.
- El diálogo usa título, subtítulo y descripción reales: una coincidencia o las
  primeras tres, indicando cuándo hay más en la salida del atajo. Menos de 1200
  caracteres en los casos límite probados, sin leer IDs ni errores crudos.
- Cero resultados es un éxito vacío explícito. Sesión inválida, permisos, red,
  cambio de sesión, respuesta inválida y fallo de servicio son errores localizados,
  no un éxito vacío. La cancelación se propaga.

Las cuatro búsquedas publicadas (movies/series/courses/products) usan diálogos
informativos y `ProvidesDialog` explícito sin cambiar entidades de retorno. Los
siete IDs anteriores, parámetros/defaults, enum de servicio y contratos JSON se
conservan. Sus defaults vacíos no se migran; al ejecutarlos vacíos se pide indicar
una consulta mediante el diálogo de validación.

## Semántica Apple y límites

`VIDKARSearchInAppIntent` conserva `.system.searchInApp`, autenticación local y
`OpenURLIntent`: **es foreground por contrato**. `.system.search` también muestra
resultados dentro de la app; no soluciona una consulta informativa background.
No existe un schema Apple genérico aplicable a esta consulta MCP de catálogo.

Siri decide si escoge una acción personalizada ante una frase arbitraria y cómo
presenta/lee su salida. Publicar parámetros, entidades o un JSON con tools no
registra herramientas en el razonamiento automático de Siri. `ProvidesDialog`
expone el diálogo, no obliga al sistema a leerlo íntegramente en toda modalidad.
`VIDKARAskQuestionIntent` continúa desactivado; evaluación histórica **5/8**, no
reejecutada ni rebajada. No se afirma que todo lenguaje libre esté resuelto.

## Navegación a inicio: pendiente, no corregida por conjetura

El usuario reporta build **1169** instalado en OS **27.2**. Se leyó el
`app/+native-intent.tsx` actual y se conserva sin cambios.

Ruta esperada: `criteria.term` → `MCPInAppSearch.url` →
`vidkar://search?q=…&entity=all` → `redirectSystemPath` →
`/(normal)/SiriSearch?query=…&entityType=all` → `SiriSearchScreen.native.jsx`.

Evidencia local:

- Resolver real y entrada nativa probados con `initial=true/false`, URL nativa,
  HTTPS, path relativo, acentos, `+`, `&`, límites y segunda entrega del destino.
- `index.native.tsx` deja las búsquedas a `+native-intent` para evitar duplicados.
  El layout normal registra `SiriSearch`; `initialRouteName=Main` no demuestra un
  redirect de una ruta válida. `ModeShell.native.js` solo redirige al cerrar sesión.
- Pruebas de pantalla verifican arranque con restauración Meteor, login inline
  y conservación de criterios; no se encontró un guard que demuestre el desvío.
- El AppDelegate generado contiene los callbacks de Linking/Universal Links.
  Su presencia no demuestra que el OS entregara el enlace a JS en ese incidente.

**No hay traza de esa invocación ni reproducción en dispositivo**, por lo que
selección de acción, entrega OS, parsing en runtime y navegación efectiva siguen
pendientes. No se alteró el esquema, login, index ni el AppDelegate generado.
La próxima fase debe correlacionar acción invocada, recepción nativa, entrada al
resolver y pantalla destino usando solo eventos/estados, sin registrar consulta,
token, resultados ni identidad. No atribuir el fallo a JS antes de esa evidencia.

## Plugin, metadata y fase posterior

`with-vidkar-app-intents` 1.2.0 migra el bloque marcado del provider histórico,
sin borrar código anterior/posterior de AppDelegate. Añade marcador final, falla
sin escribir ante formato no reconocido y pasa doble ejecución idempotente.
Conserva regiones, recursos del main bundle y el workaround iOS 16.4:
`AppShortcuts.xcstrings` fuente → `.strings` en/es, sin elevar el mínimo.

Extracción aislada verificada: **9 acciones VIDKAR / 8 shortcuts / 10 frases**.
En una app completa con las tres acciones de widgets anteriores se esperan
**12 acciones totales**; ese nuevo artefacto completo no se ha construido.
El validador admite acciones ajenas y exige la nueva acción, query sin default,
proyección transitoria, schema visual conservado y localizaciones compiladas.

No se ejecutó prebuild, build/archive/install de la app, Codemagic ni acceso al
dispositivo. Los tests Swift compilan ejecutables/módulos aislados en temporales;
no modifican `ios/`, firma, número de build ni el artefacto 1169. En la fase
autorizada siguiente hay que aplicar el plugin incremental y actualizar fuentes
del pod (incluye `MCPCatalogQuery.swift`) antes de construir; no usar clean como
solución. El binario 1169 no adquiere este cambio mediante OTA.

## Pruebas y archivos

- `npm run test:mcp:ios`: 17 pruebas, incluyendo compilación aislada iphoneos y
  simulator, metadata real, traducciones/NLU español y compatibilidad de contratos.
- `npm run test:mcp`: 46 pruebas JS; incluye `mcpSnapshot.test.js` indirectamente.
- `npm run lint`: 0 errores, 85 advertencias en archivos ajenos al cambio.
  Lint estricto dirigido a los siete archivos JS/CJS modificados: 0 advertencias.
  `git diff --check` y diagnósticos del editor: sin errores en los cambios.
- Swift: política con 29 comprobaciones, 32 carreras previas y 9 carreras nuevas
  owner/revisión/logout, `perform()` real de cinco acciones, cancelación, límites,
  read-only, privacidad y errores con I/O ficticio. Sin Keychain/red de producción.
- Siri/Atajos en iPhone, lectura audible y entrega OS fría/caliente: pendientes.
- Android/web: sin nueva capacidad Siri ni imports nativos; fallbacks existentes
  intactos. Sin cambios en TV o HLS.

Archivos principales: `modules/vidkar-mcp/ios/{VidkarMCPModule,MCPCatalogQuery}.swift`,
`plugins/with-vidkar-app-intents.js`, `plugins/resources/vidkar-app-intents/*.xcstrings`,
`scripts/validate-app-intents-metadata.cjs`.
Pruebas: `tests/MCPCatalogIntentTests.swift`, `MCPTransportSessionTests.swift`,
`MCPSpanishLocalizationTests.swift`, `mcpQueryPolicy.test.cjs`,
`mcpAppIntentsCompile.test.cjs`, `mcpAppIntentsMetadata.test.cjs`,
`appIntentsArtifact.test.cjs`, `universalLinks.test.js`.