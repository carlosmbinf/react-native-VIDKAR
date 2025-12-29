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

## Resumen técnico – Configuración de Drawer con Ancho Fijo (react-native-drawer)

- **Contexto**: Limitación de ancho de drawer a 500px con área táctil de cierre apropiada.

- **Problema común**: Usar `openDrawerOffset` calculado dinámicamente causa áreas de cierre lejanas e inconsistentes.

- **Solución profesional**:
  ```javascript
  const maxDrawerWidth = 500;
  
  <Drawer
    openDrawerOffset={0}                  // Sin gap desde borde derecho
    closedDrawerOffset={-maxDrawerWidth}  // Drawer fuera de pantalla cuando cerrado
    panCloseMask={0.8}                    // 80% del drawer es área táctil de cierre
    panOpenMask={0.05}                    // Solo 5% del borde izquierdo abre con gesto
    styles={{
      drawer: { 
        width: maxDrawerWidth,            // Ancho fijo explícito
        elevation: 16,                    // Elevación Material Design
        shadowOpacity: 0.3                // Sombra visible
      }
    }}
  />
  ```

- **Props críticas explicadas**:
  - `openDrawerOffset`: Gap desde borde **derecho** (NO es el ancho del drawer).
  - `closedDrawerOffset`: Posición cuando cerrado (negativo = fuera de pantalla).
  - `panCloseMask`: Fracción del drawer táctil para cerrar (0.8 = 80%).
  - `panOpenMask`: Fracción del borde izquierdo para abrir con gesto (0.05 = 5%).

- **Cálculo de áreas táctiles**:
  - **Drawer abierto (500px)**:
    - Área de cierre táctil: `0.8 * 500 = 400px` (desde px 100 hasta px 500).
    - Overlay oscuro: Desde px 500 hasta screenWidth (tocar aquí cierra).
  - **Drawer cerrado**:
    - Área de apertura con gesto: `0.05 * screenWidth` (solo borde izquierdo).

- **Mejores prácticas**:
  - **Ancho responsivo** (opcional):
    ```javascript
    const maxDrawerWidth = Math.min(500, screenWidth * 0.8);
    ```
  - **Evitar `openDrawerOffset` relativo**: Usar valores absolutos para predecibilidad.
  - **`panCloseMask` alto (0.7-0.8)**: Mejora UX al ampliar área táctil de cierre.
  - **`panOpenMask` bajo (0.05)**: Evita conflictos con scroll horizontal.

- **Testing recomendado**:
  - Validar ancho exacto con herramientas de inspección (React DevTools).
  - Probar cierre con múltiples métodos: tap overlay, tap dentro del drawer, swipe, botón back.
  - Validar en landscape mode (drawer no debe crecer proporcionalmente).
  - Testing en phones (<400px), phablets (414px), tablets (768px+).

- **Lecciones aprendidas**:
  - `openDrawerOffset` es el **gap** desde el borde derecho, NO el ancho del drawer.
  - Ancho fijo con `closedDrawerOffset={-width}` + `openDrawerOffset={0}` es más predecible.
  - `panCloseMask` bajo (0.2) frustra a usuarios (deben tocar muy cerca del borde).
  - Material Design recomienda `elevation: 16` para navigation drawers.

- **Alternativas consideradas**:
  - **react-native-gesture-handler Drawer**: Mejor soporte para gestos nativos.
  - **react-navigation DrawerNavigator**: Integración nativa con navegación.
  - Ambas requieren migración de código existente.

---

## Resumen técnico – Hook de Dimensiones Reactivo (useDimensions)

- **Problema identificado**: Las constantes `Dimensions.get('window')` calculadas al montar el componente NO se actualizan cuando cambian las dimensiones de la ventana (rotación, split screen).

- **Solución implementada**: Hook `useState` + `Dimensions.addEventListener()` para escuchar cambios en tiempo real.

- **Implementación crítica**:
  ```javascript
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    
    return () => {
      if (subscription?.remove) {
        subscription.remove(); // RN 0.65+
      } else {
        Dimensions.removeEventListener('change', subscription); // RN <0.65
      }
    };
  }, []);
  ```

- **Diferencias entre `window` y `screen`**:
  - **window**: Área disponible para la app (excluye status bar, navigation bar).
  - **screen**: Tamaño físico total del dispositivo (incluye barras del sistema).
  - **Recomendación**: Usar `window` para cálculos de layout (drawer, modals, etc.).

- **Casos de uso cubiertos**:
  1. **Rotación de pantalla**: Portrait ↔ Landscape.
  2. **Split screen (tablets)**: App ocupa solo mitad de pantalla.
  3. **Fold devices**: Plegables como Samsung Galaxy Fold.
  4. **Picture-in-Picture (Android)**: Modo ventana flotante.

- **Performance consideraciones**:
  - El listener solo dispara cuando dimensiones **realmente** cambian.
  - React hace shallow comparison, evita re-renders innecesarios.
  - Cleanup del listener previene memory leaks (crítico en navegación stack).

- **Hook personalizado reutilizable**:
  ```javascript
  // hooks/useDimensions.js
  export const useDimensions = () => {
    const [dimensions, setDimensions] = useState({
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    });

    useEffect(() => {
      const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
        setDimensions({ window, screen });
      });
      return () => subscription?.remove();
    }, []);

    return dimensions;
  };
  ```

- **Testing recomendado**:
  - Rotar dispositivo en emulador (Cmd+Left/Right en iOS, Ctrl+F11/F12 en Android).
  - Activar split screen en tablet real.
  - Probar en dispositivos plegables (Android Studio tiene emulador de Fold).
  - Validar con dev tools que listener se limpia correctamente.

- **Lecciones aprendidas**:
  - **`Dimensions.get()` NO es reactivo**: Solo retorna snapshot actual.
  - **Siempre cleanup listeners**: Previene múltiples suscripciones duplicadas.
  - **Diferencia RN 0.65**: API cambió de `removeEventListener` a `subscription.remove()`.
  - **Evitar cálculos en render**: Calcular `drawerStartOffset` fuera de JSX para legibilidad.
  - **Safe area insets son separados**: `useSafeAreaInsets()` NO se actualiza con dimensiones, solo con notch/home indicator.

- **Archivos modificados**:
  - `components/Main/MenuPrincipal.jsx`: Implementación de hook de dimensiones.
  - `hooks/useDimensions.js`: Hook reutilizable (recomendado crear).

- **Próximos pasos**:
  - Extraer hook a archivo separado para reutilización.
  - Aplicar pattern en otras pantallas con drawers/modals responsivos.
  - Agregar logs en dev mode para debugging de cambios de dimensiones.
  - Tests unitarios para validar re-cálculos en diferentes orientaciones.

---

