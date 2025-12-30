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

## Resumen técnico – UX PermissionsGate: mantener pasos concedidos + navegación bidireccional

- **Requisito UX**: En el slider de permisos, los permisos ya concedidos **no deben desaparecer**; deben mostrarse como “Aprobado” (estado elegante) y sin botón de solicitar.
- **Cambio de enfoque**:
  - Antes: `steps` representaba solo “pendientes”.
  - Ahora: `steps` representa **todos los permisos requeridos** en orden, y cada slide recibe `status` para renderizar su estado.
- **UI profesional aplicada**:
  - Si `status === 'granted'`: mostrar indicador “Aprobado” + CTA “Siguiente/Finalizar”; ocultar “Conceder permiso”.
  - Si `status === 'blocked'`: enfatizar “Abrir ajustes” como acción principal.
- **Navegación**:
  - Se habilitó swipe **izquierda/derecha** (adelante/atrás).
  - Se agregaron botones “Atrás” y “Siguiente/Finalizar” para accesibilidad y control explícito.
- **Lección técnica**:
  - En wizards de onboarding con estados reactivos, separar “estado del paso” (status) de “existencia del paso” (lista fija) mantiene consistencia visual y reduce jumps inesperados en UI.

---

## Resumen técnico – UX PermissionsGate: no auto-avanzar al conceder un permiso

- **Requisito UX**: Cuando un permiso se concede, **no** avanzar automáticamente al siguiente slide.
- **Motivo**:
  - Da tiempo al usuario a validar visualmente el estado “Aprobado”, aumenta confianza.
  - Evita sensación de “saltos” o pérdida de control, especialmente si el sistema muestra dialogs nativos.
- **Implementación**:
  - En `handleRequest`, si `res.ok === true`, solo limpiar error/loading y mantener el `index`.
  - La navegación queda a cargo del usuario (swipe o botón “Siguiente/Finalizar”).
- **Nota de arquitectura**:
  - Para que el slide muestre “Aprobado”, el manager debe refrescar `status` (ej. `checkAllPermissions()` tras request) y pasar el `status` actualizado al gate.

---

## Resumen técnico – UX polish: evitar Cards vacíos en wizard de permisos

- **Problema UX**: `PermissionsGate` mostraba un `Card` sin contenido cuando el permiso no estaba `granted` ni `blocked` y además no había `detail` ni `error`.
- **Causa raíz**: El `Card` se renderizaba siempre, pero la mayoría de sus secciones eran condicionales; en estados intermedios (`denied`, `unavailable`, `undefined`) quedaba vacío.
- **Solución aplicada**:
  - Crear flags `hasDetail`, `hasStatusInfo`, `shouldRenderInfoCard`.
  - Renderizar el `Card` solo si hay contenido real: detalle, estado relevante (aprobado/bloqueado) o error.
- **Lección**: En UI orientada a clientes, evitar contenedores “vacíos” mejora percepción de calidad; preferir render condicional basado en “hay contenido visible” en vez de “hay contenedor”.

---

## Resumen técnico – Slider/Carousel: renderizar slides adyacentes para transiciones reales

- **Problema UX**: Cuando el slider renderiza solo el step activo, al hacer swipe el slide siguiente/anterior no existe en el árbol; la transición se percibe “cortada” o incompleta.
- **Solución aplicada**: Implementar un “track” horizontal (`flexDirection: 'row'`) con `translateX` animado:
  - `translateX = -index * width + gestureDx`
  - Esto garantiza que los slides anterior/siguiente estén renderizados durante el gesto.
- **Buenas prácticas**:
  - Mantener el render cost bajo: si el número de pasos crece, optimizar a “windowed rendering” (solo `index-1..index+1`) pero manteniendo layout con placeholders del mismo ancho.
  - Mantener `clamp` del índice cuando `steps.length` cambia y reset defensivo si `current` queda `undefined`.
  - Restringir interacciones (botones, request) al slide activo para evitar side effects desde slides no enfocados.

---

## Resumen técnico – PermissionsGate: navegación solo por gesto (sin botones) + affordance clara

- **Objetivo UX**: Simplificar el wizard eliminando botones “Atrás/Siguiente” y reforzar que la navegación es por swipe (gesto).
- **Cambios aplicados**:
  - Se eliminaron CTAs redundantes de navegación para reducir ruido visual.
  - Se agregó un hint explícito con texto + chevrons “Desliza hacia los lados para navegar”.
  - Se movieron los “dots” al fondo, y el hint queda visualmente por encima de los dots para guiar la acción.
- **Consideración técnica**:
  - Mantener interacciones (request/settings) solo en el slide activo evita side effects desde slides no enfocados.
  - Si en el futuro se detecta baja descubribilidad del gesto, considerar añadir una animación sutil (micro-interacción) en el primer render (ej. bounce horizontal leve) sin afectar accesibilidad.

---

## Resumen técnico – PermissionsGate: hint de swipe “sticky” (footer) para evitar jitter visual

- **Problema UX**: El hint “Desliza…” dentro del slide se mueve con el contenido y puede percibirse como ruido/jitter durante el swipe.
- **Mejora aplicada**:
  - Mover el hint a un footer fijo (sticky) y ubicarlo **justo encima** de los dots.
  - Esto refuerza el patrón de navegación por gesto sin competir con el contenido del slide.
- **Regla general**:
  - Elementos de “instrucción de navegación” deben ser persistentes y estables en pantalla (footer/header) cuando el contenido es animado.

---

## Resumen técnico – Animación de transición (fade) al cambiar slides en PermissionsGate

- **Problema UX**: al cambiar de step (swipe) en `PermissionsGate`, el contenido cambiaba de forma brusca (texto/ícono/card/botones), dando una impresión poco profesional.
- **Solución aplicada (React Native Animated)**:
  - Se añadió un `Animated.Value` (`contentOpacity`) para controlar la opacidad del contenido del slide activo.
  - Se ejecuta una animación `fade-out -> fade-in` en cada cambio de `index` usando `Animated.sequence`:
    - 500ms hacia opacidad 0 + 500ms hacia opacidad 1 (≈ 1s total).
  - Se envolvió el contenido variable del slide en un `Animated.View` con `opacity`.
- **Buenas prácticas técnicas**:
  - `useNativeDriver: true` para mejorar rendimiento (opacidad es compatible).
  - La animación se ata al cambio de `index` (fuente única de verdad de navegación) evitando depender de eventos de swipe específicos, lo que mejora mantenibilidad si en el futuro se agrega navegación por botones/dots.
  - Remover `console.log` de render para evitar ruido y drops de performance en producción.
- **Mejoras futuras recomendadas**:
  - Si se desea sincronizar con el gesto (swipe), considerar interpolar opacidad en base a `gestureX` (más complejo pero aún más fluido).
  - Parametrizar duración (`fadeDurationMs`) vía props si se reutiliza el componente en otros flujos.

---

## Resumen técnico – PermissionsGate: flechas laterales “ghost” visibles solo durante el swipe

- **Objetivo UX**: reforzar la direccionalidad del gesto (anterior/siguiente) sin agregar botones ni ensuciar la interfaz; las flechas deben aparecer únicamente mientras el usuario desliza.
- **Implementación**:
  - Se añadieron `Animated.Value` para `arrowLeftOpacity` y `arrowRightOpacity`.
  - En `onPanResponderMove`, se calcula opacidad proporcional a `dx` (con umbral) y se muestra solo la flecha correspondiente:
    - `dx > 0` → flecha izquierda (volver) si `index > 0`.
    - `dx < 0` → flecha derecha (siguiente) si `index < steps.length - 1`.
  - En `onPanResponderRelease`, se ocultan ambas flechas con un `timing` corto para evitar que queden “pegadas”.
  - Las flechas se renderizan como **overlay absoluto** dentro de `viewport` con `pointerEvents="none"` para no interceptar taps ni afectar layout.
- **Buenas prácticas**:
  - No meter affordances de navegación dentro del slide (evita jitter y reflow); usar overlay estable.
  - Respetar bordes: no mostrar flecha “anterior” en el primer slide ni “siguiente” en el último.
  - Mantener colores y estilo “ghost” (`rgba`) para no competir con el contenido principal.

---

## Resumen técnico – PermissionsGate: “windowed rendering” (solo slide activo) manteniendo swipe con placeholders

- **Requisito UX/Performance**: evitar renderizar contenido de slides anterior/siguiente; solo debe existir el slide activo, manteniendo flechas “ghost” durante el gesto.
- **Estrategia aplicada**:
  - Se mantiene el `track` con `width: width * steps.length` y `translateX` para no romper el comportamiento del carrusel/gesto.
  - En el `.map()` del track se renderiza:
    - **Slide activo**: `renderSlide(step, index)`.
    - **Slides no activos**: placeholders `<View style={{ width }} />` (vacíos), para conservar el espacio y el cálculo de desplazamiento.
- **Beneficios**:
  - Reduce costo de render (especialmente si cada step tiene Card, iconos, lógica condicional).
  - Mantiene intacta la interacción del swipe y el layout del carrusel sin reescribir la navegación.
- **Nota importante**:
  - Esta técnica preserva el “espaciado” del carrusel, pero ya no permite previsualizar contenido de slides adyacentes (por diseño). Si en el futuro se requiere “peek”, usar ventana `index-1..index+1` en lugar de solo `index`.

---

## Resumen técnico – UX PermissionsGate: Ribbon “APROBADO” (overlay) para estado granted

- **Objetivo UX**: reforzar visualmente el estado “concedido” con un indicador premium y de alta legibilidad, sin agregar ruido en el contenido principal del slide.
- **Implementación (patrón ribbon)**:
  - Se renderiza un contenedor `ribbonWrapper` con `position: 'absolute'` en la esquina superior derecha del slide.
  - Dentro, un `View` rotado (`transform: rotate(45deg)`) crea el efecto de “cinta”.
  - `pointerEvents="none"` evita que el ribbon afecte el swipe o taps.
  - Se agregan `elevation` (Android) y `shadow*` (iOS) para un acabado profesional.
- **Buenas prácticas**:
  - Mantener el ribbon como overlay independiente del layout del contenido (no reflow).
  - Usar texto en mayúsculas + `letterSpacing` para legibilidad.
  - Ajustar `zIndex` y `overflow: 'hidden'` para recortar correctamente la cinta dentro de la esquina.

---

## Resumen técnico – Consistencia de borderRadius (“pill design”) en Cards Proxy/VPN

- Se estandarizó el lenguaje visual de los cards para Proxy/VPN basándose en `ProxyPackageCardItem`:
  - `borderRadius` principal de card en **30** para un look más moderno, consistente y “premium”.
  - `priceContainer.borderRadius` en **30** (chips/price pills coherentes).
  - `buyButton.borderRadius` en **30** para mantener continuidad visual en CTAs.
- Se aplicó en:
  - `ProxyPackageCard.jsx`: cards del grid, recommended y premium/unlimited + skeleton.
  - `VPNPackageCard.jsx`: cards del grid, recommended y premium/unlimited + skeleton.
  - `VPNPackageCardItem.jsx`: creado/normalizado para espejar a `ProxyPackageCardItem` (mismos radios, jerarquía visual y estados recommended/premium).
- Recomendación para futuros cambios:
  - Extraer constantes de UI (ej. `UI_RADII = { card: 30, pill: 30 }`) en un módulo compartido para evitar divergencias entre pantallas.
  - Mantener “recommended” y “premium” cambiando solo bordes/colores, no geometría (radio), para consistencia de marca.

---

## Resumen técnico – Ajuste fino de estilo Premium/Unlimited (borde izquierdo)
- Se refinó el estilo visual de los cards “ILIMITADO/PREMIUM” en `ProxyPackageCardItem` y `VPNPackageCardItem`:
  - Cambio: `unlimitedCard.borderLeftWidth` de **6** a **2**.
- Motivo: reducir “peso visual” del acento dorado para que el premium se perciba más elegante y consistente con el borde del estado “recommended”, manteniendo `borderWidth: 2` y `borderColor: #FFD700` como indicador principal.
- Recomendación: si en el futuro se necesita diferenciar más el premium, priorizar cambios de `elevation/shadow` o `badge` antes que aumentar grosores de bordes (evita look “pesado” en UI).
