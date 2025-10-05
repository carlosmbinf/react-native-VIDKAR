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
