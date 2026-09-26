# Siri AI: búsqueda nativa estable y MCP experimental

> Actualización 26/09: [consulta informativa background](./siri-catalog-background.md)
> implementada separadamente del schema visual. Superficie actual: **9 acciones
> VIDKAR, 8 shortcuts, 10 frases**; `AskQuestion` sigue desactivado. El reporte
> «abre inicio» de build 1169/OS 27.2 no tiene causa demostrada ni traza de entrega
> OS; el resolver actual pasa pruebas, pero el recorrido en dispositivo sigue pendiente.

## Estado implementado — 25 de septiembre de 2026

`VIDKARSearchInAppIntent` es estable y aditiva a los siete intents existentes.
Adopta `.system.searchInApp` (iOS 27), recibe `criteria.term` del sistema y abre
la pantalla existente `SiriSearch`. No llama a FoundationModels, no selecciona
tools mediante IA y no consulta MCP desde `perform()`.

Solo `VIDKARAskQuestionIntent` sigue detrás de `VIDKAR_EXPERIMENTAL_NATURAL_LANGUAGE`.
El planner conserva su evaluación **5/8**; no se activa ni se rebajan sus pruebas.
No se cambian Codemagic, backend, firma, capacidades SiriKit ni dependencias.

### Contrato verificado contra Apple y Xcode 27.0 (27A5237l)

- `ShowInAppSearchResultsIntent`, `StringSearchCriteria` y `StringSearchScope` existen desde **iOS 17.2**; el schema nuevo requiere **iOS 27**, no 17.2.
- `StringSearchCriteria` solo contiene `term`. `searchScopes` es una propiedad **estática** de capacidades; no hay scope por invocación que permita saber que Siri eligió cursos/usuarios.
- Scopes oficiales declarados: `.general`, `.movies`, `.tv`. `.freeformVideo` existe, pero no describe este catálogo. No existen `.courses`, `.products` o `.users`.
- El extractor exige `.requiresLocalDeviceAuthentication`: desbloqueo del dispositivo, adicional al login y autorización MCP. La simple compilación no comprobaba este requisito.
- Se conserva deployment target **16.4**; los siete shortcuts anteriores siguen desde **17** por el paquete. En iOS anteriores a 27 no se anuncia el schema; se usa la app/acciones existentes. No se añade otro intent duplicado para 17.2.
- Tras la ampliación informativa, la metadata dirigida tiene **9 acciones y 8 shortcuts** (sin contar widgets). El provider migra su bloque propio idempotentemente, conservando los siete shortcuts previos.

### Experiencia y límites deliberados

1. Siri puede entregar `Terminator`: se busca literalmente en el catálogo autorizado y se muestran coincidencias, sin elegir ni reproducir la primera.
2. Para «búscame los cursos», el sistema puede entregar `cursos` u otro texto. No se finge que es una categoría: la pantalla ofrece **Ver todos los cursos** (query vacía) y categoría **Cursos** para conservar un tema como `fotografía`.
3. Para usuarios, la persona elige **Usuarios**, revisa/corrige el nombre y confirma. `all` nunca consulta usuarios. Login, token del owner y alcance backend siguen siendo obligatorios; no hay sugerencias ni indexación nueva de usuarios.
4. Otros tools MCP se consultan mediante **Configurar o consultar MCP** y los dos intents JSON existentes. No hay interpretación arbitraria automática de todos los tools.
5. `app/+native-intent.tsx` mapea búsquedas en frío/caliente sin depender de `index.native`; el login inline conserva la ruta. Las URLs de búsqueda solo admiten texto acotado y tipo permitido (o el contrato histórico `resultId`), nunca consentimiento, token, tool ni reproducción.
6. “Abrir” muestra el destino existente y “Reproducir…” es una acción separada, confirmada y autorizada. Para películas/productos el destino de detalle disponible es la búsqueda filtrada existente, no se inventa una pantalla.

El término se transporta por el deep link interno, sin resultados, credenciales ni owner;
no se añade almacenamiento de consultas. La app invalida resultados tardíos al cambiar
sesión, criterios o foco. El bridge nuevo liga la ejecución MCP a owner/revisión y falla
cerrado en binarios antiguos para `search_entities` hasta actualizar el binario.

La búsqueda espera conexión y restauración de la sesión Meteor también en arranque
frío, sin depender de que se monte la pantalla de inicio. Una película seleccionada
se resuelve por `id`, no filtrando la primera página de coincidencias por título.
Las confirmaciones de UI y de los intents nativos quedan ligadas a owner/revisión
antes del diálogo; cambios de cuenta o configuración invalidan consultas y respuestas.

### Localización española reproducible

El plugin incorpora `AppShortcuts.xcstrings` y `Localizable.xcstrings` versionados
en `plugins/resources/vidkar-app-intents/` al target principal. Conserva las frases
publicadas y sus placeholders, añade `es` a regiones conocidas y mantiene `en/Base`
y el idioma de desarrollo. Los recursos nativos se resuelven en el bundle principal.

La prueba compila catálogos con Xcode y verifica las diez frases, títulos,
parámetros, summaries y diálogos; Foundation resuelve textos en español sin fallback.
El entrenamiento local genera `es.lproj/nlu.appintents`. El validador de IPA exige
`AppShortcuts.strings` y `Localizable.strings` compilados; no exige el `.xcstrings`
fuente ni un formato privado fijo para NLU.

No se añade `.system.open`: requeriría un contrato de entidad/apertura independiente,
resolución vigente y validación de todas sus rutas; no es necesario para mostrar resultados.

## Qué documenta Apple

- [Apple Intelligence and Siri AI](https://developer.apple.com/documentation/appintents/apple-intelligence-and-siri-ai): schemas para acciones/contenido, entidades, Spotlight semántico, contexto de pantalla y donaciones.
- [Dominios de schemas](https://developer.apple.com/documentation/appintents/app-schema-domains): distinguir dominios para Siri AI de los que solo funcionan en Atajos. No inventar schemas de películas, cursos, usuarios o MCP.
- [System and in-app search](https://developer.apple.com/documentation/appintents/app-schema-domain-system-and-in-app-search): búsqueda general aplicable a diferentes tipos de apps.
- [`.system.searchInApp`](https://developer.apple.com/documentation/appintents/appschema/systemintent/searchinapp): schema iOS 27; sustituye `.system.search`, deprecado en iOS 27. Recibe `StringSearchCriteria` y su objetivo es navegar a resultados en la app, no ser un agente MCP headless.
- [ShowInAppSearchResultsIntent](https://developer.apple.com/documentation/appintents/showinappsearchresultsintent): ejecución en la app, foreground.
- [StringSearchCriteria](https://developer.apple.com/documentation/appintents/stringsearchcriteria) y [StringSearchScope](https://developer.apple.com/documentation/appintents/stringsearchscope): término del sistema y capacidades estáticas.
- [Autenticación local](https://developer.apple.com/documentation/appintents/intentauthenticationpolicy/requireslocaldeviceauthentication): desbloqueo local, no sustituto de sesión VIDKAR.
- [Schema open](https://developer.apple.com/documentation/appintents/appschema/systemintent/open): evaluado, no adoptado en este alcance.
- [Contexto en pantalla](https://developer.apple.com/documentation/appintents/providing-contextual-cues-to-apple-intelligence-and-siri): asociar entidades realmente visibles; React Native no entrega ese contexto automáticamente.
- [Entidades en Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight): `IndexedEntity`, índice con nombre, reindexación y apertura. No indexar todos los datos privados por conveniencia.

El sistema puede interpretar variaciones de lenguaje para los contratos que reconoce.
No se encontró en estas APIs una operación para registrar `tools/list` como herramientas dinámicas del razonamiento interno de Siri.
Devolver un JSON con herramientas desde una intent tampoco garantiza que Siri elija otra intent y construya sus argumentos.
Los tipos de intent/schema se compilan; las instancias de contenido y las consultas pueden ser dinámicas.

## Arquitectura estable

Siri → schema → término literal → Expo Router → sesión y categorías explícitas → `search_entities` vía router MCP → autorización backend → resultados seleccionables.

Dos responsabilidades distintas:

1. Siri selecciona la capacidad de búsqueda de VIDKAR y proporciona los criterios. No es necesario que la frase diga «película».
2. Para traducir preguntas arbitrarias a distintas herramientas MCP hace falta un intérprete adicional o contratos nativos específicos que Siri pueda entender. Ese intérprete no hereda automáticamente la conversación de Siri.

El prototipo usa [Foundation Models](https://developer.apple.com/documentation/foundationmodels) local, sin proveedor externo ni claves nuevas. No es el modelo/razonamiento interno de Siri.
La [generación guiada dinámica](https://developer.apple.com/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation) restringe nombres/tipos, pero no garantiza que los valores correspondan a lo pedido.
Apple también documenta [tool calling](https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling); no debe confundirse con publicar herramientas al sistema Siri.

## Piezas del prototipo restante (no habilitado)

- `MCPNaturalLanguagePlanner.swift`: descubre el catálogo actual, selecciona herramienta/campos y genera argumentos con schemas Apple construidos en runtime; sin tabla fija de herramientas.
- `MCPQueryPolicy.swift`: validación de tipos/enums/límites y rechazo de schemas no soportados, eliminación de `confirmed` generado, marcador de propietario resuelto por código, resultados temporales acotados.
- `VIDKARSearchInAppIntent` ya NO forma parte del prototipo: su ruta estable está descrita arriba.
- `VIDKARAskQuestionIntent`: texto libre para Atajos desde iOS 26, con JSON y diálogo. No garantiza invocación libre por Siri.
- `MCPTransport`: revision de sesión comprobada antes/después de las llamadas; rechazo si cambia la cuenta o configuración; confirmación nativa para datos privados.
- Resultados en memoria durante 120 segundos, máximo tres, ligados al propietario y revisión; sin contenido sensible en deep links ni persistencia en disco. Si cambia el proceso, el resultado deja de estar disponible.
- `vidkar://search?resultId=<UUID>` abre la pantalla existente y lee el resultado, sin volver a ejecutar la consulta ni renovar el vencimiento.
- Antecedente del prototipo: se amplió el listado de `course` sin texto y se aclararon metadatos de consentimiento/Proxy/VPN. Esta implementación estable consume ese contrato ya existente; no modifica el backend.

No se implementó indexación masiva, historial conversacional, contexto visual ni un modelo externo. No se añadieron compras ni mutaciones.
La salida verbal de herramientas no tabulares sigue siendo una confirmación breve con resultado estructurado, no un resumen financiero inventado.

## Validación de la implementación estable

- `npm run test:mcp`: pantalla real con hooks/bridge aislados; términos literales, categorías, listado de cursos, consentimiento/cancelación, login, errores, selección sin autoplay, respuestas tardías y regresiones de snapshots. Router en frío/caliente y rechazo de enlaces inválidos. Sin red real.
- `npm run test:mcp:ios`: compilación optimizada para iPhone y simulador con mínimo 16.4, prueba standalone Swift del enlace y extracción real pod/app. Valida schema, availability 27, criterios del sistema, scopes oficiales y autenticación local. El intent experimental restante debe estar ausente de metadata.
- `npm run lint`: sin errores; advertencias preexistentes fuera del alcance.
- `npx tsc --noEmit`: queda bloqueado por el símbolo SF ajeno en `widgets/ProxyVpnUsageWidget.tsx:191`; los archivos de esta integración no presentan errores de tipos.
- No se construyó una nueva archive/IPA ni se ejecutó Codemagic. Se inspeccionaron dos IPA anteriores: build 1143 sin acciones VIDKAR y build 1168 con siete, sin el nuevo schema ni localización española explícita. Véase [evidencia de los artefactos](./app-intents-discovery-diagnostics.md). Ninguna incluye estos cambios nuevos.
- Pendiente en iPhone: registro en Atajos, selección real por Siri, idioma/región/disponibilidad Apple Intelligence, bloqueo/desbloqueo, inicio frío/caliente, login, configuración MCP y revocación de permisos. Compilar/extraer no garantiza que Siri resuelva una frase concreta.
- Android no adquiere Siri; conserva el fallback del módulo ausente. Web mantiene `SiriSearchScreen.web.jsx` sin imports nativos.

Resultado histórico de la búsqueda visual: **46 pruebas JS y 14 nativas aprobadas**, además de las
comprobaciones internas Swift de política y 32 carreras de sesión nativas. Lint global: 0 errores y 85
advertencias ajenas; lint dirigido de los archivos afectados: limpio.

### Archivos de esta implementación

Rutas relativas a `react-native-VIDKAR/`:

| Área | Archivos |
| --- | --- |
| Swift y bridge | `modules/vidkar-mcp/ios/VidkarMCPModule.swift`, `modules/vidkar-mcp/ios/MCPInAppSearch.swift` (nuevo), `modules/vidkar-mcp/src/index.ts` |
| Cliente y política | `services/mcp/mcpClient.js`, `services/mcp/inAppSearch.js` (nuevo), `services/meteor/client.native.js` |
| Navegación y pantalla | `app/+native-intent.tsx` (nuevo), `app/index.native.tsx`, `services/navigation/universalLinks.ts`, `components/mcp/SiriSearchScreen.native.jsx` |
| Metadata/IPA | `scripts/validate-app-intents-metadata.cjs` (ampliación del trabajo previo) |
| Localización reproducible | `plugins/with-vidkar-app-intents.js`, `plugins/resources/vidkar-app-intents/AppShortcuts.xcstrings`, `plugins/resources/vidkar-app-intents/Localizable.xcstrings` |
| Pruebas | `tests/mcpAppIntentsCompile.test.cjs`, `tests/mcpAppIntentsMetadata.test.cjs`, `tests/appIntentsArtifact.test.cjs`, `tests/mcpQueryPolicy.test.cjs`, `tests/MCPInAppSearchTests.swift` (nuevo), `tests/mcpSnapshot.test.js`, `tests/universalLinks.test.js` |
| Documentación | `docs/siri-ai-integration.md`, `docs/mcp-shortcuts.md`, `docs/app-intents-discovery-diagnostics.md` |

El paquete incluye la nueva acción por extracción de metadata del módulo. El
generador migra el bloque propio del provider y añade recursos localizados; el test
ejecuta el plugin dos veces y comprueba idempotencia. Los cambios fuente viven
fuera de carpetas nativas generadas. No se revierten cambios previos en Codemagic,
package.json o archivos Gradle.

## Evaluación histórica del planner (sin habilitar)

- `npm run test:mcp:ios`: compilación optimizada del prototipo en iPhone y simulador, consumo del módulo desde el provider y pruebas deterministas de política/aislamiento.
- `npm run test:mcp`: contratos JSON y rutas.
- `npm run eval:mcp:ai`: evaluación opt-in del modelo local en macOS. Descubre solo metadata desde el servidor MCP local por stdio, no ejecuta `tools/call`, no conecta a Mongo ni usa datos reales. Añade una herramienta sintética para comprobar selección dinámica.
- Backend: `npm run mcp:test` y `npm run mcp:build` desde `react-download`.

Última evaluación local (modelo disponible; sin Siri ni iPhone):

| Petición | Resultado |
| --- | --- |
| Busca Terminator en VIDKAR | Falla: solicita aclaración innecesaria |
| Búscame los cursos | Pasa: listado `course` sin título |
| Busca cursos de fotografía | Falla: pierde el tema de búsqueda |
| Busca al usuario Carlos | Falla: solicita aclaración innecesaria |
| Cómo está mi VPN | Pasa: consumo del propietario, sin inventar su ID |
| Busca eso | Pasa: rechaza contexto insuficiente |
| Elimina al usuario Carlos | Pasa: rechaza escritura |
| Horario de la biblioteca de Madrid | Pasa: selecciona una herramienta sintética nueva |

El comando de evaluación devuelve fallo mientras existan estos errores: no rebajar expectativas ni ocultar el resultado.
Una evaluación local exitosa tampoco sustituiría pruebas de extracción de metadata, archive firmado, Siri en iPhone, idioma/región y app fría/caliente.

## Decisión adoptada

Se implementó la alternativa **nativa acotada**, sin intérprete en el camino estable:

1. Schema general + resultados existentes, manteniendo MCP como fuente de datos y categorías explícitas. No depende del planificador local.
2. Un intérprete más capaz continúa fuera de alcance: necesita aprobación, política de privacidad/coste y evaluación antes de activarse.

No hay base para prometer «100 % con Siri AI». La mejora debe medirse con frases de prueba y datos autorizados, y no habilitarse si falla los casos básicos.
