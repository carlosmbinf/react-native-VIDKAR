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

## Resumen técnico – Ribbon de Elaboración en ProductoCard (Esquina Superior Derecha)

- **Contexto**: Reemplazo del Chip de "Elaboración" por un ribbon diagonal elegante para productos de elaboración.

- **Implementación del Ribbon**:
  - **Posicionamiento**: Esquina superior derecha del card (cambio de izquierda a derecha para mejor visibilidad).
  - **Estructura**:
    - `ribbonWrapper`: Container con `overflow: 'hidden'` para recortar el ribbon fuera del card.
    - `ribbon`: Banda diagonal con rotación `45deg` (positiva para descender hacia la derecha).
    - `ribbonText`: Texto "ELABORACIÓN" en mayúsculas con `letterSpacing: 0.8`.

- **Estilos Aplicados**:
  ```javascript
  ribbonWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,  // Esquina derecha
    width: 100,
    height: 100,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 5  // Android
  }
  
  ribbon: {
    position: 'absolute',
    top: 20,
    right: -25,  // Offset desde la derecha
    width: 120,
    backgroundColor: 'rgba(156, 39, 176, 0.95)',  // Púrpura semi-transparente
    transform: [{ rotate: '45deg' }],  // Rotación positiva
    // Sombras platform-specific
  }
  ```

- **Ventajas del Ribbon vs Chip**:
  - **Espacio**: No ocupa espacio del layout, es overlay puro.
  - **Visibilidad**: Diagonal clásica más llamativa que badge plano.
  - **Premium UX**: Apariencia más "exclusiva" para productos especiales.
  - **No interfiere**: Badge de stock permanece en esquina derecha sin conflicto.

- **Consideraciones Técnicas**:
  - **pointerEvents="none"**: Evita que el ribbon capture toques destinados al card.
  - **zIndex + elevation**: Necesario para que quede sobre la imagen en Android.
  - **Rotación 45deg vs -45deg**: Positiva para diagonal descendente hacia la derecha (estándar).
  - **Offset negativo**: `right: -25` saca parte del ribbon fuera del wrapper para el efecto diagonal.

- **Testing Recomendado**:
  - Verificar que el ribbon NO bloquee tap en el card.
  - Validar visibilidad en modo claro/oscuro.
  - Confirmar que no se superpone con badge de stock.
  - Probar en diferentes tamaños de pantalla (phones/tablets).

- **Lecciones Aprendidas**:
  - **Ribbons diagonales**: Siempre usar wrapper con `overflow: 'hidden'` para recortar correctamente.
  - **Rotación de ribbons**: Positiva (45deg) para esquina derecha, negativa (-45deg) para izquierda.
  - **Offset calculado**: `right: -25` con `width: 120` asegura que el texto quede centrado en la diagonal visible.
  - **Z-index crítico**: En Android, `elevation` en el wrapper es esencial para overlay sobre imagen.

---

## Resumen técnico – Migración de `.map()` a FlatList en TiendasCercanas (Optimización de Performance)

- **Problema Identificado**: Renderizado de lista de tiendas con `.map()` no optimizado para listas largas (scroll lag, memory issues).

- **Solución Aplicada**: Migración a `FlatList` con virtualización nativa de React Native.

- **Beneficios de FlatList**:
  1. **Virtualización**: Solo renderiza items visibles en viewport + buffer.
  2. **Scroll Performance**: Manejo nativo de scroll con mejor FPS.
  3. **Memory Efficiency**: Recicla componentes fuera de pantalla.
  4. **Pull-to-refresh**: Integración nativa con `onRefresh`.
  5. **Load More**: Soporte para paginación infinita con `onEndReached`.

- **Patrón de Migración Implementado**:
  ```javascript
  // ❌ Antes (map imperativo)
  {tiendasFiltradas.map((tienda, index) => (
    <TiendaCard key={tienda._id} tienda={tienda} index={index} />
  ))}
  
  // ✅ Después (FlatList declarativo)
  <FlatList
    data={tiendasFiltradas}
    keyExtractor={(item) => item._id}
    renderItem={({ item, index }) => (
      <TiendaCard tienda={item} index={index} searchQuery={searchQuery} userLocation={userLocation} />
    )}
    // ...optimizaciones
  />
  ```

- **Props de Optimización Aplicadas**:
  - **keyExtractor**: Usa `_id` único para reconciliación eficiente.
  - **initialNumToRender**: Renderiza solo 5 items iniciales (default 10).
  - **maxToRenderPerBatch**: Renderiza 3 items por batch durante scroll.
  - **windowSize**: Ventana de 5 (mantiene 5 * altura_viewport en memoria).
  - **removeClippedSubviews**: Desmonta componentes fuera de pantalla (Android).
  - **getItemLayout**: Pre-calcula heights para scroll instantáneo (si heights son fijos).

- **Estilos de ContentContainer**:
  ```javascript
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 32,  // Espacio final
    gap: 16,  // Separación entre cards (Android API 29+)
  }}
  ```

- **Empty State Mejorado**:
  - Componente `ListEmptyComponent` con mensaje contextual.
  - Icono `store-off-outline` para coherencia visual.
  - Maneja 3 casos: cargando, sin tiendas, sin resultados de búsqueda.

- **Scroll Behavior Configurado**:
  - **showsVerticalScrollIndicator={false}**: UX más limpia.
  - **bounces={true}** (iOS): Efecto rubber band nativo.
  - **overScrollMode="auto"** (Android): Respeta configuración del sistema.

- **Consideraciones de Performance**:
  - **Memoización de TiendaCard**: Considerar `React.memo()` si re-renders son frecuentes.
  - **PureComponent**: Si TiendaCard es class component, extender `PureComponent`.
  - **shouldComponentUpdate**: Implementar comparación shallow de props.
  - **getItemLayout**: Solo si **todas** las cards tienen altura fija conocida.

- **Cálculo de getItemLayout (ejemplo)**:
  ```javascript
  getItemLayout={(data, index) => ({
    length: 200,  // Altura fija de TiendaCard en px
    offset: 200 * index + 16 * index,  // Altura + gap
    index,
  })}
  ```

- **Pull-to-Refresh (futuro)**:
  ```javascript
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="#9C27B0"  // Color del spinner
    />
  }
  ```

- **Infinite Scroll (futuro)**:
  ```javascript
  onEndReached={() => {
    if (hasMore && !loading) {
      loadMoreTiendas();
    }
  }}
  onEndReachedThreshold={0.5}  // Trigger al 50% del final
  ```

- **Testing Recomendado Post-Migración**:
  - Lista con 0 tiendas → debe mostrar empty state.
  - Lista con 50+ tiendas → scroll debe ser fluido (60 FPS).
  - Búsqueda que filtra a 0 resultados → mensaje específico.
  - Scroll rápido arriba/abajo → sin saltos ni blancos.
  - Memory profiling: uso de RAM estable durante scroll prolongado.

- **Lecciones Aprendidas**:
  - **FlatList siempre que sea posible**: Incluso para listas cortas (10-20 items), la optimización es gratuita.
  - **keyExtractor único y estable**: Usar IDs de base de datos, nunca index.
  - **removeClippedSubviews**: Gran impacto en Android con listas largas, pero puede causar bugs con componentes complejos.
  - **getItemLayout preciso**: Solo implementar si heights son 100% fijos, sino causa jumps.
  - **gap en contentContainerStyle**: Requiere Android API 29+, usar marginBottom como fallback.
  - **Evitar inline functions en renderItem**: Extraer componente para mejor memoización.

- **Anti-patterns a Evitar**:
  ❌ `key={index}` → Causa re-renders innecesarios.
  ❌ `renderItem={() => <TiendaCard {...props} />}` → Nueva instancia en cada render.
  ❌ `data={tiendas.filter(...)}` → Re-calcula en cada render, memoizar con useMemo.
  ❌ Animaciones complejas en TiendaCard → Causa jank durante scroll.

- **Próximos Pasos**:
  - Implementar Pull-to-Refresh para recargar tiendas cercanas.
  - Agregar paginación con onEndReached si backend soporta offset/limit.
  - Memoizar TiendaCard con React.memo() comparando props relevantes.
  - Profiling con React DevTools Profiler para identificar re-renders.
  - Considerar react-native-fast-image para carga optimizada de imágenes en TiendaCard.

---

## Resumen técnico – Integración de Geolocalización de Tiendas en MenuPrincipal

- **Contexto**: Replicación de funcionalidad de geolocalización y FlatList de ProductosScreen en MenuPrincipal como sección adicional del menú principal.

- **Arquitectura Implementada**:
  - **FlatList con ListHeaderComponent**: Todo el contenido estático del menú (Productos, MainPelis, ProxyVPN) se renderiza en el header.
  - **Items del FlatList**: Solo tiendas cercanas (tiendasConProductos).
  - **Geolocalización automática**: Se obtiene ubicación al montar el componente.
  - **Radio fijo de 3km**: Simplificación para MenuPrincipal (sin FAB de cambio de radio).

- **Estados Manejados**:
  ```javascript
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [tiendasCercanas, setTiendasCercanas] = useState([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);
  ```

- **Flujo de Geolocalización**:
  1. `useEffect` → `obtenerUbicacion()` al montar.
  2. `requestLocationPermission()` → Solicita permisos (Android).
  3. `Geolocation.getCurrentPosition()` → Obtiene coordenadas.
  4. `buscarTiendasCercanas(coordenadas)` → Llama a `comercio.getTiendasCercanas`.
  5. `setTiendasCercanas(resultado.tiendas)` → Actualiza estado.

- **useTracker para Productos**:
  - Suscribe a `productosComercio` solo para tiendas cercanas (filtro por `_id: { $in: tiendasIds }`).
  - Calcula `tiendasConProductos` con productos asociados y disponibles.
  - Filtra tiendas sin productos (`totalProductos > 0`).

- **Estructura de ListHeaderComponent**:
  ```
  ListHeaderComponent
  ├── Mensaje de bienvenida (View con bg #3f51b5)
  ├── Productos (componente Cubacel)
  ├── MainPelis (condicional si subscipcionPelis)
  ├── ProxyVPNPackagesHorizontal
  └── Sección "Comercios Cercanos"
      ├── Título con emoji 🏪
      ├── Loading indicator (si loadingTiendas)
      └── Chip con contador de tiendas (si userLocation)
  ```

- **Optimizaciones Aplicadas**:
  - **useMemo en ListHeaderComponent**: Evita re-renders cuando cambian dependencias no críticas.
  - **removeClippedSubviews**: Solo en Android para liberar memoria.
  - **initialNumToRender: 5**: Renderiza 5 tiendas inicialmente (menos que ProductosScreen por estar en menú).
  - **windowSize: 5**: Buffer menor para mejor performance en menú con múltiples secciones.

- **Diferencias con ProductosScreen**:
  | Aspecto | ProductosScreen | MenuPrincipal |
  |---------|-----------------|---------------|
  | **Searchbar** | Sí, con filtrado | No (simplificado) |
  | **FAB de radio** | Sí, múltiples opciones | No, radio fijo 3km |
  | **Header dedicado** | Chips de ubicación separados | Integrado en sección |
  | **Empty state** | Detallado con iconos | Minimalista |
  | **Performance** | Más agresiva (10/10/10) | Balanceada (5/5/5) |

- **Pull-to-Refresh Implementado**:
  ```javascript
  onRefresh={() => {
    setLoading(true);
    obtenerUbicacion(); // Re-obtiene ubicación y tiendas
    setTimeout(() => setLoading(false), 1500);
  }}
  ```

- **Manejo de Errores**:
  - **Sin permisos**: Setea `locationError` y muestra empty state con mensaje.
  - **Timeout GPS**: Muestra error "Ubicación no disponible".
  - **Sin tiendas**: Empty state con "No hay comercios cercanos".

- **Consideraciones UX**:
  - **Scroll suave**: `bounces={false}` y `overScrollMode="never"` para experiencia coherente con el resto del menú.
  - **Separador visual**: Sección "Comercios Cercanos" con fondo gris (#f5f5f5) para diferenciar del resto del contenido.
  - **Loading state inline**: ActivityIndicator + texto en la sección, no bloquea vista del resto del menú.

- **Testing Recomendado**:
  - Menú con ubicación activada → debe cargar tiendas automáticamente.
  - Menú sin permisos de ubicación → debe mostrar empty state sin crashear.
  - Pull-to-refresh → debe re-obtener ubicación y actualizar tiendas.
  - Scroll con 0 tiendas → header completo visible sin saltos.
  - Scroll con 20+ tiendas → performance fluida sin jank.

- **Lecciones Aprendidas**:
  - **ListHeaderComponent dinámico**: Permite reutilizar FlatList para menús complejos con secciones fijas + listas dinámicas.
  - **useMemo crítico**: En ListHeaderComponent complejo (múltiples componentes) previene re-renders costosos.
  - **Geolocalización silenciosa**: No mostrar Alert de permisos en mount automático mejora UX (solo mostrar si falla).
  - **Radio fijo para menús**: Simplifica UX en pantallas secundarias, reservar configuración avanzada para pantallas dedicadas.
  - **Empty state contextual**: Solo mostrar cuando realmente no hay datos, no bloquear vista del header.

- **Próximos Pasos**:
  - Considerar lazy loading de TiendaCard con `React.memo()` si hay lag.
  - Agregar botón "Ver Todos" que navegue a ProductosScreen con filtros pre-aplicados.
  - Cachear `userLocation` en AsyncStorage para evitar solicitudes repetidas.
  - Implementar Analytics para trackear engagement con sección de comercios.

---