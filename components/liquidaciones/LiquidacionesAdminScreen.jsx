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
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  Searchbar,
  SegmentedButtons,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader, { DEFAULT_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import SettlementDrawer from "./SettlementDrawer";
import { isPrincipalAdmin } from "../../services/mcp/mcpAccess";
import {
  buildSettlementDestinationPayload,
  buildSettlementHistoryFilters,
  buildSettlementSummaryOptions,
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
  /Match failed/i.test(error?.reason || error?.message || "")
    ? "El servidor no reconoce los filtros de esta versión. Actualiza el backend VIDKAR y vuelve a intentar."
    : error?.reason || error?.message || fallback;

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

const getStatusConfig = (status, palette) => {
  switch (status) {
    case "PAID":
      return { color: palette.success, bg: palette.successBg, label: SETTLEMENT_STATUSES.PAID || "Pagado", icon: "check-circle" };
    case "RESERVED":
      return { color: palette.accent, bg: palette.accentBg, label: SETTLEMENT_STATUSES.RESERVED || "Reservado", icon: "clock-outline" };
    case "IN_PROCESS":
      return { color: "#818cf8", bg: "rgba(129, 140, 248, 0.14)", label: SETTLEMENT_STATUSES.IN_PROCESS || "En proceso", icon: "progress-clock" };
    case "UNKNOWN":
      return { color: palette.warning, bg: palette.warningBg, label: SETTLEMENT_STATUSES.UNKNOWN || "Incierto", icon: "alert-circle-outline" };
    case "FAILED":
      return { color: palette.error, bg: palette.errorBg, label: SETTLEMENT_STATUSES.FAILED || "Fallido", icon: "close-circle-outline" };
    case "CANCELED":
      return { color: palette.muted, bg: "rgba(148, 163, 184, 0.12)", label: SETTLEMENT_STATUSES.CANCELED || "Cancelado", icon: "cancel" };
    case "HISTORICAL":
      return { color: "#a855f7", bg: "rgba(168, 85, 247, 0.14)", label: SETTLEMENT_STATUSES.HISTORICAL || "Histórico", icon: "book-open-outline" };
    default:
      return { color: palette.copy, bg: palette.nestedSurface, label: status, icon: "information-outline" };
  }
};

const getCurrencyColor = (currency, palette) => {
  if (currency === "CUP") return palette.cupColor;
  if (currency === "USD") return palette.usdColor;
  if (currency === "UYU") return palette.uyuColor;
  return palette.accent;
};

const getMethodIcon = (method) => {
  switch (method) {
    case "REMESA":
      return "cash-multiple";
    case "TRANSFERENCIA":
      return "bank";
    case "MERCADOPAGO":
      return "credit-card-outline";
    case "PAYPAL":
      return "wallet-outline";
    default:
      return "cash";
  }
};

const InfoCard = ({ children, title, type = "info", palette }) => {
  const isError = type === "error";
  const isWarning = type === "warning";
  const tone = isError ? palette.error : isWarning ? palette.warning : palette.accent;
  const toneBg = isError ? palette.errorBg : isWarning ? palette.warningBg : palette.accentBg;
  const icon = isError ? "alert-circle" : isWarning ? "alert" : "information-outline";

  return (
    <Surface
      accessibilityRole="summary"
      elevation={0}
      style={[styles.infoCard, { backgroundColor: toneBg, borderColor: `${tone}44` }]}
    >
      <View style={styles.infoCardRow}>
        <IconButton
          icon={icon}
          iconColor={tone}
          size={20}
          style={styles.infoCardIcon}
        />
        <View style={styles.infoCardBody}>
          {title ? <Text selectable style={[styles.infoTitle, { color: tone }]}>{title}</Text> : null}
          {typeof children === "string"
            ? <Text selectable style={[styles.bodyText, { color: palette.copy }]}>{children}</Text>
            : children}
        </View>
      </View>
    </Surface>
  );
};

const ChipGroup = ({ label, options, value, onChange, palette, disabled = false }) => (
  <View style={styles.chipGroup}>
    {label ? <Text variant="labelLarge" style={[styles.groupLabel, { color: palette.title }]}>{label}</Text> : null}
    <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <TouchableOpacity
            key={`${label}:${option.value || "all"}`}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.modernPillChip,
              {
                backgroundColor: isSelected ? palette.accent : palette.nestedSurface,
                borderColor: isSelected ? palette.accent : palette.borderSubtle,
              },
            ]}
            accessibilityLabel={`${label}: ${option.label}`}
          >
            <Text
              style={[
                styles.modernPillChipText,
                { color: isSelected ? "#090d16" : palette.copy, fontWeight: isSelected ? "700" : "500" },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const PaginationBar = ({ page, total, onPageChange, disabled, palette }) => {
  const first = total ? page * PAGE_SIZE + 1 : 0;
  const last = Math.min((page + 1) * PAGE_SIZE, total);
  return (
    <Surface elevation={0} style={[styles.paginationCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
      <IconButton
        accessibilityLabel="Página anterior"
        icon="chevron-left"
        iconColor={palette.title}
        size={20}
        disabled={disabled || page === 0}
        onPress={() => onPageChange(page - 1)}
      />
      <Text selectable variant="labelMedium" style={{ color: palette.muted, fontVariant: ["tabular-nums"] }}>
        {first}–{last} de {total}
      </Text>
      <IconButton
        accessibilityLabel="Página siguiente"
        icon="chevron-right"
        iconColor={palette.title}
        size={20}
        disabled={disabled || (page + 1) * PAGE_SIZE >= total}
        onPress={() => onPageChange(page + 1)}
      />
    </Surface>
  );
};

const BalanceCard = ({
  balance,
  destination,
  isWide,
  canRegister,
  canRequestPayment,
  isOwnBeneficiary,
  working,
  manualWorking,
  onOpenPayment,
  onOpenDestination,
  palette,
}) => {
  const payable = Number(balance.payable);
  const currencyColor = getCurrencyColor(balance.currency, palette);
  const canPrepare = canRegister
    && Number.isFinite(payable)
    && payable > 0
    && !balance.reconciliationRequired
    && !working
    && !manualWorking
    && destination?.status === "BENEFICIARY_CONFIRMED"
    && isSettlementDestinationCompatible(destination);
  const canRequest = canRequestPayment
    && Number.isFinite(payable)
    && payable > 0
    && !balance.reconciliationRequired
    && !working
    && !manualWorking
    && destination?.status === "BENEFICIARY_CONFIRMED"
    && isSettlementDestinationCompatible(destination);

  const destinationOk = destination?.status === "BENEFICIARY_CONFIRMED" && isSettlementDestinationCompatible(destination);

  return (
    <Surface elevation={0} style={[styles.balanceCard, isWide && styles.balanceCardWide, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
      {/* Top row badge and availability */}
      <View style={styles.cardHeading}>
        <View style={[styles.currencyPillBadge, { backgroundColor: `${currencyColor}18`, borderColor: `${currencyColor}44` }]}>
          <View style={[styles.currencyDot, { backgroundColor: currencyColor }]} />
          <Text style={[styles.currencyPillText, { color: currencyColor }]}>
            {balance.domain} · {balance.currency}
          </Text>
        </View>
        <View style={[styles.capsuleBadge, { backgroundColor: palette.nestedSurface }]}>
          <Text variant="labelSmall" style={{ color: palette.muted, fontWeight: "600" }}>
            {canRequestPayment ? "Disponible para solicitar" : "Disponible para reservar"}
          </Text>
        </View>
      </View>

      {/* Main hero balance */}
      <View style={styles.balanceHeroBox}>
        <Text variant="labelSmall" style={[styles.balanceHeroCaption, { color: palette.muted }]}>
          SALDO DISPONIBLE
        </Text>
        <Text selectable variant="displaySmall" style={[styles.balanceValue, { color: payable < 0 ? palette.error : palette.title }]}>
          {formatSettlementMoney(balance.payable, balance.currency)}
        </Text>
      </View>

      {/* Micro-dashboard stats breakdown */}
      <View style={[styles.statsRowContainer, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
        <View style={styles.statColumn}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: palette.muted }]}>Generado</Text>
          <Text selectable variant="bodyMedium" style={[styles.statValue, { color: palette.title }]}>
            {formatSettlementMoney(balance.generated, balance.currency)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]} />
        <View style={styles.statColumn}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: palette.muted }]}>Pagado</Text>
          <Text selectable variant="bodyMedium" style={[styles.statValue, { color: palette.success }]}>
            {formatSettlementMoney(balance.paid, balance.currency)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]} />
        <View style={styles.statColumn}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: palette.muted }]}>Reservado</Text>
          <Text selectable variant="bodyMedium" style={[styles.statValue, { color: palette.warning }]}>
            {formatSettlementMoney(balance.reserved, balance.currency)}
          </Text>
        </View>
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

      {/* Destination mini-box */}
      <View style={[styles.destinationMiniCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
        <View style={styles.destinationHeaderRow}>
          <View style={styles.destinationHeaderLeft}>
            <IconButton
              icon={getMethodIcon(destination?.method)}
              iconColor={destinationOk ? palette.success : palette.muted}
              size={18}
              style={styles.microIcon}
            />
            <Text variant="labelMedium" style={{ color: palette.title, fontWeight: "700" }}>
              {destination ? (SETTLEMENT_METHODS[destination.method] || destination.method) : "Sin destino de cobro"}
              {destination?.country ? ` · ${destination.country}` : ""}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: destinationOk ? palette.success : palette.warning }]} />
        </View>

        {destination ? (
          <Text selectable variant="bodySmall" style={{ color: palette.muted, paddingLeft: 4 }}>
            {destination.masked || "Sin máscara"} · versión {destination.version || "—"}
          </Text>
        ) : (
          <Text selectable variant="bodySmall" style={{ color: palette.muted, paddingLeft: 4 }}>
            No hay destino confirmado para {balance.currency}.
          </Text>
        )}

        {destination && !destinationOk ? (
          <Text selectable variant="bodySmall" style={{ color: palette.warning, paddingLeft: 4 }}>
            El destino requiere reconfiguración o no es compatible con esta moneda.
          </Text>
        ) : null}

        {isOwnBeneficiary ? (
          <Button
            compact
            icon="pencil-outline"
            mode="outlined"
            onPress={() => onOpenDestination(balance.currency)}
            style={styles.pillButtonCompact}
            labelStyle={styles.pillButtonLabel}
          >
            {destination ? "Actualizar destino" : "Configurar destino"}
          </Button>
        ) : null}
      </View>

      {balance.currency === "CUP" ? (
        <View style={[styles.cupHelperBanner, { backgroundColor: `${palette.cupColor}10` }]}>
          <IconButton icon="information-outline" iconColor={palette.cupColor} size={16} style={styles.microIcon} />
          <Text selectable variant="bodySmall" style={{ color: palette.cupColor, flex: 1 }}>
            FONDO entrega en CUP exactos en Cuba, sin conversión de moneda.
          </Text>
        </View>
      ) : null}

      {/* Action buttons following botones-redondos standard */}
      {canRegister ? (
        <View style={styles.balanceActionsRow}>
          <Button
            accessibilityLabel={`Preparar pago total de ${balance.payable} ${balance.currency}`}
            disabled={!canPrepare}
            icon={balance.currency === "CUP" ? "bank-transfer" : "cash-check"}
            mode="contained"
            onPress={() => onOpenPayment(balance, "TOTAL")}
            style={[styles.pillActionBtn, { flex: 1, backgroundColor: canPrepare ? palette.accent : undefined }]}
            labelStyle={[styles.pillActionLabel, canPrepare ? { color: "#090d16" } : null]}
          >
            Total
          </Button>
          <Button
            accessibilityLabel={`Preparar pago parcial de ${balance.payable} ${balance.currency}`}
            disabled={!canPrepare}
            icon="cash-minus"
            mode="outlined"
            onPress={() => onOpenPayment(balance, "PARTIAL")}
            style={[styles.pillActionBtn, { flex: 1, borderColor: palette.accent }]}
            labelStyle={[styles.pillActionLabel, { color: canPrepare ? palette.accent : palette.muted }]}
          >
            Parcial
          </Button>
        </View>
      ) : null}

      {canRequestPayment ? (
        <Button
          accessibilityLabel={`Solicitar cobro de ${formatSettlementMoney(balance.payable, balance.currency)}`}
          disabled={!canRequest}
          icon="cash-fast"
          mode="contained"
          onPress={() => onOpenPayment(balance, "TOTAL")}
          style={[styles.pillActionBtn, { backgroundColor: canRequest ? palette.accent : undefined }]}
          labelStyle={[styles.pillActionLabel, canRequest ? { color: "#090d16" } : null]}
        >
          Solicitar cobro
        </Button>
      ) : null}

      {canRegister && !canPrepare && payable > 0 && !balance.reconciliationRequired ? (
        <Text selectable variant="bodySmall" style={{ color: palette.warning, textAlign: "center" }}>
          Confirma un destino compatible en {balance.currency} antes de reservar este saldo.
        </Text>
      ) : null}
      {canRequestPayment && !canRequest && payable > 0 && !balance.reconciliationRequired ? (
        <Text selectable variant="bodySmall" style={{ color: palette.warning, textAlign: "center" }}>
          Confirma un destino compatible en {balance.currency} antes de solicitar este saldo.
        </Text>
      ) : null}
    </Surface>
  );
};

const LiquidacionesAdminScreen = ({ backHref = "/(normal)/Main", mode = "NORMAL" }) => {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const { width } = useWindowDimensions();
  const isWide = width >= 780;
  const isMedium = width >= 500 && width < 780;
  const isDark = theme.dark;

  const palette = useMemo(() => {
    const isEmpresa = Boolean(theme.empresaAppearance);
    return {
      screen: isEmpresa ? theme.colors.background : isDark ? "#090d16" : "#f1f5f9",
      hero: isEmpresa ? theme.empresaAppearance.header : isDark ? "#0f172a" : "#1e293b",
      heroBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)",
      surface: isEmpresa ? theme.colors.surface : isDark ? "#111c2e" : "#ffffff",
      nestedSurface: isEmpresa ? theme.colors.surfaceVariant : isDark ? "#172338" : "#f8fafc",
      border: theme.colors.outline,
      borderSubtle: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      title: theme.colors.onSurface,
      copy: theme.colors.onSurfaceVariant,
      muted: isDark ? "#94a3b8" : "#64748b",
      accent: isEmpresa ? theme.empresaAppearance.headerText : "#38bdf8",
      accentBg: isDark ? "rgba(56,189,248,0.12)" : "rgba(14,165,233,0.10)",
      success: "#10b981",
      successBg: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)",
      warning: "#f59e0b",
      warningBg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.10)",
      error: theme.colors.error || "#ef4444",
      errorBg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.10)",
      cupColor: "#10b981",
      usdColor: "#38bdf8",
      uyuColor: "#f59e0b",
    };
  }, [theme, isDark]);

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
  const [pendingRequests, setPendingRequests] = useState([]);
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

  // Responsive Table Detail Drawers
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedHistoricalPayment, setSelectedHistoricalPayment] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);

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
      setPendingRequests([]);
      setCatalogError("");
      setUnassignedIssues({ items: [], total: 0 });
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
        setPendingRequests(Array.isArray(result?.pendingRequests) ? result.pendingRequests : []);
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
    if (!userReady || !userId || !targetId) {
      setLoading(false);
      return () => { active = false; };
    }
    if (!connected) {
      setLoading(false);
      setError("Sin conexión con VIDKAR. Reconecta para consultar saldos e historial.");
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    setData(null);
    const options = buildSettlementSummaryOptions({
      page: linePage,
      historyPage,
      manualHistoryPage,
      historicalPage,
      ...(lineDomain ? { domain: lineDomain } : {}),
      ...(lineCurrency ? { currency: lineCurrency } : {}),
      historyFilters,
    });
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
    const canRequestOwnBalance = !isPrincipal && isOwnBeneficiary;
    if ((!data?.canRegister && !canRequestOwnBalance)
      || !destination
      || !isSettlementDestinationCompatible(destination)) return;
    setPaymentError("");
    setPaymentSubmitted(false);
    setPaymentForm({
      requestId: Crypto.randomUUID(),
      beneficiaryId: targetId,
      domain: balance.domain,
      currency: balance.currency,
      destinationVersion: destination.version,
      paymentType: canRequestOwnBalance ? "TOTAL" : paymentType,
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
    if (!isPrincipal || !paymentForm || paymentInvalid) return;
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

  const requestOwnPayment = async () => {
    if (isPrincipal || !isOwnBeneficiary || !paymentForm || paymentInvalid) return;
    setPaymentWorking(true);
    setPaymentSubmitted(true);
    setPaymentError("");
    const payload = {
      requestId: paymentForm.requestId,
      beneficiaryId: userId,
      domain: paymentForm.domain,
      currency: paymentForm.currency,
      destinationVersion: paymentForm.destinationVersion,
      paymentType: "TOTAL",
    };
    try {
      const result = await callMeteorMethod("pagos.liquidaciones.solicitar", payload);
      setNotice(
        `${result.reused ? "Solicitud existente" : "Solicitud registrada"}: ${formatSettlementMoney(result.amount, result.currency)}. `
        + "El saldo queda reservado; el administrador principal confirmará el pago después de verificar la entrega.",
      );
      setPaymentForm(null);
      setPaymentSubmitted(false);
      setHistoryPage(0);
      setManualHistoryPage(0);
      setRevision((current) => current + 1);
    } catch (failure) {
      setPaymentError(getErrorMessage(failure, "No se pudo registrar la solicitud. Reintenta usando la misma solicitud."));
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

  const handleQuickKindChange = (kind) => {
    const nextDraft = { ...appliedHistoryDraft, kind };
    try {
      const filters = buildSettlementHistoryFilters(nextDraft);
      setHistoryFilters(filters);
      setAppliedHistoryDraft(nextDraft);
      setHistoryFilterDraft(nextDraft);
      setHistoryPage(0);
      setManualHistoryPage(0);
      setHistoricalPage(0);
    } catch {
      // keep current
    }
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
        {/* Modern Neo-Bank Hero Card */}
        <Surface elevation={0} style={[styles.heroCard, { backgroundColor: palette.hero, borderColor: palette.heroBorder }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBrandPill}>
              <IconButton icon="shield-check-outline" iconColor={palette.accent} size={15} style={styles.microIcon} />
              <Text variant="labelSmall" style={[styles.heroBrandText, { color: palette.accent }]}>
                VIDKAR · FINANZAS
              </Text>
            </View>
            <IconButton
              accessibilityLabel="Actualizar saldos e historial"
              icon="refresh"
              iconColor="#f8fafc"
              size={20}
              style={styles.heroRefreshBtn}
              disabled={loading || paymentWorking || manualWorking}
              onPress={refresh}
            />
          </View>

          <View style={styles.heroTitleBox}>
            <Text variant="headlineMedium" style={[styles.heroTitle, theme.empresaAppearance ? { color: theme.empresaAppearance.headerText } : null]}>
              Saldos y pagos
            </Text>
            <Text selectable style={[styles.heroSubtitle, theme.empresaAppearance ? { color: theme.empresaAppearance.headerMuted } : null]}>
              Reserva montos parciales o totales, gestiona cada envío manual y concilia con precisión.
            </Text>
          </View>

          {/* Quick Balance Preview Strip */}
          {data.balances?.length ? (
            <View style={styles.heroBalanceStrip}>
              {data.balances.map((b) => (
                <View key={`hero:${b.domain}:${b.currency}`} style={styles.heroBalanceChip}>
                  <Text variant="labelSmall" style={styles.heroBalanceChipLabel}>
                    {b.currency}
                  </Text>
                  <Text variant="labelMedium" style={styles.heroBalanceChipValue}>
                    {formatSettlementMoney(b.payable, b.currency)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.heroFooter}>
            <View style={styles.heroBeneficiaryTag}>
              <IconButton icon="account-circle-outline" iconColor="#f8fafc" size={16} style={styles.microIcon} />
              <Text style={styles.heroChipText} numberOfLines={1}>
                {data.beneficiary.name}
              </Text>
            </View>
            {isPrincipal ? (
              <Button
                compact
                mode="outlined"
                textColor="#f8fafc"
                icon="account-switch-outline"
                style={styles.heroSelectButton}
                labelStyle={styles.heroSelectButtonLabel}
                onPress={() => setBeneficiaryDialogVisible(true)}
              >
                Cambiar
              </Button>
            ) : null}
          </View>

          <Text selectable variant="bodySmall" style={[styles.heroFootnote, theme.empresaAppearance ? { color: theme.empresaAppearance.headerMuted } : null]}>
            {isPrincipal
              ? "Reservar no transfiere dinero. Verifica la entrega antes de conciliar y no inicies un segundo envío mientras exista una operación incierta."
              : "Solicitar no transfiere dinero. El saldo disponible se reserva y el administrador principal confirma la entrega."}
          </Text>
        </Surface>

        {/* Delivery Rider Note for CADETE */}
        {mode === "CADETE" ? (
          <InfoCard type="info" title="Pagos de entregas en historial separado" palette={palette}>
            <View style={{ gap: 8 }}>
              <Text selectable style={{ color: palette.copy }}>
                Las entregas pendientes de pago al cadete no se mezclan con estos saldos centralizados. Consulta ese flujo por separado.
              </Text>
              <Button
                compact
                icon="history"
                mode="outlined"
                onPress={() => router.push("/(cadete)/CadeteDeliveryHistory")}
                style={styles.pillButtonCompact}
                labelStyle={styles.pillButtonLabel}
              >
                Ver historial de entregas
              </Button>
            </View>
          </InfoCard>
        ) : null}

        {/* Pending Operations Alert */}
        {activeManualRequests.length ? (
          <InfoCard
            type="warning"
            title={`${activeManualRequests.length} operación(es) pendiente(s)`}
            palette={palette}
          >
            {isPrincipal
              ? "Filtra el historial por Solicitudes y por Reservado, En proceso o Incierto para continuar o conciliar cada una. Las reservas reducen el disponible, pero no se consideran pagos confirmados."
              : "El saldo reservado ya no se puede solicitar otra vez. El administrador principal revisará y confirmará la entrega del pago."}
          </InfoCard>
        ) : null}

        {/* Currency Destinations Section */}
        {isOwnBeneficiary ? (
          <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
            <View style={styles.sectionHeaderLine}>
              <View style={styles.sectionTitleBlock}>
                <Text variant="titleMedium" style={{ color: palette.title, fontWeight: "700" }}>Mis destinos por moneda</Text>
                <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                  Cada moneda tiene un destino independiente. VIDKAR no convierte saldos.
                </Text>
              </View>
            </View>

            <View style={styles.destinationGrid}>
              {["CUP", "USD", "UYU"].map((currency) => {
                const destination = destinationList.find((item) => item.currency === currency);
                const compatible = isSettlementDestinationCompatible(destination);
                const currColor = getCurrencyColor(currency, palette);
                return (
                  <Surface
                    key={currency}
                    elevation={0}
                    style={[styles.destinationCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}
                  >
                    <View style={styles.destinationCardTop}>
                      <View style={[styles.currencyPillBadge, { backgroundColor: `${currColor}18`, borderColor: `${currColor}44` }]}>
                        <Text style={[styles.currencyPillText, { color: currColor }]}>{currency}</Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: destination && compatible ? palette.success : palette.warning }]} />
                    </View>

                    {destination ? (
                      <>
                        <Text selectable style={[styles.destinationMethodText, { color: palette.title }]}>
                          {SETTLEMENT_METHODS[destination.method] || destination.method}
                        </Text>
                        <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                          {destination.masked || "Datos guardados"} · v{destination.version || "—"}
                        </Text>
                        {!compatible ? (
                          <Text selectable variant="bodySmall" style={{ color: palette.warning }}>
                            Requiere actualización.
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text selectable variant="bodySmall" style={{ color: palette.muted, marginVertical: 4 }}>
                        Sin destino confirmado.
                      </Text>
                    )}

                    <Button
                      compact
                      icon="pencil-outline"
                      mode="outlined"
                      onPress={() => openDestinationEditor(currency)}
                      style={styles.pillButtonCompact}
                      labelStyle={styles.pillButtonLabel}
                    >
                      {destination ? "Actualizar" : "Configurar"}
                    </Button>
                  </Surface>
                );
              })}
            </View>

            <Text selectable variant="bodySmall" style={{ color: palette.muted, fontStyle: "italic" }}>
              Nunca guardes contraseñas, PIN, códigos 2FA, CVV ni credenciales de acceso.
            </Text>
          </Surface>
        ) : (
          <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
            <Text variant="titleMedium" style={{ color: palette.title, fontWeight: "700" }}>Destinos del beneficiario</Text>
            {destinationList.length ? destinationList.map((destination) => (
              <View key={destination.currency} style={[styles.destinationSummaryRow, { backgroundColor: palette.nestedSurface }]}>
                <View style={[styles.currencyPillBadge, { backgroundColor: `${getCurrencyColor(destination.currency, palette)}18` }]}>
                  <Text style={[styles.currencyPillText, { color: getCurrencyColor(destination.currency, palette) }]}>{destination.currency}</Text>
                </View>
                <Text selectable variant="bodySmall" style={{ color: palette.copy, flex: 1 }}>
                  {SETTLEMENT_METHODS[destination.method] || destination.method}
                  {destination.country ? ` · ${destination.country}` : ""} · {destination.masked || "sin máscara"} · v{destination.version || "—"}
                  {isSettlementDestinationCompatible(destination) ? "" : " (requiere reconfiguración)"}
                </Text>
              </View>
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

        {/* Section: Fondos disponibles */}
        <View style={styles.sectionHeading}>
          <View style={styles.sectionTitleBlock}>
            <Text variant="titleLarge" style={[styles.mainSectionTitle, { color: palette.title }]}>Fondos disponibles</Text>
            <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
              Separados por dominio y moneda; no se mezclan entre sí.
            </Text>
          </View>
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
                canRequestPayment={!isPrincipal && isOwnBeneficiary}
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
          <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
            <Text variant="titleSmall" style={{ color: palette.title, fontWeight: "700" }}>Sin saldos elegibles</Text>
            <Text selectable style={{ color: palette.muted }}>
              No hay ventas entregadas y elegibles, comisiones o pagos centrales para este beneficiario.
            </Text>
          </Surface>
        )}

        {/* Section: Historial financiero con Tablas Adaptativas */}
        <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleBlock}>
              <Text variant="titleLarge" style={[styles.mainSectionTitle, { color: palette.title }]}>Historial financiero</Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                {matchingHistoryCount} registro(s) con los filtros aplicados. Toca una fila para ver el detalle.
              </Text>
            </View>
            <Button
              compact
              icon="filter-variant"
              mode="outlined"
              onPress={openFilters}
              style={styles.pillButtonCompact}
              labelStyle={styles.pillButtonLabel}
            >
              Filtrar{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </Button>
          </View>

          {/* Modern quick tab switcher for history kinds */}
          <View style={styles.quickKindRow}>
            {FILTER_KIND_OPTIONS.map((opt) => {
              const active = appliedHistoryDraft.kind === opt.value;
              return (
                <TouchableOpacity
                  key={`quickKind:${opt.value}`}
                  onPress={() => handleQuickKindChange(opt.value)}
                  style={[
                    styles.quickKindTab,
                    {
                      backgroundColor: active ? palette.accent : palette.nestedSurface,
                      borderColor: active ? palette.accent : palette.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.quickKindTabText, { color: active ? "#090d16" : palette.copy, fontWeight: active ? "700" : "500" }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active filter tags */}
          {activeFilterCount > 0 ? (
            <View style={styles.appliedFilters}>
              {appliedHistoryDraft.domain ? <Chip compact style={styles.filterTagChip}>{appliedHistoryDraft.domain}</Chip> : null}
              {appliedHistoryDraft.currency ? <Chip compact style={styles.filterTagChip}>{appliedHistoryDraft.currency}</Chip> : null}
              {appliedHistoryDraft.status ? <Chip compact style={styles.filterTagChip}>{SETTLEMENT_STATUSES[appliedHistoryDraft.status] || appliedHistoryDraft.status}</Chip> : null}
              {appliedHistoryDraft.paymentMethod ? <Chip compact style={styles.filterTagChip}>{SETTLEMENT_METHODS[appliedHistoryDraft.paymentMethod] || appliedHistoryDraft.paymentMethod}</Chip> : null}
              {appliedHistoryDraft.from || appliedHistoryDraft.to ? (
                <Chip compact style={styles.filterTagChip}>{appliedHistoryDraft.from || "Inicio"} — {appliedHistoryDraft.to || "Hoy"}</Chip>
              ) : null}
              {appliedHistoryDraft.search ? <Chip compact icon="magnify" style={styles.filterTagChip}>{appliedHistoryDraft.search}</Chip> : null}
            </View>
          ) : null}

          {manualError ? <InfoCard type="error" title="Operación manual" palette={palette}>{manualError}</InfoCard> : null}

          {/* Table 1: Solicitudes manuales */}
          {(appliedHistoryDraft.kind === "ALL" || appliedHistoryDraft.kind === "REQUESTS") ? (
            <View style={styles.tableSection}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionTitleBlock}>
                  <Text variant="titleMedium" style={{ color: palette.title, fontWeight: "700" }}>Solicitudes manuales</Text>
                  <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                    {data.totalManualHistory} registro(s) · página de {PAGE_SIZE}
                  </Text>
                </View>
                {activeManualRequests.length ? (
                  <View style={[styles.statusPillBadge, { backgroundColor: palette.warningBg }]}>
                    <IconButton icon="clock-alert-outline" iconColor={palette.warning} size={14} style={styles.microIcon} />
                    <Text style={[styles.statusPillText, { color: palette.warning }]}>{activeManualRequests.length} activas</Text>
                  </View>
                ) : null}
              </View>

              {data.manualHistory?.length ? (
                <View style={[styles.tableContainer, { borderColor: palette.borderSubtle }]}>
                  {/* Table Header */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                    <Text style={[styles.thText, styles.flexDate, { color: palette.muted }]}>Fecha</Text>
                    {isWide ? <Text style={[styles.thText, styles.flexId, { color: palette.muted }]}>Solicitud</Text> : null}
                    {(isMedium || isWide) ? <Text style={[styles.thText, styles.flexDomain, { color: palette.muted }]}>Dominio</Text> : null}
                    <Text style={[styles.thText, styles.flexAmount, { color: palette.muted }]}>Importe</Text>
                    {(isMedium || isWide) ? <Text style={[styles.thText, styles.flexMethod, { color: palette.muted }]}>Método</Text> : null}
                    {isWide ? <Text style={[styles.thText, styles.flexDest, { color: palette.muted }]}>Destino</Text> : null}
                    <Text style={[styles.thText, styles.flexStatus, { color: palette.muted }]}>Estado</Text>
                    <View style={styles.colActionIndicator} />
                  </View>

                  {/* Table Rows */}
                  {data.manualHistory.map((request, idx) => {
                    const statusCfg = getStatusConfig(request.status, palette);
                    const isEven = idx % 2 === 0;
                    return (
                      <TouchableOpacity
                        key={request._id}
                        activeOpacity={0.65}
                        onPress={() => setSelectedRequest(request)}
                        style={[
                          styles.tableRow,
                          {
                            backgroundColor: isEven ? palette.surface : palette.nestedSurface,
                            borderColor: palette.borderSubtle,
                          },
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.tdText, styles.flexDate, { color: palette.muted }]}>
                          {formatSettlementDate(request.createdAt).split(" ")[0]}
                        </Text>
                        {isWide ? (
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexId, { color: palette.muted }]}>
                            {request._id.slice(0, 8)}…
                          </Text>
                        ) : null}
                        {(isMedium || isWide) ? (
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexDomain, { color: palette.copy }]}>
                            {request.domain}
                          </Text>
                        ) : null}
                        <Text numberOfLines={1} style={[styles.tdText, styles.flexAmount, { color: palette.title, fontWeight: "700" }]}>
                          {formatSettlementMoney(request.amount, request.currency)}
                        </Text>
                        {(isMedium || isWide) ? (
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexMethod, { color: palette.copy }]}>
                            {getManualMethodLabel(request)}
                          </Text>
                        ) : null}
                        {isWide ? (
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexDest, { color: palette.muted }]}>
                            {request.destinationMask || "—"}
                          </Text>
                        ) : null}
                        <View style={styles.flexStatus}>
                          <View style={[styles.statusPillBadge, { backgroundColor: statusCfg.bg, borderColor: `${statusCfg.color}44` }]}>
                            <Text numberOfLines={1} style={[styles.statusPillText, { color: statusCfg.color }]}>
                              {statusCfg.label}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.colActionIndicator}>
                          <IconButton icon="chevron-right" size={16} iconColor={palette.muted} style={styles.microIcon} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text selectable style={{ color: palette.muted, paddingVertical: 12 }}>
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
          ) : null}

          {/* Table 2: Pagos confirmados */}
          {(appliedHistoryDraft.kind === "ALL" || appliedHistoryDraft.kind === "PAYMENTS") ? (
            <>
              {appliedHistoryDraft.kind === "ALL" ? <Divider style={styles.divider} /> : null}
              <View style={styles.tableSection}>
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionTitleBlock}>
                    <Text variant="titleMedium" style={{ color: palette.title, fontWeight: "700" }}>Pagos confirmados</Text>
                    <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                      {data.totalPayments} pago(s) central(es) · página de {PAGE_SIZE}
                    </Text>
                  </View>
                </View>

                {data.payments?.length ? (
                  <View style={[styles.tableContainer, { borderColor: palette.borderSubtle }]}>
                    {/* Table Header */}
                    <View style={[styles.tableHeaderRow, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                      <Text style={[styles.thText, styles.flexDate, { color: palette.muted }]}>Fecha</Text>
                      {isWide ? <Text style={[styles.thText, styles.flexRef, { color: palette.muted }]}>Referencia</Text> : null}
                      {(isMedium || isWide) ? <Text style={[styles.thText, styles.flexDomain, { color: palette.muted }]}>Dominio</Text> : null}
                      <Text style={[styles.thText, styles.flexAmount, { color: palette.muted }]}>Monto</Text>
                      <Text style={[styles.thText, styles.flexMethod, { color: palette.muted }]}>Método</Text>
                      {isWide ? <Text style={[styles.thText, styles.flexFee, { color: palette.muted }]}>Comisión VIDKAR</Text> : null}
                      <View style={styles.colActionIndicator} />
                    </View>

                    {/* Table Rows */}
                    {data.payments.map((payment, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <TouchableOpacity
                          key={payment._id}
                          activeOpacity={0.65}
                          onPress={() => setSelectedPayment(payment)}
                          style={[
                            styles.tableRow,
                            {
                              backgroundColor: isEven ? palette.surface : palette.nestedSurface,
                              borderColor: palette.borderSubtle,
                            },
                          ]}
                        >
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexDate, { color: palette.muted }]}>
                            {formatSettlementDate(payment.createdAt).split(" ")[0]}
                          </Text>
                          {isWide ? (
                            <Text numberOfLines={1} style={[styles.tdText, styles.flexRef, { color: palette.muted }]}>
                              {payment.paymentReference || "—"}
                            </Text>
                          ) : null}
                          {(isMedium || isWide) ? (
                            <Text numberOfLines={1} style={[styles.tdText, styles.flexDomain, { color: palette.copy }]}>
                              {payment.domain}
                            </Text>
                          ) : null}
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexAmount, { color: palette.success, fontWeight: "700" }]}>
                            {formatSettlementMoney(payment.amount, payment.currency)}
                          </Text>
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexMethod, { color: palette.copy }]}>
                            {getPaymentMethodLabel(payment)}
                          </Text>
                          {isWide ? (
                            <Text numberOfLines={1} style={[styles.tdText, styles.flexFee, { color: palette.muted }]}>
                              {Number(payment.feeAmount) > 0 ? formatSettlementMoney(payment.feeAmount, payment.feeCurrency) : "—"}
                            </Text>
                          ) : null}
                          <View style={styles.colActionIndicator}>
                            <IconButton icon="chevron-right" size={16} iconColor={palette.muted} style={styles.microIcon} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text selectable style={{ color: palette.muted, paddingVertical: 12 }}>
                    No hay pagos confirmados para estos filtros.
                  </Text>
                )}

                <PaginationBar
                  page={historyPage}
                  total={data.totalPayments || 0}
                  onPageChange={setHistoryPage}
                  disabled={loading}
                  palette={palette}
                />
              </View>
            </>
          ) : null}

          {/* Table 3: Pagos históricos */}
          {(appliedHistoryDraft.kind === "ALL" || appliedHistoryDraft.kind === "HISTORICAL") && (data.historicalCount > 0 || appliedHistoryDraft.kind === "HISTORICAL") ? (
            <>
              <Divider style={styles.divider} />
              <View style={styles.tableSection}>
                <View style={styles.sectionTitleBlock}>
                  <Text variant="titleMedium" style={{ color: palette.title, fontWeight: "700" }}>Pagos históricos de cursos</Text>
                  <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                    {data.historicalCount} movimiento(s) sin imputación a ventas. Toca para ver el detalle.
                  </Text>
                </View>

                {data.historicalPayments?.length ? (
                  <View style={[styles.tableContainer, { borderColor: palette.borderSubtle }]}>
                    <View style={[styles.tableHeaderRow, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                      <Text style={[styles.thText, styles.flexDate, { color: palette.muted }]}>Fecha</Text>
                      {(isMedium || isWide) ? <Text style={[styles.thText, styles.flexRef, { color: palette.muted }]}>Referencia / Método</Text> : null}
                      <Text style={[styles.thText, styles.flexAmount, { color: palette.muted }]}>Monto USD</Text>
                      <Text style={[styles.thText, styles.flexStatus, { color: palette.muted }]}>Estado</Text>
                      <View style={styles.colActionIndicator} />
                    </View>

                    {data.historicalPayments.map((payment, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <TouchableOpacity
                          key={payment._id}
                          activeOpacity={0.65}
                          onPress={() => setSelectedHistoricalPayment(payment)}
                          style={[
                            styles.tableRow,
                            {
                              backgroundColor: isEven ? palette.surface : palette.nestedSurface,
                              borderColor: palette.borderSubtle,
                            },
                          ]}
                        >
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexDate, { color: palette.muted }]}>
                            {formatSettlementDate(payment.createdAt).split(" ")[0]}
                          </Text>
                          {(isMedium || isWide) ? (
                            <Text numberOfLines={1} style={[styles.tdText, styles.flexRef, { color: palette.copy }]}>
                              {payment.paymentReference || payment.paymentMethod || "Sin referencia"}
                            </Text>
                          ) : null}
                          <Text numberOfLines={1} style={[styles.tdText, styles.flexAmount, { color: palette.title, fontWeight: "700" }]}>
                            {formatSettlementMoney(payment.amountUsd, "USD")}
                          </Text>
                          <View style={styles.flexStatus}>
                            <View style={[styles.statusPillBadge, { backgroundColor: palette.warningBg, borderColor: `${palette.warning}44` }]}>
                              <Text numberOfLines={1} style={[styles.statusPillText, { color: palette.warning }]}>
                                {SETTLEMENT_STATUSES.HISTORICAL}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.colActionIndicator}>
                            <IconButton icon="chevron-right" size={16} iconColor={palette.muted} style={styles.microIcon} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text selectable style={{ color: palette.muted, paddingVertical: 12 }}>
                    No hay movimientos históricos para estos filtros.
                  </Text>
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

        {/* Section: Detalle por venta con Tabla Adaptativa */}
        <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionTitleBlock}>
              <Text variant="titleLarge" style={[styles.mainSectionTitle, { color: palette.title }]}>Detalle por venta</Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                Neto, pagos, reservas y monto pendiente. Toca una fila para ver el desglose completo.
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

          {data.lines?.length ? (
            <View style={[styles.tableContainer, { borderColor: palette.borderSubtle }]}>
              {/* Header */}
              <View style={[styles.tableHeaderRow, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                {isWide ? <Text style={[styles.thText, styles.flexDate, { color: palette.muted }]}>Fecha</Text> : null}
                <Text style={[styles.thText, styles.flexSaleName, { color: palette.muted }]}>Venta / Ítem</Text>
                {(isMedium || isWide) ? <Text style={[styles.thText, styles.flexDomain, { color: palette.muted }]}>Dominio</Text> : null}
                {isWide ? <Text style={[styles.thText, styles.flexRole, { color: palette.muted }]}>Rol</Text> : null}
                <Text style={[styles.thText, styles.flexMetric, { color: palette.muted }]}>Neto</Text>
                {isWide ? <Text style={[styles.thText, styles.flexMetric, { color: palette.muted }]}>Pagado</Text> : null}
                {isWide ? <Text style={[styles.thText, styles.flexMetric, { color: palette.muted }]}>Reservado</Text> : null}
                <Text style={[styles.thText, styles.flexMetric, { color: palette.muted }]}>Pendiente</Text>
                <View style={styles.colActionIndicator} />
              </View>

              {/* Rows */}
              {data.lines.map((line, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <TouchableOpacity
                    key={line.key}
                    activeOpacity={0.65}
                    onPress={() => setSelectedLine(line)}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: isEven ? palette.surface : palette.nestedSurface,
                        borderColor: palette.borderSubtle,
                      },
                    ]}
                  >
                    {isWide ? (
                      <Text numberOfLines={1} style={[styles.tdText, styles.flexDate, { color: palette.muted }]}>
                        {formatSettlementDate(line.createdAt).split(" ")[0]}
                      </Text>
                    ) : null}
                    <View style={styles.flexSaleName}>
                      <Text numberOfLines={1} style={[styles.tdText, { color: palette.title, fontWeight: "700" }]}>
                        {line.label || line.saleId}
                      </Text>
                      {!isWide ? (
                        <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 11 }}>
                          {line.currency} · ítem {line.itemKey}
                        </Text>
                      ) : null}
                    </View>
                    {(isMedium || isWide) ? (
                      <Text numberOfLines={1} style={[styles.tdText, styles.flexDomain, { color: palette.copy }]}>
                        {line.domain}
                      </Text>
                    ) : null}
                    {isWide ? (
                      <Text numberOfLines={1} style={[styles.tdText, styles.flexRole, { color: palette.copy }]}>
                        {ROLE_LABELS[line.role] || line.role}
                      </Text>
                    ) : null}
                    <Text numberOfLines={1} style={[styles.tdText, styles.flexMetric, { color: palette.title, fontWeight: "700" }]}>
                      {formatSettlementMoney(line.amount, line.currency)}
                    </Text>
                    {isWide ? (
                      <Text numberOfLines={1} style={[styles.tdText, styles.flexMetric, { color: palette.success }]}>
                        {formatSettlementMoney(line.paid, line.currency)}
                      </Text>
                    ) : null}
                    {isWide ? (
                      <Text numberOfLines={1} style={[styles.tdText, styles.flexMetric, { color: palette.warning }]}>
                        {formatSettlementMoney(line.reserved, line.currency)}
                      </Text>
                    ) : null}
                    <Text numberOfLines={1} style={[styles.tdText, styles.flexMetric, { color: palette.accent, fontWeight: "700" }]}>
                      {formatSettlementMoney(line.pending, line.currency)}
                    </Text>
                    <View style={styles.colActionIndicator}>
                      <IconButton icon="chevron-right" size={16} iconColor={palette.muted} style={styles.microIcon} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text selectable style={{ color: palette.muted, paddingVertical: 12 }}>No hay ventas para estos filtros.</Text>
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
        subtitle={isPrincipal ? "Administración financiera" : "Tus saldos y solicitudes"}
        showBackButton
        backHref={backHref}
        backgroundColor={DEFAULT_HEADER_COLOR}
        glassIntensity={48}
        glassOverlayOpacity={0.4}
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
          contentContainerStyle={[styles.content, { paddingTop: headerInset + 18 }]}
        >
          {!userReady ? (
            <Surface elevation={0} style={[styles.sectionCard, styles.centeredLoading, { backgroundColor: palette.surface }]}>
              <ActivityIndicator color={palette.accent} size="large" />
              <Text selectable style={{ color: palette.copy, marginTop: 12 }}>Verificando la sesión…</Text>
            </Surface>
          ) : !userId ? (
            <InfoCard type="error" title="Sesión requerida" palette={palette}>
              Inicia sesión para consultar tus saldos y solicitudes.
            </InfoCard>
          ) : (
            <>
              {catalogLoading && !beneficiaries.length ? (
                <Surface elevation={0} style={[styles.sectionCard, styles.centeredLoading, { backgroundColor: palette.surface }]}>
                  <ActivityIndicator color={palette.accent} />
                  <Text selectable style={{ color: palette.copy, marginTop: 12 }}>Cargando beneficiarios…</Text>
                </Surface>
              ) : null}

              {catalogError ? <InfoCard type="error" title="Catálogo de beneficiarios" palette={palette}>{catalogError}</InfoCard> : null}

              {pendingRequests.length ? (
                <Surface elevation={0} style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.borderSubtle }]}>
                  <Text variant="titleMedium" style={{ color: palette.title, fontWeight: "700" }}>Solicitudes pendientes de cobro</Text>
                  {pendingRequests.map((request) => (
                    <Button
                      key={request._id}
                      mode="outlined"
                      style={styles.pillButtonOutlined}
                      labelStyle={styles.pillButtonLabel}
                      onPress={() => {
                        chooseBeneficiary(request.beneficiaryId);
                        setHistoryFilters({ kind: "REQUESTS" });
                        setAppliedHistoryDraft({ ...DEFAULT_HISTORY_FILTERS, kind: "REQUESTS" });
                      }}
                    >
                      {beneficiaries.find((item) => item._id === request.beneficiaryId)?.name || "Beneficiario"} · {formatSettlementMoney(request.amount, request.currency)} · {SETTLEMENT_STATUSES[request.status]}
                    </Button>
                  ))}
                </Surface>
              ) : null}

              {error ? <InfoCard type="error" title="No se pudo cargar el resumen" palette={palette}>{error}</InfoCard> : null}

              {loading ? (
                <Surface elevation={0} style={[styles.sectionCard, styles.centeredLoading, { backgroundColor: palette.surface }]}>
                  <ActivityIndicator color={palette.accent} />
                  <Text selectable style={{ color: palette.copy, marginTop: 12 }}>Cargando saldos e historial filtrado…</Text>
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

      {/* Drawer: Seleccionar beneficiario */}
      <SettlementDrawer
        actions={(
          <Button mode="contained" onPress={() => setBeneficiaryDialogVisible(false)} style={styles.pillDialogAction}>
            Cerrar
          </Button>
        )}
        onClose={() => setBeneficiaryDialogVisible(false)}
        open={beneficiaryDialogVisible}
        title="Seleccionar beneficiario"
      >
        <View style={styles.drawerContent}>
          <Searchbar
            accessibilityLabel="Buscar beneficiario"
            placeholder="Nombre o identificador"
            value={beneficiarySearch}
            onChangeText={setBeneficiarySearch}
            style={[styles.searchBar, { backgroundColor: palette.nestedSurface }]}
          />
          <View style={styles.dialogList}>
            {filteredBeneficiaries.map((beneficiary) => {
              const selected = beneficiary._id === targetId;
              return (
                <TouchableOpacity
                  key={beneficiary._id}
                  activeOpacity={0.7}
                  onPress={() => chooseBeneficiary(beneficiary._id)}
                  style={[
                    styles.beneficiaryListItem,
                    {
                      backgroundColor: selected ? `${palette.accent}18` : palette.nestedSurface,
                      borderColor: selected ? palette.accent : palette.borderSubtle,
                    },
                  ]}
                >
                  <IconButton
                    icon="account"
                    iconColor={selected ? palette.accent : palette.muted}
                    size={20}
                    style={styles.microIcon}
                  />
                  <Text style={[styles.beneficiaryName, { color: selected ? palette.accent : palette.title, fontWeight: selected ? "700" : "500" }]}>
                    {beneficiary.name}
                  </Text>
                  {selected ? <IconButton icon="check" iconColor={palette.accent} size={16} style={styles.microIcon} /> : null}
                </TouchableOpacity>
              );
            })}
            {!filteredBeneficiaries.length ? (
              <Text selectable style={{ color: palette.muted, padding: 16, textAlign: "center" }}>
                No hay beneficiarios que coincidan con la búsqueda.
              </Text>
            ) : null}
          </View>
        </View>
      </SettlementDrawer>

      {/* Drawer: Filtros del historial */}
      <SettlementDrawer
        actions={(
          <>
            <Button onPress={clearHistoryFilters} style={styles.pillDialogAction}>Limpiar</Button>
            <Button onPress={() => setHistoryDialogVisible(false)} style={styles.pillDialogAction}>Cancelar</Button>
            <Button mode="contained" onPress={applyHistoryFilters} style={[styles.pillDialogAction, { backgroundColor: palette.accent }]} labelStyle={{ color: "#090d16" }}>
              Aplicar
            </Button>
          </>
        )}
        onClose={() => setHistoryDialogVisible(false)}
        open={historyDialogVisible}
        title="Filtros del historial"
      >
        <View style={styles.filterDialogBody}>
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
              style={[styles.dateInput, styles.modernInput]}
            />
            <TextInput
              accessibilityLabel="Fecha final"
              label="Hasta · AAAA-MM-DD"
              mode="outlined"
              value={historyFilterDraft.to}
              onChangeText={(value) => setHistoryDraftField("to", value)}
              maxLength={10}
              keyboardType="numbers-and-punctuation"
              style={[styles.dateInput, styles.modernInput]}
            />
          </View>
          <TextInput
            accessibilityLabel="Buscar referencia o solicitud"
            label="Referencia, solicitud, venta o nota"
            mode="outlined"
            value={historyFilterDraft.search}
            onChangeText={(value) => setHistoryDraftField("search", value)}
            maxLength={120}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.modernInput}
          />
          {historyFilterError ? (
            <InfoCard type="error" palette={palette}>{historyFilterError}</InfoCard>
          ) : null}
        </View>
      </SettlementDrawer>

      {/* Drawer: Preparar / Solicitar pago */}
      <SettlementDrawer
        allowSwipeToClose={!paymentSubmitted}
        actions={(
          <>
            <Button disabled={paymentWorking} onPress={closePayment} style={styles.pillDialogAction}>Cerrar</Button>
            <Button
              disabled={paymentWorking || paymentInvalid || (isPrincipal ? !data?.canRegister : !isOwnBeneficiary)}
              loading={paymentWorking}
              mode="contained"
              onPress={isPrincipal ? preparePayment : requestOwnPayment}
              style={[styles.pillDialogAction, { backgroundColor: palette.accent }]}
              labelStyle={{ color: "#090d16", fontWeight: "700" }}
            >
              {paymentWorking
                ? isPrincipal ? "Reservando…" : "Enviando solicitud…"
                : paymentSubmitted
                  ? "Reintentar misma solicitud"
                  : isPrincipal ? "Reservar saldo" : "Solicitar cobro"}
            </Button>
          </>
        )}
        locked={paymentWorking}
        onClose={closePayment}
        open={Boolean(paymentForm)}
        title={`${isPrincipal ? "Preparar pago" : "Solicitar cobro"} ${paymentForm?.paymentType === "TOTAL" ? "total" : "parcial"} · ${paymentForm?.domain || ""} · ${paymentForm?.currency || ""}`}
      >
        {paymentForm ? (
          <View style={styles.dialogForm}>
            <InfoCard
              type="warning"
              title={isPrincipal ? "Reserva manual · no se transfiere dinero" : "Solicitud de cobro · requiere aprobación"}
              palette={palette}
            >
              {isPrincipal
                ? "El servidor congelará este importe y sus imputaciones FIFO. Después debes verificar el canal externo y confirmar el resultado. Si es REMESA, la liquidación ocurre únicamente al confirmar la entrega real."
                : "Se reservará el saldo disponible para evitar solicitudes duplicadas. El administrador principal verificará y confirmará la entrega antes de marcarlo como pagado."}
            </InfoCard>

            <View style={[styles.paymentAvailableBox, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <Text variant="labelSmall" style={{ color: palette.muted }}>TOTAL DISPONIBLE</Text>
              <Text selectable variant="headlineSmall" style={{ color: palette.title, fontWeight: "800" }}>
                {formatSettlementMoney(paymentForm.available, paymentForm.currency)}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.copy, marginTop: 4 }}>
                Destino: {SETTLEMENT_METHODS[paymentDestination?.method] || "sin destino"}
                {paymentDestination?.masked ? ` · ${paymentDestination.masked}` : ""}
              </Text>
            </View>

            {isPrincipal ? (
              <SegmentedButtons
                value={paymentForm.paymentType}
                onValueChange={(value) => setPaymentForm((current) => ({ ...current, paymentType: value, amount: "" }))}
                buttons={[
                  { value: "TOTAL", label: "Todo el disponible", disabled: paymentSubmitted },
                  { value: "PARTIAL", label: "Importe parcial", disabled: paymentSubmitted },
                ]}
              />
            ) : null}

            {isPrincipal && paymentForm.paymentType === "PARTIAL" ? (
              <TextInput
                accessibilityLabel={`Importe parcial en ${paymentForm.currency}`}
                label={`Importe a reservar · ${paymentForm.currency}`}
                mode="outlined"
                value={paymentForm.amount}
                onChangeText={(amount) => setPaymentForm((current) => ({ ...current, amount }))}
                keyboardType="decimal-pad"
                maxLength={18}
                disabled={paymentSubmitted}
                style={styles.modernInput}
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
              <InfoCard type="error" title={isPrincipal ? "No se confirmó la reserva" : "No se confirmó la solicitud"} palette={palette}>
                {paymentError} Conserva esta solicitud y reintenta con el mismo formulario.
              </InfoCard>
            ) : null}

            <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
              {isPrincipal
                ? "El servidor selecciona las imputaciones más antiguas, verifica límites y evita duplicados con el mismo identificador de solicitud."
                : "La solicitud corresponde al total disponible en esta moneda. Puedes consultar el estado en el historial financiero."}
            </Text>
          </View>
        ) : null}
      </SettlementDrawer>

      {/* Drawer: Destino de cobro */}
      <SettlementDrawer
        actions={(
          <>
            <Button disabled={destinationWorking} onPress={() => setDestinationDialogVisible(false)} style={styles.pillDialogAction}>
              Cancelar
            </Button>
            <Button
              disabled={destinationWorking || Boolean(destinationValidationError) || remesaOptionsLoading || Boolean(remesaOptionsError)}
              loading={destinationWorking}
              mode="contained"
              onPress={saveDestination}
              style={[styles.pillDialogAction, { backgroundColor: palette.accent }]}
              labelStyle={{ color: "#090d16", fontWeight: "700" }}
            >
              Guardar destino
            </Button>
          </>
        )}
        locked={destinationWorking}
        onClose={() => !destinationWorking && setDestinationDialogVisible(false)}
        open={destinationDialogVisible}
        title={`Destino de cobro · ${destinationForm.currency}`}
      >
        <View style={styles.dialogForm}>
          <InfoCard type="info" title="Datos de cobro protegidos" palette={palette}>
            Ingresa solo los datos necesarios para recibir el pago. No guardes contraseñas, PIN, CVV, códigos 2FA ni credenciales bancarias.
          </InfoCard>

          <ChipGroup
            label="Método de cobro"
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
            <InfoCard type="info" palette={palette}>Destino de remesa a Cuba. La entrega física o transferencia se confirma por separado.</InfoCard>
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
            style={styles.modernInput}
          />

          {destinationForm.method === "PAYPAL" || destinationForm.method === "MERCADOPAGO" ? (
            <>
              <TextInput
                accessibilityLabel="Identificador de cuenta receptora"
                label="Correo, celular o ID receptivo"
                mode="outlined"
                value={destinationForm.recipientIdentifier}
                onChangeText={(value) => changeDestinationField("recipientIdentifier", value)}
                maxLength={180}
                autoCapitalize="none"
                autoCorrect={false}
                disabled={destinationWorking}
                style={styles.modernInput}
              />
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                Mercado Pago puede requerir un identificador específico. Nunca compartas credenciales de acceso.
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
                style={styles.modernInput}
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
                style={styles.modernInput}
              />
              <TextInput
                accessibilityLabel="Sucursal bancaria"
                label="Sucursal (opcional)"
                mode="outlined"
                value={destinationForm.branch}
                onChangeText={(value) => changeDestinationField("branch", value)}
                maxLength={80}
                disabled={destinationWorking}
                style={styles.modernInput}
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
                  style={styles.modernInput}
                />
              ) : null}
            </>
          ) : null}

          {destinationForm.method === "REMESA" ? (
            <>
              {remesaOptionsLoading ? (
                <View style={styles.inlineLoading}><ActivityIndicator /><Text style={{ color: palette.copy }}>Cargando opciones activas…</Text></View>
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
                  style={styles.modernInput}
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
                  style={styles.modernInput}
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
            <Text selectable style={[styles.bodyText, { color: palette.copy, flex: 1 }]}>
              Confirmo que soy titular o tengo autorización para usar este destino.
            </Text>
          </View>

          {destinationValidationError ? (
            <Text selectable variant="bodySmall" style={{ color: palette.warning }}>{destinationValidationError}</Text>
          ) : null}
          {destinationError ? <InfoCard type="error" palette={palette}>{destinationError}</InfoCard> : null}
        </View>
      </SettlementDrawer>

      {/* Drawer: Revisar transferencia / Verificar remesa (Instrucciones) */}
      <SettlementDrawer
        actions={(
          <>
            <Button disabled={manualWorking} onPress={closeManualDialog} style={styles.pillDialogAction}>Cerrar</Button>
            <Button
              disabled={manualWorking || !canConfirmManual}
              loading={manualWorking}
              mode="contained"
              onPress={confirmManualPayment}
              style={[styles.pillDialogAction, { backgroundColor: palette.accent }]}
              labelStyle={{ color: "#090d16", fontWeight: "700" }}
            >
              {manualWorking ? "Registrando…" : manualIsRemesa ? "Confirmar entrega real" : "Confirmar pago completado"}
            </Button>
          </>
        )}
        locked={manualWorking}
        onClose={closeManualDialog}
        open={Boolean(manualDetail)}
        title={`${manualIsRemesa ? "Verificar remesa" : "Revisar transferencia"} · ${manualDetail?.domain || ""} · ${manualDetail?.currency || ""}`}
      >
        {manualDetail ? (
          <View style={styles.dialogForm}>
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

            <View style={[styles.paymentAvailableBox, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <Text selectable variant="headlineSmall" style={{ color: palette.title, fontWeight: "800" }}>
                {formatSettlementMoney(manualDetail.amount, manualDetail.currency)}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.copy, marginTop: 4 }}>
                Estado: {SETTLEMENT_STATUSES[manualDetail.status] || manualDetail.status} · método {SETTLEMENT_METHODS[manualDetail.paymentMethod] || manualDetail.paymentMethod}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                Titular: {manualDestinationDetails.holderName || "No disponible"}
                {manualDetail.destination?.country ? ` · destino ${manualDetail.destination.country}` : ""}
              </Text>
            </View>

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
                  <Button compact icon="open-in-new" mode="outlined" onPress={openRemesa} style={styles.pillButtonCompact}>
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
                  style={styles.modernInput}
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
                  style={styles.modernInput}
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
                  style={styles.modernInput}
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
              <Text selectable style={[styles.bodyText, { color: palette.copy, flex: 1 }]}>
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
                  style={styles.modernInput}
                />
                {manualDetail.status === "IN_PROCESS" ? (
                  <Button
                    disabled={manualWorking || manualResolutionReason.trim().length < 3}
                    icon="help-circle-outline"
                    mode="outlined"
                    onPress={() => resolveManualPayment("UNKNOWN")}
                    style={styles.pillButtonOutlined}
                    labelStyle={styles.pillButtonLabel}
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
                  <Text selectable style={[styles.bodyText, { color: palette.copy, flex: 1 }]}>
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
                  style={[styles.pillButtonOutlined, { borderColor: palette.error }]}
                  labelStyle={{ color: palette.error }}
                >
                  Confirmar fallo sin entrega y liberar saldo
                </Button>
              </>
            ) : null}
            {manualError ? <InfoCard type="error" palette={palette}>{manualError}</InfoCard> : null}
          </View>
        ) : null}
      </SettlementDrawer>

      {/* Drawer: Detalle de Solicitud (al tocar una fila de la tabla) */}
      <SettlementDrawer
        actions={(
          <Button mode="contained" onPress={() => setSelectedRequest(null)} style={styles.pillDialogAction}>
            Cerrar
          </Button>
        )}
        onClose={() => setSelectedRequest(null)}
        open={Boolean(selectedRequest)}
        title="Detalle de solicitud"
      >
        {selectedRequest ? (
          <View style={styles.dialogForm}>
            <View style={[styles.paymentAvailableBox, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <Text selectable variant="headlineSmall" style={{ color: palette.title, fontWeight: "800" }}>
                {formatSettlementMoney(selectedRequest.amount, selectedRequest.currency)}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.copy, marginTop: 4 }}>
                {selectedRequest.domain} · {getManualMethodLabel(selectedRequest)} · {selectedRequest.paymentType === "TOTAL" ? "Total" : "Parcial"}
              </Text>
              <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
                {(() => {
                  const cfg = getStatusConfig(selectedRequest.status, palette);
                  return (
                    <View style={[styles.statusPillBadge, { backgroundColor: cfg.bg, borderColor: `${cfg.color}44` }]}>
                      <IconButton icon={cfg.icon} iconColor={cfg.color} size={14} style={styles.microIcon} />
                      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>

            <View style={[styles.detailsMetaCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Fecha:</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{formatSettlementDate(selectedRequest.createdAt)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Destino:</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{selectedRequest.destinationMask || "No disponible"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>ID de solicitud:</Text>
                <Text selectable variant="bodySmall" style={{ color: palette.copy }}>{selectedRequest._id}</Text>
              </View>
              {selectedRequest.paymentReference ? (
                <View style={styles.metaRow}>
                  <Text variant="labelMedium" style={{ color: palette.muted }}>Referencia:</Text>
                  <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{selectedRequest.paymentReference}</Text>
                </View>
              ) : null}
              {selectedRequest.resolutionReason ? (
                <View style={styles.metaRow}>
                  <Text variant="labelMedium" style={{ color: palette.muted }}>Motivo resolución:</Text>
                  <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{selectedRequest.resolutionReason}</Text>
                </View>
              ) : null}
            </View>

            {selectedRequest.blockedBySaleReversal ? (
              <InfoCard type="warning" palette={palette}>
                {selectedRequest.blockedReason || "La venta fue revertida."} No inicies otra operación; verifica el resultado real antes de resolver la reserva.
              </InfoCard>
            ) : null}

            {selectedRequest.remesaSaleId ? (
              <Button compact icon="open-in-new" mode="outlined" onPress={openRemesa} style={styles.pillButtonCompact}>
                Ver remesa {selectedRequest.remesaSaleId}
              </Button>
            ) : null}

            {data?.canRegister && MANUAL_PENDING_STATUSES.includes(selectedRequest.status) ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Button
                  disabled={manualWorking}
                  icon={selectedRequest.paymentMethod === "REMESA" ? "bank-transfer" : "clipboard-check-outline"}
                  mode="contained"
                  onPress={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    openManualInstructions(req);
                  }}
                  style={[styles.pillActionBtn, { backgroundColor: palette.accent }]}
                  labelStyle={{ color: "#090d16", fontWeight: "700" }}
                >
                  {getRequestActionLabel(selectedRequest)}
                </Button>
                {selectedRequest.status === "RESERVED" ? (
                  <Button
                    disabled={manualWorking}
                    icon="cancel"
                    mode="outlined"
                    onPress={() => {
                      const req = selectedRequest;
                      setSelectedRequest(null);
                      cancelReservedPayment(req);
                    }}
                    style={[styles.pillActionBtn, { borderColor: palette.error }]}
                    labelStyle={{ color: palette.error }}
                  >
                    Cancelar reserva
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </SettlementDrawer>

      {/* Drawer: Imputación del pago (al tocar una fila de Pagos confirmados) */}
      <SettlementDrawer
        actions={(
          <Button mode="contained" onPress={() => setSelectedPayment(null)} style={styles.pillDialogAction}>
            Cerrar
          </Button>
        )}
        onClose={() => setSelectedPayment(null)}
        open={Boolean(selectedPayment)}
        title="Imputación del pago"
      >
        {selectedPayment ? (
          <View style={styles.dialogForm}>
            <View style={[styles.paymentAvailableBox, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <Text selectable variant="headlineSmall" style={{ color: palette.title, fontWeight: "800" }}>
                {formatSettlementMoney(selectedPayment.amount, selectedPayment.currency)}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.copy, marginTop: 4 }}>
                {selectedPayment.domain} · {selectedPayment.paymentType === "TOTAL" ? "Total" : "Parcial"} · {getPaymentMethodLabel(selectedPayment)}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted }}>
                {formatSettlementDate(selectedPayment.createdAt)} · {selectedPayment.paymentReference}
              </Text>
            </View>

            {selectedPayment.remesaSaleId ? (
              <Button compact icon="open-in-new" mode="outlined" onPress={openRemesa} style={styles.pillButtonCompact}>
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
            <Text variant="titleSmall" style={{ color: palette.title, fontWeight: "700" }}>Líneas imputadas (FIFO)</Text>

            {(selectedPayment.allocations || []).map((line) => (
              <Surface key={line.key} elevation={0} style={[styles.historyCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                <Text selectable variant="titleSmall" style={{ color: palette.title, fontWeight: "700" }}>{line.label}</Text>
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
          </View>
        ) : null}
      </SettlementDrawer>

      {/* Drawer: Detalle de Pago Histórico de Cursos */}
      <SettlementDrawer
        actions={(
          <Button mode="contained" onPress={() => setSelectedHistoricalPayment(null)} style={styles.pillDialogAction}>
            Cerrar
          </Button>
        )}
        onClose={() => setSelectedHistoricalPayment(null)}
        open={Boolean(selectedHistoricalPayment)}
        title="Pago histórico de cursos"
      >
        {selectedHistoricalPayment ? (
          <View style={styles.dialogForm}>
            <View style={[styles.paymentAvailableBox, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <Text selectable variant="headlineSmall" style={{ color: palette.title, fontWeight: "800" }}>
                {formatSettlementMoney(selectedHistoricalPayment.amountUsd, "USD")}
              </Text>
              <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
                <View style={[styles.statusPillBadge, { backgroundColor: palette.warningBg, borderColor: `${palette.warning}44` }]}>
                  <IconButton icon="book-open-outline" iconColor={palette.warning} size={14} style={styles.microIcon} />
                  <Text style={[styles.statusPillText, { color: palette.warning }]}>{SETTLEMENT_STATUSES.HISTORICAL}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailsMetaCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Fecha:</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{formatSettlementDate(selectedHistoricalPayment.createdAt)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Referencia / Método:</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>
                  {selectedHistoricalPayment.paymentReference || selectedHistoricalPayment.paymentMethod || "Sin referencia"}
                </Text>
              </View>
            </View>

            <InfoCard type="warning" title="Conciliación requerida" palette={palette}>
              Este pago histórico no tiene imputación directa a ventas de cursos. Requiere verificación contable en el libro de cursos.
            </InfoCard>

            <Button
              compact
              icon="book-open-variant"
              mode="contained"
              onPress={() => {
                setSelectedHistoricalPayment(null);
                openCourseLedger();
              }}
              style={[styles.pillActionBtn, { backgroundColor: palette.accent }]}
              labelStyle={{ color: "#090d16", fontWeight: "700" }}
            >
              Consultar libro histórico de cursos
            </Button>
          </View>
        ) : null}
      </SettlementDrawer>

      {/* Drawer: Detalle de Venta (al tocar una fila de la tabla de Detalle por venta) */}
      <SettlementDrawer
        actions={(
          <Button mode="contained" onPress={() => setSelectedLine(null)} style={styles.pillDialogAction}>
            Cerrar
          </Button>
        )}
        onClose={() => setSelectedLine(null)}
        open={Boolean(selectedLine)}
        title="Detalle de venta"
      >
        {selectedLine ? (
          <View style={styles.dialogForm}>
            <View style={[styles.paymentAvailableBox, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <Text selectable variant="titleLarge" style={{ color: palette.title, fontWeight: "800" }}>
                {selectedLine.label || selectedLine.saleId}
              </Text>
              <Text selectable variant="bodySmall" style={{ color: palette.muted, marginTop: 2 }}>
                Venta {selectedLine.saleId} · Ítem {selectedLine.itemKey}
              </Text>
              <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
                <View style={[styles.currencyPillBadge, { backgroundColor: palette.screen, borderColor: palette.borderSubtle }]}>
                  <Text style={[styles.currencyPillText, { color: palette.accent }]}>{selectedLine.domain} · {selectedLine.currency}</Text>
                </View>
                <View style={[styles.capsuleBadge, { backgroundColor: palette.screen }]}>
                  <Text variant="labelSmall" style={{ color: palette.copy, fontWeight: "600" }}>
                    {ROLE_LABELS[selectedLine.role] || selectedLine.role}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailsMetaCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Fecha de venta:</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{formatSettlementDate(selectedLine.createdAt)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text variant="labelMedium" style={{ color: palette.muted }}>Método:</Text>
                <Text selectable variant="bodyMedium" style={{ color: palette.title }}>{selectedLine.method}</Text>
              </View>
            </View>

            {selectedLine.domain === "CURSO" ? (
              <InfoCard type="info" title="Desglose de curso" palette={palette}>
                Bruto {formatSettlementMoney(selectedLine.grossAmountUsd, "USD")} · Profesor {formatSettlementMoney(selectedLine.professorAmountUsd, "USD")} · Administrador {formatSettlementMoney(selectedLine.adminAmountUsd, "USD")} · General {formatSettlementMoney(selectedLine.generalAmountUsd, "USD")}
              </InfoCard>
            ) : selectedLine.role === "VIDKAR" ? (
              <InfoCard type="info" palette={palette}>
                Comisión acreditada una sola vez según el valor y moneda registrados en la venta.
              </InfoCard>
            ) : selectedLine.ownershipSource === "CURRENT_STORE_FROZEN" ? (
              <InfoCard type="info" palette={palette}>
                Propietario histórico resuelto y congelado el {formatSettlementDate(selectedLine.attributedAt)}.
              </InfoCard>
            ) : null}

            <Text variant="titleSmall" style={{ color: palette.title, fontWeight: "700", marginTop: 4 }}>
              Estado financiero de la venta
            </Text>
            <View style={styles.lineMetricsDrawerGrid}>
              <View style={[styles.drawerMetricCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                <Text variant="labelSmall" style={{ color: palette.muted }}>Importe Neto</Text>
                <Text selectable variant="titleMedium" style={{ color: palette.title, fontWeight: "800" }}>
                  {formatSettlementMoney(selectedLine.amount, selectedLine.currency)}
                </Text>
              </View>
              <View style={[styles.drawerMetricCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                <Text variant="labelSmall" style={{ color: palette.muted }}>Pagado</Text>
                <Text selectable variant="titleMedium" style={{ color: palette.success, fontWeight: "800" }}>
                  {formatSettlementMoney(selectedLine.paid, selectedLine.currency)}
                </Text>
              </View>
              <View style={[styles.drawerMetricCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                <Text variant="labelSmall" style={{ color: palette.muted }}>Reservado</Text>
                <Text selectable variant="titleMedium" style={{ color: palette.warning, fontWeight: "800" }}>
                  {formatSettlementMoney(selectedLine.reserved, selectedLine.currency)}
                </Text>
              </View>
              <View style={[styles.drawerMetricCard, { backgroundColor: palette.nestedSurface, borderColor: palette.borderSubtle }]}>
                <Text variant="labelSmall" style={{ color: palette.muted }}>Pendiente</Text>
                <Text selectable variant="titleMedium" style={{ color: palette.accent, fontWeight: "800" }}>
                  {formatSettlementMoney(selectedLine.pending, selectedLine.currency)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </SettlementDrawer>

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice("")} duration={7000}>
        {notice}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 18 },

  // Hero Card Styles
  heroCard: {
    borderRadius: 24,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBrandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroBrandText: {
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroRefreshBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    margin: 0,
  },
  heroTitleBox: {
    gap: 6,
  },
  heroTitle: {
    color: "#f8fafc",
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    lineHeight: 20,
    fontSize: 14,
  },
  heroBalanceStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  heroBalanceChip: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
    minWidth: 100,
  },
  heroBalanceChipLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroBalanceChipValue: {
    color: "#ffffff",
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 4,
  },
  heroBeneficiaryTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: "70%",
  },
  heroChipText: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 13,
  },
  heroSelectButton: {
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 999,
    minHeight: 36,
  },
  heroSelectButtonLabel: {
    fontSize: 13,
  },
  heroFootnote: {
    color: "#94a3b8",
    lineHeight: 18,
    fontSize: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 10,
  },

  // Section & Layout
  sectionCard: {
    borderRadius: 24,
    padding: 18,
    gap: 16,
    borderWidth: 1,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  sectionHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleBlock: {
    flex: 1,
    gap: 3,
    minWidth: 180,
  },
  mainSectionTitle: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // Balance Cards
  balanceGrid: {
    gap: 16,
  },
  balanceGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  balanceCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
  },
  balanceCardWide: {
    width: "48%",
  },
  cardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  currencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  currencyPillText: {
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  capsuleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  balanceHeroBox: {
    gap: 2,
    paddingVertical: 4,
  },
  balanceHeroCaption: {
    fontWeight: "700",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  balanceValue: {
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },

  // Stats Row
  statsRowContainer: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: "70%",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    fontSize: 13,
  },

  // Destination inside balance card
  destinationMiniCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  destinationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  destinationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cupHelperBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },

  // Botones Redondos (VIDKAR UI Skill)
  balanceActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  pillActionBtn: {
    borderRadius: 999,
    minHeight: 46,
    justifyContent: "center",
  },
  pillActionLabel: {
    fontWeight: "700",
    fontSize: 15,
  },
  pillButtonCompact: {
    borderRadius: 999,
    minHeight: 38,
    alignSelf: "flex-start",
  },
  pillButtonLabel: {
    fontWeight: "600",
    fontSize: 13,
  },
  pillButtonOutlined: {
    borderRadius: 999,
    minHeight: 44,
  },

  // Destinations Grid
  destinationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  destinationCard: {
    flexGrow: 1,
    minWidth: 140,
    flexBasis: "30%",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  destinationCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destinationMethodText: {
    fontWeight: "700",
    fontSize: 14,
  },
  destinationSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },

  // Responsive Tables Styles
  tableSection: {
    gap: 12,
  },
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tdText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },

  // Column Flexes (Responsive)
  flexDate: { flex: 1.1 },
  flexId: { flex: 1.1 },
  flexDomain: { flex: 1 },
  flexAmount: { flex: 1.4 },
  flexMethod: { flex: 1.3 },
  flexDest: { flex: 1.2 },
  flexStatus: { flex: 1.3 },
  flexRef: { flex: 1.3 },
  flexFee: { flex: 1.1 },
  flexSaleName: { flex: 1.6 },
  flexRole: { flex: 1.2 },
  flexMetric: { flex: 1.1 },
  colActionIndicator: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  statusPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontWeight: "700",
    fontSize: 11,
  },

  // Pagination & Quick Switcher
  paginationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "center",
    marginTop: 6,
  },
  quickKindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  quickKindTab: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickKindTabText: {
    fontSize: 13,
  },
  appliedFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterTagChip: {
    borderRadius: 999,
  },

  // Info Card
  infoCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  infoCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  infoCardIcon: {
    margin: 0,
    marginTop: -4,
  },
  infoCardBody: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontWeight: "700",
    fontSize: 14,
  },
  bodyText: {
    lineHeight: 20,
    fontSize: 13,
  },

  // Chip Group
  chipGroup: {
    gap: 8,
  },
  groupLabel: {
    fontWeight: "700",
  },
  chipRow: {
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  modernPillChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modernPillChipText: {
    fontSize: 13,
  },

  // Drawers & Dialogs
  drawerContent: {
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    borderRadius: 16,
    elevation: 0,
  },
  dialogList: {
    gap: 6,
  },
  beneficiaryListItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  beneficiaryName: {
    flex: 1,
    fontSize: 14,
  },
  filterDialogBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  dateFilterRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateInput: {
    flex: 1,
  },
  modernInput: {
    borderRadius: 14,
  },
  dialogForm: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 16,
  },
  paymentAvailableBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  detailsMetaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  lineMetricsDrawerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  drawerMetricCard: {
    flexGrow: 1,
    flexBasis: "45%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  historyCard: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  pillDialogAction: {
    borderRadius: 999,
    minHeight: 42,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  microIcon: {
    margin: 0,
    padding: 0,
  },
  divider: {
    marginVertical: 4,
  },
  centeredLoading: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});

export default LiquidacionesAdminScreen;
