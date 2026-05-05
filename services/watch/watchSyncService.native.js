import MeteorBase, { Tracker } from "@meteorrn/core";
import { Platform } from "react-native";

import {
    EvidenciasVentasEfectivoCollection,
    Online,
    VentasCollection,
    VentasRechargeCollection,
} from "../../components/collections/collections";
import { buildEvidenceImageUrl } from "../meteor/evidenceImages";
import {
    clearWatchUserSnapshot,
    replyToWatchMessage,
    sendWatchMessage,
    subscribeToWatchMessages,
    syncWatchDashboard,
} from "./watchConnectivity.native";
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
} from "./watchDashboard";

const Meteor = MeteorBase;
const ROOT_USER_FIELDS = WATCH_ROOT_USER_FIELDS;
const RECHARGE_BALANCE_REFRESH_MS = 60000;

const WATCH_ALLOWED_TOGGLE_KEYS = new Set([
  "desconectarVPN",
  "modoEmpresa",
  "permitirAprobacionEfectivoCUP",
  "permitirPagoEfectivoCUP",
  "permiteRemesas",
  "subscipcionPelis",
]);

let serviceStarted = false;
let messageCleanup = null;
let dashboardComputation = null;
let latestSession = { ready: false, user: null, userId: null };
let previousUserId;
let lastImmediateUserId = null;
let emptySessionAlreadyCleared = false;
let rechargeBalance = null;
let rechargeBalanceFetching = false;
let rechargeBalanceIntervalId = null;
const rechargeBalanceDependency = new Tracker.Dependency();

const getWatchErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  return error.reason || error.message || String(error) || fallback;
};

const normalizeMeteorMethodCallback = (firstArg, secondArg) => {
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

const extractRechargeBalanceAmount = (data) => {
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
      .filter((amount) => typeof amount === "number");

    if (amounts.length === 0) {
      return null;
    }

    return amounts.reduce((total, amount) => total + amount, 0);
  }

  if (typeof data === "object") {
    return extractRechargeBalanceAmount(
      data.available ??
        data.balance ??
        data.amount ??
        data.saldo ??
        data.availableBalance,
    );
  }

  return null;
};

const resolveRechargeBalanceCurrency = (data) => {
  if (Array.isArray(data)) {
    const firstBalance = data.find((item) => item?.currency || item?.unit);
    return firstBalance?.currency || firstBalance?.unit || "USD";
  }

  if (data && typeof data === "object") {
    return data.currency || data.unit || "USD";
  }

  return "USD";
};

const buildRechargeBalanceSnapshot = (data) => {
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

const getWatchPayloadDebugInfo = (payload) => ({
  currentUserId: payload?.currentUser?.id ?? null,
  currentUsername: payload?.currentUser?.username ?? null,
  debtorsCount: Array.isArray(payload?.debtors) ? payload.debtors.length : 0,
  pendingApprovalsCount: Array.isArray(payload?.pendingApprovals)
    ? payload.pendingApprovals.length
    : 0,
  rechargeBalanceAmount: payload?.rechargeBalance?.amount ?? null,
  syncedAt: payload?.syncedAt ?? null,
  usersCount: Array.isArray(payload?.users) ? payload.users.length : 0,
});

const setRechargeBalance = (nextRechargeBalance) => {
  rechargeBalance = nextRechargeBalance;
  rechargeBalanceDependency.changed();
};

const stopRechargeBalancePolling = () => {
  if (rechargeBalanceIntervalId) {
    clearInterval(rechargeBalanceIntervalId);
    rechargeBalanceIntervalId = null;
  }

  rechargeBalanceFetching = false;
};

const fetchRechargeBalance = () => {
  if (rechargeBalanceFetching) {
    return;
  }

  rechargeBalanceFetching = true;
  Meteor.call("dtshop.getBalance", (firstArg, secondArg) => {
    rechargeBalanceFetching = false;

    const { error, success } = normalizeMeteorMethodCallback(firstArg, secondArg);

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

const syncRechargeBalancePolling = ({ ready, user, userId }) => {
  const shouldPoll = Boolean(
    Platform.OS === "ios" &&
      userId &&
      ready &&
      user?.username === "carlosmbinf",
  );

  if (!shouldPoll) {
    stopRechargeBalancePolling();
    if (rechargeBalance !== null) {
      setRechargeBalance(null);
    }
    return;
  }

  if (!rechargeBalanceIntervalId) {
    fetchRechargeBalance();
    rechargeBalanceIntervalId = setInterval(
      fetchRechargeBalance,
      RECHARGE_BALANCE_REFRESH_MS,
    );
  }
};

const clearWatchSnapshot = (reason) => {
  clearWatchUserSnapshot()
    .then((result) => {
      console.log(
        "[WatchSyncService] clear result",
        JSON.stringify({ reason, result }),
      );
    })
    .catch((error) => {
      console.warn("[WatchConnectivity] No se pudo limpiar el usuario del Watch:", error);
    });
};

const syncIdentityChange = (userId) => {
  const previous = previousUserId;
  previousUserId = userId;

  console.log(
    "[WatchSyncService] userId change check",
    JSON.stringify({ previousUserId: previous, userId }),
  );

  if (previous === undefined) {
    return;
  }

  if (!previous && userId) {
    return;
  }

  if (previous !== userId) {
    console.log(
      "[WatchSyncService] clearing watch snapshot because userId changed",
      JSON.stringify({ previousUserId: previous, userId }),
    );
    setRechargeBalance(null);
    clearWatchSnapshot("userId_changed");
  }
};

const syncImmediateUserSnapshot = ({ ready, user, userId }) => {
  if (!userId) {
    lastImmediateUserId = null;
    return;
  }

  if (!user) {
    console.log(
      "[WatchSyncService] immediate snapshot waiting",
      JSON.stringify({ hasUser: Boolean(user), ready, userId }),
    );
    return;
  }

  if (lastImmediateUserId === userId) {
    return;
  }

  lastImmediateUserId = userId;
  const immediatePayload = buildWatchDashboardPayload({
    connections: [],
    currentUser: user,
    rechargeBalance: null,
    users: [user],
  });

  console.log(
    "[WatchSyncService] syncing immediate user snapshot",
    JSON.stringify({
      ...getWatchPayloadDebugInfo(immediatePayload),
      rootSubscriptionReady: ready,
    }),
  );

  syncWatchDashboard(immediatePayload)
    .then((result) => {
      console.log("[WatchSyncService] immediate snapshot result", JSON.stringify(result));
    })
    .catch((error) => {
      console.warn(
        "[WatchConnectivity] No se pudo sincronizar el snapshot inmediato con el Watch:",
        error,
      );
    });
};

const buildReactiveWatchPayload = ({ ready, user, userId }) => {
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
  const visibleUsers = visibleUsersRaw.filter((watchUser) => Boolean(watchUser?.profile));
  const visibleUserIds = visibleUsers
    .map((watchUser) => watchUser?._id)
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
    new Set(debtSales.map((debtSale) => debtSale?.adminId).filter(Boolean)),
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
          .find({ bloqueadoDesbloqueadoPor: userId }, { fields: { _id: 1 } })
          .fetch()
          .map((subordinateUser) => subordinateUser?._id)
          .filter(Boolean)
      : [];

  const approvalQuery = buildWatchApprovalQuery({
    currentUser: user,
    subordinateIds,
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
    .map((approvalVenta) => approvalVenta?._id)
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
          users: usersForWatch,
        })
      : null,
    watchReady: allReady,
  };
};

const sendReplyToWatch = (replyId, response) => {
  if (!replyId) {
    return;
  }

  replyToWatchMessage(replyId, response).catch((error) => {
    console.warn("[WatchConnectivity] No se pudo responder al Watch:", error);
  });
};

const handleWatchMessage = (message) => {
  const { user, userId } = latestSession;
  const replyId = typeof message?._replyId === "string" ? message._replyId : null;
  const sendReply = (response) => sendReplyToWatch(replyId, response);

  if (Platform.OS !== "ios" || !message || !userId) {
    sendReply({ ok: false, error: "session_unavailable", message: "Sesion no disponible." });
    return;
  }

  const messageType = typeof message?.type === "string" ? message.type : null;
  const isPrincipalAdmin = user?.username === "carlosmbinf";
  const isAdmin = isPrincipalAdmin || user?.profile?.role === "admin";

  if (!messageType) {
    sendReply({ ok: false, error: "invalid_message", message: "Mensaje no valido." });
    return;
  }

  if (!isAdmin) {
    sendReply({ ok: false, error: "unauthorized", message: "Usuario sin permisos." });
    return;
  }

  if (messageType === "approveEvidence" || messageType === "rejectEvidence") {
    const evidenceId = typeof message?.evidenceId === "string" ? message.evidenceId : null;

    if (!evidenceId) {
      sendReply({ ok: false, error: "missing_evidence_id", message: "Evidencia no valida." });
      return;
    }

    const methodName = messageType === "approveEvidence"
      ? "archivos.aprobarEvidencia"
      : "archivos.denegarEvidencia";
    const failureCode = messageType === "approveEvidence"
      ? "approve_evidence_failed"
      : "reject_evidence_failed";
    const failureMessage = messageType === "approveEvidence"
      ? "No se pudo aprobar la evidencia."
      : "No se pudo rechazar la evidencia.";

    Meteor.call(methodName, evidenceId, null, (firstArg, secondArg) => {
      const { error, success } = normalizeMeteorMethodCallback(firstArg, secondArg);
      if (error) {
        sendReply({
          ok: false,
          error: failureCode,
          message: getWatchErrorMessage(error, failureMessage),
        });
        console.warn(`[WatchConnectivity] ${failureMessage}`, error);
        return;
      }

      if (success) {
        EvidenciasVentasEfectivoCollection.update(evidenceId, {
          $set: messageType === "approveEvidence"
            ? {
                aprobado: true,
                cancelada: false,
                cancelado: false,
                denegado: false,
                estado: "APROBADA",
                isCancelada: false,
                rechazado: false,
              }
            : {
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

      sendReply({ ok: true, type: messageType, evidenceId });
    });
    return;
  }

  if (messageType === "requestEvidencePreview") {
    const evidenceId = typeof message?.evidenceId === "string" ? message.evidenceId : null;

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

    sendWatchMessage({ type: "evidencePreview", evidenceId, imageUrl })
      .then(() => {
        sendReply({ ok: true, type: "requestEvidencePreview", evidenceId });
      })
      .catch((error) => {
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

  if (messageType === "approveSale" || messageType === "rejectSale") {
    const saleId = typeof message?.saleId === "string" ? message.saleId : null;

    if (!saleId) {
      sendReply({ ok: false, error: "missing_sale_id", message: "Venta no valida." });
      return;
    }

    if (messageType === "approveSale") {
      Meteor.call("ventas.aprobarVenta", saleId, {}, (error, result) => {
        if (error) {
          sendReply({
            ok: false,
            error: "approve_sale_failed",
            message: getWatchErrorMessage(error, "No se pudo aprobar la venta."),
          });
          console.warn("[WatchConnectivity] No se pudo aprobar la venta desde el Watch:", error);
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

    Meteor.call("efectivo.cancelarVenta", saleId, (error, result) => {
      if (error) {
        sendReply({
          ok: false,
          error: "reject_sale_failed",
          message: getWatchErrorMessage(error, "No se pudo rechazar la venta."),
        });
        console.warn("[WatchConnectivity] No se pudo rechazar la venta desde el Watch:", error);
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
    });
    return;
  }

  if (messageType !== "toggleUserOption") {
    sendReply({ ok: false, error: "unsupported_message", message: "Accion no soportada." });
    return;
  }

  const targetUserId = typeof message?.userId === "string" ? message.userId : null;
  const toggleKey = typeof message?.key === "string" ? message.key : null;
  const nextValue = Boolean(message?.value);

  if (!targetUserId || !toggleKey || !WATCH_ALLOWED_TOGGLE_KEYS.has(toggleKey)) {
    sendReply({ ok: false, error: "invalid_toggle", message: "Opcion no valida." });
    return;
  }

  if (toggleKey !== "desconectarVPN" && !isPrincipalAdmin) {
    sendReply({ ok: false, error: "unauthorized_toggle", message: "Usuario sin permisos." });
    return;
  }

  Meteor.users.update(targetUserId, { $set: { [toggleKey]: nextValue } }, (error) => {
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
  });
};

const runDashboardAutorun = () => {
  dashboardComputation = Tracker.autorun(() => {
    const userId = Meteor.userId();
    let ready = false;
    let user = null;

    if (userId) {
      const subscription = Meteor.subscribe("user", { _id: userId }, {
        fields: ROOT_USER_FIELDS,
      });
      ready = subscription.ready();
      user = Meteor.user();
    }

    rechargeBalanceDependency.depend();
    latestSession = { ready, user, userId };
    syncIdentityChange(userId);
    syncRechargeBalancePolling({ ready, user, userId });
    syncImmediateUserSnapshot({ ready, user, userId });

    const { watchPayload, watchReady } = buildReactiveWatchPayload({
      ready,
      user,
      userId,
    });

    console.log(
      "[WatchSyncService] sync effect",
      JSON.stringify({
        hasPayload: Boolean(watchPayload),
        ready,
        userId,
        username: user?.username ?? null,
        watchReady,
      }),
    );

    if (!userId) {
      if (!emptySessionAlreadyCleared) {
        emptySessionAlreadyCleared = true;
        console.log("[WatchSyncService] clearing watch snapshot because session is empty");
        clearWatchSnapshot("empty_session");
      }
      return;
    }

    emptySessionAlreadyCleared = false;

    if (!ready || !user || !watchReady || !watchPayload) {
      console.log(
        "[WatchSyncService] sync skipped while waiting",
        JSON.stringify({
          hasPayload: Boolean(watchPayload),
          hasUser: Boolean(user),
          ready,
          userId,
          watchReady,
        }),
      );
      return;
    }

    console.log(
      "[WatchSyncService] syncing payload",
      JSON.stringify(getWatchPayloadDebugInfo(watchPayload)),
    );
    syncWatchDashboard(watchPayload)
      .then((result) => {
        console.log("[WatchSyncService] sync result", JSON.stringify(result));
      })
      .catch((error) => {
        console.warn("[WatchConnectivity] No se pudo sincronizar el dashboard con el Watch:", error);
      });
  });
};

export const startWatchConnectivityService = () => {
  if (Platform.OS !== "ios") {
    return () => {};
  }

  if (serviceStarted) {
    return stopWatchConnectivityService;
  }

  serviceStarted = true;
  console.log("[WatchSyncService] starting WatchConnectivity service");
  messageCleanup = subscribeToWatchMessages(handleWatchMessage);
  runDashboardAutorun();

  return stopWatchConnectivityService;
};

export const stopWatchConnectivityService = () => {
  if (!serviceStarted) {
    return;
  }

  console.log("[WatchSyncService] stopping WatchConnectivity service");
  serviceStarted = false;
  stopRechargeBalancePolling();
  messageCleanup?.();
  messageCleanup = null;
  dashboardComputation?.stop?.();
  dashboardComputation = null;
};

startWatchConnectivityService();