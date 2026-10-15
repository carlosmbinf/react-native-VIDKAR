# Siri, App Intents y MCP de VIDKAR

## Entrega de la búsqueda al abrir la app

`VIDKARSearchInAppIntent` conserva en memoria nativa el destino validado antes
de devolver `OpenURLIntent`. El navegador raíz recupera esa solicitud tanto al
montarse como al recibir un evento o volver a primer plano; espera a que exista
el navegador y confirma la entrega por ID. La solicitud más reciente reemplaza
la anterior y una confirmación antigua no puede borrarla. No se guardan búsquedas
en disco ni se ejecutan consultas durante esta entrega.

La ruta `/siri-search` mantiene los parámetros durante la restauración de sesión
y usa el login integrado con `deferSessionRedirect`, sin enviar al menú al terminar.
Si Expo Router ya recibió el mismo enlace, no se duplica la navegación.
Este mecanismo requiere recompilar el binario iOS; una OTA no actualiza el módulo.
Las pruebas aisladas cubren entrega fría/caliente y login; la aceptación real con
Siri y el binario actualizado debe comprobarse en dispositivo.

> [Estado y límites de Siri AI](./siri-ai-integration.md): `VIDKARSearchInAppIntent`
> conserva su contrato de apertura, pero está oculto del descubrimiento. Solo
> consultas background se ofrecen para Siri. El planner experimental sigue
> fallando 3/8 casos y no se habilita.

> **Build vigente:** Release local **4.0.875 (1184)** instalado como actualización
> y lanzamiento confirmado en el iPhone; la conversación natural en Siri sigue
> pendiente. Validación: 24 pruebas iOS y 82 MCP; detalle en
> [siri-ai-integration.md](./siri-ai-integration.md).

## Estado actual de Siri (octubre de 2026)

La app conserva sus contratos nativos y publica **diez App Shortcuts de consulta**.
La metadata compilada contiene diecisiete acciones VIDKAR: dieciséis descubribles
y una búsqueda foreground intencionalmente oculta.

- `VIDKARSearchUserByUsernameIntent`: recibe un username obligatorio, busca coincidencia exacta dentro del alcance autorizado del token y consulta el perfil usando únicamente el ID devuelto por esa búsqueda; backend vuelve a validar el alcance. Devuelve una `VIDKARUserSearchAppEntity` resoluble y un snippet SwiftUI con identidad, rol, alta, estado y servicios, **sin abrir VIDKAR**. Conserva nombre del intent, parámetro y tipo de salida para Atajos guardados, y la propiedad opcional `account`. No verbaliza el perfil ni devuelve direcciones de correo o credenciales. La frase «Busca un usuario en VIDKAR» se conserva.

| Consulta | Acción / parámetros | Frase preconfigurada |
| --- | --- | --- |
| Usuario | `VIDKARSearchUserByUsernameIntent(username)` | Busca un usuario en VIDKAR |
| Películas, series, cursos, Comercio | Las cuatro `VIDKARSearch…Intent(query)` existentes | Busca películas / series / cursos / productos en VIDKAR |
| Consumo Proxy/VPN | `VIDKARGetUserServiceUsageIntent(user?, service)` | Consulta consumo de un usuario en VIDKAR |
| Ventas asociadas a una cuenta | `VIDKARGetUserSalesIntent(user?, period)` | Consulta ventas de un usuario en VIDKAR |
| Compras, órdenes, perfil ampliado | `VIDKARGetUserRecordsIntent(user?, records, period)` | Consulta datos de un usuario en VIDKAR |
| Mensajes y suscripciones propios | `VIDKARGetMyRecordsIntent(records, query, period?)` | Consulta mi cuenta en VIDKAR |
| Resumen de ventas, pagos y limitaciones de costos/rentabilidad | `VIDKARGetBusinessReportIntent(report, period)` | Consulta el negocio en VIDKAR |
| Ficha completa actualizada del resultado | `VIDKARGetUserProfileIntent(user)` | Acción personalizada; sin nueva frase preconfigurada |
| Consultas y límites disponibles | `VIDKARGetCapabilitiesIntent()` | Acción personalizada; sin nueva frase preconfigurada |

Todas estas consultas devuelven tarjetas SwiftUI y resultados tipados sin abrir la app. Las listas muestran hasta cinco registros; ventas/compras/órdenes y datos propios indican además el total que devuelve el backend. Los pagos son una muestra de los primeros cinco, no el total del período. El período financiero predeterminado es este mes y los límites devueltos por el servidor se muestran en UTC. Omitir `user` significa consultar al titular del token, nunca el último usuario visto.

Sin texto de búsqueda, películas/series/productos solicitan el dato mediante el diálogo nativo; cursos permite listar los publicados accesibles sin inventar un título. Se conservan parámetros/defaults publicados, pero se reemplaza intencionalmente el antiguo resultado vacío ante una búsqueda sin texto por una solicitud de valor. Los fallos de consulta ya no se ocultan como listas vacías.

La propia ficha y la cuenta ligada usan ID estable `ownerId|userId` y vuelven a consultar `get_user` con autorización actual. Su búsqueda por texto exige username exacto; no hay sugerencias, indexación ni caché persistente de perfiles/finanzas. Los UUID transitorios antiguos no representan una cuenta resoluble y requieren repetir la búsqueda. La acción de perfil completo recibe la misma ficha como parámetro requerido; la anotación visual añade contexto desde iOS 18.4. Estos mecanismos **no garantizan** que Siri interprete «ese usuario». Si no identifica la referencia, hay que proporcionar el username. No se implementa un estado global de «último usuario» que pueda seleccionar una cuenta equivocada.

**No es adopción semántica de un dominio Apple:** las acciones de perfil,
consumo, ventas y ayuda son personalizadas; no existe un schema público
aplicable identificado para estas consultas. No se falsean schemas de notas
o mensajes. Una tarjeta de ayuda no introduce automáticamente sus capacidades
en el «app toolbox» de Siri AI. La selección de lenguaje natural y preguntas
compuestas permanece sin demostrar en dispositivo.

**Validación del código del build 1184 instalado:** 24 pruebas nativas
aprobadas, diecisiete acciones/diez shortcuts y recursos españoles; búsquedas,
resolución/reconsulta de la ficha, permisos, usuario eliminado, sesiones,
unidades y render macOS con entornos Dynamic Type; el escalado y VoiceOver
en iOS siguen pendientes. El binario se instaló y lanzó correctamente;
la conversación real con Siri queda pendiente.

**Límites financieros:** `get_sales(userId)` representa ventas asociadas a la cuenta, no atribución de vendedor. Cada importe conserva su moneda; no se calcula una suma de CUP/USD. Los agregados de resumen, costos y rentabilidad del backend no identifican moneda y pueden mezclar divisas: la tarjeta muestra conteos o sus limitaciones, no presenta esos valores como ganancias/saldo fiables. No se modifica ese contrato ni se estiman costos ausentes.

**Validación histórica del build 1183:** 23 pruebas iOS y 82 pruebas MCP aprobadas; compilación de intents/provider para iPhone y simulador con mínimo iOS 16.4; extracción de quince acciones/diez shortcuts, recursos españoles y NLU; ejecución real con I/O aislado para consumo, ventas, compras, órdenes, perfil, pagos, resumen, limitaciones, mensajes y suscripciones. Lint: cero errores, 85 advertencias preexistentes. Release local **4.0.875 (1183)** compilado, instalado como actualización y abierto en iPhone. Se verificaron versiones del artefacto/dispositivo, JS actualizado, metadata española, firmas de cuatro bundles y entitlements sin cambios; el bundle completo incluye además tres acciones de widgets. Falta probar voz/conversación en Siri. No se ejecutaron consultas de producción.

### Ficha de usuario dentro del sistema

- `ShowsSnippetView` (iOS 16+) devuelve una tarjeta informativa; no requiere `SnippetIntent`, botones, una extensión ni cambios de deployment target. La UI está en [MCPUserSnippet.swift](../modules/vidkar-mcp/ios/MCPUserSnippet.swift), no depende de React/JavaScript activo.
- Se toma el nombre/foto del perfil autorizado cuando están disponibles. El avatar se descarga antes de devolver la vista: HTTPS y hosts allowlisted también en redirecciones, sin cookies/credenciales/caché persistente, timeout de petición de 5 s y recurso de 8 s, máximo 1 MiB y dimensiones de origen hasta 4096 por lado. ImageIO genera una miniatura PNG de hasta 128 px; entidad y snippet usan esa imagen en memoria.
- Sin foto se muestra un icono. Si falla su descarga/decodificación, se registra un error sin datos personales y la tarjeta indica «Foto de perfil no disponible»; no se pierde el perfil válido. Cancelación y cambios de owner/revisión impiden entregar la ficha, incluso durante la descarga.
- La ficha y su propiedad `account` son resolubles con comprobación de sesión/alcance, sin sugerencias ni indexación privada. Se exponen dieciocho propiedades allowlisted, no el documento completo. El snapshot existente conserva TTL de 120 s y aislamiento owner/revisión; la acción no abre su deep link.
- Apple puede no presentar un snippet/diálogo cuando Siri AI compone su propia respuesta. Se proporciona también la entidad estructurada; no se garantiza una apariencia exacta ni el reconocimiento de cualquier frase. No se inventa un schema de usuarios ni se activa el planner experimental.
- Pruebas dirigidas: compilación para dispositivo/simulador con mínimo 16.4, extracción de metadata y localización española, ejecución del intent con I/O aislado, límites del avatar y render SwiftUI claro/oscuro con/sin foto. La aceptación final de voz y presentación en Siri requiere un binario nuevo instalado y prueba en iPhone iOS 27; no sirve OTA/Expo Go.

**Validación local — 13/10/2026, Xcode 27.2 (27B5028f):** `npm run test:mcp:ios` pasa 23 pruebas sin fallos ni omisiones. Se verifica también la ficha ante fallo de imagen/red, cancelación Swift/URLSession, logout, rotación de token del mismo owner y cambio de cuenta durante la carga del avatar. La tarjeta renderiza en claro/oscuro, con/sin imagen y altura hasta 340 puntos en las fixtures. `npm run lint` termina con 0 errores y 85 advertencias del proyecto.

**Aceptación funcional en iPhone:** la ficha original fue confirmada por el usuario;
el build 1184 con el perfil ampliado está instalado y abierto. Con MCP configurado
y una cuenta autorizada, probar «Tráeme los datos del usuario … en VIDKAR»,
«dame más datos de ese usuario» y preguntas compuestas. No se ha confirmado
todavía que Siri AI resuelva esas referencias o seleccione estas consultas.
La firma y los metadatos del Release completo están verificados; no sustituyen
una prueba real de conversación con Siri.

Referencias: [snippets oficiales](https://developer.apple.com/documentation/appintents/displaying-static-and-interactive-snippets), [ShowsSnippetView](https://developer.apple.com/documentation/appintents/showssnippetview), [diseño de snippets](https://developer.apple.com/videos/play/wwdc2025/281/).

Las acciones existentes se mantienen para compatibilidad; las consultas nuevas se añaden sin renombrar parámetros publicados.

- `VIDKARQueryCatalogIntent`: consulta informativa background con `query` requerido y hasta cinco resultados transitorios. No tiene App Shortcut preconfigurado ni abre la app. Véase [contrato, pruebas y límites](./siri-catalog-background.md).

- `VIDKARQueryMCPIntent` (“Consulta MCP”) y `VIDKARExecuteMCPIntent` (“Ejecuta MCP”): mantienen la interfaz JSON para descubrir y ejecutar herramientas de solo lectura sin diálogos de confirmación.
- `VIDKARSearchMoviesIntent`, `VIDKARSearchSeriesIntent`, `VIDKARSearchCoursesIntent` y `VIDKARSearchCommerceProductsIntent`: devuelven entidades App Intents tipadas, con título, subtítulo, descripción, enlace VIDKAR e icono de dominio. El servidor vuelve a comprobar visibilidad, suscripción/nivel y alcance antes de entregar cada resultado; los productos se consultan solo en `COMERCIO`.
- `VIDKARGetServiceUsageIntent`: devuelve una entity transitoria de Proxy o VPN sin solicitar confirmación. Solo incluye estado y consumo del titular del token; no ofrece sugerencias ni lookup posterior por ID.
- `VIDKARSearchInAppIntent` (iOS 27): conserva el schema `.system.searchInApp`, `criteria.term` y scopes `.general`, `.movies`, `.tv`, pero declara `isDiscoverable = false`. No se ofrece a Siri, Spotlight ni Atajos, porque su contrato abre la app. El buscador normal de VIDKAR permanece disponible desde la app; esto no controla sugerencias que Siri decida generar por su cuenta.
- `VidkarAppShortcutsProvider`, generado por el plugin en `AppDelegate.swift`, publica diez shortcuts de consulta. Siri decide si selecciona una acción ante formulaciones distintas; la extracción de metadata no garantiza que entienda cualquier oración.

`Consulta MCP` devuelve `{ success, count, tools }`. `Ejecuta MCP` devuelve `{ success, tool, data }` o `{ success: false, tool?, error: { code, message } }`. La respuesta MCP original se conserva dentro de `data` para poder encadenarla o analizarla como JSON en Atajos/otras herramientas. Los errores también mantienen la misma envoltura JSON. Las cuatro acciones de catálogo entregan colecciones de su tipo concreto, no JSON genérico.

Las intents usan el endpoint HTTPS/token ya configurados desde la pantalla MCP. El token permanece en Keychain, ligado al propietario validado por `get_current_user`; nunca se recibe en los parámetros de Siri. El backend vuelve a comprobar autenticación, alcance y permisos en cada llamada. Las tools de solo lectura no requieren confirmación; una herramienta que no sea de solo lectura no se ejecuta desde Siri.

El módulo local aporta las intents y el plugin Expo registra el paquete en `AppDelegate` de forma reproducible. Ambos workflows iOS verifican los metadatos del `.app` archivado y de la IPA exportada antes de publicar. `AppIntentsPackage` requiere iOS 17; se conserva el mínimo global 16.4, el registro del paquete/provider desde iOS 17 y el schema desde iOS 27, sin targets, entitlements ni perfiles nuevos. El plugin migra idempotentemente el bloque propio del provider histórico sin clean ni borrar código ajeno. La búsqueda dentro de la app conserva su schema y apertura explícita; las diez consultas con shortcut no abren la app. La instalación local aplicó solo el plugin de App Intents y compiló Release, sin ejecutar prebuild.

Si no aparece ninguna acción en Atajos, consulta el [diagnóstico de descubrimiento y verificación del binario](./app-intents-discovery-diagnostics.md). La ausencia total de acciones no equivale a la búsqueda integrada experimental desactivada.

## MCP móvil (independiente de Siri)

El botón nativo de actualización MCP del widget requiere iOS 17. El plugin
`with-vidkar-widget-mcp-refresh.js` protege su generación con
`if #available(iOS 17.0, *)`, incluso en archivos ya parcheados, sin elevar el
mínimo iOS 16.4 ni cambiar los permisos MCP. `npm run test:widget-refresh`
comprueba la vista Swift y su intent con mínimos 16.4 y 17.0 para simulador
y dispositivo. La actualización conserva el transporte del módulo `vidkar-mcp`
y el Keychain compartido con la app; no eliminar esa implementación mientras el
widget invoque `VIDKARWidgetUsageRefresh`.

La app conserva el módulo Expo `modules/vidkar-mcp` y el backend MCP para la pantalla de configuración/consultas dentro de VIDKAR. La pantalla, la emisión/gestión de tokens y el endpoint MCP están reservados a usuarios con rol administrador (incluido el administrador principal). El servidor vuelve a validar el rol del propietario en cada conexión, por lo que ocultar la ruta no es la única barrera y tokens antiguos de cuentas normales dejan de funcionar. Las dos acciones Siri reutilizan ese transporte y contrato; el MCP sigue validando tokens, permisos y datos en backend.

```text
Pantalla MCP de VIDKAR -> módulo Expo vidkar-mcp -> backend MCP HTTPS
Siri / Apple Intelligence -> Consulta MCP / Ejecuta MCP -> MCPTransport -> backend MCP HTTPS
```

El backend sigue siendo la autoridad para las operaciones MCP. Las intents no dependen del runtime JavaScript activo y no aceptan tokens, IDs de propietario ni credenciales como parámetros.

## Acciones MCP de Siri

`Consulta MCP` puede devolver todas las herramientas actuales o filtrar por `toolName`. El catálogo siempre se obtiene de `tools/list`, no de una lista fija en Swift. Incluye el schema de entrada para que Atajos u otra herramienta pueda seleccionar los argumentos requeridos.

`Ejecuta MCP` descubre de nuevo el catálogo antes de llamar `tools/call`; rechaza herramientas desconocidas/no marcadas `readOnlyHint` y argumentos que no sean un objeto JSON. Ignora y elimina `confirmed`, conservado solo por compatibilidad con clientes anteriores. Ninguna tool de solo lectura abre un diálogo de confirmación. La autorización final, validación completa del schema, rate limit y auditoría permanecen en el backend.

Las intents y entidades de la experiencia Siri anterior quedan detrás de `VIDKAR_LEGACY_INTENTS` como referencia de migración; no se activa ese bloque para publicar las nuevas entidades. La superficie tipada nueva no indexa contenido en Spotlight y devuelve cero sugerencias iniciales. La antigua indexación semántica MCP se eliminó.

## Descubrimiento y seguridad del catálogo

`tools/list` se descubre dinámicamente; no se replica la lista de tools en Swift. El catálogo muestra nombre, descripción, `inputSchema`, anotaciones MCP, permisos, clase de datos y lectura; las tools de solo lectura se marcan sin confirmación requerida.

El servidor marca tools de consulta con `readOnlyHint`, y adjunta `_meta["vidkar/security"]` con permisos, clase de datos y operación. Swift y JavaScript solo permiten ejecutar tools marcadas de solo lectura; la validación backend se repite en cada llamada y no exige confirmación para esas lecturas.

La configuración valida HTTPS, host `vidkar.com`/`www.vidkar.com`, ruta `/mcp`, ausencia de credenciales/query/fragment en la URL y el token Bearer en Keychain. Al configurar, el cliente llama `get_current_user` y exige que el ID propietario del token coincida con el `Meteor.userId()` actual antes de conservar la configuración. Cambiar usuario o cerrar sesión elimina las credenciales por los flujos logout existentes. No se registra el token.

Si el token local no puede volver a asociarse con la sesión, el cliente conserva solo el `tokenId` cuando comprueba que sigue activo y pertenece a la cuenta administradora actual. Si la rotación devuelve `mcp-token-not-found`, crea un reemplazo para el dispositivo. Si se perdió también el identificador, muestra los tokens activos de la cuenta para elegir uno; antes de rotarlo avisa que dejará de funcionar en el otro cliente. Nunca se rota un token ajeno ni se reemplaza silenciosamente ante un error de red.

Las antiguas intents de playback ya no se compilan ni están disponibles desde Siri. Independientemente de App Intents, el player de películas exige sesión Meteor y `subscipcionPelis === true` antes de preparar HLS.

Todas las tools requieren token Bearer en `/mcp`; también en modo stdio los handlers rechazan llamadas de datos sin identidad. Las lecturas de usuarios, finanzas, órdenes, compras, mensajes y catálogo no requieren confirmación; siguen sujetas al alcance del token, los permisos de entidad, visibilidad, nivel, suscripción y ownership validados en backend. No existen tools MCP de escritura; una llamada no declarada de solo lectura se rechaza con “No tienes permisos para realizar esa acción en VIDKAR.”

## `search_entities`

Herramienta creada porque no existía búsqueda MCP general. Trabaja en backend con allowlist de tipos/colecciones/proyecciones; los identificadores Mongo, campos y selectores no se aceptan desde el cliente.

Tipos disponibles: `all`, `movie`, `series`, `episode`, `course`, `lesson`, `user`, `purchase`, `sale`, `order`, `product`, `message` y `subscription`.

Admite query de hasta 120 caracteres, categoría/estado, período natural o `from`/`to` en ISO, orden, `limit` máximo 50 y `offset` máximo 10 000 (global `all` hasta 200). Responde entidades resumidas con paginación y deep link; no devuelve documentos Mongo completos ni URLs de stream/video. Las imágenes requieren HTTPS y un host allowlisted de VIDKAR o de proveedores de avatar conocidos.

`entity=course` admite listado sin query ni ID y conserva publicación, nivel y permisos. `all`, `movie` y `user` siguen requiriendo texto o los identificadores admitidos por su contrato.

Las búsquedas Siri tipadas resuelven el ID persistente consultando de nuevo al backend. Para `product`, una búsqueda exacta por ID solo se acepta con `category=COMERCIO` y selecciona exclusivamente `COMERCIO_productos`; el ID Mongo de entrada se mantiene separado del ID de entity compuesto que incluye su fuente.

Los resultados de tipo `user` en `search_entities` incluyen foto, rol y `serviceUsage` separado para Proxy/VPN: estado activo, bytes consumidos, límite en MB, condición ilimitada y vencimiento; VPN también indica conexión. `get_user` agrega únicamente su proyección sanitizada: ID, username, nombre, rol, fecha de alta, foto, cantidad de correos (no las direcciones), estado y límites de servicios, dominios de VPN devueltos por el contrato y marca de cuenta bloqueada. El perfil se presenta en la ficha temporal de resultado de Siri; no se envían contraseñas, tokens ni direcciones de correo. La pantalla no vuelve a consultar el backend para representar el snapshot y borra el contenido al vencer, cerrar sesión o cambiar la revisión MCP.

- Las búsquedas de películas requieren que sean visibles.
- Series/capítulos requieren usuario autenticado con `subscipcionPelis === true` y contenido visible.
- Cursos publicados aplican el nivel de evaluación del usuario; las búsquedas de lecciones comprueban suscripción activa, publicación del curso y nivel autorizado, sin confirmación adicional.
- Usuarios respetan el alcance del token (self / subordinados autorizados / admin principal), sin confirmación adicional.
- Compras/ventas/órdenes se restringen al alcance MCP; mensajes se filtran siempre a `from == userId || to == userId`; estas lecturas no requieren confirmación.
- `subscription` consulta la suscripción de películas del usuario actual y sus suscripciones propias de cursos; respeta ese alcance y nunca admite un `userId` arbitrario, sin confirmación adicional.
- Productos se limitan a catálogos existentes y proyección permitida. El precio solo se presenta si el documento realmente tiene precio, sin inferir moneda.
- No hay búsqueda de proveedores, TV, audio, descargas o precios oficiales: no se inventaron rutas ni permisos para ellos.

## Deep links y navegación (pantallas MCP/Spotlight existentes)

`services/navigation/universalLinks.ts` conserva Universal Links HTTPS y el allowlist `vidkar://`. `app/+native-intent.tsx` entrega búsquedas en frío/caliente directamente a `SiriSearch`, también cuando la pantalla inicial no está montada. La octava acción sí navega a resultados; no reproduce ni compra. La pantalla permite editar el término, elegir categoría, listar cursos sin texto y seleccionar una coincidencia. “Abrir” no reproduce; “Reproducir…” es otra acción con confirmación y autorización vigente.

Sin sesión, el login existente se presenta dentro de esa ruta y conserva los criterios. MCP debe estar configurado explícitamente; se ofrece acceso a su pantalla y reintento. Los resultados se descartan al cambiar consulta, cuenta, foco o revisión; `confirmed`, herramientas, tokens o playback no pueden entrar por el enlace de búsqueda. El bridge `executeToolForOwner` ata cada consulta de la app al owner y revisión nativa; los binarios antiguos sin ese guard rechazan nuevas búsquedas hasta actualizarse. No se crean tokens automáticamente.

La ficha de usuario y los informes de compras, ventas y mensajes se exponen mediante consultas autorizadas; no se indexan ni se ofrecen sugerencias privadas. Las lecciones no tienen una acción general de consulta Siri. Proxy/VPN expone estado, bytes usados, límite, condición ilimitada y vencimiento; nunca servidor, IP, contraseña ni token.

## Configuración y ejecución

1. Inicia sesión con una cuenta administradora y configura el token MCP desde la pantalla «Siri y MCP de VIDKAR».
2. Usa un development build o distribución iOS nativa; Expo Go no contiene el módulo Swift ni App Intents.
3. Para buscar una persona, usa «Busca usuario en VIDKAR» y proporciona el username exacto. La intent consulta el username y, si hay una coincidencia única dentro del alcance permitido, muestra un snippet sanitizado sin solicitar confirmación ni verbalizar los datos privados.
4. Las diez frases del provider se conservan. Las acciones nuevas de ficha completa y capacidades son intents explícitas sin otra frase preconfigurada; su mera presencia no garantiza que Siri AI las seleccione mediante lenguaje natural.

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
