import MeteorBase from "@meteorrn/core";
import React from "react";
import { Platform } from "react-native";

import { buildEvidenceImageUrl } from "../../services/meteor/evidenceImages";
import {
    clearWatchUserSnapshot,
    replyToWatchMessage,
    sendWatchMessage,
    subscribeToWatchMessages,
    syncWatchDashboard,
} from "../../services/watch/watchConnectivity.native";
import {
    buildAdminScopedUserFilter,
    buildWatchApprovalQuery,
    buildWatchDashboardPayload,
    buildWatchPendingEvidenceQuery,
    WATCH_APPROVAL_EVIDENCE_FIELDS,
    WATCH_APPROVAL_VENTA_FIELDS,
    WATCH_CONNECTION_FIELDS,
    WATCH_DEBT_FIELDS,
    WATCH_LIST_USER_FIELDS,
    WATCH_PENDING_EVIDENCE_FIELDS,
    WATCH_ROOT_USER_FIELDS,
} from "../../services/watch/watchDashboard";
import {
    EvidenciasVentasEfectivoCollection,
    Online,
    VentasCollection,
    VentasRechargeCollection,
} from "../collections/collections";

const Meteor = MeteorBase as unknown as {
  useTracker: <T>(reactiveFn: () => T, deps?: React.DependencyList) => T;
  userId: () => string | null;
  user: () => any;
  call: (...args: any[]) => void;
  users: {
    find: (...args: any[]) => { fetch: () => any[] };
    update: (...args: any[]) => void;
  };
  subscribe: (...args: any[]) => { ready: () => boolean };
  status: () => { connected: boolean };
};

const ROOT_USER_FIELDS = WATCH_ROOT_USER_FIELDS;
const WATCH_ALLOWED_TOGGLE_KEYS = new Set([
  "desconectarVPN",
  "modoEmpresa",
  "permitirAprobacionEfectivoCUP",
  "permitirPagoEfectivoCUP",
  "permiteRemesas",
  "subscipcionPelis",
]);

const getWatchErrorMessage = (error: any, fallback: string) => {
  if (!error) {
    return fallback;
  }

  return error.reason || error.message || String(error) || fallback;
};

const normalizeMeteorMethodCallback = (firstArg: any, secondArg: any) => {
  if (
    firstArg &&
    typeof firstArg === "object" &&
    (Object.prototype.hasOwnProperty.call(firstArg, "error") ||
      Object.prototype.hasOwnProperty.call(firstArg, "success"))
  ) {
    return {
      error: firstArg.error,
      success: firstArg.success,
    };
  }

  return {
    error: firstArg,
    success: secondArg,
  };
};

const extractRechargeBalanceAmount = (data: any): number | null => {
  if (data == null) {
    return null;
  }

  if (typeof data === "number") {
    return Number.isFinite(data) ? data : null;
  }

  if (typeof data === "string") {
    const numericValue = Number(data);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  if (Array.isArray(data)) {
    const amounts = data
      .map((item) => extractRechargeBalanceAmount(item))
      .filter((amount): amount is number => typeof amount === "number");

    if (amounts.length === 0) {
      return null;
    }

    return amounts.reduce((total, amount) => total + amount, 0);
  }

  if (typeof data === "object") {
    const directAmount = extractRechargeBalanceAmount(
      data.available ??
        data.balance ??
        data.amount ??
        data.saldo ??
        data.availableBalance,
    );

    return directAmount;
  }

  return null;
};

const resolveRechargeBalanceCurrency = (data: any): string => {
  if (Array.isArray(data)) {
    const firstBalance = data.find((item) => item?.currency || item?.unit);
    return firstBalance?.currency || firstBalance?.unit || "USD";
  }

  if (data && typeof data === "object") {
    return data.currency || data.unit || "USD";
  }

  return "USD";
};

const buildRechargeBalanceSnapshot = (data: any) => {
  const amount = extractRechargeBalanceAmount(data);

  if (amount == null) {
    return null;
  }

  return {
    amount,
    currency: resolveRechargeBalanceCurrency(data),
    updatedAt: new Date().toISOString(),
  };
};

export default function WatchSyncHost() {
  const [rechargeBalance, setRechargeBalance] = React.useState<any>(null);

  const { ready, user, userId } = Meteor.useTracker(
    (): {
      ready: boolean;
      user: any;
      userId: string | null;
    } => {
      const currentUserId = Meteor.userId();

      if (!currentUserId) {
        return {
          ready: false,
          user: null,
          userId: null,
        };
      }

      const subscription = Meteor.subscribe("user", { _id: currentUserId }, {
        fields: ROOT_USER_FIELDS,
      });

      return {
        ready: subscription.ready(),
        user: Meteor.user(),
        userId: currentUserId,
      };
    },
  );

  React.useEffect(() => {
    if (
      Platform.OS !== "ios" ||
      !userId ||
      !ready ||
      user?.username !== "carlosmbinf"
    ) {
      setRechargeBalance(null);
      return;
    }

    let isMounted = true;
    let fetching = false;
    const fetchRechargeBalance = () => {
      if (fetching) {
        return;
      }

      fetching = true;
      Meteor.call("dtshop.getBalance", (firstArg: any, secondArg: any) => {
        fetching = false;

        if (!isMounted) {
          return;
        }

        const { error, success } = normalizeMeteorMethodCallback(
          firstArg,
          secondArg,
        );

        if (error) {
          console.warn(
            "[WatchConnectivity] No se pudo consultar el saldo de recargas:",
            error,
          );
          return;
        }

        setRechargeBalance(buildRechargeBalanceSnapshot(success));
      });
    };

    fetchRechargeBalance();
    const intervalId = setInterval(fetchRechargeBalance, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [ready, user?.username, userId]);

  const { watchPayload, watchReady } = Meteor.useTracker(() => {
    if (Platform.OS !== "ios" || !userId || !ready || !user) {
      return { watchPayload: null, watchReady: false };
    }

    const isAdmin = user?.profile?.role === "admin";
    const isPrincipalAdmin = user?.username === "carlosmbinf";
    const visibleUserFilter = isAdmin
      ? buildAdminScopedUserFilter({ ...user, _id: userId })
      : { _id: userId };

    const visibleUsersHandle = Meteor.subscribe("user", visibleUserFilter, {
      fields: WATCH_LIST_USER_FIELDS,
    });
    const visibleUsersRaw = Meteor.users
      .find(visibleUserFilter, {
        fields: WATCH_LIST_USER_FIELDS,
        sort: {
          vpnMbGastados: -1,
          megasGastadosinBytes: -1,
          "profile.firstName": 1,
          "profile.lastName": 1,
        },
      })
      .fetch();
    const visibleUsers = visibleUsersRaw.filter(
      (watchUser: any) => Boolean(watchUser?.profile),
    );
    const visibleUserIds = visibleUsers
      .map((watchUser: any) => watchUser?._id)
      .filter(Boolean);

    const connectionsHandle =
      visibleUserIds.length > 0
        ? Meteor.subscribe(
            "conexiones",
            { userId: { $in: visibleUserIds } },
            { fields: WATCH_CONNECTION_FIELDS },
          )
        : null;
    const connections =
      visibleUserIds.length > 0
        ? Online.find(
            { userId: { $in: visibleUserIds } },
            { fields: WATCH_CONNECTION_FIELDS },
          ).fetch()
        : [];

    const debtQuery = isAdmin && visibleUserIds.length > 0
      ? {
          adminId: { $in: visibleUserIds },
          cobrado: false,
        }
      : null;
    const debtHandle = debtQuery
      ? Meteor.subscribe("ventas", debtQuery, { fields: WATCH_DEBT_FIELDS })
      : null;
    const debtSales = debtQuery
      ? VentasCollection.find(debtQuery, { fields: WATCH_DEBT_FIELDS }).fetch()
      : [];
    const debtorIds = Array.from(
      new Set(
        debtSales
          .map((debtSale: any) => debtSale?.adminId)
          .filter(Boolean),
      ),
    );
    const missingDebtorIds = debtorIds.filter(
      (debtorId) => !visibleUserIds.includes(debtorId),
    );
    const debtorUsersHandle =
      missingDebtorIds.length > 0
        ? Meteor.subscribe(
            "user",
            { _id: { $in: missingDebtorIds } },
            { fields: WATCH_LIST_USER_FIELDS },
          )
        : null;
    const debtorUsers =
      missingDebtorIds.length > 0
        ? Meteor.users
            .find(
              { _id: { $in: missingDebtorIds } },
              { fields: WATCH_LIST_USER_FIELDS },
            )
            .fetch()
        : [];
    const usersForWatch = [...visibleUsers, ...debtorUsers];

    const subordinateHandle =
      isAdmin && !isPrincipalAdmin
        ? Meteor.subscribe(
            "user",
            { bloqueadoDesbloqueadoPor: userId },
            { fields: { _id: 1 } },
          )
        : null;
    const subordinateIds =
      isAdmin && !isPrincipalAdmin
        ? Meteor.users
            .find(
              { bloqueadoDesbloqueadoPor: userId },
              { fields: { _id: 1 } },
            )
            .fetch()
            .map((subordinateUser: any) => subordinateUser?._id)
            .filter(Boolean)
        : [];

    const approvalQuery = buildWatchApprovalQuery({
      currentUser: user,
      subordinateIds: subordinateIds as any,
    });
    const pendingEvidenceQuery = buildWatchPendingEvidenceQuery(userId);
    const pendingEvidenceHandle = Meteor.subscribe(
      "ventasRecharge",
      pendingEvidenceQuery,
      { fields: WATCH_PENDING_EVIDENCE_FIELDS },
    );
    const pendingEvidenceVentas = VentasRechargeCollection.find(
      pendingEvidenceQuery,
      {
        fields: WATCH_PENDING_EVIDENCE_FIELDS,
        sort: { createdAt: -1 },
      },
    ).fetch();
    const approvalVentasHandle = Meteor.subscribe("ventasRecharge", approvalQuery, {
      fields: WATCH_APPROVAL_VENTA_FIELDS,
    });
    const approvalVentas = VentasRechargeCollection.find(approvalQuery, {
      fields: WATCH_APPROVAL_VENTA_FIELDS,
      sort: { createdAt: -1 },
    }).fetch();
    const approvalVentaIds = approvalVentas
      .map((approvalVenta: any) => approvalVenta?._id)
      .filter(Boolean);

    const approvalEvidencesHandle =
      approvalVentaIds.length > 0
        ? Meteor.subscribe(
            "evidenciasVentasEfectivoRecharge",
            { ventaId: { $in: approvalVentaIds } },
            { fields: WATCH_APPROVAL_EVIDENCE_FIELDS },
          )
        : null;
    const approvalEvidences =
      approvalVentaIds.length > 0
        ? EvidenciasVentasEfectivoCollection.find(
            { ventaId: { $in: approvalVentaIds } },
            { fields: WATCH_APPROVAL_EVIDENCE_FIELDS },
          ).fetch()
        : [];

    const allReady =
      visibleUsersHandle.ready() &&
      (connectionsHandle ? connectionsHandle.ready() : true) &&
      (debtHandle ? debtHandle.ready() : true) &&
      (debtorUsersHandle ? debtorUsersHandle.ready() : true) &&
      (subordinateHandle ? subordinateHandle.ready() : true) &&
      pendingEvidenceHandle.ready() &&
      approvalVentasHandle.ready() &&
      (approvalEvidencesHandle ? approvalEvidencesHandle.ready() : true);

    return {
      watchPayload: allReady
        ? buildWatchDashboardPayload({
            approvalEvidences,
            approvalVentas,
            connections,
            currentUser: user,
            debtSales,
            pendingEvidenceVentas,
            rechargeBalance,
            users: usersForWatch as any,
          })
        : null,
      watchReady: allReady,
    };
  }, [ready, rechargeBalance, user, userId]);

  const handleWatchMessage = React.useCallback(
    (message: any) => {
      const replyId = typeof message?._replyId === "string" ? message._replyId : null;
      const sendReply = (response: any) => {
        if (!replyId) {
          return;
        }

        replyToWatchMessage(replyId, response).catch((error: any) => {
          console.warn("[WatchConnectivity] No se pudo responder al Watch:", error);
        });
      };

      if (Platform.OS !== "ios" || !message || !userId) {
        sendReply({ ok: false, error: "session_unavailable", message: "Sesion no disponible." });
        return;
      }

      const messageType = typeof message?.type === "string" ? message.type : null;
      const isPrincipalAdmin = user?.username === "carlosmbinf";
      const isAdmin =
        isPrincipalAdmin || user?.profile?.role === "admin";

      if (!messageType) {
        sendReply({ ok: false, error: "invalid_message", message: "Mensaje no valido." });
        return;
      }

      if (!isAdmin) {
        sendReply({ ok: false, error: "unauthorized", message: "Usuario sin permisos." });
        return;
      }

      if (messageType === "approveEvidence") {
        const evidenceId =
          typeof message?.evidenceId === "string" ? message.evidenceId : null;

        if (!evidenceId) {
          sendReply({ ok: false, error: "missing_evidence_id", message: "Evidencia no valida." });
          return;
        }

        Meteor.call(
          "archivos.aprobarEvidencia",
          evidenceId,
          null,
          (firstArg: any, secondArg: any) => {
            const { error, success } = normalizeMeteorMethodCallback(
              firstArg,
              secondArg,
            );
            if (error) {
              sendReply({
                ok: false,
                error: "approve_evidence_failed",
                message: getWatchErrorMessage(error, "No se pudo aprobar la evidencia."),
              });
              console.warn(
                "[WatchConnectivity] No se pudo aprobar la evidencia desde el Watch:",
                error,
              );
              return;
            }

            if (success) {
              EvidenciasVentasEfectivoCollection.update(evidenceId, {
                $set: {
                  aprobado: true,
                  cancelada: false,
                  cancelado: false,
                  denegado: false,
                  estado: "APROBADA",
                  isCancelada: false,
                  rechazado: false,
                },
              });
            }

            sendReply({ ok: true, type: "approveEvidence", evidenceId });
          },
        );
        return;
      }

      if (messageType === "rejectEvidence") {
        const evidenceId =
          typeof message?.evidenceId === "string" ? message.evidenceId : null;

        if (!evidenceId) {
          sendReply({ ok: false, error: "missing_evidence_id", message: "Evidencia no valida." });
          return;
        }

        Meteor.call(
          "archivos.denegarEvidencia",
          evidenceId,
          null,
          (firstArg: any, secondArg: any) => {
            const { error, success } = normalizeMeteorMethodCallback(
              firstArg,
              secondArg,
            );
            if (error) {
              sendReply({
                ok: false,
                error: "reject_evidence_failed",
                message: getWatchErrorMessage(error, "No se pudo rechazar la evidencia."),
              });
              console.warn(
                "[WatchConnectivity] No se pudo rechazar la evidencia desde el Watch:",
                error,
              );
              return;
            }

            if (success) {
              EvidenciasVentasEfectivoCollection.update(evidenceId, {
                $set: {
                  aprobado: false,
                  cancelada: true,
                  cancelado: true,
                  denegado: true,
                  estado: "RECHAZADA",
                  isCancelada: true,
                  rechazado: true,
                },
              });
            }

            sendReply({ ok: true, type: "rejectEvidence", evidenceId });
          },
        );
        return;
      }

      if (messageType === "requestEvidencePreview") {
        const evidenceId =
          typeof message?.evidenceId === "string" ? message.evidenceId : null;

        if (!evidenceId) {
          sendReply({ ok: false, error: "missing_evidence_id", message: "Evidencia no valida." });
          return;
        }

        const imageUrl = buildEvidenceImageUrl(evidenceId);

        console.log(
          "[WatchConnectivity] Evidence preview request:",
          JSON.stringify({ evidenceId, imageUrl }),
        );

        if (!imageUrl) {
          console.warn(
            "[WatchConnectivity] Evidence preview URL unavailable for evidenceId:",
            evidenceId,
          );
          sendWatchMessage({
            type: "evidencePreviewUnavailable",
            evidenceId,
            reason: "No se pudo preparar la URL de la imagen",
          }).catch(() => null);
          sendReply({
            ok: false,
            error: "evidence_preview_unavailable",
            message: "No se pudo preparar la URL de la imagen.",
          });
          return;
        }

        sendWatchMessage({
          type: "evidencePreview",
          evidenceId,
          imageUrl,
        })
          .then(() => {
            sendReply({ ok: true, type: "requestEvidencePreview", evidenceId });
          })
          .catch((error: any) => {
            sendReply({
              ok: false,
              error: "evidence_preview_send_failed",
              message: getWatchErrorMessage(error, "No se pudo enviar la evidencia al Watch."),
            });
            console.warn(
              "[WatchConnectivity] No se pudo enviar la URL de evidencia al Watch:",
              error,
            );
          });
        return;
      }

      if (messageType === "approveSale") {
        const saleId = typeof message?.saleId === "string" ? message.saleId : null;

        if (!saleId) {
          sendReply({ ok: false, error: "missing_sale_id", message: "Venta no valida." });
          return;
        }

        Meteor.call("ventas.aprobarVenta", saleId, {}, (error: any, result: any) => {
          if (error) {
            sendReply({
              ok: false,
              error: "approve_sale_failed",
              message: getWatchErrorMessage(error, "No se pudo aprobar la venta."),
            });
            console.warn(
              "[WatchConnectivity] No se pudo aprobar la venta desde el Watch:",
              error,
            );
            return;
          }

          VentasRechargeCollection.update(saleId, {
            $set: {
              estado: result?.estado || result?.status || "PAGADA",
              isCobrado: true,
            },
          });
          sendReply({
            ok: true,
            type: "approveSale",
            saleId,
            status: result?.estado || result?.status || "PAGADA",
          });
        });
        return;
      }

      if (messageType === "rejectSale") {
        const saleId = typeof message?.saleId === "string" ? message.saleId : null;

        if (!saleId) {
          sendReply({ ok: false, error: "missing_sale_id", message: "Venta no valida." });
          return;
        }

        Meteor.call(
          "efectivo.cancelarVenta",
          saleId,
          (error: any, result: any) => {
            if (error) {
              sendReply({
                ok: false,
                error: "reject_sale_failed",
                message: getWatchErrorMessage(error, "No se pudo rechazar la venta."),
              });
              console.warn(
                "[WatchConnectivity] No se pudo rechazar la venta desde el Watch:",
                error,
              );
              return;
            }

            VentasRechargeCollection.update(saleId, {
              $set: {
                estado: "RECHAZADA",
                isCancelada: true,
                isCobrado: false,
              },
            });
            sendReply({
              ok: true,
              type: "rejectSale",
              saleId,
              status: "RECHAZADA",
              message: result?.message || "Venta rechazada correctamente.",
            });
          },
        );
        return;
      }

      if (messageType !== "toggleUserOption") {
        sendReply({ ok: false, error: "unsupported_message", message: "Accion no soportada." });
        return;
      }

      const targetUserId =
        typeof message?.userId === "string" ? message.userId : null;
      const toggleKey =
        typeof message?.key === "string" ? message.key : null;
      const nextValue = Boolean(message?.value);

      if (
        !targetUserId ||
        !toggleKey ||
        !WATCH_ALLOWED_TOGGLE_KEYS.has(toggleKey)
      ) {
        sendReply({ ok: false, error: "invalid_toggle", message: "Opcion no valida." });
        return;
      }

      if (toggleKey !== "desconectarVPN" && !isPrincipalAdmin) {
        sendReply({ ok: false, error: "unauthorized_toggle", message: "Usuario sin permisos." });
        return;
      }

      Meteor.users.update(
        targetUserId,
        { $set: { [toggleKey]: nextValue } },
        (error: any) => {
          if (error) {
            sendReply({
              ok: false,
              error: "toggle_failed",
              message: getWatchErrorMessage(error, "No se pudo aplicar el cambio."),
            });
            console.warn(
              "[WatchConnectivity] No se pudo aplicar el cambio solicitado desde el Watch:",
              error,
            );
            return;
          }

          sendReply({ ok: true, type: "toggleUserOption", userId: targetUserId, key: toggleKey });
        },
      );
    },
    [user?.profile?.role, user?.username, userId],
  );

  React.useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    return subscribeToWatchMessages(handleWatchMessage);
  }, [handleWatchMessage]);

  React.useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    if (!userId) {
      clearWatchUserSnapshot().catch((error) => {
        console.warn("[WatchConnectivity] No se pudo limpiar el usuario del Watch:", error);
      });
      return;
    }

    if (!ready || !user || !watchReady || !watchPayload) {
      return;
    }

    syncWatchDashboard(watchPayload).catch((error) => {
      console.warn("[WatchConnectivity] No se pudo sincronizar el dashboard con el Watch:", error);
    });
  }, [ready, user, userId, watchPayload, watchReady]);

  return null;
}