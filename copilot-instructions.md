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
