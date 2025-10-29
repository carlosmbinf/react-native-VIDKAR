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




// ...existing content...

---

Corrección técnica – Registro del método messages.send y saneamiento del payload
- Problema: El frontend llamaba Meteor.call('messages.send', ...) pero el backend no tenía el método cargado (Method not found).
- Solución backend:
  - server/main.js ahora importa './metodos/mensajeriaPush' para registrar los métodos push.registerToken, push.unregisterToken y messages.send durante el arranque de Meteor.
- Mejora frontend (PushMessaging.tsx → sendMessage):
  - Normalización del payload: se fuerzan title/body a string y se añaden toUserId/fromUserId dentro de data además de los campos principales.
  - Manejo de error explícito para “Method not found” con log guía para revisar el import en server/main.js.
- Recomendaciones:
  - Confirmar que el proyecto Meteor tenga instalada la dependencia firebase-admin y las credenciales (FIREBASE_SERVICE_ACCOUNT o GOOGLE_APPLICATION_CREDENTIALS).
  - Si el proyecto no usa TypeScript en servidor, mantener mensajeriaPush.tsx importado desde server/main.js o migrarlo a .js según la configuración del build.

---

Actualización técnica – Registro de token FCM con usuario (frontend -> backend)
- Objetivo: asegurar que cada token FCM quede asociado al Meteor.userId en el backend (push.registerToken) y se actualice ante cambios.
- Cambios en App.js:
  - Se importa registerPushTokenForUser del servicio centralizado.
  - iOS/Android: tras obtener el token (requestPermission/getToken), se llama await registerPushTokenForUser(Meteor.userId()) para registrar en backend.
  - Token refresh: messaging().onTokenRefresh invoca registerPushTokenForUser para mantener sincronizada la asociación userId <-> token.
- Consideraciones:
  - registerPushTokenForUser ya encapsula Meteor.call('push.registerToken', { userId, token, platform, updatedAt }).
  - Si no hay sesión activa en el momento del arranque, registrar tras el login para evitar tokens huérfanos.
  - En logout, la app debe llamar push.unregisterToken para eliminar la asociación del dispositivo (ya soportado en servicio).

---

Resumen técnico – Render condicional de SendPushMessageCard por tokens push
- Objetivo: Mostrar el componente SendPushMessageCard únicamente cuando el usuario destino tiene tokens push registrados.
- Frontend (React Native, Meteor RN):
  - Se añadió estado en UserDetails: hasPushTokens, tokenCount, loadingPushTokens y un flag de ciclo de vida _isMounted para evitar setState tras desmontar.
  - Se implementó el método checkPushTokens(userId) que invoca Meteor.call('push.hasTokens', { userId }) y actualiza el estado.
  - Se invoca checkPushTokens en:
    - componentDidMount si existe item._id.
    - componentDidUpdate cuando cambie item._id o el refreshKey (pull-to-refresh).
  - Renderizado: SendPushMessageCard ahora se muestra solo si item?._id && hasPushTokens es true.
  - UX: En caso de error o ausencia de tokens, el componente no se muestra (fallback seguro, sin alertas intrusivas).

- Backend (consideraciones):
  - Método utilizado: push.hasTokens(args: { userId: string }) que retorna { hasTokens, tokenCount, userId }.
  - Asegurar validación y rate limiting (ej. ddp-rate-limiter) para evitar abuso del método desde el cliente.
  - Índice sugerido: índice en PushTokens { userId: 1 } para consultas count() eficientes.
  - Control de acceso: el método no expone datos sensibles; mantener checks y evitar filtrar tokens concretos al cliente.

- Calidad y mantenibilidad:
  - Se evitó lógica en render y se centralizó en un método reutilizable.
  - Se agregó protección _isMounted para prevenir memory leaks.
  - Se reconsulta al hacer pull-to-refresh para reflejar cambios recientes en tokens.

- Próximas mejoras:
  - Añadir un pequeño indicador visual o hint en UI cuando no existan tokens (opcional, según requisitos de UX).
  - Cache con TTL corto del estado de tokens por usuario si se detecta alto volumen de llamadas.
  - Tests: unit test del método checkPushTokens (mocks de Meteor.call) y pruebas e2e del flujo con/si tokens.

---

Resumen técnico – Manejo de Teclado en React Native (KeyboardAvoidingView)
- Problema identificado: En componentes con TextInput (UsersHome, ChatUsersHome), cuando aparece el teclado en dispositivos móviles, este cubría los campos de entrada, impidiendo al usuario ver lo que escribía.

- Solución implementada:
  - Importación de `KeyboardAvoidingView` desde 'react-native' en ambos componentes.
  - Envolver el TextInput del Banner de filtro con `KeyboardAvoidingView` configurado con `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` para ajuste automático según plataforma.
  - Configuración del `ScrollView` principal con propiedades específicas para manejo de teclado:
    - `keyboardShouldPersistTaps="handled"`: Permite interacción con elementos mientras el teclado está visible, mejorando UX al permitir tocar botones sin cerrar el teclado primero.
    - `keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}`: Controla cómo se oculta el teclado al hacer scroll (interactivo en iOS, al arrastrar en Android).

- Consideraciones técnicas:
  - El `behavior` de KeyboardAvoidingView debe ajustarse según la plataforma: iOS responde mejor a 'padding', Android a 'height'.
  - En componentes con múltiples ScrollViews anidados, asegurar que solo el ScrollView principal tenga las configuraciones de teclado.
  - El `autoFocus={true}` en TextInput debe usarse con precaución en formularios con múltiples campos para evitar comportamientos inesperados.
  - En banners o modales con TextInput, siempre envolver con KeyboardAvoidingView para garantizar visibilidad del input.

- Componentes afectados:
  - UsersHome.js: Lista de usuarios con filtro de búsqueda.
  - ChatUsersHome.js: Lista de conversaciones con filtro de búsqueda.

- Patrón replicable:
  - Este patrón debe aplicarse en cualquier componente que contenga TextInput dentro de ScrollView/FlatList/SectionList.
  - Especialmente crítico en pantallas de formularios, búsquedas y chats donde la visibilidad del input es esencial.

- Mejoras futuras sugeridas:
  - Implementar `KeyboardAwareScrollView` de la librería 'react-native-keyboard-aware-scroll-view' para casos más complejos con múltiples inputs.
  - Considerar agregar botón "Done/Listo" en teclado iOS para mejor control de cierre.
  - Implementar scroll automático al input activo en formularios largos.
  - Agregar animaciones suaves al aparecer/desaparecer el teclado para mejor feedback visual.

- Testing recomendado:
  - Probar en dispositivos físicos iOS y Android (el comportamiento en simuladores puede diferir).
  - Verificar en diferentes tamaños de pantalla (pequeñas, medianas, grandes).
  - Probar con teclados de terceros que pueden tener alturas diferentes.
  - Validar comportamiento en orientación horizontal (landscape).

---

Resumen técnico – Corrección avanzada de KeyboardAvoidingView en MensajesHome (Android + iOS)
- Problema persistente: Después de la implementación inicial de KeyboardAvoidingView, el input seguía quedando oculto detrás del teclado, especialmente en Android.

- Análisis profundo del problema:
  - `behavior='height'` en Android no siempre funciona debido a diferencias en cómo Android maneja el `windowSoftInputMode`.
  - El `KeyboardAvoidingView` nativo de React Native tiene limitaciones conocidas en Android con diferentes configuraciones de manifest.
  - Se necesita un enfoque híbrido: KeyboardAvoidingView para iOS + listeners manuales para Android.

- Solución robusta implementada:
  - Listeners del teclado nativos:
    - iOS: `keyboardWillShow` y `keyboardWillHide` (eventos "will" para animaciones suaves).
    - Android: `keyboardDidShow` y `keyboardDidHide` (eventos "did" porque Android no tiene "will").
  - Estado `keyboardHeight` que captura la altura exacta del teclado desde el evento nativo.
  - Ajuste dinámico con `marginBottom` en Android: se aplica `marginBottom: keyboardHeight` al contenedor cuando el teclado está visible.
  - KeyboardAvoidingView se mantiene para iOS con `behavior='padding'`.
  - Limpieza apropiada de listeners en `componentWillUnmount` para prevenir memory leaks.

- Estructura mejorada:
  ```jsx
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.contentContainer, Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight }]}>
      <FlatList inverted ... />
      <InputToolbar />
    </View>
  </KeyboardAvoidingView>
  ```

- Consideraciones técnicas críticas:
  - En Android, el `windowSoftInputMode` en AndroidManifest.xml debe estar configurado como `adjustResize` o `adjustPan`. Si está en `adjustNothing`, ninguna solución JavaScript funcionará.
  - Los eventos del teclado proporcionan `endCoordinates.height` que es la altura exacta del teclado en píxeles.
  - En iOS, los eventos "will" permiten animaciones sincronizadas con la aparición del teclado.
  - En Android, los eventos "did" son instantáneos pero menos fluidos visualmente.
  - El `backgroundColor: '#FFFFFF'` en `inputContainer` es crucial para evitar transparencias que hacen que el input parezca oculto.

- Solución de problemas comunes:
  - Si el input sigue oculto en Android: Verificar `android:windowSoftInputMode="adjustResize"` en AndroidManifest.xml.
  - Si hay doble ajuste (input muy arriba): Remover `behavior` en Android (ya implementado con `undefined`).
  - Si el teclado cubre el input en tablets: Ajustar el offset considerando barras de sistema y headers dinámicamente.
  - Si hay lag en la animación: Usar `Animated.View` con `Animated.timing` para transiciones suaves (opcional, siguiente iteración).

- Mejoras adicionales implementadas:
  - Limpieza segura de todos los listeners en unmount (4 listeners: 2 para iOS, 2 para Android).
  - Estructura de contenedor adicional (`contentContainer`) para aplicar estilos sin afectar el KeyboardAvoidingView.
  - Background color explícito en input toolbar para garantizar opacidad.

- Testing exhaustivo requerido:
  - Probar en Android con diferentes versiones (API 21-34) ya que el comportamiento del teclado varía.
  - Validar en dispositivos con barras de navegación on-screen vs físicas.
  - Probar con teclados de terceros (Gboard, SwiftKey) que pueden tener alturas diferentes.
  - Verificar en tablets donde la altura del teclado puede ser menor.
  - Probar en modo split-screen (multitarea) donde las dimensiones cambian dinámicamente.

- Alternativa futura si persisten problemas:
  - Considerar librería `react-native-keyboard-aware-scroll-view` que maneja estos casos automáticamente.
  - Implementar `android:windowSoftInputMode="adjustPan"` si adjustResize no es viable por diseño.
  - Usar `react-native-keyboard-controller` para control más granular en casos edge.

- Documentación para AndroidManifest.xml:
  ```xml
  <activity
    android:name=".MainActivity"
    android:windowSoftInputMode="adjustResize">
  </activity>
  ```

- Patrón replicable para otros chats:
  - Siempre usar listeners del teclado en Android para ajustes precisos.
  - Mantener KeyboardAvoidingView para iOS por su mejor soporte nativo.
  - Aplicar `marginBottom` dinámico solo en Android, no en iOS.
  - Limpiar listeners para evitar memory leaks.
  - Background color en input toolbar obligatorio.

---

Resumen técnico – Compatibilidad de teclado en MensajesHome (Android)
- Contexto: El input de mensajes quedaba detrás del teclado en Android. Antes se movía hacia arriba.
- Causa raíz: KeyboardAvoidingView no tenía behavior en Android y el ajuste de altura (marginBottom con keyboardHeight) solo se aplicaba a la lista, no al contenedor del composer.
- Cambios aplicados:
  - Se configuró KeyboardAvoidingView con behavior="height" en Android (iOS mantiene 'padding').
  - Se añadió marginBottom dinámico al contenedor del composer basado en keyboardHeight para subir el input sobre el teclado en Android.
- Consideraciones:
  - Verificar en AndroidManifest.xml que MainActivity use android:windowSoftInputMode="adjustResize" para que el teclado reduzca el viewport correctamente.
  - Mantener los listeners de teclado (keyboardDidShow/keyboardDidHide en Android) para medir endCoordinates.height y evitar solapamiento.
- Recomendaciones futuras:
  - Unificar el uso de un solo composer y estado (messageText) para evitar duplicidades.
  - Evaluar Animated para transiciones suaves del offset del teclado.
  - Alternativa: react-native-keyboard-aware-scroll-view si se complica el manejo manual.

---

Resumen técnico – Manejo de teclado en Dialog de React Native Paper (CubaCelCard)
- Problema identificado: En el componente CubaCelCard, el Dialog con formularios de recarga quedaba estático cuando aparecía el teclado, ocultando los inputs inferiores y botones de acción detrás del teclado.

- Diferencias con otros componentes:
  - Dialog de React Native Paper no es una pantalla completa, sino un modal que flota sobre el contenido.
  - KeyboardAvoidingView dentro de Dialog tiene comportamiento diferente que en pantallas completas.
  - Los Dialog tienen altura fija/máxima que complica el ajuste automático.

- Solución implementada:
  - Listeners del teclado usando hooks de React (useEffect):
    - iOS: `keyboardWillShow` y `keyboardWillHide` (eventos "will" para animaciones suaves).
    - Android: `keyboardDidShow` y `keyboardDidHide` (eventos "did" porque Android no tiene "will").
  - Estado `keyboardHeight` que captura la altura exacta del teclado desde el evento nativo.
  - Ajuste dinámico con `marginBottom` en Android: se aplica `marginBottom: keyboardHeight` al contenedor cuando el teclado está visible.
  - KeyboardAvoidingView se mantiene para iOS con `behavior='padding'`.
  - Limpieza apropiada de listeners en `componentWillUnmount` para prevenir memory leaks.

- Estructura mejorada:
  ```jsx
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.contentContainer, Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight }]}>
      <FlatList inverted ... />
      <InputToolbar />
    </View>
  </KeyboardAvoidingView>
  ```

- Consideraciones técnicas críticas:
  - En Android, el `windowSoftInputMode` en AndroidManifest.xml debe estar configurado como `adjustResize` o `adjustPan`. Si está en `adjustNothing`, ninguna solución JavaScript funcionará.
  - Los eventos del teclado proporcionan `endCoordinates.height` que es la altura exacta del teclado en píxeles.
  - En iOS, los eventos "will" permiten animaciones sincronizadas con la aparición del teclado.
  - En Android, los eventos "did" son instantáneos pero menos fluidos visualmente.
  - El `backgroundColor: '#FFFFFF'` en `inputContainer` es crucial para evitar transparencias que hacen que el input parezca oculto.

- Solución de problemas comunes:
  - Si el input sigue oculto en Android: Verificar `android:windowSoftInputMode="adjustResize"` en AndroidManifest.xml.
  - Si hay doble ajuste (input muy arriba): Remover `behavior` en Android (ya implementado con `undefined`).
  - Si el teclado cubre el input en tablets: Ajustar el offset considerando barras de sistema y headers dinámicamente.
  - Si hay lag en la animación: Usar `Animated.View` con `Animated.timing` para transiciones suaves (opcional, siguiente iteración).

- Mejoras adicionales implementadas:
  - Limpieza segura de todos los listeners en unmount (4 listeners: 2 para iOS, 2 para Android).
  - Estructura de contenedor adicional (`contentContainer`) para aplicar estilos sin afectar el KeyboardAvoidingView.
  - Background color explícito en input toolbar para garantizar opacidad.

- Testing exhaustivo requerido:
  - Probar en Android con diferentes versiones (API 21-34) ya que el comportamiento del teclado varía.
  - Validar en dispositivos con barras de navegación on-screen vs físicas.
  - Probar con teclados de terceros (Gboard, SwiftKey) que pueden tener alturas diferentes.
  - Verificar en tablets donde la altura del teclado puede ser menor.
  - Probar en modo split-screen (multitarea) donde las dimensiones cambian dinámicamente.

- Alternativa futura si persisten problemas:
  - Considerar librería `react-native-keyboard-aware-scroll-view` que maneja estos casos automáticamente.
  - Implementar `android:windowSoftInputMode="adjustPan"` si adjustResize no es viable por diseño.
  - Usar `react-native-keyboard-controller` para control más granular en casos edge.

- Documentación para AndroidManifest.xml:
  ```xml
  <activity
    android:name=".MainActivity"
    android:windowSoftInputMode="adjustResize">
  </activity>
  ```

- Patrón replicable para otros chats:
  - Siempre usar listeners del teclado en Android para ajustes precisos.
  - Mantener KeyboardAvoidingView para iOS por su mejor soporte nativo.
  - Aplicar `marginBottom` dinámico solo en Android, no en iOS.
  - Limpiar listeners para evitar memory leaks.
  - Background color en input toolbar obligatorio.

---

Resumen técnico – Corrección RN: “Text strings must be rendered within a <Text> component” en Dialog de TableRecargas
- Causa raíz: se usó el patrón condicional expr && <Componente/> dentro del Dialog, donde expr era un número (length = 0). En RN, renderizar 0 como hijo de un View/Surface rompe con el error “Text strings must be rendered within a <Text> component”.
- Cambio aplicado (frontend RN):
  - En components/cubacel/TableRecargas.jsx, dentro del detalle del Dialog, el render de la sección de “Promociones” fue cambiado de it?.producto?.promotions?.length && <Chip .../> a !!it?.producto?.promotions?.length && <Chip .../> para evitar insertar 0 en el árbol de JSX.
- Buenas prácticas establecidas:
  - Evitar expr && <Componente/> cuando expr pueda ser un número o string; usar !!expr && <Componente/> o (condición ? <Componente/> : null).
  - Añadir regla ESLint recomendada: react-native/no-raw-text para detectar cadenas no envueltas en <Text>.
  - Mantener consistencia en condicionales UI para prevenir render de valores primitivos fuera de <Text>.
- Consideraciones futuras:
  - Revisar otros condicionales similares en la base de código (especialmente longitudes o flags numéricos) para aplicar coerción booleana.
  - Tests de regresión: abrir el Dialog con casos de promociones 0 y >0 para validar la ausencia del error.

---

Resumen técnico – Corrección de envío de mensajes en MensajesHome
- Contexto: Se introdujo un composer moderno que usa state.messageText y un método sendNow que dependía de handlers externos (sendMensaje/handleSendMessage/onSendMessage/props.onSend). Esos handlers ya no estaban presentes, provocando el warning “No hay handler de envío definido...” y evitando el envío.
- Problema raíz: Desacoplamiento del nuevo composer respecto a la lógica de envío vigente (handleSend), la cual opera sobre state.message y gestiona inserción, flags de envío y la llamada a Meteor.call("enviarMensajeDirecto2").
- Solución implementada:
  - Se modificó sendNow para:
    - Validar texto no vacío y respetar isSending.
    - Sincronizar estados transfiriendo messageText -> message antes de invocar handleSend.
    - Reutilizar handleSend (inserción en MensajesCollection, “leído”, autoscroll y llamada a enviarMensajeDirecto2).
    - Limpiar siempre messageText tras el envío.
- Consideraciones técnicas:
  - Se mantuvo la compatibilidad para una futura reintroducción de handlers externos sin romper el flujo actual.
  - Evita dobles envíos verificando isSending.
  - Se deja constancia de que existen dos compositores en el componente (renderInputToolbar y composer moderno). El activo es el moderno; se recomienda una futura refactorización para mantener una sola fuente de verdad del estado (messageText) y eliminar UI/estados duplicados (message/inputHeight).
- Recomendaciones de mejora:
  - Unificar a un único composer y estado (messageText), incorporando el contador de caracteres y animaciones si se desean conservar.
  - Extraer la lógica de envío a un helper (ej. sendMessage(text, toUserId)) para facilitar pruebas y reutilización.
  - Validar en backend reglas de seguridad de inserción y mantener métodos Meteor para mutaciones críticas.
- Fe de cambios:
  - Archivo modificado: components/mensajes/MensajesHome.js
  - Cambio principal: sendNow ahora reutiliza handleSend y sincroniza estados (messageText -> message) para restaurar el envío.

---

Resumen técnico – Reversión controlada del manejo de teclado en MensajesHome (Android)
- Contexto: Antes funcionaba con KeyboardAvoidingView sin behavior en Android y ajuste manual con keyboardHeight. Al cambiar a behavior="height" el input quedó detrás del teclado en ciertos dispositivos.
- Cambios aplicados:
  - Se restauró behavior en Android a undefined y se mantuvo el offset dinámico marginBottom tanto en el contentContainer como en el composer.
  - Se documentó y reforzó android:windowSoftInputMode="adjustResize" en MainActivity para asegurar que el teclado reduzca el viewport.
- Justificación técnica:
  - En Android, KAV con behavior="height" varía según fabricantes y puede no interactuar bien con ciertos layouts. El patrón manual con keyboardHeight + adjustResize es más predecible.
- Recomendaciones:
  - Mantener un único composer (idealmente el moderno) y eliminar el obsoleto para evitar estados duplicados.
  - Si persisten casos edge, evaluar react-native-keyboard-aware-scroll-view o medir insets de safe area para refinar padding inferior.
