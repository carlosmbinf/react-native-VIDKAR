# Probar Siri AI Developer Preview en VIDKAR

La prueba usa `@AppIntent(.tool)` para que Siri seleccione el catálogo de
Comercio por intención, con el artículo como parámetro opcional. Usa la sesión
MCP configurada y la herramienta de lectura `list_commerce_products`. Cada
consulta trae hasta cinco productos reales y devuelve entidades con tarjetas de
Siri. El prebuild de Expo la activa en Debug y Release para el target
principal con `VIDKAR_SIRI_AI_PREVIEW=1`. Requiere el SDK de iOS 27.3 en Xcode. El workflow
`expo_full_release` desactiva la prueba antes del prebuild.

Apple indica que incluir cualquier tool intent desplaza los App Shortcuts
existentes en Siri para esa compilación. Los atajos siguen disponibles en otras
superficies como Spotlight.
[Documentación de Apple sobre tool intents](https://developer.apple.com/documentation/appintents/bringing-custom-actions-and-content-to-siri)

## Probar desde TestFlight interno

1. En Codemagic selecciona la rama `master` y ejecuta
   **Expo iOS (TestFlight interno · Siri AI)**. Usa Xcode 27.3 y valida que el
   archivo y la IPA exportada contengan la herramienta de catálogo antes de subirla.
2. En App Store Connect, agrega el build a tu grupo de **pruebas internas** si
   el grupo no distribuye automáticamente. Apple habilita Siri AI Developer
   Preview en TestFlight para testers internos.
3. Instala el build con TestFlight en un iPhone compatible con Apple Intelligence
   y iOS 27.3 beta. Activa Apple Intelligence y Siri en un idioma admitido.
   Abre VIDKAR una vez, vuelve a Inicio y prueba las frases de abajo.

## Alternativa con Xcode

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

## Frases de prueba

Para la búsqueda real, inicia sesión y revisa la configuración MCP existente.
Vuelve a Inicio y menciona «VIDKAR» en la primera petición si la app está
en segundo plano. Siri interpreta la solicitud y extrae el término de búsqueda
cuando corresponde. Estas frases son ejemplos, no atajos registrados.

| Frase para Siri | Resultado esperado |
| --- | --- |
| «Siri, ¿qué hay en la tienda de VIDKAR?» | Devuelve hasta cinco productos reales sin pedir un término. |
| «Siri, ¿en VIDKAR tienen algún mando para PS5?» | Busca el artículo y devuelve hasta cinco productos con tienda y precio, si están disponibles. |
| «¿Y algún cable USB-C?» en la misma conversación | Siri puede continuar con el contexto de VIDKAR. Si pierde el contexto, menciona la app en la petición. |
| «En VIDKAR, busca productos de Comercio con el nombre ZZXQ-7793» | Informa que no hay coincidencias. VIDKAR permanece en segundo plano. |

Si Siri no elige la herramienta, busca **Explora el catálogo de productos de
VIDKAR** en Atajos y ejecútala con el iPhone desbloqueado. Eso ayuda a separar el registro
del intent de la selección por lenguaje natural. Después prueba un breakpoint en
el `perform()` correspondiente o revisa el diagnóstico en Siri Integration
Advisor de Xcode. Para la búsqueda real, un error de red o de permisos debe
mostrar un error de consulta en lugar de una lista vacía.

Para retirar la prueba de un build local, ejecuta
`VIDKAR_SIRI_AI_PREVIEW=0 npx expo prebuild --platform ios --no-install`
y vuelve a compilar e instalar.

[Requisitos de Siri AI Developer Preview](https://developer.apple.com/documentation/appintents/siri-ai-developer-preview) ·
[Verificación de App Intents](https://developer.apple.com/documentation/appintents/verifying-your-app-intents-implementation)
