# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## URLs de conexión VIDKAR

La app principal toma sus endpoints públicos desde `react-native-VIDKAR/.env`. Cambia `EXPO_PUBLIC_VIDKAR_BASE_URL` para apuntar el login/DDP, las rutas HTTP del backend y MCP a otro host. El DDP se deriva como `wss://<host>/websocket` cuando la base es HTTPS y `ws://<host>/websocket` cuando es HTTP; MCP se deriva como `<base>/mcp` y solo queda disponible con HTTPS.

HLS es un servicio separado y usa `EXPO_PUBLIC_HLS_SERVER_URL`. Los overrides `EXPO_PUBLIC_METEOR_URL` y `EXPO_PUBLIC_MCP_URL` son opcionales para instalaciones con rutas o hosts no convencionales. El archivo `.env.example` documenta las variables.

Las variables `EXPO_PUBLIC_*` son públicas y se incluyen en el bundle: aquí solo deben ir URLs, nunca tokens, contraseñas ni claves privadas. Expo las sustituye al iniciar Metro/compilar; después de editar `.env`, reinicia Metro. Para builds EAS/Codemagic configura las mismas variables en el entorno de build, porque el `.env` local está ignorado por Git. El dominio de Universal Links/AASA también debe estar configurado en Apple para el host publicado.

## Get started

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
Android, iOS anteriores y movimiento reducido mantienen la navegacion normal.
En Cubacel, el origen de zoom es un marco nativo no aplanable, de ancho completo
y 200 puntos de alto, tanto en el carrusel de Inicio como en el catalogo. La imagen
rellena ese marco sin depender de alturas porcentuales dentro de la lista horizontal;
el texto, los precios y el menu contextual permanecen fuera del origen de zoom.
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
