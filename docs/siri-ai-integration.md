# Siri AI y MCP dinámico — investigación y prototipo

## Estado: no habilitado para producción

Revisión del 25 de septiembre de 2026 con documentación Apple y SDK Xcode 27.
El prototipo compila, pero la evaluación del modelo local no alcanza el mínimo funcional:
**5/8 casos**, incluidos errores en búsquedas generales y temas de cursos.
Las nuevas intents están detrás de `VIDKAR_EXPERIMENTAL_NATURAL_LANGUAGE`.
La configuración de la app y Codemagic **no definen** esa bandera; las siete intents anteriores permanecen activas.
No se debe activar el prototipo simplemente porque compile.

## Qué documenta Apple

- [Apple Intelligence and Siri AI](https://developer.apple.com/documentation/appintents/apple-intelligence-and-siri-ai): schemas para acciones/contenido, entidades, Spotlight semántico, contexto de pantalla y donaciones.
- [Dominios de schemas](https://developer.apple.com/documentation/appintents/app-schema-domains): distinguir dominios para Siri AI de los que solo funcionan en Atajos. No inventar schemas de películas, cursos, usuarios o MCP.
- [System and in-app search](https://developer.apple.com/documentation/appintents/app-schema-domain-system-and-in-app-search): búsqueda general aplicable a diferentes tipos de apps.
- [`.system.searchInApp`](https://developer.apple.com/documentation/appintents/appschema/systemintent/searchinapp): schema iOS 27; sustituye `.system.search`, deprecado en iOS 27. Recibe `StringSearchCriteria` y su objetivo es navegar a resultados en la app, no ser un agente MCP headless.
- [ShowInAppSearchResultsIntent](https://developer.apple.com/documentation/appintents/showinappsearchresultsintent): ejecución en la app, foreground, ámbito de búsqueda `.general`.
- [Contexto en pantalla](https://developer.apple.com/documentation/appintents/providing-contextual-cues-to-apple-intelligence-and-siri): asociar entidades realmente visibles; React Native no entrega ese contexto automáticamente.
- [Entidades en Spotlight](https://developer.apple.com/documentation/appintents/making-app-entities-available-in-spotlight): `IndexedEntity`, índice con nombre, reindexación y apertura. No indexar todos los datos privados por conveniencia.

El sistema puede interpretar variaciones de lenguaje para los contratos que reconoce.
No se encontró en estas APIs una operación para registrar `tools/list` como herramientas dinámicas del razonamiento interno de Siri.
Devolver un JSON con herramientas desde una intent tampoco garantiza que Siri elija otra intent y construya sus argumentos.
Los tipos de intent/schema se compilan; las instancias de contenido y las consultas pueden ser dinámicas.

## Arquitectura propuesta

Siri AI → schema de búsqueda general → interpretación en la app → catálogo MCP → validación → confirmación → llamada autorizada → resultados.

Dos responsabilidades distintas:

1. Siri selecciona la capacidad de búsqueda de VIDKAR y proporciona los criterios. No es necesario que la frase diga «película».
2. Para traducir preguntas arbitrarias a distintas herramientas MCP hace falta un intérprete adicional o contratos nativos específicos que Siri pueda entender. Ese intérprete no hereda automáticamente la conversación de Siri.

El prototipo usa [Foundation Models](https://developer.apple.com/documentation/foundationmodels) local, sin proveedor externo ni claves nuevas. No es el modelo/razonamiento interno de Siri.
La [generación guiada dinámica](https://developer.apple.com/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation) restringe nombres/tipos, pero no garantiza que los valores correspondan a lo pedido.
Apple también documenta [tool calling](https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling); no debe confundirse con publicar herramientas al sistema Siri.

## Piezas del prototipo

- `MCPNaturalLanguagePlanner.swift`: descubre el catálogo actual, selecciona herramienta/campos y genera argumentos con schemas Apple construidos en runtime; sin tabla fija de herramientas.
- `MCPQueryPolicy.swift`: validación de tipos/enums/límites y rechazo de schemas no soportados, eliminación de `confirmed` generado, marcador de propietario resuelto por código, resultados temporales acotados.
- `VIDKARSearchInAppIntent`: schema oficial iOS 27; muestra resultados en la app.
- `VIDKARAskQuestionIntent`: texto libre para Atajos desde iOS 26, con JSON y diálogo. No garantiza invocación libre por Siri.
- `MCPTransport`: revision de sesión comprobada antes/después de las llamadas; rechazo si cambia la cuenta o configuración; confirmación nativa para datos privados.
- Resultados en memoria durante 120 segundos, máximo tres, ligados al propietario y revisión; sin contenido sensible en deep links ni persistencia en disco. Si cambia el proceso, el resultado deja de estar disponible.
- `vidkar://search?resultId=<UUID>` abre la pantalla existente y lee el resultado, sin volver a ejecutar la consulta ni renovar el vencimiento.
- El MCP conserva sus contratos. Solo se amplía el listado de `course` sin texto y se aclaran metadatos de consentimiento/Proxy/VPN.

No se implementó indexación masiva, historial conversacional, contexto visual ni un modelo externo. No se añadieron compras ni mutaciones.
La salida verbal de herramientas no tabulares sigue siendo una confirmación breve con resultado estructurado, no un resumen financiero inventado.

## Pruebas y resultado observado

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

## Decisión pendiente

Elegir entre:

1. **Integración nativa acotada:** schema general + entidades/queries, manteniendo MCP como fuente de datos, sin prometer interpretación de cualquier herramienta. Menos flexible pero no depende del planificador local experimental.
2. **Intérprete más capaz:** evaluar otro modelo Apple o un modelo servidor explícitamente aprobado con catálogo dinámico. Requiere definir privacidad, coste, disponibilidad, latencia y pruebas antes de activar.

No hay base para prometer «100 % con Siri AI». La mejora debe medirse con frases de prueba y datos autorizados, y no habilitarse si falla los casos básicos.