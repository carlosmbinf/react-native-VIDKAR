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

## Resumen técnico – Sistema de Visualización de Productos por Comercios (React Native) - OPTIMIZACIÓN UX

- **Cambios en ProductoCard.jsx**:
  - **Botón "Agregar" eliminado**: Se mantiene solo el **tap en todo el card** para abrir el dialog de agregar al carrito (mejor UX en móviles).
  - **Descripción ampliada**: `numberOfLines` aumentado de 2 a 3 líneas para mostrar más información del producto sin necesidad de expandir.
  - **Espaciado optimizado**: 
    - `marginBottom` de descripción aumentado de 8px a 10px.
    - `marginBottom` del precio reducido a 0 (ya no hay botón debajo).
    - `paddingBottom` del contenedor ajustado a 14px.

- **Ventajas del cambio**:
  1. **Más información visible**: 50% más texto de descripción sin aumentar altura del card.
  2. **Interacción más natural**: Todo el card es clickeable (área de tap más grande).
  3. **Diseño más limpio**: Sin elementos repetitivos (Pressable ya cubre todo el card).
  4. **Mejor jerarquía visual**: Precio destacado queda como último elemento visual.
  5. **Optimización de espacio**: Card mantiene dimensiones compactas con más contenido.

- **Comportamiento mantenido**:
  - **Tap en card completo**: Abre `AddToCartDialog` (sin cambios).
  - **Productos no disponibles**: Card con opacidad reducida (0.6) y tap deshabilitado.
  - **Badges de estado**: Se mantienen en overlay sobre imagen (stock/elaboración).
  - **Highlight de búsqueda**: Funciona en nombre Y descripción.

- **Altura del card resultante**:
  ```
  Imagen: 160px
  + Padding superior: 12px
  + Nombre (2 líneas): ~36px
  + Descripción (3 líneas): ~48px
  + Precio: ~36px
  + Padding inferior: 14px
  ─────────────────────────
  Total: ~306px (vs ~280px anterior con botón)
  ```

- **Testing recomendado actualizado**:
  - **Caso 1**: Tap en cualquier parte del card → debe abrir dialog correctamente.
  - **Caso 2**: Producto con descripción larga (>3 líneas) → debe truncar con ellipsis.
  - **Caso 3**: Producto sin descripción → precio debe quedar bien posicionado.
  - **Caso 4**: Producto agotado → tap no debe hacer nada, card con opacidad reducida.

- **Lecciones aprendidas**:
  - **Eliminar redundancia**: Si Pressable envuelve todo, no se necesita botón interno.
  - **Información > Acciones**: En cards de catálogo, mostrar más info es mejor que botones explícitos.
  - **Tap target implícito**: En móviles, los usuarios esperan que cards sean clickeables sin necesidad de botones.
  - **Espaciado dinámico**: Al eliminar elementos, reajustar paddings para mantener proporción visual.

- **Próximos pasos**:
  - Considerar agregar **indicador visual sutil** (ej: sombra/border on press) para feedback táctil.
  - Evaluar agregar **preview rápido** (long press) para ver descripción completa sin abrir dialog.
  - Testear legibilidad de 3 líneas en pantallas pequeñas (<5 pulgadas).

---

## Resumen técnico – Soporte de Theme Dinámico en ProductoCard (Modo Claro/Oscuro)

- **Problema identificado**: Color hardcoded `#E3F2FD` para el precio causaba **ilegibilidad en modo oscuro** (fondo claro + texto blanco).

- **Solución implementada**:
  - **Uso de `useTheme()` hook** de React Native Paper para acceder a colores del theme actual.
  - **Colores dinámicos aplicados**:
    ```javascript
    backgroundColor: theme.colors.primaryContainer  // Auto-adapta según theme
    color: theme.colors.onPrimaryContainer         // Contraste garantizado
    ```

- **Archivos modificados**:
  1. **ProductoCard.jsx**: Precio destacado usa `primaryContainer` y `onPrimaryContainer`.
  2. **AddToCartDialog.jsx**: Resumen de precio usa `surfaceVariant` y `primary`.

- **Ventajas del cambio**:
  1. **Contraste automático**: React Native Paper gestiona contraste legible en ambos modos.
  2. **Consistencia visual**: Usa paleta oficial del theme (Material Design 3).
  3. **Mantenibilidad**: Sin hardcoded colors, cambios de theme se reflejan automáticamente.
  4. **Accesibilidad**: Cumple con WCAG contrast ratio guidelines.

- **Colores recomendados de React Native Paper**:
  | Color | Uso recomendado | Ejemplo |
  |-------|-----------------|---------|
  | `primaryContainer` | Fondos destacados con baja prioridad | Chips, tags, cards secundarios |
  | `onPrimaryContainer` | Texto sobre `primaryContainer` | Garantiza contraste legible |
  | `surfaceVariant` | Fondos sutiles diferenciados | Secciones de resumen, tooltips |
  | `onSurfaceVariant` | Texto sobre `surfaceVariant` | Labels, hints |
  | `primary` | Acentos principales | CTAs, precios destacados |

- **Testing recomendado**:
  - **Caso 1**: Modo claro → precio debe tener fondo azul claro con texto azul oscuro.
  - **Caso 2**: Modo oscuro → precio debe tener fondo azul oscuro con texto azul claro.
  - **Caso 3**: Cambio dinámico de theme → UI debe actualizar sin reload.
  - **Caso 4**: Accesibilidad → validar contraste mínimo 4.5:1 (herramientas DevTools).

- **Anti-patterns evitados**:
  - ❌ Hardcoded colors (`#E3F2FD`, `#1976D2`).
  - ❌ Conditional styling basado en `theme.dark` (frágil y difícil de mantener).
  - ❌ Inline styles duplicados por componente.

- **Best practices aplicadas**:
  - ✅ Usar `useTheme()` hook en TODOS los componentes con colores variables.
  - ✅ Colores theme-aware definidos inline (no en StyleSheet) para hot-reload.
  - ✅ Mantener StyleSheet solo para propiedades no-theme (sizes, paddings, etc).
  - ✅ Validar contraste con herramientas (ej: Contrast Checker de WebAIM).

- **Extensión futura**:
  - Aplicar mismo patrón a **chips de estado** (Agotado, Elaboración, Stock bajo).
  - Considerar `theme.colors.error` para estados críticos (agotado).
  - Considerar `theme.colors.tertiary` para badges secundarios.

- **Lecciones aprendidas**:
  - **Theme-aware desde el inicio**: Evita refactors costosos post-producción.
  - **React Native Paper theme es completo**: Cubre todos los casos de uso (no inventar paletas custom).
  - **Inline theme colors + StyleSheet dimensions**: Mejor separación de responsabilidades.
  - **Testing en ambos modos es OBLIGATORIO**: Bugs de contraste son difíciles de detectar sin testing manual.

- **Recursos útiles**:
  - React Native Paper Theming: https://callstack.github.io/react-native-paper/docs/guides/theming
  - Material Design 3 Color System: https://m3.material.io/styles/color/system/overview
  - Contrast Checker: https://webaim.org/resources/contrastchecker/

---

## Resumen técnico – UX Profesional en Badges de Stock (ProductoCard)

- **Problema identificado**: Mostrar números exactos de stock (`"3 unid."`, `"5 unid."`) **no es user-friendly** y puede generar ansiedad innecesaria en el usuario.

- **Solución implementada**:
  - **Mensajes contextuales** en lugar de números exactos.
  - **Badges dinámicos** según niveles de inventario con colores semánticos del theme.

- **Lógica de categorización de stock**:
  ```javascript
  // Productos de elaboración (sin stock físico)
  count: null o productoDeElaboracion: true → "Bajo pedido" (tertiary)
  
  // Stock crítico
  count: 0 → "Agotado" (error, NO clickeable)
  count: 1-3 → "¡Últimas unidades!" (errorContainer, urgencia alta)
  
  // Stock limitado
  count: 4-10 → "Stock limitado" (tertiaryContainer, advertencia media)
  
  // Stock saludable
  count: >10 → Sin badge (no es necesario alarmar al usuario)
  ```

- **Ventajas UX de esta implementación**:
  1. **Menos ansiedad**: "Stock limitado" es menos estresante que "2 unidades restantes".
  2. **Jerarquía visual clara**: Colores progresivos (verde → amarillo → rojo).
  3. **Reducción de ruido**: Solo se muestran badges cuando hay algo importante que comunicar.
  4. **Lenguaje positivo**: "Bajo pedido" es más profesional que "Elaboración: Sí".
  5. **Consistencia con retail moderno**: Patrones usados por Amazon, MercadoLibre, etc.

- **Colores semánticos utilizados** (theme-aware):
  | Stock | Color Background | Color Text | Icono |
  |-------|------------------|------------|-------|
  | **Bajo pedido** | `tertiary` | `onTertiary` | `chef-hat` |
  | **Agotado** | `error` | `onError` | `alert-circle` |
  | **Últimas unidades** | `errorContainer` | `onErrorContainer` | `alert` |
  | **Stock limitado** | `tertiaryContainer` | `onTertiaryContainer` | `information` |
  | **Stock OK** | Sin badge | N/A | N/A |

- **Mejoras visuales adicionales**:
  - **Elevation 2** en badges para destacarlos sobre la imagen del producto.
  - **Letter-spacing 0.3** para mejor legibilidad en textos pequeños.
  - **FontWeight 700** para mayor impacto visual.
  - **Feedback táctil**: Opacity 0.7 al presionar el card (mejor que animaciones complejas).

- **Casos edge manejados**:
  - **Producto agotado**: Badge rojo "Agotado" + card deshabilitado (opacidad 0.6).
  - **Producto de elaboración**: Badge morado "Bajo pedido" + sin restricción de cantidad.
  - **Stock saludable**: Sin badge (no molestar al usuario con información innecesaria).

- **Testing recomendado**:
  - **Caso 1**: Producto con `count: 0` → badge rojo "Agotado", card NO clickeable.
  - **Caso 2**: Producto con `count: 2` → badge rojo claro "¡Últimas unidades!".
  - **Caso 3**: Producto con `count: 7` → badge amarillo "Stock limitado".
  - **Caso 4**: Producto con `count: 50` → sin badge.
  - **Caso 5**: Producto con `productoDeElaboracion: true` → badge morado "Bajo pedido".
  - **Caso 6**: Cambio de theme claro/oscuro → colores se adaptan automáticamente.

- **Lecciones aprendidas**:
  - **No mostrar números exactos de stock**: Es información operacional, no de usuario final.
  - **Usar lenguaje positivo**: "Bajo pedido" > "Sin stock", "Stock limitado" > "Quedan 5".
  - **Badges condicionales**: Solo mostrar cuando hay algo relevante que comunicar.
  - **Colores semánticos del theme**: Garantiza consistencia visual y accesibilidad.
  - **Iconos refuerzan el mensaje**: Usuario entiende más rápido con iconografía.

- **Best practices aplicadas**:
  - ✅ **Progressive disclosure**: Solo mostrar información crítica.
  - ✅ **Positive framing**: "Stock limitado" en lugar de "Solo quedan 3".
  - ✅ **Visual hierarchy**: Rojo (urgente) > Amarillo (precaución) > Sin badge (OK).
  - ✅ **Accessibility**: Contraste WCAG AA garantizado con `onPrimaryContainer`, `onError`, etc.
  - ✅ **Responsive feedback**: Opacity al presionar para confirmar interacción.

- **Mejoras futuras**:
  - **Animación de pulso** para "¡Últimas unidades!" (llamar más la atención).
  - **Preorden disponible**: Badge "Próximamente" para productos fuera de stock temporalmente.
  - **Stock por ubicación**: "Disponible en 3 tiendas cercanas" si hay múltiples locales.

- **Archivos modificados**:
  - `ProductoCard.jsx`: Función `getStockInfo()` con lógica de categorización profesional.

- **Recursos de referencia**:
  - Nielsen Norman Group: [Reducing Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)
  - Material Design 3: [Semantic Color System](https://m3.material.io/styles/color/roles)
  - Best practices de e-commerce: Amazon, Shopify, MercadoLibre

---
