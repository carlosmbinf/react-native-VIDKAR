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

## Resumen técnico – Sistema de Edición de Productos (Backend + Frontend)

- **Contexto**: Implementación completa del flujo de edición de productos en comercios, con validaciones robustas, manejo de imágenes y auditoría.

- **Método Backend Implementado**: `comercio.editProducto`
  ```javascript
  Meteor.call('comercio.editProducto', productoId, productoData, (error, result) => {
    // result = { success: true, productoId: String, message: String }
  });
  
  // Estructura de productoData:
  {
    name: String,                    // 3-50 caracteres
    descripcion: String,             // 10-200 caracteres
    precio: Number,                  // > 0, <= 999999
    monedaPrecio: String,            // 'USD' | 'CUP' | 'UYU'
    count: Number,                   // >= 0 (0 si productoDeElaboracion)
    productoDeElaboracion: Boolean,
    comentario: String,              // Opcional, max 500 caracteres
  }
  ```

- **Flujo de Edición Completo**:
  1. **Usuario** toca menú (3 puntos) en ProductoCard → "Editar".
  2. **TiendaDetailScreen** llama `onNavigateToProductoForm(producto, tienda._id)`.
  3. **ProductoFormScreen** detecta modo edición (`isEditing = !!producto?._id`).
  4. **useEffect** pre-llena formulario con datos del producto + carga imagen existente.
  5. **Usuario** modifica campos + opcionalmente cambia imagen.
  6. **handleSubmit** invoca `comercio.editProducto` con datos actualizados.
  7. **Si hay nueva imagen** → `uploadImage()` (que automáticamente elimina la anterior).
  8. **Alert de éxito** → navegación de vuelta con `onBack()`.

- **Validaciones Implementadas en Backend**:
  | Campo | Validación | Error si falla |
  |-------|-----------|----------------|
  | **Autenticación** | `this.userId` existe | `unauthorized` |
  | **Producto existe** | `ProductosComercioCollection.findOne()` | `producto-not-found` |
  | **Tienda existe** | `TiendasComercioCollection.findOne()` | `tienda-not-found` |
  | **Permisos** | Dueño de tienda OR admin | `forbidden` |
  | **Nombre** | 3-50 caracteres | `validation-error` |
  | **Descripción** | 10-200 caracteres | `validation-error` |
  | **Precio** | >0 y <=999999 | `validation-error` |
  | **Moneda** | USD/CUP/UYU | `validation-error` |
  | **Stock** | >=0 si !porElaborar | `validation-error` |
  | **Comentario** | <=500 caracteres | `validation-error` |

- **Campos Actualizados en BD**:
  ```javascript
  {
    name: String,
    descripcion: String,
    precio: Number,
    monedaPrecio: String,
    count: Number,                 // 0 si productoDeElaboracion
    productoDeElaboracion: Boolean,
    comentario: String,
    updatedAt: Date,               // ✅ Timestamp de última edición
    updatedBy: String,             // ✅ ID del usuario que editó
  }
  ```

- **Auditoría y Logging**:
  - **LogsCollection**: Registro con `type: 'PRODUCTO_EDITADO'` que incluye:
    - Nombre del producto y tienda.
    - Precio y moneda actualizados.
    - Stock actualizado.
    - Metadata con cambios antes/después (diff).
  - **Console logs**: `✅ [comercio.editProducto] Producto editado exitosamente: {id}`.

- **Manejo de Imágenes en Edición**:
  - **Carga de imagen existente**: `loadExistingImage(productoId)` en `useEffect` al montar.
  - **Detección de cambio**: `imagen && imagen.uri !== imagenPreview` indica nueva imagen.
  - **Upload condicional**: Solo sube si hay imagen nueva (evita re-subir la misma).
  - **Reemplazo automático**: `comercio.uploadProductImage` elimina imagen anterior antes de subir nueva.

- **Estados del Formulario en Modo Edición**:
  - **formData**: Pre-llenado con valores del producto.
  - **imagen**: Vacío hasta que usuario selecciona nueva.
  - **imagenPreview**: URL de imagen existente cargada desde servidor.
  - **loadingImage**: `true` mientras carga imagen existente del servidor.

- **UX Mejorado en Modo Edición**:
  - **Título dinámico**: "✏️ Editar Producto" vs "➕ Nuevo Producto".
  - **Botón submit**: "Guardar Cambios" vs "Crear Producto".
  - **Pre-visualización de imagen**: Muestra imagen actual con opciones de cambiar/eliminar.
  - **Indicadores de cambios**: (Futuro) Highlight de campos modificados.

- **Performance Optimizations**:
  - **Upload condicional**: Solo sube imagen si cambió (compara URIs).
  - **Validación early-return**: Valida formulario antes de llamadas a servidor.
  - **Loading states**: Deshabilita UI durante operaciones async.
  - **Error handling defensivo**: Try-catch en cliente y servidor.

- **Diferencias Creación vs Edición**:
  | Aspecto | Creación | Edición |
  |---------|----------|---------|
  | **Método backend** | `addProducto` | `comercio.editProducto` |
  | **Requiere tienda** | Sí (param) | No (ya asociado) |
  | **Parámetro ID** | No | Sí (`productoId`) |
  | **Imagen obligatoria** | No | No (mantiene existente) |
  | **Pre-llena formulario** | No | Sí (`useEffect`) |
  | **Campos audit** | `createdAt`, `createdBy` | `updatedAt`, `updatedBy` |

- **Testing Recomendado**:
  - **Caso 1**: Editar solo nombre → debe actualizar sin tocar otros campos.
  - **Caso 2**: Cambiar de stock fijo a elaboración → debe setear `count=0`.
  - **Caso 3**: Subir nueva imagen → debe eliminar anterior y mostrar nueva.
  - **Caso 4**: Editar sin cambiar imagen → no debe re-subir imagen.
  - **Caso 5**: Usuario sin permisos intenta editar → debe lanzar `forbidden`.
  - **Caso 6**: Editar producto inexistente → debe lanzar `producto-not-found`.
  - **Caso 7**: Precio negativo → debe lanzar `validation-error`.
  - **Caso 8**: Nombre con <3 caracteres → debe bloquear en frontend.

- **Seguridad Implementada**:
  - **Validación de ownership**: Solo dueño de tienda o admin puede editar.
  - **No se puede cambiar tienda**: `idTienda` no es editable (previene ataques).
  - **Validación de tipos**: `check()` de Meteor valida tipos de datos.
  - **Sanitización**: `.trim()` en strings para prevenir espacios maliciosos.
  - **Logs de auditoría**: Registra quién, qué y cuándo se editó.

- **Mejoras Futuras**:
  - **Historial de cambios**: Tabla de versiones con diff de cada edición.
  - **Deshacer cambios**: Botón para revertir última edición.
  - **Edición en masa**: Seleccionar múltiples productos y editar precio/stock.
  - **Validación de unicidad**: Prevenir productos con nombre duplicado en misma tienda.
  - **Optimistic UI**: Actualizar UI antes de respuesta del servidor (rollback si falla).
  - **Diff visual**: Highlight de campos que cambiaron antes de guardar.
  - **Confirmación en cambios críticos**: Alert si se cambia precio >50% o stock a 0.

- **Casos Edge Manejados**:
  - **Producto eliminado durante edición**: Backend valida existencia antes de actualizar.
  - **Tienda eliminada**: Backend valida existencia de tienda asociada.
  - **Permisos revocados**: Backend re-valida permisos en cada operación.
  - **Imagen corrupta**: Try-catch en upload con fallback a mantener anterior.
  - **Concurrent edits**: Último write gana (sin lock optimista por ahora).

- **Lecciones Aprendidas**:
  - **Pre-llenar formulario en useEffect**: Usar `isEditing && producto` como deps evita loops.
  - **Comparar URIs para detectar cambio de imagen**: `imagen.uri !== imagenPreview` es más confiable que flag booleano.
  - **Validaciones duplicadas client/server**: Frontend para UX, backend para seguridad.
  - **updatedAt/updatedBy son críticos**: Facilitan auditoría y debugging.
  - **Log con diff antes/después**: Invaluable para investigar problemas reportados por usuarios.
  - **Trim en backend también**: Nunca confiar solo en validaciones de cliente.
  - **Return early en validaciones**: Mejora legibilidad vs if-else anidados.

- **Archivos Modificados**:
  - `server/metodos/metodosComercios.js`: Agregado método `comercio.editProducto` con validaciones completas.
  - `components/empresa/screens/ProductoFormScreen.jsx`: Actualizado `handleSubmit` con lógica de edición + upload condicional de imagen.

- **Próximos Pasos**:
  1. Implementar tests unitarios para `comercio.editProducto`.
  2. Agregar indicador visual de campos modificados en formulario.
  3. Implementar historial de cambios en modal dedicado.
  4. Tests e2e del flujo: card → editar → modificar → guardar → verificar.
  5. Documentar contrato de método en README.md.
  6. Configurar alertas de Sentry para errores en edición.

- **Recursos Útiles**:
  - Meteor Methods Best Practices: https://guide.meteor.com/methods.html
  - Audit Logging Patterns: https://martinfowler.com/articles/patterns-of-distributed-systems/audit-log.html

---

## Resumen técnico – Upload Profesional de Imágenes de Productos (FilesCollection)

- **Contexto**: Sistema de subida/eliminación de imágenes para productos del comercio usando Meteor FilesCollection con validaciones robustas y manejo de errores defensivo.

- **Método Backend Implementado**: `comercio.uploadProductImage`
  ```javascript
  Meteor.call('comercio.uploadProductImage', productoId, fileData, (error, result) => {
    // result = { success: true, fileId: String, url: String, fileName: String }
  });
  
  // Estructura de fileData requerida:
  {
    name: 'producto.jpg',          // Nombre original del archivo
    type: 'image/jpeg',            // MIME type
    size: 2048576,                 // Tamaño en bytes
    base64: 'data:image/jpeg;base64,...' // Imagen en base64
  }
  ```

- **Validaciones Implementadas**:
  1. **Autenticación**: Solo usuarios autenticados pueden subir imágenes.
  2. **Autorización**: Solo dueño de la tienda o admins pueden subir imágenes de sus productos.
  3. **Tipo de archivo**: Solo `image/jpeg`, `image/jpg`, `image/png` (case-insensitive).
  4. **Tamaño máximo**: 10MB (alineado con configuración de FilesCollection).
  5. **Producto existente**: Validar que el `productoId` exista en `ProductosComercioCollection`.

- **Funcionalidades Profesionales**:
  - **Reemplazo automático**: Si el producto ya tiene imagen, se elimina la anterior antes de subir la nueva (evita acumulación de archivos huérfanos).
  - **Nombre único**: Genera nombres de archivo únicos con formato `producto_{productoId}_{timestamp}.{ext}`.
  - **Metadata enriquecida**: Cada archivo almacena:
    ```javascript
    meta: {
      userId: String,           // Quién subió la imagen
      idProducto: String,       // Producto asociado
      idTienda: String,         // Tienda del producto (para queries)
      uploadedAt: Date,         // Timestamp de subida
      originalName: String      // Nombre original del archivo
    }
    ```
  - **URL pública normalizada**: Usa helper `replaceUrl()` para generar URL accesible desde `ROOT_URL`.

- **Flujo de Subida**:
  1. **Cliente** selecciona imagen → convierte a base64 → llama método con `{name, type, size, base64}`.
  2. **Backend** valida permisos → verifica tipo/tamaño → elimina imagen anterior (si existe).
  3. **FilesCollection** escribe archivo en `/public/imgenes/` con metadata.
  4. **Método** retorna `{success, fileId, url, fileName}` para actualizar UI.

- **Método Complementario**: `comercio.deleteProductImage`
  - Elimina imagen asociada a un producto específico.
  - Mismas validaciones de permisos que upload.
  - Retorna `{success: Boolean, deletedCount: Number}`.

- **Integración con Frontend**:
  ```javascript
  // Ejemplo de uso en React Native
  const uploadImage = async (productoId, imageUri) => {
    // 1. Convertir URI a base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // 2. Obtener info del archivo
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const fileName = imageUri.split('/').pop();
    const fileType = `image/${fileName.split('.').pop().toLowerCase()}`;
    
    // 3. Llamar método backend
    Meteor.call('comercio.uploadProductImage', productoId, {
      name: fileName,
      type: fileType,
      size: fileInfo.size,
      base64: `data:${fileType};base64,${base64}`
    }, (error, result) => {
      if (error) {
        Alert.alert('Error', error.reason);
      } else {
        console.log('Imagen subida:', result.url);
      }
    });
  };
  ```

- **Seguridad y Performance**:
  - **Validación de propiedad**: Se verifica que el usuario sea dueño de la tienda o admin antes de permitir operaciones.
  - **Cleanup automático**: Eliminar imagen anterior previene acumulación de archivos sin usar.
  - **Conversión defensiva**: Strip de prefijo `data:image/...;base64,` antes de convertir a Buffer.
  - **Nombres únicos**: Previene colisiones de archivos usando timestamp.
  - **Logs estructurados**: Registros con contexto completo para debugging y auditoría.

- **Manejo de Errores**:
  - **Códigos específicos**: `unauthorized`, `forbidden`, `producto-not-found`, `invalid-file-type`, `file-too-large`, `upload-failed`.
  - **Error wrapping**: Errores genéricos se envuelven en `Meteor.Error` con contexto.
  - **Logging exhaustivo**: Console.error con stack trace completo + envío a Sentry.
  - **Respuestas consistentes**: Siempre retornar `{success: Boolean, ...}` para facilitar manejo en cliente.

- **Consideraciones de FilesCollection**:
  - **storagePath**: `/public/imgenes` (typo intencional en colección legacy, mantener consistencia).
  - **allowClientCode: false**: Upload SOLO por Meteor.methods (más seguro).
  - **onBeforeUpload**: Validación adicional del lado de FilesCollection (max 10MB, tipos permitidos).
  - **write() con Buffer**: Usar Buffer en lugar de Stream para imágenes base64.

- **Testing Recomendado**:
  - **Caso 1**: Usuario sin autenticar → debe lanzar error `unauthorized`.
  - **Caso 2**: Usuario intentando subir imagen a producto de otra tienda → error `forbidden`.
  - **Caso 3**: Archivo >10MB → error `file-too-large`.
  - **Caso 4**: Archivo PDF/TXT → error `invalid-file-type`.
  - **Caso 5**: Producto con imagen existente → debe reemplazar (eliminar anterior).
  - **Caso 6**: Upload exitoso → debe retornar URL pública válida.
  - **Caso 7**: Eliminar imagen inexistente → debe retornar `{success: true, deletedCount: 0}`.

- **Mejoras Futuras**:
  - **Compresión automática**: Usar `sharp` en servidor para redimensionar/comprimir antes de guardar.
  - **Múltiples imágenes**: Permitir galería de imágenes por producto (array de fileIds en producto).
  - **CDN integration**: Subir a Cloudinary/S3 en lugar de disco local para escalabilidad.
  - **Thumbnails**: Generar versiones optimizadas (thumbnail, medium, full) automáticamente.
  - **Validación de contenido**: Verificar que el base64 sea realmente una imagen válida (magic bytes).
  - **Progreso de upload**: Implementar stream con eventos de progreso para archivos grandes.

- **Lecciones Aprendidas**:
  - **FilesCollection.write() es asíncrono**: Requiere wrapping con Promise para usar await.
  - **Buffer.from() requiere cleanup de prefijo**: Eliminar `data:image/...;base64,` antes de conversión.
  - **Metadata es clave**: Facilita queries posteriores (ej: todas las imágenes de una tienda).
  - **Eliminar anterior antes de subir nueva**: Previene acumulación de archivos huérfanos.
  - **URL normalización es crítica**: `replaceUrl()` garantiza que URLs sean accesibles desde ROOT_URL correcto.
  - **Validación de permisos multi-nivel**: Usuario → Tienda → Producto asegura ownership correcto.

- **Archivos Modificados**:
  - `server/metodos/metodosComercios.js`: Agregados métodos `comercio.uploadProductImage` y `comercio.deleteProductImage`.

- **Próximos Pasos**:
  - Implementar UI de upload en `CreateProductos.js` usando el método.
  - Agregar preview de imagen antes de upload en dialog de creación/edición.
  - Crear helper frontend `uploadProductImage(productoId, imageUri)` para encapsular lógica.
  - Tests e2e del flujo completo: seleccionar imagen → upload → preview → eliminar.
  - Documentar en README.md el contrato de `comercio.uploadProductImage`.

- **Recursos Útiles**:
  - FilesCollection Docs: https://github.com/VeliovGroup/Meteor-Files
  - Sharp (image processing): https://sharp.pixelplumbing.com/
  - React Native FileSystem: https://docs.expo.dev/versions/latest/sdk/filesystem/

---

## Resumen técnico – UX Premium en Overlays de Cards (MisTiendasScreen – Refinamiento)
- Se refinó el overlay sobre MapView para lograr máxima profesionalidad sin cambiar dimensiones del card:
  - **Título/subtítulo en Surface compacta**: Se reemplazó el layout directo por un chip/surface con `elevation={2}` para dar sensación de profundidad.
    - Fondo blanco semitransparente (`rgba(255,255,255,0.95)`) para máxima legibilidad.
    - Padding compacto (`paddingVertical: 8, paddingHorizontal: 12`) para aspecto "pill".
    - Tipografía jerárquica: título en `fontWeight: '700'` + subtítulo en gris (`#616161`) con `fontSize: 11`.
  - **Botón editar destacado**: Fondo púrpura semitransparente (`rgba(103,58,183,0.90)`) con borde blanco sutil para consistencia con el branding.
  - **Chips de metadata uniformes**: Alturas fijas (`height: 28`), fondos diferenciados (primario 92% opacidad, secundario 82%) para jerarquía visual.
  - **Spacing consistente**: Gap de 10px entre chip de info y botón editar, 6px entre chips inferiores.

- **Ventajas UX del refinamiento**:
  1. **Profundidad visual**: Surface con elevation crea sensación de "flotación" sobre el mapa.
  2. **Legibilidad garantizada**: Fondo blanco opaco (95%) asegura contraste AAA en cualquier mapa.
  3. **Jerarquía clara**: Título → subtítulo → metadata, con tamaños/pesos progresivos.
  4. **Consistencia temática**: Botón editar usa color primario de la app (#673AB7).
  5. **Compacto sin sacrificar info**: Todo cabe en CARD_HEIGHT sin overflow gracias a `numberOfLines={1}`.

- **Patrones aplicados**:
  - **Surface como micro-container**: Ideal para agrupar info relacionada con elevación/sombra.
  - **Transparency gradual**: 95% para contenido crítico, 92%/82% para metadata secundaria.
  - **Typography scale**: titleSmall (título) → bodySmall (subtítulo) → fontSize:11 (chips).
  - **Color semántico**: #1F1F1F (texto oscuro) → #616161 (texto secundario) → #424242 (metadata).

- **Testing recomendado**:
  - Validar legibilidad en mapas claros (zonas urbanas) y oscuros (parques/agua).
  - Probar con títulos largos (truncar correctamente con ellipsis).
  - Verificar elevation en Android (puede requerir ajustes de `shadowColor`/`shadowOpacity`).
  - Validar contraste en modo oscuro del sistema (si el theme cambia).

- **Mejoras futuras**:
  - Animar el chip de info (fade-in) cuando el card aparece en viewport.
  - Considerar IconButton con ícono de "store" en el chip de info.
  - Agregar indicador de "nuevos productos" si `productosCount` aumentó recientemente.

- **Lecciones aprendidas**:
  - **Surface > View para overlays**: La elevación nativa mejora percepción de calidad.
  - **95% opacity es el sweet spot**: Balance entre legibilidad y "ver el mapa debajo".
  - **Jerarquía por peso+tamaño**: No depender solo de color para diferenciar info.
  - **Spacing consistente con gap**: Evita margin/padding manuales (más mantenible).
  - **Pill-shaped containers**: borderRadius alto (12+) + padding horizontal compacto = look premium.

---

## Resumen técnico – UX Premium en Cards de Productos (TiendaDetailScreen)

- **Contexto**: Refactorización de `renderProductoCard` en TiendaDetailScreen para mostrar imágenes de productos con estados de carga profesionales y layout horizontal optimizado.

- **Componente ProductoImage Implementado**:
  ```javascript
  const ProductoImage = ({ productoId, style }) => {
    // Estados: loading, success (imageUrl), error
    // Llamada async a Meteor.call('findImgbyProduct')
    // Render condicional: Skeleton → Placeholder → Imagen
  }
  ```

- **Estados Visuales Manejados**:
  1. **Loading**: ActivityIndicator en Surface con fondo neutral (#FAFAFA).
  2. **Error/Sin imagen**: IconButton "image-off" en gris (#BDBDBD).
  3. **Success**: Image con `resizeMode="cover"` y border radius 8px.

- **Layout Horizontal Optimizado**:
  - **Imagen**: 100x100px a la izquierda, border radius 8px.
  - **Contenido**: flex:1 a la derecha con título, descripción y chips.
  - **Menu**: IconButton en esquina superior derecha con dots-vertical.
  - **Spacing**: 12px entre imagen y contenido, 8px entre título y chips.

- **Mejoras UX Implementadas**:
  - **Lazy loading**: Imagen se carga solo cuando el card está visible (efecto del FlatList).
  - **Estados progresivos**: Loading → Error/Success sin layout shifts.
  - **Typography jerárquica**: titleMedium (nombre) → bodySmall (descripción) → chips (metadata).
  - **Truncado inteligente**: Título 2 líneas, descripción 2 líneas con ellipsis.

- **Chips de Metadata Mejorados**:
  | Chip | Condición | Color | Icono |
  |------|-----------|-------|-------|
  | **Precio** | Siempre | Verde (#2E7D32) | currency-usd |
  | **Stock** | !productoDeElaboracion && count > 0 | Tema | package-variant |
  | **Agotado** | !productoDeElaboracion && count === 0 | Tema | package-variant |
  | **Elaboración** | productoDeElaboracion | Tema | chef-hat |

- **Performance Optimizations**:
  - **useEffect con deps**: Solo re-llamar `findImgbyProduct` si `productoId` cambia.
  - **Image caching**: React Native cachea automáticamente imágenes por URI.
  - **Skeleton loader**: Evita layout shifts durante carga inicial.
  - **Memo del componente**: Considerar React.memo si lista es muy grande (>50 items).

- **Card Dimensions**:
  - **Height**: Auto (min 100px por imagen, crece con contenido).
  - **Padding**: 12px uniform en card content.
  - **Margin bottom**: 12px entre cards.
  - **Border radius**: 12px en card, 8px en imagen.

- **Accesibilidad**:
  - **accessibilityLabel**: "Editar tienda" en IconButton del menú.
  - **Image alt**: Considerar agregar `accessible={true}` y `accessibilityLabel` con nombre del producto.
  - **Menu items**: Texto claro "Editar" / "Eliminar" sin iconografía exclusiva.

- **Testing Recomendado**:
  - **Caso 1**: Producto con imagen → debe cargar y mostrar correctamente.
  - **Caso 2**: Producto sin imagen → debe mostrar placeholder con icono.
  - **Caso 3**: Imagen tarda en cargar → debe mostrar skeleton sin layout shift.
  - **Caso 4**: Error en carga de imagen → debe mostrar placeholder.
  - **Caso 5**: Scroll rápido → imágenes deben cargar sin lag (lazy loading).
  - **Caso 6**: Lista larga (>20 productos) → FlatList debe mantener 60fps.

- **Mejoras Futuras**:
  - **Progressive loading**: Mostrar blur placeholder → imagen completa (react-native-fast-image).
  - **Image optimization**: Comprimir imágenes en servidor con sharp antes de servir.
  - **Cache policy**: Configurar TTL para imágenes (react-native-fast-image con cache control).
  - **Zoom on tap**: Abrir lightbox al tap prolongado en la imagen.
  - **Swipeable cards**: Arrastrar card para revelar acciones rápidas (editar/eliminar).
  - **Badge de "nuevo"**: Mostrar chip "Nuevo" si producto fue creado hace <7 días.

- **Lecciones Aprendidas**:
  - **Componente dedicado para imagen**: Encapsular lógica de carga en componente separado facilita testing y reutilización.
  - **Estados progresivos**: Loading → Error/Success sin condicionales complejos en render.
  - **Layout horizontal**: Mejor aprovechamiento del espacio en pantallas móviles que layout vertical.
  - **Image dimensions fijas**: Previene layout shifts y mejora perceived performance.
  - **Skeleton loader en mismo tamaño**: ActivityIndicator debe ocupar exactamente el mismo espacio que la imagen final.
  - **Error state con icono**: Placeholder con icono es más user-friendly que un rectángulo vacío.

- **Archivos Modificados**:
  - `components/empresa/screens/TiendaDetailScreen.jsx`: Agregado componente ProductoImage y refactorización completa de renderProductoCard con layout horizontal.

- **Próximos Pasos**:
  1. Implementar react-native-fast-image para progressive loading y mejor cache.
  2. Agregar animación fade-in al cargar imagen (Animated API).
  3. Crear variante de card para modo grid (2 columnas).
  4. Implementar pull-to-refresh específico para imágenes (re-fetch).
  5. Tests e2e del flujo: ver productos → cargar imágenes → editar/eliminar.
  6. Monitoreo de performance: tiempo promedio de carga de imágenes.

---
