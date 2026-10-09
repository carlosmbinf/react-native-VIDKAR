import * as Crypto from "expo-crypto";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Searchbar,
  SegmentedButtons,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import { isPrincipalAdmin } from "../../services/mcp/mcpAccess";
import {
  buildSettlementDestinationPayload,
  buildSettlementHistoryFilters,
  EMPTY_SETTLEMENT_DESTINATION,
  formatSettlementDate,
  formatSettlementMoney,
  getRemesaCurrenciesForBalance,
  getSettlementMethodsForCurrency,
  isSettlementDestinationCompatible,
  parseSettlementRemesaOptions,
  SETTLEMENT_METHODS,
  SETTLEMENT_STATUSES,
  validateSettlementDestination,
} from "../../services/settlementAdmin";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
  MeteorBase
);

const PAGE_SIZE = 25;
const DEFAULT_HISTORY_FILTERS = {
  kind: "ALL",
  domain: "",
  currency: "",
  status: "",
  paymentType: "",
  paymentMethod: "",
  from: "",
  to: "",
  search: "",
};
const FILTER_KIND_OPTIONS = [
  { label: "Todo", value: "ALL" },
  { label: "Pagos", value: "PAYMENTS" },
  { label: "Solicitudes", value: "REQUESTS" },
  { label: "Histórico", value: "HISTORICAL" },
];
const FILTER_DOMAIN_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Comercio", value: "COMERCIO" },
  { label: "Curso", value: "CURSO" },
];
const FILTER_CURRENCY_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "CUP", value: "CUP" },
  { label: "USD", value: "USD" },
  { label: "UYU", value: "UYU" },
];
const FILTER_STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Reservado", value: "RESERVED" },
  { label: "En proceso", value: "IN_PROCESS" },
  { label: "Incierto", value: "UNKNOWN" },
  { label: "Pagado", value: "PAID" },
  { label: "Fallido", value: "FAILED" },
  { label: "Cancelado", value: "CANCELED" },
  { label: "Histórico", value: "HISTORICAL" },
];
const FILTER_PAYMENT_TYPE_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Total", value: "TOTAL" },
  { label: "Parcial", value: "PARTIAL" },
];
const FILTER_METHOD_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "PayPal", value: "PAYPAL" },
  { label: "Mercado Pago", value: "MERCADOPAGO" },
  { label: "Banco Uruguay", value: "TRANSFERENCIA" },
  { label: "Remesa", value: "REMESA" },
  { label: "Otro histórico", value: "OTRO" },
];
const ACCOUNT_TYPE_OPTIONS = [
  { label: "Corriente", value: "CORRIENTE" },
  { label: "Ahorro", value: "AHORRO" },
  { label: "Otro", value: "OTRO" },
];
const DOCUMENT_TYPE_OPTIONS = [
  { label: "CI", value: "CI" },
  { label: "RUT", value: "RUT" },
  { label: "Pasaporte", value: "PASSPORT" },
  { label: "Otro", value: "OTRO" },
];
const MANUAL_PENDING_STATUSES = ["RESERVED", "IN_PROCESS", "UNKNOWN"];
const ROLE_LABELS = {
  STORE_OWNER: "Dueño de tienda",
  VIDKAR: "Comisión VIDKAR",
  PROFESSOR: "Profesor",
  ADMIN: "Comisión de administrador",
  GENERAL_ADMIN: "Comisión general",
};

const callMeteorMethod = (method, ...args) => new Promise((resolve, reject) => {
  try {
    Meteor.call(method, ...args, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  } catch (error) {
    reject(error);
  }
});

const getErrorMessage = (error, fallback) =>
  error?.reason || error?.message || fallback;

const parseAmountMinor = (value) => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amountMinor = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
};

const getManualMethodLabel = (request) =>
  request.paymentMethod === "REMESA" && request.currency === "CUP"
    ? "FONDO · Remesa CUP"
    : SETTLEMENT_METHODS[request.paymentMethod] || request.paymentMethod;

const getPaymentMethodLabel = (payment) =>
  payment.paymentMethod === "REMESA" && payment.currency === "CUP"
    ? "FONDO · Remesa CUP"
    : SETTLEMENT_METHODS[payment.paymentMethod] || payment.paymentMethod;

const getRequestActionLabel = (request) => {
  if (request.paymentMethod === "REMESA") {
    return request.status === "RESERVED" ? "Crear remesa interna" : "Revisar entrega";
  }
  return request.status === "RESERVED" ? "Iniciar envío manual" : "Revisar y conciliar";
};

const getStatusColor = (status, palette) => {
  if (status === "PAID") return palette.success;
  if (status === "FAILED" || status === "CANCELED") return palette.muted;
  if (status === "UNKNOWN") return palette.warning;
  return palette.accent;
};

const InfoCard = ({ children, title, type = "info", palette }) => {
  const tone = type === "error" ? palette.error : type === "warning" ? palette.warning : palette.accent;
  return (
    <Surface
      accessibilityRole="summary"
      elevation={0}
      style={[styles.infoCard, { backgroundColor: `${tone}16`, borderColor: `${tone}55` }]}
    >
      {title ? <Text selectable style={[styles.infoTitle, { color: tone }]}>{title}</Text> : null}
      {typeof children === "string"
        ? <Text selectable style={[styles.bodyText, { color: palette.copy }]}>{children}</Text>
        : children}
    </Surface>
  );
};

const ChipGroup = ({ label, options, value, onChange, palette, disabled = false }) => (
  <View style={styles.chipGroup}>
    <Text variant="labelLarge" style={{ color: palette.title }}>{label}</Text>
    <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
      {options.map((option) => (
        <Chip
          key={`${label}:${option.value || "all"}`}
          compact
          disabled={disabled}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
          style={styles.filterChip}
          accessibilityLabel={`${label}: ${option.label}`}
        >
          {option.label}
        </Chip>
      ))}
    </ScrollView>
  </View>
);

const PaginationBar = ({ page, total, onPageChange, disabled, palette }) => {
  const first = total ? page * PAGE_SIZE + 1 : 0;
  const last = Math.min((page + 1) * PAGE_SIZE, total);
  return (
    <View style={styles.pagination}>
      <IconButton
        accessibilityLabel="Página anterior"
        icon="chevron-left"
        disabled={disabled || page === 0}
        onPress={() => onPageChange(page - 1)}
      />
      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
        {first}–{last} de {total}
      </Text>
      <IconButton
        accessibilityLabel="Página siguiente"
        icon="chevron-right"
        disabled={disabled || (page + 1) * PAGE_SIZE >= total}
        onPress={() => onPageChange(page + 1)}
      />
    </View>
  );
};

const BalanceCard = ({
  balance,
  destination,
  isWide,
  canRegister,
  isOwnBeneficiary,
  working,
  manualWorking,
  onOpenPayment,
  onOpenDestination,
  palette,
}) => {
  const payable = Number(balance.payable);
  const canPrepare = canRegister
    && Number.isFinite(payable)
    && payable > 0
    && !balance.reconciliationRequired
    && !working
    && !manualWorking
    && destination?.status === "BENEFICIARY_CONFIRMED"
    && isSettlementDestinationCompatible(destination);
  return (
    <Surface elevation={1} style={[styles.balanceCard, isWide && styles.balanceCardWide, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardHeading}>
        <Chip compact>{balance.domain} · {balance.currency}</Chip>
        <Text variant="labelLarge" style={{ color: palette.muted }}>Disponible para reservar</Text>
      </View>
      <Text selectable variant="headlineSmall" style={[styles.balanceValue, { color: payable < 0 ? palette.error : palette.title }]}>
        {formatSettlementMoney(balance.payable, balance.currency)}
      </Text>
      <View style={styles.balanceStats}>
        <Text selectable variant="bodySmall" style={[styles.bodyText, { color: palette.copy }]}>
          Generado: {formatSettlementMoney(balance.generated, balance.currency)}
        </Text>
        <Text selectable variant="bodySmall" style={[styles.bodyText, { color: palette.copy }]}>
          Pagado: {formatSettlementMoney(balance.paid, balance.currency)}
        </Text>
        <Text selectable variant="bodySmall" style={[styles.bodyText, { color: palette.copy }]}>
          Reservado: {formatSettlementMoney(balance.reserved, balance.currency)}
        </Text>
      </View>
      {balance.reconciliationRequired ? (
        <InfoCard type="warning" title="Conciliación requerida" palette={palette}>
          Pagos históricos por {formatSettlementMoney(balance.historicalPaid, "USD")} no tienen imputación por venta. No se puede preparar una nueva liquidación de curso.
        </InfoCard>
      ) : null}
      {Number(balance.balance) < 0 ? (
        <InfoCard type="warning" palette={palette}>
          Hay pagos de ventas que ya no son elegibles. Este ajuste reduce las futuras liquidaciones.
        </InfoCard>
      ) : null}
      <Divider style={styles.divider} />
      <Text variant="labelLarge" style={{ color: palette.title }}>Destino de cobro</Text>
      {destination ? (
        <View style={styles.destinationSummary}>
          <Text selectable style={[styles.bodyText, { color: palette.copy }]}>
            {SETTLEMENT_METHODS[destination.method] || destination.method}
            {destination.country ? ` · ${destination.country}` : ""}
          </Text>
          <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
            {destination.masked || "Sin máscara"} · versión {destination.version || "—"}
          </Text>
          {destination.status !== "BENEFICIARY_CONFIRMED" || !isSettlementDestinationCompatible(destination) ? (
            <Text selectable variant="bodySmall" style={{ color: palette.warning }}>
              El destino requiere reconfiguración o no es compatible con esta moneda.
            </Text>
          ) : null}
        </View>
      ) : (
        <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
          No hay destino confirmado para {balance.currency}.
        </Text>
      )}
      {isOwnBeneficiary ? (
        <Button
          compact
          icon="pencil-outline"
          mode="outlined"
          onPress={() => onOpenDestination(balance.currency)}
          style={styles.inlineButton}
        >
          {destination ? "Actualizar destino" : "Configurar destino"}
        </Button>
      ) : null}
      {balance.currency === "CUP" ? (
        <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
          CUP se liquida solo mediante FONDO: la remesa entrega exactamente el mismo importe CUP, sin conversión.
        </Text>
      ) : null}
      {canRegister ? (
        <View style={styles.balanceActions}>
          <Button
            accessibilityLabel={`Preparar pago total de ${balance.payable} ${balance.currency}`}
            disabled={!canPrepare}
            icon={balance.currency === "CUP" ? "bank-transfer" : "cash-check"}
            mode="contained"
            onPress={() => onOpenPayment(balance, "TOTAL")}
            style={styles.actionButton}
          >
            Total
          </Button>
          <Button
            accessibilityLabel={`Preparar pago parcial de ${balance.payable} ${balance.currency}`}
            disabled={!canPrepare}
            icon="cash-minus"
            mode="outlined"
            onPress={() => onOpenPayment(balance, "PARTIAL")}
            style={styles.actionButton}
          >
            Parcial
          </Button>
        </View>
      ) : null}
      {canRegister && !canPrepare && payable > 0 && !balance.reconciliationRequired ? (
        <Text selectable variant="bodySmall" style={{ color: palette.warning }}>
          Confirma un destino compatible en {balance.currency} antes de reservar este saldo.
        </Text>
      ) : null}
    </Surface>
  );
};

const HistoryRequestCard = ({ request, canRegister, manualWorking, onManage, onCancel, onOpenRemesa, palette }) => {
  const isPending = MANUAL_PENDING_STATUSES.includes(request.status);
  const statusColor = getStatusColor(request.status, palette);
  return (
    <Surface elevation={0} style={[styles.historyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
      <View style={styles.cardHeading}>
        <View style={styles.historyTitle}>
          <Text selectable variant="titleSmall" style={{ color: palette.title }}>
            {formatSettlementMoney(request.amount, request.currency)} · {request.domain}
          </Text>
          <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
            {getManualMethodLabel(request)} · {request.paymentType === "TOTAL" ? "Total" : "Parcial"}
          </Text>
        </View>
        <Chip compact textStyle={{ color: statusColor }}>{SETTLEMENT_STATUSES[request.status] || request.status}</Chip>
      </View>
      <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
        {formatSettlementDate(request.createdAt)} · destino {request.destinationMask || "no disponible"}
      </Text>
      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>Solicitud {request._id}</Text>
      {request.paymentReference ? (
        <Text selectable variant="bodySmall" style={{ color: palette.copy }}>Referencia: {request.paymentReference}</Text>
      ) : null}
      {request.resolutionReason ? (
        <Text selectable variant="bodySmall" style={{ color: palette.copy }}>Motivo: {request.resolutionReason}</Text>
      ) : null}
      {request.blockedBySaleReversal ? (
        <InfoCard type="warning" palette={palette}>
          {request.blockedReason || "La venta fue revertida."} No inicies otra operación; verifica el resultado real antes de resolver la reserva.
        </InfoCard>
      ) : null}
      {request.remesaSaleId ? (
        <Button compact icon="open-in-new" mode="text" onPress={onOpenRemesa}>
          Ver remesa {request.remesaSaleId}
        </Button>
      ) : null}
      {canRegister && isPending ? (
        <View style={styles.historyActions}>
          <Button
            compact
            disabled={manualWorking}
            icon={request.paymentMethod === "REMESA" ? "bank-transfer" : "clipboard-check-outline"}
            mode="outlined"
            onPress={() => onManage(request)}
          >
            {getRequestActionLabel(request)}
          </Button>
          {request.status === "RESERVED" ? (
            <Button compact disabled={manualWorking} icon="cancel" mode="text" onPress={() => onCancel(request)}>
              Cancelar reserva
            </Button>
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
};

const PaymentHistoryCard = ({ payment, onAllocation, onOpenRemesa, palette }) => (
  <Surface elevation={0} style={[styles.historyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
    <View style={styles.cardHeading}>
      <View style={styles.historyTitle}>
        <Text selectable variant="titleSmall" style={{ color: palette.title }}>
          {formatSettlementMoney(payment.amount, payment.currency)} · {payment.domain}
        </Text>
        <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
          {payment.paymentType === "TOTAL" ? "Total" : "Parcial"} · {getPaymentMethodLabel(payment)}
        </Text>
      </View>
      <Chip compact textStyle={{ color: palette.success }}>{SETTLEMENT_STATUSES.PAID}</Chip>
    </View>
    <Text selectable variant="bodySmall" style={{ color: palette.copy }}>{formatSettlementDate(payment.createdAt)}</Text>
    <Text selectable variant="bodySmall" style={{ color: palette.copy }}>Referencia: {payment.paymentReference || "No disponible"}</Text>
    {Number(payment.feeAmount) > 0 ? (
      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
        Comisión asumida por VIDKAR: {formatSettlementMoney(payment.feeAmount, payment.feeCurrency)}
      </Text>
    ) : null}
    {payment.notes ? <Text selectable variant="bodySmall" style={{ color: palette.copy }}>{payment.notes}</Text> : null}
    {payment.remesaSaleId ? (
      <Button compact icon="open-in-new" mode="text" onPress={onOpenRemesa}>Ver remesa {payment.remesaSaleId}</Button>
    ) : null}
    <Button compact icon="format-list-bulleted" mode="outlined" onPress={() => onAllocation(payment)}>
      Ver imputación FIFO
    </Button>
  </Surface>
);

const HistoricalPaymentCard = ({ payment, onOpenCourseLedger, palette }) => (
  <Surface elevation={0} style={[styles.historyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
    <View style={styles.cardHeading}>
      <Text selectable variant="titleSmall" style={{ color: palette.title }}>
        {formatSettlementMoney(payment.amountUsd, "USD")}
      </Text>
      <Chip compact textStyle={{ color: palette.warning }}>{SETTLEMENT_STATUSES.HISTORICAL}</Chip>
    </View>
    <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
      {formatSettlementDate(payment.createdAt)} · {payment.paymentReference || payment.paymentMethod || "Sin referencia"}
    </Text>
    <Button compact icon="book-open-variant" mode="text" onPress={onOpenCourseLedger}>
      Consultar libro histórico
    </Button>
  </Surface>
);

const LineCard = ({ line, palette }) => (
  <Surface elevation={0} style={[styles.historyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
    <View style={styles.cardHeading}>
      <Text selectable variant="titleSmall" style={[styles.historyTitle, { color: palette.title }]}>{line.label || line.saleId}</Text>
      <Chip compact>{line.domain} · {line.currency}</Chip>
    </View>
    <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
      Venta {line.saleId} · ítem {line.itemKey} · {formatSettlementDate(line.createdAt)}
    </Text>
    <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
      {ROLE_LABELS[line.role] || line.role} · {line.method}
    </Text>
    {line.domain === "CURSO" ? (
      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
        Bruto {formatSettlementMoney(line.grossAmountUsd, "USD")} · profesor {formatSettlementMoney(line.professorAmountUsd, "USD")} · administrador {formatSettlementMoney(line.adminAmountUsd, "USD")} · general {formatSettlementMoney(line.generalAmountUsd, "USD")}
      </Text>
    ) : line.role === "VIDKAR" ? (
      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
        Comisión acreditada una sola vez según el valor y moneda registrados en la venta.
      </Text>
    ) : line.ownershipSource === "CURRENT_STORE_FROZEN" ? (
      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
        Propietario histórico resuelto y congelado el {formatSettlementDate(line.attributedAt)}.
      </Text>
    ) : null}
    <View style={styles.lineAmounts}>
      {[
        ["Neto", line.amount],
        ["Pagado", line.paid],
        ["Reservado", line.reserved],
        ["Pendiente", line.pending],
      ].map(([label, amount]) => (
        <View key={label} style={styles.lineAmount}>
          <Text variant="labelSmall" style={{ color: palette.muted }}>{label}</Text>
          <Text selectable variant="bodySmall" style={{ color: palette.title }}>
            {formatSettlementMoney(amount, line.currency)}
          </Text>
        </View>
      ))}
    </View>
  </Surface>
);

const LiquidacionesAdminScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const isWide = width >= 780;
  const palette = useMemo(() => ({
    screen: theme.dark ? "#020617" : "#eef3fb",
    hero: "#0f172a",
    surface: theme.colors.surface,
    nestedSurface: theme.dark ? "#1e293b" : "#f8fafc",
    border: theme.colors.outline,
    title: theme.colors.onSurface,
    copy: theme.colors.onSurfaceVariant,
    muted: theme.colors.onSurfaceVariant,
    accent: "#38bdf8",
    success: "#16a34a",
    warning: "#d97706",
    error: theme.colors.error,
  }), [theme]);
  const { user, userId, connected, userReady } = Meteor.useTracker(() => {
    const currentUserId = Meteor.userId();
    const currentConnected = Boolean(Meteor.status?.()?.connected);
    if (!currentUserId) {
      return { user: null, userId: null, connected: currentConnected, userReady: currentConnected };
    }
    const handle = Meteor.subscribe(
      "user",
      { _id: currentUserId },
      { fields: { username: 1 } },
    );
    return {
      user: Meteor.user(),
      userId: currentUserId,
      connected: currentConnected,
      userReady: handle.ready(),
    };
  });
  const isPrincipal = isPrincipalAdmin(user);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [unassignedIssues, setUnassignedIssues] = useState({ items: [], total: 0 });
  const [targetId, setTargetId] = useState("");
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [beneficiaryDialogVisible, setBeneficiaryDialogVisible] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [lineDomain, setLineDomain] = useState("");
  const [lineCurrency, setLineCurrency] = useState("");
  const [linePage, setLinePage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [manualHistoryPage, setManualHistoryPage] = useState(0);
  const [historicalPage, setHistoricalPage] = useState(0);
  const [historyFilters, setHistoryFilters] = useState({ kind: "ALL" });
  const [historyFilterDraft, setHistoryFilterDraft] = useState(DEFAULT_HISTORY_FILTERS);
  const [appliedHistoryDraft, setAppliedHistoryDraft] = useState(DEFAULT_HISTORY_FILTERS);
  const [historyFilterError, setHistoryFilterError] = useState("");
  const [historyDialogVisible, setHistoryDialogVisible] = useState(false);
  const [paymentForm, setPaymentForm] = useState(null);
  const [paymentWorking, setPaymentWorking] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [destinationDialogVisible, setDestinationDialogVisible] = useState(false);
  const [destinationForm, setDestinationForm] = useState(EMPTY_SETTLEMENT_DESTINATION);
  const [destinationWorking, setDestinationWorking] = useState(false);
  const [destinationError, setDestinationError] = useState("");
  const [remesaOptions, setRemesaOptions] = useState({ currencies: [], deliveryMethods: [] });
  const [remesaOptionsLoading, setRemesaOptionsLoading] = useState(false);
  const [remesaOptionsError, setRemesaOptionsError] = useState("");
  const [manualDetail, setManualDetail] = useState(null);
  const [manualWorking, setManualWorking] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualFeeAmount, setManualFeeAmount] = useState("");
  const [manualFeeCurrency, setManualFeeCurrency] = useState("");
  const [manualSentConfirmed, setManualSentConfirmed] = useState(false);
  const [manualNoTransferConfirmed, setManualNoTransferConfirmed] = useState(false);
  const [manualResolutionReason, setManualResolutionReason] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    setTargetId(userId || "");
    setLinePage(0);
    setHistoryPage(0);
    setManualHistoryPage(0);
    setHistoricalPage(0);
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!isPrincipal || !userReady || !userId) {
      setCatalogLoading(false);
      setBeneficiaries([]);
      return () => { active = false; };
    }
    if (!connected) {
      setCatalogError("Sin conexión con VIDKAR. Reconecta y vuelve a cargar el catálogo de beneficiarios.");
      setCatalogLoading(false);
      return () => { active = false; };
    }
    setCatalogLoading(true);
    setCatalogError("");
    callMeteorMethod("pagos.liquidaciones.beneficiarios")
      .then((result) => {
        if (!active) return;
        setBeneficiaries(Array.isArray(result?.beneficiaries) ? result.beneficiaries : []);
        setUnassignedIssues({
          items: Array.isArray(result?.unassignedIssues) ? result.unassignedIssues : [],
          total: Number(result?.totalUnassignedIssues) || 0,
        });
      })
      .catch((failure) => {
        if (active) setCatalogError(getErrorMessage(failure, "No se pudo cargar el catálogo de beneficiarios."));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => { active = false; };
  }, [connected, isPrincipal, revision, userId, userReady]);

  useEffect(() => {
    let active = true;
    if (!isPrincipal || !userReady || !userId || !targetId || !connected) {
      setLoading(false);
      if (!connected && isPrincipal && userId) setError("Sin conexión con VIDKAR. Reconecta para consultar saldos e historial.");
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    setData(null);
    const options = {
      page: linePage,
      historyPage,
      manualHistoryPage,
      historicalPage,
      ...(lineDomain ? { domain: lineDomain } : {}),
      ...(lineCurrency ? { currency: lineCurrency } : {}),
      historyFilters,
    };
    callMeteorMethod("pagos.liquidaciones.resumen", targetId, options)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((failure) => {
        if (active) setError(getErrorMessage(failure, "No se pudo cargar el resumen de liquidaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [
    connected,
    historyFilters,
    historyPage,
    historicalPage,
    isPrincipal,
    lineCurrency,
    lineDomain,
    linePage,
    manualHistoryPage,
    revision,
    targetId,
    userId,
    userReady,
  ]);

  useEffect(() => {
    let active = true;
    if (!destinationDialogVisible || destinationForm.method !== "REMESA") {
      setRemesaOptionsLoading(false);
      return () => { active = false; };
    }
    setRemesaOptionsLoading(true);
    setRemesaOptionsError("");
    callMeteorMethod("property.get", ["REMESA", "PRECIO", "DESCUENTOS"])
      .then((properties) => {
        if (active) setRemesaOptions(parseSettlementRemesaOptions(properties));
      })
      .catch((failure) => {
        if (active) {
          setRemesaOptions({ currencies: [], deliveryMethods: [] });
          setRemesaOptionsError(getErrorMessage(failure, "No se pudieron cargar las opciones de entrega REMESA."));
        }
      })
      .finally(() => {
        if (active) setRemesaOptionsLoading(false);
      });
    return () => { active = false; };
  }, [destinationDialogVisible, destinationForm.method]);

  const availableRemesaCurrencies = useMemo(
    () => getRemesaCurrenciesForBalance(destinationForm.currency, remesaOptions),
    [destinationForm.currency, remesaOptions],
  );

  useEffect(() => {
    if (!destinationDialogVisible || destinationForm.method !== "REMESA" || remesaOptionsLoading || remesaOptionsError) return;
    setDestinationForm((current) => {
      const currencies = getRemesaCurrenciesForBalance(current.currency, remesaOptions);
      const nextCurrency = currencies.includes(current.monedaRecibirEnCuba)
        ? current.monedaRecibirEnCuba
        : currencies[0] || "";
      const allowedMethods = remesaOptions.deliveryMethods.filter((method) =>
        nextCurrency === "CUP" || method === "EFECTIVO");
      const nextMethod = allowedMethods.includes(current.metodoPago)
        ? current.metodoPago
        : allowedMethods[0] || "";
      if (nextCurrency === current.monedaRecibirEnCuba && nextMethod === current.metodoPago) return current;
      return { ...current, monedaRecibirEnCuba: nextCurrency, metodoPago: nextMethod };
    });
  }, [
    destinationDialogVisible,
    destinationForm.currency,
    destinationForm.method,
    remesaOptions,
    remesaOptionsError,
    remesaOptionsLoading,
  ]);

  const filteredBeneficiaries = useMemo(() => {
    const search = beneficiarySearch.trim().toLocaleLowerCase();
    return beneficiaries.filter((beneficiary) =>
      !search || `${beneficiary.name} ${beneficiary._id}`.toLocaleLowerCase().includes(search));
  }, [beneficiaries, beneficiarySearch]);
  const isOwnBeneficiary = Boolean(userId && targetId === userId);
  const activeFilterCount = Object.entries(appliedHistoryDraft)
    .filter(([key, value]) => key === "kind" ? value !== "ALL" : Boolean(value)).length;
  const matchingHistoryCount = (data?.totalPayments || 0)
    + (data?.totalManualHistory || 0)
    + (data?.historicalCount || 0);
  const destinationForCurrency = useCallback(
    (currency) => data?.destinations?.find((destination) => destination.currency === currency) || null,
    [data?.destinations],
  );

  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  const chooseBeneficiary = (beneficiaryId) => {
    setBeneficiaryDialogVisible(false);
    setBeneficiarySearch("");
    setTargetId(beneficiaryId);
    setLinePage(0);
    setHistoryPage(0);
    setManualHistoryPage(0);
    setHistoricalPage(0);
  };

  const openPayment = (balance, paymentType) => {
    const destination = destinationForCurrency(balance.currency);
    if (!data?.canRegister || !destination || !isSettlementDestinationCompatible(destination)) return;
    setPaymentError("");
    setPaymentSubmitted(false);
    setPaymentForm({
      requestId: Crypto.randomUUID(),
      beneficiaryId: targetId,
      domain: balance.domain,
      currency: balance.currency,
      destinationVersion: destination.version,
      paymentType,
      amount: "",
      available: balance.payable,
    });
  };

  const closePayment = () => {
    if (paymentWorking) return;
    const closeAndRefresh = () => {
      setPaymentForm(null);
      setPaymentError("");
      if (paymentSubmitted) refresh();
    };
    if (!paymentSubmitted) {
      closeAndRefresh();
      return;
    }
    Alert.alert(
      "Verifica la misma solicitud",
      "La reserva pudo haberse creado. Si no recibiste confirmación, conserva el mismo número de solicitud y reintenta; no prepares otro pago.",
      [
        { text: "Seguir revisando", style: "cancel" },
        { text: "Cerrar y actualizar", onPress: closeAndRefresh },
      ],
    );
  };

  const partialAmountMinor = paymentForm?.paymentType === "PARTIAL"
    ? parseAmountMinor(paymentForm.amount)
    : null;
  const availableAmountMinor = paymentForm ? parseAmountMinor(paymentForm.available) : null;
  const paymentAmountError = paymentForm?.paymentType === "PARTIAL"
    ? partialAmountMinor === null || partialAmountMinor <= 0
      ? "Escribe un importe positivo con un máximo de dos decimales."
      : availableAmountMinor === null || partialAmountMinor > availableAmountMinor
        ? "El importe no puede superar el saldo disponible."
        : ""
    : "";
  const paymentDestination = paymentForm ? destinationForCurrency(paymentForm.currency) : null;
  const paymentInvalid = !paymentForm?.destinationVersion
    || !isSettlementDestinationCompatible(paymentDestination)
    || (paymentForm?.paymentType === "PARTIAL" && Boolean(paymentAmountError));

  const preparePayment = async () => {
    if (!paymentForm || paymentInvalid) return;
    setPaymentWorking(true);
    setPaymentSubmitted(true);
    setPaymentError("");
    const { available: _available, ...payload } = paymentForm;
    try {
      const result = await callMeteorMethod("pagos.liquidaciones.manual.preparar", payload);
      const isFondo = paymentForm.currency === "CUP" && paymentDestination?.method === "REMESA";
      setNotice(
        `${result.reused ? "Reserva existente" : "Saldo reservado"}: ${formatSettlementMoney(result.amount, result.currency)}. `
        + (isFondo
          ? "La remesa FONDO se entrega en CUP exactos; la liquidación se registra al confirmar la entrega real."
          : paymentDestination?.method === "REMESA"
            ? "La reserva no es un pago: aún debes crear la remesa interna y confirmar su entrega real."
            : "La reserva no envía dinero: debes ejecutar y conciliar la transferencia manual."),
      );
      setPaymentForm(null);
      setPaymentSubmitted(false);
      setHistoryPage(0);
      setManualHistoryPage(0);
      setRevision((current) => current + 1);
    } catch (failure) {
      setPaymentError(getErrorMessage(failure, "No se pudo reservar el saldo. Reintenta la misma solicitud."));
    } finally {
      setPaymentWorking(false);
    }
  };

  const openDestinationEditor = (currency) => {
    const current = destinationForCurrency(currency);
    const preferredMethod = current?.method && getSettlementMethodsForCurrency(currency).includes(current.method)
      ? current.method
      : currency === "CUP" ? "REMESA" : currency === "UYU" ? "MERCADOPAGO" : "PAYPAL";
    setDestinationForm({
      ...EMPTY_SETTLEMENT_DESTINATION,
      method: preferredMethod,
      currency,
    });
    setDestinationError("");
    setRemesaOptions({ currencies: [], deliveryMethods: [] });
    setRemesaOptionsError("");
    setDestinationDialogVisible(true);
  };

  const changeDestinationField = (key, value) => {
    setDestinationForm((current) => {
      const next = { ...current, [key]: value, confirmOwnership: false };
      if (key === "monedaRecibirEnCuba" && value === "USD") next.metodoPago = "EFECTIVO";
      if (key === "metodoPago" && value === "TRANSFERENCIA") next.monedaRecibirEnCuba = "CUP";
      if (key === "tarjetaCUP") next.tarjetaCUP = String(value).replace(/\D/g, "").slice(0, 16);
      return next;
    });
  };

  const destinationValidationError = validateSettlementDestination(destinationForm, remesaOptions);
  const saveDestination = async () => {
    if (destinationValidationError || remesaOptionsLoading || remesaOptionsError) return;
    setDestinationWorking(true);
    setDestinationError("");
    try {
      await callMeteorMethod(
        "pagos.liquidaciones.destino.guardar",
        buildSettlementDestinationPayload(destinationForm),
      );
      setDestinationDialogVisible(false);
      setNotice("Destino guardado. El resumen conserva una máscara; no se almacenaron credenciales de acceso.");
      setRevision((current) => current + 1);
    } catch (failure) {
      setDestinationError(getErrorMessage(failure, "No se pudo guardar el destino."));
    } finally {
      setDestinationWorking(false);
    }
  };

  const resetManualDialog = () => {
    setManualDetail(null);
    setManualError("");
    setManualReference("");
    setManualFeeAmount("");
    setManualFeeCurrency("");
    setManualSentConfirmed(false);
    setManualNoTransferConfirmed(false);
    setManualResolutionReason("");
  };

  const loadManualInstructions = async (request, sourceBalanceConfirmed) => {
    setManualWorking(true);
    setManualError("");
    setManualNoTransferConfirmed(false);
    setManualSentConfirmed(false);
    setManualResolutionReason("");
    try {
      const result = await callMeteorMethod(
        "pagos.liquidaciones.manual.instrucciones",
        request._id,
        sourceBalanceConfirmed,
      );
      setManualDetail(result);
      setManualReference("");
      setManualFeeAmount("");
      setManualFeeCurrency(result.currency || request.currency);
      setRevision((current) => current + 1);
    } catch (failure) {
      setManualError(getErrorMessage(failure, "No se pudieron cargar las instrucciones. Revisa la misma solicitud."));
    } finally {
      setManualWorking(false);
    }
  };

  const openManualInstructions = (request) => {
    resetManualDialog();
    if (request.status !== "RESERVED") {
      void loadManualInstructions(request, false);
      return;
    }
    const isRemesa = request.paymentMethod === "REMESA";
    Alert.alert(
      isRemesa ? "Crear remesa interna" : "Verificar fondos del emisor",
      isRemesa
        ? `Se creará o recuperará una remesa con ${formatSettlementMoney(request.amount, request.currency)} ya reservados. No habrá conversión; la liquidación solo se registrará al confirmar la entrega real.`
        : `Antes de iniciar, verifica en el canal oficial que la cuenta emisora dispone de ${formatSettlementMoney(request.amount, request.currency)} más cualquier comisión. La transferencia no se ejecuta desde VIDKAR.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: isRemesa ? "Crear remesa" : "Confirmo que revisé los fondos", onPress: () => { void loadManualInstructions(request, true); } },
      ],
    );
  };

  const closeManualDialog = () => {
    if (manualWorking) return;
    resetManualDialog();
    refresh();
  };

  const manualIsRemesa = manualDetail?.paymentMethod === "REMESA";
  const manualIsFondo = manualIsRemesa && manualDetail?.currency === "CUP";
  const manualDestinationDetails = {
    ...(manualDetail?.destination || {}),
    ...(manualDetail?.destination?.details || {}),
  };
  const manualDestinationLabels = {
    holderName: "Titular o destinatario",
    recipientIdentifier: "Identificador del canal",
    bankName: "Banco",
    accountType: "Tipo de cuenta",
    accountNumber: "Número de cuenta",
    branch: "Sucursal",
    documentType: "Tipo de documento",
    documentNumber: "Documento",
    monedaRecibirEnCuba: "Moneda de entrega",
    metodoPago: "Método de entrega",
    direccionCuba: "Dirección en Cuba",
    tarjetaCUP: "Tarjeta CUP",
  };
  const canConfirmManual = Boolean(
    manualDetail
    && manualSentConfirmed
    && ["IN_PROCESS", "UNKNOWN"].includes(manualDetail.status)
    && (manualIsRemesa
      ? Boolean(manualDetail.remesaSaleId || manualDetail.remesa?.saleId)
        && Number.isFinite(Number(manualDetail.remesa?.recibirEnCuba))
        && ["CUP", "USD"].includes(manualDetail.remesa?.monedaRecibirEnCuba)
      : Boolean(manualReference.trim())),
  );

  const confirmManualPayment = async () => {
    if (!manualDetail || !canConfirmManual) return;
    if (manualIsRemesa) {
      Alert.alert(
        "Confirmar entrega física",
        "Confirma solo si el destinatario recibió realmente el importe, moneda y método indicados. Se registrarán la entrega y la liquidación juntas; esta acción es irreversible.",
        [
          { text: "Volver a revisar", style: "cancel" },
          { text: "Confirmar entrega y liquidar", onPress: () => { void performManualConfirmation(); } },
        ],
      );
      return;
    }
    await performManualConfirmation();
  };

  const performManualConfirmation = async () => {
    if (!manualDetail) return;
    setManualWorking(true);
    setManualError("");
    try {
      const result = manualIsRemesa
        ? await callMeteorMethod("pagos.liquidaciones.remesa.entregar", manualDetail.requestId)
        : await callMeteorMethod("pagos.liquidaciones.manual.confirmar", {
          requestId: manualDetail.requestId,
          paymentReference: manualReference.trim(),
          feeAmount: manualFeeAmount.trim(),
          feeCurrency: manualFeeCurrency.trim().toUpperCase(),
        });
      resetManualDialog();
      setNotice(manualIsRemesa
        ? "Entrega de remesa y liquidación registradas en la misma operación."
        : `${result.reused ? "Pago ya conciliado" : "Pago conciliado"}: ${formatSettlementMoney(result.amount, manualDetail.currency)}.`);
      setRevision((current) => current + 1);
    } catch (failure) {
      setManualError(getErrorMessage(
        failure,
        manualIsRemesa
          ? "No se pudo confirmar la entrega. Revisa la misma remesa antes de reintentar."
          : "No se pudo conciliar el pago. Verifica la misma referencia antes de reintentar.",
      ));
    } finally {
      setManualWorking(false);
    }
  };

  const resolveManualPayment = async (outcome) => {
    if (!manualDetail) return;
    if (outcome === "FAILED" && !manualNoTransferConfirmed) {
      setManualError(manualIsRemesa
        ? "Confirma que no hubo entrega en efectivo ni transferencia a tarjeta."
        : "Confirma que el canal no debitó ni entregó el dinero.");
      return;
    }
    if (["UNKNOWN", "FAILED"].includes(outcome) && manualResolutionReason.trim().length < 3) {
      setManualError("Describe el motivo con al menos tres caracteres.");
      return;
    }
    setManualWorking(true);
    setManualError("");
    try {
      await callMeteorMethod("pagos.liquidaciones.manual.resolver", {
        requestId: manualDetail.requestId,
        outcome,
        reason: outcome === "FAILED"
          ? manualResolutionReason.trim()
          : manualResolutionReason.trim() || "Resultado pendiente de confirmar en el canal oficial.",
        ...(outcome === "FAILED" ? { confirmedNoTransfer: true } : {}),
      });
      if (outcome === "UNKNOWN") {
        setManualDetail((current) => current ? { ...current, status: "UNKNOWN", canSend: false } : current);
        setNotice("El resultado quedó incierto. La reserva y el bloqueo del canal se conservan hasta conciliar.");
      } else {
        resetManualDialog();
        setNotice(manualIsRemesa
          ? "La remesa pendiente se canceló sin entrega y el saldo fue liberado."
          : "El fallo quedó confirmado y el saldo fue liberado.");
      }
      setRevision((current) => current + 1);
    } catch (failure) {
      setManualError(getErrorMessage(failure, "No se pudo resolver la solicitud."));
    } finally {
      setManualWorking(false);
    }
  };

  const cancelReservedPayment = (request) => {
    const isRemesa = request.paymentMethod === "REMESA";
    Alert.alert(
      "Cancelar reserva",
      isRemesa
        ? "Cancela solo si la remesa interna todavía no se creó."
        : "Cancela solo antes de iniciar la transferencia manual.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cancelar y liberar saldo",
          style: "destructive",
          onPress: async () => {
            setManualWorking(true);
            setManualError("");
            try {
              await callMeteorMethod("pagos.liquidaciones.manual.resolver", {
                requestId: request._id,
                outcome: "CANCELED",
                reason: isRemesa
                  ? "Cancelada antes de crear la remesa interna."
                  : "Cancelada antes de iniciar la transferencia manual.",
              });
              setNotice("Reserva cancelada; el saldo vuelve a estar disponible.");
              setRevision((current) => current + 1);
            } catch (failure) {
              setManualError(getErrorMessage(failure, "No se pudo cancelar la reserva."));
            } finally {
              setManualWorking(false);
            }
          },
        },
      ],
    );
  };

  const applyHistoryFilters = () => {
    try {
      const filters = buildSettlementHistoryFilters(historyFilterDraft);
      setHistoryFilters(filters);
      setAppliedHistoryDraft({ ...historyFilterDraft });
      setHistoryFilterError("");
      setHistoryDialogVisible(false);
      setHistoryPage(0);
      setManualHistoryPage(0);
      setHistoricalPage(0);
    } catch (failure) {
      setHistoryFilterError(getErrorMessage(failure, "Revisa los filtros del historial."));
    }
  };

  const clearHistoryFilters = () => {
    setHistoryFilterDraft(DEFAULT_HISTORY_FILTERS);
    setAppliedHistoryDraft(DEFAULT_HISTORY_FILTERS);
    setHistoryFilters({ kind: "ALL" });
    setHistoryFilterError("");
    setHistoryDialogVisible(false);
    setHistoryPage(0);
    setManualHistoryPage(0);
    setHistoricalPage(0);
  };

  const setHistoryDraftField = (field, value) => {
    setHistoryFilterDraft((current) => ({ ...current, [field]: value }));
    setHistoryFilterError("");
  };

  const openRemesa = () => router.push("/(normal)/remesas");
  const openCourseLedger = () => router.push("/(normal)/GananciasCursos");
  const activeManualRequests = (data?.manualRequests || [])
    .filter((request) => MANUAL_PENDING_STATUSES.includes(request.status));
  const lineFilterDomainOptions = FILTER_DOMAIN_OPTIONS;
  const lineFilterCurrencyOptions = FILTER_CURRENCY_OPTIONS;

  const openFilters = () => {
    setHistoryFilterDraft({ ...appliedHistoryDraft });
    setHistoryFilterError("");
    setHistoryDialogVisible(true);
  };

  const updateLineDomain = (value) => {
    setLineDomain(value);
    setLinePage(0);
  };
  const updateLineCurrency = (value) => {
    setLineCurrency(value);
    setLinePage(0);
  };

  const renderDashboard = () => {
    if (!data) return null;
    const destinationList = Array.isArray(data.destinations) ? data.destinations : [];
    return (
      <>
        <Surface elevation={0} style={[styles.heroCard, { backgroundColor: palette.hero }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text variant="labelLarge" style={{ color: palette.accent }}>VIDKAR · FINANZAS</Text>
              <Text variant="headlineSmall" style={styles.heroTitle}>Saldos y pagos</Text>
              <Text selectable style={styles.heroSubtitle}>
                Reserva montos parciales o totales, gestiona cada envío manual y concilia solo después de verificar el resultado real.
              </Text>
            </View>
            <IconButton
              accessibilityLabel="Actualizar saldos e historial"
              icon="refresh"
              iconColor="#f8fafc"
              disabled={loading || paymentWorking || manualWorking}
              onPress={refresh}
            />
          </View>
          <View style={styles.heroFooter}>
            <Chip icon="account-cash-outline" compact style={styles.heroChip} textStyle={styles.heroChipText}>
              {data.beneficiary.name}
            </Chip>
            <Button
              compact
              mode="outlined"
              textColor="#f8fafc"
              style={styles.heroSelectButton}
              onPress={() => setBeneficiaryDialogVisible(true)}
            >
              Cambiar beneficiario
            </Button>
          </View>
          <Text selectable variant="bodySmall" style={styles.heroFootnote}>
            Reservar no transfiere dinero. No inicies un segundo envío mientras exista una operación en proceso o incierta.
          </Text>
        </Surface>

        {activeManualRequests.length ? (
          <InfoCard
            type="warning"
            title={`${activeManualRequests.length} operación(es) pendiente(s)`}
            palette={palette}
          >
            Filtra el historial por Solicitudes y por Reservado, En proceso o Incierto para continuar o conciliar cada una. Las reservas reducen el disponible, pero no se consideran pagos confirmados.
          </InfoCard>
        ) : null}

        {isOwnBeneficiary ? (
          <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text variant="titleMedium" style={{ color: palette.title }}>Mis destinos por moneda</Text>
            <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
              Cada moneda tiene un destino independiente. VIDKAR no convierte saldos.
            </Text>
            <View style={styles.destinationGrid}>
              {["CUP", "USD", "UYU"].map((currency) => {
                const destination = destinationList.find((item) => item.currency === currency);
                const compatible = isSettlementDestinationCompatible(destination);
                return (
                  <Surface key={currency} elevation={0} style={[styles.destinationCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                    <Text variant="titleSmall" style={{ color: palette.title }}>{currency}</Text>
                    {destination ? (
                      <>
                        <Text selectable style={{ color: palette.copy }}>
                          {SETTLEMENT_METHODS[destination.method] || destination.method}
                        </Text>
                        <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                          {destination.masked || "Datos guardados"} · versión {destination.version || "—"}
                        </Text>
                        {!compatible ? (
                          <Text selectable variant="bodySmall" style={{ color: palette.warning }}>
                            Requiere actualización antes de preparar una reserva.
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text selectable variant="bodySmall" style={{ color: palette.muted }}>Sin destino confirmado.</Text>
                    )}
                    <Button
                      compact
                      icon="pencil-outline"
                      mode="outlined"
                      onPress={() => openDestinationEditor(currency)}
                    >
                      {destination ? "Actualizar" : "Configurar"}
                    </Button>
                  </Surface>
                );
              })}
            </View>
            <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
              Nunca guardes contraseñas, PIN, códigos 2FA, CVV ni credenciales de acceso.
            </Text>
          </Surface>
        ) : (
          <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text variant="titleMedium" style={{ color: palette.title }}>Destinos del beneficiario</Text>
            {destinationList.length ? destinationList.map((destination) => (
              <Text key={destination.currency} selectable variant="bodySmall" style={{ color: palette.copy }}>
                {destination.currency}: {SETTLEMENT_METHODS[destination.method] || destination.method}
                {destination.country ? ` · ${destination.country}` : ""}
                {" · "}{destination.masked || "sin máscara"} · v{destination.version || "—"}
                {isSettlementDestinationCompatible(destination) ? "" : " · requiere reconfiguración"}
              </Text>
            )) : (
              <Text selectable variant="bodySmall" style={{ color: palette.warning }}>
                El beneficiario no ha confirmado destinos compatibles. Pídele que los configure desde su cuenta.
              </Text>
            )}
          </Surface>
        )}

        {catalogError ? <InfoCard type="error" title="No se pudo actualizar el catálogo" palette={palette}>{catalogError}</InfoCard> : null}
        {data.totalIssues > 0 ? (
          <InfoCard type="warning" title={`${data.totalIssues} incidencia(s) contables`} palette={palette}>
            {data.issues.map((issue, index) => (
              <Text key={`${issue.saleId}:${issue.itemKey}:${index}`} selectable variant="bodySmall" style={{ color: palette.copy }}>
                Venta {issue.saleId || "sin ID"} · {issue.itemKey || "sin ítem"} · {issue.reason || issue.reasonCode || "requiere revisión"}
              </Text>
            ))}
            {data.totalIssues > data.issues.length ? (
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                Se muestran las primeras {data.issues.length} incidencias.
              </Text>
            ) : null}
            <Button compact icon="book-open-variant" mode="text" onPress={openCourseLedger}>Revisar ganancias de cursos</Button>
          </InfoCard>
        ) : null}

        {unassignedIssues.total > 0 ? (
          <InfoCard type="warning" title={`${unassignedIssues.total} incidencia(s) sin beneficiario`} palette={palette}>
            {unassignedIssues.items.map((issue, index) => (
              <Text key={`${issue.saleId}:${issue.itemKey}:${index}`} selectable variant="bodySmall" style={{ color: palette.copy }}>
                Venta {issue.saleId || "sin ID"} · {issue.itemKey || "sin ítem"} · {issue.reason || issue.reasonCode || "propietario pendiente de resolver"}
              </Text>
            ))}
            {unassignedIssues.total > unassignedIssues.items.length ? (
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                Se muestran las primeras {unassignedIssues.items.length} incidencias.
              </Text>
            ) : null}
          </InfoCard>
        ) : null}

        <View style={styles.sectionHeading}>
          <View style={styles.sectionTitleBlock}>
            <Text variant="titleLarge" style={{ color: palette.title }}>Fondos disponibles</Text>
            <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
              Separados por dominio y moneda; no se suman entre sí.
            </Text>
          </View>
          <Button
            compact
            icon="filter-variant"
            mode="outlined"
            disabled={loading}
            onPress={openFilters}
          >
            Filtros{activeFilterCount ? ` · ${activeFilterCount}` : ""}
          </Button>
        </View>
        {data.balances.length ? (
          <View style={[styles.balanceGrid, isWide && styles.balanceGridWide]}>
            {data.balances.map((balance) => (
              <BalanceCard
                key={`${balance.domain}:${balance.currency}`}
                balance={balance}
                destination={destinationForCurrency(balance.currency)}
                isWide={isWide}
                canRegister={data.canRegister === true}
                isOwnBeneficiary={isOwnBeneficiary}
                working={paymentWorking}
                manualWorking={manualWorking}
                onOpenPayment={openPayment}
                onOpenDestination={openDestinationEditor}
                palette={palette}
              />
            ))}
          </View>
        ) : (
          <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text variant="titleSmall" style={{ color: palette.title }}>Sin saldos elegibles</Text>
            <Text selectable style={{ color: palette.muted }}>
              No hay ventas entregadas y elegibles, comisiones o pagos centrales para este beneficiario.
            </Text>
          </Surface>
        )}

        <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleBlock}>
              <Text variant="titleLarge" style={{ color: palette.title }}>Historial financiero</Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                {matchingHistoryCount} registro(s) con los filtros aplicados.
              </Text>
            </View>
            <Button compact icon="filter-variant" mode="outlined" onPress={openFilters}>
              Filtrar{activeFilterCount ? ` · ${activeFilterCount}` : ""}
            </Button>
          </View>
          <View style={styles.appliedFilters}>
            <Chip compact>{appliedHistoryDraft.kind === "ALL" ? "Todo el historial" : FILTER_KIND_OPTIONS.find((option) => option.value === appliedHistoryDraft.kind)?.label}</Chip>
            {appliedHistoryDraft.domain ? <Chip compact>{appliedHistoryDraft.domain}</Chip> : null}
            {appliedHistoryDraft.currency ? <Chip compact>{appliedHistoryDraft.currency}</Chip> : null}
            {appliedHistoryDraft.status ? <Chip compact>{SETTLEMENT_STATUSES[appliedHistoryDraft.status] || appliedHistoryDraft.status}</Chip> : null}
            {appliedHistoryDraft.paymentMethod ? <Chip compact>{SETTLEMENT_METHODS[appliedHistoryDraft.paymentMethod] || appliedHistoryDraft.paymentMethod}</Chip> : null}
            {appliedHistoryDraft.from || appliedHistoryDraft.to ? (
              <Chip compact>{appliedHistoryDraft.from || "Inicio"} — {appliedHistoryDraft.to || "Hoy"}</Chip>
            ) : null}
            {appliedHistoryDraft.search ? <Chip compact icon="magnify">{appliedHistoryDraft.search}</Chip> : null}
          </View>
          {manualError ? <InfoCard type="error" title="Operación manual" palette={palette}>{manualError}</InfoCard> : null}

          <View style={styles.historySection}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleBlock}>
                <Text variant="titleMedium" style={{ color: palette.title }}>Solicitudes manuales</Text>
                <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                  {data.totalManualHistory} registro(s) · página de {PAGE_SIZE}
                </Text>
              </View>
              {activeManualRequests.length ? <Chip compact icon="clock-alert-outline">{activeManualRequests.length} activas</Chip> : null}
            </View>
            {data.manualHistory?.length ? data.manualHistory.map((request) => (
              <HistoryRequestCard
                key={request._id}
                request={request}
                canRegister={data.canRegister === true}
                manualWorking={manualWorking}
                onManage={openManualInstructions}
                onCancel={cancelReservedPayment}
                onOpenRemesa={openRemesa}
                palette={palette}
              />
            )) : (
              <Text selectable style={{ color: palette.muted }}>
                No hay solicitudes para esta combinación de filtros.
              </Text>
            )}
            <PaginationBar
              page={manualHistoryPage}
              total={data.totalManualHistory || 0}
              onPageChange={setManualHistoryPage}
              disabled={loading || manualWorking}
              palette={palette}
            />
          </View>

          <Divider style={styles.divider} />
          <View style={styles.historySection}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleBlock}>
                <Text variant="titleMedium" style={{ color: palette.title }}>Pagos confirmados</Text>
                <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                  {data.totalPayments} pago(s) central(es) · página de {PAGE_SIZE}
                </Text>
              </View>
            </View>
            {data.payments?.length ? data.payments.map((payment) => (
              <PaymentHistoryCard
                key={payment._id}
                payment={payment}
                onAllocation={setSelectedPayment}
                onOpenRemesa={openRemesa}
                palette={palette}
              />
            )) : (
              <Text selectable style={{ color: palette.muted }}>No hay pagos confirmados para estos filtros.</Text>
            )}
            <PaginationBar
              page={historyPage}
              total={data.totalPayments || 0}
              onPageChange={setHistoryPage}
              disabled={loading}
              palette={palette}
            />
          </View>

          {data.historicalCount > 0 || appliedHistoryDraft.kind === "HISTORICAL" ? (
            <>
              <Divider style={styles.divider} />
              <View style={styles.historySection}>
                <View style={styles.sectionTitleBlock}>
                  <Text variant="titleMedium" style={{ color: palette.title }}>Pagos históricos de cursos</Text>
                  <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                    {data.historicalCount} movimiento(s) sin imputación a ventas; requieren conciliación explícita.
                  </Text>
                </View>
                {data.historicalPayments?.length ? data.historicalPayments.map((payment) => (
                  <HistoricalPaymentCard
                    key={payment._id}
                    payment={payment}
                    onOpenCourseLedger={openCourseLedger}
                    palette={palette}
                  />
                )) : (
                  <Text selectable style={{ color: palette.muted }}>No hay movimientos históricos para estos filtros.</Text>
                )}
                <PaginationBar
                  page={historicalPage}
                  total={data.historicalCount || 0}
                  onPageChange={setHistoricalPage}
                  disabled={loading}
                  palette={palette}
                />
              </View>
            </>
          ) : null}
        </Surface>

        <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleBlock}>
              <Text variant="titleLarge" style={{ color: palette.title }}>Detalle por venta</Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                Neto, pagos, reservas y monto pendiente con asignación FIFO.
              </Text>
            </View>
          </View>
          <ChipGroup
            label="Dominio"
            options={lineFilterDomainOptions}
            value={lineDomain}
            onChange={updateLineDomain}
            palette={palette}
          />
          <ChipGroup
            label="Moneda"
            options={lineFilterCurrencyOptions}
            value={lineCurrency}
            onChange={updateLineCurrency}
            palette={palette}
          />
          {data.lines?.length ? data.lines.map((line) => <LineCard key={line.key} line={line} palette={palette} />) : (
            <Text selectable style={{ color: palette.muted }}>No hay ventas para estos filtros.</Text>
          )}
          <PaginationBar
            page={linePage}
            total={data.totalLines || 0}
            onPageChange={setLinePage}
            disabled={loading}
            palette={palette}
          />
        </Surface>
      </>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.screen }]}>
      <AppHeader
        title="Saldos y pagos"
        subtitle="Administración financiera"
        showBackButton
        backHref="/(normal)/Main"
        backgroundColor={DEFAULT_HEADER_COLOR}
        overlapContent
        actions={(
          <IconButton
            accessibilityLabel="Actualizar"
            icon="refresh"
            iconColor="#ffffff"
            disabled={loading || catalogLoading}
            onPress={refresh}
          />
        )}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ marginTop: headerInset + 18 }}
          contentContainerStyle={styles.content}
        >
          {!userReady ? (
            <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface }]}>
              <ActivityIndicator />
              <Text selectable style={{ color: palette.copy }}>Verificando la sesión administrativa…</Text>
            </Surface>
          ) : !userId ? (
            <InfoCard type="error" title="Sesión requerida" palette={palette}>
              Inicia sesión con la cuenta administradora para consultar liquidaciones.
            </InfoCard>
          ) : !isPrincipal ? (
            <InfoCard type="error" title="Acceso restringido" palette={palette}>
              Esta pantalla está disponible únicamente para el administrador principal. La autorización definitiva se valida en el servidor.
            </InfoCard>
          ) : (
            <>
              {catalogLoading && !beneficiaries.length ? (
                <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface }]}>
                  <ActivityIndicator />
                  <Text selectable style={{ color: palette.copy }}>Cargando beneficiarios…</Text>
                </Surface>
              ) : null}
              {catalogError ? <InfoCard type="error" title="Catálogo de beneficiarios" palette={palette}>{catalogError}</InfoCard> : null}
              {error ? <InfoCard type="error" title="No se pudo cargar el resumen" palette={palette}>{error}</InfoCard> : null}
              {loading ? (
                <Surface elevation={1} style={[styles.sectionCard, { backgroundColor: palette.surface }]}>
                  <ActivityIndicator />
                  <Text selectable style={{ color: palette.copy }}>Cargando saldos e historial filtrado…</Text>
                </Surface>
              ) : null}
              {renderDashboard()}
              {!loading && !data && !error && targetId ? (
                <InfoCard type="warning" title="Sin datos" palette={palette}>
                  El resumen no devolvió información para este beneficiario. Actualiza para volver a consultar.
                </InfoCard>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog
          visible={beneficiaryDialogVisible}
          onDismiss={() => setBeneficiaryDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title>Seleccionar beneficiario</Dialog.Title>
          <Dialog.Content>
            <Searchbar
              accessibilityLabel="Buscar beneficiario"
              placeholder="Nombre o identificador"
              value={beneficiarySearch}
              onChangeText={setBeneficiarySearch}
            />
            <ScrollView style={styles.dialogList} keyboardShouldPersistTaps="handled">
              {filteredBeneficiaries.map((beneficiary) => (
                <Button
                  key={beneficiary._id}
                  contentStyle={styles.beneficiaryButton}
                  mode={beneficiary._id === targetId ? "contained-tonal" : "text"}
                  onPress={() => chooseBeneficiary(beneficiary._id)}
                >
                  {beneficiary.name}
                </Button>
              ))}
              {!filteredBeneficiaries.length ? (
                <Text selectable style={{ color: palette.muted, padding: 16 }}>
                  No hay beneficiarios que coincidan con la búsqueda.
                </Text>
              ) : null}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setBeneficiaryDialogVisible(false)}>Cerrar</Button></Dialog.Actions>
        </Dialog>

        <Dialog
          visible={historyDialogVisible}
          onDismiss={() => setHistoryDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title>Filtros del historial</Dialog.Title>
          <Dialog.Content style={styles.filterDialogContent}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterDialogBody}
            >
              <ChipGroup
                label="Tipo de registro"
                options={FILTER_KIND_OPTIONS}
                value={historyFilterDraft.kind}
                onChange={(value) => setHistoryDraftField("kind", value)}
                palette={palette}
              />
              <ChipGroup
                label="Dominio"
                options={FILTER_DOMAIN_OPTIONS}
                value={historyFilterDraft.domain}
                onChange={(value) => setHistoryDraftField("domain", value)}
                palette={palette}
              />
              <ChipGroup
                label="Moneda"
                options={FILTER_CURRENCY_OPTIONS}
                value={historyFilterDraft.currency}
                onChange={(value) => setHistoryDraftField("currency", value)}
                palette={palette}
              />
              <ChipGroup
                label="Estado"
                options={FILTER_STATUS_OPTIONS}
                value={historyFilterDraft.status}
                onChange={(value) => setHistoryDraftField("status", value)}
                palette={palette}
              />
              <ChipGroup
                label="Pago"
                options={FILTER_PAYMENT_TYPE_OPTIONS}
                value={historyFilterDraft.paymentType}
                onChange={(value) => setHistoryDraftField("paymentType", value)}
                palette={palette}
              />
              <ChipGroup
                label="Método"
                options={FILTER_METHOD_OPTIONS}
                value={historyFilterDraft.paymentMethod}
                onChange={(value) => setHistoryDraftField("paymentMethod", value)}
                palette={palette}
              />
              <View style={styles.dateFilterRow}>
                <TextInput
                  accessibilityLabel="Fecha inicial"
                  label="Desde · AAAA-MM-DD"
                  mode="outlined"
                  value={historyFilterDraft.from}
                  onChangeText={(value) => setHistoryDraftField("from", value)}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                  style={styles.dateInput}
                />
                <TextInput
                  accessibilityLabel="Fecha final"
                  label="Hasta · AAAA-MM-DD"
                  mode="outlined"
                  value={historyFilterDraft.to}
                  onChangeText={(value) => setHistoryDraftField("to", value)}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                  style={styles.dateInput}
                />
              </View>
              <TextInput
                accessibilityLabel="Buscar referencia o solicitud"
                label="Referencia, solicitud, venta, destinatario o nota"
                mode="outlined"
                value={historyFilterDraft.search}
                onChangeText={(value) => setHistoryDraftField("search", value)}
                maxLength={120}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {historyFilterError ? (
                <InfoCard type="error" palette={palette}>{historyFilterError}</InfoCard>
              ) : null}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={clearHistoryFilters}>Limpiar</Button>
            <Button onPress={() => setHistoryDialogVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={applyHistoryFilters}>Aplicar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(paymentForm)}
          dismissable={!paymentWorking}
          onDismiss={closePayment}
          style={[styles.dialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title>
            Preparar pago {paymentForm?.paymentType === "TOTAL" ? "total" : "parcial"} · {paymentForm?.domain} · {paymentForm?.currency}
          </Dialog.Title>
          <Dialog.Content>
            {paymentForm ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogForm}>
                <InfoCard type="warning" title="Reserva manual · no se transfiere dinero" palette={palette}>
                  El servidor congelará este importe y sus imputaciones FIFO. Después debes verificar el canal externo y confirmar el resultado. Si es REMESA, la liquidación ocurre únicamente al confirmar la entrega real.
                </InfoCard>
                <Text selectable variant="titleSmall" style={{ color: palette.title }}>
                  Disponible: {formatSettlementMoney(paymentForm.available, paymentForm.currency)}
                </Text>
                <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
                  Destino confirmado: {SETTLEMENT_METHODS[paymentDestination?.method] || "sin destino"}
                  {paymentDestination?.masked ? ` · ${paymentDestination.masked}` : ""}
                </Text>
                <SegmentedButtons
                  value={paymentForm.paymentType}
                  onValueChange={(value) => setPaymentForm((current) => ({ ...current, paymentType: value, amount: "" }))}
                  buttons={[
                    { value: "TOTAL", label: "Todo el disponible", disabled: paymentSubmitted },
                    { value: "PARTIAL", label: "Importe parcial", disabled: paymentSubmitted },
                  ]}
                />
                {paymentForm.paymentType === "PARTIAL" ? (
                  <TextInput
                    accessibilityLabel={`Importe parcial en ${paymentForm.currency}`}
                    label={`Importe a reservar · ${paymentForm.currency}`}
                    mode="outlined"
                    value={paymentForm.amount}
                    onChangeText={(amount) => setPaymentForm((current) => ({ ...current, amount }))}
                    keyboardType="decimal-pad"
                    maxLength={18}
                    disabled={paymentSubmitted}
                  />
                ) : null}
                {paymentAmountError ? (
                  <Text selectable variant="bodySmall" style={{ color: palette.error }}>{paymentAmountError}</Text>
                ) : null}
                {paymentForm.currency === "CUP" ? (
                  <InfoCard type="info" palette={palette}>
                    FONDO se reserva en CUP y se entrega en el mismo importe CUP. No hay conversión ni proveedor externo.
                  </InfoCard>
                ) : null}
                {paymentError ? (
                  <InfoCard type="error" title="No se confirmó la reserva" palette={palette}>
                    {paymentError} Conserva esta solicitud y reintenta con el mismo formulario.
                  </InfoCard>
                ) : null}
                <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                  El servidor selecciona las imputaciones más antiguas, verifica límites y evita duplicados con el mismo identificador de solicitud.
                </Text>
              </ScrollView>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={paymentWorking} onPress={closePayment}>Cerrar</Button>
            <Button
              disabled={paymentWorking || paymentInvalid || !data?.canRegister}
              loading={paymentWorking}
              mode="contained"
              onPress={preparePayment}
            >
              {paymentWorking ? "Reservando…" : paymentSubmitted ? "Reintentar misma solicitud" : "Reservar saldo"}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={destinationDialogVisible}
          dismissable={!destinationWorking}
          onDismiss={() => !destinationWorking && setDestinationDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title>Destino de cobro · {destinationForm.currency}</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogForm}>
              <InfoCard type="info" title="Datos de cobro protegidos" palette={palette}>
                Ingresa solo los datos necesarios para recibir el pago. No guardes contraseña, PIN, CVV, códigos 2FA ni credenciales bancarias.
              </InfoCard>
              <ChipGroup
                label="Método"
                options={getSettlementMethodsForCurrency(destinationForm.currency).map((method) => ({
                  label: SETTLEMENT_METHODS[method],
                  value: method,
                }))}
                value={destinationForm.method}
                onChange={(value) => changeDestinationField("method", value)}
                palette={palette}
                disabled={destinationWorking}
              />
              {destinationForm.method === "TRANSFERENCIA" ? (
                <InfoCard type="info" palette={palette}>Destino bancario fijo en Uruguay; no se admiten saldos CUP.</InfoCard>
              ) : null}
              {destinationForm.method === "REMESA" ? (
                <InfoCard type="info" palette={palette}>Destino de remesa a Cuba. La entrega se confirma por separado.</InfoCard>
              ) : null}
              <TextInput
                accessibilityLabel="Titular o destinatario"
                label={destinationForm.method === "REMESA" ? "Nombre completo del destinatario en Cuba" : "Titular de la cuenta"}
                mode="outlined"
                value={destinationForm.holderName}
                onChangeText={(value) => changeDestinationField("holderName", value)}
                maxLength={120}
                autoComplete="name"
                disabled={destinationWorking}
              />
              {destinationForm.method === "PAYPAL" || destinationForm.method === "MERCADOPAGO" ? (
                <>
                  <TextInput
                    accessibilityLabel="Identificador de cuenta receptora"
                    label="Correo, celular, usuario o identificador receptivo"
                    mode="outlined"
                    value={destinationForm.recipientIdentifier}
                    onChangeText={(value) => changeDestinationField("recipientIdentifier", value)}
                    maxLength={180}
                    autoCapitalize="none"
                    autoCorrect={false}
                    disabled={destinationWorking}
                  />
                  <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                    Mercado Pago puede requerir un identificador específico indicado por el flujo de transferencia. Nunca compartas credenciales de acceso.
                  </Text>
                </>
              ) : null}
              {destinationForm.method === "TRANSFERENCIA" ? (
                <>
                  <TextInput
                    accessibilityLabel="Banco"
                    label="Banco"
                    mode="outlined"
                    value={destinationForm.bankName}
                    onChangeText={(value) => changeDestinationField("bankName", value)}
                    maxLength={100}
                    disabled={destinationWorking}
                  />
                  <ChipGroup
                    label="Tipo de cuenta"
                    options={ACCOUNT_TYPE_OPTIONS}
                    value={destinationForm.accountType}
                    onChange={(value) => changeDestinationField("accountType", value)}
                    palette={palette}
                    disabled={destinationWorking}
                  />
                  <TextInput
                    accessibilityLabel="Número o identificador bancario"
                    label="Número o identificador de cuenta"
                    mode="outlined"
                    value={destinationForm.accountNumber}
                    onChangeText={(value) => changeDestinationField("accountNumber", value)}
                    maxLength={80}
                    autoCapitalize="none"
                    disabled={destinationWorking}
                  />
                  <TextInput
                    accessibilityLabel="Sucursal bancaria"
                    label="Sucursal (opcional)"
                    mode="outlined"
                    value={destinationForm.branch}
                    onChangeText={(value) => changeDestinationField("branch", value)}
                    maxLength={80}
                    disabled={destinationWorking}
                  />
                  <ChipGroup
                    label="Tipo de documento (opcional)"
                    options={[{ label: "No indicar", value: "" }, ...DOCUMENT_TYPE_OPTIONS]}
                    value={destinationForm.documentType}
                    onChange={(value) => changeDestinationField("documentType", value)}
                    palette={palette}
                    disabled={destinationWorking}
                  />
                  {destinationForm.documentType ? (
                    <TextInput
                      accessibilityLabel="Número de documento"
                      label="Número de documento"
                      mode="outlined"
                      value={destinationForm.documentNumber}
                      onChangeText={(value) => changeDestinationField("documentNumber", value)}
                      maxLength={50}
                      disabled={destinationWorking}
                    />
                  ) : null}
                </>
              ) : null}
              {destinationForm.method === "REMESA" ? (
                <>
                  {remesaOptionsLoading ? (
                    <View style={styles.inlineLoading}><ActivityIndicator /><Text>Cargando opciones activas…</Text></View>
                  ) : null}
                  {remesaOptionsError ? <InfoCard type="error" palette={palette}>{remesaOptionsError}</InfoCard> : null}
                  {!remesaOptionsLoading && !remesaOptionsError && !availableRemesaCurrencies.length ? (
                    <InfoCard type="warning" palette={palette}>No hay opciones activas de entrega compatibles; no se puede guardar una remesa.</InfoCard>
                  ) : null}
                  <ChipGroup
                    label="Moneda de entrega en Cuba"
                    options={availableRemesaCurrencies.map((currency) => ({ label: currency, value: currency }))}
                    value={destinationForm.monedaRecibirEnCuba}
                    onChange={(value) => changeDestinationField("monedaRecibirEnCuba", value)}
                    palette={palette}
                    disabled={destinationWorking || remesaOptionsLoading}
                  />
                  <ChipGroup
                    label="Método de entrega"
                    options={remesaOptions.deliveryMethods
                      .filter((method) => destinationForm.monedaRecibirEnCuba === "CUP" || method === "EFECTIVO")
                      .map((method) => ({
                        label: method === "EFECTIVO" ? "Efectivo" : "Transferencia · tarjeta CUP",
                        value: method,
                      }))}
                    value={destinationForm.metodoPago}
                    onChange={(value) => changeDestinationField("metodoPago", value)}
                    palette={palette}
                    disabled={destinationWorking || remesaOptionsLoading}
                  />
                  {destinationForm.metodoPago === "EFECTIVO" ? (
                    <TextInput
                      accessibilityLabel="Dirección de entrega en Cuba"
                      label="Dirección de entrega en Cuba"
                      mode="outlined"
                      value={destinationForm.direccionCuba}
                      onChangeText={(value) => changeDestinationField("direccionCuba", value)}
                      maxLength={300}
                      disabled={destinationWorking}
                    />
                  ) : destinationForm.metodoPago === "TRANSFERENCIA" ? (
                    <TextInput
                      accessibilityLabel="Tarjeta CUP de 16 dígitos"
                      label="Tarjeta CUP · 16 dígitos"
                      mode="outlined"
                      value={destinationForm.tarjetaCUP}
                      onChangeText={(value) => changeDestinationField("tarjetaCUP", value)}
                      maxLength={16}
                      keyboardType="number-pad"
                      disabled={destinationWorking}
                    />
                  ) : null}
                  <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                    {destinationForm.currency === "CUP"
                      ? "La venta FONDO se paga en CUP y la entrega en Cuba es exactamente el mismo importe, sin conversión."
                      : "El importe y cotización quedan congelados por el servidor al iniciar la remesa."}
                  </Text>
                </>
              ) : null}
              <View style={styles.checkboxRow}>
                <Checkbox
                  status={destinationForm.confirmOwnership ? "checked" : "unchecked"}
                  disabled={destinationWorking}
                  onPress={() => setDestinationForm((current) => ({
                    ...current,
                    confirmOwnership: !current.confirmOwnership,
                  }))}
                />
                <Text selectable style={[styles.bodyText, { color: palette.copy }]}>
                  Confirmo que soy titular o tengo autorización para usar este destino.
                </Text>
              </View>
              {destinationValidationError ? (
                <Text selectable variant="bodySmall" style={{ color: palette.warning }}>{destinationValidationError}</Text>
              ) : null}
              {destinationError ? <InfoCard type="error" palette={palette}>{destinationError}</InfoCard> : null}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={destinationWorking} onPress={() => setDestinationDialogVisible(false)}>Cancelar</Button>
            <Button
              disabled={destinationWorking || Boolean(destinationValidationError) || remesaOptionsLoading || Boolean(remesaOptionsError)}
              loading={destinationWorking}
              mode="contained"
              onPress={saveDestination}
            >
              Guardar destino
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(manualDetail)}
          dismissable={!manualWorking}
          onDismiss={closeManualDialog}
          style={[styles.dialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title>
            {manualIsRemesa ? "Verificar remesa" : "Revisar transferencia"} · {manualDetail?.domain} · {manualDetail?.currency}
          </Dialog.Title>
          <Dialog.Content>
            {manualDetail ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogForm}>
                <InfoCard type={manualIsRemesa ? "warning" : "info"} title="Verifica antes de confirmar" palette={palette}>
                  {manualIsRemesa
                    ? "Solo confirma si la entrega física ya ocurrió. Confirmar entrega registra el mismo importe CUP/USD en la liquidación; no convierte monedas."
                    : "Antes de transferir, verifica destinatario, moneda e importe en el canal oficial. VIDKAR no ejecuta la transferencia externa."}
                </InfoCard>
                {manualDetail.destinationDetailsUnavailable ? (
                  <InfoCard type="warning" palette={palette}>
                    Esta solicitud antigua no conserva instrucciones completas. No inicies otro envío; úsala solo para conciliar un pago ya realizado o resolver su resultado.
                  </InfoCard>
                ) : null}
                {manualDetail.blockedBySaleReversal ? (
                  <InfoCard type="error" title="Venta revertida" palette={palette}>
                    {manualDetail.blockedReason || "La venta fuente fue revertida."} No repitas la operación; verifica primero si el dinero salió.
                  </InfoCard>
                ) : null}
                <Text selectable variant="titleMedium" style={{ color: palette.title }}>
                  {formatSettlementMoney(manualDetail.amount, manualDetail.currency)}
                </Text>
                <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
                  Estado: {SETTLEMENT_STATUSES[manualDetail.status] || manualDetail.status} · método {SETTLEMENT_METHODS[manualDetail.paymentMethod] || manualDetail.paymentMethod}
                </Text>
                <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                  Titular: {manualDestinationDetails.holderName || "No disponible"}
                  {manualDetail.destination?.country ? ` · destino ${manualDetail.destination.country}` : ""}
                </Text>
                {manualDetail.destinationDetailsUnavailable ? null : Object.entries(manualDestinationDetails)
                  .filter(([key, value]) => key !== "holderName" && manualDestinationLabels[key] && value)
                  .map(([key, value]) => (
                    <Text key={key} selectable variant="bodySmall" style={{ color: palette.copy }}>
                      {manualDestinationLabels[key]}: {value}
                    </Text>
                  ))}
                {manualIsRemesa ? (
                  <>
                    {manualDetail.remesa ? (
                      <InfoCard type={manualIsFondo ? "info" : "warning"} title={manualIsFondo ? "Remesa FONDO" : "Remesa interna"} palette={palette}>
                        Entrega: {formatSettlementMoney(manualDetail.remesa.recibirEnCuba, manualDetail.remesa.monedaRecibirEnCuba)} · {manualDetail.remesa.metodoPago || "método no disponible"} · estado {manualDetail.remesa.estado || "no disponible"}.
                      </InfoCard>
                    ) : (
                      <InfoCard type="warning" palette={palette}>No se recibió el detalle de la remesa. Actualiza y revisa la misma solicitud; no prepares otra.</InfoCard>
                    )}
                    {manualDetail.remesaSaleId || manualDetail.remesa?.saleId ? (
                      <Button compact icon="open-in-new" mode="outlined" onPress={openRemesa}>
                        Ver remesa {manualDetail.remesaSaleId || manualDetail.remesa.saleId}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <TextInput
                      accessibilityLabel="Referencia del pago completado"
                      label="Referencia / ID de transferencia completada"
                      mode="outlined"
                      value={manualReference}
                      onChangeText={setManualReference}
                      maxLength={120}
                      disabled={manualWorking}
                    />
                    <TextInput
                      accessibilityLabel="Comisión cobrada a VIDKAR"
                      label="Comisión cobrada a VIDKAR (opcional)"
                      mode="outlined"
                      value={manualFeeAmount}
                      onChangeText={setManualFeeAmount}
                      keyboardType="decimal-pad"
                      maxLength={18}
                      disabled={manualWorking}
                    />
                    <TextInput
                      accessibilityLabel="Moneda de comisión"
                      label="Moneda de la comisión"
                      mode="outlined"
                      value={manualFeeCurrency}
                      onChangeText={(value) => setManualFeeCurrency(value.toUpperCase().slice(0, 3))}
                      maxLength={3}
                      autoCapitalize="characters"
                      disabled={manualWorking}
                    />
                    <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                      Deja la comisión vacía si el canal no la cobró. No se descuenta del saldo del beneficiario.
                    </Text>
                  </>
                )}
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={manualSentConfirmed ? "checked" : "unchecked"}
                    disabled={manualWorking}
                    onPress={() => setManualSentConfirmed((current) => !current)}
                  />
                  <Text selectable style={[styles.bodyText, { color: palette.copy }]}>
                    {manualIsRemesa
                      ? "Verifiqué que el destinatario recibió realmente la remesa indicada."
                      : "Verifiqué en el canal oficial que el pago se completó al destinatario correcto."}
                  </Text>
                </View>
                {["IN_PROCESS", "UNKNOWN"].includes(manualDetail.status) ? (
                  <>
                    <TextInput
                      accessibilityLabel="Motivo de incertidumbre o fallo"
                      label="Motivo para dejar incierto o resolver como fallido"
                      mode="outlined"
                      value={manualResolutionReason}
                      onChangeText={setManualResolutionReason}
                      maxLength={300}
                      multiline
                      disabled={manualWorking}
                    />
                    {manualDetail.status === "IN_PROCESS" ? (
                      <Button
                        disabled={manualWorking || manualResolutionReason.trim().length < 3}
                        icon="help-circle-outline"
                        mode="outlined"
                        onPress={() => resolveManualPayment("UNKNOWN")}
                      >
                        Mantener incierto y conservar la reserva
                      </Button>
                    ) : null}
                    <View style={styles.checkboxRow}>
                      <Checkbox
                        status={manualNoTransferConfirmed ? "checked" : "unchecked"}
                        disabled={manualWorking}
                        onPress={() => setManualNoTransferConfirmed((current) => !current)}
                      />
                      <Text selectable style={[styles.bodyText, { color: palette.copy }]}>
                        {manualIsRemesa
                          ? "Verifiqué que no hubo entrega de efectivo ni transferencia a tarjeta CUP."
                          : "Verifiqué con el canal que no hubo débito ni entrega del dinero."}
                      </Text>
                    </View>
                    <Button
                      disabled={manualWorking || !manualNoTransferConfirmed || manualResolutionReason.trim().length < 3}
                      icon="close-circle-outline"
                      mode="outlined"
                      onPress={() => resolveManualPayment("FAILED")}
                    >
                      Confirmar fallo sin entrega y liberar saldo
                    </Button>
                  </>
                ) : null}
                {manualError ? <InfoCard type="error" palette={palette}>{manualError}</InfoCard> : null}
              </ScrollView>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={manualWorking} onPress={closeManualDialog}>Cerrar</Button>
            <Button
              disabled={manualWorking || !canConfirmManual}
              loading={manualWorking}
              mode="contained"
              onPress={confirmManualPayment}
            >
              {manualWorking ? "Registrando…" : manualIsRemesa ? "Confirmar entrega real" : "Confirmar pago completado"}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(selectedPayment)}
          onDismiss={() => setSelectedPayment(null)}
          style={[styles.dialog, { backgroundColor: palette.surface }]}
        >
          <Dialog.Title>Imputación del pago</Dialog.Title>
          <Dialog.Content>
            {selectedPayment ? (
              <ScrollView contentContainerStyle={styles.dialogForm}>
                <Text selectable variant="titleMedium" style={{ color: palette.title }}>
                  {formatSettlementMoney(selectedPayment.amount, selectedPayment.currency)}
                </Text>
                <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
                  {selectedPayment.domain} · {selectedPayment.paymentType === "TOTAL" ? "Total" : "Parcial"} · {getPaymentMethodLabel(selectedPayment)}
                </Text>
                <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
                  {formatSettlementDate(selectedPayment.createdAt)} · {selectedPayment.paymentReference}
                </Text>
                {selectedPayment.remesaSaleId ? (
                  <Button compact icon="open-in-new" mode="outlined" onPress={openRemesa}>
                    Ver remesa {selectedPayment.remesaSaleId}
                  </Button>
                ) : null}
                {Number(selectedPayment.feeAmount) > 0 ? (
                  <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                    Comisión VIDKAR: {formatSettlementMoney(selectedPayment.feeAmount, selectedPayment.feeCurrency)}
                  </Text>
                ) : null}
                {selectedPayment.notes ? <Text selectable style={{ color: palette.copy }}>{selectedPayment.notes}</Text> : null}
                <Divider style={styles.divider} />
                {(selectedPayment.allocations || []).map((line) => (
                  <Surface key={line.key} elevation={0} style={[styles.historyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.border }]}>
                    <Text selectable variant="titleSmall" style={{ color: palette.title }}>{line.label}</Text>
                    <Text selectable variant="bodySmall" style={{ color: palette.copy }}>
                      {ROLE_LABELS[line.role] || line.role} · {formatSettlementMoney(line.amount, selectedPayment.currency)}
                    </Text>
                    <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                      Venta {line.saleId} · ítem {line.itemKey}
                    </Text>
                  </Surface>
                ))}
                {!selectedPayment.allocations?.length ? (
                  <Text selectable style={{ color: palette.muted }}>Este registro no incluye imputaciones visibles.</Text>
                ) : null}
              </ScrollView>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setSelectedPayment(null)}>Cerrar</Button></Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice("")} duration={7000}>
        {notice}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  heroCard: { borderRadius: 24, padding: 20, gap: 16 },
  heroHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  heroCopy: { flex: 1, gap: 6 },
  heroTitle: { color: "#f8fafc", fontWeight: "800" },
  heroSubtitle: { color: "#cbd5e1", lineHeight: 21 },
  heroFooter: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  heroChip: { backgroundColor: "rgba(255,255,255,0.1)" },
  heroChipText: { color: "#f8fafc" },
  heroSelectButton: { borderColor: "rgba(255,255,255,0.4)" },
  heroFootnote: { color: "#cbd5e1", lineHeight: 19 },
  sectionCard: { borderRadius: 20, padding: 16, gap: 14, borderWidth: StyleSheet.hairlineWidth },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  sectionTitleBlock: { flex: 1, gap: 4, minWidth: 180 },
  balanceGrid: { gap: 12 },
  balanceGridWide: { flexDirection: "row", flexWrap: "wrap" },
  balanceCard: { width: "100%", borderRadius: 20, padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  balanceCardWide: { width: "48%" },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 },
  balanceValue: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  balanceStats: { gap: 4 },
  divider: { marginVertical: 4 },
  destinationSummary: { gap: 3 },
  balanceActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { flexGrow: 1 },
  inlineButton: { alignSelf: "flex-start" },
  destinationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  destinationCard: { flexGrow: 1, minWidth: 125, flexBasis: "30%", borderRadius: 14, padding: 12, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  historySection: { gap: 10 },
  historyCard: { borderRadius: 14, padding: 12, gap: 8, borderWidth: StyleSheet.hairlineWidth },
  historyTitle: { flex: 1, minWidth: 150 },
  historyActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  lineAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  lineAmount: { minWidth: 110, gap: 2 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  appliedFilters: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  infoCard: { borderRadius: 14, padding: 12, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  infoTitle: { fontWeight: "700" },
  bodyText: { lineHeight: 20 },
  chipGroup: { gap: 6 },
  chipRow: { alignItems: "center", gap: 8, paddingRight: 8 },
  filterChip: { marginVertical: 2 },
  dialog: { maxHeight: "92%" },
  dialogList: { maxHeight: 420, marginTop: 10 },
  beneficiaryButton: { justifyContent: "flex-start", minHeight: 48 },
  filterDialogContent: { paddingHorizontal: 0 },
  filterDialogBody: { paddingHorizontal: 24, paddingBottom: 8, gap: 14 },
  dateFilterRow: { flexDirection: "row", gap: 8 },
  dateInput: { flex: 1 },
  dialogForm: { gap: 12, paddingBottom: 8 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineLoading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
});

export default LiquidacionesAdminScreen;
