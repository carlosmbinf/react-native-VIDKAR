# Probar Siri AI Developer Preview en VIDKAR

La prueba añade dos herramientas nativas de iOS 27.3 con `@AppIntent(.tool)`.
El prebuild de iOS las genera al definir `VIDKAR_SIRI_AI_PREVIEW=1`. Solo se
compilan en Debug y usan el target principal de VIDKAR. El flujo normal de
Codemagic con Xcode 27.0 sigue usando los intents y recursos actuales.

Apple indica que incluir cualquier tool intent desplaza los App Shortcuts
existentes en Siri para esa compilación. Los atajos siguen disponibles en otras
superficies como Spotlight. Usa esta variante de forma local para la prueba.
[Documentación de Apple sobre tool intents](https://developer.apple.com/documentation/appintents/bringing-custom-actions-and-content-to-siri)

## Instalar en iPhone

1. Instala [Xcode 27.3 beta 2](https://developer.apple.com/download/) en paralelo
   con tu Xcode habitual. Usa un iPhone compatible con Apple Intelligence y
   [iOS 27.3 beta 2](https://developer.apple.com/news/releases/). Activa
   Apple Intelligence y Siri en un idioma admitido, como español. Para ejecutar
   desde Xcode, activa el modo de desarrollador del iPhone cuando el sistema lo pida.
2. Desde una copia de trabajo independiente del proyecto, con las dependencias
   instaladas (`npm ci`), ejecuta estos comandos. Ajusta la ruta de la beta al
   nombre real de tu instalación. `DEVELOPER_DIR` solo aplica a esta sesión de
   terminal.

   ```bash
   export DEVELOPER_DIR="/Applications/Xcode-beta.app/Contents/Developer"
   xcrun --sdk iphoneos --show-sdk-version
   VIDKAR_SIRI_AI_PREVIEW=1 npx expo prebuild --platform ios --no-install
   (cd ios && pod install)
   open -a "${DEVELOPER_DIR%/Contents/Developer}" ios/Vidkar.xcworkspace
   ```

3. El SDK debe indicar `27.3`. En Xcode selecciona el esquema **Vidkar**, el
   iPhone físico y la configuración **Debug** para Run. Usa la firma de
   desarrollo habitual de VIDKAR. La compilación usa `com.vidkar`, así que se
   instala sobre la app existente si la firma es compatible. Arranca Metro con
   `npx expo start` si lo necesita el build Debug y abre VIDKAR una vez.
4. Para la búsqueda real, inicia sesión y revisa la configuración MCP existente.
   Después vuelve a la pantalla de inicio del iPhone y menciona «VIDKAR» en la
   petición para que Siri encuentre la herramienta con la app en segundo plano.
   La prueba local de diagnóstico no necesita token ni conexión al backend.

| Frase para Siri | Resultado esperado |
| --- | --- |
| «En VIDKAR, dime el código de diagnóstico de la integración con Siri» | Responde «Faro Azul 27». VIDKAR permanece en segundo plano. |
| «En VIDKAR, ¿qué productos de Comercio coinciden con cable USB-C?» | Devuelve hasta cinco nombres del catálogo autorizado. Con el iPhone bloqueado, pide desbloquearlo. |
| «En VIDKAR, busca productos de Comercio con el nombre ZZXQ-7793» | Informa que no hay coincidencias. VIDKAR permanece en segundo plano. |

Si Siri no elige la herramienta, busca las dos acciones por título bajo VIDKAR
en Atajos y ejecútalas con el iPhone desbloqueado. Eso ayuda a separar el registro
del intent de la selección por lenguaje natural. Después prueba un breakpoint en
el `perform()` correspondiente o revisa el diagnóstico en Siri Integration
Advisor de Xcode. Para la búsqueda real, un error de red o de permisos debe
mostrar un error de consulta en lugar de una lista vacía.

Para retirar la prueba, repite `npx expo prebuild --platform ios --no-install`
sin la variable y vuelve a compilar e instalar. El plugin retira su bloque
generado sin requerir `--clean`.

[Requisitos de Siri AI Developer Preview](https://developer.apple.com/documentation/appintents/siri-ai-developer-preview) ·
[Verificación de App Intents](https://developer.apple.com/documentation/appintents/verifying-your-app-intents-implementation)
