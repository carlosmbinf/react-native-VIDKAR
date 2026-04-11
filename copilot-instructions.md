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

## Resumen técnico – Sistema de Pedidos Empresariales (Ordenamiento Inteligente y Slide-to-Confirm)

- **Contexto**: Pantalla de gestión de pedidos para empresas/comercios con priorización automática por urgencia y UX optimizada para acciones críticas.

- **Sistema de Ordenamiento por Prioridad**:
  ```javascript
  // Prioridad descendente (1 = máxima urgencia):
  PREPARANDO: 1,           // En proceso activo
  PENDIENTE: 2,            // Esperando ser preparados
  PREPARACION_LISTO: 3,    // Listos para recoger
  PENDIENTE_ENTREGA: 4,    // Esperando asignación de cadete
  CADETEENLOCAL: 5,        // Cadete en tienda
  ENCAMINO: 6,             // En ruta al cliente
  CADETEENDESTINO: 7,      // Cadete llegó al destino
  ```

- **Lógica de Ordenamiento Implementada**:
  - **Prioridad primaria**: Estado del pedido (menor número = más urgente)
  - **Prioridad secundaria**: Fecha de creación (más antiguos primero dentro de mismo estado)
  - **Resultado**: PREPARANDO antiguos → PREPARANDO recientes → PENDIENTE antiguos → etc.

- **Componente SlideToConfirm Profesional**:
  - **Props configurables**: `backgroundColor`, `icon`, `text`, `onConfirm`, `disabled`
  - **UX Features**:
    - Vibración táctil en inicio/éxito/fallo (10ms, 50ms, patrón [0,50,100,50])
    - Threshold de confirmación: 90% del recorrido total
    - Animación spring de retorno si no completa (bounciness: 8)
    - Color de texto adaptativo: pasa de color del slider a blanco según progreso
  - **Cálculo de recorrido preciso**:
    ```javascript
    MAX_SLIDE = TRACK_WIDTH - THUMB_SIZE - PADDING_LEFT - PADDING_RIGHT
    // Considera dimensiones reales de pantalla y paddings del contenedor
    ```

- **Interpolaciones de Animated implementadas**:
  - **textColor**: `[backgroundColor → backgroundColor → #FFFFFF]` en `[0, 40%, 100%]`
  - **textOpacity**: `[1 → 0.8 → 0]` en `[0, 30%, 70%]` del recorrido
  - **trackColor**: `[backgroundColor+20 → backgroundColor+FF]` (opacidad del fondo)
  - **progressIndicator**: Ancho dinámico siguiendo `slideAnim.value`

- **Reducción de Espaciados en Cards**:
  - **cardContent paddingVertical**: 16px → 12px
  - **sectionDivider marginVertical**: 16px → 8px
  - **productoRow paddingVertical**: 8px → 4px
  - **comentarioContainer marginTop**: 6px → 4px
  - **productoDivider marginVertical**: 8px → 6px
  - **pagoRow gap**: 16px → 12px
  - **pagoTotal gap**: 4px → 2px
  - **Objetivo**: Mostrar más información sin scroll excesivo, manteniendo legibilidad

- **Mejoras de Accesibilidad**:
  - Vibración táctil como feedback háptico para usuarios con visión reducida
  - Contraste de color garantizado en slider (WCAG AAA en estados inicial/final)
  - Iconografía semántica por estado (chef-hat, check, truck-fast, etc.)

- **Performance Optimizations**:
  - Ordenamiento en `useTracker` evita re-sorts en cada render
  - `PanResponder` con `useNativeDriver: false` necesario para ancho dinámico
  - Cálculos de dimensiones en mounting, no en cada gesture event

- **Consideraciones técnicas críticas**:
  - **Ordenamiento estable**: Si dos pedidos tienen mismo estado y timestamp, mantener orden original de MongoDB
  - **Threshold de 90%**: Permite margen de error en gesto sin frustrar al usuario
  - **Color interpolation**: Usar valores RGB completos evita glitches visuales en transiciones
  - **Vibration patterns**: Array `[delay, duration, pause, duration]` soportado en Android/iOS

- **Estados de Pedido y Acciones**:
  | Estado | Acción Disponible | Color | Ícono | Prioridad |
  |--------|-------------------|-------|-------|-----------|
  | PENDIENTE | "Deslizar para preparar" | #2196F3 (azul) | ▶ | 2 |
  | PREPARANDO | "Deslizar para marcar listo" | #4CAF50 (verde) | ✓ | 1 |
  | PREPARACION_LISTO | Badge estático "Listo para recoger" | #4CAF50 (verde) | ✅ | 3 |

- **Testing recomendado**:
  - Ordenamiento: Crear 10 pedidos intercalando estados PREPARANDO/PENDIENTE/PREPARACION_LISTO y verificar orden visual
  - Slide gesture: Deslizar 50%, 89%, 91% y verificar comportamiento (return vs confirm)
  - Vibration: Probar en dispositivos con/sin vibrador funcional
  - Colores: Validar legibilidad en modo claro/oscuro del sistema
  - Edge cases: Pantallas pequeñas (<360px width), tablets (>768px), landscape orientation

- **Mejoras futuras sugeridas**:
  - Agregar opción de ordenamiento manual (usuario elige criterio)
  - Implementar agrupación visual por estado con headers sticky
  - Sound feedback opcional para confirmación de acción
  - Gesture customizable (slide, doble tap, long press según preferencia)
  - Contador de tiempo estimado de preparación por pedido
  - Notificación push al comercio cuando pedido pasa a PREPARANDO

- **Lecciones aprendidas**:
  - **Ordenamiento en cliente vs servidor**: Para <100 items, ordenar en cliente es más eficiente que query con sort en MongoDB
  - **Vibration cross-platform**: Patrones complejos solo funcionan en Android, iOS solo soporta duración fija
  - **Animated.Text**: Interpolación de color requiere valores hexadecimales completos
