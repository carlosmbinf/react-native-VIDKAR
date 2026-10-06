export const WEBSITE_STATUS_LABELS = {
  CANCELADA: "Solicitud cancelada",
  CERRADA: "Página web retirada del servidor",
  CERRANDO: "Cerrando la página web",
  CIERRE_FALLIDO: "Cierre incompleto",
  COMPLETADA: "Web disponible",
  DNS_VERIFICADO: "DNS verificado; listo para aprovisionar",
  FALLIDA: "Falló; los cambios se revirtieron",
  PENDIENTE_DNS: "Esperando configuración DNS",
  APROVISIONANDO: "Preparando tu web",
  REVERTIENDO: "Revirtiendo los cambios",
  ROLLBACK_FALLIDO: "Requiere revisión de administración",
};

export const hasEmpresaWebsiteAccess = (user) => {
  const roles = user?.profile?.roleComercio;
  return user?.modoEmpresa === true
    && user?.empresaBloqueada !== true
    && user?.empresaTerminosCondicionesAcepted === true
    && (Array.isArray(roles) ? roles.includes("EMPRESA") : roles === "EMPRESA");
};

export const normalizeWebsiteSlug = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9-]/g, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 40);

export const normalizeWebsiteName = (value) => String(value || "").replace(/\s+/g, " ").trim();

export const getWebsiteErrorMessage = (error, fallback) => error?.reason || error?.message || fallback;

export const getWebsiteProgress = (request) => {
  const cancelled = request.status === "CANCELADA";
  const closeActive = ["CERRANDO", "CERRADA", "CIERRE_FALLIDO"].includes(request.status);
  const closeReviewRequired = request.closeAutoRetryPolicyVersion === 1
    && request.closeAutoRetryBlocked === true;
  const steps = cancelled ? [] : (closeActive ? request.closeSteps : request.steps) || [];
  const completedCount = steps.filter((step) => step.status === "COMPLETADO").length;
  const total = steps.length || 1;
  const percent = cancelled ? 0
    : ["COMPLETADA", "CERRADA"].includes(request.status) ? 100
      : Math.round(completedCount / total * 100);
  const label = request.status === "CIERRE_FALLIDO"
    ? closeReviewRequired ? "Cierre incompleto; requiere revisión" : "Cierre incompleto; recuperación automática"
    : WEBSITE_STATUS_LABELS[request.status] || request.status;
  return {
    cancelled,
    closeActive,
    closeReviewRequired,
    completedCount,
    total,
    percent,
    label,
    showRollback: ["REVERTIENDO", "FALLIDA", "ROLLBACK_FALLIDO"].includes(request.status),
    canCancel: request.status === "PENDIENTE_DNS",
    canClose: request.status === "COMPLETADA",
    canRetryClose: request.status === "CERRANDO"
      && request.currentStep === "close:auto_retry_wait"
      && request.closeAutoRetryPolicyVersion === 1
      && request.closeAutoRetryBlocked !== true
      && request.closeSucceeded === null,
    manualRetryQueued: request.status === "CERRANDO"
      && request.currentStep === "close:manual_retry_queued",
  };
};

export const WEBSITE_ACTIONS = {
  cancel: {
    method: "comercio.provisioning.cancelMine",
    label: "Cancelar solicitud",
    busyLabel: "Cancelando solicitud…",
    title: "Cancelar solicitud",
    confirm: (request) => `¿Cancelar la solicitud de ${request.displayName}? Todavía no se validó el DNS, así que no se han creado recursos del sitio. Si ya agregaste el registro DNS en Squarespace, tendrás que eliminarlo por separado.`,
    notice: (request) => `Se canceló la solicitud para ${request.hostname}. El subdominio queda disponible para otra página.`,
    allowed: (progress) => progress.canCancel,
  },
  close: {
    method: "comercio.provisioning.closeMine",
    label: "Cerrar página web",
    busyLabel: "Solicitando cierre…",
    title: "Cerrar página web",
    confirm: (request) => `¿Cerrar la página web de ${request.displayName}? Se detendrán y retirarán solo los recursos de ${request.hostname}. No se borrarán el catálogo, las imágenes, las ventas, los pedidos ni la cuenta de empresa. El registro DNS de Squarespace debe eliminarse manualmente.`,
    notice: () => "Solicitud de cierre recibida. La web se retirará de forma segura; el registro DNS de Squarespace debe eliminarse manualmente.",
    allowed: (progress) => progress.canClose,
  },
  retryClose: {
    method: "comercio.provisioning.retryCloseMine",
    label: "Reintentar cierre ahora",
    busyLabel: "Encolando reintento…",
    title: "Reintentar cierre",
    confirm: (request) => `¿Reintentar ahora el cierre de ${request.hostname}? Se conservarán los pasos completados y se retirarán solo los recursos de esta web. No se borrarán los productos, imágenes, ventas, pedidos ni la cuenta de empresa.`,
    notice: (request) => `Se solicitó adelantar el reintento de ${request.hostname}. El worker retomará el cierre conservando los pasos completados.`,
    allowed: (progress) => progress.canRetryClose,
  },
};

export const createWebsiteService = (meteor, timeoutMs = 30000) => {
  const call = (method, ...args) => new Promise((resolve, reject) => {
    if (!meteor.userId()) {
      reject(new Error("Debes iniciar sesión."));
      return;
    }
    if (!meteor.status()?.connected) {
      reject(new Error("Sin conexión con VIDKAR. Reconecta antes de continuar."));
      return;
    }
    const timer = setTimeout(() => reject(new Error(
      "No se pudo confirmar la operación. Revisa el estado de tus páginas antes de volver a intentarlo.",
    )), timeoutMs);
    try {
      meteor.call(method, ...args, (error, result) => {
        clearTimeout(timer);
        if (error) reject(error);
        else if (result?.success !== true) reject(new Error(
          getWebsiteErrorMessage(result, "El servidor no confirmó la operación."),
        ));
        else resolve(result);
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
  return {
    create: ({ displayName, slug }) => call("comercio.provisioning.create", {
      displayName: normalizeWebsiteName(displayName),
      slug: normalizeWebsiteSlug(slug),
    }),
    perform: (action, requestId) => {
      if (!Object.prototype.hasOwnProperty.call(WEBSITE_ACTIONS, action) || typeof requestId !== "string" || !requestId) {
        return Promise.reject(new Error("La acción o la solicitud no es válida."));
      }
      return call(WEBSITE_ACTIONS[action].method, requestId);
    },
  };
};
