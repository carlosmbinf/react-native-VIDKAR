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

## Resumen técnico – Módulo COMERCIO con Datos Mock (Fase 1)

### **Contexto de la Implementación**
Se implementó la **Fase 1** del módulo COMERCIO para VidKar usando **datos estáticos (mock)** basados en la arquitectura de RiderKar. Esta fase se enfoca en validar la UI/UX antes de conectar al backend.

---

### **1. Estructura de Archivos Creada**

```
D:/android-VIDKAR/
├── data/
│   └── comercio/
│       └── mockData.js          # Datos estáticos + helpers
├── components/
│   └── comercio/
│       ├── pedidos/
│       │   ├── HomePedidosComercio.jsx    # Pantalla principal
│       │   └── CardPedidoComercio.jsx     # Card de pedido individual
│       └── maps/
│           └── MapaPedidos.jsx             # Mapa con destino
```

---

### **2. Mock Data Implementado (mockData.js)**

#### **Collections Simuladas**:
- **MOCK_TIENDAS**: 3 tiendas con coordenadas reales de La Habana.
- **MOCK_PRODUCTOS**: 6 productos distribuidos entre las tiendas.
- **MOCK_PEDIDOS_CADETE**: 2 pedidos asignados al cadete mock.
- **MOCK_VENTAS**: 2 ventas con estados diferentes (ENCAMINO, PREPARANDO).
- **MOCK_USER_CADETE**: Usuario cadete simulado.
- **MOCK_USER_CLIENTE**: Usuario cliente con coordenadas de entrega.

#### **Helpers Implementados**:
- `puedeAvanzarEstado(estadoActual, nuevoEstado)`: Valida transiciones de estado.
- `obtenerSiguienteEstado(estadoActual)`: Retorna el siguiente estado en el flujo.
- `calcularTotalPedido(venta)`: Suma productos + costo de entrega.
- `formatearPrecio(precio, moneda)`: Formatea precios con moneda.

#### **Constantes Clave**:
- `ESTADOS_PEDIDO`: Enum de estados válidos.
- `TRANSICIONES_ESTADO`: Máquina de estados (qué cambios son válidos).
- `COLORES_ESTADO`: Colores Material Design por estado.
- `LABELS_BOTON_ESTADO`: Textos de botones según estado.

---

### **3. Componentes Frontend (React Native Paper)**

#### **HomePedidosComercio.jsx**:
- **Funcionalidad**:
  - Muestra lista de pedidos asignados al cadete actual.
  - RefreshControl funcional (mock con setTimeout).
  - Empty state profesional con Surface + iconos.
  - Contador de pedidos activos en header.

- **Preparado para Backend**:
  ```javascript
  // TODO: Reemplazar con useTracker real
  // const { pedidos, ready } = useTracker(() => {
  //   Meteor.subscribe('comercio.pedidosAsignados', { userId: Meteor.userId() });
  //   return PedidosAsignadosComercioCollection.find({ entregado: false }).fetch();
  // });
  ```

#### **CardPedidoComercio.jsx**:
- **Funcionalidad**:
  - Card completo con:
    - Header: Nombre de tienda + chip de estado con color dinámico.
    - Productos: Listado con cantidades y precios unitarios.
    - Desglose de precio: Subtotal + costo de entrega + total.
    - Comentario del cliente (si existe).
    - Mapa integrado con punto de destino.
    - Botones de acción contextuales.

- **Lógica de Botones**:
  - **"Cancelar"**: Solo habilitado en estado `PREPARANDO`.
  - **Botón principal**: Cambia texto según estado actual:
    - `PREPARANDO` → "LLEGUÉ AL LOCAL"
    - `CADETEENLOCAL` → "TENGO EL PEDIDO"
    - `ENCAMINO` → "LLEGUÉ AL DESTINO"
    - `CADETEENDESTINO` → "ENTREGADO"
  - Botón deshabilitado en estado `ENTREGADO`.

- **Manejo de Estados**:
  - Usa `obtenerSiguienteEstado()` para determinar próximo estado.
  - Confirmación con Alert antes de avanzar.
  - Loading
