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
