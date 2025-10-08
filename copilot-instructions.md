// ...existing content...

---

Resumen técnico – Aprobación/Rechazo de Evidencias (Venta Expandible)
- Mejora UX: Card de evidencias ahora soporta modo colapsado/expandido (estado local expanded). En colapsado se muestran datos clave sin costo de render de imágenes (userId y resumen de recargas).
- Resumen de recargas: Derivado con useMemo filtrando carritos type:"RECARGA"; se limita visualización a 2 ítems + contador (+N más). Evitar recomputar sobre renders.
- Botones de acción a nivel de venta:
  - Aprobar venta: Usa Meteor.call('ventas.aprobarVenta') (ya existente).
  - Rechazar venta: Implementado provisionalmente con VentasRechargeCollection.update (client-side). Recomendación: migrar a Meteor.method con validaciones (rol, estado actual, idempotencia).
- Estados finales manejados: ENTREGADO, PAGADA, COMPLETADA, RECHAZADA -> deshabilitan acciones y muestran badge informativo.
- Auditoría añadida en rechazo: campos rechazadaAt y rechazadaBy. Confirmar índices en backend si se consultará por estos campos.
- Accesibilidad: IconButton con labels chevron-up/down para toggling; agregar testIDs futuros si se automatizan tests E2E.
- Performance: Carga de DrawerBottom y ScrollView sólo cuando expanded === true, reduciendo trabajo inicial (imágenes base64 pesadas).
- Futuras mejoras sugeridas:
  - Reemplazar update directo por Meteor.method('ventas.rechazar', { ventaId, motivo }) con schema SimpleSchema y logging.
  - Añadir campo motivoRechazo (string limitado) y enum de motivos.
  - Integrar control de permisos (solo roles: admin, supervisor).
  - Implementar lazy loading de evidencias (limit + paginación horizontal) si crece el volumen.
  - Cache de miniaturas: almacenar thumbnails en servidor para evitar pasar base64 completo (optimización memoria y tiempo de render).
  - Unificar card en componente reutilizable (SaleEvidenceCard) para otras pantallas.
  - Internacionalización: extraer strings a módulo i18n (aprobada, rechazada, pendiente, etc.).
  - Tests automatizados:
    - Render colapsado vs expandido.
    - Rechazo de venta actualiza estado y deshabilita botones.
    - Aprobar venta requiere al menos una evidencia aprobada.
  - Validar consistencia de flags (aprobado, rechazado, cancelado) y considerar enum explícito en schema backend.

---

Resumen técnico – Card Saldo Disponible Recargas
- Nuevo componente SaldoRecargasCard.jsx (funcional, desacoplado) que consulta dtshop.getBalance.
- Estrategia de refresco: 
  - Auto-poll cada 60s mediante setInterval con cleanup en unmount.
  - Refresco manual: botón (IconButton refresh) y Pull-To-Refresh desde UserDetails incrementando refreshKey.
  - Deducción flexible del monto: se inspeccionan claves balance/available/amount/saldo/availableBalance para robustez ante cambios en la API.
  - Formato numérico localizado (Intl.NumberFormat es-ES, 2 decimales).
  - Muestra:
    - Estado loading con ActivityIndicator.
    - Error (mensaje y pista de reintento).
    - Última hora de actualización (Card.Title subtitle).
    - Countdown de auto-refresh (chip Auto en Ns).
    - Botón Detalle (log consola; preparado para modal futuro).
- UserDetails.js:
  - Añadido estado refreshing + refreshKey y handler onRefresh.
  - Integrado SaldoRecargasCard tras TarjetaDebitoCard conservando consistencia visual (bordes, spacing).
- Performance:
  - Evita llamadas simultáneas usando fetchingRef.
  - Limpieza de intervalos y contadores (sin fugas de memoria).
- Extensibilidad futura:
  - Reemplazar polling por suscripción Meteor publish('dtshopBalance') con invalidación reactiva.
  - Añadir caching con TTL en cliente (AsyncStorage) para modo offline.
  - Mostrar desglose multi-moneda si la API retorna estructura compleja (p.ej. balances[]).
  - Incorporar auditoría (último usuario que forzó la recarga si se hace server-side).
  - Añadir test unitario que simule expiración de 60s y verifique nuevo fetch.
  - Parametrizar intervalo (prop refreshIntervalMs) para entornos de QA.
- Buenas prácticas aplicadas:
  - Separación de parsing numérico (EXTRAER_NUMERO) aislando la lógica.
  - Limpieza sistemática de intervalos (avoid memory leaks).
  - Prevención de estado sobre componente desmontado (mountedRef).
  - Diseño minimalista con jerarquía tipográfica clara (moneda / cifra / meta info).

---

Actualización técnica – SaldoRecargasCard soporte múltiple
- La API dtshop.getBalance retornó array de objetos ({ available, unit, unitType, ... }).
- Se agregó parseBalances para normalizar a lista [{amount, currency, unitType}].
- Lógica de total: si múltiples balances se suma amount y se muestra etiqueta TOTAL; si uno solo se muestra su moneda.
- Render dinámico: chips individuales por cada balance + monto formateado.
- Robustez: EXTRAER_NUMERO permanece reutilizable; parseBalances aísla extensión futura (multi-moneda).
- Estilos: nueva sección balancesRow (flex-wrap) asegurando adaptabilidad en pantallas pequeñas.
- Futuras mejoras:
  - Modal con desglose y fecha valor (si API provee timestamps).
  - Colorear chips según tipo (ej. crédito vs holding).
  - Manejar claves holding / creditLimit para métricas adicionales.
  - Test unitario: mock de array multi-moneda y validación de suma.

---

Optimización técnica – Ciclo de refresco SaldoRecargasCard
- Problemas detectados: cooldown decremental manual propenso a drift; loading manual silencioso; percepción de no actualización.
- Refactor:
  - Reemplazado setInterval(60s) por timeout programado (programarSiguiente) + countdown derivado de nextRefreshAt.
  - Estado nextRefreshAt + cálculo de countdown cada 1s (precisión y menor acoplamiento).
  - Loading siempre true en refresh manual para feedback consistente.
  - Botón refresh muestra progress-clock cuando loading.
  - Reinstalados chips multi-balance (multi-moneda) y formateo Intl para valor principal.
  - Añadido refreshIntervalMs (prop) para tunear en QA / tests.
- Robustez:
  - Limpieza explícita de timeout y countdown en unmount.
  - Prevención de llamadas concurrentes via fetchingRef.
- Extensiones futuras sugeridas:
  - Estrategia de backoff en caso de errores repetidos.
  - Persistencia de último saldo en AsyncStorage (arranque offline).
  - Métrica de latencia (marcar timestamp before/after y mostrar ms en chip opcional debug).

---

Resumen técnico – Mejora cooldown SaldoRecargasCard (gestión de balance recargas)
- Problema detectado: doble intervalo (1s para countdown y 60s para fetch) generaba desfase visual; al llegar a 0 el cooldown podía permanecer así hasta que el otro intervalo ejecutara fetchBalance, dando sensación de bloqueo.
- Refactor: se unificó la lógica en un único intervalo (tick de 1s). Al llegar a 0 se dispara fetchBalance (si no hay uno en curso) y el reset del cooldown ocurre en el finally del fetch.
- Se introdujo constante REFRESH_SECONDS para facilitar ajustes futuros (paginación dinámica, configuración desde backend, A/B testing).
- Eliminado intervalo independiente de 60000ms, reduciendo complejidad y riesgo de memory leaks.

---

Resumen técnico – Mejora UX UserDataCard (Edición de Datos de Usuario)
- Refactor de estado: reemplazo de múltiples useState por un objeto form centralizado y estados errors / feedback / saving para escalabilidad y limpieza.
- Validaciones cliente robustas: username (>=3), email con regex estándar, password (>=8 + mayúscula + minúscula + dígito + símbolo opcional) y confirmación. Preparado para internacionalización futura.
- Guardado inteligente: se agrupan cambios en una única operación Meteor.users.update reduciendo chattiness y condiciones de carrera. Evita actualizaciones redundantes si no hay modificaciones.
- UX mejorada: 
  - Prefill automático al entrar en modo edición.
  - Botón Guardar deshabilitado si no hay cambios o hay errores.
  - Snackbar no intrusivo en lugar de múltiples Alert encadenados (excepto confirmación de cambio de rol).
  - Indicador de fortaleza de contraseña (heurística simple basada en score).
  - Mensajes de error inline bajo cada campo.
  - Reset de estados al cancelar.
- Seguridad UX: confirmación explícita antes de alternar rol. Bloquea cambio de rol si no es super-usuario (placeholder: username === 'carlosmbinf'; recomendar migrar a verificación de roles centralizados).
- Accesibilidad / mantenibilidad:
  - Eliminación de keyboardType="password" (no estándar en RN).
  - Preparado para extraer lógica de validación a un util / hook compartido en futuros formularios.
- Recomendaciones backend:
  - Migrar mutaciones directas Meteor.users.update a Meteor.methods con validación de schema y control de roles.
  - Auditar cambios sensibles (rol, email) y registrar en log de seguridad.
  - Forzar logout siempre que se modifique email o username del usuario activo (ya contemplado).
- Próximas mejoras sugeridas:
  - Integrar librería de i18n para mensajes.
  - Añadir throttle a cambio de rol para evitar spam.
  - Implementar política de contraseñas configurable vía ConfigCollection (minLength, complejidad).
  - Test unitarios (Jest) para validate() y test de integración (Detox) para flujos de edición.
  - Extraer Snackbar global a un provider (Feedback).

---

Corrección técnica – UserDataCard (errores de compilación)
- Errores detectados:
  - Button Guardar cerrado antes de incluir el ícono (ícono quedaba fuera generando layout inválido).
  - Bloque de fortaleza de contraseña con doble <Text> mal anidado produciendo error de sintaxis/JSX.
- Solución:
  - Reestructurado Button envolviendo correctamente <MaterialCommunityIcons />.
  - Consolidado indicador de fortaleza en un único Text.
- Limpieza:
  - Eliminados imports y variables no usados (useColorScheme, Colors, isDarkMode) para reducir warnings y ruido.
- Recomendación:
  - Añadir eslint + plugin react/jsx-no-useless-fragment y validación en CI para prevenir regresiones similares.
  - Evaluar extraer el PasswordStrengthIndicator a componente reutilizable (otro formularios futuros).
- Sin cambios funcionales en lógica de validaciones ni flujo de guardado.

---

Optimización UX – UserDataCard (Avatar, Chips, Secciones y Confirmaciones)
- Identidad visual: Se añadió Avatar dinámico (iniciales + color hash) para rápida identificación. Utilidades hashColor y getInitials reutilizables para otros listados (ej. tablas).
- Organización semántica: Secciones Identidad / Contacto / Rol separadas con micro encabezados y Divider para escaneabilidad y futura inserción de más bloques (2FA, Auditoría, Flags).
- Estado y metadatos: Chips para rol (color role-based), verificación email y fecha de alta (createdAt). Base para añadir chip “Bloqueado” o “2FA” más adelante.
- Resaltado de cambios: outlineColor e ícono contextual (circle-edit-outline) en campos modificados antes de guardar, mejorando visibilidad de dif.
- UX guardado/cancelación: Confirmación al intentar cancelar con cambios pendientes (Alert). Evita pérdida accidental de datos.
- HelperText contextual: Mensajes informativos vs errores diferenciados (type=info/error) mostrando guía de formato antes del error duro.
- Accesibilidad/Test readiness: testID en botones (edit, save, cancel) y card raíz para integrar Detox / Appium sin cambios futuros.
- Rendimiento: Cálculos ligeros (hashColor) locales; costo O(n) corto sobre longitud de username (negligible). No se introducen renders extra condicionales pesados.
- Extensibilidad preparada:
  - formatDate util aislada (reemplazable por dayjs con i18n si se decide).
  - Chips permiten onPress futuro para navegar a auditoría/roles.
  - Estructura facilita incorporar panel lateral (Drawer / Modal) sin reescritura.
- Recomendaciones backend relacionadas:
  - Exponer lastLoginAt (si se registra) para chip de “Último acceso” (monitoring de cuentas inactivas).
  - Añadir campo profile.active o suspended y mostrar chip estado (verde/ámbar/rojo).
- Próximos pasos sugeridos:
  - Extraer PasswordCard a componente <UserPasswordSection />.
  - Implementar provider de Theme tokens para colores de roles centralizados.
  - Añadir animación leve (LayoutAnimation) al entrar/salir modo edición.
  - Telemetría: loggear eventos (user_edit_initiated, user_edit_saved, user_edit_discarded) para métricas UX.
  - Tests: snapshot modo lectura vs edición, verificación de confirmación al cancelar con cambios.
- Nota estilo: Mantener patrón de “micro encabezado + inputs + helper” como estándar para formularios críticos.

---

Optimización UX – PersonalDataCard (Identidad Visual y Completitud)
- Refactor visual: Se introduce barra superior decorativa (accent bar) con color derivado hash del nombre para identidad consistente sin hardcode.
- Avatar: Avatar.Text con iniciales (getInitials) y color estable (hashColor) alineado con patrón ya aplicado en UserDataCard (consistencia transversal).
- Nombre completo: buildFullName concatena firstName/middleName/lastName (fácil de extender). Manejo seguro de falsy values.
- Métrica de completitud: computeCompleteness (% + campos faltantes) preparado para añadir más atributos (phone, country, city) sin tocar el layout principal.
- Chips de estado: 
  - Completo / Incompleto (%).
  - Identificado (solo si firstName y lastName presentes).
- Estructura semántica: Sección de campos con etiqueta fija (ancho 100) + valor flexible, evitando desalineación en pantallas pequeñas.
- Accesibilidad y pruebas: testIDs (personal-data-card, pd-fullname, pd-completeness) para E2E (Detox / Appium).
- Experiencia guiada: HelperText muestra campos faltantes promoviendo acción sin bloquear flujo.
- Extensibilidad futura:
  - Añadir chip País / Teléfono / Documento.
  - Menú contextual (IconButton dots-vertical) para acciones (editar, ver historial, ver auditoría).
  - Unificación de utilidades (hashColor, getInitials) en módulo shared/utils/avatar.tsx.
  - Posible animación (LayoutAnimation) al completar campos.
- Rendimiento: Cálculo O(1) y funciones puras; no introduce renders pesados ni dependencias externas.
- Recomendación backend: Exponer campos estructurados (profile.country, profile.phone) para enriquecer completitud y analíticas de perfil.
- Estándar interno: Reutilizar patrón (accent bar + avatar + chips + sección campos) para otras tarjetas de identidad (ej. Empresa, Comercio, Proveedor).

---

Actualización lógica – PersonalDataCard (Derivación de segundo nombre)
- Requisito: El campo profile.firstName puede contener 1 o 2 nombres separados por espacio (ej. "Juan Carlos"). Ya no se confía en profile.middleName.
- Implementación:
  - Nuevo parseProfileNames(profile): separa firstName en tokens; primer token -> firstGiven; segundo token -> secondGiven (si existe). Si legacy middleName existe y no hay segundo token se usa como fallback.
  - computeCompleteness ahora solo exige firstGiven y lastName (segundo nombre opcional).
  - Campo "Segundo" muestra secondGiven derivado; evita depender de un middleName aislado.
  - buildFullName reemplazado en la práctica por composición dentro de parseProfileNames (first + second + last).
- Beneficios:
  - Reduce inconsistencia de datos (evita divergencia firstName vs middleName).
  - Simplifica migraciones: se puede deprecar middleName sin afectar UI.
  - Compatible con perfiles ya existentes que tuvieran middleName (fallback).
- Consideraciones futuras:
  - Validar en backend normalización: al guardar, si usuario provee segundo nombre podría mantenerse política de almacenar ambos en firstName para compatibilidad.
  - Añadir sanitización (trim múltiple espacios) antes de persistir.
  - Si se incorporan más de 2 nombres (casos compuestos), definir política (ej. solo se consideran los dos primeros).
- Recomendación:
  - Documentar contrato en README interno del modelo User.profile (firstName admite 1-2 tokens).
  - Añadir test unitario parseProfileNames con casos: "", "Juan", "Juan Carlos", "Maria del", legacy middleName.
  - Indizar búsqueda por firstGiven y lastName si se habilitan filtros/queries de directorio de usuarios.

---

Actualización menor – PersonalDataCard (Campo Móvil sin normalización)
- Nuevo campo visual Móvil agregado debajo de Apellidos.
- Fuente de datos: profile.movil | profile.mobile | profile.phone (primer valor truthy).
- Render “tal cual” (sin sanitizar ni formatear) por requerimiento; muestra '—' si ausente.
- No afecta computeCompleteness (teléfono opcional).
- Extensión futura:
  - Validar formato y separar en otro chip (ej. país) si se requiere normalización posterior.
  - Considerar normalizar a E.164 en backend y almacenar rawOriginal para auditoría.
  - Agregar test unitario para priorización de claves (movil > mobile > phone).

---

Resumen técnico – Mejora UX Cards Proxy & VPN (Admin/User)
- Objetivo: Unificar y profesionalizar la presentación de datos de consumo y estado sin alterar la lógica Meteor existente.
- Cambios clave:
  - Incorporación de Chips (react-native-paper) para estado (habilitado/deshabilitado) en Proxy y VPN (user/admin).
  - Normalización de textos y corrección ortográfica ("Deshabilitar" en lugar de "Desabilitar").
  - Introducción de helpers reutilizables: formatDate / formatLimitDate / getPlanLabel / cálculos de consumo (MB → GB).
  - Reducción de duplicación: extracción de lógica de etiquetas y formateo; uso de useMemo para consumo (optimización menor pero escalable).
  - Consistencia visual: secciones jerarquizadas (Título, Oferta/Límite, Consumo, Acciones) + Divider ligero.
  - Añadidos testIDs para facilitar pruebas e2e (vpnUserCard, proxyUserCard, vpnAdminCard, proxyAdminCard, chips y botones).
  - Mejora de accesibilidad semántica: títulos con fontWeight y estructura más clara.
  - No se modificaron llamadas Meteor ni colecciones; cambios aislados a capa de presentación.
- Consideraciones futuras:
  - Centralizar helpers en /utils/dataFormat.js para evitar duplicaciones (cuando se requiera en otros módulos).
  - Parametrizar colores de estado vía theme para soportar theming dinámico.
  - Añadir barra de progreso de consumo (ej. porcentaje de megas usados) cuando haya definición robusta del límite (evitar cálculos ambiguos si ilimitado).
  - Internacionalización (i18n) de etiquetas (agregar módulo de strings centralizado).
  - Tests recomendados: snapshot de cada variante (ilimitado / por megas / habilitado / deshabilitado).
  - Posible extracción de un componente StatusChip y ConsumptionBlock compartido entre Proxy y VPN.
- Decisiones de coherencia:
  - Se conservan factores de conversión originales (1024000 / 1000000) según el contexto previo para no alterar datos percibidos.
  - Se mantuvo la estructura condicional (ilimitado vs limitado) para que futuros cambios (nuevos planes) sean poco invasivos.
- Riesgos mitigados:
  - No se introdujo dependencia nueva (Chip y Divider ya provienen de react-native-paper).
  - Se evitó alterar nombres de props/handlers utilizados externamente.
  - Se añadieron testIDs previendo automatización futura sin romper UI actual.

---

Mejora responsiva – Alineación horizontal Proxy & VPN (Tablet)
- Problema: En grid de 3 columnas (≈31% cada card) Proxy y VPN podían separarse en filas distintas dependiendo del número previo de tarjetas, rompiendo la coherencia visual.
- Solución: Se introdujo contenedor rowPairFull (width 100%) que fuerza un salto de fila y agrupa ambas tarjetas, renderizándolas lado a lado sólo en modo tablet. Cada una recibe pairItemWidth (flexBasis/maxWidth 48%) para equilibrio y evitar wrap prematuro.
- Comportamiento móvil conservado: stack vertical previo sin cambios funcionales.
- Beneficios UX: Relación semántica (servicios de conectividad) ahora clara y agrupada; reduce scroll vertical y mejora escaneabilidad.
- No se modificó lógica de negocio: mismas props, handlers y llamadas Meteor (reinicios, toggles, logs).
- Extensiones futuras sugeridas:
  - Parametrizar pares usando un layout manager (ej. <ResponsiveRow pair keys={['proxy','vpn']} />).
  - Añadir breakpoint intermedio (>=1024) para variar proporción (por ejemplo 50/50 vs 60/40 si se añaden métricas).
  - Animación LayoutAnimation al reorganizar (suavizar reflow en rotación).
  - Hook usePairRow(condition, deps) para reutilizar en otras parejas (ej. Balance + Ventas).
- Riesgos mitigados: Evita reflow inconsistente al cambiar orientación; mantiene minWidth 300 para legibilidad mínima.

---

### Resumen técnico – Adaptación responsiva UserDetails (Tablets)
- Objetivo: hacer el componente UserDetails visualmente escalable en tablets y pantallas grandes sin alterar lógica de negocio ni llamadas Meteor.
- Enfoque: patrón de grid fluido controlado por breakpoints (>=768px tablet, >=1200px wide). Se añadió cálculo dinámico de ancho por tarjeta (100% móvil, 48% tablet media, 31% wide).
- Cambios clave:
  - Estado: isTablet y currentWidth para reaccionar a cambios con Dimensions.addEventListener.
  - Estilos nuevos: rootTablet (flex-wrap + spacing) y cardItem (wrapper genérico con minWidth).
  - Envoltura: cada Card existente ahora se renderiza dentro de un wrapper responsivo sin modificar sus props originales.
  - No se tocaron funciones (Meteor.call, cálculos de deuda, lógica de reinicios ni suscripciones).
  - Se evita recomputar estilos pesados; solo cálculo ligero (objeto computedCardWidth) en cada render.
- Buenas prácticas aplicadas:
  - No se mutó style original root; se extendió vía array combinando root + rootTablet.
  - Se mantuvo separación entre estilos estáticos (StyleSheet.create) y decisiones dinámicas (computedCardWidth en render).
  - Breakpoints simples y claros para facilitar futuras refactorizaciones (posible migración a un theming centralizado).
- Posibles mejoras futuras:
  - Extraer hook useResponsiveDimensions para reutilizar en otros módulos.
  - Implementar memoización de layout si el árbol crece (React.memo / PureComponent).
  - Normalizar breakpoints en un módulo constants/responsive.js y agregar tests de snapshot en diferentes tamaños.
  - Añadir preferencia de densidad (compact / comfortable) según roles o ajustes de accesibilidad.
- Riesgos mitigados:
  - Evitado reflow excesivo: solo se fuerza setState en evento de cambio de dimensión.
  - No se reorganizó jerarquía semántica de tarjetas (mismo orden lógico para accesibilidad).
- Recomendación: aplicar mismo patrón a otros contenedores de dashboards para consistencia UX en tablets.
