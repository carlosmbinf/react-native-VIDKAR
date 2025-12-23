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

## Resumen técnico – Mapa de Usuarios con Coordenadas (Sistema de Tracking)
- **Contexto**: Implementación de visualización en mapa de todos los usuarios que tienen coordenadas registradas, con diferenciación por roles y estados.

- **Componentes creados**:
  - **MapaUsuarios.jsx**: Componente de mapa reutilizable que consume suscripción de usuarios con coordenadas.
  - **MapaUsuariosScreen.jsx**: Pantalla completa con estadísticas, filtros y mapa integrado.

- **Características técnicas implementadas**:
  - **Suscripción reactiva**: `usuarios.conCoordenadas` con fields limitados para optimizar datos.
  - **Cálculo de región automático**: Algoritmo que calcula latitudeDelta/longitudeDelta para abarcar todos los marcadores.
  - **Compatibilidad de schemas**: Soporta tanto `cordenadas` como `coordenadas` (typo histórico en DB).
  - **Marcadores diferenciados**: Por rol (cadete, admin, empresa, usuario) y estado (online/offline).
  - **Estadísticas en tiempo real**: Contadores reactivos de usuarios por categoría.

- **Seguridad implementada**:
  - Publicación `usuarios.conCoordenadas` **solo para admins** (`profile.role === 'admin'`).
  - Fields limitados: no expone datos sensibles (tokens, passwords, etc.).
  - Validación de `this.userId` antes de retornar datos.

- **Estructura de coordenadas en Users collection**:
  ```javascript
  {
    cordenadas: { // o "coordenadas" (normalizar a futuro)
      latitude: Number,
      longitude: Number,
      accuracy: Number,      // Precisión en metros
      altitude: Number,      // Altitud (puede ser null)
      heading: Number,       // Dirección (-1 si no disponible)
      speed: Number,         // Velocidad (-1 si no disponible)
      timestamp: Number      // Unix timestamp en milisegundos
    }
  }
  ```

- **Algoritmo de cálculo de región**:
  ```javascript
  // Encuentra min/max de todas las coordenadas
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  
  // Centra y aplica padding 50%
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = (maxLat - minLat) * 1.5 || 0.05;
  const lngDelta = (maxLng - minLng) * 1.5 || 0.05;
  ```

- **Iconografía de marcadores**:
  | Rol/Estado | Ícono sugerido | Color pinColor | Emoji |
  |------------|----------------|----------------|-------|
  | Cadete activo | pin_cadete_50x50.png | #FF9800 (naranja) | 🚴 |
  | Admin | pin_admin_50x50.png | #2196F3 (azul) | 👨‍💼 |
  | Empresa | pin_shop_50x50.png | #4CAF50 (verde) | 🏪 |
  | Usuario normal | pin_user_50x50.png | #757575 (gris) | 👤 |
  | Online | - | #4CAF50 (verde) | 🟢 |
  | Offline | - | #757575 (gris) | ⚪ |

- **Optimizaciones implementadas**:
  - **useTracker con fields limitados**: Solo campos necesarios para renderizado.
  - **Memoización implícita**: React Native Maps re-renderiza solo marcadores modificados.
  - **Cálculo de región una sola vez**: En useEffect con deps `[usuarios, initialRegion]`.

- **Estados manejados**:
  - **loading**: Mientras carga suscripción (muestra texto "Cargando mapa...").
  - **empty**: Si no hay usuarios con coordenadas (muestra emoji + mensaje).
  - **error**: Si falla suscripción (requiere implementar boundary).

- **Integración con sistema existente**:
  - Reutiliza `MapView` y `Marker` de `react-native-maps`.
  - Compatible con `MapaPedidos.jsx` (mismo estilo visual).
  - Preparado para integrar con sistema de notificaciones (tracking en tiempo real).

- **Mejoras futuras recomendadas**:
  1. **Clustering**: Usar `react-native-map-clustering` para >50 usuarios.
  2. **Filtros activos**: Implementar prop `filtroRol` en MapaUsuarios para filtrar marcadores.
  3. **Detalle de usuario**: Modal/BottomSheet al tocar marcador con datos completos.
  4. **Tracking en tiempo real**: WebSocket para actualizar coordenadas sin re-suscribir.
  5. **Heatmap**: Mostrar densidad de usuarios por zona.
  6. **Rutas**: Dibujar polylines de rutas de cadetes activos.
  7. **Geofencing**: Alertas cuando usuario entra/sale de zona específica.

- **Testing recomendado**:
  - **Caso 1**: 0 usuarios con coordenadas → debe mostrar empty state.
  - **Caso 2**: 1 usuario → debe centrar mapa en esa ubicación.
  - **Caso 3**: >10 usuarios dispersos → debe calcular región que abarque todos.
  - **Caso 4**: Usuario actualiza coordenadas → marcador debe moverse sin refresh.
  - **Caso 5**: Usuario no-admin intenta suscribirse → debe retornar empty (seguridad).
  - **Caso 6**: Tocar marcador → debe mostrar callout con título/descripción.

- **Consideraciones técnicas críticas**:
  - **Typo en DB**: Normalizar `cordenadas` → `coordenadas` en migración futura.
  - **Timestamp actualizado**: Validar que `timestamp` se actualice al mover ubicación.
  - **Accuracy**: Filtrar marcadores con `accuracy > 100` metros (baja precisión).
  - **Battery optimization**: Considerar interval de actualización de coordenadas (cada 30s, no en tiempo real).
  - **Privacy**: Permitir que usuarios oculten su ubicación (campo `compartirUbicacion: boolean`).

- **Seguridad y privacidad**:
  - Solo admins ven ubicaciones de TODOS los usuarios.
  - Usuarios normales solo deberían ver:
    - Su propia ubicación.
    - Ubicación de cadetes asignados a sus pedidos.
    - Ubicación de tiendas públicas.
  - Implementar publicación separada `usuarios.miUbicacion` para usuarios no-admin.

- **Logs de depuración útiles**:
  ```javascript
  console.log('📍 Usuarios con coordenadas:', usuarios.length);
  console.log('🗺️ Región calculada:', region);
  console.log('⚠️ Usuarios sin coordenadas:', sinCoordenadas.length);
  ```

- **Lecciones aprendidas**:
  - **Cálculo de región es crítico**: Sin esto, el mapa puede mostrar océano o estar muy alejado.
  - **Marcadores sin imagen son más rápidos**: `pinColor` renderiza más rápido que custom images.
  - **Publicaciones de ubicación son sensibles**: SIEMPRE validar roles antes de exponer coordenadas.
  - **useTracker con fields**: Limitar fields mejora performance (no traer `services`, `emails`, etc.).
  - **Normalización de datos**: Tener `cordenadas` Y `coordenadas` complica lógica, migrar a uno solo.

- **Archivos creados/modificados**:
  - `components/comercio/maps/MapaUsuarios.jsx`: Componente principal de mapa.
  - `components/comercio/maps/MapaUsuariosScreen.jsx`: Pantalla con estadísticas y filtros.
  - `server/metodos/usuarios.js`: Publicación `usuarios.conCoordenadas` (agregada).
  - `App.js`: Registro de ruta `MapaUsuarios`.

- **Próximos pasos**:
  - Crear íconos personalizados de 50x50px para cada rol.
  - Implementar filtros activos (pasar prop a MapaUsuarios).
  - Agregar botón de "Centrar en mi ubicación".
  - Implementar modal de detalle de usuario al tocar marcador.
  - Migrar `cordenadas` → `coordenadas` en toda la DB.
  - Tests e2e del flujo completo: login admin → abrir mapa → ver usuarios → tocar marcador.

---

