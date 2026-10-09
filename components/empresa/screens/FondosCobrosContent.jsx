import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Dialog,
  Divider,
  HelperText,
  Menu,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hasEmpresaWebsiteAccess } from "../../../services/commerceProvisioning";
import { createEmpresaPalette, getEmpresaScreenMetrics } from "../styles/empresaTheme";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
  MeteorBase
);

const EMPTY_FORM = {
  accountNumber: "",
  accountType: "",
  bankName: "",
  branch: "",
  currency: "USD",
  documentNumber: "",
  documentType: "",
  direccionCuba: "",
  holderName: "",
  method: "PAYPAL",
  monedaRecibirEnCuba: "",
  recipientIdentifier: "",
  remesaMethod: "EFECTIVO",
  tarjetaCUP: "",
};

const EMPTY_REMESA_OPTIONS = { currencies: [], deliveryMethods: [] };

const DESTINATION_METHODS = [
  { label: "PayPal", value: "PAYPAL" },
  { label: "Mercado Pago", value: "MERCADOPAGO" },
  { label: "Transferencia bancaria · Uruguay", value: "TRANSFERENCIA" },
  { label: "Remesa a Cuba", value: "REMESA" },
];

const ACCOUNT_TYPES = [
  { label: "Cuenta corriente", value: "CORRIENTE" },
  { label: "Caja de ahorro", value: "AHORRO" },
  { label: "Otro", value: "OTRO" },
];

const DOCUMENT_TYPES = [
  { label: "Cédula de identidad (CI)", value: "CI" },
  { label: "RUT", value: "RUT" },
  { label: "Pasaporte", value: "PASSPORT" },
  { label: "Otro", value: "OTRO" },
];

const REMESA_DELIVERY_METHODS = [
  { label: "Efectivo", value: "EFECTIVO" },
  { label: "Transferencia · tarjeta CUP", value: "TRANSFERENCIA" },
];

const METHOD_LABELS = {
  MERCADOPAGO: "Mercado Pago",
  PAYPAL: "PayPal",
  REMESA: "Remesa a Cuba",
  TRANSFERENCIA: "Transferencia bancaria · Uruguay",
};

const REQUEST_STATUS_LABELS = {
  ACTIVE: "Activo",
  CANCELLED: "Cancelada",
  CANCELED: "Cancelada",
  COMPLETED: "Completada",
  COMPATIBLE: "Compatible",
  FAILED: "Fallida",
  INACTIVE: "Inactivo",
  INCOMPATIBLE: "Requiere reconfiguración",
  IN_PROCESS: "En proceso",
  RESERVED: "Reservada",
  REQUIRES_RECONFIGURATION: "Requiere reconfiguración",
  UNKNOWN: "Pendiente de conciliación",
};

const callMethod = (method, ...args) => new Promise((resolve, reject) => {
  try {
    Meteor.call(method, ...args, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  } catch (error) {
    reject(error);
  }
});

const toRecords = (value) => {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value)
      : [];

  return entries
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
};

const safeText = (value, maxLength = 160) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).slice(0, maxLength);
};

const toAmount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const toDateValue = (value) => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  return typeof value === "string" || typeof value === "number" ? value : null;
};

const normalizeSummary = (result) => ({
  balances: toRecords(result?.balances).map((balance) => ({
    currency: safeText(balance.currency, 8).toUpperCase(),
    domain: safeText(balance.domain, 40),
    generated: toAmount(balance.generated),
    paid: toAmount(balance.paid),
    payable: toAmount(balance.payable),
    reserved: toAmount(balance.reserved),
  })),
  destinations: toRecords(result?.destinations).map((destination) => ({
    compatible: typeof destination.compatible === "boolean" ? destination.compatible : null,
    currency: safeText(destination.currency, 8).toUpperCase(),
    masked: safeText(destination.masked, 100),
    method: safeText(destination.method, 40).toUpperCase(),
    status: safeText(destination.status, 60).toUpperCase(),
    version: toAmount(destination.version),
  })),
  manualRequests: toRecords(result?.manualRequests).map((request, index) => ({
    amount: toAmount(
      request.amount ?? request.amountRequested ?? request.requestedAmount ?? request.reservedAmount,
    ),
    createdAt: toDateValue(request.createdAt ?? request.requestedAt ?? request.updatedAt),
    currency: safeText(request.currency, 8).toUpperCase(),
    domain: safeText(request.domain, 40),
    id: safeText(request._id ?? request.id ?? request.requestId, 100) || `manual-${index}`,
    method: safeText(request.method ?? request.paymentMethod, 40).toUpperCase(),
    status: safeText(request.status ?? request.state, 60).toUpperCase(),
  })),
});

const parseRemesaOptions = (properties) => {
  const readOptions = (key) => {
    const value = Array.isArray(properties)
      ? properties.find((entry) => entry?.clave === key)?.valor
      : undefined;

    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  };

  return {
    currencies: readOptions("monedaACobrarEnCuba").filter((currency) => ["CUP", "USD"].includes(currency)),
    deliveryMethods: readOptions("metodoPagoEnCuba").filter((method) =>
      REMESA_DELIVERY_METHODS.some((option) => option.value === method),
    ),
  };
};

const getErrorMessage = (error, fallback) => {
  const message = typeof error?.reason === "string"
    ? error.reason
    : typeof error?.message === "string"
      ? error.message
      : "";
  return message && message.length <= 240 ? message : fallback;
};

const getMethodLabel = (method, currency) => method === "REMESA" && currency === "CUP"
  ? "FONDO · Remesa CUP"
  : METHOD_LABELS[method] || method || "Método no disponible";

const getStatusLabel = (status) => {
  if (REQUEST_STATUS_LABELS[status]) return REQUEST_STATUS_LABELS[status];
  const label = status ? status.toLowerCase().replace(/_/g, " ") : "";
  return label ? `${label[0].toUpperCase()}${label.slice(1)}` : "Estado no disponible";
};

const formatMoney = (amount, currency) => {
  if (amount === null) return currency ? `— ${currency}` : "—";
  const formatted = amount.toLocaleString("es-UY", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
};

const formatDate = (dateValue) => {
  if (dateValue === null) return "Fecha no disponible";
  const date = new Date(dateValue);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("es-UY", { dateStyle: "medium", timeStyle: "short" })
    : "Fecha no disponible";
};

const getRemesaCurrenciesForBalance = (balanceCurrency, remesaOptions) => {
  const currencies = balanceCurrency === "CUP"
    ? remesaOptions.currencies.filter((currency) => currency === "CUP")
    : balanceCurrency === "USD"
      ? remesaOptions.currencies.filter((currency) => ["CUP", "USD"].includes(currency))
      : [];

  return currencies.filter((currency) => currency === "CUP"
    ? remesaOptions.deliveryMethods.length > 0
    : remesaOptions.deliveryMethods.includes("EFECTIVO"));
};

const getRemesaDeliveryMethods = (currency, remesaOptions) => remesaOptions.deliveryMethods.filter(
  (method) => currency === "CUP" || (currency === "USD" && method === "EFECTIVO"),
);

const getCurrenciesForMethod = (method, remesaOptions = EMPTY_REMESA_OPTIONS) => {
  if (method === "PAYPAL") return ["USD"];
  if (method === "MERCADOPAGO") return ["UYU"];
  if (method === "TRANSFERENCIA") return ["USD", "UYU"];
  if (method === "REMESA") {
    return ["CUP", "USD"].filter((currency) =>
      getRemesaCurrenciesForBalance(currency, remesaOptions).length > 0,
    );
  }
  return [];
};

const formatCardNumber = (value) => String(value || "")
  .replace(/\D/g, "")
  .slice(0, 16)
  .replace(/(\d{4})(?=\d)/g, "$1 ");

const validateForm = (form, remesaOptions) => {
  if (!form.holderName.trim()) return "Escribe el nombre del titular o destinatario.";

  if (form.method === "PAYPAL" || form.method === "MERCADOPAGO") {
    if (!form.recipientIdentifier.trim()) return "Completa el identificador de la cuenta de cobro.";
    return "";
  }

  if (form.method === "TRANSFERENCIA") {
    if (!form.bankName.trim()) return "Escribe el nombre del banco en Uruguay.";
    if (!ACCOUNT_TYPES.some((option) => option.value === form.accountType)) {
      return "Selecciona un tipo de cuenta válido.";
    }
    if (!form.accountNumber.trim()) return "Completa el número de cuenta.";
    if (Boolean(form.documentType) !== Boolean(form.documentNumber.trim())) {
      return "Completa el tipo y número de documento, o deja ambos vacíos.";
    }
    if (form.documentType && !DOCUMENT_TYPES.some((option) => option.value === form.documentType)) {
      return "Selecciona un tipo de documento válido.";
    }
    return "";
  }

  if (form.method === "REMESA") {
    if (!["CUP", "USD"].includes(form.currency)) {
      return "REMESA solo está disponible para saldos de origen CUP o USD.";
    }
    if (form.currency === "CUP" && form.monedaRecibirEnCuba !== "CUP") {
      return "El saldo CUP solo permite entrega en CUP por el mismo importe, sin conversión.";
    }
    const availableCurrencies = getRemesaCurrenciesForBalance(form.currency, remesaOptions);
    if (!availableCurrencies.includes(form.monedaRecibirEnCuba)) {
      return "Selecciona una moneda de entrega habilitada para ese saldo.";
    }
    const availableDeliveryMethods = getRemesaDeliveryMethods(form.monedaRecibirEnCuba, remesaOptions);
    if (!availableDeliveryMethods.includes(form.remesaMethod)) {
      return "Selecciona un método de entrega habilitado para esa moneda.";
    }
    if (form.remesaMethod === "EFECTIVO" && !form.direccionCuba.trim()) {
      return "Completa la dirección de entrega en Cuba.";
    }
    if (form.remesaMethod === "TRANSFERENCIA" && form.tarjetaCUP.replace(/\D/g, "").length !== 16) {
      return "La tarjeta CUP debe tener exactamente 16 dígitos.";
    }
    return "";
  }

  return "Selecciona un método de cobro permitido.";
};

const buildDestinationPayload = (form) => {
  let details;

  if (form.method === "PAYPAL" || form.method === "MERCADOPAGO") {
    details = { recipientIdentifier: form.recipientIdentifier.trim() };
  } else if (form.method === "TRANSFERENCIA") {
    details = {
      accountNumber: form.accountNumber.trim(),
      accountType: form.accountType,
      bankName: form.bankName.trim(),
      ...(form.branch.trim() ? { branch: form.branch.trim() } : {}),
      ...(form.documentType && form.documentNumber.trim()
        ? { documentNumber: form.documentNumber.trim(), documentType: form.documentType }
        : {}),
    };
  } else if (form.method === "REMESA") {
    details = {
      direccionCuba: form.remesaMethod === "EFECTIVO" ? form.direccionCuba.trim() : "",
      metodoPago: form.remesaMethod,
      monedaRecibirEnCuba: form.monedaRecibirEnCuba,
      tarjetaCUP: form.remesaMethod === "TRANSFERENCIA" ? form.tarjetaCUP.replace(/\D/g, "") : "",
    };
  }

  return {
    confirmOwnership: true,
    currency: form.currency,
    details,
    holderName: form.holderName.trim(),
    method: form.method,
  };
};

const FondosCobrosContent = ({ header }) => {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const palette = useMemo(() => createEmpresaPalette(theme), [theme]);
  const metrics = getEmpresaScreenMetrics(width);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const session = Meteor.useTracker(() => {
    const userId = Meteor.userId();
    const connected = Meteor.status()?.connected === true;

    if (!userId || !connected) {
      return {
        connected,
        handles: [],
        hasAccess: false,
        ready: false,
        userId,
      };
    }

    const accessHandle = Meteor.subscribe("comercio.empresaAccess");
    const modeHandle = Meteor.subscribe(
      "user",
      { _id: userId },
      { fields: { modoEmpresa: 1 } },
    );
    const user = Meteor.users.findOne({ _id: userId });
    const ready = accessHandle.ready() && modeHandle.ready();

    return {
      connected,
      handles: [accessHandle, modeHandle],
      hasAccess: ready && hasEmpresaWebsiteAccess(user),
      ready,
      userId,
    };
  }, [subscriptionAttempt]);

  const [summary, setSummary] = useState(null);
  const [summaryOwnerId, setSummaryOwnerId] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [remesaOptions, setRemesaOptions] = useState(EMPTY_REMESA_OPTIONS);
  const [remesaOptionsOwnerId, setRemesaOptionsOwnerId] = useState("");
  const [remesaOptionsError, setRemesaOptionsError] = useState("");
  const [loadingRemesaOptions, setLoadingRemesaOptions] = useState(false);
  const [formState, setFormState] = useState({ ownerId: "", values: EMPTY_FORM });
  const [destinationDialogVisible, setDestinationDialogVisible] = useState(false);
  const [ownershipState, setOwnershipState] = useState({ confirmed: false, ownerId: "" });
  const [openMenu, setOpenMenu] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(false);
  const summaryRequestRef = useRef(0);
  const optionsRequestRef = useRef(0);
  const saveRequestRef = useRef(0);

  const form = formState.ownerId === session.userId ? formState.values : EMPTY_FORM;
  const ownershipConfirmed = ownershipState.ownerId === session.userId && ownershipState.confirmed;
  const currentSummary = summaryOwnerId === session.userId ? summary : null;
  const currentRemesaOptions = remesaOptionsOwnerId === session.userId
    ? remesaOptions
    : EMPTY_REMESA_OPTIONS;
  const isAuthorized = Boolean(
    session.userId && session.connected && session.ready && session.hasAccess,
  );
  const remesaOptionsLoading = loadingRemesaOptions || Boolean(
    isAuthorized && remesaOptionsOwnerId !== session.userId && !remesaOptionsError,
  );
  const supportsRemesa = getCurrenciesForMethod("REMESA", currentRemesaOptions).length > 0;
  const availableMethods = DESTINATION_METHODS.filter(
    (method) => method.value !== "REMESA" || supportsRemesa,
  );
  const getAvailableMethodsForCurrency = (currency) => availableMethods.filter((method) =>
    getCurrenciesForMethod(method.value, currentRemesaOptions).includes(currency),
  );

  const updateForm = (update) => {
    if (saving) return;
    setFormState((current) => {
      const currentValues = current.ownerId === session.userId ? current.values : EMPTY_FORM;
      const values = typeof update === "function"
        ? update(currentValues)
        : { ...currentValues, ...update };
      return { ownerId: session.userId || "", values };
    });
    setFormError("");
    setNotice("");
  };

  const openDestinationForm = (currency, preferredMethod) => {
    const normalizedCurrency = String(currency || "").toUpperCase();
    const methods = getAvailableMethodsForCurrency(normalizedCurrency);
    const method = methods.find((option) => option.value === preferredMethod)?.value
      || methods[0]?.value;

    if (!method) {
      const message = normalizedCurrency === "CUP" && remesaOptionsLoading
        ? "Estamos verificando las opciones activas de REMESA para CUP. Inténtalo de nuevo en unos segundos."
        : normalizedCurrency === "CUP" && remesaOptionsError
          ? remesaOptionsError
          : `No hay un método de cobro habilitado para ${normalizedCurrency || "esta moneda"}.`;
      setNotice(message);
      return;
    }

    const remesaCurrencies = method === "REMESA"
      ? getRemesaCurrenciesForBalance(normalizedCurrency, currentRemesaOptions)
      : [];
    const remesaCurrency = remesaCurrencies[0] || "";
    const deliveryMethods = getRemesaDeliveryMethods(remesaCurrency, currentRemesaOptions);

    setFormState({
      ownerId: session.userId || "",
      values: {
        ...EMPTY_FORM,
        currency: normalizedCurrency,
        method,
        monedaRecibirEnCuba: remesaCurrency,
        remesaMethod: deliveryMethods[0] || "EFECTIVO",
      },
    });
    setOwnershipState({ confirmed: false, ownerId: session.userId || "" });
    setOpenMenu("");
    setFormError("");
    setNotice("");
    setDestinationDialogVisible(true);
  };

  const closeDestinationDialog = () => {
    if (saving) return;

    setDestinationDialogVisible(false);
    setFormState({ ownerId: session.userId || "", values: EMPTY_FORM });
    setOwnershipState({ confirmed: false, ownerId: session.userId || "" });
    setOpenMenu("");
    setFormError("");
  };

  const reloadSummary = useCallback(async () => {
    const userId = Meteor.userId();
    const requestId = ++summaryRequestRef.current;
    const isCurrentRequest = () => mountedRef.current
      && summaryRequestRef.current === requestId
      && Meteor.userId() === userId;

    if (!userId || !hasEmpresaWebsiteAccess(Meteor.user())) {
      setLoadingSummary(false);
      return false;
    }
    if (Meteor.status()?.connected !== true) {
      setLoadingSummary(false);
      setSummaryError("Sin conexión con VIDKAR. Reconecta y vuelve a actualizar el saldo.");
      return false;
    }

    setLoadingSummary(true);
    setSummaryError("");

    try {
      const result = await callMethod("pagos.liquidaciones.resumen", userId, {});
      if (!isCurrentRequest()) return false;
      setSummary(normalizeSummary(result));
      setSummaryOwnerId(userId);
      return true;
    } catch (error) {
      if (isCurrentRequest()) {
        setSummaryError(getErrorMessage(error, "No se pudo cargar tu resumen de fondos."));
      }
      return false;
    } finally {
      if (isCurrentRequest()) setLoadingSummary(false);
    }
  }, []);

  const loadRemesaOptions = useCallback(async () => {
    const userId = Meteor.userId();
    const requestId = ++optionsRequestRef.current;
    const isCurrentRequest = () => mountedRef.current
      && optionsRequestRef.current === requestId
      && Meteor.userId() === userId;

    if (!userId || !hasEmpresaWebsiteAccess(Meteor.user()) || Meteor.status()?.connected !== true) {
      setLoadingRemesaOptions(false);
      return false;
    }

    setRemesaOptions(EMPTY_REMESA_OPTIONS);
    setRemesaOptionsOwnerId("");
    setLoadingRemesaOptions(true);
    setRemesaOptionsError("");
    try {
      const properties = await callMethod("property.get", ["REMESA"]);
      if (!isCurrentRequest()) return false;
      setRemesaOptions(parseRemesaOptions(properties));
      setRemesaOptionsOwnerId(userId);
      return true;
    } catch {
      if (isCurrentRequest()) {
        setRemesaOptions(EMPTY_REMESA_OPTIONS);
        setRemesaOptionsOwnerId(userId);
        setRemesaOptionsError("No se pudieron verificar las opciones activas de REMESA. Puedes configurar otro destino o reintentar.");
      }
      return false;
    } finally {
      if (isCurrentRequest()) setLoadingRemesaOptions(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      summaryRequestRef.current += 1;
      optionsRequestRef.current += 1;
      saveRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const ownerId = session.userId || "";
    summaryRequestRef.current += 1;
    optionsRequestRef.current += 1;
    saveRequestRef.current += 1;
    setSummary(null);
    setSummaryOwnerId("");
    setSummaryError("");
    setRemesaOptions(EMPTY_REMESA_OPTIONS);
    setRemesaOptionsOwnerId("");
    setRemesaOptionsError("");
    setLoadingRemesaOptions(false);
    setFormState({ ownerId, values: EMPTY_FORM });
    setDestinationDialogVisible(false);
    setOwnershipState({ confirmed: false, ownerId });
    setOpenMenu("");
    setFormError("");
    setNotice("");
    setSaving(false);
    setRefreshing(false);
  }, [session.userId]);

  useEffect(() => {
    if (!session.userId || !session.connected || !session.ready || !session.hasAccess) {
      summaryRequestRef.current += 1;
      optionsRequestRef.current += 1;
      setLoadingSummary(false);
      setLoadingRemesaOptions(false);
      setRefreshing(false);
      if (session.userId && !session.connected) {
        setSummaryError("Sin conexión con VIDKAR. Reconecta para consultar tus fondos.");
      } else {
        setSummaryError("");
      }
      return undefined;
    }

    void reloadSummary();
    void loadRemesaOptions();

    return () => {
      summaryRequestRef.current += 1;
      optionsRequestRef.current += 1;
    };
  }, [
    loadRemesaOptions,
    reloadSummary,
    session.connected,
    session.hasAccess,
    session.ready,
    session.userId,
  ]);

  useEffect(() => {
    if (form.method !== "REMESA") return;

    const sourceCurrencies = getCurrenciesForMethod("REMESA", currentRemesaOptions);
    if (sourceCurrencies.length > 0) {
      const currency = sourceCurrencies.includes(form.currency) ? form.currency : sourceCurrencies[0];
      const availableCurrencies = getRemesaCurrenciesForBalance(currency, currentRemesaOptions);
      const monedaRecibirEnCuba = availableCurrencies.includes(form.monedaRecibirEnCuba)
        ? form.monedaRecibirEnCuba
        : availableCurrencies[0] || "";
      const availableDeliveryMethods = getRemesaDeliveryMethods(monedaRecibirEnCuba, currentRemesaOptions);
      const remesaMethod = availableDeliveryMethods.includes(form.remesaMethod)
        ? form.remesaMethod
        : availableDeliveryMethods[0] || "";
      const selectionChanged = currency !== form.currency
        || monedaRecibirEnCuba !== form.monedaRecibirEnCuba
        || remesaMethod !== form.remesaMethod;

      if (!selectionChanged) return;

      setFormState((current) => {
        const currentValues = current.ownerId === session.userId ? current.values : EMPTY_FORM;
        return {
          ownerId: session.userId || "",
          values: {
            ...currentValues,
            currency,
            direccionCuba: "",
            monedaRecibirEnCuba,
            remesaMethod,
            tarjetaCUP: "",
          },
        };
      });
      setOwnershipState({ confirmed: false, ownerId: session.userId || "" });
      setFormError("");
      setOpenMenu("");
      return;
    }

    setFormState((current) => {
      const currentValues = current.ownerId === session.userId ? current.values : EMPTY_FORM;
      return {
        ownerId: session.userId || "",
        values: { ...EMPTY_FORM, holderName: currentValues.holderName },
      };
    });
    setOwnershipState({ confirmed: false, ownerId: session.userId || "" });
    setFormError("");
    setOpenMenu("");
  }, [
    currentRemesaOptions,
    form.currency,
    form.method,
    form.monedaRecibirEnCuba,
    form.remesaMethod,
    session.userId,
  ]);

  const handleRetry = () => {
    if (!session.connected) {
      session.handles.forEach((handle) => handle.stop());
      Meteor.reconnect();
      setSubscriptionAttempt((attempt) => attempt + 1);
      return;
    }

    if (!session.ready) {
      setSubscriptionAttempt((attempt) => attempt + 1);
      return;
    }

    if (!session.hasAccess) return;
    setNotice("");
    setRefreshing(true);
    void Promise.all([reloadSummary(), loadRemesaOptions()]).finally(() => {
      if (mountedRef.current) setRefreshing(false);
    });
  };

  const selectMethod = (method) => {
    const currencies = getCurrenciesForMethod(method, currentRemesaOptions);
    const currency = currencies.includes(form.currency) ? form.currency : currencies[0] || "USD";
    const remesaCurrencies = method === "REMESA"
      ? getRemesaCurrenciesForBalance(currency, currentRemesaOptions)
      : [];
    const monedaRecibirEnCuba = remesaCurrencies[0] || "";
    const deliveryMethods = getRemesaDeliveryMethods(monedaRecibirEnCuba, currentRemesaOptions);
    updateForm((current) => ({
      ...EMPTY_FORM,
      currency,
      holderName: current.holderName,
      method,
      monedaRecibirEnCuba,
      remesaMethod: deliveryMethods[0] || "EFECTIVO",
    }));
    setOwnershipState({ confirmed: false, ownerId: session.userId || "" });
    setOpenMenu("");
  };

  const selectSourceCurrency = (currency) => {
    updateForm((current) => {
      if (current.method !== "REMESA") return { ...current, currency };

      const currencies = getRemesaCurrenciesForBalance(currency, currentRemesaOptions);
      const monedaRecibirEnCuba = currencies.includes(current.monedaRecibirEnCuba)
        ? current.monedaRecibirEnCuba
        : currencies[0] || "";
      const deliveryMethods = getRemesaDeliveryMethods(monedaRecibirEnCuba, currentRemesaOptions);
      const remesaMethod = deliveryMethods.includes(current.remesaMethod)
        ? current.remesaMethod
        : deliveryMethods[0] || "";
      const destinationChanged = monedaRecibirEnCuba !== current.monedaRecibirEnCuba
        || remesaMethod !== current.remesaMethod;

      return {
        ...current,
        currency,
        monedaRecibirEnCuba,
        remesaMethod,
        ...(destinationChanged ? { direccionCuba: "", tarjetaCUP: "" } : {}),
      };
    });
  };

  const selectRemesaCurrency = (monedaRecibirEnCuba) => {
    const deliveryMethods = getRemesaDeliveryMethods(monedaRecibirEnCuba, currentRemesaOptions);
    updateForm((current) => ({
      ...current,
      direccionCuba: "",
      monedaRecibirEnCuba,
      remesaMethod: deliveryMethods.includes(current.remesaMethod)
        ? current.remesaMethod
        : deliveryMethods[0] || "",
      tarjetaCUP: "",
    }));
  };

  const handleSaveDestination = async () => {
    if (saving) return;
    if (!session.userId || !session.hasAccess || Meteor.userId() !== session.userId) {
      setFormError("Vuelve a entrar en tu cuenta de Empresa antes de guardar el destino.");
      return;
    }
    if (Meteor.status()?.connected !== true) {
      setFormError("Sin conexión con VIDKAR. Reconecta antes de guardar el destino.");
      return;
    }

    const validationError = validateForm(form, currentRemesaOptions);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!ownershipConfirmed) {
      setFormError("Confirma que eres titular o estás autorizado para usar este destino.");
      return;
    }

    const userId = Meteor.userId();
    const requestId = ++saveRequestRef.current;
    const isCurrentRequest = () => mountedRef.current
      && saveRequestRef.current === requestId
      && Meteor.userId() === userId;

    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      await callMethod("pagos.liquidaciones.destino.guardar", buildDestinationPayload(form));
      if (!isCurrentRequest()) return;

      setFormState({ ownerId: userId, values: EMPTY_FORM });
      setDestinationDialogVisible(false);
      setOwnershipState({ confirmed: false, ownerId: userId });
      setOpenMenu("");
      setNotice("Destino guardado. El resumen muestra únicamente la máscara devuelta por el servidor.");

      const refreshed = await reloadSummary();
      if (isCurrentRequest() && !refreshed) {
        setNotice("Destino guardado. No se pudo actualizar el resumen; usa Actualizar para verificar la máscara.");
      }
    } catch (error) {
      if (isCurrentRequest()) {
        setFormError(getErrorMessage(error, "No se pudo guardar el destino. Revisa los datos e inténtalo nuevamente."));
      }
    } finally {
      if (isCurrentRequest()) setSaving(false);
    }
  };

  const formCurrencies = getCurrenciesForMethod(form.method, currentRemesaOptions);
  const remesaCurrenciesForForm = getRemesaCurrenciesForBalance(form.currency, currentRemesaOptions);
  const activeDeliveryMethods = getRemesaDeliveryMethods(form.monedaRecibirEnCuba, currentRemesaOptions)
    .map((method) => REMESA_DELIVERY_METHODS.find((option) => option.value === method))
    .filter(Boolean);
  const summaryReadyForUser = Boolean(currentSummary && summaryOwnerId === session.userId);
  const contentStyle = [
    styles.content,
    {
      maxWidth: metrics.contentMaxWidth || 1040,
      paddingBottom: Math.max(insets.bottom, 16) + 24,
      paddingHorizontal: metrics.horizontalPadding,
    },
  ];

  const renderOptionMenu = ({ id, label, onSelect, options, valueLabel }) => (
    <View style={styles.field}>
      <Text style={{ color: palette.copy }} variant="labelLarge">{label}</Text>
      <Menu
        anchor={(
          <Button
            accessibilityLabel={`${label}: ${valueLabel}`}
            contentStyle={styles.selectButtonContent}
            disabled={saving}
            icon="chevron-down"
            mode="outlined"
            onPress={() => setOpenMenu(id)}
            style={[styles.selectButton, { borderColor: palette.borderStrong }]}
          >
            {valueLabel}
          </Button>
        )}
        onDismiss={() => setOpenMenu("")}
        visible={openMenu === id}
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value || "none"}
            onPress={() => onSelect(option.value)}
            title={option.label}
          />
        ))}
      </Menu>
    </View>
  );

  const renderGate = () => {
    if (!session.userId) {
      return (
        <Surface elevation={0} style={[styles.statePanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <MaterialCommunityIcons color={palette.brandStrong} name="account-lock-outline" size={30} />
          <Text selectable style={{ color: palette.title }} variant="titleMedium">Inicia sesión para ver tus fondos</Text>
          <Text selectable style={{ color: palette.copy }} variant="bodyMedium">
            Los saldos y destinos de cobro solo están disponibles para la cuenta propietaria autenticada.
          </Text>
          <Button mode="contained" onPress={() => router.replace("/(auth)/Loguin")}>Iniciar sesión</Button>
        </Surface>
      );
    }

    if (!session.connected) {
      return (
        <Surface elevation={0} style={[styles.statePanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <MaterialCommunityIcons color="#b45309" name="cloud-off-outline" size={30} />
          <Text selectable style={{ color: palette.title }} variant="titleMedium">Sin conexión</Text>
          <Text selectable style={{ color: palette.copy }} variant="bodyMedium">
            Conéctate con VIDKAR para consultar el saldo y configurar un destino.
          </Text>
          <Button icon="refresh" mode="contained" onPress={handleRetry}>Reconectar y reintentar</Button>
        </Surface>
      );
    }

    if (!session.ready) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator accessibilityLabel="Verificando acceso a Empresa" />
          <Text style={{ color: palette.copy }} variant="bodyMedium">Verificando el acceso a Empresa…</Text>
        </View>
      );
    }

    if (!session.hasAccess) {
      return (
        <Surface elevation={0} style={[styles.statePanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <MaterialCommunityIcons color={palette.brandStrong} name="shield-lock-outline" size={30} />
          <Text selectable style={{ color: palette.title }} variant="titleMedium">Acceso de Empresa no disponible</Text>
          <Text selectable style={{ color: palette.copy }} variant="bodyMedium">
            Esta sección requiere la cuenta propietaria con rol EMPRESA, modo Empresa activo, términos aceptados y acceso no bloqueado.
          </Text>
          <Button onPress={() => router.replace("/(normal)/Main")}>Volver al inicio</Button>
        </Surface>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: palette.background }]}
    >
      {header}
      <ScrollView
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        <View style={styles.page}>
          {!isAuthorized ? renderGate() : (
            <>
              <Surface elevation={0} style={[styles.hero, { backgroundColor: palette.hero, borderColor: palette.border }]}>
                <View style={styles.heroHeading}>
                  <View style={[styles.heroIcon, { backgroundColor: palette.brandSoft }]}>
                    <MaterialCommunityIcons color={palette.brandStrong} name="wallet-outline" size={28} />
                  </View>
                  <View style={styles.flexCopy}>
                    <Text style={{ color: palette.title }} variant="headlineSmall">Fondos y cobros</Text>
                    <Text selectable style={{ color: palette.copy }} variant="bodyMedium">
                      Consulta tus saldos por dominio y moneda y configura tu destino de cobro.
                    </Text>
                  </View>
                  <Button
                    accessibilityLabel="Actualizar saldos y destinos"
                    disabled={loadingSummary || refreshing}
                    icon="refresh"
                    loading={loadingSummary || refreshing}
                    mode="outlined"
                    onPress={handleRetry}
                  >
                    Actualizar
                  </Button>
                </View>
              </Surface>

              <Surface elevation={0} style={[styles.infoPanel, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                <MaterialCommunityIcons color={palette.brandStrong} name="information-outline" size={22} />
                <Text selectable style={[styles.flexCopy, { color: palette.copy }]} variant="bodyMedium">
                  Este panel muestra lo disponible y permite configurar el destino. Las liquidaciones parciales o totales se gestionan desde Administración; aquí no se solicitan ni se procesan pagos.
                </Text>
              </Surface>

              {notice ? (
                <Surface elevation={0} style={[styles.messagePanel, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                  <MaterialCommunityIcons color="#15803d" name="check-circle-outline" size={20} />
                  <Text selectable style={[styles.flexCopy, { color: palette.copy }]} variant="bodyMedium">{notice}</Text>
                </Surface>
              ) : null}

              {summaryError ? (
                <Surface elevation={0} style={[styles.messagePanel, styles.errorPanel, { backgroundColor: palette.card, borderColor: "rgba(185, 28, 28, 0.32)" }]}>
                  <MaterialCommunityIcons color="#b91c1c" name="alert-circle-outline" size={20} />
                  <View style={styles.flexCopy}>
                    <Text selectable style={{ color: palette.title }} variant="titleSmall">No se pudo actualizar el resumen</Text>
                    <Text selectable style={{ color: palette.copy }} variant="bodySmall">{summaryError}</Text>
                  </View>
                  <Button compact disabled={loadingSummary} icon="refresh" onPress={handleRetry}>Reintentar</Button>
                </Surface>
              ) : null}

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <View style={styles.flexCopy}>
                    <Text style={{ color: palette.title }} variant="titleLarge">Fondos disponibles</Text>
                    <Text selectable style={{ color: palette.muted }} variant="bodySmall">
                      Cada saldo conserva su dominio y moneda; no se suman ni se convierten.
                    </Text>
                  </View>
                </View>

                {loadingSummary && !summaryReadyForUser ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator />
                    <Text style={{ color: palette.copy }} variant="bodyMedium">Cargando tu resumen de fondos…</Text>
                  </View>
                ) : null}

                {summaryReadyForUser && currentSummary.balances.length === 0 ? (
                  <Surface elevation={0} style={[styles.emptyPanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={{ color: palette.title }} variant="titleSmall">Todavía no hay saldos</Text>
                    <Text selectable style={{ color: palette.copy }} variant="bodySmall">
                      Cuando existan liquidaciones asociadas a tu cuenta, aparecerán aquí por dominio y moneda.
                    </Text>
                    <Button
                      icon="plus"
                      mode="outlined"
                      onPress={() => openDestinationForm(
                        currentSummary.destinations[0]?.currency || "USD",
                        currentSummary.destinations[0]?.method,
                      )}
                    >
                      Configurar destino
                    </Button>
                  </Surface>
                ) : null}

                {summaryReadyForUser ? currentSummary.balances.map((balance, index) => {
                  const currency = balance.currency || "Moneda no disponible";
                  const destination = currentSummary.destinations.find(
                    (item) => item.currency === balance.currency,
                  );
                  const methodsForCurrency = getAvailableMethodsForCurrency(balance.currency);
                  const statusLabel = !destination
                    ? "Sin configurar"
                    : destination.compatible === false
                      ? "Requiere reconfiguración"
                      : getStatusLabel(destination.status || (destination.compatible ? "COMPATIBLE" : ""));
                  const needsDestinationAttention = !destination
                    || destination.compatible === false
                    || ["INACTIVE", "INCOMPATIBLE", "REQUIRES_RECONFIGURATION"].includes(destination.status);
                  const statusColor = needsDestinationAttention ? "#b45309" : palette.brandStrong;
                  const statusBackground = needsDestinationAttention
                    ? "rgba(180, 83, 9, 0.12)"
                    : palette.brandSoft;
                  const domain = balance.domain === "CURSO"
                    ? "Cursos"
                    : balance.domain === "COMERCIO"
                      ? "Comercio"
                      : balance.domain || "Otro dominio";

                  return (
                    <Surface
                      elevation={0}
                      key={`${balance.domain}-${balance.currency}-${index}`}
                      style={[styles.balanceCard, { backgroundColor: palette.card, borderColor: palette.border }]}
                    >
                      <View style={styles.balanceHeader}>
                        <View style={[styles.smallIcon, { backgroundColor: palette.brandSoft }]}>
                          <MaterialCommunityIcons color={palette.brandStrong} name="cash-multiple" size={19} />
                        </View>
                        <View style={styles.flexCopy}>
                          <Text style={{ color: palette.title }} variant="titleMedium">{domain} · {currency}</Text>
                          <Text style={{ color: palette.muted }} variant="bodySmall">Resumen de liquidaciones</Text>
                        </View>
                      </View>
                      <View style={[styles.availableMetric, { backgroundColor: palette.brandSoft, borderColor: palette.border }]}>
                        <View style={styles.flexCopy}>
                          <Text style={{ color: palette.muted }} variant="labelMedium">Disponible para liquidación</Text>
                          <Text selectable style={[styles.availableValue, { color: (balance.payable || 0) < 0 ? "#b91c1c" : palette.brandStrong }]} variant="headlineSmall">
                            {formatMoney(balance.payable, currency)}
                          </Text>
                        </View>
                        <MaterialCommunityIcons color={palette.brandStrong} name="cash-check" size={26} />
                      </View>
                      <View style={styles.metricsGrid}>
                        <View style={[styles.metric, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                          <Text style={{ color: palette.muted }} variant="labelSmall">Generado</Text>
                          <Text selectable style={[styles.metricValue, { color: palette.title }]} variant="titleSmall">{formatMoney(balance.generated, currency)}</Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                          <Text style={{ color: palette.muted }} variant="labelSmall">Reservado</Text>
                          <Text selectable style={[styles.metricValue, { color: palette.title }]} variant="titleSmall">{formatMoney(balance.reserved, currency)}</Text>
                        </View>
                        <View style={[styles.metric, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                          <Text style={{ color: palette.muted }} variant="labelSmall">Pagado</Text>
                          <Text selectable style={[styles.metricValue, { color: palette.title }]} variant="titleSmall">{formatMoney(balance.paid, currency)}</Text>
                        </View>
                      </View>
                      <View style={[styles.destinationPreview, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                        <View style={[styles.smallIcon, { backgroundColor: palette.brandSoft }]}>
                          <MaterialCommunityIcons
                            color={statusColor}
                            name={destination ? "shield-check-outline" : "shield-alert-outline"}
                            size={19}
                          />
                        </View>
                        <View style={styles.flexCopy}>
                          <Text style={{ color: palette.muted }} variant="labelSmall">Destino de cobro</Text>
                          <Text style={{ color: palette.title }} variant="titleSmall">
                            {destination ? getMethodLabel(destination.method, destination.currency) : "Sin configurar"}
                          </Text>
                          {destination?.masked ? (
                            <Text selectable style={{ color: palette.muted }} variant="bodySmall">
                              Dato enmascarado: {destination.masked}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          selectable
                          style={[styles.destinationStatus, { backgroundColor: statusBackground, color: statusColor }]}
                          variant="labelSmall"
                        >
                          {statusLabel}
                        </Text>
                      </View>
                      <Button
                        accessibilityLabel={`${destination ? "Actualizar" : "Configurar"} destino de cobro para ${currency}`}
                        disabled={!methodsForCurrency.length || saving}
                        icon={destination ? "pencil-outline" : "plus"}
                        mode={destination ? "outlined" : "contained"}
                        onPress={() => openDestinationForm(balance.currency, destination?.method)}
                        style={styles.balanceAction}
                      >
                        {destination ? "Actualizar destino" : "Configurar destino"}
                      </Button>
                      {!methodsForCurrency.length ? (
                        <HelperText type={remesaOptionsLoading && balance.currency === "CUP" ? "info" : "error"} visible>
                          {balance.currency === "CUP" && remesaOptionsLoading
                            ? "Verificando las opciones activas de REMESA…"
                            : balance.currency === "CUP" && remesaOptionsError
                              ? remesaOptionsError
                              : `No hay métodos de destino habilitados para ${currency}.`}
                        </HelperText>
                      ) : null}
                    </Surface>
                  );
                }) : null}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <View style={styles.flexCopy}>
                    <Text style={{ color: palette.title }} variant="titleLarge">Destinos configurados</Text>
                    <Text selectable style={{ color: palette.muted }} variant="bodySmall">
                      Solo se muestran el método, la moneda y la máscara devuelta por el servidor.
                    </Text>
                  </View>
                </View>

                {summaryReadyForUser && currentSummary.destinations.length === 0 ? (
                  <Surface elevation={0} style={[styles.emptyPanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={{ color: palette.title }} variant="titleSmall">No hay destinos configurados</Text>
                    <Text selectable style={{ color: palette.copy }} variant="bodySmall">
                      Configura un destino desde la tarjeta del saldo de la misma moneda.
                    </Text>
                  </Surface>
                ) : null}

                {summaryReadyForUser ? currentSummary.destinations.map((destination, index) => {
                  const statusLabel = destination.compatible === false
                    ? "Requiere reconfiguración"
                    : getStatusLabel(destination.status || (destination.compatible ? "COMPATIBLE" : ""));

                  return (
                    <Surface
                      elevation={0}
                      key={`${destination.method}-${destination.currency}-${index}`}
                      style={[styles.destinationCard, { backgroundColor: palette.card, borderColor: palette.border }]}
                    >
                      <View style={styles.destinationHeader}>
                        <View style={[styles.smallIcon, { backgroundColor: palette.brandSoft }]}>
                          <MaterialCommunityIcons color={palette.brandStrong} name="shield-check-outline" size={19} />
                        </View>
                        <View style={styles.flexCopy}>
                          <Text style={{ color: palette.title }} variant="titleSmall">{getMethodLabel(destination.method, destination.currency)}</Text>
                          <Text selectable style={{ color: palette.muted }} variant="bodySmall">Moneda: {destination.currency || "No disponible"}</Text>
                        </View>
                        <Text
                          selectable
                          style={[
                            styles.destinationStatus,
                            { backgroundColor: destination.compatible === false ? "rgba(180, 83, 9, 0.12)" : palette.brandSoft, color: destination.compatible === false ? "#b45309" : palette.brandStrong },
                          ]}
                          variant="labelSmall"
                        >
                          {statusLabel}
                        </Text>
                      </View>
                      <Divider style={{ backgroundColor: palette.border, marginVertical: 10 }} />
                      <View style={styles.maskedRow}>
                        <Text style={{ color: palette.muted }} variant="bodySmall">Dato enmascarado</Text>
                        <Text selectable style={[styles.maskedValue, { color: palette.title }]} variant="titleSmall">
                          {destination.masked || "Máscara no disponible"}
                        </Text>
                      </View>
                      {destination.version !== null ? (
                        <Text selectable style={{ color: palette.muted }} variant="bodySmall">Versión del destino: {destination.version}</Text>
                      ) : null}
                      <Button
                        accessibilityLabel={`Actualizar destino ${destination.currency}`}
                        disabled={!getAvailableMethodsForCurrency(destination.currency).length || saving}
                        icon="pencil-outline"
                        mode="outlined"
                        onPress={() => openDestinationForm(destination.currency, destination.method)}
                        style={styles.destinationAction}
                      >
                        Actualizar destino
                      </Button>
                    </Surface>
                  );
                }) : null}
              </View>

              <Portal>
                <Dialog
                  dismissable={!saving}
                  onDismiss={closeDestinationDialog}
                  style={[styles.destinationDialog, { backgroundColor: palette.card }]}
                  visible={destinationDialogVisible}
                >
                  <Dialog.Title style={{ color: palette.title }}>Configurar destino · {form.currency}</Dialog.Title>
                  <Dialog.ScrollArea
                    style={[
                      styles.destinationDialogScrollArea,
                      { maxHeight: Math.max(240, Math.min(540, height * 0.62)) },
                    ]}
                  >
                    <ScrollView
                      contentContainerStyle={styles.formContent}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      <Text selectable style={{ color: palette.copy }} variant="bodySmall">
                        Se guarda un destino por moneda. Si ya existe uno, vuelve a ingresar todos sus datos: el formulario nunca los recupera.
                      </Text>

                      <Surface elevation={0} style={[styles.privacyPanel, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                        <MaterialCommunityIcons color={palette.brandStrong} name="lock-outline" size={20} />
                        <Text selectable style={[styles.flexCopy, { color: palette.copy }]} variant="bodySmall">
                          Los datos se guardan en la base de datos de VIDKAR sin cifrado adicional de aplicación. Este dispositivo no los persiste localmente; el resumen solo muestra una máscara y un operador autorizado ve el detalle al procesar el pago. No ingreses contraseñas, códigos, PIN ni CVV.
                        </Text>
                      </Surface>

                {renderOptionMenu({
                  id: "method",
                  label: "Método de cobro",
                  onSelect: selectMethod,
                  options: availableMethods,
                  valueLabel: getMethodLabel(form.method, form.currency),
                })}
                {remesaOptionsLoading ? (
                  <HelperText type="info" visible>
                    Cargando las monedas y métodos de entrega activos para REMESA…
                  </HelperText>
                ) : remesaOptionsError ? (
                  <HelperText type="error" visible>{remesaOptionsError}</HelperText>
                ) : !supportsRemesa ? (
                  <HelperText type="info" visible>
                    REMESA solo aparece cuando hay una moneda y un método de entrega habilitados por el servidor.
                  </HelperText>
                ) : null}

                <View style={styles.field}>
                  <Text style={{ color: palette.copy }} variant="labelLarge">
                    {form.method === "REMESA" ? "Moneda del saldo de origen" : "Moneda del destino"}
                  </Text>
                  {formCurrencies.length > 1 ? (
                    <SegmentedButtons
                      buttons={formCurrencies.map((currency) => ({ label: currency, value: currency }))}
                      onValueChange={selectSourceCurrency}
                      value={form.currency}
                    />
                  ) : (
                    <Surface elevation={0} style={[styles.currencyLock, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                      <MaterialCommunityIcons color={palette.brandStrong} name="check-circle-outline" size={19} />
                      <Text style={{ color: palette.title }} variant="titleSmall">{form.currency} · moneda permitida para este método</Text>
                    </Surface>
                  )}
                </View>

                <TextInput
                  accessibilityLabel={form.method === "REMESA" ? "Nombre del titular o destinatario" : "Nombre del titular del destino"}
                  autoCapitalize="words"
                  disabled={saving}
                  label={form.method === "REMESA" ? "Nombre del titular o destinatario" : "Nombre del titular"}
                  maxLength={120}
                  mode="outlined"
                  onChangeText={(holderName) => updateForm({ holderName })}
                  style={[styles.input, { backgroundColor: palette.input }]}
                  value={form.holderName}
                />

                {form.method === "PAYPAL" || form.method === "MERCADOPAGO" ? (
                  <TextInput
                    accessibilityLabel={form.method === "PAYPAL" ? "Identificador de PayPal" : "Identificador de Mercado Pago"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    disabled={saving}
                    label={form.method === "PAYPAL" ? "Correo o identificador de PayPal" : "Correo, alias o identificador de Mercado Pago"}
                    maxLength={180}
                    mode="outlined"
                    onChangeText={(recipientIdentifier) => updateForm({ recipientIdentifier })}
                    style={[styles.input, { backgroundColor: palette.input }]}
                    value={form.recipientIdentifier}
                  />
                ) : null}

                {form.method === "TRANSFERENCIA" ? (
                  <>
                    <TextInput
                      accessibilityLabel="Nombre del banco en Uruguay"
                      autoCapitalize="words"
                      disabled={saving}
                      label="Banco en Uruguay"
                      maxLength={100}
                      mode="outlined"
                      onChangeText={(bankName) => updateForm({ bankName })}
                      style={[styles.input, { backgroundColor: palette.input }]}
                      value={form.bankName}
                    />
                    {renderOptionMenu({
                      id: "accountType",
                      label: "Tipo de cuenta",
                      onSelect: (accountType) => {
                        updateForm({ accountType });
                        setOpenMenu("");
                      },
                      options: ACCOUNT_TYPES,
                      valueLabel: ACCOUNT_TYPES.find((option) => option.value === form.accountType)?.label || "Selecciona el tipo de cuenta",
                    })}
                    <TextInput
                      accessibilityLabel="Número de cuenta bancaria"
                      autoCapitalize="none"
                      autoCorrect={false}
                      disabled={saving}
                      label="Número de cuenta"
                      maxLength={80}
                      mode="outlined"
                      onChangeText={(accountNumber) => updateForm({ accountNumber })}
                      style={[styles.input, { backgroundColor: palette.input }]}
                      value={form.accountNumber}
                    />
                    <TextInput
                      accessibilityLabel="Sucursal bancaria opcional"
                      disabled={saving}
                      label="Sucursal (opcional)"
                      maxLength={80}
                      mode="outlined"
                      onChangeText={(branch) => updateForm({ branch })}
                      style={[styles.input, { backgroundColor: palette.input }]}
                      value={form.branch}
                    />
                    {renderOptionMenu({
                      id: "documentType",
                      label: "Documento (opcional)",
                      onSelect: (documentType) => {
                        updateForm((current) => ({
                          ...current,
                          documentNumber: documentType ? current.documentNumber : "",
                          documentType,
                        }));
                        setOpenMenu("");
                      },
                      options: [{ label: "No informar", value: "" }, ...DOCUMENT_TYPES],
                      valueLabel: DOCUMENT_TYPES.find((option) => option.value === form.documentType)?.label || "No informar",
                    })}
                    {form.documentType ? (
                      <TextInput
                        accessibilityLabel="Número de documento opcional"
                        autoCapitalize="characters"
                        disabled={saving}
                        label="Número de documento"
                        maxLength={50}
                        mode="outlined"
                        onChangeText={(documentNumber) => updateForm({ documentNumber })}
                        style={[styles.input, { backgroundColor: palette.input }]}
                        value={form.documentNumber}
                      />
                    ) : null}
                  </>
                ) : null}

                {form.method === "REMESA" ? (
                  <>
                    <Surface elevation={0} style={[styles.currencyLock, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                      <MaterialCommunityIcons color={palette.brandStrong} name="cash-check" size={19} />
                      <Text selectable style={[styles.flexCopy, { color: palette.copy }]} variant="bodySmall">
                        {form.currency === "CUP"
                          ? "Saldo CUP (FONDO): solo entrega CUP por el mismo importe, sin conversión ni cotización."
                          : "Saldo USD: REMESA usa el flujo normal de cotización cuando se inicia; aquí solo se configura el destino."}
                      </Text>
                    </Surface>
                    <View style={styles.field}>
                      <Text style={{ color: palette.copy }} variant="labelLarge">Moneda de entrega en Cuba</Text>
                      {remesaCurrenciesForForm.length > 1 ? (
                        <SegmentedButtons
                          buttons={remesaCurrenciesForForm.map((currency) => ({ label: currency, value: currency }))}
                          onValueChange={selectRemesaCurrency}
                          value={form.monedaRecibirEnCuba}
                        />
                      ) : remesaCurrenciesForForm.length === 1 ? (
                        <Surface elevation={0} style={[styles.currencyLock, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                          <MaterialCommunityIcons color={palette.brandStrong} name="check-circle-outline" size={19} />
                          <Text style={{ color: palette.title }} variant="titleSmall">
                            {remesaCurrenciesForForm[0]} · moneda de entrega habilitada
                          </Text>
                        </Surface>
                      ) : (
                        <HelperText type="error" visible>No hay monedas de entrega activas para este saldo.</HelperText>
                      )}
                    </View>
                    <View style={styles.field}>
                      <Text style={{ color: palette.copy }} variant="labelLarge">Método de entrega en Cuba</Text>
                      {activeDeliveryMethods.length > 1 ? (
                        <SegmentedButtons
                          buttons={activeDeliveryMethods}
                          onValueChange={(remesaMethod) => updateForm({ remesaMethod, direccionCuba: "", tarjetaCUP: "" })}
                          value={form.remesaMethod}
                        />
                      ) : activeDeliveryMethods.length === 1 ? (
                        <Surface elevation={0} style={[styles.currencyLock, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                          <Text style={{ color: palette.title }} variant="titleSmall">{activeDeliveryMethods[0]?.label || "Sin método activo"}</Text>
                        </Surface>
                      ) : (
                        <HelperText type="error" visible>No hay métodos de entrega activos para esa moneda.</HelperText>
                      )}
                    </View>
                    {form.remesaMethod === "EFECTIVO" ? (
                      <TextInput
                        accessibilityLabel="Dirección de entrega en Cuba"
                        disabled={saving}
                        label="Dirección de entrega en Cuba"
                        maxLength={300}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        onChangeText={(direccionCuba) => updateForm({ direccionCuba })}
                        style={[styles.input, styles.multilineInput, { backgroundColor: palette.input }]}
                        value={form.direccionCuba}
                      />
                    ) : form.remesaMethod === "TRANSFERENCIA" ? (
                      <TextInput
                        accessibilityLabel="Tarjeta CUP de 16 dígitos"
                        disabled={saving}
                        keyboardType="number-pad"
                        label="Tarjeta CUP · 16 dígitos"
                        maxLength={19}
                        mode="outlined"
                        onChangeText={(tarjetaCUP) => updateForm({ tarjetaCUP: formatCardNumber(tarjetaCUP) })}
                        placeholder="0000 0000 0000 0000"
                        style={[styles.input, { backgroundColor: palette.input }]}
                        value={form.tarjetaCUP}
                      />
                    ) : null}
                  </>
                ) : null}

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ownershipConfirmed }}
                  disabled={saving}
                  onPress={() => {
                    setOwnershipState({ confirmed: !ownershipConfirmed, ownerId: session.userId || "" });
                    setFormError("");
                  }}
                  style={({ pressed }) => [
                    styles.confirmationRow,
                    { backgroundColor: palette.cardSoft, borderColor: palette.border },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View pointerEvents="none">
                    <Checkbox status={ownershipConfirmed ? "checked" : "unchecked"} />
                  </View>
                  <Text selectable style={[styles.flexCopy, { color: palette.title }]} variant="bodyMedium">
                    Confirmo que soy titular o estoy autorizado para usar este destino.
                  </Text>
                </Pressable>

                {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}
                    </ScrollView>
                  </Dialog.ScrollArea>
                  <Dialog.Actions>
                    <Button disabled={saving} onPress={closeDestinationDialog}>Cancelar</Button>
                    <Button
                      disabled={saving || !session.connected || !session.hasAccess}
                      icon="content-save-outline"
                      loading={saving}
                      mode="contained"
                      onPress={handleSaveDestination}
                    >
                      Guardar
                    </Button>
                  </Dialog.Actions>
                </Dialog>
              </Portal>

              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <View style={styles.flexCopy}>
                    <Text style={{ color: palette.title }} variant="titleLarge">Historial de solicitudes</Text>
                    <Text selectable style={{ color: palette.muted }} variant="bodySmall">
                      Historial de solicitudes asociadas a tu cuenta; es de solo lectura.
                    </Text>
                  </View>
                </View>

                {summaryReadyForUser && currentSummary.manualRequests.length === 0 ? (
                  <Surface elevation={0} style={[styles.emptyPanel, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={{ color: palette.title }} variant="titleSmall">Sin solicitudes registradas</Text>
                    <Text selectable style={{ color: palette.copy }} variant="bodySmall">
                      Administración procesa las liquidaciones desde su pantalla autorizada. Este apartado no crea solicitudes ni procesa o concilia pagos.
                    </Text>
                  </Surface>
                ) : null}

                {summaryReadyForUser ? currentSummary.manualRequests.map((request) => (
                  <Surface
                    elevation={0}
                    key={request.id}
                    style={[styles.historyCard, { backgroundColor: palette.card, borderColor: palette.border }]}
                  >
                    <View style={[styles.smallIcon, { backgroundColor: palette.brandSoft }]}>
                      <MaterialCommunityIcons color={palette.brandStrong} name="history" size={19} />
                    </View>
                    <View style={styles.flexCopy}>
                      <Text style={{ color: palette.title }} variant="titleSmall">{getStatusLabel(request.status)}</Text>
                      <Text selectable style={{ color: palette.muted }} variant="bodySmall">
                        {[getMethodLabel(request.method, request.currency), request.currency, request.domain].filter(Boolean).join(" · ") || "Solicitud de liquidación"}
                      </Text>
                      <Text selectable style={{ color: palette.muted }} variant="bodySmall">{formatDate(request.createdAt)}</Text>
                    </View>
                    {request.amount !== null ? (
                      <Text selectable style={[styles.historyAmount, { color: palette.title }]} variant="titleSmall">
                        {formatMoney(request.amount, request.currency)}
                      </Text>
                    ) : null}
                  </Surface>
                )) : null}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { alignSelf: "center", gap: 16, paddingTop: 18, width: "100%" },
  page: { gap: 16 },
  hero: { borderRadius: 22, borderWidth: 1, gap: 14, padding: 18 },
  heroHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12 },
  heroIcon: { alignItems: "center", borderRadius: 17, height: 52, justifyContent: "center", width: 52 },
  flexCopy: { flex: 1, minWidth: 0 },
  infoPanel: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  messagePanel: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 13 },
  errorPanel: { alignItems: "flex-start" },
  section: { gap: 10 },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: 10 },
  loadingState: { alignItems: "center", gap: 10, padding: 24 },
  statePanel: { alignItems: "center", borderRadius: 22, borderWidth: 1, gap: 12, padding: 22 },
  emptyPanel: { borderRadius: 18, borderWidth: 1, gap: 6, padding: 16 },
  balanceCard: { borderRadius: 20, borderWidth: 1, gap: 14, padding: 15 },
  balanceHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  availableMetric: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, justifyContent: "space-between", padding: 15 },
  availableValue: { fontVariant: ["tabular-nums"], marginTop: 4 },
  smallIcon: { alignItems: "center", borderRadius: 13, height: 38, justifyContent: "center", width: 38 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { borderRadius: 13, borderWidth: 1, flexBasis: "46%", flexGrow: 1, gap: 4, minWidth: 120, padding: 11 },
  metricValue: { fontVariant: ["tabular-nums"], marginTop: 2 },
  destinationPreview: { alignItems: "center", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  destinationCard: { borderRadius: 18, borderWidth: 1, gap: 2, padding: 15 },
  destinationHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  destinationStatus: { borderRadius: 999, flexShrink: 1, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  maskedRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  maskedValue: { fontVariant: ["tabular-nums"] },
  balanceAction: { alignSelf: "stretch" },
  destinationAction: { alignSelf: "flex-start", marginTop: 8 },
  destinationDialog: { maxWidth: 560 },
  destinationDialogScrollArea: { flexGrow: 1 },
  formContent: { gap: 12, paddingHorizontal: 4, paddingVertical: 8 },
  privacyPanel: { alignItems: "flex-start", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  field: { gap: 6 },
  input: { marginBottom: 2 },
  multilineInput: { minHeight: 96 },
  selectButton: { alignSelf: "stretch", borderRadius: 12 },
  selectButtonContent: { justifyContent: "space-between", minHeight: 44 },
  currencyLock: { alignItems: "center", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  confirmationRow: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 9, paddingVertical: 5 },
  pressed: { opacity: 0.78 },
  historyCard: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 13 },
  historyAmount: { fontVariant: ["tabular-nums"], textAlign: "right" },
});

export default FondosCobrosContent;