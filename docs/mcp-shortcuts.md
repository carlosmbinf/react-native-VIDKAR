# MCP de VIDKAR desde Atajos

## Arquitectura

La app iOS es únicamente cliente MCP. No usa MongoDB, credenciales de servidor ni el token de sesión Meteor para consultar datos.

```text
Atajos → VIDKARQueryIntent → Streamable HTTP → https://www.vidkar.com/mcp
```

El intent genérico recibe `toolName` y `argumentsJSON`, ejecuta `tools/call` y devuelve un `String` mediante `ReturnsValue<String>`.

También existe **Ver herramientas de VIDKAR** (`VIDKARToolCatalogIntent`). Devuelve un JSON dinámico con `name`, `description` e `inputSchema` de cada tool descubierta mediante `tools/list`.

## Token dinámico

1. En la web de VIDKAR, abre **Acceso MCP de VIDKAR**.
2. Pulsa **Crear token MCP**. El método Meteor `mcp.tokens.create` genera un token aleatorio.
3. El token completo se muestra una sola vez. El servidor conserva solo su hash SHA-256.
4. En la app iOS abre **Siri y MCP de VIDKAR**.
5. Pega el token en el campo seguro y pulsa **Probar conexión MCP**.

El token se guarda en Keychain. No está en `app.json`, el bundle, el código fuente, logs ni variables públicas. Si se revoca o se expone, revócalo desde la web y crea otro.

## Herramientas y argumentos

**Actualizar herramientas** ejecuta `tools/list` y muestra nombre, descripción y schema dinámicos. No hay un App Intent por herramienta.

En Atajos se puede encadenar **Ver herramientas de VIDKAR** con una acción de IA: se entrega el catálogo y la petición del usuario (por ejemplo, “quiero saber todos los usuarios”), y la IA puede producir el `toolName` y `argumentsJSON` para la acción **Consultar VIDKAR**. La app no inventa esa selección semántica ni contiene una lista fija de tools.

Ejemplo para `get_users`:

```json
{"limit":100,"offset":0,"sort":"newest"}
```

Ejemplo para `get_sales`:

```json
{"period":"today","paidOnly":true}
```

El intent valida que `argumentsJSON` sea un objeto JSON antes de llamar al servidor.

## Resultado de Atajos

El valor de salida es exactamente el texto del primer elemento `content` de tipo `text` devuelto por `tools/call`. Por ejemplo, si MCP entrega:

```json
{"success":true,"users":[...]}
```

Atajos recibe esa misma cadena y puede encadenarla con **Vista rápida**, **Mostrar resultado** u otras acciones.

Los errores HTTP, JSON-RPC, `isError`, token ausente/revocado, timeout, desconexión, herramienta inexistente y respuesta inválida se devuelven como errores legibles del intent.

## Pruebas locales

Desde este directorio:

- `npm run test:mcp`: prueba `get_users`, `get_sales`, JSON inválido, preservación exacta, JSON-RPC, `isError` y HTTP.
- `npm run lint`: lint del proyecto Expo.

Las pruebas no usan tokens reales ni el servidor de producción.

## Build en iPhone

1. Ejecuta `npm install`.
2. Ejecuta `npx pod-install ios` si cambió el módulo nativo.
3. Genera un development build o build de distribución; Expo Go no incluye este módulo nativo ni App Intents.
4. Instala la app en un iPhone con iOS compatible.
5. Configura el token en la pantalla MCP.
6. Abre **Atajos**, añade **Consultar VIDKAR**, selecciona una herramienta y proporciona el objeto JSON de argumentos.

Para el flujo asistido, añade primero **Ver herramientas de VIDKAR**, después una acción de IA que seleccione método y argumentos, y finalmente **Consultar VIDKAR** con esos valores.

El build completo de la app debe incluir el target `VidkarMCP` y la metadata de App Intents. La compilación aislada del pod se puede comprobar con el target `VidkarMCP` para `iphonesimulator`.
