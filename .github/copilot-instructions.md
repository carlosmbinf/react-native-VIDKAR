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

## Resumen técnico – Servicio de Notificación Foreground para Modo Cadete (Corrección de Ícono)
- **Problema Identificado**: Crash al iniciar notificación foreground por ícono `smallIcon: 'ic_notification'` inexistente.

- **Error Android**:
  ```
  java.lang.IllegalArgumentException: Invalid notification (no valid small icon)
  Caused by: no valid small icon 'ic_notification' found in drawable resources
  ```

- **Solución Aplicada**:
  - **Temporal**: Cambio de `smallIcon: 'ic_notification'` a `smallIcon: 'ic_launcher'` (ícono por defecto de la app que SIEMPRE existe).
  - **Permanente**: Crear ícono personalizado `ic_notification.png` en todas las densidades de recursos Android.

- **Creación de Ícono Personalizado**:
  1. Usar Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
  2. Configuración recomendada:
     - **Fuente**: Clipart → delivery/moto/paquete
     - **Color**: White (#FFFFFF) - **OBLIGATORIO** para notificaciones
     - **Padding**: 25% para breathing room
     - **Formato**: PNG con transparencia
  3. Ubicación de archivos:
     ```
     android/app/src/main/res/
     ├── drawable-mdpi/ic_notification.png (24x24px)
     ├── drawable-hdpi/ic_notification.png (36x36px)
     ├── drawable-xhdpi/ic_notification.png (48x48px)
     ├── drawable-xxhdpi/ic_notification.png (72x72px)
     └── drawable-xxxhdpi/ic_notification.png (96x96px)
     ```

- **Alternativa XML Vector** (solo testing):
  - Crear `ic_notification.xml` en `res/drawable/` con vector drawable.
  - **Limitación**: Solo funciona en Android 5.0+ (API 21+), PNG es más compatible.

- **Requisitos Técnicos de Íconos de Notificación Android**:
  - **Color**: Blanco (#FFFFFF) sobre fondo transparente - **NO color en el ícono**.
  - **Estilo**: Silueta simple sin degradados ni detalles complejos.
  - **Tamaño**: 24x24dp base, escalar proporcionalmente para otras densidades.
  - **Material Design**: Seguir guías de Google para consistencia visual.
  - **Formato**: PNG-8 con canal alpha (transparencia).

- **Debugging de Recursos Android**:
  ```bash
  # Verificar que el ícono existe en todas las densidades
  find android/app/src/main/res -name "ic_notification.png"
  
  # Limpiar caché de Android Studio
  cd android && ./gradlew clean
  
  # Verificar recursos en APK
  unzip -l app/build/outputs/apk/debug/app-debug.apk | grep ic_notification
  ```

- **Logs de Depuración**:
  ```javascript
  // En NotificacionAndroidForeground.js
  console.log('🔧 [Debug] Intentando mostrar notificación con smallIcon:', 'ic_launcher');
  
  // Si falla:
  console.error('❌ [Notificación] Error:', error.message);
  console.error('📋 [Notificación] Stack:', error.stack);
  ```

- **Casos Edge Manejados**:
  - **Ícono no existe**: Fallback a `ic_launcher` (ícono de la app).
  - **Densidad faltante**: Android escala automáticamente desde densidad más cercana.
  - **Formato incorrecto**: Android rechaza con error claro, usar PNG válido.
  - **Color incorrecto**: Notificación puede mostrarse negra si ícono tiene color RGB.

- **Testing del Ícono**:
  1. **Visual**: Notificación debe mostrarse con ícono blanco sobre fondo del sistema.
  2. **Densidades**: Probar en dispositivos hdpi (1.5x), xhdpi (2x), xxhdpi (3x), xxxhdpi (4x).
  3. **Temas**: Validar en modo claro y oscuro de Android.
  4. **Android Versions**: Probar en API 23 (min), 29 (dark mode), 34 (target).

- **Mejoras Futuras**:
  - **Ícono animado**: Usar `AnimatedVectorDrawable` para ícono que pulse (Android 5.0+).
  - **Ícono por estado**: Diferentes íconos según estado del pedido (preparando, en camino, etc).
  - **Color dinámico**: Android 12+ soporta `color` parameter para tinting del ícono.
  - **Badge de contador**: Mostrar número de pedidos activos en el ícono.

- **Recursos Útiles**:
  - Android Icon Generator: https://romannurik.github.io/AndroidAssetStudio/
  - Material Icons: https://fonts.google.com/icons
  - Notifee Docs: https://notifee.app/react-native/docs/android/appearance#small-icon

- **Lecciones Aprendidas**:
  - **smallIcon es OBLIGATORIO**: Android siempre requiere un ícono válido para foreground services.
  - **Usar ic_launcher como fallback**: Garantiza que la notificación nunca crashee.
  - **PNG > XML Vector**: Mejor compatibilidad con versiones antiguas de Android.
  - **Blanco puro**: Color del ícono DEBE ser blanco (#FFFFFF), Android tintea según tema.
  - **Todas las densidades**: Incluir mdpi hasta xxxhdpi para evitar pixelación.
  - **Clean build**: Siempre limpiar caché Android tras agregar/modificar recursos.

- **Archivos Modificados**:
  - `NotificacionAndroidForeground.js`: Cambio de `smallIcon: 'ic_notification'` a `smallIcon: 'ic_launcher'`.
  - `android/app/src/main/res/drawable-*/ic_notification.png`: Íconos en todas las densidades (pendiente de crear).

- **Próximos Pasos**:
  - Crear ícono personalizado con Android Asset Studio.
  - Revertir `smallIcon: 'ic_launcher'` a `smallIcon: 'ic_notification'` tras crear el ícono.
  - Documentar proceso de creación de íconos en README.md.
  - Agregar ícono a repositorio con commit descriptivo.

---

## Resumen técnico – Notificación Foreground Persistente No Eliminable (Modo Cadete)
- **Contexto**: La notificación de "Modo Cadete Activo" debe ser **completamente persistente** y **no eliminable** por el usuario mientras el servicio esté activo.

- **Problema Identificado**: Con la configuración inicial, el usuario podía deslizar la notificación para eliminarla, lo que detenía el servicio foreground prematuramente.

- **Solución Implementada**:
  - **Props críticas en `displayNotification()`**:
    ```javascript
    {
      ongoing: true,               // NO deslizable
      asForegroundService: true,   // Servicio foreground (no se puede cerrar)
      autoCancel: false,           // NO se cancela al tocar
      timeoutAfter: null,          // Sin expiración automática
      pressAction: {
        id: 'default',
        launchActivity: 'default', // Solo abre app, no elimina notificación
      }
    }
    ```

- **Configuración del Canal** (`notificationChannels.js`):
  - `importance: AndroidImportance.HIGH`: Mantiene la notificación visible.
  - `visibility: AndroidVisibility.PUBLIC`: Visible en pantalla de bloqueo.
  - Sin sonido, vibración ni luces (modo silencioso).

- **AndroidManifest.xml**:
  - Agregado `android:stopWithTask="false"` al servicio de Notifee.
  - Esto previene que el servicio se detenga si el usuario cierra la app desde recientes.

- **Comportamiento Garantizado**:
  ✅ **NO** se puede deslizar para eliminar.
  ✅ **NO** tiene botón de cerrar (X).
  ✅ **Persiste** al limpiar todas las notificaciones.
  ✅ **Solo se elimina** cuando `modoCadete = false` en base de datos.
  ✅ **Sobrevive** a limpieza de recientes (app sigue en background).

- **Casos Edge Manejados**:
  - **Usuario limpia notificaciones**: La del cadete permanece.
  - **Usuario toca notificación**: Abre la app pero no la elimina.
  - **Usuario fuerza cierre de app**: El servicio se reinicia automáticamente (configuración de `stopWithTask="false"`).
  - **Batería baja**: Android respeta servicios foreground con notificación visible.

- **Testing Exhaustivo**:
  ```bash
  # 1. Intentar deslizar notificación → debe fallar
  # 2. Limpiar todas las notificaciones → debe permanecer
  # 3. Tocar notificación → abre app pero no desaparece
  # 4. Cerrar app desde recientes → servicio continúa
  # 5. Desactivar modoCadete → notificación desaparece correctamente
  ```

- **Diferencias con Notificaciones Normales**:
  | Aspecto | Notificación Normal | Notificación Foreground Service |
  |---------|---------------------|----------------------------------|
  | **Deslizable** | Sí | NO ✅ |
  | **Botón cerrar** | Sí | NO ✅ |
  | **Timeout** | Configurable | Sin límite ✅ |
  | **Prioridad** | Normal/Alta | Máxima ✅ |
  | **Limpiable** | Sí | NO ✅ |
  | **Visible en lockscreen** | Opcional | Siempre ✅ |

- **Requisitos de Android**:
  - **API 26+** (Android 8.0+): Canales de notificación obligatorios.
  - **API 29+** (Android 10+): `foregroundServiceType` obligatorio.
  - **API 33+** (Android 13+): Permiso `POST_NOTIFICATIONS` obligatorio.

- **Logs de Depuración**:
  ```javascript
  console.log('✅ [Notificación Cadete] Actualizada correctamente (persistente)');
  // Confirma que la notificación tiene ongoing=true y asForegroundService=true
  ```

- **Mejoras Futuras**:
  - **Botón de acción "Pausar"**: Permitir al cadete pausar temporalmente sin desactivar completamente.
  - **Contador de tiempo**: Mostrar "Activo desde hace 2h 30m" en el cuerpo de la notificación.
  - **Estadísticas en tiempo real**: "3 pedidos completados hoy" en la notificación expandida.

- **Troubleshooting Común**:
  - **Notificación sigue siendo deslizable**: Verificar que `ongoing: true` esté presente y que se haya limpiado la caché (`./gradlew clean`).
  - **Servicio se detiene al cerrar app**: Confirmar `android:stopWithTask="false"` en AndroidManifest.xml.
  - **Notificación desaparece en modo ahorro de batería**: Pedir al usuario que excluya la app de restricciones de batería.

- **Lecciones Aprendidas**:
  - **`ongoing: true` es LA CLAVE**: Sin este flag, todas las demás configuraciones no importan.
  - **`autoCancel: false` es crítico**: Por defecto Android cancela notificaciones al tocarlas.
  - **`stopWithTask="false"` mantiene el servicio vivo**: Incluso si el usuario mata la app desde recientes.
  - **Canales de notificación son INMUTABLES**: Una vez creados, no se pueden modificar programáticamente (el usuario debe borrarlos desde Settings).
  - **Testing en dispositivos reales**: Emuladores no replican fielmente el comportamiento de servicios foreground.

- **Archivos Modificados**:
  - `NotificacionAndroidForeground.js`: Agregadas props `ongoing`, `autoCancel`, `timeoutAfter`, `pressAction`.
  - `utils/notificationChannels.js`: Sin cambios (ya tenía configuración correcta).
  - `android/app/src/main/AndroidManifest.xml`: Agregado `android:stopWithTask="false"` al servicio de Notifee.

- **Próximos Pasos**:
  - Validar en múltiples versiones de Android (8.0, 10, 12, 13, 14).
  - Agregar UI para mostrar estado del servicio en perfil del cadete.
  - Implementar métricas de uptime del servicio.
  - Documentar en guía de usuario cómo funciona el modo cadete.

---

## Resumen técnico – “Gate” de envío de ubicación por modoCadete (Android Service + endpoint booleano)
- Se integró el endpoint `POST /api/cadete/isActive` en `MyTrackingService` para decidir si se envía ubicación:
  - El servicio sigue corriendo con el interval configurado (cada ~20s).
  - En cada callback de ubicación, primero se consulta el backend y solo si `active === true` se llama a `POST /api/location`.
- Patrón aplicado: endpoint booleano “simple” (siempre responde `active: true|false`) reduce manejo de errores en cliente y evita lógica compleja.
- Se centralizaron URLs (`BASE_URL`, `LOCATION_URL`, `CADETE_ACTIVE_URL`) para facilitar futuros cambios de entorno (dev/staging/prod) sin tocar la lógica.
- Política de seguridad aplicada en cliente: si falla el check de `isActive` (timeout, error de parseo, HTTP != 2xx) → **no** se envía ubicación (fail-closed).

### Mejoras recomendadas
- Evitar crear `newSingleThreadExecutor()` por evento: idealmente reutilizar un `ExecutorService` singleton del servicio para no generar threads repetidos.
- Optimizar tráfico: cachear `active` por un TTL corto (ej. 30–60s) para no golpear el servidor en cada tick.
- Seguridad: autenticar requests (token/HMAC) para que `userId` no sea spoofeable desde clientes externos.
- Observabilidad: loggear el `code` y body de respuesta solo en debug para evitar ruido en producción.

---

## Resumen técnico – Sistema de Notificaciones Push Unificado (Main.js Architecture)
- **Problema Identificado**: El sistema de notificaciones estaba implementado en App.js, pero este componente NO se renderiza cuando el usuario está en modo cadete (`modoCadete: true`) o modo empresa (`modoEmpresa: true`), causando que las notificaciones no funcionaran en esos flujos.

- **Solución Arquitectural**:
  - **Relocalización a Main.js**: Se movió toda la lógica de notificaciones push desde App.js a Main.js, que es el componente raíz que SIEMPRE se renderiza independientemente del estado del usuario.
  - **Cobertura Universal**: Main.js renderiza condicionalmente App, CadeteNavigator, EmpresaNavigator o Loguin, garantizando que los listeners de notificaciones estén activos en cualquier flujo de navegación.

- **Componentes del Sistema de Notificaciones**:
  1. **registerPushTokenForUser(userId, token)**: Registra el token FCM del usuario en el backend via Meteor.call('push.registerToken').
  2. **displayLocalNotification(remoteMessage, options)**: Muestra notificación local con Notifee, incrementa badge automáticamente y opcionalmente muestra Alert.
  3. **requestPermissionsIfNeeded()**: Solicita permisos de notificaciones según plataforma (iOS: messaging().requestPermission, Android: POST_NOTIFICATIONS).

- **Listeners de Firebase Messaging Implementados**:
  ```javascript
  // 1. Token inicial y registro
  messaging().getToken() → registerPushTokenForUser()
  
  // 2. Refresh de token
  messaging().onTokenRefresh() → registerPushTokenForUser()
  
  // 3. Notificaciones en foreground
  messaging().onMessage() → displayLocalNotification()
  
  // 4. App abierto desde notificación (background)
  messaging().onNotificationOpenedApp() → badgeManager.reset()
  
  // 5. App abierto desde notificación (cerrada)
  messaging().getInitialNotification() → badgeManager.reset()
  ```

- **Sistema de Badge Profesional Integrado**:
  - **Reset automático**: Badge se resetea en 3 momentos clave:
    1. `componentDidMount` de Main.js (app abierta).
    2. AppState cambia a 'active' (app vuelve de background).
    3. Usuario abre app desde notificación (tap en notificación).
  - **Incremento automático**: Badge se incrementa en `displayLocalNotification` para todas las notificaciones recibidas.
  - **Gestión centralizada**: Uso del singleton `badgeManager` de PushMessaging.tsx para evitar inconsistencias.

- **Lifecycle Management**:
  - **componentDidMount**:
    - Verificación de permisos del sistema.
    - Reset inicial de badge.
    - Solicitud de permisos de notificaciones.
    - Registro de token FCM.
    - Setup de todos los listeners de Firebase Messaging.
    - Setup del listener de AppState.
  
  - **componentWillUnmount**:
    - Limpieza de `appStateSubscription`.
    - Limpieza de `unsubscribeTokenRefresh`.
    - Limpieza de `unsubscribeForeground`.
    - Limpieza de `unsubscribeNotificationOpened`.
    - Log de confirmación de limpieza exitosa.

- **Manejo de Notificaciones con Notifee**:
  - **Carga segura**: `require('@notifee/react-native')` con try-catch para evitar crashes si la librería no está instalada.
  - **Canal de notificación**: Se crea canal 'default' con nombre 'General' e importancia HIGH (4).
  - **Configuración Android**: `channelId`, `smallIcon: 'ic_launcher'`, `pressAction: { id: 'default' }`.
  - **Configuración iOS**: `foregroundPresentationOptions` con alert/badge/sound activados.

- **Integración con AppState API**:
  ```javascript
  AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      badgeManager.reset(); // Reset badge cuando app vuelve a foreground
    }
  });
  ```

- **Estructura de Dependencias**:
  ```javascript
  import messaging from '@react-native-firebase/messaging';
  import { badgeManager } from './services/notifications/PushMessaging';
  import { AppState, Alert, PermissionsAndroid } from 'react-native';
  
  let NotifeeLib = null; // Carga segura con try-catch
  ```

- **Casos Edge Manejados**:
  - **Usuario no autenticado**: No se registra token hasta que exista `Meteor.userId()`.
  - **Token FCM no disponible**: Se loggea warning pero no bloquea el flujo.
  - **Notifee no instalado**: Se detecta con try-catch y se loggea warning.
  - **Permisos denegados**: Se solicitan pero no se bloquea el acceso a la app.
  - **Listeners duplicados**: Se guardan referencias en `this.unsubscribe*` para limpieza correcta.

- **Ventajas de la Arquitectura en Main.js**:
  ✅ **Cobertura universal**: Funciona en App, CadeteNavigator, EmpresaNavigator y Loguin.
  ✅ **Single source of truth**: Un solo lugar para toda la lógica de notificaciones.
  ✅ **Lifecycle garantizado**: Main.js se monta una sola vez y persiste toda la sesión.
  ✅ **Badge consistente**: Reset y update funcionan en todos los flujos.
  ✅ **Listeners activos**: No se pierden notificaciones por cambios de navegación.

- **Testing Recomendado**:
  ```bash
  # 1. Usuario normal (App.js renderizado)
  - Recibir notificación en foreground → debe mostrar Alert y notificación local
  - Tocar notificación → debe abrir app y resetear badge
  - Abrir app → badge debe resetearse a 0
  
  # 2. Usuario cadete (CadeteNavigator renderizado)
  - Verificar que listeners de notificaciones estén activos
  - Recibir notificación mientras está en modo cadete
  - Validar que badge se incremente correctamente
  
  # 3. Usuario empresa (EmpresaNavigator renderizado)
  - Validar que token FCM se registre correctamente
  - Verificar que AppState listener funcione
  - Tocar notificación y verificar navegación
  
  # 4. App en background
  - Recibir múltiples notificaciones → badge debe acumular
  - Volver a app → badge debe resetearse
  - Tocar notificación específica → debe resetear badge
  
  # 5. App cerrada (killed)
  - Recibir notificación → debe aparecer en system tray
  - Tocar notificación → debe abrir app y resetear badge
  - Verificar que getInitialNotification detecte la notificación
  ```

- **Consideraciones de Seguridad**:
  - **Token FCM sensible**: Se envía a backend via Meteor.call (canal seguro con DDP).
  - **Validación de userId**: Backend debe validar que el token se registre solo para el usuario autenticado.
  - **Permisos POST_NOTIFICATIONS**: Solo se solicitan en Android 13+ (API 33+).
  - **Data payload**: Notificaciones pueden contener data sensible, validar en backend antes de enviar.

- **Troubleshooting Común**:
  - **Notificaciones no llegan**: Verificar que token FCM esté registrado en backend y que Firebase Console tenga configuración correcta.
  - **Badge no se actualiza**: Confirmar que badgeManager.increment() se llama en displayLocalNotification y que badgeManager.reset() se ejecuta en AppState active.
  - **App crashea al recibir notificación**: Verificar que Notifee esté instalado correctamente y que el canal de notificación exista.
  - **Listeners no se ejecutan**: Confirmar que Main.js se esté montando correctamente y que los listeners se estén registrando en componentDidMount.

- **Mejoras Futuras**:
  - **Notificaciones personalizadas por tipo**: Diferentes canales/íconos según tipo de notificación (mensaje, pedido, sistema).
  - **Deep linking**: Navegar a pantalla específica según data de la notificación.
  - **Action buttons**: Botones de acción rápida en notificaciones (Responder, Ver, Ignorar).
  - **Scheduled notifications**: Programar notificaciones locales para recordatorios.
  - **Analytics**: Trackear tasa de apertura de notificaciones y engagement.
  - **A/B testing**: Probar diferentes formatos de notificaciones para maximizar engagement.

- **Lecciones Aprendidas**:
  - **Arquitectura de componentes**: Servicios globales (notificaciones, analytics) deben vivir en el componente raíz más alto, no en componentes condicionales.
  - **Navegación condicional**: En apps con múltiples flujos de navegación (normal/cadete/empresa), identificar el componente que se renderiza en TODOS los casos.
  - **Lifecycle hooks**: componentDidMount y componentWillUnmount son críticos para setup/cleanup de listeners.
  - **Badge management**: Resetear badge en múltiples puntos (app open, foreground, notification tap) garantiza experiencia consistente.
  - **Defensive programming**: Try-catch al cargar librerías opcionales (Notifee) evita crashes en entornos sin la dependencia instalada.
  - **Prevención de listeners duplicados**: Usar banderas (`notificationListenersRegistered`) para evitar registros múltiples cuando el componente se monta más de una vez.

- **Archivos Modificados**:
  - **Main.js**: Agregadas 3 funciones helper (registerPushTokenForUser, displayLocalNotification, requestPermissionsIfNeeded) y modificados componentDidMount/componentWillUnmount con lógica completa de notificaciones.
  - **App.js**: Eliminada toda la lógica de notificaciones (imports, funciones helper, listeners y useEffect) - ahora Main.js maneja todo el sistema de notificaciones de forma centralizada.

- **Próximos Pasos**:
  - Validar que las notificaciones funcionen correctamente en los 3 modos (App, Cadete, Empresa).
  - Implementar deep linking para navegar a pantallas específicas desde notificaciones.
  - Agregar analytics para trackear engagement con notificaciones.
  - Documentar en README.md el flujo completo de notificaciones push.
  - Tests e2e del sistema completo de notificaciones en diferentes estados de app.

  ---

  Resumen técnico – PermissionsGate (Ribbon "APROBADO" estático + overlay)
  - Problema: el ribbon no se veía tras moverlo, porque quedó renderizado dentro del `track` (contenedor horizontal con ancho `screenWidth * steps.length`). Al estar `position: 'absolute'` relativo al `track`, el `right: 0` lo ubicaba al extremo derecho del carrusel (fuera del viewport) y parecía “desaparecido”.
  - Solución aplicada en [components/permissions/PermissionsGate.jsx](components/permissions/PermissionsGate.jsx):
    - Se movió el ribbon fuera del `track` y se renderiza como overlay directo dentro del `viewport` (hermano del `track`). Así queda estático y no se desplaza con el swipe.
    - Se mantuvo la lógica de visibilidad por estado del step usando `ribbonOpacity` animada (fade in/out) según `current?.status === 'granted'`.
    - Se reforzó stacking en Android agregando `elevation` en `ribbonWrapper` además de `zIndex`, para evitar que el track u otros overlays lo tapen.
  - Lección: en carruseles/track horizontales, cualquier elemento `absolute` dentro del track se posiciona respecto al ancho total, no del viewport. Overlays (badges/ribbons/flechas) deben ser hijos del viewport (contenedor visible) para quedar fijos.

  Notas adicionales – Ajuste de tamaño del Ribbon
  - Para agrandar el ribbon sin afectar el layout del slide: ajustar únicamente estilos de `ribbonWrapper` (área de recorte), `ribbon` (ancho/offsets/padding) y `ribbonText` (fontSize), manteniéndolo como overlay con `pointerEvents="none"`.
  - Mantener `zIndex` + `elevation` en el wrapper para evitar que el `track` o overlays (flechas) lo tapen en Android.

  Resumen técnico – PermissionsGate (Paleta de colores + ribbon sincronizado)
  - Se añadió una paleta de colores “elegante” y determinística para iconos de permisos, evitando que todos caigan en el mismo color por defecto.
  - Se centralizó la decisión del color por step en una función (`getStepThemeColor(step, stepIndex)`):
    - Respeta `step.iconColor` si viene definido desde el origen de datos.
    - Si no existe, asigna un color estable desde una paleta en base a `stepIndex` y un pequeño seed por `step.id`.
  - El ribbon “APROBADO” ahora usa exactamente el mismo color del icono del permiso actual (`currentThemeColor`), manteniendo la lógica de visibilidad por `status === 'granted'`.

  Resumen técnico – PermissionsGate (Botón de solicitar permiso)
  - Bug: el botón principal no aparecía cuando el permiso estaba `denied`/`unavailable` porque `showPrimary` solo se activaba para `blocked`.
  - Solución: `showPrimary` ahora depende de `stepIndex === index && !isGranted` (y que exista `step.onRequest`), manteniendo:
    - Label: `"Actualizar estado"` si está `blocked`, si no `step.primaryText || 'Continuar'`.
    - Botón de Ajustes solo para `blocked`.
  - Lección: en flujos de permisos, `blocked` es un caso especial (requiere ajustes), pero `denied` también debe mostrar CTA de solicitud.

  Resumen técnico – ProxyVPNPackagesHorizontal (Eliminar “elevación” entre secciones)
  - Problema: se notaba una separación/sombra antes y después del bloque de paquetes Proxy/VPN por usar `Surface` con elevación por defecto.
  - Solución en [components/proxyVPN/ProxyVPNPackagesHorizontal.jsx](components/proxyVPN/ProxyVPNPackagesHorizontal.jsx):
    - Se forzó `elevation={0}`.
    - Se alinea el `backgroundColor` con `theme.colors.background` para evitar bordes/contrastes.
  - Lección: en React Native Paper, `Surface` puede introducir sombra/elevación visual; si se necesita un contenedor “plano”, usar `elevation={0}` o reemplazar por `View`.

  Resumen técnico – ScrollView (Eliminar “pull-down gap” / overscroll)
  - Problema: al deslizar hacia abajo en la parte superior del contenido se veía una separación/hueco entre el componente superior y el scroll (efecto bounce/overscroll).
  - Solución en [components/Main/MenuPrincipal.jsx](components/Main/MenuPrincipal.jsx):
    - iOS: `bounces={false}` y `alwaysBounceVertical={false}`.
    - Android: `overScrollMode="never"`.
  - Lección: si se quiere evitar el “rubber band” visual sin deshabilitar el scroll normal, hay que desactivar el overscroll por plataforma (no necesariamente `scrollEnabled={false}`).

  Resumen técnico – FlatList horizontal (Sombras recortadas)
  - Problema: en listas horizontales, las cards con `elevation` pueden verse “cortadas” por abajo si no hay padding vertical en el `contentContainerStyle` (especialmente cuando los items tienen `marginBottom: 0`).
  - Solución en [components/proxyVPN/ProxyVPNPackagesHorizontal.jsx](components/proxyVPN/ProxyVPNPackagesHorizontal.jsx):
    - Añadir `paddingTop/paddingBottom` en `flatListContent` para dar “aire” a la sombra inferior.
  - Lección: cuando una card tiene sombra, el contenedor debe reservar espacio extra; preferir padding del `FlatList` antes que alterar el layout interno de la card.