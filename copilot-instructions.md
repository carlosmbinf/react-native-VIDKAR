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

## Resumen técnico – Integración Geolocalización con Backend (Meteor Method cadete.updateLocation)

- **Contexto**: Envío automático de coordenadas GPS desde el dispositivo móvil al servidor backend cada vez que se obtiene la ubicación en modo cadete.

- **Método backend utilizado**: `cadete.updateLocation(data)`
  - **Parámetros requeridos**:
    ```javascript
    {
      userId: String,              // ID del cadete (debe coincidir con this.userId)
      location: {
        latitude: Number,          // Coordenada latitud
        longitude: Number,         // Coordenada longitud
        accuracy: Number,          // Precisión en metros (obligatorio, usar 0 si null)
        altitude: Number | null,   // Altura sobre nivel del mar (opcional)
        heading: Number | null,    // Dirección en grados (opcional)
        speed: Number | null,      // Velocidad en m/s (opcional)
        timestamp: Number,         // Unix timestamp en milisegundos
      }
    }
    ```

- **Validaciones de seguridad implementadas en backend**:
  1. **Autorización**: Solo el propio cadete puede actualizar su ubicación (`this.userId === data.userId`).
  2. **Existencia de usuario**: Verifica que el usuario exista en la base de datos.
  3. **Modo cadete activo**: Valida que `user.modoCadete === true` antes de aceptar la ubicación.
  4. **Validación de tipos**: Usa `check()` de Meteor para validar estructura del objeto.

- **Formato de almacenamiento en base de datos (GeoJSON)**:
  ```javascript
  Meteor.users.update(userId, {
    $set: {
      'location.coordinates': [longitude, latitude], // ⚠️ ORDEN: [lng, lat] para GeoJSON
      'location.type': 'Point',
      'location.accuracy': accuracy,
      'location.altitude': altitude,
      'location.heading': heading,
      'location.speed': speed,
      'location.lastUpdate': Date,
    }
  });
  ```
  **Importante**: GeoJSON requiere `[longitude, latitude]`, no `[latitude, longitude]`.

- **Flujo completo de envío de ubicación**:
  1. **Frontend**: `Geolocation.getCurrentPosition()` obtiene coordenadas.
  2. **Frontend**: Valida que Meteor esté conectado (`Meteor.status().connected`).
  3. **Frontend**: Valida que usuario esté autenticado (`Meteor.userId()`).
  4. **Frontend**: Construye objeto `locationData` con formato requerido.
  5. **Frontend**: Llama `Meteor.call('cadete.updateLocation', locationData, callback)`.
  6. **Backend**: Valida permisos y estructura de datos.
  7. **Backend**: Actualiza `Meteor.users` con coordenadas en formato GeoJSON.
  8. **Backend**: Retorna `{ success: true, timestamp: Date }`.

- **Manejo de errores implementado**:
  - **unauthorized**: Usuario intenta actualizar ubicación de otro cadete.
  - **user-not-found**: El userId no existe en la base de datos.
  - **modo-cadete-inactive**: El usuario no tiene modo cadete activado.
  - **Meteor desconectado**: Se logea warning pero no se intenta enviar.
  - **Error de geolocalización**: Se logea error pero no bloquea servicio foreground.

- **Optimizaciones de red implementadas**:
  - **Envío condicional**: Solo envía si `Meteor.status().connected && Meteor.userId()`.
  - **Callback no bloqueante**: Usa callback asíncrono para no bloquear UI.
  - **Caché de ubicación**: Reutiliza ubicación con hasta 15 segundos de antigüedad.
  - **Frecuencia controlada**: Envía cada 20 segundos (intervalo de monitoreo).

- **Parseo de datos críticos**:
  - **accuracy**: Si viene null, se envía `0` (backend lo requiere como Number).
  - **altitude/heading/speed**: Se envían como null si no están disponibles (backend acepta Match.Maybe).
  - **timestamp**: Se usa directamente de `position.timestamp` (Unix timestamp en ms).

- **Logs de depuración implementados**:
  ```javascript
  // Local (frontend)
  console.log('📍 [Ubicación Cadete]:', { lat, lng, accuracy, timestamp });
  
  // Éxito de envío
  console.log('✅ [Envío Ubicación] Enviada correctamente al servidor');
  
  // Error de envío
  console.error('❌ [Envío Ubicación] Error:', error.reason);
  
  // Meteor desconectado
  console.warn('⚠️ [Envío Ubicación] No conectado a Meteor, ubicación no enviada');
  
  // Backend (server)
  console.log(`📍 [Cadete ${username}] Ubicación actualizada:`, { lat, lng, accuracy });
  ```

- **Índices requeridos en MongoDB** (para consultas geo-espaciales futuras):
  ```javascript
  // En server/main.js
  Meteor.users.createIndex({ 'location.coordinates': '2dsphere' });
  ```
  Esto permite queries como "cadetes cercanos a una coordenada" usando `$near` o `$geoWithin`.

- **Queries geo-espaciales posibles tras implementación**:
  ```javascript
  // Encontrar cadetes en un radio de 5km
  Meteor.users.find({
    modoCadete: true,
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 5000 // 5km en metros
      }
    }
  });
  
  // Encontrar cadetes en un área rectangular
  Meteor.users.find({
    modoCadete: true,
    'location.coordinates': {
      $geoWithin: {
        $box: [[swLng, swLat], [neLng, neLat]]
      }
    }
  });
  ```

- **Casos de uso futuros**:
  1. **Asignación inteligente**: Asignar pedido al cadete más cercano a la tienda.
  2. **Mapa en tiempo real**: Mostrar posición de todos los cadetes activos en mapa del admin.
  3. **Ruta optimizada**: Calcular ruta más corta para múltiples entregas.
  4. **ETA dinámico**: Estimar tiempo de llegada basado en velocidad y ubicación actual.
  5. **Geofencing**: Notificar cuando cadete entra/sale de zona de entrega.
  6. **Historial de rutas**: Guardar trazabilidad de entregas para auditoría.

- **Consideraciones de privacidad y seguridad**:
  - **Solo mientras está activo**: Ubicación solo se envía cuando `modoCadete === true`.
  - **No histórico por defecto**: Solo se guarda última ubicación, no trazas completas.
  - **Autorización estricta**: Backend rechaza actualizaciones de otros usuarios.
  - **GDPR compliance**: Ubicación se borra al desactivar modo cadete (opcional, implementar).

- **Mejoras pendientes**:
  - **Batch updates**: Si hay múltiples ubicaciones pendientes, enviar en un solo request.
  - **Retry logic**: Re-intentar envío si falla por conexión temporal.
  - **Offline queue**: Guardar ubicaciones en AsyncStorage si Meteor está desconectado.
  - **Compression**: Reducir precisión a 5 decimales para ahorrar bandwidth.
  - **Throttling**: Limitar frecuencia de envío si cadete está quieto (speed === 0).

- **Testing recomendado**:
  - **Caso 1**: Cadete activo en movimiento → ubicación se envía cada 20 seg.
  - **Caso 2**: Meteor desconectado → ubicación NO se envía, logea warning.
  - **Caso 3**: Usuario sin modo cadete → backend rechaza con error `modo-cadete-inactive`.
  - **Caso 4**: Usuario A intenta actualizar ubicación de usuario B → backend rechaza con `unauthorized`.
  - **Caso 5**: GPS sin señal → error de geolocalización, no crashea servicio.
  - **Caso 6**: Cadete desactiva modo → ubicaciones dejan de enviarse inmediatamente.

- **Lecciones aprendidas**:
  - **GeoJSON order matters**: MongoDB requiere `[longitude, latitude]`, no `[lat, lng]`.
  - **Validar conexión antes de enviar**: Evita errores innecesarios cuando Meteor está desconectado.
  - **Callback no bloqueante es crítico**: `Meteor.call()` con callback evita bloquear thread de geolocalización.
  - **Parseo defensivo de nulls**: Backend requiere `accuracy` como Number, frontend debe enviar 0 si es null.
  - **Match.Maybe para opcionales**: Backend debe usar `Match.Maybe(Number)` para campos que pueden ser null.
  - **Logs detallados**: Facilitan debugging en producción cuando hay problemas de ubicación.

- **Archivos modificados**:
  - `NotificacionAndroidForeground.js`: Agregado envío de ubicación via `Meteor.call('cadete.updateLocation')`.
  - `server/metodos/cadetes.js`: Método backend ya existente (sin cambios).

- **Próximos pasos**:
  1. Crear índice 2dsphere en producción: `db.users.createIndex({ "location.coordinates": "2dsphere" })`.
  2. Implementar mapa de admin con posiciones en tiempo real de cadetes.
  3. Agregar método `cadete.getNearby(lat, lng, radius)` para búsqueda de cadetes cercanos.
  4. Implementar notificación push cuando cadete entra en radio de 500m de la tienda.
  5. Guardar historial de ubicaciones en `CadeteLocationHistoryCollection` para auditoría (opcional).
  6. Tests e2e para validar que ubicaciones se actualizan correctamente en base de datos.

---

## Resumen técnico – Rastreo de Ubicación iOS en Background (react-native-geolocation-service)

- **Contexto**: Implementación de rastreo de ubicación GPS continuo en iOS para cadetes activos. Similar a Android pero más simple, sin notificación foreground, solo rastreo directo.

- **Librería utilizada**: `react-native-geolocation-service` (v5.3.1)
  - **Ventajas sobre @react-native-community/geolocation**:
    - ✅ `watchPosition()` con mejor soporte en background.
    - ✅ `forceRequestLocation: true` para obtener ubicación fresca siempre.
    - ✅ `distanceFilter: 0` para rastreo continuo sin filtrar cambios.
    - ✅ Mejor integración nativa con Location Services de iOS.
    - ✅ `useSignificantChanges: false` para rastreo frecuente.
  - **Desventajas**:
    - Requiere librería de terceros (no oficial de React Native).
    - Menor documentación que la oficial.

- **Implementación en NotificacionIOSForeground.js**:
  - **watchPosition()**: Rastreo continuo que obtiene ubicación cada cambio.
  - **Parámetros clave**:
    ```javascript
    {
      enableHighAccuracy: true,        // GPS de máxima precisión
      timeout: 15000,                  // 15 seg para obtener ubicación
      maximumAge: 0,                   // Sin caché, siempre fresco
      distanceFilter: 0,               // Obtener cada cambio (no filtrar)
      forceRequestLocation: true,      // Forzar nueva lectura
      useSignificantChanges: false,    // No usar cambios significativos
    }
    ```
  - **Datos enviados al backend**:
    ```javascript
    {
      userId: String,
      location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        altitude: Number | null,
        heading: Number | null,
        speed: Number | null,
        timestamp: Number,
      }
    }
    ```

- **Flujo de funcionamiento**:
  1. **index.js**: Solicita permisos iOS con `Geolocation.requestAuthorization('always')`.
  2. **IOSLocationService()**: Se inicia automáticamente al abrir la app.
  3. **monitorLocationService()**: Verifica cada 30 segundos si `modoCadete` está activo.
  4. **startLocationTracking()**: Si activo, inicia `watchPosition()` que rastrea continuamente.
  5. **Envío al backend**: Cada ubicación se envía via `Meteor.call('cadete.updateLocation', ...)`.
  6. **stopLocationTracking()**: Se detiene al desactivar `modoCadete` o cerrar app.

- **Manejo de permisos iOS**:
  - `requestAuthorization('always')`: Solicita permiso para ubicación siempre (foreground + background).
  - **Info.plist ya configurado con**:
    ```xml
    <key>NSLocationWhenInUseUsageDescription</key>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <key>NSLocationAlwaysUsageDescription</key>
    <key>UIBackgroundModes</key>
      <string>location</string>
    ```
  - ✅ Capacidad "Background Modes → Location Updates" ya habilitada.

- **Estados del servicio**:
  - **isServiceActive**: Boolean que indica si watchPosition está activo.
  - **watchId**: ID del reloj para poder detenerlo con `clearWatch()`.
  - **monitorInterval**: Intervalo que verifica cada 30 seg si debe estar activo.

- **Diferencias con Android (NotificacionAndroidForeground.js)**:
  | Aspecto | Android | iOS |
  |---------|---------|-----|
  | **Librería** | @react-native-community/geolocation | react-native-geolocation-service |
  | **Notificación** | Foreground persistente (modo cadete visible) | No hay notificación (rastreo silencioso) |
  | **getCurrentPosition** | Llamadas puntuales cada 5 seg | watchPosition continuo |
  | **Permisos** | REQUEST_PERMISSIONS dinámico | requestAuthorization 'always' |
  | **Background** | Servicio foreground obligatorio | Location Services nativo de iOS |
  | **Intervalo** | ~20 segundos de envío | Cada cambio de ubicación |

- **Manejo de errores**:
  - **Code 1 (PERMISSION_DENIED)**: Usuario rechazó permisos → solo log warning.
  - **Code 2 (POSITION_UNAVAILABLE)**: GPS sin señal → continúa intentando.
  - **Code 3 (TIMEOUT)**: Tardó >15s en obtener ubicación → reintenta en siguiente ciclo.
  - **Error de Meteor**: No conectado a servidor → log warning, no genera crash.
  - ✅ **Ningún error detiene el servicio**, solo se logean advertencias.

- **Optimizaciones implementadas**:
  - ✅ **watchId guardado**: Para poder detener rastreo con `clearWatch()`.
  - ✅ **monitorInterval cada 30s**: No verifica `modoCadete` constantemente (ahorra batería).
  - ✅ **AppState listener**: Reacción a cambios de estado de la app (foreground/background).
  - ✅ **Cleanup en desmontar**: Elimina listeners y detiene rastreo al desinstalar servicio.

- **Archivos modificados**:
  - ✅ `NotificacionIOSForeground.js`: Nuevo archivo con servicio iOS.
  - ✅ `index.js`: Importación de IOSLocationService e inicialización condicional por platform.

- **Consideraciones técnicas críticas**:
  - ✅ **No afecta otras funcionalidades**: Módulo completamente independiente.
  - ✅ **Same contract con backend**: Usa mismo endpoint `cadete.updateLocation`.
  - ✅ **Permiso 'always'**: Requiere que usuario otorgue permiso en Settings/Privacy/Location.
  - ⚠️ **Battery impact**: `enableHighAccuracy: true` + `watchPosition` consume batería. 
    - **Mitigation**: Limitar a modoCadete=true, considerar reducir frecuencia si speed=0.
  - ⚠️ **App store**: Apple requiere justificación clara para Background Location (ya en Info.plist).

- **Testing recomendado**:
  - ✅ **Caso 1**: Activar modoCadete → ubicación debe enviarse inmediatamente.
  - ✅ **Caso 2**: App en background → ubicación debe continuar (iOS Location Services).
  - ✅ **Caso 3**: Desactivar modoCadete → watchPosition debe detenerse en ≤30s.
  - ✅ **Caso 4**: Cambiar permisos en Settings → servicio debe reaccionar.
  - ✅ **Caso 5**: Cerrar/abrir app → monitor debe reiniciarse sin duplicados.
  - ✅ **Caso 6**: Sin conexión Meteor → ubicación no se envía, solo se logea warning.
  - ✅ **Caso 7**: GPS sin señal → reintenta hasta obtener ubicación.

- **Mejoras futuras sugeridas**:
  - Implementar throttling cuando `speed === 0` (usuario parado).
  - Reducir `timeout` si ya tenemos ubicación reciente.
  - Agregar contador de fallos para disminuir frecuencia si GPS inestable.
  - Sincronizar frecuencia iOS-Android mediante property en ConfigCollection.
  - Implementar notificación local (no foreground) cuando se inicia rastreo.
  - Tests e2e para validar rastreo continuo sin crashes en 10+ minutos.

- **Lecciones aprendidas**:
  - **watchPosition vs getCurrentPosition**: watchPosition es mejor para rastreo continuo en iOS.
  - **distanceFilter: 0**: CRÍTICO para obtener cada cambio, no filtrar por distancia.
  - **forceRequestLocation: true**: Asegura que siempre se obtiene ubicación fresca.
  - **AppState listener**: Esencial para reaccionar a cambios de ciclo de vida.
  - **clearWatch() imprescindible**: Sin esto, múltiples watchPositions se acumulan y crashean.

---

## Resumen técnico – Card Colapsable con Animaciones para Carrito COMERCIO

### **Contexto**
Implementación de card colapsable profesional para items de tipo `COMERCIO` en `ListaPedidosRemesa.jsx`, siguiendo principios de UX modern mobile design con animaciones nativas.

### **Arquitectura del Componente**
- **Estado local por card**: Cada item maneja su propio `expanded` state (evita re-renders globales).
- **Dos secciones visuales**:
  1. **Resumen (siempre visible)**: Nombre producto, cantidad, precio total, indicador de expansión.
  2. **Detalles (expandible)**: Descripción, precio unitario, tipo de producto, ubicación GPS, dirección, notas, estado.

### **Animaciones Implementadas**
- **LayoutAnimation**: Expansión/colapso suave del contenido con `easeInEaseOut` preset.
- **Animated API**: Rotación del icono chevron (0° → 180°) con `useNativeDriver: true` para 60fps.
- **Platform-specific setup**: Habilitación de `setLayoutAnimationEnabledExperimental` en Android.

### **Estructura del Card COMERCIO**
```markdown
---

## Características Implementadas

### ✅ **UX/UI Profesional**
- **Card resumido por defecto**: Solo muestra nombre del producto, cantidad y precio total.
- **Expansión suave**: `LayoutAnimation.Presets.easeInEaseOut` para transiciones fluidas.
- **Icono animado**: Chevron rota 180° al expandir/colapsar.
- **TouchableOpacity**: Feedback visual al tocar el card.

### ✅ **Animaciones Nativas**
- **Rotación del chevron**: Animated API con `useNativeDriver: true` para 60fps.
- **Expansión del contenido**: LayoutAnimation para altura dinámica sin glitches.
- **Compatible iOS/Android**: Configuración específica para `UIManager` en Android.

### ✅ **Información Jerárquica**
**Card principal (SIEMPRE visible)**:
- Nombre del producto (con ellipsis si es muy largo)
- Subtítulo "Pedido de Tienda"
- Cantidad de unidades
- Precio total destacado en color temático
- Indicador "Ver más detalles" / "Ver menos"

**Detalles expandibles (solo al tocar)**:
- Descripción completa del producto
- Precio unitario
- Tipo de producto (elaboración/stock)
- Coordenadas GPS de entrega
- Dirección física (si existe)
- Notas adicionales del cliente
- Badge de estado (Entregado/Pendiente)

### ✅ **Accesibilidad**
- **Stop propagation en botón eliminar**: No expande el card al eliminar.
- **Contraste adecuado**: Labels en mayúsculas con letter-spacing.
- **Iconografía clara**: Icons de Material Design para cada campo.

### ✅ **Performance**
- **Estado local por card**: Cada item maneja su propio estado `expanded`.
- **Lazy rendering**: Detalles solo se renderizan cuando `expanded === true`.
- **useNativeDriver**: Animaciones en thread nativo (sin bloquear JS).

---

## Próximos Pasos Recomendados

1. **Aplicar mismo patrón a otros tipos de card** (RECARGA/REMESA/PROXY/VPN).
2. **Agregar animación de entrada**: `FadeIn` cuando el card aparece por primera vez.
3. **Botón "Ver en Mapa"**: Abrir coordenadas en Google Maps/Apple Maps.
4. **Edición de cantidad**: Botones +/- en el card expandido.
5. **Preview de imagen del producto**: Si existe `producto.imagen`.

---

## Actualización de copilot-instructions.md

