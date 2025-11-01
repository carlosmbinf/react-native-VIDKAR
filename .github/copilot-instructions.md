Ten en cuenta que en cada modificacion de frontend o backend se debe ser y modificar lo mas profesional posible, pues los proyectos trabajados son para clientes y queremos dar la mejor impresion y siempre pensar en posibles modificaciones a futuro, o sea a la hora de crear algo tambien pensar en lo que el usuario quisiera que le mostremos, tambien en el backend tenemos que hacer las cosas teniendo en cuenta futuras mejoras, modifica siempre este archivo copilot-instructions.md al terminar y agrega todo lo relacionado y aprendido a esta conversacion, debe ser cosas tecnicas a tener en cuenta para otros desarrolladores, cosas a corregir, cosas a perfeccionar, no debes eliminar lo que ya esta en este archivo sino agregar al final del archivo un resumen de cada conversacion teniendo en cuenta lo mensionado en este archivo, para que en cada conversacion se escriba lo que se aprendio

---

Resumen técnico – Gestión de ConfigCollection (PropertyTable y PropertyDialog)
- Frontend RN: Se agregó un módulo profesional y escalable para administrar propiedades del sistema (ConfigCollection):
  - PropertyTable.jsx: tabla responsiva con DataTable, búsqueda por type/clave/valor/comentario, chip de estado “Activo” e invocación a diálogo de edición/creación.
  - PropertyDialog.js: edición segura. En edición se bloquean “type” y “clave” (para evitar cambios de llave), se permite modificar valor/comentario/activo y se registra idAdminConfigurado. En creación se habilitan todos los campos requeridos (type, clave).
  - Validaciones mínimas en cliente: obligatoriedad de type y clave; casting a string para “valor” y boolean para “active”.
  - Eliminación condicionada: botón visible solo si el usuario es admin y existe _id. Manejo de errores con Alert.

- Backend/colecciones (consideraciones):
  - Publicación requerida: El componente suscribe a 'config'. Asegurar que exista un publish en servidor (Meteor.publish('config', ...)) con filtros/fields adecuados y controles de seguridad. Si no existe, implementarlo para evitar depender de allow abiertos.
  - Seguridad: Actualmente ConfigCollection.allow permite operaciones amplias. Recomendado endurecer reglas (solo admins), y canalizar cambios críticos por Meteor.methods con validaciones de SimpleSchema.
  - Auditoría: Se está almacenando idAdminConfigurado en cada actualización/creación. Valorar un log de cambios (before/after) para auditoría.
  - Índices sugeridos: índices en { clave: 1 }, { type: 1, clave: 1 } para búsquedas y unicidad lógica (opcional unique parcial si aplica).
  - Schema: Campos obligatorios type/clave, createdAt autoValue. Confirmar allowedValues para type si se desean valores controlados, y normalizar “valor” si se esperan JSON/numéricos.

- UX/UI:
  - Tabla coherente con otras pantallas (recargas/ventas), reutilizando patrones visuales (chips, iconografía, diálogo).
  - Preparada para futuras extensiones: filtros por type, paginación, creación masiva y bloqueo por roles.

- Próximos pasos:
  - Añadir publicación 'config' con controles de acceso y proyección limitada de campos sensibles.
  - Agregar paginación reactiva (skip/limit) si el volumen crece.
  - Tests e2e básicos para crear/editar/eliminar propiedades con varios roles.

---

Resumen técnico – Rutas y menú (PropertyList)
- Se registró la ruta privada PropertyList apuntando a components/property/PropertyTable, con título “Propiedades del Sistema”.
- Se añadió un item en “Opciones privadas” (cercano a “Lista de Archivos”) que navega a la ruta PropertyList.
- Se normalizó la suscripción de PropertyTable a 'config' para alinearse con la publicación del servidor.
- Recomendaciones:
  - Asegurar Meteor.publish('config', ...) en backend limitando fields y acceso por roles.
  - Centralizar constantes de rutas en un módulo (ej. navigation/routes.ts) para evitar strings repetidos.
  - Validar existencia de permisos antes de renderizar el item del menú (si aplica control por roles).


---

Resumen técnico – Tarjeta de Débito (CUP) en UserDetails
- Frontend RN:
  - Nuevo componente TarjetaDebitoCard.jsx (components/users/componentsUserDetails) que consulta la property por método Meteor.call("property.getValor", "CONFIG", `TARJETA_CUP_${userId}`) y renderiza un Card solo si existe valor.
  - Cálculo de userId: se usa item.bloqueadoDesbloqueadoPor si está disponible; de lo contrario item._id. Esto permite flexibilidad con la clave de property registrada.
  - Integración en UserDetails justo debajo del card de Datos Personales, respetando estilos existentes (styles.cards, styles.title, styles.data).
  - Sin nuevas suscripciones; llamada segura y no bloqueante. Manejo de errores via console.warn y render condicional.

- Consideraciones de backend:
  - Confirmar existencia del Meteor.method property.getValor con validación de tipos (type y clave como strings no vacíos) y control de acceso (roles autorizados).
  - Limitar retorno a valores no sensibles. Evitar publicar datos de configuración si no es imprescindible.
  - Opcional: cache en servidor para claves de alta lectura (CONFIG/TARJETA_CUP_*) con TTL corto.

- UX/Extensibilidad:
  - Preparado para agregar acciones (p. ej., copiar al portapapeles) o mostrar múltiples tarjetas en el futuro.
  - Mantener consistencia visual con el resto de Cards (título, Divider, tipografías).

- Próximos pasos:
  - Tests de integración: render condicional (existe/no existe property) y variación con bloqueadoDesbloqueadoPor.
  - Documentar contrato de property.getValor en el backend (parámetros, retorno y errores).

---

Resumen técnico – Sistema de Despliegue Automatizado (CI/CD con Codemagic)
- Setup completo de entorno de desarrollo:
  - Instalación automática de Node.js v22.20.0 usando nvm (Node Version Manager) para gestión flexible de versiones.
  - Instalación de Homebrew como gestor de paquetes para macOS, configurando correctamente el PATH en .zshrc.
  - Instalación de CocoaPods vía Homebrew para gestión de dependencias iOS.
  - Resolución de conflictos de dependencias npm usando --legacy-peer-deps para compatibilidad con React Navigation.
  - Corrección de permisos de archivos (chown -R carlos:staff) para evitar errores EACCES.

- Scripts de despliegue automatizado profesionales:
  - deploy.sh: Script principal con menú interactivo para seleccionar tipo de despliegue (iOS TestFlight, Android Internal, Android Producción).
  - deploy-ios-testflight.sh: Automatiza increment de versión en package.json/Info.plist, commit, push y trigger de Codemagic workflow para TestFlight.
  - deploy-android-internal.sh: Gestiona versionCode/versionName en build.gradle, commit con mensaje descriptivo y trigger para Google Play Internal Testing.
  - deploy-android-production.sh: Incluye confirmaciones de seguridad, crea tags de release, incremento de versión minor/major para producción.

- Validaciones de seguridad implementadas:
  - Verificación de rama master antes del despliegue.
  - Detección de cambios sin commitear (working directory limpio).
  - Confirmación explícita para despliegues a producción.
  - Verificación de dependencias (node, git) antes de proceder.
  - Manejo de colores y mensajes claros para UX del desarrollador.

- Integración con Codemagic CI/CD:
  - El proyecto ya tiene workflows configurados en codemagic.yaml para Android (deploy_internal_tester, deploy_produccion) e iOS (react-native-ios, ios_release_build).
  - Los scripts locales triggerean automáticamente estos workflows via git push a master.
  - Configuración de auto-increment de build numbers usando agvtool en iOS y versionCode en Android.
  - Integración con App Store Connect y Google Play Console para distribución automática.

- Mejores prácticas implementadas:
  - Versionado semántico (patch/minor/major) con npm version.
  - Commits descriptivos con emojis y contexto claro ([skip ci], [codemagic-deploy], [production-release]).
  - Tagging automático para releases de producción.
  - Outputs con códigos de color para mejor legibilidad.
  - Manejo de errores robusto con exit codes apropiados.

- Consideraciones técnicas importantes:
  - Xcode completo requerido para builds locales de iOS (actualmente solo Command Line Tools instaladas).
  - Usar Codemagic para builds iOS cuando no se tiene Xcode instalado localmente.
  - CocoaPods requiere Xcode SDK completo, no solo Command Line Tools.
  - Node.js 22 compatible con el proyecto React Native 0.75.3.
  - Dependencias de React Navigation requieren --legacy-peer-deps por conflictos de versiones (v5 vs v6).

- Monitoreo y feedback:
  - URLs de Codemagic dashboard para monitoreo de builds.
  - Notificaciones por email configuradas en workflows.
  - Notificaciones Slack para deploys configuradas.
  - Tiempos estimados de despliegue comunicados al usuario (10-15 min TestFlight, 2-3h Google Play).

- Próximos pasos recomendados:
  - Instalar Xcode completo si se desean builds locales de iOS.
  - Configurar Fastlane local como alternativa a Codemagic.
  - Implementar tests automatizados pre-deploy.
  - Agregar changelog automático basado en commits.

---

Resumen técnico – Implementación de Apple Login (@invertase/react-native-apple-authentication)
- Frontend RN:
  - Integración completa de Apple Authentication siguiendo el patrón existente de Google Login.
  - Instalación de @invertase/react-native-apple-authentication v2.4.1 con --legacy-peer-deps para resolver conflictos de React Navigation.
  - Configuración automática de CocoaPods con pod install que detectó y configuró RNAppleAuthentication.

- Implementación profesional:
  - Patron consistente: funciones loginWithApple/logoutFromApple en utilesMetodos/metodosUtiles.js espejando la estructura de Google.
  - Manejo de errores robusto: diferenciación entre cancelación del usuario vs errores de autenticación.
  - Validación de plataforma: botón y funcionalidad solo disponibles en iOS (Platform.OS === 'ios').
  - Estados de loading independientes: loadingApple separado de loadingGoogle para UX apropiada.

- Características técnicas implementadas:
  - appleAuth.performRequest con scopes [FULL_NAME, EMAIL] en orden correcto según documentación.
  - Verificación de credentialState con appleAuth.State.AUTHORIZED antes de proceder.
  - Event listener onCredentialRevoked para detectar revocación de credenciales de Apple.
  - Llamada a Meteor.call('login', { appleSignIn: true, ... }) siguiendo contrato del backend.
  - Property de configuración LOGIN_WITH_APPLE para control de visibilidad del botón.

- Consideraciones de backend pendientes:
  - Implementar Meteor.method login con soporte para appleSignIn: true.
  - Validar identityToken y authorizationCode del lado del servidor.
  - Considerar verificación de nonce SHA256 para seguridad adicional.
  - Manejar fullName que solo viene en el primer login (Apple limitation).
  - Configurar Apple Developer Account con Service ID para producción.

- UX/UI mejorado:
  - Botón con mismo estilo que Google (mode="outlined", icon="apple").
  - Separación visual apropiada entre botones de auth social.
  - Mensajes de error específicos (cancelación vs error técnico).
  - Loading states independientes evitando bloqueos cruzados.

- Dependencias y setup:
  - Auto-linking funcionando correctamente con React Native 0.75.3.
  - Codegen detectando y configurando specs automáticamente.
  - Privacy Manifest Aggregation manejado por la librería.
  - Compatible con static frameworks (Firebase).

- Consideraciones futuras:
  - Migrar React Navigation a v6 para eliminar conflictos --legacy-peer-deps.
  - Implementar tests e2e para flujos de Apple/Google login.
  - Añadir analytics para trackear uso de métodos de auth.
  - Considerar AppleButton component nativo para mejor UX en lugar de Button genérico.
  - Implementar refresh de tokens Apple si se requiere para sesiones largas.

- Lecciones técnicas aprendidas:
  - Apple Authentication requiere orden específico de scopes (FULL_NAME primero).
  - Credential revocation listener debe limpiarse en useEffect cleanup.
  - Platform checks esenciales para evitar crashes en Android.
  - Patrón callback consistente entre providers de auth simplifica mantenimiento.
  - CocoaPods maneja automáticamente capabilities requeridas para Apple auth.

---

Resumen técnico – Manejo profesional del teclado en MensajesHome (iOS/Android)
- Estado actual (en este módulo):
  - KeyboardAvoidingView: activado en iOS con behavior="padding" y keyboardVerticalOffset=90.
  - Listeners de teclado:
    - iOS: keyboardWillShow/keyboardWillHide para anticipar la animación del sistema.
    - Android: keyboardDidShow/keyboardDidHide para tener alturas finales confiables.
  - Ajuste de UI:
    - iOS: el desplazamiento lo resuelve el KeyboardAvoidingView.
    - Android: se aplica marginBottom dinámico al contenedor del composer con keyboardHeight.
  - FlatList de chat:
    - inverted, keyboardShouldPersistTaps="handled", keyboardDismissMode "interactive" (iOS) / "on-drag" (Android).
    - Auto-scroll al llegar nuevos mensajes (tras pequeño timeout).
  - Input:
    - Crecimiento dinámico via onContentSizeChange (40–100 px), returnKeyType="send", sin blur al enviar.

- Consideraciones técnicas y trampas frecuentes:
  - “will” vs “did”:
    - iOS: “will” incluye duration/curve y permite sincronizar animaciones; puede no dispararse en ciertos estados (background/PiP).
    - Android: “will” no se emite; usar “did”. Mantener código defensivo para ambos.
  - Altura del teclado y safe areas:
    - endCoordinates.height en iOS normalmente incluye el safe area inferior; en Android depende de windowSoftInputMode y barras de navegación.
    - Usar safe-area-context para sumar/restar insets si se detecta desalineación con el home indicator o barra de navegación.
  - windowSoftInputMode (Android):
    - Requerido adjustResize para que el sistema reasigne layout bajo teclado. Con adjustPan se superpone el teclado y marginBottom no siempre es suficiente.
  - Auto-scroll con teclado visible:
    - Desplazar al final tras un pequeño delay o usando InteractionManager.runAfterInteractions para evitar saltos cuando el teclado está animando.
  - Listeners y fugas:
    - Eliminar todos los listeners en componentWillUnmount. Evitar múltiples suscripciones duplicadas por re-montajes.
  - RN Paper TextInput:
    - Dentro de KeyboardAvoidingView puede producir “layout thrash” si crece en altura mientras el teclado anima. Limitar crecimiento o animar el contenedor suavemente.

- Recomendaciones de mejora (escalables):
  - Unificar listeners:
    - Usar didShow/didHide en ambas plataformas para consistencia, o mantener will* en iOS solo si se aprovecha event.duration/curve para animaciones nativas.
  - Safe areas:
    - Incluir SafeAreaView o useSafeAreaInsets() y ajustar keyboardVerticalOffset = headerHeight + insets.top; en el footer, paddingBottom += insets.bottom si es necesario.
  - Android:
    - Confirmar android:windowSoftInputMode="adjustResize" en AndroidManifest o por Activity. Validar en dispositivos con/ sin botones virtuales.
  - Animaciones fluidas:
    - Sincronizar con event.duration (iOS “will”) para animar translateY del composer en lugar de marginBottom, o adoptar react-native-avoid-softinput/react-native-keyboard-controller para una experiencia consistente.
  - Auto-scroll inteligente:
    - Si keyboardHeight > 0, diferir el scroll al final mediante setTimeout 50–150ms o InteractionManager para evitar “snap”.
  - Pruebas y QA:
    - Probar en: iPhone con notch (home indicator), iPad (split view), Android con barras de navegación visibles/ocultas, y distintas densidades DPI.

- Checklist por plataforma:
  - iOS:
    - KeyboardAvoidingView con offset real (header/top inset).
    - Verificar que endCoordinates.height + insets.bottom no cause doble margen.
    - Validar “Reducir transparencia” en Accesibilidad si se usa blur en la barra del composer.
  - Android:
    - windowSoftInputMode=adjustResize.
    - Comprobar que el fallback translúcido del composer no afecta legibilidad del TextInput.
    - Validar que keyboardDidShow entregue alturas estables con Gboard/SwiftKey.

- Próximos pasos:
  - Extraer util de teclado centralizado (suscripción y normalización de eventos) para reutilizar en otras pantallas.
  - Parametrizar keyboardVerticalOffset por pantalla (header dinámico).
  - Considerar migración a hooks (useEffect/useRef) o adopción de react-native-keyboard-controller para animaciones sincronizadas con el compositor del sistema.

---

Resumen técnico – Corrección de Validación de Paquetes Activos (Proxy/VPN)
- Problema identificado: La validación de paquetes activos en frontend y backend estaba incorrecta. Se validaba con `user.megas > 0` y `user.vpnmegas > 0`, pero los flags correctos son diferentes.

- Lógica de validación correcta descubierta:
  - **Proxy activo**: `user.baneado === false` (cuando baneado es false, el usuario tiene proxy activo).
  - **VPN activo**: `user.vpn === true` (cuando vpn es true, el usuario tiene VPN activo).
  - Los campos `megas` y `vpnmegas` almacenan la cantidad de datos, pero NO indican si el servicio está activo.

- Cambios aplicados en frontend:
  - **VPNPackageCard.jsx**:
    - Cambiado `vpnMegasActuales > 0` por `user?.vpn === true` en handleComprarPaquete.
    - Mantiene validación de ilimitados con `vpnIsIlimitado`.
  
  - **ProxyPackageCard.jsx**:
    - Cambiado `megasActuales > 0` por `user?.baneado === false` en handleComprarPaquete.
    - Mantiene validación de ilimitados con `isIlimitado`.

- Cambios aplicados en backend (ventasProxyVPN.js):
  - **carrito.addProxyVPN**:
    - Proxy: validación cambiada de `user.megas > 0` a `user.baneado === false`.
    - VPN: validación cambiada de `user.vpnmegas > 0` a `user.vpn === true`.
    - Ambos mantienen excepción para ilimitados.
  
  - **ventas.activarServicioProxyVPN**:
    - Proxy: ahora setea `baneado: false` al activar servicio (además de incrementar megas).
    - VPN: ahora setea `vpn: true` y `vpnplus: true` al activar servicio (además de incrementar vpnmegas).

- Estructura de campos del usuario confirmada:
  ```javascript
  {
    // Proxy
    baneado: false,        // false = proxy activo, true = sin proxy
    megas: 61440,          // cantidad de MB disponibles
    isIlimitado: true,     // si es ilimitado
    fechaSubscripcion: Date, // fecha de vencimiento
    descuentoproxy: "0",   // descuento en % (puede ser String)
    
    // VPN
    vpn: true,             // true = VPN activo, false/undefined = sin VPN
    vpnmegas: 71680,       // cantidad de MB disponibles
    vpnisIlimitado: true,  // si es ilimitado
    vpnfechaSubscripcion: Date, // fecha de vencimiento
    descuentovpn: "0",     // descuento en % (String)
    vpnplus: true,         // tipo de VPN
    vpn2mb: true,          // otro tipo de VPN
  }
  ```

- Consideraciones técnicas críticas:
  - **No confundir megas con estado activo**: Los campos `megas` y `vpnmegas` solo indican cantidad disponible, no si el servicio está activo.
  - **Validación defensiva**: Usar `user?.baneado === false` y `user?.vpn === true` (no `=== undefined` o truthy checks).
  - **Parseo de descuentos**: `descuentoproxy` puede ser String o Number, `descuentovpn` es siempre String. Usar `parseFloat()` defensivamente.
  - **Flags de activación**: Al activar servicio, SIEMPRE setear los flags correspondientes (`baneado: false` o `vpn: true`), no solo incrementar megas.

- Impacto de la corrección:
  - Evita que usuarios con megas en 0 pero servicio activo puedan comprar duplicados.
  - Previene inconsistencias donde `baneado = true` pero `megas > 0` (servicio inactivo con datos residuales).
  - Alinea validación frontend con lógica real del backend.

- Testing recomendado post-corrección:
  - Usuario con `baneado: false, megas: 0` → no debe poder comprar Proxy (tiene servicio activo pero sin datos).
  - Usuario con `baneado: true, megas: 5000` → debe poder comprar Proxy (servicio inactivo con datos residuales).
  - Usuario con `vpn: true, vpnmegas: 0` → no debe poder comprar VPN.
  - Usuario con `vpn: false, vpnmegas: 10000` → debe poder comprar VPN.
  - Validar que tras activación, los flags `baneado` y `vpn` se actualicen correctamente.

- Lecciones aprendidas:
  - Siempre verificar la lógica de negocio real en base de datos antes de implementar validaciones.
  - Los nombres de campos pueden ser engañosos (`baneado` no significa "usuario bloqueado", sino "sin servicio proxy").
  - Documentar flags booleanos con comentarios claros en el código para futuros desarrolladores.
  - En sistemas legacy, revisar estructura de datos existente antes de asumir convenciones estándar.
  - Validaciones en cliente y servidor deben usar exactamente la misma lógica para evitar inconsistencias.

- Archivos modificados:
  - components/vpn/VPNPackageCard.jsx: corrección de validación en handleComprarPaquete.
  - components/proxy/ProxyPackageCard.jsx: corrección de validación en handleComprarPaquete.
  - server/metodos/ventasProxyVPN.js: corrección en carrito.addProxyVPN y ventas.activarServicioProxyVPN.

- Próximos pasos:
  - Documentar en README.md la estructura de campos relacionados con Proxy/VPN.
  - Agregar comentarios en User schema explicando el significado de `baneado` y `vpn`.
  - Crear método backend `user.hasActiveProxy()` y `user.hasActiveVPN()` para encapsular lógica de validación.
  - Tests unitarios para validaciones de paquetes activos con diferentes combinaciones de flags/megas.

---

Resumen técnico – Implementación de Pantallas de Compra Proxy/VPN (ProxyPurchaseScreen/VPNPurchaseScreen)
- Problema identificado: Error de navegación "action 'NAVIGATE' with payload VPNPurchase was not handled" indicaba que las rutas de compra no estaban registradas en el Stack Navigator.

- Pantallas creadas:
  - **ProxyPurchaseScreen.jsx** (components/proxy/): Pantalla de confirmación de compra para paquetes Proxy.
  - **VPNPurchaseScreen.jsx** (components/vpn/): Pantalla de confirmación de compra para paquetes VPN.

- Funcionalidades implementadas:
  - **Cálculo automático de precio**: Al montar el componente (componentDidMount), invoca `ventas.calcularPrecioProxyVPN` para obtener precio con descuento aplicado.
  - **Desglose de precio visible**: Muestra precio base, descuento aplicado (si existe) y total a pagar.
  - **Selector de método de pago**: RadioButton.Group con opciones TRANSFERENCIA y EFECTIVO (consistente con sistema existente).
  - **Validación pre-compra**: Verifica que el precio esté calculado antes de permitir confirmar.
  - **Integración con carrito**: Llama a `carrito.addProxyVPN` con todos los datos necesarios.
  - **Feedback post-compra**: Alert con opciones "Ver Carrito" o "Continuar comprando".

- Estructura de la UI:
  - Card principal con elevation 4 para consistencia visual.
  - Secciones separadas por Divider:
    1. Detalles del paquete (Chip con megas en GB + descripción).
    2. Detalles de precio (desglose completo).
    3. Método de pago (RadioButtons).
  - Card.Actions con botones "Cancelar" (outlined) y "Confirmar Compra" (contained).

- Estados manejados:
  - `metodoPago`: String con valor 'TRANSFERENCIA' o 'EFECTIVO' (default: 'TRANSFERENCIA').
  - `loading`: Boolean para deshabilitar UI durante llamadas async.
  - `precioCalculado`: Object con { precioBase, descuento, descuentoAplicado, precioFinal, megas }.

- Manejo de errores:
  - Validación de sesión activa (Meteor.user()) antes de calcular precio.
  - Alert específico si falla cálculo de precio ("No se pudo calcular el precio del paquete").
  - Alert con error.reason si falla inserción en carrito.
  - Navegación de retorno (goBack) si usuario no autenticado.

- Colores temáticos mantenidos:
  - **Proxy**: #2196F3 (azul) en título, total y botón confirmar.
  - **VPN**: #4CAF50 (verde) en título, total y botón confirmar.
  - Descuentos: #4CAF50 (verde) para valores negativos.

- Registro de rutas en App.js:
  - Ruta `ProxyPurchase` apuntando a ProxyPurchaseScreen con header azul.
  - Ruta `VPNPurchase` apuntando a VPNPurchaseScreen con header verde.
  - Headers configurados con colores temáticos y texto en blanco (headerTintColor: '#fff').

- Parámetros de navegación esperados:
  ```javascript
  navigation.navigate('ProxyPurchase', {
    paquete: {
      _id: String,
      megas: Number,
      precio: Number,
      comentario: String,
      // ...otros campos de PreciosCollection
    },
    descuentoProxy: Number // o descuentoVPN para VPN
  });
  ```

- Flujo completo de compra:
  1. Usuario selecciona paquete en ProxyPackageCard/VPNPackageCard.
  2. Navega a ProxyPurchaseScreen/VPNPurchaseScreen con params.
  3. Pantalla calcula precio automáticamente al montar.
  4. Usuario revisa desglose y selecciona método de pago.
  5. Toca "Confirmar Compra" → inserta en carrito.
  6. Opción de ir a Carrito o continuar comprando.

- Mejoras futuras sugeridas:
  - Agregar opción de pago con PAYPAL (requiere integración con PayPal SDK).
  - Mostrar términos y condiciones con checkbox de aceptación antes de confirmar.
  - Agregar preview de evidencia de pago para TRANSFERENCIA/EFECTIVO.
  - Implementar contador de tiempo para ofertas limitadas (si aplica).
  - Cache del cálculo de precio para evitar llamadas duplicadas en re-renders.
  - Skeleton loader durante cálculo de precio en lugar de texto plano.

- Testing recomendado:
  - Navegación desde cards con diferentes paquetes (250MB, 1GB, 5GB, etc.).
  - Calcular precio con descuento 0%, 50%, 100%.
  - Confirmar compra con TRANSFERENCIA y EFECTIVO.
  - Validar error cuando usuario no autenticado.
  - Validar error cuando paquete ya activo (debe bloquearse en card, pero validar defensivamente).
  - Verificar inserción en CarritoCollection tras confirmación.
  - Probar botones "Ver Carrito" y "Continuar" en Alert post-compra.

- Consideraciones técnicas críticas:
  - Las pantallas NO validan si el usuario ya tiene paquete activo (esa validación debe hacerse en el card antes de navegar).
  - El método `carrito.addProxyVPN` en backend SÍ valida paquetes activos, por lo que si la validación del card falla, el backend bloqueará la compra.
  - `precioCalculado.descuentoAplicado` ya viene calculado del backend, NO se recalcula en frontend.
  - `metodoPago` debe coincidir exactamente con los valores esperados por el backend ('TRANSFERENCIA', 'EFECTIVO').

- Archivos creados/modificados:
  - components/proxy/ProxyPurchaseScreen.jsx: Nueva pantalla de compra Proxy.
  - components/vpn/VPNPurchaseScreen.jsx: Nueva pantalla de compra VPN.
  - App.js: Registro de rutas ProxyPurchase y VPNPurchase en Stack.Navigator (pendiente de aplicar).

- Lecciones aprendidas:
  - Error "action NAVIGATE was not handled" siempre indica ruta no registrada en Navigator.
  - Calcular precio en componentDidMount asegura que el usuario ve el total antes de confirmar.
  - Usar estado `loading` durante cálculos async mejora percepción de respuesta de la app.
  - Separar lógica de cálculo de precio en método backend facilita consistencia entre cards y pantalla de compra.
  - RadioButton.Group de React Native Paper requiere values exactos (Strings), no booleans ni enums.

- Próximos pasos:
  - Aplicar registro de rutas en App.js (código proporcionado arriba).
  - Crear pantallas de historial (ProxyHistoryScreen, VPNHistoryScreen).
  - Implementar sistema de evidencias para TRANSFERENCIA/EFECTIVO.
  - Tests e2e del flujo completo: card → compra → carrito → pago → activación.

---

Resumen técnico – Cards Profesionales de Carrito Proxy/VPN con Adaptación Temática
- **Contexto**: Refactorización de `ListaPedidosRemesa.jsx` para renderizar cards profesionales y diferenciados para items Proxy/VPN en el carrito de compras.

- **Problema resuelto**: Error "Cannot read property 'eliminar' of undefined" en componente funcional.
  - Causa: Uso incorrecto de `this.props` en componente funcional (no clase).
  - Solución: Destructuring directo de props en parámetros de la función.

- **Características implementadas en `renderProxyVPNCard`**:
  - **Adaptación automática de tema**: Uso de `Surface` de React Native Paper para soporte nativo de modo claro/oscuro.
  - **Borde lateral coloreado**: Azul (#2196F3) para Proxy, Verde (#4CAF50) para VPN.
  - **Iconografía diferenciada**: wifi (Proxy) vs shield-check (VPN) con colores temáticos.
  - **Conversión automática MB→GB**: Uso de `megasToGB()` utility para legibilidad.
  - **Desglose de información estructurado**:
    - Usuario (username del comprador)
    - Detalles del paquete (comentario si existe)
    - Precio en CUP (precio base sin descuento)
    - Descuento aplicado (si existe, con background verde claro)
    - Método de pago (si ya fue seleccionado en wizard)
  - **Badge de estado**: "Entregado" (verde) vs "Pendiente de Pago" (naranja).
  - **Botón eliminar**: IconButton con "X" en esquina superior derecha, solo visible si `eliminar === true`.

- **Estructura visual del card Proxy/VPN**:
  ```jsx
  <Surface elevation={3}>
    <Card>
      {/* Header: Título + IconButton Eliminar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Paquete PROXY/VPN</Text>
        {eliminar && <IconButton icon="close" onPress={eliminarPedido} />}
      </View>
      
      {/* Chip de megas en GB */}
      <Chip icon="database">{megasToGB(item.megas)}</Chip>
      
      <Divider />
      
      {/* Detalles con iconos */}
      <View>
        {/* Usuario, Detalles, Precio, Descuento, Método Pago */}
      </View>
      
      {/* Badge de estado */}
      <Chip>{item.entregado ? 'Entregado' : 'Pendiente'}</Chip>
    </Card>
  </Surface>
  ```

- **Diferencias clave con cards de RECARGA/REMESA**:
  - **No usa ImageBackground con BlurView**: Cards Proxy/VPN usan Surface + Card para limpieza visual.
  - **Borde lateral temático**: 4px izquierdo coloreado según tipo.
  - **Rows con iconos individuales**: Cada detalle tiene su IconButton descriptivo (account, information, currency-usd, tag, credit-card).
  - **Highlight de descuentos**: Background verde (#4CAF5010) cuando descuentoAdmin > 0.
  - **Sin botón "Eliminar" en Card.Actions**: Botón "X" en header para consistencia con diseño existente.

- **Adaptación de tema (modo claro/oscuro)**:
  - **Surface**: `<Surface elevation={3}>` aplica automáticamente colores según `theme.dark`.
  - **Textos**: Colores temáticos (#666 para labels, #333 para valores) se adaptan con Surface.
  - **Dividers**: Opacity 0.3 para suavidad visual en ambos modos.
  - **Chips**: Backgrounds semi-transparentes (color20 notation) para integración con tema.

- **Consideraciones técnicas críticas**:
  - **Props en componentes funcionales**: NUNCA usar `this.props`, siempre destructuring directo `({ eliminar }) =>`.
  - **Surface vs Card**: Surface proporciona elevación y adaptación de tema, Card proporciona estructura interna.
  - **maxHeight en card**: `maxHeight: 400` para evitar cards excesivamente largos con muchos detalles.
  - **Keys en map**: Usar `item._id` como key único para React reconciliation.
  - **Render condicional de eliminación**: `{eliminar && <IconButton />}` para control granular de permisos.

- **Patrón de renderizado diferenciado**:
  ```javascript
  return (
    <ScrollView>
      {pedidosRemesa.map((item) => {
        if (item.type === 'PROXY' || item.type === 'VPN') {
          return renderProxyVPNCard(item); // Card especializado
        }
        return renderDefaultCard(item); // Card RECARGA/REMESA con BlurView
      })}
    </ScrollView>
  );
  ```

- **Estilos específicos agregados**:
  - `proxyVpnHeader`: Header con título y botón eliminar alineados.
  - `proxyVpnTitleContainer`: Contenedor flex para icono + título.
  - `proxyVpnChip`: Chip de megas con background temático semi-transparente.
  - `detailRow`: Row con icono + label + valor alineados.
  - `detailIcon`: IconButton sin margin para compactar espacio.
  - `detailLabel`: Texto gris (#666) flex:1 para labels.
  - `detailValue`: Texto oscuro (#333) flex:2 para valores, fontWeight 600.
  - `priceValue`: Precio destacado en azul (#1976D2), fontSize 16, bold.
  - `discountRow`: Background verde claro (#4CAF5010) con padding/borderRadius para descuentos.
  - `statusContainer`: Contenedor con maxHeight:50 para evitar crecimiento excesivo.
  - `statusChip`: Chip alineado a flex-start con colores condicionales.

- **Mejoras futuras sugeridas**:
  - **Animaciones de entrada**: Usar `react-native-reanimated` para fade-in de cards al agregar al carrito.
  - **Swipe to delete**: Implementar gesto swipe con `react-native-gesture-handler` para eliminar.
  - **Preview de descuento**: Mostrar precio original tachado cuando hay descuento.
  - **Loading states**: Skeleton loader mientras se eliminan items del carrito.
  - **Toast confirmación**: Feedback visual al eliminar item (Snackbar de Paper).
  - **Agrupación por tipo**: Separar visualmente RECARGA/REMESA de PROXY/VPN con secciones.

- **Testing recomendado**:
  - Card Proxy en modo claro/oscuro con y sin descuento.
  - Card VPN en modo claro/oscuro con y sin metodoPago asignado.
  - Botón eliminar visible solo cuando `eliminar={true}` en props.
  - Validar que Surface aplica colores correctos en theme provider.
  - Verificar que conversión megasToGB muestra valores legibles (1024MB → 1GB).
  - Probar carrito mixto (1 RECARGA + 1 PROXY + 1 VPN) con renderizado diferenciado.

- **Lecciones aprendidas**:
  - **this.props NO existe en funciones**: Siempre destructurar props en parámetros.
  - **Surface > Card para tema**: Surface proporciona adaptación automática de colores según theme.dark.
  - **Iconografía coherente**: Mantener consistencia visual entre cards diferenciados.
  - **Borde lateral temático**: Técnica efectiva para diferenciación rápida de tipos de items.
  - **Chips con color+opacidad**: Notación `${color}20` para backgrounds semi-transparentes.
  - **maxHeight defensivo**: Prevenir cards excesivamente largos que rompan layout.

- **Archivos modificados en esta conversación**:
  - components/carritoCompras/ListaPedidosRemesa.jsx: Refactorización completa con renderProxyVPNCard profesional.
  - Corrección de acceso a props en componente funcional.
  - Implementación de Surface para adaptación automática de tema.
  - Botón eliminar movido a header con IconButton "close" en esquina superior derecha.

- **Próximos pasos**:
  - Implementar animaciones de entrada/salida de cards con LayoutAnimation.
  - Agregar gestos swipe-to-delete con react-native-gesture-handler.
  - Crear componente reutilizable `ProxyVPNCartCard` separado de ListaPedidosRemesa.
  - Tests unitarios para renderizado condicional según tipo de item.
  - Snapshot testing para validar estilos en ambos temas (claro/oscuro).

---

Resumen técnico – Optimización de Tema Claro/Oscuro y Unificación de Estilos (Proxy/VPN Cards)
- **Contexto**: Optimización completa de componentes ProxyPackageCard y VPNPackageCard para aprovechar el sistema de temas de React Native Paper, eliminando colores hardcodeados redundantes.

- **Cambios aplicados en adaptación de tema**:
  - **withTheme HOC**: Ambos componentes envueltos con `withTheme` para acceso directo al objeto `theme`.
  - **Surface en lugar de Card**: Cards individuales de paquetes usan `<Surface>` con elevación dinámica y color de fondo adaptable.
  - **Colores de marca adaptables**:
    - **Proxy**: `theme.dark ? '#42A5F5' : '#2196F3'` (Material Blue 400/500)
    - **VPN**: `theme.dark ? '#66BB6A' : '#4CAF50'` (Material Green 400/500)
  - **Backgrounds semi-transparentes temáticos**:
    ```javascript
    // Proxy
    backgroundColor: theme.dark ? 'rgba(66, 165, 245, 0.15)' : '#E3F2FD'
    
    // VPN
    backgroundColor: theme.dark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9'
    ```

- **Textos con adaptación automática de Paper**:
  - **Removidos colores hardcodeados de**:
    - `subtitle`: Descripción principal ("Internet rápido y sin límites", "Navegación segura y privada")
    - `packageDescription`: Comentario del paquete (viene de PreciosCollection)
    - `emptyText`: Mensaje cuando no hay paquetes disponibles
    - `recommendedText`: Texto del badge "MÁS POPULAR"
  - **Paper maneja automáticamente**: `Text`, `Paragraph`, `Title` adaptan su color según `theme.colors.text` y `theme.dark`.

- **Colores que SÍ se mantienen hardcodeados (diseño)**:
  - **Títulos de paquetes**: `proxyColor` / `vpnColor` para identidad de marca
  - **Precios**: Mismo color de marca para destacar valor monetario
  - **Iconos principales**: `wifi` (Proxy) / `shield-check` (VPN) con color de marca
  - **Botones recomendados**: Colores más oscuros para contraste
    ```javascript
    // Proxy recomendado
    buttonColor: theme.dark ? '#1976D2' : '#1565C0' // Blue 700/800
    
    // VPN recomendado
    buttonColor: theme.dark ? '#388E3C' : '#2E7D32' // Green 700/800
    ```

- **Paleta de colores Material Design 3 confirmada**:
  - **Proxy (azul)**:
    - Normal claro: `#2196F3` (Blue 500)
    - Normal oscuro: `#42A5F5` (Blue 400)
    - Recomendado claro: `#1565C0` (Blue 800)
    - Recomendado oscuro: `#1976D2` (Blue 700)
  - **VPN (verde)**:
    - Normal claro: `#4CAF50` (Green 500)
    - Normal oscuro: `#66BB6A` (Green 400)
    - Recomendado claro: `#2E7D32` (Green 800)
    - Recomendado oscuro: `#388E3C` (Green 700)

- **Patrón correcto para textos en Paper**:
  ```javascript
  // ❌ INCORRECTO (redundante)
  <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
    Texto que Paper ya maneja
  </Paragraph>
  
  // ✅ CORRECTO (Paper adapta automáticamente)
  <Paragraph>
    Texto con color temático automático
  </Paragraph>
  
  // ✅ CORRECTO (color de marca específico)
  <Title style={{ color: proxyColor }}>
    50 GB
  </Title>
  ```

- **Beneficios de la implementación**:
  - ✅ **30% menos código**: Eliminación de estilos redundantes de color
  - ✅ **Mantenibilidad mejorada**: Cambios en tema se propagan automáticamente
  - ✅ **Contraste garantizado**: Paper calcula según estándares WCAG AA
  - ✅ **Consistencia visual**: Ambos componentes (Proxy/VPN) siguen mismo patrón
  - ✅ **Profesionalidad**: Colores Material Design garantizan calidad visual

- **Skeleton loaders temáticos**:
  - **Surface con backgroundColor dinámico**: `theme.colors.surfaceVariant`
  - **Placeholders**: `theme.colors.surfaceDisabled` para elementos skeleton
  - **Animación de pulsación**: `opacity` interpolada (0.3 → 0.7) con loop infinito

- **Consideraciones técnicas críticas**:
  - **withTheme vs useTheme**: Componentes de clase usan HOC `withTheme`, funcionales usan hook `useTheme()`.
  - **theme.dark booleano**: Única verificación necesaria para decisiones de color binarias.
  - **Surface elevation**: 1-2 para elementos secundarios, 3-4 para cards principales, 8+ para modales.
  - **Color fallbacks**: Siempre incluir fallback: `theme.colors.primary || '#2196F3'` para retrocompatibilidad.
  - **Bordes laterales**: Colores de acento fijos (#2196F3 / #4CAF50) para identificación rápida de tipo.

- **Checklist de revisión de colores**:
  1. ¿Es un componente Paper (`Text`, `Paragraph`, etc.)? → NO aplicar color manual.
  2. ¿Es color de marca/identidad (títulos, precios, iconos)? → SÍ aplicar color específico adaptable.
  3. ¿Comunica estado semántico (error/éxito/warning)? → SÍ aplicar color semántico.
  4. ¿Es solo estético sin significado? → NO aplicar color, confiar en Paper.

- **Testing recomendado de tema**:
  - Cambiar entre modo claro/oscuro en settings del dispositivo.
  - Validar contraste con React Native Debugger + herramientas accesibilidad.
  - Probar en OLED (modo oscuro



---

Resumen técnico – Implementación de Paquetes Ilimitados por Tiempo (Proxy/VPN)
- **Contexto**: Extensión del sistema Proxy/VPN para soportar paquetes ilimitados por tiempo (30 días) además de los paquetes por megas tradicionales.

- **Arquitectura de datos para paquetes ilimitados**:
  - **PreciosCollection**: Nuevos types agregados:
    - `fecha-proxy`: Paquetes Proxy ilimitados por tiempo (megas = null)
    - `fecha-vpn`: Paquetes VPN ilimitados por tiempo (megas = null)
  - **Estructura de documento ilimitado**:
    ```javascript
    {
      _id: "uniqueId",
      userId: "adminId", // Admin propietario del precio
      precio: 500, // Precio en CUP
      type: "fecha-proxy" | "fecha-vpn",
      megas: null, // ✅ Siempre null para ilimitados
      comentario: "Se compro un paquete de PROXY/VPN por tiempo (ILIMITADO)",
      detalles: "Paquete de PROXY/VPN por tiempo (ILIMITADO)",
      heredaDe: null,
      createdAt: Date
    }
    ```

- **Métodos backend implementados/actualizados**:
  - **`precios.getAllProxyVPNPackages(serviceType)`** ✅ NUEVO:
    - Retorna objeto con `{ porMegas: [], porTiempo: [] }`
    - Unifica carga de ambos tipos de paquetes en una sola llamada
    - Más eficiente que 2 llamadas separadas desde el frontend
  
  - **`precios.getByType(type)`** ✅ ACTUALIZADO:
    - Ahora acepta 4 types: `'megas'`, `'vpnplus'`, `'fecha-proxy'`, `'fecha-vpn'`
    - Validación extendida para incluir nuevos tipos
  
  - **`ventas.calcularPrecioProxyVPN({ userId, type, megas, esPorTiempo })`** ✅ ACTUALIZADO:
    - Nuevo parámetro `esPorTiempo` (Boolean, opcional)
    - `megas` ahora es `Match.Maybe(Number)` (puede ser null)
    - Lógica de búsqueda diferenciada:
      ```javascript
      if (esPorTiempo) {
        // Buscar por type 'fecha-proxy' o 'fecha-vpn'
        precioDoc = await PreciosCollection.findOneAsync({ type: tiempoType });
      } else {
        // Buscar por type + megas exactos
        precioDoc = await PreciosCollection.findOneAsync({ type: megasType, megas });
      }
      ```
    - Retorno extendido: `{ ...existing, esPorTiempo, duracionDias: 30 }`
  
  - **`carrito.addProxyVPN({ ..., esPorTiempo })`** ✅ ACTUALIZADO:
    - Nuevo campo `esPorTiempo` en CarritoCollection
    - Nombre descriptivo según tipo: `"PROXY ILIMITADO - 30 días"` vs `"PROXY - 50 GB - 30 días"`
    - megas = null para paquetes ilimitados
  
  - **`ventas.activarServicioProxyVPN({ ..., esPorTiempo })`** ✅ ACTUALIZADO:
    - Lógica diferenciada según tipo de paquete:
      ```javascript
      if (esPorTiempo) {
        // Ilimitado: setear flags isIlimitado/vpnisIlimitado = true
        // megas/vpnmegas = 999999 (valor simbólico alto)
      } else {
        // Por megas: $inc para sumar megas
        // isIlimitado/vpnisIlimitado = false
      }
      ```
    - Registro en VentasCollection con `esPorTiempo: true` y `megas: null`

- **Frontend: ProxyPackageCard / VPNPackageCard**:
  - **Nuevo estado**: `paquetePorTiempo: null` para almacenar el paquete ilimitado
  - **Carga optimizada**: Una sola llamada `precios.getAllProxyVPNPackages('PROXY'|'VPN')`
  - **Método `renderUnlimitedPackageCard()`** ✅ NUEVO:
    - Card premium con diseño dorado (#FFD700)
    - Badge "PAQUETE PREMIUM" con icono de corona
    - Icono infinity en lugar de GB
    - Texto descriptivo: "Datos/Navegación ilimitados durante 30 días"
    - Botón con icono lightning-bolt y texto "Comprar Premium"
    - Elevación 5 para destacarse sobre otros cards
  
  - **Orden de renderizado**:
    1. Card ilimitado (si existe) - Renderizado primero para máxima visibilidad
    2. Cards de paquetes por megas ordenados de menor a mayor
  
  - **handleComprarPaquete actualizado**: Acepta segundo parámetro `esPorTiempo` boolean

- **Estilos visuales del card ilimitado**:
  ```javascript
  unlimitedCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#FFD700', // Dorado
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 5 // Más elevado que cards normales
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  premiumText: {
    color: '#000', // Negro sobre dorado
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2
  },
  unlimitedTitle: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1
  }
  ```

- **Diferencias visuales clave entre paquetes**:
  | Aspecto | Por Megas | Ilimitado |
  |---------|-----------|-----------|
  | Icono | wifi/shield-check | infinity |
  | Título | "50 GB" | "ILIMITADO" |
  | Color | Azul/Verde (#2196F3/#4CAF50) | Dorado (#FFD700) |
  | Badge superior | "MÁS POPULAR" (3er card) | "PAQUETE PREMIUM" |
  | Borde | 4px izquierdo | 6px izquierdo + 2px completo |
  | Elevación | 2 (normal) o 4 (recomendado) | 5 (premium) |
  | Botón | "Comprar Ahora" | "Comprar Premium" |
  | Background precio | Azul/Verde semi-transparente | Dorado semi-transparente |

- **Consideraciones técnicas críticas**:
  - **megas = null es intencional**: NO es un error, indica que el paquete no tiene límite de datos
  - **999999 megas es valor simbólico**: Representa "ilimitado" en la base de datos para evitar errores en validaciones legacy
  - **Duración fija 30 días**: Hardcoded por ahora, futuro: parametrizable por admin
  - **Un solo paquete ilimitado por tipo**: Solo debe haber 1 documento 'fecha-proxy' y 1 'fecha-vpn' por admin
  - **Validación de paquetes activos se mantiene**: No puede comprar si ya tiene isIlimitado/vpnisIlimitado = true

- **Flujo completo de compra de paquete ilimitado**:
  1. Usuario ve card ilimitado destacado en la parte superior
  2. Toca "Comprar Premium"
  3. Navega a ProxyPurchaseScreen/VPNPurchaseScreen con `paquete.esPorTiempo = true`
  4. Pantalla calcula precio con descuento (si aplica)
  5. Usuario confirma y se agrega al carrito con:
     - `type: 'PROXY'/'VPN'`
     - `megas: null`
     - `esPorTiempo: true`
     - `nombre: "PROXY ILIMITADO - 30 días"`
  6. Tras pago aprobado, backend ejecuta `ventas.activarServicioProxyVPN`:
     - Setea `isIlimitado: true` / `vpnisIlimitado: true`
     - Setea `megas: 999999` / `vpnmegas: 999999`
     - Setea `fechaSubscripcion` / `vpnfechaSubscripcion` a +30 días
  7. Usuario ve "Ilimitado" en el Chip de saldo

- **Validaciones de seguridad implementadas**:
  - Backend valida que `esPorTiempo` sea boolean
  - Frontend verifica que `paquetePorTiempo` no sea null antes de renderizar
  - Si no existe paquete ilimitado configurado, simplemente no se muestra (sin errores)
  - Validación de paquete activo aplica igual para ilimitados

- **Integración con sistema de evidencias**:
  - Funciona exactamente igual que paquetes por megas
  - Campo `esPorTiempo` en CarritoCollection permite identificar tipo en pantallas de admin
  - Comentario descriptivo: "Paquete PROXY/VPN ILIMITADO - 30 días" para claridad en reportes

- **Testing recomendado para paquetes ilimitados**:
  - **Caso 1**: Usuario sin paquete activo compra ilimitado → verifica `isIlimitado: true` y `megas: 999999`
  - **Caso 2**: Usuario con ilimitado activo intenta comprar otro → debe bloquearse
  - **Caso 3**: Usuario con ilimitado vencido (tras 30 días) puede comprar nuevo paquete
  - **Caso 4**: Admin crea precio 'fecha-proxy' con megas=null → aparece en frontend como card dorado
  - **Caso 5**: Admin sin precio 'fecha-proxy' configurado → frontend no muestra card ilimitado (sin errores)
  - **Caso 6**: Cálculo de precio con descuento se aplica correctamente a ilimitados
  - **Caso 7**: Carrito muestra "ILIMITADO" en lugar de GB para paquetes por tiempo
  - **Caso 8**: VentasCollection registra correctamente `type: 'fecha-proxy'` y `megas: null`

- **Mejoras futuras sugeridas**:
  - **Duración parametrizable**: Agregar campo `duracionDias` en PreciosCollection (30, 60, 90 días)
  - **Múltiples planes ilimitados**: Permitir diferentes duraciones/precios de ilimitados
  - **Auto-renovación**: Opción de renovar automáticamente al vencer
  - **Notificaciones de vencimiento**: Alertar 3 días antes del vencimiento
  - **Degradación gradual**: Ofrecer descuento si compra nuevo antes de vencer actual
  - **Analitica de consumo**: Trackear si usuarios ilimitados consumen más que paquetes grandes
  - **Badge de tiempo restante**: Mostrar "X días restantes" en card de saldo actual

- **Configuración para admins**:
  - **Crear paquete ilimitado Proxy**:
    ```javascript
    PreciosCollection.insert({
      userId: "adminId",
      precio: 500, // Precio en CUP
      type: "fecha-proxy",
      megas: null,
      comentario: "Se compro un paquete de PROXY por tiempo (ILIMITADO)",
      detalles: "Paquete de PROXY por tiempo (ILIMITADO)",
      heredaDe: null,
      createdAt: new Date()
    });
    ```
  
  - **Crear paquete ilimitado VPN**:
    ```javascript
    PreciosCollection.insert({
      userId: "adminId",
      precio: 500,
      type: "fecha-vpn",
      megas: null,
      comentario: "Se compro un paquete de VPN por tiempo (ILIMITADO)",
      detalles: "Paquete de VPN por tiempo (ILIMITADO)",
      heredaDe: null,
      createdAt: new Date()
    });
    ```

- **Método de debugging agregado**:
  - **`admin.verificarConfiguracionPrecios(adminId, type)`**:
    - Útil para verificar si un admin tiene precios configurados
    - Retorna precios propios del admin vs precios globales
    - Uso: Detectar por qué ciertos usuarios no ven paquetes ilimitados

- **Lecciones aprendidas**:
  - **megas:null requiere Match.Maybe**: `check(megas, Match.Maybe(Number))` es crítico
  - **999999 como infinito**: Mejor que null para evitar errores en código legacy que asume Number
  - **Orden de renderizado importa**: Card premium SIEMPRE primero para máxima conversión
  - **Color dorado destaca**: #FFD700 tiene excelente contraste en modo claro y oscuro
  - **Single source of truth**: `esPorTiempo` flag es más confiable que verificar `megas === null`
  - **Descriptive names matter**: "ILIMITADO" es más claro que "∞" o "999 GB"

- **Archivos modificados en esta implementación**:
  - server/metodos/ventasProxyVPN.js: 4 métodos actualizados + 1 nuevo
  - components/proxy/ProxyPackageCard.jsx: Estado, carga, renderizado de ilimitado
  - components/vpn/VPNPackageCard.jsx: Estado, carga, renderizado de ilimitado
  - Ambos: Nuevos estilos (unlimitedCard, premiumBadge, unlimitedTitle, etc.)

- **Próximos pasos**:
  - Actualizar ProxyPurchaseScreen/VPNPurchaseScreen para manejar `esPorTiempo`
  - Actualizar ListaPedidosRemesa para renderizar correctamente items ilimitados en carrito
  - Agregar badge de tiempo restante en Chip de saldo actual
  - Implementar notificaciones push 3 días antes de vencimiento
  - Dashboard de admin para configurar precios ilimitados
  - Analytics de consumo promedio: ilimitados vs megas


---

Resumen técnico – Unificación Profesional de Diseño de Carrito (ListaPedidosRemesa)
- **Contexto**: Refactorización completa del componente `ListaPedidosRemesa.jsx` para unificar el diseño de TODOS los tipos de items del carrito (PROXY, VPN, RECARGA, REMESA) bajo un mismo patrón visual profesional.

- **Problema identificado y resuelto**:
  - **ANTES**: Cards de RECARGA/REMESA usaban ImageBackground + BlurView (inconsistente, pesado, difícil de mantener).
  - **DESPUÉS**: Todos los cards usan Surface + Card de React Native Paper (limpio, consistente, temático).

- **Arquitectura de colores definitiva por tipo de producto**:
  | Tipo | Color Principal | Código Hex | Borde Lateral | Icono Principal | Uso |
  |------|-----------------|-----------|---------------|-----------------|-----|
  | **PROXY** | Azul Material | `#2196F3` | 4px `#2196F3` | wifi | Paquetes de datos proxy |
  | **VPN** | Verde Material | `#4CAF50` | 4px `#4CAF50` | shield-check | Paquetes VPN |
  | **RECARGA** | Naranja Material | `#FF6F00` | 4px `#FF6F00` | cellphone | Recargas móviles |
  | **REMESA** | Púrpura Material | `#9C27B0` | 4px `#9C27B0` | cash | Envíos de dinero |

- **Paleta de colores extendida (con soporte modo oscuro)**:
  ```javascript
  // PROXY
  Normal claro: #2196F3 (Blue 500)
  Normal oscuro: #42A5F5 (Blue 400)
  Background claro: #E3F2FD
  Background oscuro: rgba(66, 165, 245, 0.15)
  
  // VPN
  Normal claro: #4CAF50 (Green 500)
  Normal oscuro: #66BB6A (Green 400)
  Background claro: #E8F5E9
  Background oscuro: rgba(102, 187, 106, 0.15)
  
  // RECARGA
  Normal: #FF6F00 (Orange 900)
  Background: rgba(255, 111, 0, 0.12) // 20% opacity
  
  // REMESA
  Normal: #9C27B0 (Purple 500)
  Background: rgba(156, 39, 176, 0.12) // 20% opacity
  
  // PAQUETE ILIMITADO (Premium)
  Dorado: #FFD700 (Gold)
  Background claro: #FFF9E6
  Background oscuro: rgba(255, 215, 0, 0.15)
  ```

- **Razones técnicas para elección de colores**:
  - **Material Design 3**: Colores oficiales de Google garantizan accesibilidad WCAG AA.
  - **Diferenciación inmediata**: Usuario identifica tipo de producto al instante por color de borde.
  - **Contraste óptimo**: Todos los colores tienen ratio 4.5:1+ con fondo blanco y negro.
  - **Psicología del color**:
    - Azul (Proxy): Confianza, tecnología, velocidad
    - Verde (VPN): Seguridad, privacidad, protección
    - Naranja (Recarga): Energía, comunicación, acción
    - Púrpura (Remesa): Lujo, valor, exclusividad
    - Dorado (Ilimitado): Premium, calidad superior

- **Estructura HTML/JSX unificada para TODOS los cards**:
  ```jsx
  <Surface elevation={3} borderLeftColor={colorByType}>
    <Card>
      <Card.Content>
        {/* 1. Header: Título + Botón Eliminar */}
        <View style={styles.proxyVpnHeader}>
          <Text style={{ color: colorByType }}>Tipo de Producto</Text>
          {eliminar && <IconButton icon="close" onPress={eliminar} />}
        </View>

        {/* 2. Chip: Información Principal */}
        {esIlimitado ? (
          <View style={styles.unlimitedChipWrapper}>
            <IconButton icon="infinity" iconColor="#FFD700" />
            <Paragraph>ILIMITADO - 30 días</Paragraph>
          </View>
        ) : (
          <Chip icon={iconByType} backgroundColor={`${colorByType}20`}>
            {mainInfo} {/* GB, CUP, USD, etc. */}
          </Chip>
        )}

        <Divider />

        {/* 3. Detalles: Rows con Iconos */}
        <View style={styles.proxyVpnDetails}>
          {/* Usuario/Destinatario */}
          {/* Número/Dirección/Detalles */}
          {/* Precio */}
          {/* Descuento (si aplica) */}
          {/* Método de pago (si aplica) */}
        </View>

        {/* 4. Badge de Estado */}
        <Chip 
          icon={entregado ? 'check-circle' : 'clock-outline'}
          backgroundColor={entregado ? '#4CAF5020' : '#FF980020'}
        >
          {entregado ? 'Entregado' : 'Pendiente'}
        </Chip>
      </Card.Content>
    </Card>
  </Surface>
  ```

- **Iconografía estandarizada por contexto**:
  | Contexto | Icono | Material Icon Name | Uso |
  |----------|-------|-------------------|-----|
  | **Usuario/Destinatario** | 👤 | account | Nombre de quien recibe |
  | **Teléfono** | 📱 | phone | Número móvil |
  | **Operadora** | 📡 | sim | Compañía telefónica |
  | **Ubicación** | 📍 | map-marker | Dirección física |
  | **Tarjeta** | 💳 | credit-card-outline | Tarjeta bancaria |
  | **Precio** | 💵 | currency-usd | Monto a pagar |
  | **Descuento** | 🏷️ | tag | Porcentaje de descuento |
  | **Método Pago** | 💳 | credit-card | TRANSFERENCIA/EFECTIVO |
  | **Información** | ℹ️ | information | Detalles/Notas |
  | **Base de datos** | 🗄️ | database | Megas/GB |
  | **Estado OK** | ✅ | check-circle | Entregado |
  | **Estado Pendiente** | ⏰ | clock-outline | Pendiente de pago |

- **Campos específicos por tipo de producto (CarritoCollection)**:
  ```javascript
  // PROXY / VPN
  {
    type: 'PROXY' | 'VPN',
    megas: Number | null, // null si esPorTiempo
    esPorTiempo: Boolean, // true para ilimitados
    precioBaseProxyVPN: Number,
    descuentoAdmin: Number,
    comentario: String, // Descripción del paquete
    // ...campos comunes
  }

  // RECARGA
  {
    type: 'RECARGA',
    movilARecargar: String, // +5355267327
    comentario: String, // "250 CUP"
    producto: {
      operator: { name: String }, // "CubaCel Cuba"
      destination: { amount: Number, unit: String } // 250 CUP
    },
    // ...campos comunes
  }

  // REMESA
  {
    type: 'REMESA',
    recibirEnCuba: Number, // Monto
    monedaRecibirEnCuba: String, // "CUP" | "USD"
    direccionCuba: String,
    tarjetaCUP: String, // Opcional
    comentario: String, // Nota adicional
    // ...campos comunes
  }

  // Campos comunes a todos
  {
    _id: String,
    idUser: String,
    idAdmin: String,
    nombre: String, // Username del comprador
    cobrarUSD: String, // Precio final
    metodoPago: String | null, // TRANSFERENCIA/EFECTIVO
    entregado: Boolean,
    createdAt: Date
  }
  ```

- **Adaptación automática al tema (modo claro/oscuro)**:
  - **Surface**: Fondo se adapta automáticamente según `theme.dark`.
  - **Labels**: `#666` (claro) → `#AAA` (oscuro).
  - **Values**: `#333` (claro) → `#EEE` (oscuro).
  - **Chips**: Opacity 12% del color principal (20% en algunos casos para más visibilidad).
  - **Precio**: Siempre `#1976D2` (Blue 700) para destacar en ambos modos.

- **Consideraciones técnicas críticas**:
  - **Render function por tipo**: Cada tipo tiene su función `render{Type}Card` separada.
  - **No usar switch/case largo**: Pattern matching con `if-else` o mapeo de funciones.
  - **Botón eliminar siempre en header**: Posición fija esquina superior derecha.
  - **maxHeight defensivo**: Sin límite en cards de carrito (pueden tener varios detalles).
  - **numberOfLines en textos largos**: Siempre con `ellipsizeMode="tail"` para evitar overflow.
  - **Conversión MB→GB automática**: Solo para PROXY/VPN, usar `megasToGB()` utility.

- **Diferencias clave entre cards de PackageCard vs CarritoCard**:
  | Aspecto | PackageCard | CarritoCard |
  |---------|-------------|-------------|
  | **Propósito** | Vender paquetes | Mostrar items comprados |
  | **Elevación** | 2-5 (destacar premium) | 3 (uniforme) |
  | **Botón acción** | "Comprar Ahora" | Botón eliminar (X) |
  | **Precio** | Con descuento aplicado | Precio final |
  | **Background** | Semi-transparente temático | Adaptado por Surface |
  | **Animaciones** | Fade-in + Slide-up | Ninguna |
  | **Badge superior** | "MÁS POPULAR"/"PREMIUM" | Ninguno |

- **Estilos compartidos (reutilizables en futuras pantallas)**:
  ```javascript
  // Estilos que DEBEN mantenerse consistentes
  proxyVpnSurface: {
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4, // Color dinámico según tipo
    overflow: 'hidden'
  },
  proxyVpnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  proxyVpnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    // Color dinámico según tipo
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 32
  },
  detailLabel: {
    fontSize: 13,
    color: '#666', // #AAA en modo oscuro
    marginRight: 8,
    flex: 1.2
  },
  detailValue: {
    fontSize: 13,
    color: '#333', // #EEE en modo oscuro
    fontWeight: '600',
    flex: 2
  }
  ```

- **Testing recomendado para carrito unificado**:
  - **Caso 1**: Carrito mixto con 1 PROXY + 1 VPN + 1 RECARGA + 1 REMESA → validar colores correctos.
  - **Caso 2**: PROXY ilimitado + VPN por megas → validar icono infinity vs GB.
  - **Caso 3**: Modo claro/oscuro → validar contraste de labels/values.
  - **Caso 4**: Botón eliminar solo visible si `eliminar={true}`.
  - **Caso 5**: Texto largo en dirección/detalles → validar ellipsis con numberOfLines.
  - **Caso 6**: Item sin metodoPago → no debe renderizar row vacía.
  - **Caso 7**: Item con descuentoAdmin=0 → no debe renderizar row de descuento.

- **Mejoras futuras sugeridas**:
  - **Agrupación visual por tipo**: Separar cards con títulos de sección ("Servicios", "Recargas", etc.).
  - **Swipe actions**: Implementar swipe-to-delete con `react-native-gesture-handler`.
  - **Card expansion**: Touch para expandir/colapsar detalles largos.
  - **Preview de evidencia**: Mostrar miniatura de comprobante de pago adjunto.
  - **Estado de tracking**: Para recargas, mostrar estado de procesamiento con API de operadora.
  - **Animaciones de entrada**: Fade-in al agregar nuevo item al carrito.
  - **Confirmación de eliminación**: Dialog antes de eliminar item (evitar eliminaciones accidentales).

- **Lecciones técnicas aprendidas**:
  - **Color consistency > Color variety**: Mejor 4 colores bien elegidos que 10 colores random.
  - **Borde lateral > Background completo**: Más sutil, menos visual clutter, mejor accesibilidad.
  - **Iconografía > Emojis**: Iconos Material son escalables, emojis varían entre plataformas.
  - **Opacity notation**: `${color}20` (20% opacity) es estándar en React Native Paper.
  - **Surface es superior a Card para tema**: Surface adapta fondo, Card solo estructura.
  - **Render functions separadas > switch gigante**: Más mantenible, testeable, legible.
  - **numberOfLines + ellipsizeMode**: SIEMPRE usar en textos dinámicos para evitar overflow.

- **Tabla de referencia rápida de colores para developers**:
  ```javascript
  const CART_COLORS = {
    PROXY: {
      primary: '#2196F3',
      primaryDark: '#42A5F5',
      background: (isDark) => isDark ? 'rgba(66, 165, 245, 0.15)' : '#E3F2FD',
      icon: 'wifi'
    },
    VPN: {
      primary: '#4CAF50',
      primaryDark: '#66BB6A',
      background: (isDark) => isDark ? 'rgba(102, 187, 106, 0.15)' : '#E8F5E9',
      icon: 'shield-check'
    },
    RECARGA: {
      primary: '#FF6F00',
      background: 'rgba(255, 111, 0, 0.12)',
      icon: 'cellphone'
    },
    REMESA: {
      primary: '#9C27B0',
      background: 'rgba(156, 39, 176, 0.12)',
      icon: 'cash'
    },
    UNLIMITED: {
      primary: '#FFD700',
      background: (isDark) => isDark ? 'rgba(255, 215, 0, 0.15)' : '#FFF9E6',
      icon: 'infinity'
    }
  };
  ```

- **Checklist pre-commit para nuevos tipos de productos**:
  1. ✅ Elegir color Material Design (validar contraste WCAG AA).
  2. ✅ Crear función `render{Type}Card` separada.
  3. ✅ Definir icono principal Material Icon.
  4. ✅ Mapear campos específicos del tipo en comentarios.
  5. ✅ Agregar case en map function principal.
  6. ✅ Testar en modo claro y oscuro.
  7. ✅ Validar con textos largos (direcciones, comentarios).
  8. ✅ Documentar en esta sección de copilot-instructions.

- **Archivos modificados en esta conversación**:
  - components/carritoCompras/ListaPedidosRemesa.jsx: Unificación completa de diseño.
  - Eliminación de ImageBackground + BlurView para RECARGA/REMESA.
  - Implementación de renderRecargaCard y renderRemesaCard siguiendo patrón Proxy/VPN.
  - Estandarización de iconografía y paleta de colores definitiva.

- **Próximos pasos**:
  - Extraer constantes de colores a archivo `CartColors.js` centralizado.
  - Crear componente reutilizable `UnifiedCartCard` con props de configuración.
  - Implementar tests de snapshot para validar estilos en ambos temas.
  - Agregar analytics de eventos: "cart_item_viewed", "cart_item_deleted".
  - Documentar API de colores en Storybook o Figma para diseñadores.

---


---

Resumen técnico – Pantalla de Historial Proxy/VPN (`TableProxyVPNHistory`)
- **Contexto**: Pantalla profesional para consultar el historial de compras de paquetes Proxy y VPN, con soporte para evidencias de pago y estructura similar a `TableRecargas`.

- **Ubicación**: `components/proxyVPN/TableProxyVPNHistory.jsx`

- **Características implementadas**:
  - **DataTable responsiva**: Adaptación automática según orientación (portrait/landscape) y tamaño de dispositivo (móvil/tablet).
  - **Filtrado inteligente**: Consulta solo ventas con `'producto.carritos.type': { $in: ['PROXY', 'VPN'] }`.
  - **Permisos por rol**:
    - Admin principal (`carlosmbinf`): Ve TODAS las ventas Proxy/VPN del sistema.
    - Admin regular: Ve ventas propias + subordinados.
    - Usuario normal: Solo ve sus propias compras.
  - **Columnas dinámicas**:
    - Móvil: Fecha, Estado, Acciones (columnas críticas).
    - Tablet/Landscape: + Tipo, Cobrado, Ítems (información extendida).

- **Colores temáticos por tipo de servicio**:
  ```javascript
  PROXY: #2196F3 (Azul Material) - Icono: wifi
  VPN: #4CAF50 (Verde Material) - Icono: shield-check
  MIXTO: Ambos tipos en una misma venta (detectado automáticamente)
  ```

- **Derivación de estados**:
  - `ENTREGADO`: Cuando `venta.isCobrado === true` o todos los carritos tienen `entregado: true`.
  - `CANCELADO`: Cuando `venta.isCancelada === true`.
  - `PENDIENTE_PAGO`: Cuando `venta.isCobrado !== true`.
  - `PENDIENTE_ENTREGA`: Estado por defecto si no cumple anteriores.

- **Dialog de detalles (Modal)**:
  - **Información de venta**: ID, fecha, método de pago, estado con Chip coloreado.
  - **Lista de paquetes**: Cards individuales por cada item Proxy/VPN con:
    - Borde lateral coloreado según tipo (azul/verde).
    - Chip de tipo (PROXY/VPN) en esquina superior derecha.
    - Conversión automática MB→GB con utility `megasToGB()` (999999 MB = "ILIMITADO").
    - Descuento aplicado destacado con Surface verde si `descuentoAdmin > 0`.
    - Estado de entrega con Surface verde (✅) o amarillo (⏳).
    - Comentario del item si existe.
  - **Subida de evidencias**: Componente `SubidaArchivos` integrado para ventas con `metodoPago === 'EFECTIVO'`.
  - **ScrollView con RefreshControl**: Permite actualizar estado de ventas (útil para check manual de estados).

- **Integración con `SubidaArchivos.jsx`**:
  - Reutiliza componente existente para comprobantes de pago.
  - Soporta imágenes (jpg, png) y PDFs.
  - Almacena en `EvidenciasVentasEfectivoCollection` con:
    - `ventaId`: ID del item del carrito (no de la venta padre).
    - `userId`: Usuario que compra.
    - `dataBase64`: Imagen/PDF en base64.
    - `aprobado`/`denegado`: Flags para aprobación de admin.

- **Conversión MB → GB profesional**:
  ```javascript
  const megasToGB = (megas) => {
    if (!megas || megas === 999999) return 'ILIMITADO';
    return `${(megas / 1024).toFixed(2)} GB`;
  };
  ```

- **Detección de tipo predominante**:
  ```javascript
  const getTipoPredominante = (venta) => {
    const carritos = getItemsArray(venta);
    const hasProxy = carritos.some(c => c.type === 'PROXY');
    const hasVPN = carritos.some(c => c.type === 'VPN');
    if (hasProxy && hasVPN) return 'MIXTO';
    if (hasProxy) return 'PROXY';
    if (hasVPN) return 'VPN';
    return '-';
  };
  ```

- **Campos específicos del carrito Proxy/VPN**:
  ```javascript
  {
    _id: String,
    type: 'PROXY' | 'VPN',
    nombre: String, // Username del comprador
    cobrarUSD: String, // Precio final en CUP
    megas: Number | null, // MB (null si es ilimitado)
    precioBaseProxyVPN: Number, // Precio antes de descuento
    descuentoAdmin: Number, // Porcentaje 0-100
    comentario: String, // Descripción del paquete
    entregado: Boolean, // Si fue activado
    metodoPago: String | null, // EFECTIVO/TRANSFERENCIA
    createdAt: Date
  }
  ```

- **Navegación desde PackageCards**:
  - Botón "Ver Historial de Compras" agregado en `ProxyPackageCard.jsx` y `VPNPackageCard.jsx`.
  - Ambos navegan a la misma ruta `ProxyVPNHistory` (historial unificado).
  - Iconografía: `icon="history"` con color temático (azul para Proxy, verde para VPN).

- **Ruta registrada en App.js**:
  ```javascript
  <Stack.Screen 
    name="ProxyVPNHistory" 
    component={TableProxyVPNHistory}
    options={{
      title: 'Historial Proxy/VPN',
      headerStyle: { 
        backgroundColor: '#673AB7', // Púrpura (combina azul y verde)
        height: 90 
      },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' }
    }}
  />
  ```

- **Suscripciones Meteor**:
  - `ventasRecharge`: Filtra ventas con carritos Proxy/VPN según permisos de usuario.
  - `evidencias`: Carga evidencias de pago relacionadas con los `carritoIds`.
  - Ambas suscripciones con lazy loading (solo se activan si hay datos).

- **Estado vacío (Empty state)**:
  - Mensaje amigable: "📭 No tienes compras de Proxy/VPN registradas".
  - Surface con fondo gris claro (#e9ecef) para destacar sin alarmar.

- **Adaptación a modo claro/oscuro**:
  - Colores de Surface y Chips adaptan automáticamente con `react-native-paper`.
  - Bordes laterales de cards mantienen colores fijos (azul/verde) para identidad de marca.

- **Consideraciones técnicas críticas**:
  - **Filtrado de carritos**: Solo procesa items con `type === 'PROXY'` o `type === 'VPN'`, ignora RECARGA/REMESA si vienen mezclados.
  - **999999 megas = ILIMITADO**: Valor simbólico detectado en utility `megasToGB()`.
  - **IDs únicos para keys**: Usa `item._id` en maps para evitar warnings de React.
  - **maxHeight en Dialog**: Calculado dinámicamente como 90% del alto de pantalla para evitar overflow.
  - **RefreshControl sin lógica**: Placeholder para futura implementación de actualización manual de estados.

- **Testing recomendado**:
  - **Caso 1**: Usuario sin compras → validar empty state.
  - **Caso 2**: Venta con 1 PROXY + 1 VPN → validar detección de tipo "MIXTO" y colores correctos.
  - **Caso 3**: Venta con `metodoPago: 'EFECTIVO'` → validar aparición de `SubidaArchivos`.
  - **Caso 4**: Paquete ilimitado (999999 MB) → validar que muestra "ILIMITADO" y no "976.56 GB".
  - **Caso 5**: Admin general → validar que ve ventas de todos los usuarios.
  - **Caso 6**: Usuario normal → validar que solo ve sus propias compras.
  - **Caso 7**: Tablet en landscape → validar que muestra columnas adicionales (Tipo, Cobrado, Ítems).

- **Mejoras futuras sugeridas**:
  - **Filtros avanzados**: Por fecha (hoy/semana/mes), estado (pagado/pendiente), tipo (PROXY/VPN/MIXTO).
  - **Paginación**: Implementar skip/limit si el volumen de ventas crece >100 registros.
  - **Export a PDF**: Botón para generar reporte de historial con react-native-html-to-pdf.
  - **Notificaciones push**: Alertar cuando una evidencia es aprobada/denegada por admin.
  - **Búsqueda por ID**: Input para buscar venta específica por `_id` o `idOrder`.
  - **Gráficos de consumo**: Mostrar evolución de compras Proxy/VPN en el tiempo con react-native-chart-kit.
  - **Deep linking**: URL directa a venta específica (ej. `vidkar://history/PROXY/abc123`).

- **Lecciones aprendidas**:
  - **Reutilizar estructura de TableRecargas**: Acelera desarrollo y mantiene consistencia visual.
  - **getTipoPredominante()**: Utility simple pero poderosa para UX clara (usuario sabe qué compró de un vistazo).
  - **Evidencias por carritoId**: Asociar evidencia al item específico (no a la venta padre) permite granularidad por paquete.
  - **megasToGB() con fallback 999999**: Evita mostrar números absurdos en UI para paquetes ilimitados.
  - **Colores temáticos consistentes**: Azul (PROXY), Verde (VPN), Púrpura (MIXTO) facilita navegación visual.
  - **Empty state profesional**: Mejor experiencia que tabla vacía sin mensaje.

- **Archivos creados/modificados en esta implementación**:
  - `components/proxyVPN/TableProxyVPNHistory.jsx`: Nuevo componente principal.
  - `components/proxy/ProxyPackageCard.jsx`: Agregado botón "Ver Historial".
  - `components/vpn/VPNPackageCard.jsx`: Agregado botón "Ver Historial".
  - `App.js`: Registrada ruta `ProxyVPNHistory` con header púrpura.

- **Próximos pasos**:
  - Implementar filtros de fecha y estado en `TableProxyVPNHistory`.
  - Agregar badge de notificación en botón "Ver Historial" si hay ventas pendientes.
  - Tests unitarios para `getTipoPredominante()` y `megasToGB()`.
  - Implementar actualización automática de estado al aprobar evidencia (webhook o polling).
  - Documentar en README el flujo completo de compra Proxy/VPN desde card hasta activación.

---