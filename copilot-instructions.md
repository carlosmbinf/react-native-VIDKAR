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
