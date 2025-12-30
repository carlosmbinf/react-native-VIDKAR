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

## Resumen técnico – Validación obligatoria de país para pagos en efectivo/transferencia (WizardConStepper)
- **Requisito UX/Negocio**: Si el usuario selecciona pago por **Efectivo/Transferencia**, el **país de pago** pasa a ser un dato obligatorio (para derivar moneda y evitar ambigüedad).
- **Implementación**:
  - Se introdujo una validación explícita en el Step 2:
    - `requierePaisPago = metodoPago === 'efectivo' || metodoPago === 'transferencia'`
    - `puedeAvanzarMetodoPago = metodoPagoValido && (!requierePaisPago || !!paisPago)`
  - Se conectó la validación a `buttonNextDisabled` del `ProgressStep` “Metodo de Pago”, evitando que el usuario avance sin seleccionar país cuando aplique.
- **Buenas prácticas**:
  - Mantener la validación cerca del Step que captura el dato mejora mantenibilidad.
  - Mantener la lógica en booleanos legibles ayuda a futuras ampliaciones (más países, métodos separados, monedas adicionales).
- **Mejora futura sugerida**:
  - Mostrar texto de ayuda/error (“Seleccione un país para continuar”) si se desea feedback más explícito además del botón deshabilitado.

---

## Resumen técnico – País/moneda fija para Proxy/VPN en WizardConStepper
- **Regla de negocio**: Si el carrito contiene servicios `PROXY`/`VPN` (`tieneProxyVPN === true`), el pago se procesa únicamente en **Cuba**, por lo que la moneda queda fija en **CUP**.
- **Implementación UX**:
  - Se ocultó el selector de país para evitar fricción e inputs innecesarios en el flujo Proxy/VPN.
  - Se fuerza `paisPago = 'CUP'` cuando `tieneProxyVPN` es verdadero, manteniendo consistencia del estado interno.
- **Validación**:
  - El botón “Siguiente” del step “Método de Pago” sigue siendo estricto para efectivo/transferencia, pero se considera `paisPagoValido` automáticamente cuando `tieneProxyVPN` es true (ya que el país no se selecciona).
- **Notas para futuro**:
  - Si más adelante Proxy/VPN se habilita fuera de Cuba, reactivar selector condicionado por configuración (ej. `ConfigCollection: PROXY_VPN_PAISES_HABILITADOS`) para evitar hardcodear reglas de país.

---

## Resumen técnico – Sistema Dinámico de Países de Pago desde Properties (WizardConStepper)
- **Contexto**: Reemplazo de lista hardcoded de países por carga dinámica desde `ConfigCollection` para escalabilidad y mantenimiento centralizado.

- **Estructura de Properties para Países**:
  ```javascript
  {
    type: "METODO_PAGO",
    clave: "REMESA", // o tipo de servicio (RECARGA, PROXY, VPN)
    valor: "PAIS-MONEDA", // Formato: "CUBA-CUP", "URUGUAY-UYU"
    comentario: "Nombre legible (opcional)",
    active: true // Solo se cargan las activas
  }
  ```

- **Formato Estándar `PAIS-MONEDA`**:
  - **PAIS**: Nombre en MAYÚSCULAS (ej: CUBA, URUGUAY, ARGENTINA).
  - **MONEDA**: Código ISO 4217 en MAYÚSCULAS (ej: CUP, UYU, ARS, USD).
  - **Separador**: Guion medio (`-`), sin espacios ni caracteres especiales.
  - **Ejemplos válidos**: `CUBA-CUP`, `URUGUAY-UYU`, `ARGENTINA-ARS`.
  - **Ejemplos inválidos**: `Cuba - CUP` (espacios), `CUBA_CUP` (guion bajo), `CubaCUP` (sin separador).

- **Método Backend `property.getAllByTypeClave`**:
  - **Propósito**: Retornar array de properties que coincidan con `type` y `clave` específicos.
  - **Validaciones**:
    - `type` y `clave` son obligatorios (String no vacío).
    - Retorna solo campos necesarios (`_id`, `type`, `clave`, `valor`, `comentario`, `active`).
    - Ordena por `comentario` alfabéticamente para mejor UX.
  - **Uso típico**:
    ```javascript
    Meteor.call('property.getAllByTypeClave', 'METODO_PAGO', 'REMESA', (err, properties) => {
      // properties = [{ valor: "CUBA-CUP", ... }, { valor: "URUGUAY-UYU", ... }]
    });
    ```

- **Parseo de Formato `PAIS-MONEDA` en Frontend**:
  ```javascript
  const partes = valor.split('-'); // "URUGUAY-UYU" → ["URUGUAY", "UYU"]
  const [paisRaw, moneda] = partes;
  
  // Capitalizar país: URUGUAY → Uruguay
  const label = paisRaw.charAt(0).toUpperCase() + paisRaw.slice(1).toLowerCase();
  
  // Resultado: { label: "Uruguay", value: "UYU" }
  ```

- **Manejo de Errores Defensivo**:
  - **Formato inválido**: Si `valor` no contiene exactamente 1 guion, se descarta con `console.warn`.
  - **Sin properties**: Fallback a lista mínima `[{ label: 'Cuba', value: 'CUP' }]`.
  - **Error de red**: Muestra ActivityIndicator durante carga, mensaje de error si falla.

- **UX/UI Implementada**:
  - **Loading state**: ActivityIndicator + mensaje "Cargando países disponibles..." mientras se consulta backend.
  - **Búsqueda en dropdown**: Habilitada solo si hay >3 países (para listas largas).
  - **Mensaje de error**: Card rojo con "No hay países configurados" si la lista está vacía.
  - **Dropdown deshabilitado**: Si `paisesPagoData.length === 0`, el Dropdown se deshabilita automáticamente.

- **Reglas de Negocio Específicas**:
  - **Proxy/VPN**: País siempre es Cuba (CUP), NO se muestra selector (fijo en backend).
  - **Recargas/Remesas**: Se cargan países dinámicamente solo si `metodoPago === 'efectivo' || 'transferencia'`.
  - **PayPal/MercadoPago**: NO requieren selector de país (procesamiento internacional).

- **Flujo de Carga de Países**:
  1. Usuario selecciona método de pago Efectivo/Transferencia.
  2. Frontend detecta que requiere selector de país (`!tieneProxyVPN`).
  3. Se invoca `property.getAllByTypeClave('METODO_PAGO', 'REMESA')`.
  4. Backend retorna array de properties activas.
  5. Frontend parsea formato `PAIS-MONEDA` y construye array `[{ label, value }]`.
  6. Dropdown se llena con países parseados.
  7. Usuario selecciona país → `paisPago` se setea con el código de moneda (`value`).

- **Extensibilidad del Sistema**:
  - **Agregar nuevo país**: Crear nueva property con formato `PAIS-MONEDA` y `active: true`.
  - **Deshabilitar país**: Cambiar `active: false` en la property (no se mostrará en selector).
  - **Múltiples tipos de servicio**: Usar diferentes valores de `clave` (ej: `REMESA`, `RECARGA`, `PROXY`).
  - **Personalización por usuario**: Filtrar properties por `idUser` si se requiere disponibilidad regional.

- **Validaciones Frontend Críticas**:
  - `paisesPagoData.length === 0`: Bloquear avance al siguiente paso (botón "Siguiente" deshabilitado).
  - `paisPago === null`: No permitir confirmar compra sin país seleccionado.
  - `monedaPago`: Siempre usar `paisPago` como moneda de pago (no confundir con moneda de producto).

- **Testing Recomendado**:
  - **Caso 1**: Sin properties en BD → debe mostrar fallback "Cuba - CUP".
  - **Caso 2**: Property con formato inválido `CUBA_CUP` → debe descartarse y logear warning.
  - **Caso 3**: Carrito con Proxy/VPN + Remesa → país fijo CUP para Proxy, dinámico para Remesa.
  - **Caso 4**: Usuario deshabilita property (`active: false`) → país desaparece del selector en tiempo real.
  - **Caso 5**: Network timeout en `property.getAllByTypeClave` → debe mostrar error y fallback.

- **Consideraciones de Rendimiento**:
  - Cargar países solo cuando se necesita (no al montar el wizard).
  - No re-cargar países si ya están en estado (evitar llamadas duplicadas).
  - Usar `useEffect` con dependencias `[metodoPago, tieneProxyVPN]` para optimizar.

- **Mejoras Futuras Sugeridas**:
  - **Cache de países**: Almacenar en AsyncStorage para evitar llamadas repetidas.
  - **Banderas de países**: Agregar campo `flagEmoji` en property (ej: `🇨🇺`, `🇺🇾`).
  - **Filtrado por zona horaria**: Ordenar países por UTC offset para mejor UX internacional.
  - **Validación de moneda en backend**: Verificar que `monedaPago` enviado coincida con property activa.

- **Logs de Auditoría Recomendados**:
  ```javascript
  // Al seleccionar país
  LogsCollection.insert({
    type: 'SELECCION_PAIS_PAGO',
    userId: Meteor.userId(),
    pais: paisPago,
    metodoPago,
    timestamp: new Date()
  });
  ```

- **Archivos Modificados**:
  - `components/carritoCompras/WizardConStepper.jsx`: Lógica de carga dinámica de países.
  - `server/metodos/property.js`: Nuevo método `property.getAllByTypeClave`.
  - `copilot-instructions.md`: Documentación técnica del sistema.

- **Lecciones Aprendidas**:
  - **Properties como fuente de verdad**: Centralizar listas dinámicas en BD facilita mantenimiento.
  - **Formato estandarizado**: `PAIS-MONEDA` permite parseo consistente y extensible.
  - **Fallbacks defensivos**: Siempre tener lista mínima hardcoded por si falla carga dinámica.
  - **Loading states**: Mostrar feedback visual durante queries async mejora percepción de velocidad.
  - **Capitalización en frontend**: Transformar `URUGUAY` → `Uruguay` en cliente evita sobrecarga de BD.

- **Próximos Pasos**:
  - Crear properties para países de prueba en entorno de desarrollo.
  - Tests unitarios para parseo de formatos `PAIS-MONEDA`.
  - Validar UX en dispositivos Android/iOS con listas largas (>10 países).
  - Documentar convención de nomenclatura de properties en wiki del proyecto.

---
