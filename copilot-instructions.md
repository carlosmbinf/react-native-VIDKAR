<!-- ...existing code... -->

---

## Resumen técnico – Navegación Real en EmpresaNavigator (Stack.Navigator + NavigationContainer)

- **Problema Identificado**: EmpresaNavigator usaba navegación manual con estados (`currentScreen`, `setCurrentScreen`) en lugar de React Navigation real, causando:
  - Sin deep linking funcional
  - Sin historial de navegación
  - Sin parámetros de ruta tipados
  - Lógica duplicada para gestión de pantallas

- **Solución Implementada**:
  - **NavigationContainer independiente**: `independent={true}` para coexistir con el navigator principal de App.js
  - **Stack.Navigator** con 3 pantallas registradas:
    - `MisTiendas`: Listado de tiendas del usuario
    - `TiendaDetail`: Detalle de tienda con productos
    - `ProductoForm`: Creación/edición de productos
  - **Deep linking**: URLs `vidkar://empresa/tienda/:tiendaId` y `vidkar://empresa/producto/:productoId?`
  - **Drawer lateral**: Integrado con navegación usando `useNavigation()` hook

- **Arquitectura de Componentes**:
  ```javascript
  EmpresaNavigator (root)
  └── NavigationContainer (independent)
      └── Drawer (lateral)
          ├── EmpresaDrawerContent (content del drawer)
          └── EmpresaStackNavigator (Stack Navigator)
              ├── MisTiendas
              ├── TiendaDetail
              └── ProductoForm
  ```

- **Integración con Drawer**:
  - **Error inicial**: `useNavigation()` en EmpresaDrawerContent fallaba porque se renderizaba fuera del NavigationContainer
  - **Solución**: Extraer `EmpresaStackNavigator` como componente interno que SÍ tiene acceso al contexto de navegación
  - **Validación defensiva**: Try-catch en `useNavigation()` con prop `navigationReady` para evitar crashes durante montaje inicial

- **Navegación entre pantallas**:
  - **MisTiendas → TiendaDetail**: 
    ```javascript
    navigation.navigate('TiendaDetail', { tienda, tiendaId: tienda._id });
    ```
  - **TiendaDetail → ProductoForm**: 
    ```javascript
    navigation.navigate('ProductoForm', { 
      producto: producto || { idTienda: tienda._id },
      tienda 
    });
    ```
  - **Retroceso**: `navigation.goBack()` en headers personalizados

- **Headers Personalizados**:
  - **Global**: Appbar en `EmpresaStackNavigator` con menú drawer y notificaciones
  - **Por pantalla**: Appbar.Header en cada Screen con `Appbar.BackAction` para retroceso
  - `screenOptions={{ headerShown: false }}` para usar headers custom

- **Drawer Content**:
  - **Secciones**: Info de usuario, navegación principal, gestión (estadísticas/pedidos), footer con acciones
  - **Botones de acción**:
    - "Salir del Modo Empresa": Setea `user.modoEmpresa = false` (sin cerrar sesión)
    - "Cerrar Sesión": `Meteor.logout()` completo
  - **Validación de navegación**: `disabled={!navigationReady}` en List.Items hasta que el navigator esté listo

- **Consideraciones Técnicas Críticas**:
  - **useNavigation() solo funciona dentro de NavigationContainer**: Extraer componentes internos o usar props
  - **independent={true}**: Obligatorio cuando hay múltiples NavigationContainers en la app (Main.js ya tiene uno)
  - **Deep linking requiere prefixes únicos**: `vidkar://empresa` diferente de `vidkar://` principal
  - **Parámetros de navegación**: Usar `route.params` en lugar de estados locales para evitar pérdida de datos al retroceder

- **Mejoras Implementadas**:
  - ✅ Navegación real con historial (botón back del sistema funciona)
  - ✅ Deep linking funcional para compartir enlaces
  - ✅ Parámetros de ruta tipados y seguros
  - ✅ Integración con drawer lateral sin duplicar lógica
  - ✅ Headers personalizados por pantalla
  - ✅ Validación defensiva para evitar crashes durante montaje

- **Testing Recomendado**:
  - **Navegación**: Flujo completo MisTiendas → TiendaDetail → ProductoForm → goBack × 2
  - **Deep linking**: Abrir URL `vidkar://empresa/tienda/123` debe navegar directamente
  - **Drawer**: Abrir/cerrar drawer, navegar desde drawer items
  - **Salir del modo empresa**: Verificar que vuelve a App.js principal
  - **Cerrar sesión**: Verificar que redirige a Loguin

- **Troubleshooting Común**:
  - **"navigation object not found"**: Verificar que el componente esté dentro de NavigationContainer o usar try-catch
  - **Deep linking no funciona**: Verificar que `independent={true}` esté presente y prefixes sean únicos
  - **Drawer no abre**: Verificar que `drawerRef.current` exista antes de llamar `.open()`
  - **Navegación no reactiva**: Asegurar que screens usen `navigation` prop en lugar de estados locales

- **Lecciones Aprendidas**:
  - **Múltiples NavigationContainers**: Siempre usar `independent={true}` para evitar conflictos
  - **Contexto de navegación**: `useNavigation()` solo funciona dentro del árbol de NavigationContainer
  - **Componentes internos**: Extraer lógica que necesita navigation a componentes hijos del NavigationContainer
  - **Drawer + Navigator**: El drawer debe envolver al navigator, no al revés
  - **Headers custom**: Usar `headerShown: false` + Appbar manual da más control que options de Stack.Screen
  - **Defensive programming**: Siempre validar que navigation esté disponible antes de usarlo (especialmente en drawer content)

- **Archivos Modificados**:
  - `components/empresa/EmpresaNavigator.jsx`: Convertido a Stack.Navigator real con NavigationContainer
  - `components/empresa/EmpresaDrawerContent.jsx`: Agregado try-catch en useNavigation y prop navigationReady
  - `components/empresa/screens/MisTiendasScreen.jsx`: Uso de `navigation.navigate()` en lugar de callbacks
  - `components/empresa/screens/TiendaDetailScreen.jsx`: Recibe `route.params` y usa `navigation.goBack()`
  - `components/empresa/screens/ProductoFormScreen.jsx`: Recibe `route.params` y usa `navigation.goBack()`

- **Próximos Pasos**:
  - Implementar pantalla de Estadísticas (gráficos de ventas/productos)
  - Implementar pantalla de Pedidos (gestión de orders de clientes)
  - Agregar notificaciones push para nuevos pedidos
  - Tests e2e del flujo completo de navegación empresa
  - Documentar deep linking en README para QA

---

## Resumen técnico – Modo Empresa: Navegación con Drawer y FAB

- **Problema Identificado**: El FAB (Floating Action Button) en TiendaDetailScreen se había convertido incorrectamente a un Button genérico, perdiendo su funcionalidad de botón flotante.

- **Corrección Aplicada**:
  - **TiendaDetailScreen**: Revertido Button a FAB con estilo flotante (`position: 'absolute'`, esquina inferior derecha).
  - Sin cambios en la lógica de navegación ni en otros componentes.

- **Headers Personalizados por Screen**:
  - **MisTiendasScreen**: Appbar con icono de menú (drawer) + MenuHeader.
  - **TiendaDetailScreen**: Appbar con BackAction + título dinámico (nombre de tienda) + MenuHeader.
  - **ProductoFormScreen**: Appbar.Header con BackAction + título condicional ("Editar" vs "Nuevo").

- **Arquitectura de Navegación Empresarial**:
  ```
  EmpresaNavigator
  └── Drawer (overlay lateral)
      ├── EmpresaDrawerContent
      │   ├── Info de usuario
      │   ├── Navegación principal (Mis Tiendas)
      │   ├── Gestión (Estadísticas, Pedidos) - deshabilitado
      │   └── Footer (Salir Modo Empresa, Cerrar Sesión)
      └── Stack.Navigator
          ├── MisTiendasScreen (con openDrawer prop)
          ├── TiendaDetailScreen
          ├── ProductoFormScreen
          └── UserDetails (integrado desde App.js)
  ```

- **Componentes de Navegación Empresarial**:
  - **EmpresaNavigator**: Contenedor principal con Drawer y Stack Navigator.
  - **EmpresaDrawerContent**: Menú lateral con navegación y acciones (salir, logout).
  - **MisTiendasScreen**: Listado de tiendas con LocationPicker integrado.
  - **TiendaDetailScreen**: Detalle de tienda con productos y FAB para agregar.
  - **ProductoFormScreen**: Formulario de creación/edición con upload de imagen Base64.

- **Props Clave de Navegación**:
  - **openDrawer**: Función pasada desde EmpresaNavigator a MisTiendasScreen para abrir el drawer.
  - **navigationReady**: Boolean para deshabilitar navegación hasta que el Stack esté listo.
  - **route.params**: Objeto con datos de navegación (tienda, producto, tiendaId, etc.).

- **Upload de Imágenes en ProductoFormScreen**:
  - **Selección**: `react-native-image-picker` con validaciones de tamaño (5MB) y tipo (image/*).
  - **Conversión**: `react-native-fs` para leer archivo local como Base64.
  - **Envío**: Método `comercio.uploadProductImage` con payload `{ name, type, size, base64 }`.
  - **Preview**: Thumbnail con información de tamaño y botón de remover.
  - **Estados**: `imagen` (objeto local), `imagenPreview` (URI o URL), `uploadingImage` (loading).

- **Corrección Crítica en ProductoFormScreen**:
  - **Bug**: Al editar producto con imagen existente, no se subía nueva imagen seleccionada porque se comparaba `imagenPreview` (URL servidor) con `imagen.uri` (path local).
  - **Solución**: Verificar existencia de `imagen?.uri` (nueva selección) en lugar de comparar URIs.
  - Código corregido:
    ```javascript
    if (imagen?.uri) {
      // Nueva imagen detectada, subir
      await uploadImage(producto._id);
    }
    ```

- **Integración de UserDetails en Modo Empresa**:
  - **Ruta agregada**: `User` screen dentro del Stack.Navigator de EmpresaNavigator.
  - **Header**: Appbar con BackAction sin MenuHeader (aún no integrado).
  - **Navegación**: Desde drawer o desde cualquier screen con `navigation.navigate('User', { item: userId })`.

- **Drawer Content - Acciones del Usuario**:
  - **Salir del Modo Empresa**: Actualiza `user.modoEmpresa = false` sin cerrar sesión (vuelve a App.js).
  - **Cerrar Sesión**: `Meteor.logout()` completo con confirmación.
  - **Alertas diferenciadas**: Mensajes específicos para cada acción con emojis y bullets informativos.

- **Validaciones en Formularios**:
  - **MisTiendasScreen**: Nombre (3-50 chars), descripción (10-200 chars), coordenadas obligatorias.
  - **ProductoFormScreen**: 
    - Nombre (3-50 chars)
    - Descripción (10-200 chars)
    - Precio (>0, máx 999999)
    - Cantidad (>0 si no es elaboración, máx 999999)
    - Imagen (máx 5MB, solo image/*)
    - Comentario (máx 500 chars, opcional)

- **UX/UI Profesional Implementado**:
  - **Cards con elevación**: Separación visual clara entre secciones.
  - **Chips horizontales**: Selector de moneda (USD/CUP/UYU) con estados selected.
  - **Switch con descripción**: Toggle para "Producto de elaboración" con texto explicativo.
  - **HelperText**: Mensajes de error específicos bajo cada campo.
  - **Character counters**: Affix text mostrando X/MAX caracteres en inputs.
  - **Image picker placeholder**: Superficie con border dashed para selección de imagen.
  - **FAB flotante**: Botón de acción primaria en esquina inferior derecha.

- **Estilos Consistentes**:
  - **Color primario**: #673AB7 (Deep Purple) para botones, headers, badges.
  - **Color secundario**: #3f51b5 (Indigo) para Appbars.
  - **Elevación**: 2-4 para cards, 3 para tienda cards.
  - **Border radius**: 12-16px para cards y contenedores.
  - **Spacing**: 16px padding general, 24px para dialogs.

- **Responsive Design**:
  - **useSafeAreaInsets()**: Padding top en Appbars para notch/safe area.
  - **KeyboardAvoidingView**: En formularios para evitar que el teclado oculte inputs (no implementado aún).
  - **ScrollView + KeyboardShouldPersistTaps**: En dialogs para mejor UX en mobile.

- **Consideraciones Técnicas Críticas**:
  - **NavigationContainer independent**: Obligatorio para coexistir con App.js navigator.
  - **useNavigation() try-catch**: En drawer content para evitar crashes durante montaje.
  - **FAB position absolute**: Siempre usar `position: 'absolute'` con `bottom: 0, right: 0`.
  - **Image Base64**: Prefijo `data:image/jpeg;base64,` obligatorio para upload.
  - **Cleanup de estado**: Reset completo en `resetDialogState()` para evitar datos fantasma.

- **Testing Recomendado**:
  - **Flujo completo**: Crear tienda → Ver detalle → Agregar producto → Editar producto → Subir imagen.
  - **Navegación**: Drawer → Mis Tiendas → Tienda Detail → Producto Form → Back × 3.
  - **Validaciones**: Intentar crear tienda/producto con campos vacíos/inválidos.
  - **Imagen**: Upload de PDF (rechazar), imagen >5MB (rechazar), imagen válida (éxito).
  - **Edición con imagen**: Seleccionar nueva imagen en edición y verificar que se suba.

- **Lecciones Aprendidas**:
  - **FAB vs Button**: No reemplazar FAB por Button, tienen propósitos diferentes (flotante vs inline).
  - **Image upload**: Comparar URIs no funciona para detectar nueva imagen en edición (usar objeto `imagen`).
  - **Drawer + Stack**: El drawer debe envolver al Stack, no estar dentro de él.
  - **Props de navegación**: Pasar funciones como `openDrawer` es más seguro que usar contexto/refs globales.
  - **Base64 en RN**: Requiere `react-native-fs` para leer archivos locales, `react-native-image-picker` solo da URI.
  - **Meteor.call async**: Siempre usar try-catch y manejar error.reason para feedback al usuario.

- **Archivos Modificados en Esta Conversación**:
  - **TiendaDetailScreen.jsx**: Corregido Button → FAB flotante.
  - **ProductoFormScreen.jsx**: Corregido bug de upload de imagen en modo edición.
  - **MisTiendasScreen.jsx**: Agregado Appbar con drawer toggle.
  - **EmpresaNavigator.jsx**: Agregada ruta UserDetails dentro del Stack.
  - **EmpresaDrawerContent.jsx**: Diferenciadas acciones "Salir Modo Empresa" vs "Cerrar Sesión".
  - **copilot-instructions.md**: Agregado este resumen técnico.

- **Próximos Pasos**:
  - Implementar pantalla de Pedidos Comercio (lista de órdenes pendientes).
  - Agregar KeyboardAvoidingView en formularios.
  - Integrar MenuHeader en UserDetails dentro de modo empresa.
  - Implementar pantalla de Estadísticas con gráficos.
  - Tests e2e del flujo completo de creación de tienda y productos.
  - Documentar métodos backend `comercio.*` en README.

---

## Resumen técnico – Consistencia de métricas (Consumo vs ProgressBar) en Proxy/VPN Cards (cliente)

- **Problema detectado**: el texto “Consumo” y la meta de la `ProgressBar` mostraban valores distintos (ej. 5.36 vs 5.23) por mezclar:
  - Consumo textual: bytes → GB “decimal” (dividiendo entre `*1000`).
  - Barra/meta: MB → GB “binario” (dividiendo entre `1024`).
- **Corrección aplicada**: se unificó el cálculo para que **texto y barra usen el mismo origen**:
  - Se calcula `consumoMB = bytes / BYTES_IN_MB_APPROX`.
  - Se deriva `consumoGB` con el mismo formatter `MB/1024` usado en límite/restante y en la barra.
- **Lección**: en UIs de “usage/quota” no mezclar unidades **GB decimal** (base 1000) y **GiB/GB binario** (base 1024) dentro del mismo componente. Elegir una convención (recomendado: MB→GB con 1024 si el backend almacena MB) y aplicarla en:
  - KPI de consumo
  - Meta de progress
  - Restante
  - Límite

---

## Resumen técnico – Proxy/VPN Cards: consumo (bytes→MB/GB) consistente entre User y Admin

- **Problema**: El consumo en vista User se calculaba con una constante distinta (`1024000`) y terminaba mostrando valores diferentes a Admin, generando desconfianza en métricas.
- **Decisión aplicada**:
  - Para **consumo** (que parte de bytes), se estandariza la conversión a base **decimal** como en Admin:
    - `MB = bytes / 1_000_000`
    - `GB = bytes / 1_000_000_000`
- **Nota importante**:
  - Los límites/paquetes vienen en **MB** (plan) y suelen convertirse a GB con `MB/1024`. Mezclar “consumo decimal” con “límite binario” puede ser aceptable si el backend ya define así los planes; si se busca coherencia absoluta, se debe definir una convención global (decimal vs binaria) y aplicarla también a límites/restante.
- **Lección**:
  - En dashboards de cuota, las discrepancias entre pantallas (User/Admin) deben resolverse con una única convención, documentada y reutilizada por helpers compartidos.

---

## Resumen técnico – Consistencia de Chip de estado (User/Admin) en Proxy/VPN Cards

- **Problema**: En vista Admin el chip usaba labels diferentes (“Habilitado/Deshabilitado”), mientras que en vista User se mostraba “Activo/Inactivo” (Proxy) y “Activa/Inactiva” (VPN). Esto genera inconsistencia visual y semántica.
- **Corrección aplicada**:
  - `ProxyCardAdmin`: chip ahora muestra **“Activo / Inactivo”**.
  - `VpnCardAdmin`: chip ahora muestra **“Activa / Inactiva”**.
  - Se mantuvieron iconos y colores (verde/rojo) para no romper el patrón de reconocimiento rápido.
- **Lección**: En dashboards donde Admin ve “lo mismo que el usuario”, los labels de estado deben ser idénticos. Si se requiere un estado más “operativo” (habilitado/deshabilitado), debe mostrarse como texto secundario, no reemplazando el label principal.

---

## Resumen técnico – Consistencia de títulos (User/Admin) en Proxy/VPN Cards

- **Problema**: En Admin los títulos eran “Datos del Proxy” / “Datos VPN”, mientras que en User eran “Proxy” / “VPN”. Esto rompe consistencia visual y hace que el admin perciba que está en una pantalla distinta aunque vea la misma información.
- **Corrección aplicada**:
  - `ProxyCardAdmin`: título cambiado a **“Proxy”**.
  - `VpnCardAdmin`: título cambiado a **“VPN”**.
- **Lección**: Para componentes espejo (User/Admin) mantener *mismo título*, *mismo chip de estado* y *misma estructura de cabecera* mejora UX, reduce soporte y evita que el equipo duplique variantes de UI innecesarias.

---

## Resumen técnico – Consistencia visual (accentBar + CTA chip) entre User/Admin en Proxy/VPN Cards

- **Problema**: En Admin, la barra superior (`accentBar`) y el chip de acción (“Ver”) no seguían los mismos tokens visuales que en User (colores y estilo de CTA), creando una sensación de pantallas “distintas” para el mismo servicio.
- **Corrección aplicada**:
  - **accentBar**: Se alineó el color por defecto con User:
    - Proxy: `#546e7a`
    - VPN: `#4CAF50`
    - (si `accentColor` viene por props, se respeta para theming futuro).
  - **CTA chip**: El botón “Ver” se igualó al patrón de User (“Editar”):
    - Mismo icono (`pencil`), mismo fondo y mismo color de texto por servicio.
- **Lección**: Para componentes espejo (Admin/User), usar los mismos **design tokens** (colores, iconografía, labels) en:
  - barra de acento,
  - chips de acción (Editar/Ver),
  - chips de estado,
  evita duplicación de estilos y reduce confusión en soporte/QA. Idealmente, extraer estos tokens a un helper compartido (p.ej. `proxyVpnCardTheme.ts`) para mantener consistencia a futuro.

---

## Resumen técnico – Modo edición en cards espejo (User/Admin): CTA de salida + acentos determinísticos

- **Problema**: Al entrar en modo edición (Admin), el CTA “Editar/Ver” desaparecía o no era claro cómo **cancelar** y volver al modo lectura. Esto rompe la navegabilidad (user puede quedar “atrapado” en edición).
- **Corrección aplicada**:
  - En `ProxyCardAdmin` y `VpnCardAdmin`, el chip de acción en modo edición pasa a ser **“Cancelar”** (icon `close-circle`) y llama al handler que vuelve a modo lectura.
  - Se conservaron los **mismos tokens visuales** (fondo/texto) del chip “Editar” de los cards User para mantener consistencia.
- **Color de accentBar (Proxy)**:
  - Se detectó que `accentColor` venía como color dinámico desde `UserDetails`, lo cual es correcto para algunos cards (identidad), pero **NO** para Proxy/VPN donde User ya define colores fijos.
  - Decisión: `ProxyCardAdmin` fuerza `accentBar = #546e7a` para quedar idéntico a `ProxyCardUser` (evita “random colors” en la barra).
- **Lección**:
  - En patrones “read ↔ edit”, siempre debe existir un CTA explícito para salir del estado (Cancelar/Cerrar) visible en el header.
  - No reutilizar un `accentColor` global si el feature ya tiene colores semánticos propios; preferir colores determinísticos por dominio (Proxy/VPN) para consistencia y QA.
