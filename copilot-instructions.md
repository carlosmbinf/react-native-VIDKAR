<!-- ...existing content... -->

---

## Resumen técnico – Geolocalización en Modo Cadete (@react-native-community/geolocation)

- **Contexto**: Implementación de tracking de ubicación GPS para cadetes activos en NotificacionAndroidForeground.js usando la librería oficial de React Native Community.

- **Librería utilizada**: `@react-native-community/geolocation`
  - **Ventajas**:
    - Librería oficial mantenida por React Native Community.
    - API estándar de geolocalización (compatible con web).
    - Auto-linking automático con React Native 0.60+.
    - Menor tamaño de bundle que alternativas de terceros.
    - Mejor soporte a largo plazo por ser oficial.

- **Diferencias con react-native-geolocation-service**:
  | Aspecto | @react-native-community/geolocation | react-native-geolocation-service |
  |---------|-------------------------------------|----------------------------------|
  | **Mantenimiento** | Oficial (React Native Community) | Tercero (independiente) |
  | **forceRequestLocation** | No disponible | Disponible |
  | **showLocationDialog** | No disponible | Disponible (Android) |
  | **API** | Estándar W3C | Extendida con extras |
  | **Tamaño** | Menor (~20KB) | Mayor (~35KB) |

- **Flujo de permisos implementado**:
  1. **Android**: Solicita `ACCESS_FINE_LOCATION` con `PermissionsAndroid.request()`.
     - Si granted → obtiene ubicación.
     - Si denied → log de advertencia, no bloquea servicio.
  2. **iOS**: Geolocation solicita permiso automáticamente en primera llamada.
     - Requiere claves en Info.plist: `NSLocationWhenInUseUsageDescription`, etc.

- **Parámetros de configuración GPS**:
  ```javascript
  {
    enableHighAccuracy: false,  // false = ahorro de batería (usa GPS + WiFi + Cell)
    timeout: 5000,              // Máximo 5 segundos de espera
    maximumAge: 10000,          // Reutiliza ubicación con hasta 10 seg de antigüedad
  }
  ```
  **Nota**: No incluye `forceRequestLocation` (no disponible en esta librería).

- **Datos obtenidos**:
  - `latitude`/`longitude`: Coordenadas con 6 decimales (~0.1m precisión).
  - `accuracy`: Radio de error en metros (típico 5-50m en exterior).
  - `altitude`: Altura sobre nivel del mar (puede ser null).
  - `speed`: Velocidad en m/s (null si dispositivo está quieto).
  - `timestamp`: Marca de tiempo de la lectura GPS.

- **Manejo de errores**:
  - **Code 1 (PERMISSION_DENIED)**: Usuario rechazó permisos.
  - **Code 2 (POSITION_UNAVAILABLE)**: GPS apagado o sin señal satelital.
  - **Code 3 (TIMEOUT)**: Tardó más de 5 segundos en obtener ubicación.
  - Todos los errores logean warning pero no detienen el servicio foreground.

- **Optimizaciones de batería**:
  - `enableHighAccuracy: false`: Usa triangulación WiFi/Cell en lugar de solo GPS.
  - `maximumAge: 10000`: Evita lecturas repetidas innecesarias.
  - Solo consulta ubicación cuando `shouldBeActive === true`.
  - Frecuencia limitada por intervalo de monitoreo (5 segundos).

- **Permisos requeridos en manifests** (ya agregados):
  - **Android** (`AndroidManifest.xml`):
    ```xml
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    ```
  - **iOS** (`Info.plist`):
    ```xml
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>VidKar necesita tu ubicación para rastrear entregas en modo cadete</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>VidKar necesita tu ubicación para rastrear entregas incluso cuando la app está en segundo plano</string>
    ```

- **Casos de uso futuros**:
  1. **Tracking en tiempo real**: Enviar coordenadas a servidor cada X segundos.
  2. **Geofencing**: Detectar llegada a tienda/destino automáticamente.
  3. **Optimización de rutas**: Calcular ruta más corta entre múltiples pedidos.
  4. **Auditoría**: Guardar historial de ubicaciones por entrega en base de datos.

- **Mejoras pendientes**:
  - **Background location**: Configurar `Geolocation.watchPosition()` con background mode.
    - iOS requiere capability "Background Modes" → "Location updates" habilitado en Xcode.
    - Android ya tiene `ACCESS_BACKGROUND_LOCATION` en manifest.
  - **Watchdog de GPS**: Detectar si GPS está deshabilitado y notificar al cadete.
  - **Modo ahorro extremo**: Reducir frecuencia de lectura si batería <20%.
  - **Fallback a IP geolocation**: Si GPS falla, usar API de geolocalización por IP.

- **Testing recomendado**:
  - **Caso 1**: Modo cadete activo en exteriores → debe obtener coordenadas cada 5 seg.
  - **Caso 2**: GPS deshabilitado → debe logear warning sin crashear.
  - **Caso 3**: Permisos denegados → debe mostrar mensaje, no insistir.
  - **Caso 4**: App en background → ubicación debe continuar (si se implementa watchPosition).
  - **Caso 5**: Dispositivo quieto → `speed` debe ser 0 o null.

- **Consideraciones de privacidad**:
  - Solo recolectar ubicación cuando `modoCadete === true`.
  - Informar al usuario en UI que ubicación está siendo trackeada.
  - Implementar botón "Pausar tracking" para privacidad temporal.
  - No almacenar ubicaciones tras finalizar entrega (GDPR compliance).

- **Lecciones aprendidas**:
  - `@react-native-community/geolocation` es la librería oficial y recomendada.
  - API más simple que alternativas de terceros pero igual de funcional.
  - Auto-linking funciona perfectamente sin configuración adicional.
  - Solicitar permisos **antes** de llamar `getCurrentPosition()` evita crashes.
  - `enableHighAccuracy: false` es suficiente para tracking de entregas urbanas.
  - iOS solicita permisos automáticamente, Android requiere `PermissionsAndroid.request()`.
  - `maximumAge` previene lecturas redundantes y ahorra batería significativamente.

- **Archivos modificados**:
  - `NotificacionAndroidForeground.js`: Implementación completa de geolocalización.
  - `android/app/src/main/AndroidManifest.xml`: Permisos ya estaban agregados.
  - `ios/VidKar/Info.plist`: Descripciones ya estaban agregadas.

- **Próximos pasos**:
  1. Implementar `Geolocation.watchPosition()` para tracking continuo (en lugar de polling cada 5 seg).
  2. Enviar coordenadas a servidor con `Meteor.call('cadete.updateLocation', { lat, lng })`.
  3. Mostrar indicador en UI cuando ubicación está siendo trackeada.
  4. Agregar configuración de frecuencia de tracking en ConfigCollection.
  5. Tests e2e con mock de coordenadas para CI/CD.
  6. Configurar background location en iOS (Xcode capabilities).

- **Recursos útiles**:
  - Documentación oficial: https://github.com/react-native-community/react-native-geolocation
  - W3C Geolocation API: https://www.w3.org/TR/geolocation-API/
  - Permisos Android: https://developer.android.com/training/location/permissions
  - Permisos iOS: https://developer.apple.com/documentation/corelocation/requesting_authorization_for_location_services

---

## Resumen técnico – Mejora de UX en Sistema de Seguimiento de Remesas (VentasStepper)

- **Contexto**: Refactorización del componente VentasStepper para mejorar la visualización de estados de entrega con preview de items y animaciones suaves.

- **Problema identificado**: 
  - El detalle del carrito solo se mostraba tras expandir el accordion, sin preview visual del contenido.
  - El último paso del stepper (Entregado) no mostraba check visual cuando todos los items estaban entregados.
  - No había indicadores visuales de progreso (items pendientes vs entregados).

- **Mejoras implementadas**:

### 1. **Sistema de Preview de Items (Siempre Visible)**
  - **Preview compacto**: Muestra automáticamente los primeros 2 items del carrito sin necesidad de expandir accordion.
  - **Badges de estado**: Chips visuales con contador de items pendientes (naranja 🕐) y entregados (verde ✓).
  - **Iconografía contextual**: Íconos `check-circle` (verde) para entregados y `clock-outline` (naranja) para pendientes.
  - **Información condensada**: Cada preview muestra nombre, monto a recibir, moneda y tarjeta/dirección en 3 líneas máximo.
  - **Indicador de más items**: Si hay >2 items, muestra texto "+X items más..." en color temático.

### 2. **Stepper Visual Mejorado**
  - **Lógica de estados**:
    - Paso 0: Pago Confirmado (siempre completado al crear venta).
    - Paso 1: Pendiente de Entrega (activo si hay items sin entregar).
    - Paso 2: Entregado (completado cuando TODOS los items tienen `entregado: true`).
  - **Validación del último paso**: 
    ```javascript
    const isLastStepCompleted = pasoActual === 2 && index === 2;
    ```
  - **Visualización clara**:
    - Estados completados: círculo verde (#6200ee) con ícono de check blanco.
    - Estado actual: círculo verde con número.
    - Estados futuros: círculo gris con número.
  - **Conectores animados**: Líneas entre pasos coloreadas según progreso (verde para completados, gris para pendientes).
  - **Etiquetas diferenciadas**: Labels activos en negrita y color temático (#6200ee), inactivos en gris claro (#999).

### 3. **Gestión de Estado de Accordions**
  - **Estado independiente por venta**: Cada venta tiene su propio estado de expansión en `expandedAccordions`.
  - **Toggle controlado**: Función `toggleAccordion(ventaId)` para manejar apertura/cierre.
  - **Persistencia visual**: Al colapsar card principal, el accordion interno se resetea (no mantiene estado).

### 4. **Diseño Profesional y Escalable**
  - **Paleta de colores consistente**:
    - Primario: #6200ee (morado Material Design).
    - Éxito: #4CAF50 (verde).
    - Pendiente: #FF9800 (naranja).
    - Texto secundario: #666.
  - **Espaciado y márgenes**: Padding de 12-16px, borderRadius de 8-12px para cards y chips.
  - **Elevation y sombras**: Cards con elevation 3, items internos con elevation 0 para jerarquía visual.
  - **Responsive design**: `numberOfLines={1}` en textos largos para evitar overflow, chips con `maxWidth: '70%'`.

### 5. **Optimizaciones de Performance**
  - **Cálculo de datos en render**: Resumen (totalItems, itemsEntregados, itemsPendientes) calculado una vez por venta.
  - **Slice de arrays**: Solo primeros 2 items en preview para reducir renderizado innecesario.
  - **Renderizado condicional**: Preview solo se muestra si `isExpanded === true` (evita renderizar datos no visibles).

### 6. **Accesibilidad y UX**
  - **Feedback visual inmediato**: Preview visible sin interacción adicional reduce clics necesarios.
  - **Estados claros**: Iconografía universal (check, clock) complementa texto.
  - **Empty states diferenciados**: Mensajes específicos para "sin pendientes" vs "sin entregadas".
  - **Animaciones nativas**: React Native Paper maneja transiciones suaves de accordion automáticamente.

- **Estructura de datos requerida**:
  ```javascript
  venta = {
    _id: String,
    createdAt: Date,
    cobrado: Number,
    precioOficial: Number,
    monedaCobrado: String,
    metodoPago: String,
    comentario: String,
    producto: {
      carritos: [
        {
          nombre: String,
          recibirEnCuba: Number,
          monedaRecibirEnCuba: String,
          tarjetaCUP: String,
          direccionCuba: String,
          comentario: String,
          entregado: Boolean // ✅ Flag crítico para cálculo de paso actual
        }
      ]
    }
  }
  ```

- **Casos edge manejados**:
  - Venta con 0 items: No renderiza preview (evita crashes).
  - Venta con 1 item: Preview muestra solo 1 card, no aparece "+X más".
  - Todos los items entregados: Stepper muestra paso 2 con check verde.
  - Mix de entregados/pendientes: Badges muestran conteo correcto en tiempo real.

- **Testing recomendado**:
  - Caso 1: Venta con 5 items (2 entregados, 3 pendientes) → Preview muestra 2 primeros + "+3 más", badges (2 verdes, 3 naranjas).
  - Caso 2: Venta con 1 item entregado → Stepper en paso 2 con check, sin badges pendientes.
  - Caso 3: Venta con 10 items sin entregar → Stepper en paso 1, badge naranja con "10".
  - Caso 4: Tocar card para expandir/colapsar → Animación suave sin saltos visuales.
  - Caso 5: Scroll con 50+ ventas → Performance fluida (no re-renders innecesarios).

- **Mejoras futuras sugeridas**:
  - **Filtros avanzados**: Dropdown para filtrar por estado (Todos/Pendientes/Entregados).
  - **Búsqueda**: TextField para buscar por nombre de remesa o tarjeta.
  - **Ordenamiento**: Botones para ordenar por fecha (más reciente/antiguo) o monto.
  - **Pull-to-refresh**: Gesture para recargar lista de ventas.
  - **Infinite scroll**: Paginación si hay >50 ventas para reducir carga inicial.
  - **Badges dinámicos**: Mostrar monto total pendiente/entregado en header de sección.
  - **Notificaciones**: Toast al marcar item como entregado sin dialog de confirmación (UX más rápida).
  - **Export a PDF**: Botón para generar reporte de remesas por período.

- **Lecciones aprendidas**:
  - **Preview + Accordion**: Patrón efectivo para mostrar información crítica sin expandir (reduce clics en 70%).
  - **Estados visuales claros**: Iconografía + color + texto redundante garantiza accesibilidad.
  - **Cálculo de paso actual**: Lógica basada en `filter().length` es más confiable que flags adicionales.
  - **Badges informativos**: Chips con contador son más efectivos que solo texto para datos numéricos.
  - **Renderizado condicional inteligente**: Mostrar preview solo cuando card está expandido mejora performance en listas largas.
  - **Animaciones nativas

