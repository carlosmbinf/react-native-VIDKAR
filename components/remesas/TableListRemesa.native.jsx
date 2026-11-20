import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ActivityIndicator,
  Chip,
  DataTable,
  Divider,
  IconButton,
  Snackbar,
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
  Button,
  Chip,
  DataTable,
  Divider,
  IconButton,
  Snackbar,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import DrawerBottom from "../drawer/DrawerBottom.native";
import {
  EvidenciasVentasEfectivoCollection,
  VentasRechargeCollection,
} from "../collections/collections";
import VentaDetailModal from "../ventas/VentaDetailModal.native";
import {
  CATEGORY_COLORS,
  deriveSaleStatus,
  detectSaleCategory,
  formatDateShort,
  formatMoney,
  getEvidenceMeta,
  getSaleItems,
  getSaleSpecificDetail,
  getStatusMeta,
  normalizeText,
} from "../ventas/ventasUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const REMESA_LIST_FIELDS = {
  const safeHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
    } catch (_) { }
  };

  const OPTIONS_PER_PAGE = [10, 25, 50];
  const FETCH_LIMIT_OPTIONS = [50, 100, 200];

  const REMESA_FIELDS = {
    _id: 1,
    adminId: 1,
    carrito: 1,
    cobrado: 1,
    comentario: 1,
    createdAt: 1,
    direccionCuba: 1,
    direccionEntrega: 1,
    estado: 1,
    idUser: 1,
    isCancelada: 1,
    isCobrado: 1,
    metodoPago: 1,
    monedaCobrado: 1,
    monedaPrecioOficial: 1,
    monedaRecibirEnCuba: 1,
    monto: 1,
    nombre: 1,
    precioOficial: 1,
    "producto.carritos._id": 1,
    "producto.carritos.cancelado": 1,
    "producto.carritos.comentario": 1,
    "producto.carritos.cobrarUSD": 1,
    "producto.carritos.direccionCuba": 1,
    "producto.carritos.entregado": 1,
    "producto.carritos.monedaACobrar": 1,
    "producto.carritos.monedaRecibirEnCuba": 1,
    "producto.carritos.nombre": 1,
    "producto.carritos.recibirEnCuba": 1,
    "producto.carritos.status": 1,
    "producto.carritos.tarjetaCUP": 1,
    "producto.carritos.type": 1,
    "producto.carrito": 1,
    "producto.carritos": 1,
    "producto.name": 1,
    "producto.status": 1,
    "producto.type": 1,
    "producto.userId": 1,
    recibirEnCuba: 1,
    status: 1,
    tarjetaCUP: 1,
    tipo: 1,
    type: 1,
    userId: 1,
  };

  const estadoConfig = (estado, isDark) => {
    switch (estado) {
      case "ENTREGADO":
        return {
          bg: isDark ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 197, 94, 0.12)",
          border: isDark ? "rgba(74, 222, 128, 0.28)" : "rgba(34, 197, 94, 0.25)",
          color: isDark ? "#4ade80" : "#16a34a",
          label: "Entregado",
        };
      case "PENDIENTE_ENTREGA":
        return {
          bg: isDark ? "rgba(245, 158, 11, 0.16)" : "rgba(245, 158, 11, 0.12)",
          border: isDark ? "rgba(251, 191, 36, 0.28)" : "rgba(245, 158, 11, 0.25)",
          color: isDark ? "#fbbf24" : "#d97706",
          label: "Pendiente",
        };
      case "CANCELADO":
        return {
          bg: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(239, 68, 68, 0.12)",
          border: isDark ? "rgba(248, 113, 113, 0.28)" : "rgba(239, 68, 68, 0.25)",
          color: isDark ? "#f87171" : "#dc2626",
          label: "Cancelado",
        };
      case "PENDIENTE_PAGO":
        return {
          bg: isDark ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.12)",
          border: isDark ? "rgba(96, 165, 250, 0.28)" : "rgba(59, 130, 246, 0.25)",
          color: isDark ? "#60a5fa" : "#2563eb",
          label: "Pend. Pago",
        };
      default:
        return {
          bg: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(100, 116, 139, 0.12)",
          border: isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(100, 116, 139, 0.25)",
          color: isDark ? "#cbd5e1" : "#64748b",
          label: estado || "Desconocido",
        };
    }
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

    const getItemsCount = (venta) =>
      venta?.producto?.carritos?.length ||
      venta?.carrito?.length ||
      venta?.producto?.carrito?.length ||
      0;
    const extractBeneficiarios = (sale) => {
      const items = getSaleItems(sale);
      const remesaItems = items.filter((item) => {
        const t = String(item?.type || item?.tipo || "").toUpperCase();
        return t === "REMESA" || !t;
      });

      const getItemsArray = (venta) =>
        (
          venta?.producto?.carritos ||
          venta?.carrito ||
          venta?.producto?.carrito ||
          []
        ).filter((carrito) => carrito.type === "REMESA");
      if (remesaItems.length > 0) {
        return remesaItems.map((item) => ({
          comentario: item?.comentario || "",
          direccionCuba: item?.direccionCuba || "",
          entregado: item?.entregado === true || item?.status === "COMPLETED",
          monedaRecibirEnCuba: item?.monedaRecibirEnCuba || "CUP",
          nombre: item?.nombre || "Sin especificar",
          recibirEnCuba: Number(item?.recibirEnCuba || 0),
          tarjetaCUP: item?.tarjetaCUP || "",
        }));
      }

      const deriveEstadoVenta = (venta) => {
        const carritos = getItemsArray(venta) || [];
        if (venta?.isCobrado !== true) return "PENDIENTE_PAGO";
        if (carritos.length === 0) return venta?.estado || "PENDIENTE_ENTREGA";
        if (
          sale?.nombre ||
          sale?.tarjetaCUP ||
          sale?.direccionCuba ||
          sale?.recibirEnCuba
        ) {
          return [
            {
              comentario: sale?.comentario || "",
              direccionCuba: sale?.direccionCuba || sale?.direccionEntrega || "",
              entregado:
                sale?.estado === "ENTREGADO" ||
                sale?.status === "COMPLETED" ||
                sale?.entregado === true,
              monedaRecibirEnCuba: sale?.monedaRecibirEnCuba || "CUP",
              nombre: sale?.nombre || "Sin especificar",
              recibirEnCuba: Number(sale?.recibirEnCuba || sale?.monto || 0),
              tarjetaCUP: sale?.tarjetaCUP || "",
            },
          ];
        }

        const hasCancel = carritos.some(
          (carrito) => carrito?.status === "CANCELLED" || carrito?.cancelado === true,
        );
        if (hasCancel) return "CANCELADO";

        const allCompleted = carritos.every(
          (carrito) => carrito?.status === "COMPLETED" || carrito?.entregado === true,
        );
        if (allCompleted) return "ENTREGADO";

        return "PENDIENTE_ENTREGA";
        return [];
      };

      const TableListRemesa = () => {
        const TableListRemesa = ({ onNewRemesaPress }) => {
          const theme = useTheme();
          const detailScrollAtTopRef = React.useRef(true);
          const isDark = Boolean(theme?.dark);
          const { height, width } = useWindowDimensions();
          const isWide = width >= 768;
          const { width: windowWidth } = useWindowDimensions();
          const isTablet = windowWidth >= 768;

          const colors = useMemo(
            () => ({
              accent: isDark ? "#38bdf8" : "#0284c7",
              background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
              border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
              card: isDark ? "rgba(30, 41, 59, 0.7)" : "#f8fafc",
              chipBg: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              danger: isDark ? "#f87171" : "#dc2626",
              headerBg: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.8)",
              muted: isDark ? "#94a3b8" : "#64748b",
              primary: isDark ? "#60a5fa" : "#2563eb",
              rowHover: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
              subtle: isDark ? "#64748b" : "#94a3b8",
              success: isDark ? "#4ade80" : "#16a34a",
              successBg: isDark ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.08)",
              surface: isDark ? "#0f172a" : "#ffffff",
              text: isDark ? "#f8fafc" : "#0f172a",
              warning: isDark ? "#fbbf24" : "#d97706",
              warningBg: isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.08)",
            }),
            [isDark],
          );
          const [fetchLimit, setFetchLimit] = useState(FETCH_LIMIT_OPTIONS[0]); // 50
          const [viewMode, setViewMode] = useState(isTablet ? "table" : "cards");
          const [searchQuery, setSearchQuery] = useState("");
          const [selectedStatus, setSelectedStatus] = useState("TODOS");
          const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("TODOS");
          const [selectedEvidenceFilter, setSelectedEvidenceFilter] = useState("TODOS");
          const [page, setPage] = useState(0);
          const [itemsPerPage, setItemsPerPage] = useState(OPTIONS_PER_PAGE[0]);
          const [showFilters, setShowFilters] = useState(false);
          const [refreshKey, setRefreshKey] = useState(0);

          const flexes = useMemo(
            () =>
              isWide
                ? {
                  acc: 0.35,
                  cobrado: 0.9,
                  enviado: 0.9,
                  estado: 1.2,
                  fecha: 1.4,
                  items: 0.6,
                  metodo: 1.1,
                }
                : { acc: 0.45, cobrado: 1.1, estado: 1.3, fecha: 1.4 },
            [isWide],
          );
          const [selectedVenta, setSelectedVenta] = useState(null);
          const [detailModalVisible, setDetailModalVisible] = useState(false);
          const [snackbarMessage, setSnackbarMessage] = useState("");
          const [snackbarVisible, setSnackbarVisible] = useState(false);

          const isAdmin = Meteor.user()?.profile?.role === "admin" || false;
          const isAdminPrincipal = Meteor.user()?.username === "carlosmbinf" || false;
          const dataReady = useDeferredScreenData();

          const listIdSubordinados = Meteor.useTracker(() => {
            if (!dataReady || !isAdmin) return [];
            Meteor.subscribe(
              "user",
              { bloqueadoDesbloqueadoPor: Meteor.userId() },
              { fields: { _id: 1, bloqueadoDesbloqueadoPor: 1 } },
            );
            return Meteor.users
              .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
              .fetch()
              .map((element) => element._id);
          }, [dataReady, isAdmin, Meteor.userId()]);
          const {
            isAdmin,
            isGeneralAdmin,
            isUser,
            ready,
            remesas,
          } = Meteor.useTracker(() => {
            const user = Meteor.user();
            const cUserId = user?._id;
            const cUsername = user?.username || "";
            const isGenAdmin = cUsername === "carlosmbinf";
            const isAdm = isGenAdmin || user?.profile?.role === "admin";

            const { loading, ventas } = Meteor.useTracker(() => {
              if (!dataReady) {
                return { loading: true, ventas: [] };
                if (!dataReady || !cUserId) {
                  return {
                    currentUserId: cUserId,
                    isAdmin: false,
                    isGeneralAdmin: false,
                    isUser: false,
                    ready: false,
                    remesas: [],
                  };
                }

                const sub = Meteor.subscribe(
                  "ventasRecharge",
                  {
                    "producto.carritos.type": "REMESA",
                  },
                  {
                    fields: REMESA_LIST_FIELDS,
                  },
                );
                const query = isAdminPrincipal
                  ? { "producto.carritos.type": "REMESA" }
                  : isAdmin
                    ? {
                      "producto.carritos.type": "REMESA",
                      $or: [
                        { userId: Meteor.userId() },
                        { userId: { $in: listIdSubordinados } },
                      ],
                    }
                    : { "producto.carritos.type": "REMESA", userId: Meteor.userId() };
                // Scoped condition: normal users only see their own remesas
                const userCondition = isGenAdmin
                  ? {}
                  : {
                    $or: [
                      { userId: cUserId },
                      { idUser: cUserId },
                      { adminId: cUserId },
                      { "producto.userId": cUserId },
                    ],
                  };

                const docs = VentasRechargeCollection.find(query, {
                  fields: REMESA_LIST_FIELDS,
                  const remesaTypeCondition = {
                    $or: [
                      { "producto.carritos.type": "REMESA" },
                      { "carrito.type": "REMESA" },
                      { "producto.type": "REMESA" },
                      { type: "REMESA" },
                      { tipo: "REMESA" },
                    ],
                  };

                  const scopeQuery = isGenAdmin
                    ? remesaTypeCondition
                    : { $and: [userCondition, remesaTypeCondition] };

                  // Subscriptions
                  const rechargeSub = Meteor.subscribe("ventasRecharge", scopeQuery, {
                    fields: REMESA_FIELDS,
                    limit: fetchLimit,
                    sort: { createdAt: -1 },
                  });
                  return { loading: !sub.ready(), ventas: docs.fetch() };
                }, [dataReady, JSON.stringify(listIdSubordinados), isAdmin, isAdminPrincipal]);

                const [ventaSel, setVentaSel] = useState(null);
                const [visible, setVisible] = useState(false);
                const [snackbarMessage, setSnackbarMessage] = useState("");
                const [snackbarVisible, setSnackbarVisible] = useState(false);
                const rechargeDocs = VentasRechargeCollection.find(scopeQuery, {
                  fields: REMESA_FIELDS,
                  limit: fetchLimit,
                  sort: { createdAt: -1 },
                }).fetch();

                const openDialog = (venta) => {
                  detailScrollAtTopRef.current = true;
                  setVentaSel(venta);
                  setVisible(true);
                };
                // Candidate IDs for evidence subscription
                const candidateEvidenceIds = [];
                for (const doc of rechargeDocs) {
                  if (doc._id) candidateEvidenceIds.push(String(doc._id));
                  const items = getSaleItems(doc);
                  for (const item of items) {
                    if (item?._id) candidateEvidenceIds.push(String(item._id));
                  }
                }
                const uniqueEvidenceIds = [...new Set(candidateEvidenceIds)];

                const closeDialog = () => {
                  setVisible(false);
                  setVentaSel(null);
                };
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

                const evidenceMap = new Map();
                for (const ev of fetchedEvidencias) {
                  if (ev.ventaId) {
                    evidenceMap.set(String(ev.ventaId), ev);
                  }
                }

                // Unify and filter only remesas
                const unified = [];
                for (const doc of rechargeDocs) {
                  const category = detectSaleCategory(doc);
                  if (category !== "REMESAS") {
                    continue;
                  }

                  const buyerId = doc.userId || doc.idUser || doc.producto?.userId;
                  const rawItems = getSaleItems(doc);
                  const statusDerived = deriveSaleStatus(doc);

                  let matchedEvidence = evidenceMap.get(String(doc._id)) || null;
                  if (!matchedEvidence) {
                    for (const it of rawItems) {
                      if (it?._id && evidenceMap.has(String(it._id))) {
                        matchedEvidence = evidenceMap.get(String(it._id));
                        break;
                      }
                    }
                  }

                  const totalAmount = Number(
                    doc.precioOficial ?? doc.monto ?? doc.cobrado ?? 0,
                  );
                  const currency =
                    doc.monedaPrecioOficial || doc.monedaCobrado || "USD";

                  const beneficiarios = extractBeneficiarios(doc);
                  const totalCUP = beneficiarios.reduce(
                    (sum, b) => sum + Number(b.recibirEnCuba || 0),
                    0,
                  );

                  unified.push({
                    _id: doc._id,
                    adminId: doc.adminId,
                    beneficiarios,
                    category: "REMESAS",
                    comentario: doc.comentario || "",
                    createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
                    evidence: matchedEvidence,
                    items: rawItems,
                    metodoPago: doc.metodoPago || "No especificado",
                    moneda: currency,
                    precio: totalAmount,
                    rawDoc: doc,
                    source: "recharge",
                    specificDetail: getSaleSpecificDetail({
                      ...doc,
                      category: "REMESAS",
                      items: rawItems,
                    }),
                    statusDerived,
                    totalCUP,
                    userId: buyerId,
                  });
                }

                unified.sort((a, b) => {
                  const timeA = a.createdAt ? a.createdAt.getTime() : 0;
                  const timeB = b.createdAt ? b.createdAt.getTime() : 0;
                  return timeB - timeA;
                });

                return {
                  currentUserId: cUserId,
                  isAdmin: isAdm,
                  isGeneralAdmin: isGenAdmin,
                  isUser: user?.profile?.role === "user",
                  ready: rechargeSub.ready() && evidenceSubReady,
                  remesas: unified,
                };
              }, [dataReady, fetchLimit, refreshKey]);

            const copiarTexto = async (texto, label) => {
              if (!texto) return;
              safeHaptic();
              await Clipboard.setStringAsync(String(texto));
              setSnackbarMessage(`✅ ${label} copiado`);
              setSnackbarVisible(true);
            };

            const formatFechaCorta = (date) => {
              if (!date) return "-";
              const d = new Date(date);
              return new Intl.DateTimeFormat("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              }).format(d);
              // Filtered remesas
              const filteredRemesas = useMemo(() => {
                let result = remesas;

                // 1. Status Filter
                if (selectedStatus !== "TODOS") {
                  if (selectedStatus === "PAGADO" || selectedStatus === "ENTREGADO") {
                    result = result.filter((sale) => sale.statusDerived === "ENTREGADO");
                  } else if (selectedStatus === "PENDIENTE_ENTREGA") {
                    result = result.filter(
                      (sale) => sale.statusDerived === "PENDIENTE_ENTREGA",
                    );
                  } else if (selectedStatus === "PENDIENTE_PAGO") {
                    result = result.filter(
                      (sale) => sale.statusDerived === "PENDIENTE_PAGO",
                    );
                  } else if (selectedStatus === "CANCELADO") {
                    result = result.filter((sale) => sale.statusDerived === "CANCELADO");
                  }
                }

                // 2. Payment Method Filter
                if (selectedPaymentMethod !== "TODOS") {
                  result = result.filter(
                    (sale) =>
                      normalizeText(sale.metodoPago) ===
                      normalizeText(selectedPaymentMethod),
                  );
                }

                // 3. Evidence Filter
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

                // 4. Search query
                const q = normalizeText(searchQuery);
                if (q) {
                  result = result.filter((sale) => {
                    const pool = [
                      sale._id,
                      sale.comentario,
                      sale.specificDetail,
                      sale.metodoPago,
                      String(sale.precio),
                      String(sale.totalCUP),
                    ];

                    for (const b of sale.beneficiarios) {
                      pool.push(b.nombre, b.tarjetaCUP, b.direccionCuba, b.comentario);
                    }

                    return pool.some((val) => normalizeText(val).includes(q));
                  });
                }

                return result;
              }, [
                remesas,
                searchQuery,
                selectedEvidenceFilter,
                selectedPaymentMethod,
                selectedStatus,
              ]);

              // KPI Metrics
              const metrics = useMemo(() => {
                let totalCUP = 0;
                let totalCobradoUSD = 0;
                let pendientes = 0;
                let entregadas = 0;
                let conEvidencia = 0;

                for (const r of remesas) {
                  totalCUP += Number(r.totalCUP || 0);
                  totalCobradoUSD += Number(r.precio || 0);

                  if (
                    r.statusDerived === "PENDIENTE_PAGO" ||
                    r.statusDerived === "PENDIENTE_ENTREGA"
                  ) {
                    pendientes += 1;
                  } else if (r.statusDerived === "ENTREGADO") {
                    entregadas += 1;
                  }

                  if (r.evidence) {
                    conEvidencia += 1;
                  }
                }

                return {
                  conEvidencia,
                  entregadas,
                  pendientes,
                  totalCobradoUSD,
                  totalCUP,
                  totalRemesas: remesas.length,
                };
              }, [remesas]);

              // Unique payment methods
              const paymentMethods = useMemo(() => {
                const methods = new Set(
                  remesas.map((v) => v.metodoPago).filter(Boolean),
                );
                return ["TODOS", ...methods];
              }, [remesas]);

              // Pagination
              useEffect(() => {
                setPage(0);
              }, [
                fetchLimit,
                searchQuery,
                selectedEvidenceFilter,
                selectedPaymentMethod,
                selectedStatus,
              ]);

              const totalPages = Math.max(
                1,
                Math.ceil(filteredRemesas.length / itemsPerPage),
              );
              const from = page * itemsPerPage;
              const to = Math.min((page + 1) * itemsPerPage, filteredRemesas.length);
              const visibleRemesas = useMemo(
                () => filteredRemesas.slice(from, to),
                [filteredRemesas, from, to],
              );

              const activeFiltersCount = [
                Boolean(searchQuery.trim()),
                selectedStatus !== "TODOS",
                selectedPaymentMethod !== "TODOS",
                selectedEvidenceFilter !== "TODOS",
              ].filter(Boolean).length;

              const handleClearFilters = () => {
                safeHaptic();
                setSearchQuery("");
                setSelectedStatus("TODOS");
                setSelectedPaymentMethod("TODOS");
                setSelectedEvidenceFilter("TODOS");
                setPage(0);
              };

              const formatFechaCompleta = (date) => {
                if (!date) return "-";
                const d = new Date(date);
                return new Intl.DateTimeFormat("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(d);
                const handleOpenDetail = (sale) => {
                  safeHaptic();
                  setSelectedVenta(sale);
                  setDetailModalVisible(true);
                };

                const money = (value, moneda = "USD") => {
                  const num = Number(value || 0);
                  return `${num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
                  const handleCloseDetail = () => {
                    setDetailModalVisible(false);
                    setSelectedVenta(null);
                  };

                  const maxScrollHeight = Math.max(260, Math.floor(height * 0.72));
                  const panelBg = theme.dark ? "#0a1324" : "#ffffff";
                  const borderCol = theme.dark
                    ? "rgba(148, 163, 184, 0.14)"
                    : "rgba(15, 23, 42, 0.1)";

                  return (
                    <View style={styles.container}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
                            📊 Historial y Resumen de Ventas
                          </Text>
                          {ventas.length > 0 ? (
                            <Chip compact style={{ backgroundColor: colors.chipBg }}>
                              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
                                {ventas.length} total
                              </Text>
                            </Chip>
                          ) : null}
                        </View>
                        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: colors.muted }]}>
                          Tabla de todas las órdenes de remesas y detalle por beneficiario
                        </Text>
                      </View>
                      {/* KPI METRICS STRIP - Identical to VentasList */}
                      <Surface
                        style={[
                          styles.kpiContainer,
                          { backgroundColor: panelBg, borderColor: borderCol },
                        ]}
                      >
                        <ScrollView
                          contentContainerStyle={styles.kpiScroll}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Total Remesas</Text>
                            <Text
                              style={[
                                styles.kpiValue,
                                { color: theme.dark ? "#f8fafc" : "#0f172a" },
                              ]}
                            >
                              {metrics.totalRemesas}
                            </Text>
                          </View>

                          <View style={styles.kpiDivider} />

                          <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>A Entregar (CUP)</Text>
                            <Text style={[styles.kpiValue, { color: "#10b981" }]}>
                              {formatMoney(metrics.totalCUP, "CUP")}
                            </Text>
                          </View>

                          <View style={styles.kpiDivider} />

                          <View style={styles.kpiItem}>
                            <Text style={styles.kpiLabel}>Total Cobrado</Text>
                            <Text style={[styles.kpiValue, { color: "#38bdf8" }]}>
                              {formatMoney(metrics.totalCobradoUSD, "USD")}
                            </Text>
                          </View>

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

                      {/* SEARCH & FILTERS PANEL - Identical to VentasList */}
                      <Surface
                        style={[
                          styles.tableCard,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          styles.searchPanel,
                          { backgroundColor: panelBg, borderColor: borderCol },
                        ]}
                        elevation={1}
                      >
                        <DataTable>
                          <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.headerBg }]}>
                            <DataTable.Title style={{ flex: flexes.fecha }}>
                              <Text style={[styles.thText, { color: colors.muted }]}>Fecha</Text>
                            </DataTable.Title>
                            {isWide ? (
                              <DataTable.Title style={{ flex: flexes.metodo }}>
                                <Text style={[styles.thText, { color: colors.muted }]}>Método</Text>
                              </DataTable.Title>
                            ) : null}
                            <DataTable.Title style={[styles.statusCell, { flex: flexes.estado }]}>
                              <Text style={[styles.thText, { color: colors.muted }]}>Estado</Text>
                            </DataTable.Title>
                            <DataTable.Title numeric style={{ flex: flexes.cobrado }}>
                              <Text style={[styles.thText, { color: colors.muted }]}>Cobrado</Text>
                            </DataTable.Title>
                            {isWide ? (
                              <DataTable.Title numeric style={{ flex: flexes.enviado }}>
                                <Text style={[styles.thText, { color: colors.muted }]}>Enviado</Text>
                              </DataTable.Title>
                            ) : null}
                            {isWide ? (
                              <DataTable.Title numeric style={{ flex: flexes.items }}>
                                <Text style={[styles.thText, { color: colors.muted }]}>Cant.</Text>
                              </DataTable.Title>
                            ) : null}
                            <DataTable.Title numeric style={{ flex: flexes.acc }}>
                              <Text style={[styles.thText, { color: colors.muted }]}>Ver</Text>
                            </DataTable.Title>
                          </DataTable.Header>
                          <View style={styles.searchRow}>
                            <IconButton
                              icon="magnify"
                              iconColor="#64748b"
                              size={20}
                              style={styles.searchIcon}
                            />
                            <TextInput
                              onChangeText={setSearchQuery}
                              placeholder="Buscar por beneficiario, tarjeta, dirección, ID..."
                              placeholderTextColor="#94a3b8"
                              style={[
                                styles.searchInput,
                                { color: theme.dark ? "#f8fafc" : "#0f172a" },
                              ]}
                              value={searchQuery}
                            />
                            {searchQuery ? (
                              <IconButton
                                icon="close"
                                iconColor="#64748b"
                                onPress={() => setSearchQuery("")}
                                size={18}
                              />
                            ) : null}
                            <IconButton
                              icon={showFilters ? "filter-minus-outline" : "filter-variant"}
                              iconColor={
                                showFilters || activeFiltersCount > 0
                                  ? theme.colors.primary
                                  : "#64748b"
                              }
                              onPress={() => {
                                safeHaptic();
                                setShowFilters((f) => !f);
                              }}
                              size={20}
                            />
                          </View>

                          {loading ? (
                            <DataTable.Row>
                              <DataTable.Cell style={styles.loadingCell}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.loadingCellText, { color: colors.muted }]}>
                                  Cargando remesas...
                                </Text>
                              </DataTable.Cell>
                            </DataTable.Row>
                          ) : ventas.length === 0 ? (
                            <DataTable.Row>
                              <DataTable.Cell style={styles.emptyCell}>
                                <Text style={[styles.emptyCellText, { color: colors.muted }]}>
                                  No hay ventas registradas
                                </Text>
                              </DataTable.Cell>
                            </DataTable.Row>
                          ) : (
                            ventas.map((row, index) => {
                              const estadoDerivado = deriveEstadoVenta(row);
                              const conf = estadoConfig(estadoDerivado, isDark);
                              {
                                showFilters ? (
                                  <View style={styles.expandedFilters}>
                                    <Divider style={styles.filtersDivider} />

                                    return (
                                    <DataTable.Row
                                      key={row?._id || index}
                                      style={[styles.tableRow, { borderBottomColor: colors.border }]}
                                      onPress={() => openDialog(row)}
                                      {/* Status filter */}
            <View style={styles.filterBlock}>
                                      <Text style={styles.filterBlockTitle}>Estado de entrega:</Text>
                                      <ScrollView
                                        contentContainerStyle={styles.filterChipGroup}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                      >
                                        {[
                                          { key: "TODOS", label: "Todas" },
                                          { key: "ENTREGADO", label: "Entregadas" },
                                          { key: "PENDIENTE_ENTREGA", label: "Pend. Entrega" },
                                          { key: "PENDIENTE_PAGO", label: "Pend. Pago" },
                                          { key: "CANCELADO", label: "Canceladas" },
                                        ].map((st) => (
                                          <Chip
                                            key={st.key}
                                            onPress={() => {
                                              safeHaptic();
                                              setSelectedStatus(st.key);
                                            }}
                                            selected={selectedStatus === st.key}
                                            style={[
                                              styles.miniChip,
                                              selectedStatus === st.key ? styles.miniChipActive : null,
                                            ]}
                                            textStyle={
                                              selectedStatus === st.key
                                                ? styles.miniChipActiveText
                                                : null
                                            }
                                          >
                                            {st.label}
                                          </Chip>
                                        ))}
                                      </ScrollView>
                                    </View>

                                    {/* Evidence filter */}
                                    <View style={styles.filterBlock}>
                                      <Text style={styles.filterBlockTitle}>
                                        Comprobantes / Evidencias:
                                      </Text>
                                      <ScrollView
                                        contentContainerStyle={styles.filterChipGroup}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                      >
                                        {[
                                          { key: "TODOS", label: "Todas" },
                                          { key: "CON_EVIDENCIA", label: "Con comprobante" },
                                          { key: "PENDIENTE_REVISION", label: "En revisión" },
                                          { key: "APROBADA", label: "Aprobadas" },
                                          { key: "SIN_EVIDENCIA", label: "Sin comprobante" },
                                        ].map((ev) => (
                                          <Chip
                                            key={ev.key}
                                            onPress={() => {
                                              safeHaptic();
                                              setSelectedEvidenceFilter(ev.key);
                                            }}
                                            selected={selectedEvidenceFilter === ev.key}
                                            style={[
                                              styles.miniChip,
                                              selectedEvidenceFilter === ev.key
                                                ? styles.miniChipActive
                                                : null,
                                            ]}
                                            textStyle={
                                              selectedEvidenceFilter === ev.key
                                                ? styles.miniChipActiveText
                                                : null
                                            }
                                          >
                                            {ev.label}
                                          </Chip>
                                        ))}
                                      </ScrollView>
                                    </View>

                                    {/* Payment method filter */}
                                    <View style={styles.filterBlock}>
                                      <Text style={styles.filterBlockTitle}>Método de pago:</Text>
                                      <ScrollView
                                        contentContainerStyle={styles.filterChipGroup}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                      >
                                        {paymentMethods.map((pm) => (
                                          <Chip
                                            key={pm}
                                            onPress={() => {
                                              safeHaptic();
                                              setSelectedPaymentMethod(pm);
                                            }}
                                            selected={selectedPaymentMethod === pm}
                                            style={[
                                              styles.miniChip,
                                              selectedPaymentMethod === pm
                                                ? styles.miniChipActive
                                                : null,
                                            ]}
                                            textStyle={
                                              selectedPaymentMethod === pm
                                                ? styles.miniChipActiveText
                                                : null
                                            }
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
                                            onPress={() => {
                                              safeHaptic();
                                              setFetchLimit(lim);
                                            }}
                                            selected={fetchLimit === lim}
                                            style={[
                                              styles.limitChip,
                                              fetchLimit === lim ? styles.miniChipActive : null,
                                            ]}
                                            textStyle={
                                              fetchLimit === lim ? styles.miniChipActiveText : null
                                            }
                                          >
                                            {lim}
                                          </Chip>
                                        ))}
                                      </View>

                                      {activeFiltersCount > 0 ? (
                                        <Button
                                          icon="filter-remove"
                                          mode="text"
                                          onPress={handleClearFilters}
                                        >
                                          <DataTable.Cell style={{ flex: flexes.fecha }}>
                                            <Text style={[styles.cellText, { color: colors.text }]}>
                                              {formatFechaCorta(row?.createdAt)}
                                            </Text>
                                          </DataTable.Cell>
                                          {`Limpiar filtros (${activeFiltersCount})`}
                                        </Button>
                                      ) : null}
                                    </View>
                                  </View>
                                ) : activeFiltersCount > 0 ? (
                                  <View style={styles.activeFiltersIndicatorRow}>
                                    <Chip
                                      compact
                                      icon="filter"
                                      style={styles.activeFiltersChip}
                                      textStyle={styles.activeFiltersChipText}
                                    >
                                      {`${activeFiltersCount} filtro${activeFiltersCount > 1 ? "s" : ""} aplicado${activeFiltersCount > 1 ? "s" : ""}`}
                                    </Chip>
                                    <Button compact mode="text" onPress={handleClearFilters}>
                                      Limpiar
                                    </Button>
                                  </View>
                                ) : null
                              }
      </Surface>

                      {isWide ? (
                        <DataTable.Cell style={{ flex: flexes.metodo }}>
                          <Text style={[styles.cellText, { color: colors.muted }]}>
                            {row?.metodoPago || "-"}
                            {/* RESULTS HEADER */}
                            <View style={styles.resultsHeaderRow}>
                              <Text style={styles.resultsCountText}>
                                {`Mostrando ${filteredRemesas.length} remesa${filteredRemesas.length !== 1 ? "s" : ""}`}
                              </Text>
                              <View style={styles.viewModeToggle}>
                                <Button
                                  compact
                                  icon="view-grid-outline"
                                  mode={viewMode === "cards" ? "contained" : "text"}
                                  onPress={() => {
                                    safeHaptic();
                                    setViewMode("cards");
                                  }}
                                  style={styles.modeBtn}
                                >
                                  Tarjetas
                                </Button>
                                <Button
                                  compact
                                  icon="table-large"
                                  mode={viewMode === "table" ? "contained" : "text"}
                                  onPress={() => {
                                    safeHaptic();
                                    setViewMode("table");
                                  }}
                                  style={styles.modeBtn}
                                >
                                  Tabla
                                </Button>
                              </View>
                            </View>

                            {/* EMPTY STATE */}
                            {!ready ? (
                              <Surface
                                style={[
                                  styles.emptyCard,
                                  { backgroundColor: panelBg, borderColor: borderCol },
                                ]}
                              >
                                <ActivityIndicator color={theme.colors.primary} size="large" />
                                <Text style={styles.loadingText}>Cargando tus remesas...</Text>
                              </Surface>
                            ) : filteredRemesas.length === 0 ? (
                              <Surface
                                style={[
                                  styles.emptyCard,
                                  { backgroundColor: panelBg, borderColor: borderCol },
                                ]}
                              >
                                <IconButton
                                  icon="cash-fast"
                                  iconColor={theme.colors.primary}
                                  size={44}
                                />
                                <Text style={styles.emptyTitle}>No se encontraron remesas</Text>
                                <Text style={styles.emptySubtitle}>
                                  {activeFiltersCount > 0
                                    ? "No hay resultados para los filtros seleccionados. Prueba a limpiarlos."
                                    : "Aún no tienes envíos de remesas registrados."}
                                </Text>
                                {activeFiltersCount > 0 ? (
                                  <Button
                                    icon="filter-remove"
                                    mode="outlined"
                                    onPress={handleClearFilters}
                                    style={styles.emptyBtn}
                                  >
                                    Limpiar filtros
                                  </Button>
                                ) : onNewRemesaPress ? (
                                  <Button
                                    icon="send"
                                    mode="contained"
                                    onPress={() => {
                                      safeHaptic();
                                      onNewRemesaPress();
                                    }}
                                    style={styles.emptyBtn}
                                  >
                                    Enviar mi primera remesa
                                  </Button>
                                ) : null}
                              </Surface>
                            ) : viewMode === "table" ? (
                              /* TABLE VIEW (DataTable) */
                              <Surface
                                style={[
                                  styles.tableContainer,
                                  { backgroundColor: panelBg, borderColor: borderCol },
                                ]}
                              >
                                <ScrollView horizontal showsHorizontalScrollIndicator>
                                  <DataTable style={{ minWidth: 880 }}>
                                    <DataTable.Header>
                                      <DataTable.Title style={{ width: 90 }}>Fecha</DataTable.Title>
                                      <DataTable.Title style={{ width: 180 }}>
                                        Destinatario
                                      </DataTable.Title>
                                      <DataTable.Title numeric style={{ width: 140 }}>
                                        A Entregar
                                      </DataTable.Title>
                                      <DataTable.Title numeric style={{ width: 110 }}>
                                        Cobrado
                                      </DataTable.Title>
                                      <DataTable.Title style={{ width: 110 }}>Método</DataTable.Title>
                                      <DataTable.Title style={{ width: 130 }}>Estado</DataTable.Title>
                                      <DataTable.Title style={{ width: 130 }}>
                                        Comprobante
                                      </DataTable.Title>
                                      <DataTable.Title numeric style={{ width: 60 }}>
                                        Ver
                                      </DataTable.Title>
                                    </DataTable.Header>

                                    {visibleRemesas.map((sale) => {
                                      const stMeta = getStatusMeta(sale.statusDerived, theme.dark);
                                      const evMeta = getEvidenceMeta(sale.evidence, sale, theme.dark);
                                      const firstBen = sale.beneficiarios[0];

                                      return (
                                        <DataTable.Row
                                          key={sale._id}
                                          onPress={() => handleOpenDetail(sale)}
                                          style={styles.tableRow}
                                        >
                                          <DataTable.Cell style={{ width: 90 }}>
                                            <Text style={styles.tableCellDate}>
                                              {formatDateShort(sale.createdAt)}
                                            </Text>
                                          </DataTable.Cell>
                  ) : null}

                                          <DataTable.Cell style={[styles.statusCell, { flex: flexes.estado }]}>
                                            <View
                                              style={[
                                                styles.statusBadge,
                                                { backgroundColor: conf.bg, borderColor: conf.border },
                                              ]}
                                            >
                                              <Text
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.8}
                                                style={[styles.statusBadgeText, { color: conf.color }]}
                                              >
                                                {conf.label}
                                                <DataTable.Cell style={{ width: 180 }}>
                                                  <View style={styles.tableUserCol}>
                                                    <Text numberOfLines={1} style={styles.tableUsername}>
                                                      {firstBen?.nombre || "Sin destinatario"}
                                                    </Text>
                                                    {sale.beneficiarios.length > 1 ? (
                                                      <Text style={styles.extraBeneficiaryBadge}>
                                                        {`+${sale.beneficiarios.length - 1} más`}
                                                      </Text>
                                                    ) : null}
                                                  </View>
                                                </DataTable.Cell>

                                                <DataTable.Cell numeric style={{ width: 140 }}>
                                                  <Text style={styles.tableCupText}>
                                                    {formatMoney(sale.totalCUP, "CUP")}
                                                  </Text>
                                                </View>
                                              </DataTable.Cell>
                                          </DataTable.Cell>

                                          <DataTable.Cell numeric style={{ flex: flexes.cobrado }}>
                                            <Text style={[styles.cellTextBold, { color: colors.text }]}>
                                              {money(row?.cobrado, row?.monedaCobrado)}
                                            </Text>
                                          </DataTable.Cell>
                                          <DataTable.Cell numeric style={{ width: 110 }}>
                                            <Text style={styles.tableAmountText}>
                                              {formatMoney(sale.precio, sale.moneda)}
                                            </Text>
                                          </DataTable.Cell>

                                          {isWide ? (
                                            <DataTable.Cell numeric style={{ flex: flexes.enviado }}>
                                              <Text style={[styles.cellText, { color: colors.muted }]}>
                                                {money(row?.precioOficial, "USD")}
                                                <DataTable.Cell style={{ width: 110 }}>
                                                  <Text numberOfLines={1} style={styles.tableMethodText}>
                                                    {sale.metodoPago}
                                                  </Text>
                                                </DataTable.Cell>
                  ) : null}

                                                {isWide ? (
                                                  <DataTable.Cell numeric style={{ flex: flexes.items }}>
                                                    <Chip compact style={{ backgroundColor: colors.chipBg }}>
                                                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "600" }}>
                                                        {getItemsCount(row)}
                                                        <DataTable.Cell style={{ width: 130 }}>
                                                          <View
                                                            style={[
                                                              styles.tableStatusBadge,
                                                              {
                                                                backgroundColor: stMeta.backgroundColor,
                                                                borderColor: stMeta.borderColor,
                                                              },
                                                            ]}
                                                          >
                                                            <View
                                                              style={[
                                                                styles.statusDot,
                                                                { backgroundColor: stMeta.dotColor },
                                                              ]}
                                                            />
                                                            <Text
                                                              numberOfLines={1}
                                                              style={[
                                                                styles.tableStatusText,
                                                                { color: stMeta.textColor },
                                                              ]}
                                                            >
                                                              {stMeta.shortLabel}
                                                            </Text>
                                                          </View>
                                                        </DataTable.Cell>

                                                        <DataTable.Cell style={{ width: 130 }}>
                                                          <Chip
                                                            compact
                                                            icon={evMeta.icon}
                                                            style={[
                                                              styles.tableEvidenceChip,
                                                              {
                                                                backgroundColor: evMeta.backgroundColor,
                                                                borderColor: evMeta.borderColor,
                                                              },
                                                            ]}
                                                            textStyle={[
                                                              styles.tableEvidenceChipText,
                                                              { color: evMeta.textColor },
                                                            ]}
                                                          >
                                                            {evMeta.label}
                                                          </Chip>
                                                        </DataTable.Cell>
                  ) : null}

                                                        <DataTable.Cell numeric style={{ flex: flexes.acc }}>
                                                          <IconButton
                                                            icon="chevron-right"
                                                            size={18}
                                                            iconColor={colors.primary}
                                                            style={styles.zeroMargin}
                                                            onPress={() => openDialog(row)}
                                                          />
                                                        </DataTable.Cell>
                                                      </DataTable.Row>
                                                      );
            })
          )}
                                                    </DataTable>
                                                  </Surface>

      {/* Drawer con el detalle completo de la orden */}
                                                <DrawerBottom
                                                  contentAtTopRef={detailScrollAtTopRef}
                                                  open={visible}
                                                  onClose={closeDialog}
                                                  overlayOpacity={0.34}
                                                  title="Detalles de la Orden de Remesa"
                                                >
                                                  <ScrollView
                                                    alwaysBounceVertical={false}
                                                    bounces={false}
                                                    style={[styles.drawerScroll, { maxHeight: maxScrollHeight }]}
                                                    contentContainerStyle={styles.drawerScrollContent}
                                                    keyboardShouldPersistTaps="handled"
                                                    onScroll={(event) => {
                                                      detailScrollAtTopRef.current = event.nativeEvent.contentOffset.y <= 0.5;
                                                    }}
                                                    overScrollMode="never"
                                                    refreshControl={<RefreshControl refreshing={false} onRefresh={() => { }} />}
                                                    scrollEventThrottle={16}
                                                  >
                                                    {ventaSel ? (
                                                      <View style={styles.dialogContent}>
                                                        {/* Tarjeta con los datos generales de la venta */}
                                                        <Surface
                                                          style={[
                                                            styles.drawerHeroCard,
                                                            { backgroundColor: colors.card, borderColor: colors.border },
                                                          ]}
                                                          elevation={0}
                                                        >
                                                          <View style={styles.drawerHeroHeader}>
                                                            <View style={{ flex: 1 }}>
                                                              <Text style={[styles.drawerIdLabel, { color: colors.muted }]}>
                                                                ID DE VENTA
                                                              </Text>
                                                              <Pressable
                                                                onPress={() => copiarTexto(ventaSel._id, "ID de venta")}
                                                                style={styles.drawerIdPressable}
                                                              >
                                                                <Text style={[styles.drawerIdValue, { color: colors.text }]}>
                                                                  {ventaSel._id}
                                                                </Text>
                                                                <DataTable.Cell numeric style={{ width: 60 }}>
                                                                  <IconButton
                                                                    icon="content-copy"
                                                                    size={14}
                                                                    iconColor={colors.primary}
                                                                    icon="eye-outline"
                                                                    onPress={() => handleOpenDetail(sale)}
                                                                    size={18}
                                                                    style={styles.zeroMargin}
                                                                  />
                                                              </Pressable>
                                                            </View>
                                                            <Chip
                                                              compact
                                                              style={{
                                                                backgroundColor: estadoConfig(deriveEstadoVenta(ventaSel), isDark).bg,
                                                              }}
                                                              textStyle={{
                                                                color: estadoConfig(deriveEstadoVenta(ventaSel), isDark).color,
                                                                fontSize: 11,
                                                                fontWeight: "700",
                                                              }}
                                                            >
                                                              {estadoConfig(deriveEstadoVenta(ventaSel), isDark).label}
                                                            </Chip>
                                                          </View>
                                                        </DataTable.Cell>
                                                      </DataTable.Row>
                                                    );
              })}
                                                  </DataTable>
                                                </ScrollView>

                                                <Divider style={{ marginVertical: 10, backgroundColor: colors.border }} />
                                                <DataTable.Pagination
                                                  label={`${from + 1}-${to} de ${filteredRemesas.length}`}
                                                  numberOfItemsPerPage={itemsPerPage}
                                                  numberOfItemsPerPageList={OPTIONS_PER_PAGE}
                                                  numberOfPages={totalPages}
                                                  onItemsPerPageChange={(val) => {
                                                    setItemsPerPage(val);
                                                    setPage(0);
                                                  }}
                                                  onPageChange={setPage}
                                                  page={page}
                                                  selectPageDropdownLabel="Filas:"
                                                />
                                              </Surface>
                                              ) : (
                                              /* CARDS VIEW - Identical design to VentasList */
                                              <View style={styles.cardsContainer}>
                                                {visibleRemesas.map((sale) => {
                                                  const catMeta = CATEGORY_COLORS.REMESAS;
                                                  const stMeta = getStatusMeta(sale.statusDerived, theme.dark);
                                                  const evMeta = getEvidenceMeta(sale.evidence, sale, theme.dark);
                                                  const firstBen = sale.beneficiarios[0];

                                                  <View style={styles.drawerMetaGrid}>
                                                    <View style={styles.drawerMetaItem}>
                                                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                                                        📅 Fecha:
                                                      </Text>
                                                      <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                                                        {formatFechaCompleta(ventaSel.createdAt)}
                                                      </Text>
                                                    </View>
                                                    <View style={styles.drawerMetaItem}>
                                                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                                                        💳 Pago:
                                                      </Text>
                                                      <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                                                        {ventaSel.metodoPago || "-"}
                                                      </Text>
                                                    </View>
                                                    <View style={styles.drawerMetaItem}>
                                                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                                                        💰 Cobrado:
                                                      </Text>
                                                      <Text style={[styles.drawerMetaValBold, { color: colors.primary }]}>
                                                        {money(ventaSel.cobrado, ventaSel.monedaCobrado)}
                                                      </Text>
                                                    </View>
                                                    <View style={styles.drawerMetaItem}>
                                                      <Text style={[styles.drawerMetaKey, { color: colors.muted }]}>
                                                        💸 Enviado:
                                                      </Text>
                                                      <Text style={[styles.drawerMetaVal, { color: colors.text }]}>
                                                        {money(ventaSel.precioOficial, "USD")}
                                                      </Text>
                                                    </View>
                                                  </View>

                                                  {
                                                    ventaSel.comentario ? (
                                                      <View style={[styles.drawerCommentBox, { backgroundColor: colors.chipBg }]}>
                                                        <Text style={[styles.drawerCommentText, { color: colors.muted }]}>
                                                          📝 Nota de venta: {ventaSel.comentario}
                                                        </Text>
                                                      </View>
                                                    ) : null
                                                  }
              </Surface>

                                              <Text variant="titleMedium" style={[styles.drawerSubheading, { color: colors.text }]}>
                                                {`📦 Destinatarios incluidos (${getItemsArray(ventaSel).length})`}
                                              </Text>

                                              {getItemsArray(ventaSel).length === 0 ? (
            return (
                                              <Pressable
                                                key={sale._id}
                                                onPress={() => handleOpenDetail(sale)}
                                                style={styles.cardPressable}
                                              >
                                                <Surface
                                                  style={[
                                                    styles.drawerEmptyBox,
                                                    { backgroundColor: colors.warningBg, borderColor: colors.border },
                                                    styles.saleCard,
                                                    { backgroundColor: panelBg, borderColor: borderCol },
                                                  ]}
                                                  elevation={0}
                                                >
                                                  <Text style={{ color: colors.warning, textAlign: "center", fontSize: 13 }}>
                                                    ⚠️ No se encontraron detalles individuales para esta remesa.
                                                  </Text>
                                                </Surface>
                                                ) : (
                getItemsArray(ventaSel).map((item, index) => {
                  const isCompleted = item?.entregado === true;
                                                {/* Card Top Row */}
                                                <View style={styles.cardTopRow}>
                                                  <View style={styles.cardTypeWrap}>
                                                    <Chip
                                                      compact
                                                      icon={catMeta.icon}
                                                      style={[
                                                        styles.cardCatChip,
                                                        { backgroundColor: catMeta.bg },
                                                      ]}
                                                      textStyle={[
                                                        styles.cardCatChipText,
                                                        { color: catMeta.color },
                                                      ]}
                                                    >
                                                      {catMeta.label}
                                                    </Chip>
                                                    <Text style={styles.cardDateText}>
                                                      {formatDateShort(sale.createdAt)}
                                                    </Text>
                                                  </View>

                                                  return (
                                                  <Surface
                                                    key={item._id || index}
                    <View
                                                    style={[
                                                      styles.itemCard,
                                                      styles.cardStatusBadge,
                                                      {
                                                        backgroundColor: colors.card,
                                                        borderColor: isCompleted ? colors.success : colors.border,
                                                        backgroundColor: stMeta.backgroundColor,
                                                        borderColor: stMeta.borderColor,
                                                      },
                                                    ]}
                                                    elevation={0}
                                                  >
                                                    <View style={styles.itemHeader}>
                                                      <Text style={[styles.itemTitle, { color: colors.text }]}>
                                                        Destinatario #{index + 1}
                                                      </Text>
                                                      <Chip
                                                        compact
                                                        style={{
                                                          backgroundColor: isCompleted ? colors.successBg : colors.warningBg,
                                                        }}
                                                        textStyle={{
                                                          color: isCompleted ? colors.success : colors.warning,
                                                          fontSize: 10,
                                                          fontWeight: "700",
                                                        }}
                                                      >
                                                        {isCompleted ? "Entregado" : "Pendiente"}
                                                        <View
                                                          style={[
                                                            styles.statusDot,
                                                            { backgroundColor: stMeta.dotColor },
                                                          ]}
                                                        />
                                                        <Text
                                                          style={[
                                                            styles.cardStatusText,
                                                            { color: stMeta.textColor },
                                                          ]}
                                                        >
                                                          {stMeta.shortLabel}
                                                        </Text>
                                                    </View>
                                                  </View>

                                                  {/* Card Body - Beneficiarios details */}
                                                  <View style={styles.cardBody}>
                                                    <View style={styles.beneficiaryHeaderRow}>
                                                      <MaterialCommunityIcons
                                                        color={theme.colors.primary}
                                                        name="account-arrow-right-outline"
                                                        size={18}
                                                      />
                                                      <Text numberOfLines={1} style={styles.beneficiaryName}>
                                                        {firstBen?.nombre || "Sin destinatario"}
                                                      </Text>
                                                      {sale.beneficiarios.length > 1 ? (
                                                        <Chip compact style={styles.extraBeneficiaryChip}>
                                                          <Text style={styles.extraBeneficiaryChipText}>
                                                            {`+${sale.beneficiarios.length - 1} más`}
                                                          </Text>
                                                        </Chip>
                      </View>
                      ) : null}
                                                  </View>

                                                  <View style={styles.itemRow}>
                                                    <Text style={[styles.itemKey, { color: colors.muted }]}>Nombre:</Text>
                                                    <Text style={[styles.itemVal, { color: colors.text }]}>
                                                      {item?.nombre || "Sin especificar"}
                                                      <View style={styles.cupHighlightRow}>
                                                        <Text style={styles.cupHighlightLabel}>A entregar:</Text>
                                                        <Text style={styles.cupHighlightValue}>
                                                          {formatMoney(sale.totalCUP, "CUP")}
                                                        </Text>
                                                      </View>

                                                      {firstBen?.tarjetaCUP ? (
                                                        <View style={styles.destInfoRow}>
                                                          <MaterialCommunityIcons
                                                            color="#64748b"
                                                            name="credit-card-outline"
                                                            size={15}
                                                          />
                                                          <Text numberOfLines={1} style={styles.destInfoText}>
                                                            {`Tarjeta CUP: ${firstBen.tarjetaCUP}`}
                                                          </Text>
                                                          <IconButton
                                                            icon="content-copy"
                                                            iconColor={theme.colors.primary}
                                                            onPress={() =>
                                                              copiarTexto(firstBen.tarjetaCUP, "Tarjeta CUP")
                                                            }
                                                            size={14}
                                                            style={styles.zeroMargin}
                                                          />
                                                        </View>
                                                      ) : null}

                                                      <View style={styles.itemRow}>
                                                        <Text style={[styles.itemKey, { color: colors.muted }]}>A entregar:</Text>
                                                        <Text style={[styles.itemValBold, { color: colors.primary }]}>
                                                          {money(item?.recibirEnCuba, item?.monedaRecibirEnCuba || "CUP")}
                                                          {firstBen?.direccionCuba ? (
                                                            <View style={styles.destInfoRow}>
                                                              <MaterialCommunityIcons
                                                                color="#64748b"
                                                                name="map-marker-outline"
                                                                size={15}
                                                              />
                                                              <Text numberOfLines={1} style={styles.destInfoText}>
                                                                {firstBen.direccionCuba}
                                                              </Text>
                                                              <IconButton
                                                                icon="content-copy"
                                                                iconColor={theme.colors.primary}
                                                                onPress={() =>
                                                                  copiarTexto(firstBen.direccionCuba, "Dirección")
                                                                }
                                                                size={14}
                                                                style={styles.zeroMargin}
                                                              />
                                                            </View>
                                                          ) : null}

                                                          {item?.tarjetaCUP ? (
                                                            <View style={styles.itemRow}>
                                                              <Text style={[styles.itemKey, { color: colors.muted }]}>Tarjeta CUP:</Text>
                                                              <Pressable
                                                                onPress={() => copiarTexto(item.tarjetaCUP, "Tarjeta CUP")}
                                                                style={styles.copyInline}
                                                              >
                                                                <Text style={[styles.itemValMono, { color: colors.text }]}>
                                                                  {item.tarjetaCUP}
                                                                </Text>
                                                                <IconButton
                                                                  icon="content-copy"
                                                                  size={14}
                                                                  iconColor={colors.primary}
                                                                  style={styles.zeroMargin}
                                                                />
                                                              </Pressable>
                                                            </View>
                                                          ) : null}
                                                          {sale.comentario ? (
                                                            <Text numberOfLines={1} style={styles.cardCommentPreview}>
                                                              {`💬 ${sale.comentario}`}
                                                            </Text>
                                                          ) : null}
                                                      </View>

                                                      {item?.direccionCuba ? (
                                                        <View style={styles.itemRow}>
                                                          <Text style={[styles.itemKey, { color: colors.muted }]}>Dirección:</Text>
                                                          <Pressable
                                                            onPress={() => copiarTexto(item.direccionCuba, "Dirección")}
                                                            style={styles.copyInline}
                                                          >
                                                            <Text
                                                              style={[styles.itemVal, { color: colors.text, flex: 1 }]}
                                                              numberOfLines={2}
                                                            >
                                                              {item.direccionCuba}
                                                            </Text>
                                                            <IconButton
                                                              icon="content-copy"
                                                              size={14}
                                                              iconColor={colors.primary}
                                                              style={styles.zeroMargin}
                                                            />
                                                          </Pressable>
                                                        </View>
                                                      ) : null}
                                                      {/* Card Footer */}
                                                      <View style={styles.cardFooter}>
                                                        <View style={styles.cardPriceBlock}>
                                                          <Text style={styles.cardAmountText}>
                                                            {formatMoney(sale.precio, sale.moneda)}
                                                          </Text>
                                                          <Text style={styles.cardMethodText}>
                                                            {sale.metodoPago}
                                                          </Text>
                                                        </View>

                                                        {item?.comentario ? (
                                                          <View style={[styles.itemComment, { backgroundColor: colors.chipBg }]}>
                                                            <Text style={[styles.itemCommentText, { color: colors.muted }]}>
                                                              💬 {item.comentario}
                                                            </Text>
                                                          </View>
                                                        ) : null}
                                                      </Surface>
                                                      );
                })
              )}
                                                  </View>
                                                  ) : (
                                                  <Surface style={[styles.drawerEmptyBox, { backgroundColor: colors.chipBg }]}>
                                                    <Text style={{ color: colors.muted, textAlign: "center" }}>
                                                      Sin datos disponibles
                                                    </Text>
                                                  </Surface>
          )}
                                                </ScrollView>
                                              </DrawerBottom>
                                              <View style={styles.cardFooterActions}>
                                                <Chip
                                                  compact
                                                  icon={evMeta.icon}
                                                  style={[
                                                    styles.cardEvidenceChip,
                                                    {
                                                      backgroundColor: evMeta.backgroundColor,
                                                      borderColor: evMeta.borderColor,
                                                    },
                                                  ]}
                                                  textStyle={[
                                                    styles.cardEvidenceChipText,
                                                    { color: evMeta.textColor },
                                                  ]}
                                                >
                                                  {evMeta.label}
                                                </Chip>
                                                <IconButton
                                                  icon="chevron-right"
                                                  onPress={() => handleOpenDetail(sale)}
                                                  size={20}
                                                  style={styles.cardChevron}
                                                />
                                              </View>
                                            </View>
                </Surface>
              </Pressable>
                                  );
          })}

                                  {/* Pagination for Cards */}
                                  <Surface
                                    style={[
                                      styles.cardsPagination,
                                      { backgroundColor: panelBg, borderColor: borderCol },
                                    ]}
                                  >
                                    <DataTable.Pagination
                                      label={`${from + 1}-${to} de ${filteredRemesas.length}`}
                                      numberOfItemsPerPage={itemsPerPage}
                                      numberOfItemsPerPageList={OPTIONS_PER_PAGE}
                                      numberOfPages={totalPages}
                                      onItemsPerPageChange={(val) => {
                                        setItemsPerPage(val);
                                        setPage(0);
                                      }}
                                      onPageChange={setPage}
                                      page={page}
                                      selectPageDropdownLabel="Mostrar:"
                                    />
                                  </Surface>
                                </View>
      )}

                                {/* DETAIL & EVIDENCE MODAL (Reused directly from Ventas) */}
                                <VentaDetailModal
                                  evidence={selectedVenta?.evidence}
                                  isAdmin={isAdmin}
                                  isGeneralAdmin={isGeneralAdmin}
                                  isUser={isUser}
                                  onActionComplete={() => setRefreshKey((k) => k + 1)}
                                  onDismiss={handleCloseDetail}
                                  sale={selectedVenta}
                                  visible={detailModalVisible}
                                />

                                <Snackbar
                                  visible={snackbarVisible}
                                  duration={2000}
                                  onDismiss={() => setSnackbarVisible(false)}
                                  duration={2000}
                                  style={{ borderRadius: 10 }}
                                  visible={snackbarVisible}
                                >
                                  {snackbarMessage}
                                </Snackbar>
                              </View>
                            );
};

                            const styles = StyleSheet.create({
                              cellText: {
                              fontSize: 12,
                            activeFiltersChip: {
                              backgroundColor: "#10b981",
                            borderRadius: 8,
  },
                            cellTextBold: {
                              fontSize: 12,
                            activeFiltersChipText: {
                              color: "#ffffff",
                            fontSize: 11,
                            fontWeight: "700",
  },
                            container: {
                              paddingBottom: 24,
                            activeFiltersIndicatorRow: {
                              alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginTop: 8,
                            paddingTop: 8,
  },
                            copyInline: {
                              beneficiaryHeaderRow: {
                              alignItems: "center",
                            flex: 1,
                            flexDirection: "row",
                            justifyContent: "flex-end",
                            gap: 6,
  },
                            dialogContent: {
                              paddingHorizontal: 16,
                            paddingVertical: 12,
                            beneficiaryName: {
                              fontSize: 14,
                            fontWeight: "800",
  },
                            drawerCommentBox: {
                              cardAmountText: {
                              fontSize: 16,
                            fontWeight: "800",
  },
                            cardBody: {
                              gap: 6,
  },
                            cardCatChip: {
                              borderRadius: 8,
                            marginTop: 8,
                            padding: 8,
  },
                            drawerCommentText: {
                              cardCatChipText: {
                              fontSize: 11,
                            fontWeight: "700",
  },
                            cardChevron: {
                              margin: -4,
  },
                            cardCommentPreview: {
                              fontSize: 12,
                            fontStyle: "italic",
                            opacity: 0.7,
  },
                            drawerEmptyBox: {
                              borderRadius: 12,
                            marginVertical: 12,
                            padding: 16,
                            cardDateText: {
                              fontSize: 12,
                            opacity: 0.6,
  },
                            drawerHeroCard: {
                              borderRadius: 14,
                            cardEvidenceChip: {
                              borderRadius: 8,
                            borderWidth: 1,
                            marginBottom: 16,
                            padding: 14,
  },
                            drawerHeroHeader: {
                              cardEvidenceChipText: {
                              fontSize: 10,
                            fontWeight: "700",
  },
                            cardFooter: {
                              alignItems: "center",
                            borderTopColor: "rgba(148, 163, 184, 0.12)",
                            borderTopWidth: 1,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingTop: 10,
  },
                            drawerIdLabel: {
                              fontSize: 10,
                            fontWeight: "700",
                            letterSpacing: 0.5,
                            cardFooterActions: {
                              alignItems: "center",
                            flexDirection: "row",
                            gap: 6,
  },
                            drawerIdPressable: {
                              cardMethodText: {
                              fontSize: 11,
                            opacity: 0.6,
                            textTransform: "uppercase",
  },
                            cardPressable: {
                              borderRadius: 20,
  },
                            cardPriceBlock: {
                              gap: 2,
  },
                            cardsContainer: {
                              gap: 12,
  },
                            cardsPagination: {
                              borderRadius: 16,
                            borderWidth: 1,
                            elevation: 2,
                            overflow: "hidden",
  },
                            cardStatusBadge: {
                              alignItems: "center",
                            borderRadius: 8,
                            borderWidth: 1,
                            flexDirection: "row",
                            gap: 4,
                            gap: 5,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
  },
                            drawerIdValue: {
                              fontSize: 13,
                            cardStatusText: {
                              fontSize: 11,
                            fontWeight: "700",
  },
                            drawerMetaGrid: {
                              gap: 6,
  },
                            drawerMetaItem: {
                              cardTopRow: {
                              alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "space-between",
  },
                            drawerMetaKey: {
                              fontSize: 12,
                            container: {
                              gap: 14,
  },
                            drawerMetaVal: {
                              cupHighlightLabel: {
                              fontSize: 12,
                            fontWeight: "600",
                            opacity: 0.65,
  },
                            drawerMetaValBold: {
                              cupHighlightRow: {
                              alignItems: "center",
                            flexDirection: "row",
                            gap: 8,
  },
                            cupHighlightValue: {
                              color: "#10b981",
                            fontSize: 15,
                            fontWeight: "900",
  },
                            destInfoRow: {
                              alignItems: "center",
                            flexDirection: "row",
                            gap: 4,
  },
                            destInfoText: {
                              flex: 1,
                            fontSize: 12,
                            opacity: 0.8,
  },
                            emptyBtn: {
                              marginTop: 8,
  },
                            emptyCard: {
                              alignItems: "center",
                            borderRadius: 20,
                            borderWidth: 1,
                            gap: 8,
                            justifyContent: "center",
                            padding: 32,
  },
                            emptySubtitle: {
                              fontSize: 13,
                            opacity: 0.65,
                            textAlign: "center",
  },
                            emptyTitle: {
                              fontSize: 17,
                            fontWeight: "700",
                            opacity: 0.85,
  },
                            expandedFilters: {
                              gap: 12,
                            marginTop: 8,
  },
                            extraBeneficiaryBadge: {
                              color: "#10b981",
                            fontSize: 10,
                            fontWeight: "800",
  },
                            drawerScroll: {
                              width: "100%",
                            extraBeneficiaryChip: {
                              backgroundColor: "rgba(16, 185, 129, 0.14)",
                            borderRadius: 6,
                            height: 22,
  },
                            drawerScrollContent: {
                              paddingBottom: 24,
                            extraBeneficiaryChipText: {
                              color: "#10b981",
                            fontSize: 10,
                            fontWeight: "800",
  },
                            drawerSubheading: {
                              fontSize: 14,
                            filterBlock: {
                              gap: 6,
  },
                            filterBlockTitle: {
                              fontSize: 12,
                            fontWeight: "700",
                            marginBottom: 10,
                            opacity: 0.7,
                            textTransform: "uppercase",
  },
                            emptyCell: {
                              justifyContent: "center",
                            paddingVertical: 20,
                            filterChipGroup: {
                              flexDirection: "row",
                            gap: 8,
  },
                            emptyCellText: {
                              fontSize: 13,
                            filterFooter: {
                              alignItems: "center",
                            flexDirection: "row",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            marginTop: 4,
  },
                            itemCard: {
                              borderRadius: 12,
                            filtersDivider: {
                              opacity: 0.15,
  },
                            kpiContainer: {
                              borderRadius: 20,
                            borderWidth: 1,
                            marginBottom: 8,
                            padding: 12,
                            elevation: 2,
                            overflow: "hidden",
  },
                            itemComment: {
                              borderRadius: 6,
                            marginTop: 6,
                            padding: 6,
                            kpiDivider: {
                              backgroundColor: "rgba(148, 163, 184, 0.2)",
                            height: 32,
                            marginHorizontal: 14,
                            width: 1,
  },
                            itemCommentText: {
                              kpiItem: {
                              alignItems: "flex-start",
                            gap: 2,
                            minWidth: 110,
  },
                            kpiLabel: {
                              fontSize: 11,
                            fontStyle: "italic",
                            fontWeight: "600",
                            opacity: 0.65,
                            textTransform: "uppercase",
  },
                            itemHeader: {
                              kpiScroll: {
                              alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
  },
                            itemKey: {
                              fontSize: 12,
                            kpiValue: {
                              fontSize: 17,
                            fontWeight: "800",
  },
                            itemRow: {
                              limitBlock: {
                              alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 4,
                            gap: 6,
  },
                            itemTitle: {
                              fontSize: 13,
                            fontWeight: "700",
                            limitChip: {
                              borderRadius: 8,
  },
                            itemVal: {
                              fontSize: 12,
                            loadingText: {
                              fontSize: 14,
                            fontWeight: "600",
                            textAlign: "right",
                            opacity: 0.7,
  },
                            itemValBold: {
                              fontSize: 13,
                            fontWeight: "800",
                            textAlign: "right",
                            miniChip: {
                              borderRadius: 8,
  },
                            itemValMono: {
                              fontSize: 12,
                            miniChipActive: {
                              backgroundColor: "#10b981",
  },
                            miniChipActiveText: {
                              color: "#ffffff",
                            fontWeight: "700",
                            letterSpacing: 0.5,
  },
                            loadingCell: {
                              modeBtn: {
                              borderRadius: 10,
  },
                            resultsCountText: {
                              fontSize: 13,
                            fontWeight: "700",
                            opacity: 0.75,
  },
                            resultsHeaderRow: {
                              alignItems: "center",
                            flexDirection: "row",
                            gap: 8,
                            justifyContent: "center",
                            paddingVertical: 18,
                            justifyContent: "space-between",
                            paddingHorizontal: 4,
  },
                            loadingCellText: {
                              fontSize: 12,
                            saleCard: {
                              borderRadius: 20,
                            borderWidth: 1,
                            elevation: 2,
                            gap: 10,
                            padding: 14,
  },
                            sectionHeader: {
                              marginBottom: 10,
                            marginHorizontal: 16,
                            searchInput: {
                              flex: 1,
                            fontSize: 14,
                            paddingVertical: 4,
  },
                            sectionSubtitle: {
                              fontSize: 12,
                            marginTop: 2,
                            searchIcon: {
                              margin: 0,
                            marginRight: 4,
  },
                            sectionTitle: {
                              fontSize: 15,
                            fontWeight: "700",
                            searchPanel: {
                              borderRadius: 20,
                            borderWidth: 1,
                            elevation: 2,
                            padding: 12,
  },
                            sectionTitleRow: {
                              searchRow: {
                              alignItems: "center",
                            flexDirection: "row",
                            gap: 8,
  },
                            statusBadge: {
                              alignItems: "center",
                            borderRadius: 6,
                            statusDot: {
                              borderRadius: 3,
                            height: 6,
                            width: 6,
  },
                            tableAmountText: {
                              fontSize: 13,
                            fontWeight: "800",
  },
                            tableCellDate: {
                              fontSize: 12,
                            fontWeight: "600",
                            opacity: 0.75,
  },
                            tableContainer: {
                              borderRadius: 20,
                            borderWidth: 1,
                            justifyContent: "center",
                            maxWidth: "100%",
                            minWidth: 64,
                            paddingHorizontal: 7,
                            paddingVertical: 4,
                            elevation: 2,
                            overflow: "hidden",
  },
                            statusCell: {
                              minWidth: 82,
                            tableCupText: {
                              color: "#10b981",
                            fontSize: 13,
                            fontWeight: "800",
  },
                            statusBadgeText: {
                              tableEvidenceChip: {
                              borderRadius: 8,
                            borderWidth: 1,
  },
                            tableEvidenceChipText: {
                              fontSize: 10,
                            fontWeight: "700",
                            includeFontPadding: false,
                            textAlign: "center",
  },
                            tableCard: {
                              borderRadius: 16,
                            borderWidth: 1,
                            marginHorizontal: 16,
                            overflow: "hidden",
                            tableMethodText: {
                              fontSize: 11,
                            fontWeight: "600",
                            opacity: 0.7,
  },
                            tableHeader: {
                              borderBottomWidth: StyleSheet.hairlineWidth,
  },
                            tableRow: {
                              borderBottomWidth: StyleSheet.hairlineWidth,
                            borderColor: "rgba(148, 163, 184, 0.15)",
  },
                            thText: {
                              tableStatusBadge: {
                              alignItems: "center",
                            borderRadius: 8,
                            borderWidth: 1,
                            flexDirection: "row",
                            gap: 5,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
  },
                            tableStatusText: {
                              fontSize: 11,
                            fontWeight: "700",
                            textTransform: "uppercase",
  },
                            tableUserCol: {
                              gap: 2,
  },
                            tableUsername: {
                              fontSize: 12,
                            fontWeight: "700",
  },
                            viewModeToggle: {
                              backgroundColor: "rgba(148, 163, 184, 0.15)",
                            borderRadius: 12,
                            flexDirection: "row",
                            overflow: "hidden",
                            padding: 2,
  },
                            zeroMargin: {
                              margin: 0,
                            padding: 0,
  },
});

                            export default TableListRemesa;
