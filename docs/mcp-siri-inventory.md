# Inventario previo: Siri, App Intents y MCP VIDKAR

Auditoría inicial del estado del repositorio y registro de cambios posteriores. La fuente de verdad son los archivos citados, no los nombres sugeridos en el requerimiento.

## 1. Arquitectura existente

- **Móvil**: `react-native-VIDKAR`, Expo SDK 57, React Native 0.86.3, Expo Router 57, deployment target iOS 16.4. `app.json` declara el esquema `vidkar`, Universal Links y el plugin `@bacons/apple-targets`.
- **MCP móvil**: `modules/vidkar-mcp/ios/VidkarMCPModule.swift` implementa intents de búsqueda, consulta, apertura, reproducción, lista de datos, ejecución restringida y catálogo; `AppShortcutsProvider`, entidades tipadas, transporte HTTP MCP y credenciales Keychain. El módulo se compila dentro de la app; no se encontró un target de extensión App Intents independiente.
- **MCP backend**: `react-download/mcp/server.mjs`, `auth.mjs`, `analytics.mjs` y `db.mjs`; `POST /mcp`, stateless Streamable HTTP, `tools/list` y `tools/call`. La app usa `https://www.vidkar.com/mcp`.
- **Token**: el token Bearer lo emite Meteor para el usuario autenticado, el servidor conserva su hash y el cliente lo guarda en Keychain con su ID propietario. Al configurar, `get_current_user` verifica que token y `Meteor.userId()` coincidan. Los flujos de logout llaman `clearMCPConfiguration()`.
- **Spotlight**: `modules/vidkar-spotlight` indexa cursos, usuarios y películas locales y reenvía selecciones a `SpotlightNavigation.native.jsx`.
- **Deep links**: `services/navigation/universalLinks.ts` conserva Universal Links HTTPS y resuelve un allowlist `vidkar://`; `app/index.native.tsx` encola enlaces y espera usuario/suscripción antes de navegar.
- **Fuera de la ejecución Siri**: `servidor-hls` solo atiende streaming; `react-native-VIDKAR-TV` y `vidkartv` son apps TV separadas y no tienen soporte de App Intents.

## 2. Herramientas MCP existentes

El catálogo final contiene 25 tools, 2 recursos y 2 prompts. Las definiciones están en `react-download/mcp/server.mjs`; los handlers y proyecciones en `analytics.mjs` y la nueva búsqueda en `search.mjs`. `get_current_user` y `search_entities` se añadieron para validar propietario y buscar entidades; el resto son herramientas existentes. En HTTP, `/mcp` requiere un token Bearer válido. Todos los tools son de lectura. Los argumentos de paginación aceptan `limit` hasta 500 en el schema, sujetos al máximo configurado (100 por defecto), `offset` y `sort=newest|oldest`. Los períodos admiten `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `this_year` y `custom` con `from`/`to`.

| Herramienta | Argumentos principales | Fuente/colecciones | Resultado y alcance | Datos / mutación |
|---|---|---|---|---|
| `get_business_summary` | período | `ventas_Recharge`, `transaccionRecargas_DTSHOP`, `ventas`, `COMERCIO_ventas` | KPIs y tendencias, restringidos por alcance del token | Financiero; lectura |
| `get_users` | `query`, `role`, paginación | `users` | perfiles resumidos filtrados a usuarios accesibles | Personal/rol/estado de servicios; lectura |
| `search_users` | `query` requerido, paginación | `users` | mismo handler/proyección que `get_users` | Personal; lectura |
| `get_managed_users` | `adminUserId`, `adminUsername`, `query`, paginación | `users` | usuarios subordinados; otro admin solo para admin principal | Administrativo/personal; lectura |
| `get_user` | `userId` requerido | `users` | perfil y estado de servicios sanitizado | Personal/servicios; lectura |
| `get_current_user` | ninguno | propietario Bearer de `users` | solo ID del propietario; vinculación MCP/sesión | Identidad; lectura |
| `get_user_purchase_history` | `userId`, query/estado, período, paginación | ventas/recargas/comercio y transacciones DTShop | resumen y compras filtradas antes de paginar | Financiero; lectura con confirmación; destinatario/referencia excluidos |
| `get_sales` | `serviceId`, `paymentMethod`, `userId`, `paidOnly`, `deliveredOnly`, período, paginación | ventas/recargas/comercio y transacciones DTShop | ventas paginadas dentro del alcance accesible | Financiero; excluye teléfono destinatario y referencia de operador; lectura confirmada |
| `get_sales_by_period` | período | colecciones de ventas | resumen de ventas por período | Financiero; lectura |
| `get_sales_by_service` | período | colecciones de ventas | actualmente devuelve el mismo resumen general | Financiero; lectura |
| `get_sales_by_payment_method` | período | colecciones de ventas | actualmente devuelve el mismo resumen general | Financiero; lectura |
| `get_orders` | `userId`, `status`, período, paginación | `ordenes_Recharge` | órdenes resumidas, importes/comisiones | Financiero; lectura |
| `get_order_statistics` | período | colecciones de ventas | actualmente usa el resumen general | Financiero; lectura |
| `get_products` | paginación | `productos_Recharge`, `dtshopProductos_Recharge`, `COMERCIO_productos`, `cursos` | catálogo resumido | Catálogo/precio; lectura |
| `get_payments` | `method`, período, paginación | `ventas_Recharge` | pagos sanitizados con estado, importe y referencias booleanas | Financiero; lectura |
| `get_payment_statistics` | período | colecciones de ventas | actualmente usa el resumen general | Financiero; lectura |
| `get_failed_payments` | período, paginación | `ventas_Recharge` | pagos filtrados por estados fallidos | Financiero; lectura |
| `get_costs` | período | colecciones de ventas | comisiones/costos de entrega registrados | Financiero/administrativo; lectura |
| `get_profitability` | período | colecciones de ventas | ingresos, costos registrados y limitaciones | Financiero/administrativo; lectura |
| `get_profitability_by_service` | período | colecciones de ventas | ingresos por servicio; no afirma costos faltantes | Financiero/administrativo; lectura |
| `get_service_usage` | `userId` requerido | `users` | estado de servicios de usuario accesible | Personal/servicios; lectura |
| `get_services` | ninguno | catálogo fijo de tipos observados | lista de tipos de servicio | Público; lectura |
| `get_service_statistics` | período | colecciones de ventas | actualmente usa el resumen general | Financiero; lectura |
| `get_service_sales` | período | colecciones de ventas | actualmente usa el resumen general | Financiero; lectura |
| `search_entities` | tipo, `query` o ID exacto acotado, categoría, estado, período/rango, orden, límite/offset, `confirmed` | allowlist de catálogos, cursos, series, usuarios, transacciones y mensajes | resumen paginado con deep link; búsqueda `all` solo en tipos públicos | datos públicos, privados o financieros según tipo; lectura; confirmación condicional por entidad |

También existen los recursos `business-catalog`, `business-states` y prompts `business_summary`, `profitability_analysis`. No son acciones ni acceso a las colecciones listadas por el requerimiento.

### Política de alcance observada

`mcp/auth.mjs` valida el token contra `mcp_access_tokens`, verifica que exista su propietario y deriva el acceso por el usuario propietario: usuario normal solo sí mismo; admin sus registros y usuarios asignados; admin principal alcance global. La identidad de admin principal sigue basada en username. Antes del cambio no había RBAC granular por herramienta ni metadatos de sensibilidad/confirmación; ahora cada tool expone `readOnlyHint` y `_meta["vidkar/security"]`, y el servidor exige auth, rate limit y timeout.

El modo stdio sigue permitiendo descubrir metadatos del catálogo, pero los handlers de tools requieren una identidad autenticada; sin ella las llamadas de datos fallan con `MCP_UNAUTHORIZED`. Tools sensibles requieren `confirmed: true`; existe timeout de 25 s, rate limit de 60 llamadas/minuto por token y auditoría sin contenido de búsqueda.

## 3. Métodos Meteor y límites de su reutilización

La búsqueda del repositorio encontró registros `Meteor.methods` en `server/metodos.js`, `server/main.js`, `server/metodos/*`, `server/cursos/*`, `server/evaluacionesIA/*`, `server/evidencias/*`, `server/api/*`, `server/notificaciones/*` y `server/serverproxy3002.js`. Este mapa enumera los métodos directamente relacionados con las superficies Siri revisadas; no convierte otros métodos administrativos, de background o internos en herramientas MCP.

| Método comprobado | Archivo | Autorización/comportamiento observado | Tratamiento Siri |
|---|---|---|---|
| `getPelicula(id)` | `server/metodos/peliculas.js` | Método de detalle existente; el reproductor valida acceso/suscripción por los flujos de producto | No exponer su documento ni URL multimedia; búsqueda MCP devuelve solo metadata resumida |
| `insertAsyncpelisbyyears`, `insertAsyncPelis`, `actualizarSubtitulos` | `server/metodos/peliculas.js` | Importación/actualización administrativa | No invocables desde Siri; mutación |
| `cursos.catalogo.obtener()` | `server/cursos/methods.js` | Requiere usuario y filtra catálogo por nivel de evaluación | La nueva búsqueda usa proyección resumida y el gate equivalente; nunca expone medios |
| `cursos.lecciones.obtener(courseId)` | `server/cursos/methods.js` | Requiere usuario; protege lecciones no publicadas/acceso | La búsqueda solo expone lecciones con suscripción y nivel comprobados |
| `cursos.detalle.obtener(courseId)`, `cursos.puedeAcceder(courseId)` | `server/cursos/methods.js` | Detalle y elegibilidad autenticados | Se conservan como autoridad para abrir la pantalla y playback |
| `cursos.media.solicitarReproduccion(lessonId)` | `server/cursos/methods.js` | Comprueba lección, suscripción y acceso antes de emitir URL | No se llama al buscar; el player lo invoca después de la acción confirmada |
| `cursos.crear`, `actualizar`, `eliminar`, `publicar`, `cursos.lecciones.*`, `cursos.agregarAlCarrito`, `cursos.media.solicitarSubida/eliminar` | `server/cursos/methods.js` | Ownership/rol de profesor/admin; incluye efectos de carrito/media | Escritura excluida de los intents |
| `cursos.ganancias.*` | `server/cursos/earningsMethods.js` | Configuración/pagos restringidos a admin; movimientos financieros | Excluido de Siri |
| `evaluacionesIA.iniciar`, `evaluacionesIA.responder` y gestión de categorías | `server/evaluacionesIA/methods.js` | Sesiones autenticadas; gestión de categoría de admin | Excluidos; producen/alteran evaluaciones |
| `mcp.tokens.list/create/revoke` | `server/metodos/mcpTokens.js` | Solo sesión autenticada; tokens propios; máximo cinco activos | Crear/revocar requiere confirmación y todavía no existe tool MCP para ello |
| `getProviders`, `getProducts`, `getProductsDescriptions`, `getRegions`, `getCountries`, `getDisponible`, `sendTransferDingConnect` | `server/metodos/productos.js` | Algunos catálogos sin guard Meteor explícito; la transferencia ejecuta una recarga | Catálogo externo/consulta de saldo no expuesto; transferencia financiera excluida |
| `creandoOrden`, `obteniendoDatosDeOrdenPaypal`, `ventas.reembolsar` | `server/metodos/paypal.js`, `server/metodos/reembolsos.js` | Crear/cobrar/reembolsar opera sobre pagos | Excluidos; nunca se invocan por selección semántica de Siri |
| `precios.getByType`, `precios.getAllProxyVPNPackages`, `ventas.calcularPrecioProxyVPN`, `ventas.activarServicioProxyVPN` | `server/metodos/ventasProxyVPN.js` | Precio/paquete autenticado; activar servicio cambia estado/venta | Sin tool MCP de precios oficial/activación; escritura excluida |
| `ventas.resumenCompras` | `server/metodos/ventasResumen.js` | Admin principal; puede incluir contexto/evidencias | Excluido de cuentas normales y del catálogo MCP |
| `evidencias.obtenerImagenUrl`, `evidencias.analizarConIA`, `evidenciasAdmin.*`, `cambiarEstadoEvidencia` | `server/evidencias/*`, `server/metodos/archivos.tsx` | Ownership/admin; imágenes, antifraude y revisión de comprobantes | Archivos/evidencias/IA excluidos de búsqueda general |
| `moneda.convertir`, `pago.calcularComision` | `server/metodos/utiles.js` | Conversión/cálculo consumido por pagos; no son lectura general de precios | No exponer como tool genérica; calcular no equivale a precio oficial |
| `ventas.reembolsar`, `crearPedidoComercio`, `cambiarEstadoPedidoComercio`, métodos de cadetes | `server/metodos/reembolsos.js`, `server/metodos/metodosComercios.js` | Efectos financieros/operativos y cambio de pedido | Excluidos; requieren autorización y confirmación en flujos de UI existentes |
| `users.toggleModoEmpresa`, `users.toggleModoCadete`, `user.updateRequiredData`, métodos consumo VPN/Proxy | `server/metodos/metodosUsers.js`, `usuarios.js` | Requieren identidad/estado de servicios; algunos son internos | No exponer datos administrativos/operativos |
| `enviarMensajeDirecto*`, `notificaciones.notificarEvento` | `server/notificaciones/notificaciones.js` | Envío de mensajes/push y eventos | Escritura/comunicación excluida; requeriría diseño de confirmación específico |

La búsqueda MCP actual no llama estos métodos desde un cliente no autenticado. `get_current_user` solo confirma el vínculo token/owner; `search_entities` es el contrato nuevo necesario porque no existía una herramienta global de búsqueda. Sus reads permanecen en backend MCP con allowlist y guards propios; las herramientas de pagos/escritura nunca se delegan automáticamente a una intención.

Los métodos de negocio no conforman un catálogo MCP invocable. Los métodos de escritura/financieros permanecen fuera de los intents hasta crear un contrato backend explícito, comprobar identidad/rol/ownership y añadir confirmación e idempotencia en servidor. No se debe convertir el catálogo dinámico en autorización.

**Publicaciones heredadas no aptas para Siri/MCP:** `pelis`, `peli`, `descargas`, `user`, `userID`, `userRole`, `mensajes`, `ventas`, `files`, `push_tokens` y varias publicaciones comerciales aceptan selectores del cliente sin un filtro de ownership consistente en el propio publisher. `series`/capítulos sí tienen helpers de visibilidad y suscripción en `server/metodos/series.js`; las publicaciones de cursos tienen su propia política en `server/cursos/*`. Por este motivo no se reutilizarán publicaciones como sustituto de una búsqueda backend autorizada.

## 4. Colecciones comprobadas

`react-download/imports/collections/collections.js` confirma, entre otras, las colecciones principales: `users`, `RegisterDataUsersCollection`, `pelisRegister`, `series`, `seriesTemporadas`, `seriesCapitulos`, `tvRegister`, `descargasRegister`, `audios`, `cursos`, `cursos_lecciones`, `cursos_categorias`, `cursos_suscripciones`, colecciones de evaluaciones IA, `ventas`, `ventas_Recharge`, `ordenes_Recharge`, `carrito_Recharge`, colecciones de productos/precios, `COMERCIO_*`, `mensajes`, `messages`, `push_tokens`, `config`, `versions`, `files`, imágenes, vídeos/comprobantes de cursos, evidencias, `servers`, `Logs`, `online` y notificaciones VPN.

La existencia de una colección no implica que sea publicable o consultable desde Siri. Datos de evidencia, archivo, mensajes, tokens, sesiones, operaciones internas, fraude, credenciales y ubicaciones quedan excluidos del catálogo MCP salvo un contrato seguro específico.

## 5. Entidades y rutas actuales

| Entidad solicitada | Evidencia/capacidad backend actual | Ruta móvil identificada | Estado para Siri |
|---|---|---|---|
| Película | `search_entities` busca solo visibles | `/(normal)/PeliculaPlayer` o resultados `/(normal)/SiriSearch` | búsqueda disponible; player solo tras confirmación |
| Serie/temporada/capítulo | publicaciones `series`/`temporadas`/`capitulos` usan helpers de visibilidad y exigen `subscipcionPelis`; métodos localizados en `metodos/series.js` son de importación/administración | `/(normal)/SeriesDetail`, `/(normal)/SeriesPlayer` | búsqueda nueva valida suscripción/visibilidad; reproducción confirmada |
| Curso/lección | `search_entities` valida publicación/nivel; lección además suscripción activa | `/(normal)/Cursos`, `/(normal)/CursoDetalle?courseId=...` | cursos publicados visibles; las búsquedas de lecciones son privadas/confirmadas y playback usa método Meteor autorizado |
| Usuario | MCP filtra con alcance token | `/(normal)/User?item=...` | búsqueda exige confirmación |
| Compra/venta/orden | MCP recorta al alcance del token | `/(normal)/MisCompras`, `/(normal)/VentasLegacy` | resumen exige confirmación; las pantallas existentes no resuelven todavía todos los IDs individualmente |
| Producto/precio | `search_entities` busca catálogos existentes; `get_products` permanece | `/(normal)/Precios`, `/(normal)/ProductosCubacelCards`, búsqueda Siri | muestra precio solo si existe; no hay una búsqueda general de precios oficiales |
| Mensaje/descarga | mensajes solo entre propietario y remitente/destinatario; descargas no soportadas | `/(normal)/Mensajes`; no se encontró destino de descarga seguro | mensajes exigen confirmación; descarga sigue deshabilitada |
| Suscripción | `search_entities` consulta solo el estado de películas del owner y `cursos_suscripciones` del usuario actual | `/(normal)/MisCompras` | privada, requiere confirmación y no acepta un `userId` de entrada |

`services/spotlight/spotlightItems.js` ya conoce rutas para `course`, `user` y `movie`, pero Spotlight IDs no equivalen a un contrato universal `vidkar://...`. `services/navigation/universalLinks.ts` acepta solo Universal Links HTTPS y hoy enruta portada, cursos y mensajes.

## 6. Escrituras, confirmaciones y riesgos

- **Tools MCP actuales**: solo lectura; `search_entities` agrega búsqueda segura de contenido y datos resumidos. No se agregaron herramientas de escritura.
- **Confirmación obligatoria antes de añadir**: mensajes salientes, compras, cambios/borrados, suscripciones, creación de tokens, descarga/reproducción con consumo de recursos e información privada/financiera. La confirmación no reemplaza la autorización backend.
- **Riesgos remanentes**: la decisión de admin principal sigue basada en username; publicaciones Meteor amplias sin propiedad robusta no deben exponerse; el rate limit es por proceso (en despliegue multiinstancia se necesita almacenamiento compartido); mensajes/evidencias/archivos/push tokens/operaciones internas siguen con allowlist restringida.
- Se detectaron valores de configuración con apariencia de credenciales en archivos versionados fuera del flujo Siri. No se copiaron al inventario: deben tratarse por separado, rotarse y moverse a gestión de secretos.

## 7. Proyectos y pruebas

- `react-native-VIDKAR-TV/` y `vidkartv/`: apps Android TV separadas; no comparten intents ni navegación Siri.
- `servidor-hls/`: servicio de streaming; no es fuente de búsqueda MCP y no se debe iniciar playback automáticamente por una consulta de voz sin confirmación.
- Pruebas móviles: `tests/mcpProtocol.test.js`, `tests/universalLinks.test.js`, script `npm run test:mcp`; `npm run lint` para Expo.
- Backend: `mcp/auth.test.mjs`, `analytics.test.mjs`, `search.test.mjs`, `rateLimit.test.mjs`; `npm run mcp:test`. Meteor `npm test` requiere runtime/base de prueba. No se dispone de prueba XCTest de Siri en dispositivo.

## 8. Decisiones de implementación derivadas

1. El token MCP se enlaza al `Meteor.userId()` activo y el backend verifica auth en cada llamada.
2. La búsqueda usa allowlist, proyecciones mínimas y autorización específica; no acepta nombres Mongo, campos ni selectores desde Siri.
3. Tools no marcadas de solo lectura se rechazan en Swift y JS; el servidor es la autoridad final.
4. Los datos privados/financieros y playback requieren confirmación; la confirmación no sustituye guards de servidor.
5. Deep links se validan contra `vidkar` y rutas allowlisted; React Native espera la sesión autenticada antes de navegar.
