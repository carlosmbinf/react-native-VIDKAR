import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  ActivityIndicator,
  Button,
  Chip,
  DataTable,
  Divider,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import {
  EvidenciasVentasEfectivoCollection,
  VentasCollection,
  VentasRechargeCollection,
} from "../collections/collections";
import VentaDetailModal from "./VentaDetailModal.native";
import {
  CATEGORIES,
  CATEGORY_COLORS,
  deriveSaleStatus,
  detectSaleCategory,
  formatDateShort,
  formatMoney,
  getCartItemType,
  getEvidenceMeta,
  getSaleItems,
  getSaleSpecificDetail,
  getStatusMeta,
  normalizeText,
} from "./ventasUtils";

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

const DIRECT_VENTAS_FIELDS = {
  _id: 1,
  adminId: 1,
  cobrado: 1,
  cobradoAlAdmin: 1,
  comentario: 1,
  createdAt: 1,
  gananciasAdmin: 1,
  precio: 1,
  type: 1,
  userId: 1,
};

const EVIDENCIA_FIELDS = {
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
  base64: 1,
  cancelada: 1,
  cancelado: 1,
  createdAt: 1,
  data: 1,
  dataB64: 1,
  dataBase64: 1,
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

export default function VentasList() {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const { id, pago } = useLocalSearchParams();
  const routeId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
  const routePago = typeof pago === "string" ? pago : Array.isArray(pago) ? pago[0] : null;
  const initialPagoFilter =
    routePago === "PAGADO" || routePago === "PENDIENTE" ? routePago : "TODOS";

  // State
  const [fetchLimit, setFetchLimit] = useState(FETCH_LIMIT_OPTIONS[1]); // 100
  const [viewMode, setViewMode] = useState(isTablet ? "table" : "cards"); // 'table' | 'cards'
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(initialPagoFilter);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("TODOS");
  const [selectedEvidenceFilter, setSelectedEvidenceFilter] = useState("TODOS");
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(OPTIONS_PER_PAGE[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal Detail State
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const dataReady = useDeferredScreenData();

  useEffect(() => {
    setSelectedStatus(initialPagoFilter);
  }, [initialPagoFilter]);

  // Reactive data fetching
  const {
    currentUserId,
    currentUsername,
    isAdmin,
    isGeneralAdmin,
    ready,
    routeUsername,
    ventasUnificadas,
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
        ready: false,
        routeUsername: "",
        ventasUnificadas: [],
      };
    }

    // 1. Subordinated users subscription (if admin)
    let subordinadosIds = [];
    if (isAdm && !isGenAdmin) {
      Meteor.subscribe("user", { bloqueadoDesbloqueadoPor: cUserId }, { fields: { _id: 1 } });
      subordinadosIds = Meteor.users
        .find({ bloqueadoDesbloqueadoPor: cUserId })
        .fetch()
        .map((u) => u._id);
    }

    // 2. Query construction
    const buildScopeQuery = () => {
      const userCondition = routeId
        ? { $or: [{ userId: routeId }, { adminId: routeId }, { idUser: routeId }] }
        : null;

      if (isGenAdmin) {
        return userCondition || {};
      }

      const ownCondition = {
        $or: [
          { userId: cUserId },
          { idUser: cUserId },
          { adminId: cUserId },
          ...(subordinadosIds.length > 0 ? [{ userId: { $in: subordinadosIds } }] : []),
        ],
      };

      return userCondition ? { $and: [ownCondition, userCondition] } : ownCondition;
    };

    const scopeQuery = buildScopeQuery();

    // 3. Subscriptions
    const rechargeSub = Meteor.subscribe("ventasRecharge", scopeQuery, {
      fields: RECARGAS_VENTA_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    });

    const directSub = Meteor.subscribe("ventas", scopeQuery, {
      fields: DIRECT_VENTAS_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    });

    const usersSub = Meteor.subscribe(
      "user",
      {},
      { fields: { _id: 1, username: 1, "profile.role": 1 } },
    );

    // Fetch recharge docs
    const rechargeDocs = VentasRechargeCollection.find(scopeQuery, {
      fields: RECARGAS_VENTA_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    }).fetch();

    // Fetch direct docs
    const directDocs = VentasCollection.find(scopeQuery, {
      fields: DIRECT_VENTAS_FIELDS,
      sort: { createdAt: -1 },
      limit: fetchLimit,
    }).fetch();

    // 4. Candidate IDs for evidence subscription
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
        { fields: EVIDENCIA_FIELDS },
      );
      evidenceSubReady = evSub.ready();
      fetchedEvidencias = EvidenciasVentasEfectivoCollection.find(
        { ventaId: { $in: uniqueEvidenceIds } },
        { fields: EVIDENCIA_FIELDS },
      ).fetch();
    }

    // Map evidence by ventaId
    const evidenceMap = new Map();
    for (const ev of fetchedEvidencias) {
      if (ev.ventaId) {
        evidenceMap.set(String(ev.ventaId), ev);
      }
    }

    // Route user name resolution
    const routeUserDoc = routeId ? Meteor.users.findOne(routeId) : null;

    // Helper for usernames
    const resolveUsername = (uId) => {
      if (!uId) return "";
      if (uId === "SERVER") return "SERVER";
      return Meteor.users.findOne(uId)?.username || "";
    };

    // 5. Unify sales
    const unified = [];

    // Map recharge sales
    for (const doc of rechargeDocs) {
      const buyerId = doc.userId || doc.idUser || doc.producto?.userId;
      const rawItems = getSaleItems(doc);
      const buyerName = resolveUsername(buyerId) || "Usuario";
      const adminName = resolveUsername(doc.adminId) || (doc.adminId === "SERVER" ? "SERVER" : "Administración");
      const category = detectSaleCategory(doc);
      const statusDerived = deriveSaleStatus(doc);

      // Find matched evidence
      let matchedEvidence = evidenceMap.get(String(doc._id)) || null;
      if (!matchedEvidence) {
        for (const it of rawItems) {
          if (it?._id && evidenceMap.has(String(it._id))) {
            matchedEvidence = evidenceMap.get(String(it._id));
            break;
          }
        }
      }

      const totalAmount = Number(doc.precioOficial ?? doc.monto ?? doc.cobrado ?? 0);
      const currency = doc.monedaPrecioOficial || doc.monedaCobrado || "CUP";

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
        metodoPago: doc.metodoPago || "No especificado",
        comentario: doc.comentario || "",
        items: rawItems,
        evidence: matchedEvidence,
        rawDoc: doc,
        specificDetail: getSaleSpecificDetail({ ...doc, category, items: rawItems }),
      });
    }

    // Map direct sales (VentasCollection)
    for (const doc of directDocs) {
      const buyerName = resolveUsername(doc.userId) || "Usuario";
      const adminName = resolveUsername(doc.adminId) || "SERVER";
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
        specificDetail: doc.comentario ? "Nota: " + doc.comentario : "Venta directa " + (doc.type || ""),
      });
    }

    // Sort by createdAt desc
    unified.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });

    const isAllReady = rechargeSub.ready() && directSub.ready() && usersSub.ready() && evidenceSubReady;

    return {
      currentUserId: cUserId,
      currentUsername: cUsername,
      isAdmin: isAdm,
      isGeneralAdmin: isGenAdmin,
      ready: isAllReady,
      routeUsername: routeUserDoc?.username || "",
      ventasUnificadas: unified,
    };
  }, [dataReady, fetchLimit, routeId, refreshKey]);

  // Derived category counts
  const categoryCounts = useMemo(() => {
    const counts = { TODAS: ventasUnificadas.length };
    for (const cat of CATEGORIES) {
      if (cat.key !== "TODAS") {
        counts[cat.key] = 0;
      }
    }
    for (const sale of ventasUnificadas) {
      if (counts[sale.category] !== undefined) {
        counts[sale.category] += 1;
      }
    }
    return counts;
  }, [ventasUnificadas]);

  // Filtered sales
  const filteredVentas = useMemo(() => {
    let result = ventasUnificadas;

    // 1. Category Filter
    if (selectedCategory !== "TODAS") {
      result = result.filter((sale) => sale.category === selectedCategory);
    }

    // 2. Status Filter
    if (selectedStatus !== "TODOS") {
      if (selectedStatus === "PAGADO") {
        result = result.filter((sale) => sale.statusDerived === "ENTREGADO");
      } else if (selectedStatus === "PENDIENTE") {
        result = result.filter(
          (sale) =>
            sale.statusDerived === "PENDIENTE_PAGO" ||
            sale.statusDerived === "PENDIENTE_ENTREGA",
        );
      } else if (selectedStatus === "CANCELADO") {
        result = result.filter((sale) => sale.statusDerived === "CANCELADO");
      }
    }

    // 3. Payment Method Filter
    if (selectedPaymentMethod !== "TODOS") {
      result = result.filter(
        (sale) =>
          normalizeText(sale.metodoPago) === normalizeText(selectedPaymentMethod),
      );
    }

    // 4. Evidence Filter
    if (selectedEvidenceFilter !== "TODOS") {
      if (selectedEvidenceFilter === "CON_EVIDENCIA") {
        result = result.filter((sale) => !!sale.evidence);
      } else if (selectedEvidenceFilter === "SIN_EVIDENCIA") {
        result = result.filter((sale) => !sale.evidence);
      } else if (selectedEvidenceFilter === "APROBADA") {
        result = result.filter((sale) => sale.evidence?.aprobado === true);
      } else if (selectedEvidenceFilter === "PENDIENTE_REVISION") {
        result = result.filter(
          (sale) =>
            sale.evidence &&
            !sale.evidence.aprobado &&
            !sale.evidence.denegado &&
            !sale.evidence.rechazado,
        );
      }
    }

    // 5. Search query
    const q = normalizeText(searchQuery);
    if (q) {
      result = result.filter((sale) => {
        const pool = [
          sale._id,
          sale.userusername,
          sale.adminusername,
          sale.comentario,
          sale.specificDetail,
          sale.metodoPago,
          sale.category,
          String(sale.precio),
        ];
        return pool.some((val) => normalizeText(val).includes(q));
      });
    }

    return result;
  }, [
    searchQuery,
    selectedCategory,
    selectedEvidenceFilter,
    selectedPaymentMethod,
    selectedStatus,
    ventasUnificadas,
  ]);

  // KPI Metrics
  const metrics = useMemo(() => {
    let totalFacturadoCUP = 0;
    let totalFacturadoUSD = 0;
    let pendientes = 0;
    let entregadas = 0;
    let conEvidencia = 0;

    for (const sale of ventasUnificadas) {
      if (sale.moneda === "USD") {
        totalFacturadoUSD += sale.precio;
      } else {
        totalFacturadoCUP += sale.precio;
      }

      if (
        sale.statusDerived === "PENDIENTE_PAGO" ||
        sale.statusDerived === "PENDIENTE_ENTREGA"
      ) {
        pendientes += 1;
      } else if (sale.statusDerived === "ENTREGADO") {
        entregadas += 1;
      }

      if (sale.evidence) {
        conEvidencia += 1;
      }
    }

    return {
      totalVentas: ventasUnificadas.length,
      totalFacturadoCUP,
      totalFacturadoUSD,
      pendientes,
      entregadas,
      conEvidencia,
    };
  }, [ventasUnificadas]);

  // Unique payment methods
  const paymentMethods = useMemo(() => {
    const methods = new Set(
      ventasUnificadas.map((v) => v.metodoPago).filter(Boolean),
    );
    return ["TODOS", ...methods];
  }, [ventasUnificadas]);

  // Pagination
  useEffect(() => {
    setPage(0);
  }, [
    fetchLimit,
    searchQuery,
    selectedCategory,
    selectedEvidenceFilter,
    selectedPaymentMethod,
    selectedStatus,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredVentas.length / itemsPerPage));
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, filteredVentas.length);
  const visibleVentas = useMemo(
    () => filteredVentas.slice(from, to),
    [filteredVentas, from, to],
  );

  const activeFiltersCount = [
    Boolean(searchQuery.trim()),
    selectedCategory !== "TODAS",
    selectedStatus !== "TODOS",
    selectedPaymentMethod !== "TODOS",
    selectedEvidenceFilter !== "TODOS",
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("TODAS");
    setSelectedStatus("TODOS");
    setSelectedPaymentMethod("TODOS");
    setSelectedEvidenceFilter("TODOS");
    setPage(0);
  };

  const handleOpenDetail = (sale) => {
    setSelectedVenta(sale);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedVenta(null);
  };

  const panelBg = theme.dark ? "#0a1324" : "#ffffff";
  const borderCol = theme.dark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.1)";

  return (
    <View style={[styles.screen, { backgroundColor: theme.dark ? "#050b16" : "#f1f5f9" }]}>
      <AppHeader
        title="Listado de Ventas"
        subtitle={
          routeId
            ? "Ventas filtradas para @" + (routeUsername || routeId)
            : !isGeneralAdmin
              ? "Tus compras, recargas, pedidos y comprobantes"
              : "Control integral de compras, evidencias y transacciones"
        }
        showBackButton
        backHref="/(normal)/Main"
        overlapContent
        actions={
          <View style={styles.headerActions}>
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
        {/* KPI METRICS STRIP */}
        <Surface style={[styles.kpiContainer, { backgroundColor: panelBg, borderColor: borderCol }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Total Registros</Text>
              <Text style={[styles.kpiValue, { color: theme.dark ? "#f8fafc" : "#0f172a" }]}>
                {metrics.totalVentas}
              </Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Facturado CUP</Text>
              <Text style={[styles.kpiValue, { color: "#38bdf8" }]}>
                {formatMoney(metrics.totalFacturadoCUP, "CUP")}
              </Text>
            </View>

            {metrics.totalFacturadoUSD > 0 ? (
              <>
                <View style={styles.kpiDivider} />
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>Facturado USD</Text>
                  <Text style={[styles.kpiValue, { color: "#34d399" }]}>
                    {"$" + metrics.totalFacturadoUSD.toFixed(2) + " USD"}
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
              <Text style={styles.kpiLabel}>Con Evidencia</Text>
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
              placeholder="Buscar por usuario, ID, teléfono, servicio..."
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

              {/* Evidence filter */}
              <View style={styles.filterBlock}>
                <Text style={styles.filterBlockTitle}>Comprobantes / Evidencias:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipGroup}>
                  {[
                    { key: "TODOS", label: "Todas" },
                    { key: "CON_EVIDENCIA", label: "Con comprobante" },
                    { key: "PENDIENTE_REVISION", label: "En revisión" },
                    { key: "APROBADA", label: "Aprobadas" },
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
                      {pm}
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
                {activeFiltersCount + " filtro" + (activeFiltersCount > 1 ? "s" : "") + " aplicado" + (activeFiltersCount > 1 ? "s" : "")}
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
            {"Mostrando " + filteredVentas.length + " venta" + (filteredVentas.length !== 1 ? "s" : "")}
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
        {filteredVentas.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: panelBg, borderColor: borderCol }]}>
            <IconButton icon="package-variant-closed" size={44} iconColor="#94a3b8" />
            <Text style={styles.emptyTitle}>No se encontraron ventas</Text>
            <Text style={styles.emptySubtitle}>
              {activeFiltersCount > 0
                ? "No hay resultados para los filtros seleccionados. Prueba a limpiarlos."
                : "No hay registros de compras o ventas disponibles en este momento."}
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
              <DataTable style={{ minWidth: 960 }}>
                <DataTable.Header>
                  <DataTable.Title style={{ width: 90 }}>Fecha</DataTable.Title>
                  <DataTable.Title style={{ width: 130 }}>Tipo</DataTable.Title>
                  <DataTable.Title style={{ width: 140 }}>Usuario / Admin</DataTable.Title>
                  <DataTable.Title style={{ width: 230 }}>Detalle del Servicio</DataTable.Title>
                  <DataTable.Title numeric style={{ width: 110 }}>Monto</DataTable.Title>
                  <DataTable.Title style={{ width: 110 }}>Método</DataTable.Title>
                  <DataTable.Title style={{ width: 130 }}>Estado</DataTable.Title>
                  <DataTable.Title style={{ width: 140 }}>Evidencia</DataTable.Title>
                  <DataTable.Title numeric style={{ width: 60 }}>Ver</DataTable.Title>
                </DataTable.Header>

                {visibleVentas.map((sale) => {
                  const catMeta = CATEGORY_COLORS[sale.category] || CATEGORY_COLORS.OTROS;
                  const stMeta = getStatusMeta(sale.statusDerived, theme.dark);
                  const evMeta = getEvidenceMeta(sale.evidence, sale, theme.dark);

                  return (
                    <DataTable.Row
                      key={sale._id}
                      onPress={() => handleOpenDetail(sale)}
                      style={styles.tableRow}
                    >
                      <DataTable.Cell style={{ width: 90 }}>
                        <Text style={styles.tableCellDate}>{formatDateShort(sale.createdAt)}</Text>
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
                          <Text numberOfLines={1} style={styles.tableUsername}>
                            {"@" + sale.userusername}
                          </Text>
                          <Text numberOfLines={1} style={styles.tableAdminText}>
                            {"Resp: " + sale.adminusername}
                          </Text>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 230 }}>
                        <Text numberOfLines={2} style={styles.tableDetailText}>
                          {sale.specificDetail}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ width: 110 }}>
                        <Text style={styles.tableAmountText}>
                          {formatMoney(sale.precio, sale.moneda)}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 110 }}>
                        <Text numberOfLines={1} style={styles.tableMethodText}>
                          {sale.metodoPago}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 130 }}>
                        <View
                          style={[
                            styles.tableStatusBadge,
                            { backgroundColor: stMeta.backgroundColor, borderColor: stMeta.borderColor },
                          ]}
                        >
                          <View style={[styles.statusDot, { backgroundColor: stMeta.dotColor }]} />
                          <Text numberOfLines={1} style={[styles.tableStatusText, { color: stMeta.textColor }]}>
                            {stMeta.shortLabel}
                          </Text>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ width: 140 }}>
                        <Chip
                          compact
                          icon={evMeta.icon}
                          style={[
                            styles.tableEvidenceChip,
                            { backgroundColor: evMeta.backgroundColor, borderColor: evMeta.borderColor },
                          ]}
                          textStyle={[styles.tableEvidenceChipText, { color: evMeta.textColor }]}
                        >
                          {evMeta.label}
                        </Chip>
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ width: 60 }}>
                        <IconButton
                          icon="eye-outline"
                          size={18}
                          onPress={() => handleOpenDetail(sale)}
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
              label={(from + 1) + "-" + to + " de " + filteredVentas.length}
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
            {visibleVentas.map((sale) => {
              const catMeta = CATEGORY_COLORS[sale.category] || CATEGORY_COLORS.OTROS;
              const stMeta = getStatusMeta(sale.statusDerived, theme.dark);
              const evMeta = getEvidenceMeta(sale.evidence, sale, theme.dark);

              return (
                <Pressable
                  key={sale._id}
                  onPress={() => handleOpenDetail(sale)}
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
                        <Text style={styles.cardDateText}>{formatDateShort(sale.createdAt)}</Text>
                      </View>

                      <View
                        style={[
                          styles.cardStatusBadge,
                          { backgroundColor: stMeta.backgroundColor, borderColor: stMeta.borderColor },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: stMeta.dotColor }]} />
                        <Text style={[styles.cardStatusText, { color: stMeta.textColor }]}>
                          {stMeta.shortLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Card Body */}
                    <View style={styles.cardBody}>
                      <View style={styles.cardUserRow}>
                        <Text style={styles.cardUserLabel}>Cliente:</Text>
                        <Text numberOfLines={1} style={styles.cardUserVal}>
                          {"@" + sale.userusername}
                        </Text>
                        <Text style={styles.cardAdminVal}>{"• Admin: " + sale.adminusername}</Text>
                      </View>

                      <Text numberOfLines={2} style={styles.cardDetailText}>
                        {sale.specificDetail}
                      </Text>

                      {sale.comentario && sale.category !== "BALANCE" ? (
                        <Text numberOfLines={1} style={styles.cardCommentPreview}>
                          {"💬 " + sale.comentario}
                        </Text>
                      ) : null}
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.cardPriceBlock}>
                        <Text style={styles.cardAmountText}>
                          {formatMoney(sale.precio, sale.moneda)}
                        </Text>
                        <Text style={styles.cardMethodText}>{sale.metodoPago}</Text>
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
                        <IconButton
                          icon="chevron-right"
                          size={20}
                          onPress={() => handleOpenDetail(sale)}
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
                label={(from + 1) + "-" + to + " de " + filteredVentas.length}
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

      {/* DETAIL & EVIDENCE MODAL */}
      <VentaDetailModal
        evidence={selectedVenta?.evidence}
        isAdmin={isAdmin}
        isGeneralAdmin={isGeneralAdmin}
        onActionComplete={() => setRefreshKey((k) => k + 1)}
        onDismiss={handleCloseDetail}
        sale={selectedVenta}
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
  tableEvidenceChip: {
    borderRadius: 8,
    borderWidth: 1,
  },
  tableEvidenceChipText: {
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
