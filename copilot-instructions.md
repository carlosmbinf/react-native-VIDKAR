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
