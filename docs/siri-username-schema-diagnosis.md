# Siri: username y compatibilidad del catálogo MCP

## Causa reproducida

`VIDKARSearchUserByUsernameIntent` llama a `search_entities`, no a `search_users` ni a `get_users`. Antes enviaba siempre `username`. Ese argumento es una adición local a `react-download/mcp/server.mjs:163`; el schema anterior solo admitía `query`.

En `modules/vidkar-mcp/ios/VidkarMCPModule.swift:373`, `validatedTool` rechazaba parámetros ausentes del schema como `toolNotAllowed`. `executeIntent` valida antes de pedir consentimiento; por tanto el fallo ocurre antes de `tools/call` y antes del diálogo. `catalogFailure` lo convertía en «No tienes permiso para consultar este catálogo». Además confundía `MCP_CONFIRMATION_REQUIRED` con `MCP_FORBIDDEN`.

La regresión con un `tools/list` sin `username` falló inicialmente con `MCPError.toolNotAllowed`; pasa con la corrección. Ver 25 herramientas y metadatos `authenticated`/`token-owner-scope` no acredita compatibilidad de sus argumentos ni acceso global. No se consultó el servidor desplegado: el desfase remoto es la explicación consistente con la reproducción, no una observación de tráfico real.

## Corrección y límites

- `queryVIDKARUserByUsername` (línea 1355) descubre el schema vigente y usa `username` si existe, o `query` en el contrato anterior. No cambia de herramienta ni reintenta ante errores de permisos.
- El fallback exige confirmación nativa y filtra username exacto sin distinguir mayúsculas. Comprueba hasta cuatro páginas de 50 resultados; si quedan páginas, falla explícitamente sin afirmar ausencia ni unicidad.
- El consentimiento solo se reutiliza dentro de esa misma consulta paginada, ligado a propietario y revisión. Logout, rotación y cancelación invalidan el flujo.
- `MCPCatalogQuery.swift` distingue schema incompatible, confirmación pendiente, autenticación y permiso denegado. Los errores nuevos tienen traducción española.
- No se modificaron backend, scopes, almacenamiento ni credenciales. `KeychainStore` conserva endpoint/token/owner; `verifyTokenOwner` verifica el propietario al configurar; cada petición lleva el Bearer nativo. SecureStore JS y la caché no autorizan la ejecución Siri.
- `react-download/mcp/auth.mjs:58` mantiene self/subordinados/admin principal; `server.mjs:76-87` exige identidad y confirmación. El descubrimiento no consulta perfiles.

## Validación

- Regresión roja antes del arreglo y verde después con transporte Swift real y HTTP/Keychain sustituidos por fixtures.
- `node --test tests/mcpQueryPolicy.test.cjs tests/mcpAppIntentsMetadata.test.cjs`: lógica, carreras de sesión, username antiguo/nuevo, exactitud, paginación, límite, cancelación, logout, errores HTTP/MCP y metadatos/localización.
- `npm run lint`: sin errores; 85 advertencias en archivos existentes.
- No se construyó ni instaló la aplicación para iPhone. Las pruebas compilan fuentes y recursos temporales; Siri end-to-end y accesibilidad real de Keychain con dispositivo bloqueado quedan pendientes.

Los cambios Swift necesitan un nuevo binario para llegar al dispositivo; una actualización JS/OTA no los aplica. Los cambios previos del usuario permanecen intactos.