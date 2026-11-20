import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import * as Haptics from "expo-haptics";
import moment from "moment";
import "moment/locale/es";
import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import ChartSkeleton from "./ChartSkeleton";
import CustomSegmentedButtons from "./CustomSegmentedButtons";
import InteractiveChart from "./InteractiveChart";
import KPICard from "./KPICard";
import { chartStyles, dashboardStyles } from "./styles/dashboardStyles";

moment.locale("es");

/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */
const Meteor = MeteorBase;
const AUTHORIZED_ANALYTICS_USERNAME = "carlosmbinf";

const safeHaptic = () => {
  try {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  } catch (_) {}
};

const RECHARGE_ANALYTICS_FIELDS = {
  _id: 1,
  cobrado: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  "producto.carritos.cantidad": 1,
  "producto.carritos.producto.prices.retail.amount": 1,
  "producto.carritos.producto.prices.wholesale.amount": 1,
  "producto.carritos.producto.promotions": 1,
  "producto.carritos.type": 1,
};

const isAuthorizedAnalyticsUser = (username) =>
  typeof username === "string" &&
  username.trim().toLowerCase() === AUTHORIZED_ANALYTICS_USERNAME;

const formatUsd = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatNativeCurrency = (value, currency) => {
  const numericValue = Number(value || 0);

  try {
    return new Intl.NumberFormat("es-UY", {
      currency: currency || "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(numericValue);
  } catch (_error) {
    return `${currency || "USD"} ${numericValue.toFixed(2)}`;
  }
};

const roundMetric = (value) => Number(Number(value || 0).toFixed(2));

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getRechargeItemsFromVenta = (venta) => {
  const carritos = Array.isArray(venta?.producto?.carritos)
    ? venta.producto.carritos.filter((carrito) => carrito?.type === "RECARGA")
    : [];
  if (carritos.length === 0) {
    return [];
  }

  return carritos.map((carrito) => {
    const quantity = toNumber(carrito?.cantidad, 1);
    const chargedUsd =
      toNumber(carrito?.producto?.prices?.retail?.amount, 0) * quantity;
    const costUsd =
      toNumber(carrito?.producto?.prices?.wholesale?.amount, 0) * quantity;
    const profitUsd = chargedUsd - costUsd;

    return {
      chargedUsd,
      costUsd,
      createdAt: venta?.createdAt || null,
      hasPromotion: Array.isArray(carrito?.producto?.promotions)
        ? carrito.producto.promotions.length > 0
        : false,
      isCobrado: Boolean(venta?.isCobrado),
      paymentMethod: venta?.metodoPago || "SIN_METODO",
      profitUsd,
      state: venta?.estado || "SIN_ESTADO",
      ventaId: venta?._id,
    };
  });
};

const buildAnalytics = (ventasRecharge) => {
  const rechargeItems = ventasRecharge.flatMap(getRechargeItemsFromVenta);
  const currencyMap = new Map();
  const paymentMethodMap = new Map();

  const summaryAccumulator = rechargeItems.reduce(
    (accumulator, item) => {
      accumulator.chargedUsd += item.chargedUsd;
      accumulator.costUsd += item.costUsd;
      accumulator.deliveredCount += item.state === "ENTREGADO" ? 1 : 0;
      accumulator.orderIds.add(item.ventaId);
      accumulator.paidCount += item.isCobrado ? 1 : 0;
      accumulator.profitUsd += item.profitUsd;
      accumulator.promotionCount += item.hasPromotion ? 1 : 0;
      accumulator.rechargeCount += 1;
      return accumulator;
    },
    {
      chargedUsd: 0,
      costUsd: 0,
      deliveredCount: 0,
      orderIds: new Set(),
      paidCount: 0,
      profitUsd: 0,
      promotionCount: 0,
      rechargeCount: 0,
    },
  );

  const monthlyMap = new Map();

  ventasRecharge.forEach((venta) => {
    const chargedCurrency = venta?.monedaCobrado || "SIN_MONEDA";
    const chargedNativeAmount = toNumber(venta?.cobrado, 0);
    const paymentMethod = venta?.metodoPago || "SIN_METODO";

    const currencyEntry = currencyMap.get(chargedCurrency) || {
      amount: 0,
      currency: chargedCurrency,
      orderCount: 0,
    };

    currencyEntry.amount += chargedNativeAmount;
    currencyEntry.orderCount += 1;
    currencyMap.set(chargedCurrency, currencyEntry);

    const paymentEntry = paymentMethodMap.get(paymentMethod) || {
      amount: 0,
      orderCount: 0,
      paymentMethod,
    };

    paymentEntry.amount += chargedNativeAmount;
    paymentEntry.orderCount += 1;
    paymentMethodMap.set(paymentMethod, paymentEntry);
  });

  rechargeItems.forEach((item) => {
    const monthKey = item.createdAt
      ? moment(item.createdAt).format("YYYY-MM")
      : "SIN_FECHA";

    const monthlyEntry = monthlyMap.get(monthKey) || {
      chargedUsd: 0,
      costUsd: 0,
      deliveredCount: 0,
      paidCount: 0,
      period: monthKey,
      profitUsd: 0,
      rechargeCount: 0,
    };

    monthlyEntry.chargedUsd += item.chargedUsd;
    monthlyEntry.costUsd += item.costUsd;
    monthlyEntry.deliveredCount += item.state === "ENTREGADO" ? 1 : 0;
    monthlyEntry.paidCount += item.isCobrado ? 1 : 0;
    monthlyEntry.profitUsd += item.profitUsd;
    monthlyEntry.rechargeCount += 1;
    monthlyMap.set(monthKey, monthlyEntry);
  });

  const chargedUsd = roundMetric(summaryAccumulator.chargedUsd);
  const costUsd = roundMetric(summaryAccumulator.costUsd);
  const profitUsd = roundMetric(summaryAccumulator.profitUsd);
  const rechargeCount = Number(summaryAccumulator.rechargeCount || 0);

  const monthly = Array.from(monthlyMap.values())
    .map((item) => ({
      chargedUsd: roundMetric(item.chargedUsd),
      costUsd: roundMetric(item.costUsd),
      deliveredCount: Number(item.deliveredCount || 0),
      paidCount: Number(item.paidCount || 0),
      period: item.period,
      profitUsd: roundMetric(item.profitUsd),
      rechargeCount: Number(item.rechargeCount || 0),
    }))
    .filter((item) => item.period !== "SIN_FECHA")
    .sort((left, right) => left.period.localeCompare(right.period));

  const chargedByCurrency = Array.from(currencyMap.values())
    .map((item) => ({
      amount: roundMetric(item.amount),
      currency: item.currency,
      orderCount: Number(item.orderCount || 0),
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));

  const chargedByMethod = Array.from(paymentMethodMap.values())
    .map((item) => ({
      amount: roundMetric(item.amount),
      orderCount: Number(item.orderCount || 0),
      paymentMethod: item.paymentMethod,
    }))
    .sort((left, right) => right.orderCount - left.orderCount);

  return {
    chargedByCurrency,
    chargedByMethod,
    monthly,
    summary: {
      averageProfitUsd: roundMetric(
        rechargeCount > 0 ? profitUsd / rechargeCount : 0,
      ),
      averageTicketUsd: roundMetric(
        rechargeCount > 0 ? chargedUsd / rechargeCount : 0,
      ),
      chargedUsd,
      costUsd,
      deliveredCount: Number(summaryAccumulator.deliveredCount || 0),
      orderCount: summaryAccumulator.orderIds.size,
      paidCount: Number(summaryAccumulator.paidCount || 0),
      profitMarginPct: roundMetric(
        chargedUsd > 0 ? (profitUsd / chargedUsd) * 100 : 0,
      ),
      profitUsd,
      promotionCount: Number(summaryAccumulator.promotionCount || 0),
      rechargeCount,
    },
  };
};

const RechargeProfitCard = () => {
  const theme = useTheme();
  const dataReady = useDeferredScreenData();
  const [activeSubView, setActiveSubView] = React.useState("trend");
  const [selectedCurrency, setSelectedCurrency] = React.useState(null);
  const [selectedMethod, setSelectedMethod] = React.useState(null);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const { analytics, currentUser, loading } = Meteor.useTracker(() => {
    const currentUser = Meteor.user();
    const canViewAnalytics = isAuthorizedAnalyticsUser(currentUser?.username);

    if (!dataReady || !canViewAnalytics) {
      return {
        analytics: null,
        currentUser,
        loading: dataReady ? false : true,
      };
    }

    const selector = {
      isCancelada: false,
      "producto.carritos.type": "RECARGA",
    };

    const ventasHandle = Meteor.subscribe("ventasRecharge", selector, {
      fields: RECHARGE_ANALYTICS_FIELDS,
    });

    if (!ventasHandle.ready()) {
      return {
        analytics: null,
        currentUser,
        loading: true,
      };
    }

    const ventasRecharge = VentasRechargeCollection.find(selector, {
      fields: RECHARGE_ANALYTICS_FIELDS,
      sort: { createdAt: 1 },
    }).fetch();

    return {
      analytics: buildAnalytics(ventasRecharge),
      currentUser,
      loading: false,
    };
  }, [dataReady]);

  const canView = isAuthorizedAnalyticsUser(currentUser?.username);

  const summary = analytics?.summary || null;
  const chargedByCurrency = React.useMemo(
    () =>
      Array.isArray(analytics?.chargedByCurrency)
        ? analytics.chargedByCurrency
        : [],
    [analytics?.chargedByCurrency],
  );
  const chargedByMethod = React.useMemo(
    () =>
      Array.isArray(analytics?.chargedByMethod)
        ? analytics.chargedByMethod
        : [],
    [analytics?.chargedByMethod],
  );
  const monthly = React.useMemo(
    () => (Array.isArray(analytics?.monthly) ? analytics.monthly : []),
    [analytics?.monthly],
  );

  const cardBackground = theme.dark
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(255, 255, 255, 0.96)";

  const cardBorderColor = theme.dark
    ? "rgba(148, 163, 184, 0.16)"
    : "rgba(15, 23, 42, 0.08)";

  const monthlyLabels = monthly.map((item) =>
    moment(item.period, "YYYY-MM").format("MMM YY"),
  );

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) =>
      theme.dark
        ? `rgba(248, 250, 252, ${opacity})`
        : `rgba(15, 23, 42, ${opacity})`,
    decimalPlaces: 1,
    labelColor: (opacity = 1) =>
      theme.dark
        ? `rgba(226, 232, 240, ${opacity})`
        : `rgba(51, 65, 85, ${opacity})`,
    propsForBackgroundLines: {
      stroke: theme.dark
        ? "rgba(148, 163, 184, 0.12)"
        : "rgba(15, 23, 42, 0.08)",
      strokeDasharray: "",
    },
    propsForDots: {
      r: "4",
      stroke: theme.colors.primary,
      strokeWidth: "2",
    },
    style: { borderRadius: 18 },
  };

  const bestMonth = React.useMemo(() => {
    if (monthly.length === 0) {
      return null;
    }

    return monthly.reduce((best, item) =>
      !best || Number(item.profitUsd || 0) > Number(best.profitUsd || 0)
        ? item
        : best,
    );
  }, [monthly]);

  const handleSubViewChange = (newView) => {
    fadeAnim.setValue(0.7);
    setActiveSubView(newView);
    Animated.timing(fadeAnim, {
      duration: 200,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (!canView) {
    return null;
  }

  if (loading || !analytics) {
    return (
      <View style={dashboardStyles.section}>
        <Card
          style={[
            dashboardStyles.sourceCard,
            {
              backgroundColor: cardBackground,
              borderColor: cardBorderColor,
            },
          ]}
        >
          <Card.Content style={dashboardStyles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text
              style={[
                dashboardStyles.loadingText,
                { color: theme.colors.onSurface },
              ]}
            >
              Calculando balance financiero y rentabilidad...
            </Text>
            <ChartSkeleton />
          </Card.Content>
        </Card>
      </View>
    );
  }

  const subViewButtons = [
    { value: "trend", label: "Evolución", icon: "chart-line" },
    { value: "currencies", label: "Por Divisa", icon: "cash-multiple" },
    { value: "methods", label: "Canales de Pago", icon: "credit-card-outline" },
  ];

  return (
    <View style={dashboardStyles.section}>
      <View style={dashboardStyles.header}>
        <View style={dashboardStyles.headerTitleRow}>
          <View style={dashboardStyles.headerTitleBlock}>
            <Text
              style={[
                dashboardStyles.headerEyebrow,
                { color: theme.colors.primary },
              ]}
            >
              Rendimiento Comercial
            </Text>
            <Text
              style={[
                dashboardStyles.headerTitle,
                { color: theme.colors.onBackground },
              ]}
            >
              Rentabilidad Neta de Recargas
            </Text>
          </View>
          <Chip
            icon="currency-usd"
            style={{ backgroundColor: "#16a34a" }}
            textStyle={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}
          >
            Balance Real
          </Chip>
        </View>
        <Text
          style={[
            dashboardStyles.headerSubtitle,
            { color: theme.colors.onBackground },
          ]}
        >
          Monitoreo de ingresos brutos, costos operativos de saldo y utilidad
          neta consolidada por operaciones de recarga.
        </Text>
      </View>

      {summary ? (
        <>
          <View style={dashboardStyles.kpiContainer}>
            <KPICard
              color="#16a34a"
              icon="cash-plus"
              subtitle={`${summary.profitMarginPct.toFixed(1)}% margen neto`}
              title="Ganancia Neta"
              value={formatUsd(summary.profitUsd)}
            />
            <KPICard
              color="#0284c7"
              icon="currency-usd"
              subtitle={`Ticket prom. ${formatUsd(summary.averageTicketUsd)}`}
              title="Total Facturado"
              value={formatUsd(summary.chargedUsd)}
            />
          </View>

          <View style={dashboardStyles.kpiContainer}>
            <KPICard
              color="#f59e0b"
              icon="warehouse"
              subtitle="Costo adquisición saldo"
              title="Costo Proveedores"
              value={formatUsd(summary.costUsd)}
            />
            <KPICard
              color="#7c3aed"
              icon="cellphone-arrow-down"
              subtitle={`${summary.orderCount} compras • ${summary.promotionCount} promos`}
              title="Recargas Procesadas"
              value={summary.rechargeCount}
            />
          </View>

          <View style={dashboardStyles.segmentedContainer}>
            <CustomSegmentedButtons
              buttons={subViewButtons}
              onValueChange={handleSubViewChange}
              value={activeSubView}
            />
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {activeSubView === "trend" ? (
              <Card
                style={[
                  chartStyles.card,
                  {
                    backgroundColor: cardBackground,
                    borderColor: cardBorderColor,
                  },
                ]}
              >
                <Card.Content>
                  <InteractiveChart
                    badge={`${summary.profitMarginPct.toFixed(1)}% margen`}
                    chartConfig={{
                      ...chartConfig,
                      propsForDots: {
                        ...chartConfig.propsForDots,
                        stroke: "#16a34a",
                      },
                    }}
                    data={{
                      datasets: [
                        {
                          color: (opacity = 1) =>
                            `rgba(2, 132, 199, ${opacity})`,
                          data: monthly.map((item) => item.chargedUsd),
                          strokeWidth: 3,
                        },
                        {
                          color: (opacity = 1) =>
                            `rgba(22, 163, 74, ${opacity})`,
                          data: monthly.map((item) => item.profitUsd),
                          strokeWidth: 3,
                        },
                      ],
                      labels: monthlyLabels,
                      legend: ["Facturado USD", "Utilidad Neta USD"],
                    }}
                    emptyCopy="Aún no hay suficientes periodos mensuales registrados para trazar la curva de tendencia."
                    emptyTitle="Histórico en consolidación"
                    formatTooltipValue={(val) => formatUsd(val)}
                    height={230}
                    icon="chart-line-variant"
                    iconBg="#16a34a"
                    title="Tendencia Mensual de Utilidad"
                    yAxisLabel="$"
                  />

                  {monthly.length > 0 ? (
                    <View
                      style={[
                        chartStyles.insightBox,
                        {
                          backgroundColor: theme.dark
                            ? "rgba(15, 23, 42, 0.92)"
                            : "rgba(22, 163, 74, 0.06)",
                          borderColor: theme.dark
                            ? "rgba(148, 163, 184, 0.16)"
                            : "rgba(22, 163, 74, 0.18)",
                          marginTop: 14,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          chartStyles.insightTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Resumen Ejecutivo de Rendimiento
                      </Text>
                      <View style={chartStyles.insightRow}>
                        <Text
                          style={[
                            chartStyles.insightLabel,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Mes de mayor rendimiento
                        </Text>
                        <Text
                          style={[
                            chartStyles.insightValue,
                            { color: "#16a34a" },
                          ]}
                        >
                          {bestMonth
                            ? `${moment(bestMonth.period, "YYYY-MM").format("MMMM YYYY")}: ${formatUsd(bestMonth.profitUsd)}`
                            : "Sin datos"}
                        </Text>
                      </View>
                      <View style={chartStyles.insightRow}>
                        <Text
                          style={[
                            chartStyles.insightLabel,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Margen neto consolidado
                        </Text>
                        <Text
                          style={[
                            chartStyles.insightValue,
                            { color: "#0284c7" },
                          ]}
                        >
                          {summary.profitMarginPct.toFixed(2)}%
                        </Text>
                      </View>
                      <View style={chartStyles.insightRow}>
                        <Text
                          style={[
                            chartStyles.insightLabel,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Utilidad promedio por recarga
                        </Text>
                        <Text
                          style={[
                            chartStyles.insightValue,
                            { color: "#7c3aed" },
                          ]}
                        >
                          {formatUsd(summary.averageProfitUsd)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </Card.Content>
              </Card>
            ) : null}

            {activeSubView === "currencies" ? (
              <Card
                style={[
                  chartStyles.card,
                  {
                    backgroundColor: cardBackground,
                    borderColor: cardBorderColor,
                  },
                ]}
              >
                <Card.Content>
                  <View style={chartStyles.header}>
                    <View style={chartStyles.titleRow}>
                      <View
                        style={[
                          chartStyles.icon,
                          { backgroundColor: "#0284c7" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color="#ffffff"
                          name="cash-multiple"
                          size={20}
                        />
                      </View>
                      <Text
                        style={[
                          chartStyles.title,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Volumen Cobrado por Moneda
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      marginBottom: 10,
                      opacity: 0.6,
                    }}
                  >
                    Toca una divisa para destacarla
                  </Text>

                  <View style={rechargeProfitStyles.summaryGrid}>
                    {chargedByCurrency.map((item) => {
                      const isSelected = selectedCurrency === item.currency;
                      return (
                        <Pressable
                          key={item.currency}
                          onPress={() => {
                            safeHaptic();
                            setSelectedCurrency(
                              isSelected ? null : item.currency,
                            );
                          }}
                          style={[
                            rechargeProfitStyles.summaryStat,
                            {
                              backgroundColor: isSelected
                                ? theme.dark
                                  ? "rgba(2, 132, 199, 0.2)"
                                  : "rgba(2, 132, 199, 0.1)"
                                : theme.dark
                                  ? "rgba(15, 23, 42, 0.82)"
                                  : "rgba(248, 250, 252, 0.92)",
                              borderColor: isSelected
                                ? "#0284c7"
                                : theme.dark
                                  ? "rgba(148, 163, 184, 0.16)"
                                  : "rgba(15, 23, 42, 0.08)",
                            },
                          ]}
                        >
                          <View
                            style={[
                              rechargeProfitStyles.currencyBadge,
                              isSelected && { backgroundColor: "#0284c7" },
                            ]}
                          >
                            <Text
                              style={[
                                rechargeProfitStyles.currencyBadgeText,
                                isSelected && { color: "#ffffff" },
                              ]}
                            >
                              {item.currency}
                            </Text>
                          </View>
                          <Text
                            style={[
                              rechargeProfitStyles.summaryValue,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {formatNativeCurrency(item.amount, item.currency)}
                          </Text>
                          <Text
                            style={[
                              rechargeProfitStyles.summaryHint,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {item.orderCount} operaciones registradas
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card.Content>
              </Card>
            ) : null}

            {activeSubView === "methods" ? (
              <Card
                style={[
                  chartStyles.card,
                  {
                    backgroundColor: cardBackground,
                    borderColor: cardBorderColor,
                  },
                ]}
              >
                <Card.Content>
                  <View style={chartStyles.header}>
                    <View style={chartStyles.titleRow}>
                      <View
                        style={[
                          chartStyles.icon,
                          { backgroundColor: "#7c3aed" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color="#ffffff"
                          name="credit-card-outline"
                          size={20}
                        />
                      </View>
                      <Text
                        style={[
                          chartStyles.title,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Distribución por Canal de Pago
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      marginBottom: 10,
                      opacity: 0.6,
                    }}
                  >
                    Toca un método de pago para destacarlo
                  </Text>

                  <View style={rechargeProfitStyles.summaryGrid}>
                    {chargedByMethod.map((item) => {
                      const isSelected = selectedMethod === item.paymentMethod;
                      return (
                        <Pressable
                          key={item.paymentMethod}
                          onPress={() => {
                            safeHaptic();
                            setSelectedMethod(
                              isSelected ? null : item.paymentMethod,
                            );
                          }}
                          style={[
                            rechargeProfitStyles.summaryStat,
                            {
                              backgroundColor: isSelected
                                ? theme.dark
                                  ? "rgba(124, 58, 237, 0.2)"
                                  : "rgba(124, 58, 237, 0.1)"
                                : theme.dark
                                  ? "rgba(15, 23, 42, 0.82)"
                                  : "rgba(248, 250, 252, 0.92)",
                              borderColor: isSelected
                                ? "#7c3aed"
                                : theme.dark
                                  ? "rgba(148, 163, 184, 0.16)"
                                  : "rgba(15, 23, 42, 0.08)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              rechargeProfitStyles.summaryLabel,
                              { color: theme.colors.onSurface },
                              isSelected && { color: "#7c3aed" },
                            ]}
                          >
                            {item.paymentMethod}
                          </Text>
                          <Text
                            style={[
                              rechargeProfitStyles.summaryValue,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {item.orderCount}
                          </Text>
                          <Text
                            style={[
                              rechargeProfitStyles.summaryHint,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            transacciones procesadas
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card.Content>
              </Card>
            ) : null}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
};

const rechargeProfitStyles = StyleSheet.create({
  currencyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(2, 132, 199, 0.14)",
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currencyBadgeText: {
    color: "#0284c7",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.72,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: 18,
    marginBottom: 6,
    opacity: 0.75,
    textTransform: "uppercase",
  },
  summaryStat: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 160,
    padding: 16,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 4,
  },
});

export default RechargeProfitCard;
