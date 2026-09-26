# Diagnóstico: VIDKAR no aparece en Atajos

## Actualización: búsqueda estable

La implementación actual añade `VIDKARSearchInAppIntent` iOS 27 sin planner.
La extracción dirigida confirma **8 acciones y 7 shortcuts**. El validador del
bundle exige además schema `SystemSearchInAppIntent`, `criteria`, scopes
`general/movies/tv`, foreground y autenticación local. Solo
`VIDKARAskQuestionIntent` debe permanecer ausente. Véase [alcance y límites](./siri-ai-integration.md).
El diagnóstico histórico siguiente no certifica la IPA del dispositivo.

## IPA inspeccionadas — 25 de septiembre de 2026

Inspección de solo lectura del ZIP y del `Info.plist`/metadata del bundle principal;
no se modificó ni volvió a firmar ningún archivo. No se presupone cuál está instalada.

| Archivo | Versión / build | SDK | Acciones VIDKAR / shortcuts | Búsqueda integrada |
| --- | --- | --- | --- | --- |
| `Vidkar.ipa` | 4.0.1143 / 1143 | iPhoneOS 26.4 | 0 / 0 | Ausente |
| `Vidkar-2.ipa` | 4.0.1168 / 1168 | iPhoneOS 27.0 | 7 / 7 | Ausente |

- 1143 contiene únicamente acciones Expo de widgets/Live Activities: no dispone
  de las acciones VIDKAR en el bundle principal. Esto explica su ausencia en ese
  artefacto, pero no identifica por sí solo la versión instalada en el iPhone.
- 1168 contiene las siete acciones con `isDiscoverable: true`, el provider
  `VidkarAppShortcutsProvider` y nueve frases. No contiene `VIDKARSearchInAppIntent`.
- Ambas declaran idioma de desarrollo `en`. En 1168 las frases fuente son españolas,
  pero no hay recursos `.lproj` del bundle principal. Tiene NLU genérico; eso no
  demuestra reconocimiento español. La falta de localización explícita es una
  carencia comprobada, no una causa demostrada de ausencia en Atajos.
- La implementación nueva conserva `en/Base`, añade catálogos españoles al target
  principal y comprueba recursos compilados `es.lproj/AppShortcuts.strings` y
  `Localizable.strings`. El extractor local también genera `es.lproj/nlu.appintents`.
  El validador de Codemagic rechaza un nuevo artefacto sin schema o traducciones.
- SHA-256 1143: `cee831c51256789b9836c4fa4489e24ca465dec496dc2a2a7e7b09808af1594d`.
- SHA-256 1168: `bff33e0ea72efe8f888bc0fb2f700075cb541bfbac741d5b583b6c6846fbd244`.

Ninguna de estas IPA incorpora los cambios de esta tarea. Se necesita un nuevo
build nativo y comprobar su número en el dispositivo; una OTA no es suficiente.

## Resultado local previo — 25 de septiembre de 2026

No se ha reproducido la ausencia total con los fuentes actuales y Xcode 27.0
(27A5237l). En esta fase inicial aún no se habían inspeccionado las IPA anteriores;
**la causa del fallo en el dispositivo sigue pendiente de cotejar su build instalado**.

- El módulo local genera siete acciones, cinco entidades y un enum.
- El harness de `tests/mcpAppIntentsMetadata.test.cjs` compila las fuentes reales
  (excepto el bridge Expo), enlaza el pod estático y un ejecutable iOS arm64, y
  ejecuta `appintentsmetadataprocessor` para ambos módulos. El plugin genera el
  package y provider de la app. La salida combinada tiene siete acciones con
  `isDiscoverable: true` y siete shortcuts con frases.
- La lista estática de Xcode apunta a
  `VidkarMCP.appintents/Metadata.appintents/extract.actionsdata`, no al directorio.
  El harness reproduce ese contrato. Buscar nombres en el JSON no basta:
  pueden existir referencias en shortcuts sin definiciones en `actions`.
- El pod CocoaPods real compiló en Release/arm64 simulator y ejecutó
  `ExtractAppIntentsMetadata`. Primero hubo que actualizar Pods para incluir los
  helpers Swift actuales, usando el plugin existente de compatibilidad
  `objectVersion` para desbloquear `pod install`.
- `AppDelegate.swift` está en la lista de fuentes del target principal y las
  listas de dependencias de ese target incluyen los metadatos de `VidkarMCP`.
- El build completo local está bloqueado por el `AppIcon` sin contenido aplicable
  de `VidkarWatch`. No se modificó Watch ni se obtuvo una app completa instalada.

El plugin solo agrega sus bloques cuando no existen los marcadores. Un prebuild
incremental puede conservar bloques antiguos; el workflow Codemagic actual
elimina `ios/` antes de prebuild. No se ha demostrado que ese caso explique el
build publicado. No se cambiaron targets, firma, permisos ni contratos MCP.

## Dos síntomas diferentes

1. **Cero acciones en Atajos**: revisar binario nativo, target, extracción,
   empaquetado y registro en el sistema. No requiere un token MCP para descubrir
   los nombres de las acciones; el token se necesita al ejecutarlas.
2. **Siri dice que no admite búsqueda integrada**: no demuestra el punto anterior.
  La búsqueda integrada estable requiere la nueva `VIDKARSearchInAppIntent`,
  iOS 27 y disponibilidad/selección del sistema. Los siete shortcuts anteriores
  siguen separados. `VIDKARAskQuestionIntent` conserva la bandera experimental
  desactivada por la evaluación 5/8; no habilitar el planner para corregir descubrimiento.

## Verificación antes de publicar

- `npm run test:mcp:ios`: compilación, políticas y extracción real sin servicios
  externos. La prueba antigua standalone sigue siendo útil, pero no valida
  metadatos por sí sola.
- `scripts/validate-app-intents-metadata.cjs` recibe la ruta del `.app` principal.
  Exige `Metadata.appintents/extract.actionsdata`, las ocho acciones descubribles,
  los siete shortcuts/frases anteriores, el contrato del schema estable y la
  ausencia del intent de preguntas experimental. Comprueba además las nueve
  frases españolas compiladas, sus placeholders y textos de las acciones.
  El formato comprobado corresponde al Xcode 27 fijado en Codemagic; si Apple lo
  cambia, fallar y revisar, no saltarse el control.
- Ambos workflows iOS validan el `.app` del xcarchive **y** `Payload/Vidkar.app`
  de la IPA exportada antes de publicarla. No modifican el contenido firmado.

## Qué falta en el dispositivo afectado

1. Obtener versión/build exactos instalados, versión de iOS e idioma de Siri y
   origen de instalación (TestFlight, App Store o build de desarrollo). Una OTA
   no instala cambios Swift ni metadatos nuevos.
2. Comparar ese build con el commit/log de Codemagic y verificar la IPA de ese
   mismo build con el validador; no usar como evidencia otra compilación.
3. En iOS 17+, abrir la app nativa una vez y comprobar Atajos → nueva acción →
   Apps → VIDKAR y búsqueda por «Consulta MCP». Distinguir esa lista del listado
   de shortcuts sugeridos o una frase libre de Siri.
4. Si la IPA correcta contiene los metadatos y sigue sin aparecer, investigar
   registro/discoverability del dispositivo, ajustes/restricciones de Siri y
   Atajos, e instalación del build correcto. No borrar la app como primer paso:
   puede perder datos locales.
5. Solo después de descubrir las acciones, configurar MCP y probar ejecución
   autorizada. Estos tests no invocan MCP ni acceden a datos de producción.
