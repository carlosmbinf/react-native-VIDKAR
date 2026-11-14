# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## URLs de conexión VIDKAR

La app principal toma sus endpoints públicos desde `react-native-VIDKAR/.env`. Cambia `EXPO_PUBLIC_VIDKAR_BASE_URL` para apuntar el login/DDP, las rutas HTTP del backend y MCP a otro host. El DDP se deriva como `wss://<host>/websocket` cuando la base es HTTPS y `ws://<host>/websocket` cuando es HTTP; MCP se deriva como `<base>/mcp` y solo queda disponible con HTTPS.

HLS es un servicio separado y usa `EXPO_PUBLIC_HLS_SERVER_URL`. Los overrides `EXPO_PUBLIC_METEOR_URL` y `EXPO_PUBLIC_MCP_URL` son opcionales para instalaciones con rutas o hosts no convencionales. El archivo `.env.example` documenta las variables.

Las variables `EXPO_PUBLIC_*` son públicas y se incluyen en el bundle: aquí solo deben ir URLs, nunca tokens, contraseñas ni claves privadas. Expo las sustituye al iniciar Metro/compilar; después de editar `.env`, reinicia Metro. Para builds EAS/Codemagic configura las mismas variables en el entorno de build, porque el `.env` local está ignorado por Git. El dominio de Universal Links/AASA también debe estar configurado en Apple para el host publicado.

## Retornos de pagos en iPhone

El servidor excluye `/capture-order`, `/cancel-order` y los tres retornos
`/pago/success`, `/pago/failure`, `/pago/pending` de la asociación AASA.
Si iOS todavía entrega uno de esos enlaces a la app, `app/+native-intent.tsx`
lo envía a `payment-return` en lugar de descartarlo o abrir el inicio.
La pantalla carga el endpoint HTTPS en Safari integrado mediante
`expo-web-browser`; no usa `Linking.openURL`, que puede activar otra vez la app.
Conserva el token de PayPal, valida dominio/ruta y evita repetir la apertura
de la misma confirmación durante la sesión.

Esto no confirma el pago en JavaScript ni genera una nueva orden: la captura
sigue ejecutándose en el backend de PayPal y Mercado Pago sigue usando su
webhook. Cerrar Safari no significa que el pago haya sido confirmado.
Un error requiere consultar las compras antes de volver a pagar.
La app instalada debe incorporar estos cambios; actualizar únicamente AASA
no cambia el manejo de enlaces de una versión anterior. Mantener también
el backend que muestra el resultado de PayPal sin redirigir automáticamente
a la portada.

Validación: `node --experimental-default-type=module --test tests/universalLinks.test.js tests/paymentReturn.test.js`
y `npm run lint`. La prueba final requiere abrir el retorno desde fuera de la
app en un iPhone, tanto con la app cerrada como abierta, y verificar el estado
del pedido en el servidor.

## Get started

### Excepciones por producto

**Opciones privadas → Excepciones** está disponible únicamente para el Administrador Principal, también al abrir la ruta directamente. La tabla muestra el producto, la cantidad de errores y la fecha del último registro. Tocar un agrupamiento abre una tabla paginada de sus registros; tocar una fila muestra contexto, validaciones, ubicación del error y causas, con la misma información sanitizada del FE web. La búsqueda por identificador de producto, publicación, pedido, evento, usuario o error conserva los filtros al abrir un agrupamiento.

**No requiere cambios ni despliegue de backend.** Usa únicamente `integraciones.excepciones.listar` y `integraciones.excepciones.detalle`, ya utilizados por el FE web y restringidos al principal en el servidor. La app carga todas las páginas de la búsqueda y consulta los contextos con hasta cuatro solicitudes simultáneas, porque el listado existente no incluye el producto local. Muestra el progreso y agrupa **antes** de paginar las tablas localmente; abrir un producto o pasar de página no vuelve a descargar los registros.

Se agrupa por identificador local cuando el contexto lo proporciona. Los registros sin ese identificador se unen al producto si otra excepción de la búsqueda vincula inequívocamente su publicación con ese producto; de lo contrario se muestran por publicación. No se inventan asociaciones ni nombres ausentes del contrato actual. Las incidencias sin producto quedan en **Sin producto identificado**, sin descartarse. Actualizar vuelve a consultar los registros y mantiene el agrupamiento seleccionado si sigue disponible. Si una consulta falla, la carga cambia durante la paginación o la búsqueda supera el límite existente de 10.000 páginas, se muestra un error explícito, sin presentar conteos parciales como completos. El listado de tarjetas del FE web no cambia.

Validación enfocada: `node --test tests/integrationExceptions.test.js` y `npm run lint`.

### Direcciones guardadas en el carrito

El paso Ubicación de las compras COMERCIO comparte la libreta privada de direcciones de la cuenta con `comercio-web` y el MCP. Permite elegir una guardada o crear una con el buscador, mapa o ubicación actual, guardarla opcionalmente con un nombre, marcarla como predeterminada y eliminarla con confirmación. El carrito conserva su entrega actual al abrirse; si no tiene una configurada, preselecciona la predeterminada.

Se reutilizan los métodos Meteor `comercio.deliveryAddresses.list`, `.save`, `.use`, `.setDefault` y `.remove`; requieren el backend con esa funcionalidad. El alta de una ubicación de un solo uso conserva `carrito.actualizarUbicacion`. La dirección confirmada se aplica al cálculo de envío y a los datos del pedido mientras llega la actualización reactiva del carrito. Los pedidos de otros servicios conservan su recorrido sin ubicación.

Validación enfocada: `node --experimental-default-type=module --test tests/commerceDeliveryAddresses.test.js`.

### Apariencia del modo empresa

El grupo `app/(empresa)` lee en tiempo real `comercio.webAppearance` de la cuenta propietaria de la sesión. Los cambios publicados en **Modo empresa → Apariencia** de `comercio-web` se adaptan a las pantallas existentes de la app: paletas claras/oscuras, fondo general, tarjetas, controles, cabeceras e imágenes, logo y nombre del menú, portada de tiendas y preparación, y fondo del pie del menú.

La navegación, dimensiones de listas y organización móvil se mantienen. Esquinas y sombras de las tarjetas principales y las fuentes serif/monoespaciadas se adaptan a las opciones compatibles de cada plataforma. Los estados operativos y errores conservan sus colores semánticos. El tema se limita a este grupo; al salir del modo empresa se utiliza el tema global. Sin configuración visual, al restaurar el diseño original o si la publicación no está disponible, se conservan los estilos anteriores de la app.

Se reutilizan la colección `COMERCIO_webAppearance` y la publicación existentes; la app no guarda ni edita esta configuración. Validación del contrato y del fallback: `node --experimental-default-type=module --test tests/commerceAppearance.test.js`.

### Arranque local

La app usa Expo SDK 58, React Native 0.88.1 y React 19.3.0. Mantener los
modulos Expo, Expo Router, Reanimated y Worklets alineados con el SDK; actualizar
solo `expo` puede romper Metro con errores como
`Unable to resolve "react-native/asset-registry"`.

Despues de cambiar dependencias, ejecutar `npx expo install --check`. Metro usa
el registro de assets del SDK sin aliases ni parches de React Native. La
resolucion personalizada del contexto web usa el export publico
`expo-router/_ctx` y sigue excluyendo rutas nativas.

Al actualizar desde SDK 57, reconstruir el development build; un binario anterior
no incorpora los nuevos modulos nativos. En macOS, ejecutar
`npx expo prebuild --platform ios` y `npx expo run:ios`. El plugin de escenas
conserva las opciones del arranque en frio y hereda de `ExpoAppSceneDelegate`
los eventos de ciclo de vida y los enlaces en caliente de SDK 58/React Native
0.88. Windows permite validar bundles, pero no generar ni compilar el proyecto
iOS con Expo/Xcode.

Validacion enfocada: `node --test tests/metroConfig.test.cjs tests/iosSceneLifecycle.test.cjs`.
La prueba Swift requiere macOS/Xcode.

### Compilacion Android en Codemagic

`expo-build-properties` configura `compileSdkVersion: 37` y Build Tools `37.0.0`,
alineados con React Native 0.88 y los AAR de Expo SDK 58/Compose que requieren API
37. Se conservan `targetSdkVersion: 36` y `minSdkVersion: 26`: este cambio no
activa comportamientos nuevos de Android ni excluye dispositivos adicionales.
La configuracion se aplica a las propiedades compartidas de Gradle durante
prebuild, incluido el modulo `:expo`; no basta con cambiar solo `:app`.

AGP 9 no admite `getDefaultProguardFile('proguard-android.txt')`. El script
`scripts/patch-vlc-media-player.js`, ejecutado por `postinstall` y `npm run build`,
sustituye esa referencia en el Gradle de VLC por `proguard-android-optimize.txt`.
Conserva `minifyEnabled` y las reglas propias de VLC; no cambia las versiones de
Gradle ni AGP. El parche Android es independiente del parche JavaScript, es
idempotente y falla explicitamente si falta el archivo o cambia el bloque esperado.
Codemagic lo reaplica durante la instalacion, incluso con `node_modules` en cache,
antes de regenerar Android con Expo prebuild.

Validacion: `node --test tests/androidBuildProperties.test.cjs tests/vlcAndroidGradle.test.cjs`.
La compilacion completa requiere el SDK Android: ejecutar `bundleRelease` con
el wrapper de Gradle del proyecto generado, o repetir el workflow de Codemagic.

### Compatibilidad de React Native

React Native 0.88 elimina `InteractionManager`. Los trabajos diferidos de la app
usan `requestIdleCallback` y cancelan la tarea al desmontar cuando corresponde.
`postinstall` aplica `scripts/patch-meteorrn-scheduler.js` a `@meteorrn/core`
2.9.1 para usar el batching publico y el scheduler idle, sin acceder a APIs
eliminadas. El parche es idempotente y falla si cambia el bloque esperado.
Despues de aplicarlo, reiniciar Metro con `--clear`.
Validacion: `node --test tests/meteorScheduler.test.cjs tests/metroConfig.test.cjs`.

Peliculas, productos de comercio y Cubacel usan el zoom nativo compartido de
Expo en iOS 18 o posterior: solo la imagen es el origen en la tarjeta y solo
la imagen principal es el destino en el detalle. El texto y los controles quedan
fuera de la transicion. Las tarjetas conservan su respuesta de presion al tocar.
Inicio reutiliza las mismas tarjetas que los catalogos. Sus contenedores de entrada
eliminan las transformaciones al terminar, para no acumular perspectivas 3D sobre
la presion ni sobre el marco de la imagen durante el zoom de apertura y regreso.
En nativo, `/` redirige a `/(normal)/Main`: el inicio y los detalles deben vivir
en el mismo Stack para que Expo asocie el zoom a la pantalla de destino, no al
grupo padre. `app/(normal)/Main.native.tsx` conserva el arranque de sesion, login,
control de version, modos por rol, notificaciones y enlaces; estos servicios
permanecen montados debajo del detalle al abrirlo y regresar. Web conserva su
entrada y su variante de Main. Validacion del Stack con el reducer de Expo:
`node --test tests/homeStackNavigation.test.cjs`.
Android, iOS anteriores y movimiento reducido mantienen la navegacion normal.
El catalogo de Comercio conserva sus suscripciones al abrir un producto y volver:
no vacia las filas ni reconstruye las selecciones por el cambio de foco.
Las actualizaciones reactivas de Meteor y el refresco manual siguen activos.
Validacion: `node --test tests/commerceCatalogFocus.test.cjs`.
En desarrollo, `[CatalogImageZoom]` registra origen/destino y si el enlace llevo
la referencia de zoom hasta la ruta correcta. No registra identificadores ni datos
del producto y no se ejecuta en produccion. Para comparar Inicio y catalogos,
abrir el mismo producto desde ambos y revisar `hasImageSource` y
`matchesDestination`: ambos deben ser `true`. Esto comprueba el contrato de
navegacion, no el resultado visual de UIKit.
Validacion: `node --test tests/moviePosterZoom.test.cjs tests/commerceProductCards.test.cjs tests/cubacelZoomTransition.test.cjs tests/cinemaMotion.test.cjs`.
El contenedor de capas del poster usa `collapsable={false}`: el zoom nativo solo
acepta un hijo y el aplanado de Fabric no debe separar fondo, imagen e indicadores.
El detalle de pelicula muestra Reproducir y Trailer en un footer fijo con blur,
como Cubacel, sin duplicarlas en el header ni el cuerpo. Se respeta el area segura
y se reserva la altura medida del footer al final del scroll. Se deshabilitan durante
la carga o cuando falta el enlace. Validacion: `node --test tests/movieDetailFooter.test.cjs`.
Los datos de año, formato, tamaño, generos y reparto usan capsulas translucidas
con etiqueta y valor como los precios de Cubacel; el texto largo se ajusta sin
truncarse y la sinopsis conserva su bloque multilinea.
La tarjeta de sinopsis usa los colores de superficie y texto del tema activo.
En modo claro, las capsulas del cuerpo tambien se adaptan; las de la imagen
mantienen fondo translucido y texto blanco para conservar el contraste.

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start --clear
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
