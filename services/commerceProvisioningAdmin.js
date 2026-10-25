export const isProvisioningAdmin = (user) =>
  String(user?.username || "").toLowerCase() === "carlosmbinf";

export const isCodeUpdateBusy = (request) =>
  ["PENDIENTE", "EN_PROGRESO"].includes(request?.codeUpdate?.status);

export const canAdminUpdateCode = (request) =>
  request?.status === "COMPLETADA" && !isCodeUpdateBusy(request);

export const requestAdminCodeUpdate = (meteor, requestId) => new Promise((resolve, reject) => {
  if (typeof requestId !== "string" || !requestId) {
    reject(new Error("La tienda seleccionada no es válida."));
    return;
  }
  if (!meteor.userId()) {
    reject(new Error("Debes iniciar sesión."));
    return;
  }
  if (!meteor.status()?.connected) {
    reject(new Error("Sin conexión con VIDKAR. Reconecta antes de continuar."));
    return;
  }

  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    reject(new Error("No se pudo confirmar la solicitud. Actualiza la cola antes de volver a intentarlo."));
  }, 30000);
  try {
    meteor.call("comercio.provisioning.admin.updateCode", requestId, (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else if (result?.success !== true) reject(new Error(
        result?.reason || "El servidor no confirmó la solicitud de actualización.",
      ));
      else resolve(result);
    });
  } catch (error) {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
  }
});
