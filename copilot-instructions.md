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

## Resumen técnico – Integración de Datos Reales en PedidosPreparacionScreen (VentasRechargeCollection)

- **Contexto**: Migración de datos mock a datos reales desde `VentasRechargeCollection` para gestión de pedidos de comercio en modo empresa.

- **Estructura de Datos VentasRechargeCollection**:
  ```javascript
  {
    _id: "HEJ53wR8kQXWoNyyk",
    userId: "WwX53qa95tmhuJSrP",
    producto: {
      _id: "mGfkr993cRD7Snt2s",
      userId: "WwX53qa95tmhuJSrP",
      idOrder: "EFE-1768735970200-WwX53qa95tmhuJSrP",
      status: "PENDIENTE",
      type: "EFECTIVO",
      carritos: [
        {
          _id: "uxerPL8dJzyv3EPjn",
          type: "COMERCIO", // ✅ Filtro clave
          producto: {
            name: "Pan para hamburguesa",
            precio: 200,
            // ...otros campos
          },
          cantidad: 1,
          comentario: "Sin cebolla por favor",
          entregado: false,
          // ...otros campos
        }
      ],
      createdAt: ISODate("2026-01-18T11:32:50.202+0000")
    },
    estado: "ENTREGADO", // ✅ Campo clave para flujo
    metodoPago: "EFECTIVO",
    cobrado: 26.6,
    monedaCobrado: "UYU",
    isCobrado: true,
    createdAt: ISODate("2026-01-18T11:32:54.565+0000"),
    cadeteid: "T2aCRKzc3RmLoj6Fa",
    fechaAsignacion: ISODate("2026-01-18T11:38:00.604+0000")
  }
  ```

- **Query Implementado**:
  ```javascript
  const { pedidos, loading } = useTracker(() => {
    const handle = Meteor.subscribe('ventasRecharge', {
      'producto.carritos.type': 'COMERCIO'
    });

    const ventas = VentasRechargeCollection.find({
      'producto.carritos.type': 'COMERCIO'
    }).fetch();

    // Transformación a formato UI
    const pedidosTransformados = ventas.map((venta) => {
      const productosComercio = venta.producto?.carritos?.filter(
        (item) => item.type === 'COMERCIO'
      ) || [];

      return {
        _id: venta._id,
        idOrder: venta.producto?.idOrder || 'N/A',
        estado: venta.estado || 'PENDIENTE',
        metodoPago: venta.metodoPago || 'EFECTIVO',
        totalACobrar: venta.cobrado || 0,
        moneda: venta.monedaCobrado || 'CUP',
        createdAt: venta.createdAt || new Date(),
        productos: productosComercio.map((item) => ({
          nombre: item.producto?.name || 'Sin nombre',
          cantidad: item.cantidad || 1,
          comentario: item.comentario || ''
        })),
        cadeteid: venta.cadeteid,
        fechaAsignacion: venta.fechaAsignacion,
        isCobrado: venta.isCobrado
      };
    });

    return {
      pedidos: pedidosTransformados,
      loading: !handle.ready()
    };
  });
  ```

- **Transformación de Datos Clave**:
  - **Filtrado**: Solo items con `type === 'COMERCIO'` desde `producto.carritos`.
  - **Agrupación**: Un documento de VentasRechargeCollection puede tener múltiples productos de comercio en `carritos`.
  - **Normalización**: Conversión de estructura nested a formato plano para UI.
  - **Fallbacks defensivos**: Valores por defecto para campos opcionales (|| operators).

- **Estados de Pedido Reconocidos**:
  ```javascript
  const getEstadoConfig = (estado) => {
    const configs = {
      PENDIENTE: { color: '#FF9800', icon: 'clock-outline', label: 'Pendiente' },
      PREPARANDO: { color: '#2196F3', icon: 'chef-hat', label: 'Preparando' },
      LISTO: { color: '#4CAF50', icon: 'package-check', label: 'Listo' },
      ENTREGADO: { color: '#4CAF50', icon: 'package-check', label: 'Entregado' }
    };
    return configs[estado] || configs.PENDIENTE;
  };
  ```

- **Color Dinámico del Header por Carga**:
  ```javascript
  const getHeaderColorConfig = (cantidadPedidos) => {
    if (cantidadPedidos <= 3) return { backgroundColor: '#4CAF50' }; // Verde - Tranquilo
    if (cantidadPedidos <= 8) return { backgroundColor: '#FF9800' }; // Naranja - Moderado
    return { backgroundColor: '#F44336' }; // Rojo - Alta demanda
  };
  ```

- **Flujo de Cambio de Estado (Futuro)**:
  1. **PENDIENTE → PREPARANDO**: Empresa toca "Iniciar" (método `comercio.cambiarEstadoPedido`).
  2. **PREPARANDO → LISTO**: Empresa toca "Marcar Listo" (actualiza `estado` en VentasRechargeCollection).
  3. **LISTO → ENTREGADO**: Cadete confirma entrega (actualiza `entregado: true` en `carritos` + `estado: 'ENTREGADO'`).

- **Método Backend Pendiente de Implementar**:
  ```javascript
  Meteor.methods({
    'comercio.cambiarEstadoPedido'(ventaId, nuevoEstado) {
      check(ventaId, String);
      check(nuevoEstado, Match.OneOf('PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO'));

      // Validar permisos (solo empresa dueña o admin)
      const venta = VentasRechargeCollection.findOne(ventaId);
      if (!venta) throw new Meteor.Error('not-found', 'Pedido no encontrado');

      const user = Meteor.user();
      const tiendaIds = TiendasComercioCollection.find(
        { idUser: user._id },
        { fields: { _id: 1 } }
      ).map(t => t._id);

      const esEmpresaDuena = venta.producto?.carritos?.some(item => 
        item.type === 'COMERCIO' && tiendaIds.includes(item.idTienda)
      );

      if (!esEmpresaDuena && user.profile?.role !== 'admin') {
        throw new Meteor.Error('not-authorized', 'No tienes permisos para modificar este pedido');
      }

      // Actualizar estado
      VentasRechargeCollection.update(ventaId, {
        $set: { estado: nuevoEstado }
      });

      // Log de auditoría
      LogsCollection.insert({
        type: 'CAMBIO_ESTADO_PEDIDO',
        userAdmin: user._id,
        message: `Estado de pedido ${venta.producto?.idOrder} cambiado a ${nuevoEstado}`,
        createdAt: new Date()
      });

      return { success: true, estado: nuevoEstado };
    }
  });
  ```

- **Publicación Backend Requerida**:
  ```javascript
  Meteor.publish("ventasRecharge", function (selector, option) {
    // Ya existe en publicaciones.js
    return VentasRechargeCollection.find(
      selector ? selector : {},
      option ? option : {}
    );
  });
  ```

- **Consideraciones de Seguridad**:
  - **Filtrado por tienda**: Empresa solo debe ver pedidos de SUS tiendas (pendiente de implementar).
  - **Validación de estado**: Transiciones válidas: PENDIENTE→PREPARANDO→LISTO (no saltar estados).
  - **Auditoría**: Registrar en LogsCollection quién cambió el estado y cuándo.
  - **Protección de datos**: No exponer datos de otros usuarios/empresas en la publicación.

- **Mejoras Pendientes de Implementar**:
  1. **Botones de acción funcionales**:
     - "Iniciar" (PENDIENTE → PREPARANDO)
     - "Marcar Listo" (PREPARANDO → LISTO)
     - "Ver Detalle" (navegación a screen de detalle de pedido)
  2. **Pantalla de Detalle de Pedido**:
     - Información completa del cliente
     - Dirección de entrega (desde `coordenadas`)
     - Timeline visual del estado
     - Botón de contacto con cliente
  3. **Filtros**:
     - Por estado (PENDIENTE, PREPARANDO, LISTO, ENTREGADO)
     - Por fecha (Hoy, Última semana, Mes)
     - Por método de pago (EFECTIVO, TARJETA)
  4. **Notificaciones Push**:
     - Alertar a empresa cuando llega nuevo pedido
     - Alertar a cliente cuando pedido cambia de estado
  5. **Restricción por Tienda**:
     - Query debe incluir `{ 'producto.carritos.idTienda': { $in: tiendasIds } }`
     - Solo mostrar pedidos de las tiendas del usuario logueado

- **Estructura de UI Responsive**:
  - **Mobile (1 columna)**: Cards apiladas verticalmente
  - **Tablet (2 columnas)**: Layout de grid con `columnWrapperStyle`
  - **Loading state**: ActivityIndicator con mensaje "Cargando pedidos..."
  - **Empty state**: Mensaje "No hay pedidos pendientes" con ícono

- **Testing Recomendado**:
  - **Caso 1**: Usuario con 0 pedidos → debe mostrar empty state (futuro).
  - **Caso 2**: Usuario con 1 pedido PENDIENTE → debe mostrar botón "Iniciar".
  - **Caso 3**: Usuario con 1 pedido PREPARANDO → debe mostrar botón "Marcar Listo".
  - **Caso 4**: Usuario con 1 pedido LISTO → debe mostrar mensaje "Listo para recoger".
  - **Caso 5**: Usuario con 10 pedidos → header debe ser naranja/rojo según cantidad.
  - **Caso 6**: Tocar "Iniciar" → debe cambiar estado a PREPARANDO y actualizar UI reactivamente.
  - **Caso 7**: Tablet con 4 pedidos → debe mostrar 2 columnas con 2 cards cada una.

- **Lecciones Aprendidas**:
  - **useTracker sin memo**: Correcto para suscripciones simples que no requieren optimización agresiva.
  - **Transformación de datos**: Normalizar estructura nested en useTracker evita lógica compleja en componentes.
  - **Filtrado por type**: Query con `'producto.carritos.type': 'COMERCIO'` es suficiente para filtrar en MongoDB.
  - **Estado reactivo**: Cambios en VentasRechargeCollection se reflejan automáticamente en UI sin necesidad de refresh manual.
  - **Fallbacks defensivos**: Usar `|| 'default'` en transformaciones previene crashes por datos incompletos.
  - **Color
