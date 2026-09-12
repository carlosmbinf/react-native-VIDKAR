import MeteorBase from "@meteorrn/core";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Button,
  Chip,
  DataTable,
  Divider,
  IconButton,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import {
  EvidenciasVentasEfectivoCollection,
  TransaccionRecargasCollection,
  VentasCollection,
  VentasRechargeCollection,
} from "../collections/collections";
import VentaDetailModal from "../ventas/VentaDetailModal.native";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  deriveSaleStatus,
  detectSaleCategory,
  formatDateShort,
  formatMoney,
  getEvidenceMeta,
  getDeliveryFilterStatus,
  getRechargeStatusPresentation,
  getSaleItems,
  getSaleSpecificDetail,
  getStatusMeta,
  normalizeCurrency,
  normalizeText,
} from "../ventas/ventasUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const OPTIONS_PER_PAGE = [10, 25, 50, 100];
const FETCH_LIMIT_OPTIONS = [50, 100, 150, 200, 300];

const RECARGAS_VENTA_FIELDS = {
  _id: 1,
  adminId: 1,
  carrito: 1,
  cobrado: 1,
  comentario: 1,
  createdAt: 1,
  direccionEntrega: 1,
  estado: 1,
  idUser: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  paymentProvider: 1,
  paymentId: 1,
  paymentCaptureId: 1,
  "refundBasis.currency": 1,
  "refundBasis.items": 1,
  "refundBasis.subtotal": 1,
  "refundBasis.totalWithCommissions": 1,
  "refunds.idempotencyKey": 1,
  "refunds.provider": 1,
  "refunds.mode": 1,
  "refunds.includeCommission": 1,
  "refunds.selectedItemIds": 1,
  "refunds.requestedAmount": 1,
  "refunds.amount": 1,
  "refunds.currency": 1,
  "refunds.status": 1,
  "refunds.externalRefundId": 1,
  "refunds.createdAt": 1,
  "refunds.completedAt": 1,
  "refunds.failedAt": 1,
  refundedAmount: 1,
  refundableAmount: 1,
  refundCurrency: 1,
  refundStatus: 1,
  lastRefundAt: 1,
  adminNote: 1,
  adminNoteAt: 1,
  adminNoteBy: 1,
  monedaCobrado: 1,
  monedaPrecioOficial: 1,
  monto: 1,
  precioOficial: 1,
  "producto.carrito": 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
  "producto.name": 1,
  "producto.status": 1,
  "producto.type": 1,
  "producto.userId": 1,
  status: 1,
  tipo: 1,
  type: 1,
  userId: 1,
};

const TRANSACCION_RECARGA_FIELDS = {
  _id: 1,
  externalId: 1,
  id: 1,
  "status.message": 1,
  "status.id": 1,
  error: 1,
  updatedAt: 1,
};

const DIRECT_VENTAS_FIELDS = {
  _id: 1,
  idVentasRecharge: 1,
  adminId: 1,
  cobrado: 1,
  cobradoAlAdmin: 1,
  comentario: 1,
  createdAt: 1,
  cantidad: 1,
  gananciasAdmin: 1,
  precio: 1,
  type: 1,
  userId: 1,
};

const getLinkedProxyVpnDetails = (sale, linkedSalesByRechargeId) => {
  const linkedSales = linkedSalesByRechargeId.get(String(sale?._id)) || [];
  return linkedSales
    .filter((linkedSale) => ["PROXY", "VPN"].includes(String(linkedSale?.type || "").toUpperCase()))
    .map((linkedSale) => ({
      _id: linkedSale._id,
      type: String(linkedSale.type || "").toUpperCase(),
      cantidad: linkedSale.cantidad,
      comentario: linkedSale.comentario || "",
      createdAt: linkedSale.createdAt || null,
      precio: Number(linkedSale.precio || 0),
      gananciasAdmin: Number(linkedSale.gananciasAdmin || 0),
      cobradoAlAdmin: linkedSale.cobradoAlAdmin === true,
    }));
};

// Solo metadata para el listado; la imagen se solicita al abrir el detalle.
const EVIDENCIA_METADATA_FIELDS = {
  _id: 1,
  "analisisIA.amountMatch": 1,
  "analisisIA.confidence": 1,
  "analisisIA.decision": 1,
  "analisisIA.estado": 1,
  "analisisIA.fraudSignals": 1,
  "analisisIA.paymentAmount": 1,
  "analisisIA.paymentCurrency": 1,
  "analisisIA.paymentDate": 1,
  "analisisIA.reasonCodes": 1,
  "analisisIA.recipientMatch": 1,
  "analisisIA.reference": 1,
  "analisisIA.summary": 1,
  aprobado: 1,
  cancelada: 1,
  cancelado: 1,
  createdAt: 1,
  denegado: 1,
  descripcion: 1,
  detalles: 1,
  estado: 1,
  fecha: 1,
  fechaSubida: 1,
  isCancelada: 1,
  metadata: 1,
  nombre: 1,
  rechazado: 1,
  size: 1,
  tamano: 1,
  tipo: 1,
  ventaId: 1,
};

export default function MisComprasScreen() {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  // View state
  const [scope, setScope] = useState("own"); // 'own' | 'all'
  const [viewMode, setViewMode] = useState(isTablet ? "table" : "cards"); // 'table' | 'cards'
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("TODOS");
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState("TODOS");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("TODOS");
  const [selectedEvidenceFilter, setSelectedEvidenceFilter] = useState("TODOS");
  const [fetchLimit, setFetchLimit] = useState(FETCH_LIMIT_OPTIONS[1]); // 100
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(OPTIONS_PER_PAGE[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal Detail State
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const dataReady = useDeferredScreenData();

  // Reactive data fetching
  const {
    isAdmin,
    isGeneralAdmin,
    isUser,
    ready,
    comprasUnificadas,
  } = Meteor.useTracker(() => {
    const user = Meteor.user();
    const cUserId = user?._id;
    const cUsername = user?.username || "";
    const isGenAdmin = cUsername === "carlosmbinf";
    const isAdm = isGenAdmin || user?.profile?.role === "admin";

    if (!dataReady || !cUserId) {
      return {
        currentUserId: cUserId,
        currentUsername: cUsername,
        isAdmin: false,
        isGeneralAdmin: false,
        isUser: false,
        ready: false,
        comprasUnificadas: [],
      };
    }

    // Subordinates lookup for admins
    let subordinadosIds = [];
    if (isAdm && !isGenAdmin) {
      Meteor.subscribe("user", { bloqueadoDesbloqueadoPor: cUserId }, { fields: { _id: 1 } });
      subordinadosIds = Meteor.users
        .find({ bloqueadoDesbloqueadoPor: cUserId })
        .fetch()
        .map((u) => u._id);
    }

    // Build query based on scope
    const buildScopeQuery = () => {
      if (scope === "all" && isAdm) {
        if (isGenAdmin) {
          return {};
        }
        return {
          $or: [
            { userId: cUserId },
            { idUser: cUserId },
            { adminId: cUserId },
            ...(subordinadosIds.length > 0 ? [{ userId: { $in: subordinadosIds } }] : []),
          ],
        };
      }

      // "own" scope
      return {
        $or: [
          { userId: cUserId },
          { idUser: cUserId },
          { "producto.userId": cUserId },
        ],
      };
    };

    const scopeQuery = buildScopeQuery();
    const directScopeQuery = {
      $and: [
        scopeQuery,
        { idVentasRecharge: { $exists: false } },
      ],
    };

    // Subscriptions
    const rechargeSub = Meteor.subscribe("ventasRecharge", scopeQuery, {
      fields: RECARGAS_VENTA_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    });

    const directSub = Meteor.subscribe("ventas", directScopeQuery, {
      fields: DIRECT_VENTAS_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    });

    const usersSub = Meteor.subscribe(
      "user",
      {},
      { fields: { _id: 1, username: 1, "profile.role": 1 } },
    );

    // Fetch documents
    const rechargeDocs = VentasRechargeCollection.find(scopeQuery, {
      fields: RECARGAS_VENTA_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    }).fetch();
    const rechargeIds = rechargeDocs.map((doc) => String(doc._id)).filter(Boolean);
    const linkedSalesQuery = rechargeIds.length > 0
      ? { idVentasRecharge: { $in: rechargeIds } }
      : { idVentasRecharge: { $in: [] } };
    const linkedSalesSub = Meteor.subscribe("ventas", linkedSalesQuery, {
      fields: DIRECT_VENTAS_FIELDS,
    });
    const linkedSales = VentasCollection.find(linkedSalesQuery, {
      fields: DIRECT_VENTAS_FIELDS,
    }).fetch();
    const linkedSalesByRechargeId = new Map();
    for (const linkedSale of linkedSales) {
      const key = String(linkedSale.idVentasRecharge || "");
      if (!key) continue;
      const current = linkedSalesByRechargeId.get(key) || [];
      current.push(linkedSale);
      linkedSalesByRechargeId.set(key, current);
    }

    const rechargeItemIds = [...new Set(rechargeDocs.flatMap((doc) => getSaleItems(doc).filter((item) => String(item?.type || item?.producto?.type || "").toUpperCase() === "RECARGA").map((item) => item?._id).filter(Boolean).map(String)))];
    const transactionsSub = rechargeItemIds.length > 0
      ? Meteor.subscribe("transacciones", { externalId: { $in: rechargeItemIds } }, { fields: TRANSACCION_RECARGA_FIELDS })
      : null;
    const transactions = rechargeItemIds.length > 0
      ? TransaccionRecargasCollection.find({ externalId: { $in: rechargeItemIds } }, { fields: TRANSACCION_RECARGA_FIELDS }).fetch()
      : [];
    const transactionsByExternalId = new Map(transactions.map((transaction) => [String(transaction.externalId), transaction]));

    const directDocs = VentasCollection.find(directScopeQuery, {
      fields: DIRECT_VENTAS_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    }).fetch();

    // Evidence subscription
    const candidateEvidenceIds = [];
    for (const doc of rechargeDocs) {
      if (doc._id) candidateEvidenceIds.push(String(doc._id));
      const items = getSaleItems(doc);
      for (const item of items) {
        if (item?._id) candidateEvidenceIds.push(String(item._id));
      }
    }
    const uniqueEvidenceIds = [...new Set(candidateEvidenceIds)];

    let evidenceSubReady = true;
    let fetchedEvidencias = [];
    if (uniqueEvidenceIds.length > 0) {
      const evSub = Meteor.subscribe(
        "evidenciasVentasEfectivoRecharge",
        { ventaId: { $in: uniqueEvidenceIds } },
        { fields: EVIDENCIA_METADATA_FIELDS },
      );
      evidenceSubReady = evSub.ready();
      fetchedEvidencias = EvidenciasVentasEfectivoCollection.find(
        { ventaId: { $in: uniqueEvidenceIds } },
        { fields: EVIDENCIA_METADATA_FIELDS },
      ).fetch();
    }

    const evidenceMap = new Map();
    for (const ev of fetchedEvidencias) {
      if (ev.ventaId) {
        const key = String(ev.ventaId);
        const current = evidenceMap.get(key) || [];
        current.push(ev);
        evidenceMap.set(key, current);
      }
    }

    const resolveUsername = (uId) => {
      if (!uId) return "";
      if (uId === "SERVER") return "Vidkar";
      return Meteor.users.findOne(uId)?.username || "";
    };

    // Unify purchases
    const unified = [];

    // Map recharge purchases
    for (const doc of rechargeDocs) {
      const buyerId = doc.userId || doc.idUser || doc.producto?.userId;
      const rawItems = getSaleItems(doc).map((item) => {
        if (String(item?.type || item?.producto?.type || "").toUpperCase() !== "RECARGA") return item;
        const transaction = transactionsByExternalId.get(String(item?._id));
        return transaction
          ? { ...item, dtshopStatus: transaction.status?.message || "", dtshopTransactionId: transaction.id, dtshopError: transaction.error || null }
          : item;
      });
      const buyerName = resolveUsername(buyerId) || "Tú";
      const adminName = resolveUsername(doc.adminId) || "Vidkar";
      const category = detectSaleCategory(doc);
      const statusDerived = deriveSaleStatus({ ...doc, producto: { ...doc.producto, carritos: rawItems } });

      let matchedEvidences = evidenceMap.get(String(doc._id)) || [];
      if (matchedEvidences.length === 0) {
        for (const it of rawItems) {
          if (it?._id && evidenceMap.has(String(it._id))) {
            matchedEvidences = evidenceMap.get(String(it._id)) || [];
            break;
          }
        }
      }
      const matchedEvidence = matchedEvidences[0] || null;

      const totalAmount = Number(doc.cobrado ?? doc.precioOficial ?? doc.monto ?? 0);
      const currency = normalizeCurrency(
        doc.monedaCobrado || doc.monedaPrecioOficial,
      );

      unified.push({
        _id: doc._id,
        source: "recharge",
        category,
        statusDerived,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        userId: buyerId,
        userusername: buyerName,
        adminId: doc.adminId,
        adminusername: adminName,
        precio: totalAmount,
        moneda: currency,
        cobrado: Number(doc.cobrado || 0),
        monedaCobrado: doc.monedaCobrado || null,
        metodoPago: doc.metodoPago || "No especificado",
        paymentProvider: doc.paymentProvider || doc.metodoPago || null,
        paymentId: doc.paymentId || null,
        paymentCaptureId: doc.paymentCaptureId || null,
        refundBasis: doc.refundBasis || null,
        refunds: doc.refunds || [],
        refundedAmount: Number(doc.refundedAmount || 0),
        refundableAmount: doc.refundableAmount,
        refundCurrency: doc.refundCurrency || doc.monedaCobrado || null,
        refundStatus: doc.refundStatus || null,
        lastRefundAt: doc.lastRefundAt || null,
        adminNote: doc.adminNote || "",
        adminNoteAt: doc.adminNoteAt || null,
        adminNoteBy: doc.adminNoteBy || null,
        comentario: doc.comentario || "",
        items: rawItems,
        evidence: matchedEvidence,
        evidences: matchedEvidences,
        linkedProxyVpnDetails: getLinkedProxyVpnDetails(doc, linkedSalesByRechargeId),
        rawDoc: doc,
        specificDetail: getSaleSpecificDetail({ ...doc, category, items: rawItems }),
      });
    }

    // Map direct purchases (VentasCollection)
    for (const doc of directDocs) {
      const buyerName = resolveUsername(doc.userId) || "Tú";
      const adminName = resolveUsername(doc.adminId) || "Vidkar";
      const statusDerived = doc.cobrado ? "ENTREGADO" : "PENDIENTE_PAGO";
      const directType = String(doc.type || "").toUpperCase();
      const category = directType.includes("PROXY") || directType.includes("VPN")
        ? "PROXY_VPN"
        : "BALANCE";

      unified.push({
        _id: doc._id,
        source: "direct",
        category,
        statusDerived,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
        userId: doc.userId,
        userusername: buyerName,
        adminId: doc.adminId,
        adminusername: adminName,
        precio: Number(doc.precio || 0),
        moneda: "CUP",
        gananciasAdmin: Number(doc.gananciasAdmin || 0),
        cobrado: doc.cobrado === true,
        cobradoAlAdmin: doc.cobradoAlAdmin === true,
        metodoPago: "DIRECTO",
        comentario: doc.comentario || "",
        items: [],
        evidence: null,
        rawDoc: doc,
        specificDetail: doc.comentario ? "Nota: " + doc.comentario : "Compra directa " + (doc.type || ""),
      });
    }

    // Sort by createdAt desc
    unified.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });

    const isAllReady = rechargeSub.ready() && directSub.ready() && linkedSalesSub.ready() && usersSub.ready() && evidenceSubReady && (!transactionsSub || transactionsSub.ready());

    return {
      currentUserId: cUserId,
      currentUsername: cUsername,
      isAdmin: isAdm,
      isGeneralAdmin: isGenAdmin,
      isUser: user?.profile?.role === "user",
      ready: isAllReady,
      comprasUnificadas: unified,
    };
  }, [dataReady, fetchLimit, scope, refreshKey]);

  // Derived category counts
  const categoryCounts = useMemo(() => {
    const counts = { TODAS: comprasUnificadas.length };
    for (const cat of CATEGORIES) {
      if (cat.key !== "TODAS") {
        counts[cat.key] = 0;
      }
    }
    for (const purchase of comprasUnificadas) {
      if (counts[purchase.category] !== undefined) {
        counts[purchase.category] += 1;
      }
    }
    return counts;
  }, [comprasUnificadas]);

  // Filtered purchases
  const filteredCompras = useMemo(() => {
    let result = comprasUnificadas;

    // 1. Category Filter
    if (selectedCategory !== "TODAS") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 2. Status Filter
    if (selectedStatus !== "TODOS") {
      if (selectedStatus === "PAGADO") {
        result = result.filter((p) => ["ENTREGADO", "RECARGA_ENTREGADA", "RECARGA_EN_PROCESO", "RECARGA_NO_ENTREGADA"].includes(p.statusDerived));
      } else if (selectedStatus === "PENDIENTE") {
        result = result.filter(
          (p) =>
            p.statusDerived === "PENDIENTE_PAGO" ||
            p.statusDerived === "PENDIENTE_ENTREGA" ||
            p.statusDerived === "RECARGA_EN_PROCESO",
        );
      } else if (selectedStatus === "CANCELADO") {
        result = result.filter((p) => ["CANCELADO", "RECARGA_NO_ENTREGADA"].includes(p.statusDerived));
      }
    }

    if (selectedDeliveryStatus !== "TODOS") {
      result = result.filter((purchase) => getDeliveryFilterStatus(purchase) === selectedDeliveryStatus);
    }

    // 3. Payment Method Filter
    if (selectedPaymentMethod !== "TODOS") {
      result = result.filter(
        (p) =>
          normalizeText(p.metodoPago) === normalizeText(selectedPaymentMethod),
      );
    }

    // 4. Evidence Filter
    if (selectedEvidenceFilter !== "TODOS") {
      if (selectedEvidenceFilter === "CON_EVIDENCIA") {
        result = result.filter((p) => !!p.evidence);
      } else if (selectedEvidenceFilter === "SIN_EVIDENCIA") {
        result = result.filter((p) => !p.evidence);
      }
    }

    // 5. Search query
    const q = normalizeText(searchQuery);
    if (q) {
      result = result.filter((p) => {
        const pool = [
          p._id,
          p.userusername,
          p.adminusername,
          p.comentario,
          p.specificDetail,
          p.metodoPago,
          p.category,
          String(p.precio),
        ];
        return pool.some((val) => normalizeText(val).includes(q));
      });
    }

    return result;
  }, [
    comprasUnificadas,
    searchQuery,
    selectedCategory,
    selectedEvidenceFilter,
    selectedPaymentMethod,
    selectedStatus,
    selectedDeliveryStatus,
  ]);

  // KPI Metrics
  const metrics = useMemo(() => {
    let totalCUP = 0;
    let totalUSD = 0;
    let pendientes = 0;
    let entregadas = 0;
    let conEvidencia = 0;

    for (const p of comprasUnificadas) {
      const currency = normalizeCurrency(p.moneda, "");
      const isApproved = ["ENTREGADO", "RECARGA_ENTREGADA"].includes(p.statusDerived);

      if (isApproved && currency === "USD") {
        totalUSD += p.precio;
      } else if (isApproved && currency === "CUP") {
        totalCUP += p.precio;
      }

      if (
        p.statusDerived === "PENDIENTE_PAGO" ||
        p.statusDerived === "PENDIENTE_ENTREGA" ||
        p.statusDerived === "RECARGA_EN_PROCESO"
      ) {
        pendientes += 1;
      } else if (["ENTREGADO", "RECARGA_ENTREGADA"].includes(p.statusDerived)) {
        entregadas += 1;
      }

      if (p.evidence) {
        conEvidencia += 1;
      }
    }

    return {
      total: comprasUnificadas.length,
      totalCUP,
      totalUSD,
      pendientes,
      entregadas,
      conEvidencia,
    };
  }, [comprasUnificadas]);

  // Unique payment methods
  const paymentMethods = useMemo(() => {
    const available = new Set(
      comprasUnificadas.map((v) => String(v.metodoPago || "").toUpperCase()).filter(Boolean),
    );
    const standard = ["EFECTIVO", "PAYPAL", "MERCADOPAGO", "DIRECTO"];
    const extras = [...available].filter((method) => !standard.includes(method));
    return ["TODOS", ...standard.filter((method) => available.has(method)), ...extras];
  }, [comprasUnificadas]);

  const paymentMethodLabel = (method) => ({
    EFECTIVO: "Efectivo",
    PAYPAL: "PayPal",
    MERCADOPAGO: "Mercado Pago",
    DIRECTO: "Directo",
    TODOS: "Todos",
  }[method] || method);

  // Pagination
  useEffect(() => {
    setPage(0);
  }, [
    fetchLimit,
    scope,
    searchQuery,
    selectedCategory,
    selectedEvidenceFilter,
    selectedPaymentMethod,
    selectedStatus,
    selectedDeliveryStatus,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCompras.length / itemsPerPage));
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, filteredCompras.length);
  const visibleCompras = useMemo(
    () => filteredCompras.slice(from, to),
    [filteredCompras, from, to],
  );

  const activeFiltersCount = [
    Boolean(searchQuery.trim()),
    selectedCategory !== "TODAS",
    selectedStatus !== "TODOS",
    selectedDeliveryStatus !== "TODOS",
    selectedPaymentMethod !== "TODOS",
    selectedEvidenceFilter !== "TODOS",
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("TODAS");
    setSelectedStatus("TODOS");
    setSelectedDeliveryStatus("TODOS");
    setSelectedPaymentMethod("TODOS");
    setSelectedEvidenceFilter("TODOS");
    setPage(0);
  };

  const handleOpenDetail = (purchase) => {
    setSelectedPurchase(purchase);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedPurchase(null);
  };

  const panelBg = theme.dark ? "#0a1324" : "#ffffff";
  const borderCol = theme.dark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.1)";

  return (
    <View style={[styles.screen, { backgroundColor: theme.dark ? "#050b16" : "#f1f5f9" }]}>
      <AppHeader
        title="Mis compras"
        subtitle={
          scope === "all"
            ? "Historial global de ventas y compras en VIDKAR"
            : "Tus compras, recargas, pedidos y comprobantes en tiempo real"
        }
        showBackButton
        backHref="/(normal)/Main"
        overlapContent
        actions={
          <View style={styles.headerActions}>
            <IconButton
              icon="refresh"
              iconColor="#ffffff"
              onPress={() => setRefreshKey((k) => k + 1)}
            />
            <IconButton
              icon={viewMode === "table" ? "view-grid-outline" : "table-large"}
              iconColor="#ffffff"
              onPress={() => setViewMode((m) => (m === "table" ? "cards" : "table"))}
            />
            <IconButton
              icon={showFilters ? "filter-minus-outline" : "filter-variant"}
              iconColor="#ffffff"
              onPress={() => setShowFilters((f) => !f)}
            />
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerInset + 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={!ready}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        }
      >
        {/* SCOPE SELECTION (for Admin / General Admin) */}
        {isAdmin ? (
          <Surface style={[styles.scopeSurface, { backgroundColor: panelBg, borderColor: borderCol }]}>
            <Text style={styles.scopeTitle}>Alcance de visualización</Text>
            <SegmentedButtons
              accessibilityLabel="Seleccionar alcance de compras"
              buttons={[
                { value: "own", label: "Mis compras personales", icon: "account-outline" },
                { value: "all", label: "Todas las compras", icon: "view-list-outline" },
              ]}
              onValueChange={setScope}
              value={scope}
              style={styles.segmentedButtons}
            />
          </Surface>
        ) : null}

        {/* KPI METRICS STRIP */}
        <Surface style={[styles.kpiContainer, { backgroundColor: panelBg, borderColor: borderCol }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Total Compras</Text>
              <Text style={[styles.kpiValue, { color: theme.dark ? "#f8fafc" : "#0f172a" }]}>
                {metrics.total}
              </Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Total CUP aprobado</Text>
              <Text style={[styles.kpiValue, { color: "#38bdf8" }]}>
                {formatMoney(metrics.totalCUP, "CUP")}
              </Text>
            </View>

            {metrics.totalUSD > 0 ? (
              <>
                <View style={styles.kpiDivider} />
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>Total USD aprobado</Text>
                  <Text style={[styles.kpiValue, { color: "#34d399" }]}>
                    {"$" + metrics.totalUSD.toFixed(2) + " USD"}
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.kpiDivider} />

            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Pendientes</Text>
              <Text style={[styles.kpiValue, { color: "#f97316" }]}>
                {metrics.pendientes}
              </Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Entregadas</Text>
              <Text style={[styles.kpiValue, { color: "#22c55e" }]}>
                {metrics.entregadas}
              </Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Con Comprobante</Text>
              <Text style={[styles.kpiValue, { color: "#a855f7" }]}>
                {metrics.conEvidencia}
              </Text>
            </View>
          </ScrollView>
        </Surface>

        {/* SERVICE CATEGORIES TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const count = categoryCounts[cat.key] || 0;

            return (
              <Chip
                key={cat.key}
                icon={cat.icon}
                selected={isSelected}
                onPress={() => setSelectedCategory(cat.key)}
                style={[
                  styles.categoryFilterChip,
                  isSelected
                    ? { backgroundColor: theme.dark ? "#1d4ed8" : "#2563eb" }
                    : { backgroundColor: theme.dark ? "rgba(15, 28, 53, 0.7)" : "#ffffff" },
                ]}
                textStyle={[
                  styles.categoryFilterChipText,
                  isSelected ? { color: "#ffffff", fontWeight: "800" } : { color: theme.dark ? "#cbd5e1" : "#475569" },
                ]}
              >
                {cat.label + " (" + count + ")"}
              </Chip>
            );
          })}
        </ScrollView>

        {/* SEARCH & FILTERS PANEL */}
        <Surface style={[styles.searchPanel, { backgroundColor: panelBg, borderColor: borderCol }]}>
          <View style={styles.searchRow}>
            <IconButton icon="magnify" size={20} iconColor="#64748b" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por ID, servicio, teléfono, nota o destinatario..."
              placeholderTextColor="#94a3b8"
              style={[styles.searchInput, { color: theme.dark ? "#f8fafc" : "#0f172a" }]}
            />
            {searchQuery ? (
              <IconButton icon="close" size={18} iconColor="#64748b" onPress={() => setSearchQuery("")} />
            ) : null}
          </View>

          {showFilters ? (
            <View style={styles.expandedFilters}>
              <Divider style={styles.filtersDivider} />

              {/* Status filter */}
              <View style={styles.filterBlock}>
                <Text style={styles.filterBlockTitle}>Estado de pago:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipGroup}>
                  {["TODOS", "PAGADO", "PENDIENTE", "CANCELADO"].map((st) => (
                    <Chip
                      key={st}
                      selected={selectedStatus === st}
                      onPress={() => setSelectedStatus(st)}
                      style={[styles.miniChip, selectedStatus === st ? styles.miniChipActive : null]}
                      textStyle={selectedStatus === st ? styles.miniChipActiveText : null}
                    >
                      {st}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterBlock}>
                <Text style={styles.filterBlockTitle}>Estado de entrega:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipGroup}>
                  {[
                    ["TODOS", "Todas"],
                    ["DELIVERED", "Entregadas"],
                    ["PENDING", "En proceso"],
                    ["ERROR", "Con error"],
                  ].map(([value, label]) => (
                    <Chip
                      key={value}
                      selected={selectedDeliveryStatus === value}
                      onPress={() => setSelectedDeliveryStatus(value)}
                      style={[styles.miniChip, selectedDeliveryStatus === value ? styles.miniChipActive : null]}
                      textStyle={selectedDeliveryStatus === value ? styles.miniChipActiveText : null}
                    >
                      {label}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              {/* Evidence filter */}
              <View style={styles.filterBlock}>
                <Text style={styles.filterBlockTitle}>Comprobantes / Evidencias:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipGroup}>
                  {[
                    { key: "TODOS", label: "Todas" },
                    { key: "CON_EVIDENCIA", label: "Con comprobante" },
                    { key: "SIN_EVIDENCIA", label: "Sin comprobante" },
                  ].map((ev) => (
                    <Chip
                      key={ev.key}
                      selected={selectedEvidenceFilter === ev.key}
                      onPress={() => setSelectedEvidenceFilter(ev.key)}
                      style={[styles.miniChip, selectedEvidenceFilter === ev.key ? styles.miniChipActive : null]}
                      textStyle={selectedEvidenceFilter === ev.key ? styles.miniChipActiveText : null}
                    >
                      {ev.label}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              {/* Payment method filter */}
              <View style={styles.filterBlock}>
                <Text style={styles.filterBlockTitle}>Método de pago:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipGroup}>
                  {paymentMethods.map((pm) => (
                    <Chip
                      key={pm}
                      selected={selectedPaymentMethod === pm}
                      onPress={() => setSelectedPaymentMethod(pm)}
                      style={[styles.miniChip, selectedPaymentMethod === pm ? styles.miniChipActive : null]}
                      textStyle={selectedPaymentMethod === pm ? styles.miniChipActiveText : null}
                    >
                      {paymentMethodLabel(pm)}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              {/* Limit & clear */}
              <View style={styles.filterFooter}>
                <View style={styles.limitBlock}>
                  <Text style={styles.filterBlockTitle}>Límite:</Text>
                  {FETCH_LIMIT_OPTIONS.map((lim) => (
                    <Chip
                      key={lim}
                      selected={fetchLimit === lim}
                      onPress={() => setFetchLimit(lim)}
                      style={[styles.limitChip, fetchLimit === lim ? styles.miniChipActive : null]}
                      textStyle={fetchLimit === lim ? styles.miniChipActiveText : null}
                    >
                      {lim}
                    </Chip>
                  ))}
                </View>

                {activeFiltersCount > 0 ? (
                  <Button mode="text" icon="filter-remove" onPress={handleClearFilters}>
                    {"Limpiar filtros (" + activeFiltersCount + ")"}
                  </Button>
                ) : null}
              </View>
            </View>
          ) : activeFiltersCount > 0 ? (
            <View style={styles.activeFiltersIndicatorRow}>
              <Chip icon="filter" compact style={styles.activeFiltersChip} textStyle={styles.activeFiltersChipText}>
                {activeFiltersCount + " filtro" + (activeFiltersCount > 1 ? "s" : "") + " activo" + (activeFiltersCount > 1 ? "s" : "")}
              </Chip>
              <Button compact mode="text" onPress={handleClearFilters}>
                Limpiar
              </Button>
            </View>
          ) : null}
        </Surface>

        {/* RESULTS HEADER */}
        <View style={styles.resultsHeaderRow}>
          <Text style={styles.resultsCountText}>
            {"Mostrando " + filteredCompras.length + " compra" + (filteredCompras.length !== 1 ? "s" : "")}
          </Text>
          <View style={styles.viewModeToggle}>
            <Button
              compact
              mode={viewMode === "table" ? "contained" : "text"}
              icon="table-large"
              onPress={() => setViewMode("table")}
              style={styles.modeBtn}
            >
              Tabla
            </Button>
            <Button
              compact
              mode={viewMode === "cards" ? "contained" : "text"}
              icon="view-grid-outline"
              onPress={() => setViewMode("cards")}
              style={styles.modeBtn}
            >
              Tarjetas
            </Button>
          </View>
        </View>

        {/* EMPTY STATE */}
        {filteredCompras.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: panelBg, borderColor: borderCol }]}>
            <IconButton icon="package-variant-closed" size={44} iconColor="#94a3b8" />
            <Text style={styles.emptyTitle}>No se encontraron compras</Text>
            <Text style={styles.emptySubtitle}>
              {activeFiltersCount > 0
                ? "No hay resultados para los filtros seleccionados. Prueba a limpiarlos."
                : "Aún no tienes compras o transacciones registradas en este alcance."}
            </Text>
            {activeFiltersCount > 0 ? (
              <Button mode="outlined" icon="filter-remove" onPress={handleClearFilters} style={styles.emptyBtn}>
                Limpiar filtros
              </Button>
            ) : null}
          </Surface>
        ) : viewMode === "table" ? (
          /* TABLE VIEW (DataTable) */
          <Surface style={[styles.tableContainer, { backgroundColor: panelBg, borderColor: borderCol }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <DataTable style={{ minWidth: 1000 }}>
                <DataTable.Header>
                  <DataTable.Title style={{ width: 90 }}>Fecha</DataTable.Title>
                  <DataTable.Title style={{ width: 130 }}>Tipo</DataTable.Title>
                  <DataTable.Title style={{ width: 140 }}>{scope === "all" ? "Usuario / Admin" : "Responsable"}</DataTable.Title>
                  <DataTable.Title style={{ width: 230 }}>Detalle del Servicio</DataTable.Title>
                  <DataTable.Title numeric style={{ width: 110 }}>Monto</DataTable.Title>
                  <DataTable.Title style={{ width: 110 }}>Método</DataTable.Title>
                  <DataTable.Title style={{ width: 130 }}>Estado</DataTable.Title>
                  <DataTable.Title numeric style={{ width: 60 }}>Ver</DataTable.Title>
                </DataTable.Header>

                {visibleCompras.map((purchase) => {
                  const catMeta = CATEGORY_COLORS[purchase.category] || CATEGORY_COLORS.OTROS;
                  const stMeta = getStatusMeta(purchase.statusDerived, theme.dark);
                  const rechargeStatus = getRechargeStatusPresentation(purchase, theme.dark);

                  return (
                    <DataTable.Row
                      key={purchase._id}
                      onPress={() => handleOpenDetail(purchase)}
                      style={styles.tableRow}
                    >
                      <DataTable.Cell style={{ width: 90 }}>
                        <Text style={styles.tableCellDate}>{formatDateShort(purchase.createdAt)}</Text>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 130 }}>
                        <Chip
                          compact
                          icon={catMeta.icon}
                          style={[styles.tableCategoryChip, { backgroundColor: catMeta.bg }]}
                          textStyle={[styles.tableCategoryChipText, { color: catMeta.color }]}
                        >
                          {catMeta.label}
                        </Chip>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 140 }}>
                        <View style={styles.tableUserCol}>
                          {scope === "all" ? (
                            <Text numberOfLines={1} style={styles.tableUsername}>
                              {"@" + purchase.userusername}
                            </Text>
                          ) : null}
                          <Text numberOfLines={1} style={styles.tableAdminText}>
                            {"Resp: " + purchase.adminusername}
                          </Text>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 230 }}>
                        <Text numberOfLines={2} style={styles.tableDetailText}>
                          {purchase.specificDetail}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ width: 110 }}>
                        <Text style={styles.tableAmountText}>
                          {formatMoney(purchase.precio, purchase.moneda)}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 110 }}>
                        <Text numberOfLines={1} style={styles.tableMethodText}>
                          {purchase.metodoPago}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 130 }}>
                        {rechargeStatus ? (
                          <View style={styles.rechargeStatusPair}>
                            {[rechargeStatus.payment, rechargeStatus.delivery].map((part, index) => (
                              <View
                                key={part.label}
                                style={[
                                  styles.rechargeStatusPart,
                                  {
                                    backgroundColor: part.backgroundColor,
                                    borderLeftColor:
                                      index === 1
                                        ? "rgba(226, 232, 240, 0.22)"
                                        : "transparent",
                                    borderLeftWidth:
                                      index === 1 ? StyleSheet.hairlineWidth : 0,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.statusDot,
                                    { backgroundColor: part.dotColor, marginRight: 4 },
                                  ]}
                                />
                                <Text
                                  numberOfLines={1}
                                  style={[styles.rechargeStatusText, { color: part.textColor }]}
                                >
                                  {part.label}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.tableStatusBadge,
                              {
                                backgroundColor: stMeta.backgroundColor,
                                borderColor: stMeta.borderColor,
                              },
                            ]}
                          >
                            <View style={[styles.statusDot, { backgroundColor: stMeta.dotColor }]} />
                            <Text
                              numberOfLines={1}
                              style={[styles.tableStatusText, { color: stMeta.textColor }]}
                            >
                              {stMeta.shortLabel}
                            </Text>
                          </View>
                        )}
                        {purchase.refundStatus ? (
                          <Chip compact style={styles.refundChip} textStyle={styles.refundChipText}>
                            {purchase.refundStatus === "FULL" ? "Reembolsada" : "Reembolso parcial"}
                          </Chip>
                        ) : null}
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ width: 60 }}>
                        <IconButton
                          icon="eye-outline"
                          size={18}
                          onPress={() => handleOpenDetail(purchase)}
                          style={styles.zeroMargin}
                        />
                      </DataTable.Cell>
                    </DataTable.Row>
                  );
                })}
              </DataTable>
            </ScrollView>

            <DataTable.Pagination
              page={page}
              numberOfPages={totalPages}
              onPageChange={setPage}
              label={(from + 1) + "-" + to + " de " + filteredCompras.length}
              numberOfItemsPerPageList={OPTIONS_PER_PAGE}
              numberOfItemsPerPage={itemsPerPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setPage(0);
              }}
              selectPageDropdownLabel="Filas:"
            />
          </Surface>
        ) : (
          /* CARDS VIEW */
          <View style={styles.cardsContainer}>
            {visibleCompras.map((purchase) => {
              const catMeta = CATEGORY_COLORS[purchase.category] || CATEGORY_COLORS.OTROS;
              const stMeta = getStatusMeta(purchase.statusDerived, theme.dark);
              const rechargeStatus = getRechargeStatusPresentation(purchase, theme.dark);
              const evMeta = getEvidenceMeta(purchase.evidence, purchase, theme.dark);

              return (
                <Pressable
                  key={purchase._id}
                  onPress={() => handleOpenDetail(purchase)}
                  style={styles.cardPressable}
                >
                  <Surface style={[styles.saleCard, { backgroundColor: panelBg, borderColor: borderCol }]}>
                    {/* Card Top Row */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTypeWrap}>
                        <Chip
                          compact
                          icon={catMeta.icon}
                          style={[styles.cardCatChip, { backgroundColor: catMeta.bg }]}
                          textStyle={[styles.cardCatChipText, { color: catMeta.color }]}
                        >
                          {catMeta.label}
                        </Chip>
                        <Text style={styles.cardDateText}>{formatDateShort(purchase.createdAt)}</Text>
                      </View>

                      {rechargeStatus ? (
                        <View style={styles.rechargeStatusPair}>
                          {[rechargeStatus.payment, rechargeStatus.delivery].map((part, index) => (
                            <View
                              key={part.label}
                              style={[
                                styles.rechargeStatusPart,
                                {
                                  backgroundColor: part.backgroundColor,
                                  borderLeftColor:
                                    index === 1
                                      ? "rgba(226, 232, 240, 0.22)"
                                      : "transparent",
                                  borderLeftWidth:
                                    index === 1 ? StyleSheet.hairlineWidth : 0,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusDot,
                                  { backgroundColor: part.dotColor, marginRight: 4 },
                                ]}
                              />
                              <Text
                                style={[styles.rechargeStatusText, { color: part.textColor }]}
                              >
                                {part.label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.cardStatusBadge,
                            {
                              backgroundColor: stMeta.backgroundColor,
                              borderColor: stMeta.borderColor,
                            },
                          ]}
                        >
                          <View style={[styles.statusDot, { backgroundColor: stMeta.dotColor }]} />
                          <Text style={[styles.cardStatusText, { color: stMeta.textColor }]}>
                            {stMeta.shortLabel}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Card Body */}
                    <View style={styles.cardBody}>
                      {scope === "all" ? (
                        <View style={styles.cardUserRow}>
                          <Text style={styles.cardUserLabel}>Cliente:</Text>
                          <Text numberOfLines={1} style={styles.cardUserVal}>
                            {"@" + purchase.userusername}
                          </Text>
                          <Text style={styles.cardAdminVal}>{"• Resp: " + purchase.adminusername}</Text>
                        </View>
                      ) : null}

                      <Text numberOfLines={2} style={styles.cardDetailText}>
                        {purchase.specificDetail}
                      </Text>

                      {purchase.comentario && purchase.category !== "BALANCE" ? (
                        <Text numberOfLines={1} style={styles.cardCommentPreview}>
                          {"💬 " + purchase.comentario}
                        </Text>
                      ) : null}
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.cardPriceBlock}>
                        <Text style={styles.cardAmountText}>
                          {formatMoney(purchase.precio, purchase.moneda)}
                        </Text>
                        <Text style={styles.cardMethodText}>{purchase.metodoPago}</Text>
                      </View>

                      <View style={styles.cardFooterActions}>
                        <Chip
                          compact
                          icon={evMeta.icon}
                          style={[
                            styles.cardEvidenceChip,
                            { backgroundColor: evMeta.backgroundColor, borderColor: evMeta.borderColor },
                          ]}
                          textStyle={[styles.cardEvidenceChipText, { color: evMeta.textColor }]}
                        >
                          {evMeta.label}
                        </Chip>
                        {purchase.refundStatus ? (
                          <Chip compact style={styles.refundChip} textStyle={styles.refundChipText}>
                            {purchase.refundStatus === "FULL" ? "Reembolsada" : "Reembolso parcial"}
                          </Chip>
                        ) : null}
                        <IconButton
                          icon="chevron-right"
                          size={20}
                          onPress={() => handleOpenDetail(purchase)}
                          style={styles.cardChevron}
                        />
                      </View>
                    </View>
                  </Surface>
                </Pressable>
              );
            })}

            {/* Pagination for Cards */}
            <Surface style={[styles.cardsPagination, { backgroundColor: panelBg, borderColor: borderCol }]}>
              <DataTable.Pagination
                page={page}
                numberOfPages={totalPages}
                onPageChange={setPage}
                label={(from + 1) + "-" + to + " de " + filteredCompras.length}
                numberOfItemsPerPageList={OPTIONS_PER_PAGE}
                numberOfItemsPerPage={itemsPerPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setPage(0);
                }}
                selectPageDropdownLabel="Mostrar:"
              />
            </Surface>
          </View>
        )}
      </ScrollView>

      {/* DETAIL & EVIDENCE MODAL (With real image, AI analysis, package breakdown and upload support) */}
      <VentaDetailModal
        evidence={selectedPurchase?.evidence}
        evidences={selectedPurchase?.evidences}
        isAdmin={isAdmin}
        isGeneralAdmin={isGeneralAdmin}
        isUser={isUser}
        onActionComplete={() => setRefreshKey((k) => k + 1)}
        onDismiss={handleCloseDetail}
        sale={selectedPurchase}
        visible={detailModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 40,
    paddingHorizontal: 14,
  },
  scopeSurface: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: 8,
    padding: 14,
  },
  scopeTitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.75,
    textTransform: "uppercase",
  },
  segmentedButtons: {
    borderRadius: 12,
  },
  kpiContainer: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    overflow: "hidden",
  },
  kpiScroll: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  kpiItem: {
    alignItems: "flex-start",
    gap: 2,
    minWidth: 110,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.65,
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  kpiDivider: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    height: 32,
    marginHorizontal: 14,
    width: 1,
  },
  categoriesRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryFilterChip: {
    borderRadius: 14,
    elevation: 1,
  },
  categoryFilterChipText: {
    fontSize: 13,
  },
  searchPanel: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    padding: 12,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  searchIcon: {
    margin: 0,
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  activeFiltersIndicatorRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
  },
  activeFiltersChip: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
  },
  activeFiltersChipText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  expandedFilters: {
    gap: 12,
    marginTop: 8,
  },
  filtersDivider: {
    opacity: 0.15,
  },
  filterBlock: {
    gap: 6,
  },
  filterBlockTitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
    textTransform: "uppercase",
  },
  filterChipGroup: {
    flexDirection: "row",
    gap: 8,
  },
  miniChip: {
    borderRadius: 8,
  },
  miniChipActive: {
    backgroundColor: "#2563eb",
  },
  miniChipActiveText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  filterFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 4,
  },
  limitBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  limitChip: {
    borderRadius: 8,
  },
  resultsHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  resultsCountText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.75,
  },
  viewModeToggle: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    padding: 2,
  },
  modeBtn: {
    borderRadius: 10,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    opacity: 0.85,
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.65,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 8,
  },
  tableContainer: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    overflow: "hidden",
  },
  tableRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  tableCellDate: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.75,
  },
  tableCategoryChip: {
    borderRadius: 8,
  },
  tableCategoryChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tableUserCol: {
    gap: 2,
  },
  tableUsername: {
    fontSize: 12,
    fontWeight: "700",
  },
  tableAdminText: {
    fontSize: 10,
    opacity: 0.55,
  },
  tableDetailText: {
    fontSize: 12,
    opacity: 0.85,
  },
  tableAmountText: {
    fontSize: 13,
    fontWeight: "800",
  },
  tableMethodText: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },
  tableStatusBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  tableStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rechargeStatusPair: {
    alignItems: "stretch",
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  rechargeStatusPart: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  rechargeStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  zeroMargin: {
    margin: 0,
    padding: 0,
  },
  cardsContainer: {
    gap: 12,
  },
  cardPressable: {
    borderRadius: 20,
  },
  saleCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: 10,
    padding: 14,
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTypeWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cardCatChip: {
    borderRadius: 8,
  },
  cardCatChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDateText: {
    fontSize: 12,
    opacity: 0.6,
  },
  cardStatusBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    gap: 4,
  },
  cardUserRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  cardUserLabel: {
    fontSize: 12,
    opacity: 0.55,
  },
  cardUserVal: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardAdminVal: {
    fontSize: 11,
    opacity: 0.55,
  },
  cardDetailText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    opacity: 0.9,
  },
  cardCommentPreview: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.7,
  },
  cardFooter: {
    alignItems: "center",
    borderTopColor: "rgba(148, 163, 184, 0.12)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  cardPriceBlock: {
    gap: 2,
  },
  cardAmountText: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardMethodText: {
    fontSize: 11,
    opacity: 0.6,
    textTransform: "uppercase",
  },
  cardFooterActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  cardEvidenceChip: {
    borderRadius: 8,
    borderWidth: 1,
  },
  cardEvidenceChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  refundChip: {
    backgroundColor: "rgba(251, 146, 60, 0.18)",
    borderRadius: 8,
    marginTop: 4,
  },
  refundChipText: {
    color: "#fdba74",
    fontSize: 10,
    fontWeight: "700",
  },
  cardChevron: {
    margin: -4,
  },
  cardsPagination: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    overflow: "hidden",
  },
});
