const BYTES_IN_MB = 1024 * 1024;

export const WATCH_ROOT_USER_FIELDS = {
  baneado: 1,
  createdAt: 1,
  desconectarVPN: 1,
  emails: 1,
  fechaSubscripcion: 1,
  isIlimitado: 1,
  megas: 1,
  megasGastadosinBytes: 1,
  mobile: 1,
  modoCadete: 1,
  modoEmpresa: 1,
  movil: 1,
  name: 1,
  permiteRemesas: 1,
  permitirAprobacionEfectivoCUP: 1,
  permitirPagoEfectivoCUP: 1,
  phone: 1,
  picture: 1,
  "profile.firstName": 1,
  "profile.lastName": 1,
  "profile.name": 1,
  "profile.picture": 1,
  "profile.role": 1,
  "profile.roleComercio": 1,
  saldoRecargas: 1,
  subscipcionPelis: 1,
  telefono: 1,
  username: 1,
  vpn: 1,
  vpn2mb: 1,
  vpn2mbConnected: 1,
  vpnMbGastados: 1,
  vpnfechaSubscripcion: 1,
  vpnmegas: 1,
  vpnplus: 1,
  vpnplusConnected: 1,
  vpnisIlimitado: 1,
};

export const WATCH_LIST_USER_FIELDS = {
  ...WATCH_ROOT_USER_FIELDS,
  bloqueadoDesbloqueadoPor: 1,
};

export const WATCH_CONNECTION_FIELDS = {
  address: 1,
  hostname: 1,
  userId: 1,
};

export const WATCH_DEBT_FIELDS = {
  adminId: 1,
  cobrado: 1,
  precio: 1,
};

export const WATCH_APPROVAL_VENTA_FIELDS = {
  _id: 1,
  cobrado: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  userId: 1,
  "producto.carritos": 1,
};

export const WATCH_APPROVAL_EVIDENCE_FIELDS = {
  _id: 1,
  aprobado: 1,
  cancelada: 1,
  cancelado: 1,
  denegado: 1,
  estado: 1,
  isCancelada: 1,
  rechazado: 1,
  ventaId: 1,
};

const WATCH_OPTION_DEFINITIONS = [
  {
    description: "Ordena la desconexión del cliente hasta revertirlo.",
    key: "desconectarVPN",
    label: "Desconectar VPN",
    scope: "admin",
  },
  {
    description: "Permite aprobar evidencias o ventas en efectivo.",
    key: "permitirAprobacionEfectivoCUP",
    label: "Aprobación efectivo",
    scope: "principal",
  },
  {
    description: "Habilita el pago en efectivo para este usuario.",
    key: "permitirPagoEfectivoCUP",
    label: "Pago efectivo",
    scope: "principal",
  },
  {
    description: "Permite operar con remesas desde el cliente.",
    key: "permiteRemesas",
    label: "Remesas",
    scope: "principal",
  },
  {
    description: "Habilita el acceso al módulo de películas.",
    key: "subscipcionPelis",
    label: "Suscripción pelis",
    scope: "principal",
  },
  {
    description: "Activa el flujo de navegación para empresas.",
    key: "modoEmpresa",
    label: "Modo empresa",
    scope: "principal",
  },
];

const PRODUCT_TYPE_LABELS = {
  COMERCIO: "Comercio",
  PROXY: "Proxy",
  RECARGA: "Recarga",
  REMESA: "Remesa",
  VPN: "VPN",
};

const clamp01 = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numericValue));
};

const toStringOrNull = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeUserId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    if (typeof value._str === "string") {
      return value._str;
    }

    if (typeof value.$oid === "string") {
      return value.$oid;
    }

    if (typeof value._id === "string") {
      return value._id;
    }
  }

  const stringValue = String(value);
  return stringValue === "[object Object]" ? null : stringValue;
};

const resolveEmail = (user) => {
  const firstEmail = Array.isArray(user?.emails) ? user.emails[0] : null;
  return toStringOrNull(firstEmail?.address ?? user?.email);
};

const resolvePhone = (user) =>
  toStringOrNull(user?.movil) ??
  toStringOrNull(user?.mobile) ??
  toStringOrNull(user?.phone) ??
  toStringOrNull(user?.telefono);

const resolveDisplayName = (user) => {
  const profile = user?.profile ?? {};
  const firstName = toStringOrNull(profile.firstName);
  const lastName = toStringOrNull(profile.lastName);
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    toStringOrNull(profile.name) ??
    toStringOrNull(user?.name) ??
    toStringOrNull(composedName) ??
    toStringOrNull(user?.username) ??
    "Usuario VIDKAR"
  );
};

const resolveRoleLabel = (user) => {
  const directRole = toStringOrNull(user?.profile?.role);
  if (directRole) {
    return directRole === "admin" ? "Administrador" : directRole;
  }

  const firstRole = Array.isArray(user?.profile?.roleComercio)
    ? user.profile.roleComercio.find((role) => typeof role === "string" && role.trim())
    : null;

  return firstRole ?? "Usuario";
};

const resolveModeLabel = (user) => {
  if (user?.modoCadete) {
    return "Modo cadete";
  }

  if (user?.modoEmpresa) {
    return "Modo empresa";
  }

  return "Modo normal";
};

const isActiveUnlimited = (enabled, unlimitedFlag, expiryDateValue) => {
  if (!enabled || !unlimitedFlag) {
    return false;
  }

  if (!expiryDateValue) {
    return true;
  }

  const expiryDate = new Date(expiryDateValue);
  if (Number.isNaN(expiryDate.getTime())) {
    return true;
  }

  return expiryDate > new Date();
};

const formatMoney = (value, currency = "CUP") =>
  `${toNumber(value).toLocaleString("es-CU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} ${currency}`.trim();

const formatMegas = (value) => {
  const megas = toNumber(value);

  if (megas >= 1024) {
    return `${(megas / 1024).toFixed(megas >= 10 * 1024 ? 0 : 1)} GB`;
  }

  return `${Math.round(megas)} MB`;
};

const buildConnectionState = (user, connections = []) => {
  const relevantConnections = connections.filter(
    (connectionDoc) =>
      normalizeUserId(connectionDoc?.userId) === normalizeUserId(user?._id),
  );

  const hasProxyConnection = relevantConnections.some((connectionDoc) =>
    String(connectionDoc?.address || "")
      .trim()
      .toLowerCase()
      .startsWith("proxy:"),
  );

  const hasWebConnection = relevantConnections.some((connectionDoc) => {
    const address = String(connectionDoc?.address || "")
      .trim()
      .toLowerCase();
    const hostname = String(connectionDoc?.hostname || "")
      .trim()
      .toLowerCase();

    return (
      !address.startsWith("proxy:") &&
      (address.length > 0 || hostname.length > 0)
    );
  });

  const hasVpnConnection = Boolean(
    user?.vpnplusConnected || user?.vpn2mbConnected,
  );

  return {
    hasProxyConnection,
    hasVpnConnection,
    hasWebConnection,
    isConnected: hasProxyConnection || hasVpnConnection || hasWebConnection,
  };
};

const buildUsageSnapshot = (user, connections) => {
  const connectionState = buildConnectionState(user, connections);

  const proxyEnabled = user?.baneado === false;
  const proxyUnlimited = isActiveUnlimited(
    proxyEnabled,
    user?.isIlimitado,
    user?.fechaSubscripcion,
  );
  const proxyUsedMB = toNumber(user?.megasGastadosinBytes) / BYTES_IN_MB;
  const proxyTotalMB = toNumber(user?.megas);
  const proxyProgress = proxyUnlimited
    ? 0
    : proxyTotalMB > 0
      ? clamp01(proxyUsedMB / proxyTotalMB)
      : 0;

  const vpnEnabled = Boolean(user?.vpn || user?.vpnplus || user?.vpn2mb);
  const vpnUnlimited = isActiveUnlimited(
    vpnEnabled,
    user?.vpnisIlimitado,
    user?.vpnfechaSubscripcion,
  );
  const vpnUsedMB = toNumber(user?.vpnMbGastados);
  const vpnTotalMB = toNumber(user?.vpnmegas);
  const vpnProgress = vpnUnlimited
    ? 0
    : vpnTotalMB > 0
      ? clamp01(vpnUsedMB / vpnTotalMB)
      : 0;

  return {
    proxy: {
      active: connectionState.hasProxyConnection,
      enabled: proxyEnabled,
      progress: proxyProgress,
      statusLabel: proxyEnabled
        ? proxyUnlimited
          ? "Ilimitado"
          : `${formatMegas(proxyUsedMB)} / ${formatMegas(proxyTotalMB)}`
        : "Inactivo",
      totalLabel: proxyUnlimited ? "Sin límite" : formatMegas(proxyTotalMB),
      usedLabel: formatMegas(proxyUsedMB),
    },
    vpn: {
      active: connectionState.hasVpnConnection,
      enabled: vpnEnabled,
      progress: vpnProgress,
      statusLabel: vpnEnabled
        ? vpnUnlimited
          ? "Ilimitado"
          : `${formatMegas(vpnUsedMB)} / ${formatMegas(vpnTotalMB)}`
        : "Inactivo",
      totalLabel: vpnUnlimited ? "Sin límite" : formatMegas(vpnTotalMB),
      usedLabel: formatMegas(vpnUsedMB),
    },
  };
};

const buildOptionsSnapshot = (user, currentViewer) => {
  const currentViewerUsername = toStringOrNull(currentViewer?.username);
  const isPrincipalAdmin = currentViewerUsername === "carlosmbinf";
  const isAdmin =
    isPrincipalAdmin || toStringOrNull(currentViewer?.profile?.role) === "admin";

  return WATCH_OPTION_DEFINITIONS.map((option) => ({
    description: option.description,
    editable:
      option.scope === "principal" ? isPrincipalAdmin : option.scope === "admin" ? isAdmin : false,
    key: option.key,
    label: option.label,
    value: Boolean(user?.[option.key]),
  }));
};

const buildDebtMap = (debtSales = []) =>
  debtSales.reduce((accumulator, sale) => {
    const adminId = normalizeUserId(sale?.adminId);
    if (!adminId) {
      return accumulator;
    }

    accumulator.set(
      adminId,
      (accumulator.get(adminId) || 0) + toNumber(sale?.precio),
    );
    return accumulator;
  }, new Map());

const buildEvidenceBySaleMap = (evidences = []) =>
  evidences.reduce((accumulator, evidenceDoc) => {
    const saleId = normalizeUserId(evidenceDoc?.ventaId);
    if (!saleId) {
      return accumulator;
    }

    const currentValue = accumulator.get(saleId) || {
      approvedCount: 0,
      rejectedCount: 0,
      totalCount: 0,
    };

    const approved = Boolean(evidenceDoc?.aprobado);
    const rejected = Boolean(
      evidenceDoc?.rechazado ||
        evidenceDoc?.denegado ||
        evidenceDoc?.cancelada ||
        evidenceDoc?.cancelado ||
        evidenceDoc?.isCancelada ||
        evidenceDoc?.estado === "RECHAZADA",
    );

    accumulator.set(saleId, {
      approvedCount: currentValue.approvedCount + (approved ? 1 : 0),
      rejectedCount: currentValue.rejectedCount + (rejected ? 1 : 0),
      totalCount: currentValue.totalCount + 1,
    });

    return accumulator;
  }, new Map());

const getApprovalTitle = (sale) => {
  const items = Array.isArray(sale?.producto?.carritos) ? sale.producto.carritos : [];
  const firstNamedItem = items.find(
    (item) => item?.producto?.name || item?.nombre,
  );

  if (firstNamedItem?.producto?.name || firstNamedItem?.nombre) {
    return firstNamedItem.producto?.name || firstNamedItem.nombre;
  }

  const firstType = items.find((item) => item?.type)?.type;
  return PRODUCT_TYPE_LABELS[firstType] || "Venta pendiente";
};

const getApprovalTypes = (sale) => {
  const seen = new Set();
  const items = Array.isArray(sale?.producto?.carritos) ? sale.producto.carritos : [];

  return items
    .map((item) => PRODUCT_TYPE_LABELS[item?.type] || null)
    .filter((label) => {
      if (!label || seen.has(label)) {
        return false;
      }

      seen.add(label);
      return true;
    });
};

const buildWatchUserProfile = (user, context) => {
  if (!user?._id) {
    return null;
  }

  const debtAmount = toNumber(context?.debtMap?.get(normalizeUserId(user._id)));
  const usage = buildUsageSnapshot(user, context?.connections || []);

  return {
    createdAt: toStringOrNull(
      user?.createdAt instanceof Date ? user.createdAt.toISOString() : user?.createdAt,
    ),
    debtAmount,
    debtLabel:
      debtAmount > 0 ? formatMoney(debtAmount, "CUP") : "Sin deuda pendiente",
    displayName: resolveDisplayName(user),
    email: resolveEmail(user),
    id: normalizeUserId(user?._id),
    isAdmin: toStringOrNull(user?.profile?.role) === "admin",
    modeLabel: resolveModeLabel(user),
    options: buildOptionsSnapshot(user, context?.currentViewer),
    phone: resolvePhone(user),
    picture: toStringOrNull(user?.picture ?? user?.profile?.picture),
    roleLabel: resolveRoleLabel(user),
    saldoRecargas: toNumber(user?.saldoRecargas),
    usage,
    username: toStringOrNull(user?.username),
  };
};

const buildApprovalItem = (sale, context) => {
  const saleId = normalizeUserId(sale?._id);
  if (!saleId) {
    return null;
  }

  const evidenceMeta = context?.evidenceBySaleMap?.get(saleId) || {
    approvedCount: 0,
    rejectedCount: 0,
    totalCount: 0,
  };
  const userProfile =
    context?.usersById?.get(normalizeUserId(sale?.userId)) || null;
  const saleApproved = sale?.isCobrado === true;
  const saleRejected =
    sale?.isCancelada === true || sale?.estado === "RECHAZADA";
  const saleDelivered = ["ENTREGADO", "PAGADA", "COMPLETADA"].includes(
    sale?.estado,
  );

  return {
    amountLabel: formatMoney(sale?.cobrado, sale?.monedaCobrado || "CUP"),
    approvedEvidenceCount: evidenceMeta.approvedCount,
    canApproveSale:
      evidenceMeta.approvedCount > 0 &&
      !saleApproved &&
      !saleRejected &&
      !saleDelivered,
    createdAt: toStringOrNull(
      sale?.createdAt instanceof Date ? sale.createdAt.toISOString() : sale?.createdAt,
    ),
    evidenceCount: evidenceMeta.totalCount,
    id: saleId,
    rejectedEvidenceCount: evidenceMeta.rejectedCount,
    title: getApprovalTitle(sale),
    types: getApprovalTypes(sale),
    userDisplayName: userProfile?.displayName || "Usuario pendiente",
  };
};

export const buildAdminScopedUserFilter = (currentUser) => {
  const currentUsername = toStringOrNull(currentUser?.username);
  if (currentUsername === "carlosmbinf") {
    return {};
  }

  return {
    $or: [
      { bloqueadoDesbloqueadoPor: normalizeUserId(currentUser?._id) },
      { bloqueadoDesbloqueadoPor: { $exists: false } },
      { bloqueadoDesbloqueadoPor: { $in: [""] } },
    ],
  };
};

export const buildWatchApprovalQuery = ({
  currentUser,
  subordinateIds = [],
}) => {
  const baseFilter = {
    isCancelada: false,
    isCobrado: false,
    metodoPago: "EFECTIVO",
  };
  const currentUserId = normalizeUserId(currentUser?._id);
  const isPrincipalAdmin = toStringOrNull(currentUser?.username) === "carlosmbinf";
  const isAdmin = toStringOrNull(currentUser?.profile?.role) === "admin";

  if (isPrincipalAdmin) {
    return baseFilter;
  }

  if (isAdmin) {
    return {
      ...baseFilter,
      $or: [
        { userId: currentUserId },
        { userId: { $in: subordinateIds.filter(Boolean) } },
      ],
    };
  }

  return {
    ...baseFilter,
    userId: currentUserId,
  };
};

export const buildWatchDashboardPayload = ({
  approvalEvidences = [],
  approvalVentas = [],
  connections = [],
  currentUser = null,
  debtSales = [],
  users = [],
}) => {
  const debtMap = buildDebtMap(debtSales);
  const usersById = new Map();
  const normalizedUsers = users
    .map((user) =>
      buildWatchUserProfile(user, {
        connections,
        currentViewer: currentUser,
        debtMap,
      }),
    )
    .filter(Boolean)
    .map((userProfile) => {
      usersById.set(userProfile.id, userProfile);
      return userProfile;
    });

  const evidenceBySaleMap = buildEvidenceBySaleMap(approvalEvidences);
  const pendingApprovals = approvalVentas
    .map((sale) =>
      buildApprovalItem(sale, {
        evidenceBySaleMap,
        usersById,
      }),
    )
    .filter(Boolean);

  return {
    currentUser: buildWatchUserProfile(currentUser, {
      connections,
      currentViewer: currentUser,
      debtMap,
    }),
    pendingApprovals,
    stats: {
      adminCount: normalizedUsers.filter((user) => user.isAdmin).length,
      pendingApprovalsCount: pendingApprovals.length,
      userCount: normalizedUsers.length,
    },
    syncedAt: new Date().toISOString(),
    users: normalizedUsers,
  };
};
