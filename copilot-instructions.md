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

## Resumen técnico – Platform String con Versión de App (Main.js)
- **Contexto**: Sistema de registro de tokens push necesita identificar exactamente qué versión del cliente está usando cada usuario.

- **Problema Inicial**: Solo se enviaba el SDK de Android (`Platform.Version`), sin información de la versión de la app.

- **Solución Implementada**:
  - **Librería**: `react-native-device-info` para obtener versión y build number.
  - **Métodos usados**: 
    - `DeviceInfo.getVersion()`: Versión semántica (ej: "1.2.3").
    - `DeviceInfo.getBuildNumber()`: Build number incremental (ej: "42").
  - **Formato del platform string**: `{OS}_SDK{Version}_v{AppVersion}({BuildNumber})`

- **Ejemplos de Platform Strings**:
  ```javascript
  // Android
  "android_SDK34_v1.2.3(100)"
  
  // iOS
  "ios_17.2_v2.0.0(45)"
  ```

- **Ventajas Técnicas**:
  - **Debugging preciso**: Identificar versión exacta del cliente con problemas.
  - **Analytics**: Trackear adopción de nuevas versiones.
  - **Feature flags**: Activar/desactivar features por versión de app.
  - **Rollback selectivo**: Enviar notificaciones solo a versiones específicas.
  - **Soporte técnico**: Saber qué versión usa cada usuario sin preguntar.

- **Integración Backend**:
  - Parsear platform string con regex: `/^(android|ios)_(?:SDK)?(\d+(?:\.\d+)*)_v([\d.]+)\((\d+)\)$/`
  - Validar versión mínima soportada antes de procesar requests.
  - Almacenar en base de datos para auditoría.
  - Usar en analytics para reportes de adopción de versiones.

- **Consideraciones de Seguridad**:
  - **Version spoofing**: Backend debe validar que la versión reportada sea consistente con el comportamiento del cliente.
  - **Forced updates**: Detectar versiones obsoletas y forzar actualización.
  - **Feature detection**: No confiar ciegamente en la versión reportada, validar capabilities.

- **Lecciones Aprendidas**:
  - **DeviceInfo es estándar**: Librería mantenida activamente y compatible con ambas plataformas.
  - **Build number es crítico**: Permite diferenciar builds de prueba vs producción con misma versión.
  - **Formato consistente**: Tener un formato estándar facilita parsing en backend y logs.
  - **Logging de debugging**: Siempre loggear el platform string completo para troubleshooting.

- **Testing Recomendado**:
  - Verificar formato en logs tras registro de token.
  - Validar que backend parsee correctamente el string.
  - Probar con versiones de app antiguas (1.0.0) y nuevas (2.x.x).
  - Verificar que build number se incremente automáticamente en CI/CD.

- **Próximos Pasos**:
  - Implementar validación de versión mínima en backend.
  - Agregar UI para mostrar versión en pantalla de perfil/ajustes.
  - Crear dashboard de analytics con distribución de versiones.
  - Implementar sistema de forced updates para versiones críticas.

- **Archivos Modificados**:
  - Main.js: Agregado import de DeviceInfo y construcción profesional de platform string.
  - package.json: Dependencia react-native-device-info agregada.

---

## Resumen técnico – Sistema de Validación de Versión Mínima de App (Version Gating)

- **Contexto**: Sistema profesional para forzar actualizaciones de app cuando la versión instalada es menor a la requerida por el backend.

- **Migración de VersionsCollection a ConfigCollection**:
  - **Antes**: Colección dedicada `VersionsCollection` con método específico `getCompilationMin(platform)`.
  - **Ahora**: Uso de infraestructura existente `ConfigCollection` con método genérico `property.getValor(type, clave)`.
  - **Ventajas**: Reutilización de sistema de configuración, auditoría unificada, gestión desde PropertyTable UI.

- **Arquitectura de datos**:
  ```javascript
  // ConfigCollection documents
  {
    _id: ObjectId,
    type: "CONFIG",
    clave: "androidVersionMinCompilation" | "iosVersionMinCompilation",
    valor: "357", // String que se parsea a Number
    active: true,
    comentario: "Version minimo a usar",
    createdAt: Date,
    idAdminConfigurado: String // Auditoría de quién configuró
  }
  ```

- **Flujo de validación implementado**:
  1. **componentDidMount** de Main.js ejecuta `checkAppVersion()` ANTES de cualquier otra inicialización.
  2. Obtiene `currentBuildNumber` con `DeviceInfo.getBuildNumber()`.
  3. Consulta `property.getValor('CONFIG', '{platform}VersionMinCompilation')`.
  4. Si `currentBuildNumber < requiredBuildNumber` → setea `updateRequired: true`.
  5. Muestra pantalla `UpdateRequired.jsx` con botón de redirección a tienda.

- **Método backend usado**:
  ```javascript
  Meteor.call('property.getValor', 'CONFIG', 'androidVersionMinCompilation', (error, result) => {
    // result es String "357", se parsea a Number con parseInt()
  });
  ```

- **Validaciones defensivas implementadas**:
  - **Property no existe**: Retorna `null`, se interpreta como `0` (permitir acceso).
  - **Valor inválido**: `parseInt()` con fallback a `0`.
  - **Error en llamada**: Catch con `fail-open` (permitir acceso para evitar bloqueos masivos).
  - **Build number actual inválido**: `parseInt()` con validación `isNaN()`.

- **Componente UpdateRequired.jsx**:
  - **Fondo**: Mismo ImageBackground del Login para consistencia visual.
  - **Props**: `currentVersion` (número), `requiredVersion` (número).
  - **Iconografía**: Icon "update" de Material Design con color de alerta (#FF6B6B).
  - **Información visual**: Dos cards mostrando versión actual vs requerida con iconos semánticos.
  - **Botón CTA**: Redirige a Play Store (Android) o App Store (iOS) con `Linking.openURL()`.
  - **No dismissible**: Sin botón de cerrar ni navegación hacia atrás.

- **URLs de tiendas**:
  ```javascript
  const storeUrl = Platform.select({
    ios: 'https://apps.apple.com/app/idTU_APP_ID', // ✅ Reemplazar con App ID real
    android: 'https://play.google.com/store/apps/details?id=com.nauta.vidkar',
  });
  ```

- **Estados del componente Main.js**:
  ```javascript
  state = {
    checkingVersion: true,        // Loading inicial
    updateRequired: false,        // Flag para mostrar UpdateRequired
    currentBuildNumber: null,     // Build actual del dispositivo
    requiredBuildNumber: null,    // Build requerido desde backend
    // ...otros estados
  }
  ```

- **Orden de inicialización crítico**:
  ```javascript
  async componentDidMount() {
    // 1. PRIMERO: Validar versión
    await this.checkAppVersion();
    
    // 2. Si updateRequired, detener aquí
    if (this.state.updateRequired) return;
    
    // 3. Continuar con permisos y notificaciones
    await this.verifyPermissionsStatus();
    // ...
  }
  ```

- **Render condicional jerárquico**:
  ```javascript
  render() {
    // 1. Loading de versión (prioridad máxima)
    if (checkingVersion) return <LoadingScreen message="Verificando versión..." />;
    
    // 2. Actualización requerida (bloqueo total)
    if (updateRequired) return <UpdateRequired {...versionProps} />;
    
    // 3. Loading de permisos
    if (checkingPermissions) return <LoadingScreen message="Verificando permisos..." />;
    
    // 4. Pantalla de permisos
    if (showPermissionsScreen) return <PermissionsManager />;
    
    // 5. App normal
    return <NavigationContainer>...</NavigationContainer>;
  }
  ```

- **Gestión desde PropertyTable UI**:
  - Admins pueden modificar versión mínima sin deploy de código.
  - Campo `valor` acepta solo números como string.
  - Toggle `active` para deshabilitar validación temporalmente.
  - Auditoría automática con `idAdminConfigurado`.

- **Logging profesional implementado**:
  ```javascript
  console.log('[Main] 📱 Build actual:', currentBuildNumber);
  console.log('[Main] 🔑 Consultando property:', { type: 'CONFIG', clave: propertyKey });
  console.log('[Main] ✅ Valor obtenido:', requiredVersionString);
  console.warn('[Main] ⚠️ Actualización requerida:', { actual, requerido });
  ```

- **Casos edge manejados**:
  - **Property no configurada**: Permitir acceso (no bloquear por error de config).
  - **Backend caído**: Fail-open para evitar lock-out masivo.
  - **Valor 0 en property**: Interpretado como "sin restricción".
  - **Build number no numérico**: Parseo defensivo con fallback.
  - **Usuario presiona "Atrás"**: No hay navegación hacia atrás desde UpdateRequired.

- **Testing recomendado**:
  ```bash
  # 1. Versión válida (mayor a requerida)
  - currentBuild: 400, requiredBuild: 357 → permitir acceso
  
  # 2. Versión desactualizada (menor)
  - currentBuild: 300, requiredBuild: 357 → mostrar UpdateRequired
  
  # 3. Versión exacta (igual)
  - currentBuild: 357, requiredBuild: 357 → permitir acceso (>=)
  
  # 4. Property no existe
  - Retorna null → permitir acceso
  
  # 5. Property active=false
  - No se retorna → permitir acceso
  
  # 6. Backend caído durante check
  - Catch error → permitir acceso (fail-open)
  
  # 7. Usuario toca botón de actualización
  - Abre tienda correcta según plataforma
  ```

- **Consideraciones de seguridad**:
  - **Build number no es secret**: Cualquiera puede ver el valor con `DeviceInfo.getBuildNumber()`.
  - **Property valor público**: Accesible via `property.getValor` sin autenticación (por diseño).
  - **Fail-open policy**: Errores NO bloquean acceso para evitar lock-out masivo.
  - **Rate limiting**: Considerar agregar a `property.getValor` si se abusa del endpoint.

- **Mejoras futuras sugeridas**:
  1. **Mensajes personalizados**: Agregar campo `comentario` como texto del botón de actualización.
  2. **Actualización gradual**: Campo `porcentajeUsuarios` para rollout progresivo.
  3. **Actualización recomendada vs obligatoria**: Flag `updateMode: 'soft' | 'hard'` con opción de omitir.
  4. **Changelog en pantalla**: Mostrar novedades de la nueva versión.
  5. **Cache local**: Guardar último `requiredBuildNumber` en AsyncStorage para reducir llamadas.
  6. **Analytics**: Trackear cuántos usuarios están bloqueados por versión desactualizada.

- **Troubleshooting común**:
  - **Pantalla UpdateRequired no desaparece tras actualizar**: Limpiar data de app o incrementar build number.
  - **Loop infinito de UpdateRequired**: Verificar que el build number se incrementó correctamente.
  - **Usuario bloqueado en versión válida**: Verificar parseo de string a number (`parseInt()`).
  - **Property no se encuentra**: Confirmar `active: true` y `type: 'CONFIG'`.

- **Lecciones aprendidas**:
  - **Fail-open crítico**: En sistemas de gating, siempre permitir acceso si falla la validación (evitar lock-out).
  - **String vs Number**: ConfigCollection almacena valores como String, siempre parsear a Number.
  - **Orden de validaciones**: Version check ANTES de permisos y notificaciones.
  - **Reutilizar infraestructura**: property.getValor más flexible que método dedicado.
  - **UX clara**: Pantalla de actualización debe ser no-dismissible con CTA prominente.
  - **Logging verboso**: Emojis y mensajes claros facilitan debugging en producción.

- **Archivos modificados**:
  - **Main.js**: Método `checkAppVersion()` refactorizado para usar `property.getValor`.
  - **UpdateRequired.jsx**: Componente profesional con mismo fondo del Login.
  - **versions.js**: Marcado como deprecated, redirige a `property.getValor`.
  - **collections.js**: Ya tenía `VersionsCollection` y `ConfigCollection` exportados.

- **Próximos pasos**:
  - Agregar botón en PropertyTable para "Incrementar versión mínima" con confirmación.
  - Crear script de admin para actualizar versión mínima en batch (Android + iOS).
  - Implementar notificación push cuando se incremente la versión requerida.
  - Agregar analytics para trackear cuántos usuarios necesitan actualizar.
  - Tests e2e del flujo completo: versión desactualizada → UpdateRequired → abrir tienda.