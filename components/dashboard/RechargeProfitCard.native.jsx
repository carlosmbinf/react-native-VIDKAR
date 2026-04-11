import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import moment from "moment";
import "moment/locale/es";
import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import {
    ActivityIndicator,
    Card,
    Chip,
    Text,
    useTheme,
} from "react-native-paper";

import { VentasRechargeCollection } from "../collections/collections";
import ChartSkeleton from "./ChartSkeleton";
import KPICard from "./KPICard";
import { chartStyles, dashboardStyles } from "./styles/dashboardStyles";

moment.locale("es");

/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */
const Meteor = MeteorBase;
const AUTHORIZED_ANALYTICS_USERNAME = "carlosmbinf";

const getChartWidth = (windowWidth) => Math.max(windowWidth - 72, 280);

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
  const { width } = useWindowDimensions();
  const { analytics, currentUser, loading } = Meteor.useTracker(() => {
    const currentUser = Meteor.user();
    const canViewAnalytics = isAuthorizedAnalyticsUser(currentUser?.username);

    if (!canViewAnalytics) {
      return {
        analytics: null,
        currentUser,
        loading: false,
      };
    }

    const selector = {
      "producto.carritos.type": "RECARGA",
      isCancelada: false,
    };

    const ventasHandle = Meteor.subscribe("ventasRecharge", selector);

    if (!ventasHandle.ready()) {
      return {
        analytics: null,
        currentUser,
        loading: true,
      };
    }

    const ventasRecharge = VentasRechargeCollection.find(selector, {
      sort: { createdAt: 1 },
    }).fetch();

    return {
      analytics: buildAnalytics(ventasRecharge),
      currentUser,
      loading: false,
    };
  });

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

  const sourceCardBg = theme.dark
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(255, 255, 255, 0.94)";

  const chartWidth = getChartWidth(width);
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
      strokeWidth: "2",
      stroke: theme.colors.primary,
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

  if (!canView) {
    return null;
  }

  if (loading || !analytics) {
    return (
      <View style={dashboardStyles.section}>
        <Card
          style={[
            dashboardStyles.sourceCard,
            { backgroundColor: sourceCardBg },
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
              Cargando analitica de recargas...
            </Text>
            <ChartSkeleton />
          </Card.Content>
        </Card>
      </View>
    );
  }

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
              Analitica de recargas
            </Text>
            <Text
              style={[
                dashboardStyles.headerTitle,
                { color: theme.colors.onBackground },
              ]}
            >
              Cobrado real, costo real y ganancia neta de recargas.
            </Text>
          </View>
          <Chip
            icon="lightning-bolt-circle"
            style={{ backgroundColor: "#16a34a" }}
            textStyle={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}
          >
            USD real
          </Chip>
        </View>
        <Text
          style={[
            dashboardStyles.headerSubtitle,
            { color: theme.colors.onBackground },
          ]}
        >
          Se incluyen solo ventas de `ventas_Recharge` con `isCancelada = false`
          y `producto.carritos.type = RECARGA`. El cobro real se toma de
          `producto.carritos[].producto.prices.retail.amount` y el costo real
          del proveedor de
          `producto.carritos[].producto.prices.wholesale.amount`. La ganancia
          sale de la diferencia entre ambos, sumando todos los carritos de cada
          venta.
        </Text>
      </View>

      <Card
        style={[dashboardStyles.sourceCard, { backgroundColor: sourceCardBg }]}
      >
        <Card.Content style={dashboardStyles.sourceCardContent}>
          <View style={dashboardStyles.sourceRow}>
            <View
              style={[
                dashboardStyles.sourceIcon,
                {
                  backgroundColor: theme.dark
                    ? "rgba(34, 197, 94, 0.16)"
                    : "rgba(34, 197, 94, 0.12)",
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#22c55e"
                name="cash-plus"
                size={20}
              />
            </View>
            <View style={dashboardStyles.sourceTextBlock}>
              <Text
                style={[
                  dashboardStyles.sourceLabel,
                  { color: theme.colors.onSurface },
                ]}
              >
                Cobrado real en USD
              </Text>
              <Text
                style={[
                  dashboardStyles.sourceDescription,
                  { color: theme.colors.onSurface },
                ]}
              >
                Se usa `producto.carritos[].producto.prices.retail.amount`
                multiplicado por la cantidad de cada carrito.
              </Text>
            </View>
          </View>

          <View style={dashboardStyles.sourceRow}>
            <View
              style={[
                dashboardStyles.sourceIcon,
                {
                  backgroundColor: theme.dark
                    ? "rgba(59, 130, 246, 0.16)"
                    : "rgba(59, 130, 246, 0.12)",
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#3b82f6"
                name="warehouse"
                size={20}
              />
            </View>
            <View style={dashboardStyles.sourceTextBlock}>
              <Text
                style={[
                  dashboardStyles.sourceLabel,
                  { color: theme.colors.onSurface },
                ]}
              >
                Costo real del proveedor
              </Text>
              <Text
                style={[
                  dashboardStyles.sourceDescription,
                  { color: theme.colors.onSurface },
                ]}
              >
                Se usa `producto.carritos[].producto.prices.wholesale.amount`
                como costo base de cada recarga para medir la ganancia neta.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {summary ? (
        <>
          <View style={dashboardStyles.kpiContainer}>
            <KPICard
              color="#0f766e"
              icon="cellphone-arrow-down"
              subtitle={`${summary.orderCount} ordenes analizadas`}
              title="Recargas reales"
              value={summary.rechargeCount}
            />
            <KPICard
              color="#16a34a"
              icon="cash-plus"
              subtitle={`${formatUsd(summary.averageProfitUsd)} por recarga`}
              title="Ganancia neta"
              value={formatUsd(summary.profitUsd)}
            />
          </View>

          <View style={dashboardStyles.kpiContainer}>
            <KPICard
              color="#7c3aed"
              icon="currency-usd"
              subtitle={`${formatUsd(summary.averageTicketUsd)} ticket promedio`}
              title="Cobrado real"
              value={formatUsd(summary.chargedUsd)}
            />
            <KPICard
              color="#f97316"
              icon="warehouse"
              subtitle={`${summary.profitMarginPct.toFixed(2)}% margen`}
              title="Gastado real"
              value={formatUsd(summary.costUsd)}
            />
          </View>

          <Card style={[chartStyles.card, { backgroundColor: sourceCardBg }]}>
            <Card.Content>
              <View style={chartStyles.header}>
                <View style={chartStyles.titleRow}>
                  <View
                    style={[chartStyles.icon, { backgroundColor: "#2563eb" }]}
                  >
                    <MaterialCommunityIcons
                      color="#ffffff"
                      name="cash-register"
                      size={20}
                    />
                  </View>
                  <Text
                    style={[
                      chartStyles.title,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Cobrado por moneda y metodo
                  </Text>
                </View>
              </View>

              <View style={rechargeProfitStyles.summaryGrid}>
                {chargedByCurrency.map((item) => (
                  <View
                    key={item.currency}
                    style={[
                      rechargeProfitStyles.summaryStat,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(15, 23, 42, 0.82)"
                          : "rgba(248, 250, 252, 0.92)",
                        borderColor: theme.dark
                          ? "rgba(148, 163, 184, 0.12)"
                          : "rgba(15, 23, 42, 0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        rechargeProfitStyles.summaryLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Cobrado en {item.currency}
                    </Text>
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
                      {item.orderCount} ventas
                    </Text>
                  </View>
                ))}
              </View>

              <View style={rechargeProfitStyles.summaryGrid}>
                {chargedByMethod.map((item) => (
                  <View
                    key={item.paymentMethod}
                    style={[
                      rechargeProfitStyles.summaryStat,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(15, 23, 42, 0.82)"
                          : "rgba(248, 250, 252, 0.92)",
                        borderColor: theme.dark
                          ? "rgba(148, 163, 184, 0.12)"
                          : "rgba(15, 23, 42, 0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        rechargeProfitStyles.summaryLabel,
                        { color: theme.colors.onSurface },
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
                      ventas cobradas por este metodo
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          <Card style={[chartStyles.card, { backgroundColor: sourceCardBg }]}>
            <Card.Content>
              <View style={chartStyles.header}>
                <View style={chartStyles.titleRow}>
                  <View
                    style={[chartStyles.icon, { backgroundColor: "#16a34a" }]}
                  >
                    <MaterialCommunityIcons
                      color="#ffffff"
                      name="chart-line-variant"
                      size={20}
                    />
                  </View>
                  <Text
                    style={[
                      chartStyles.title,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Tendencia mensual de recargas
                  </Text>
                </View>
                <View style={chartStyles.chipColumn}>
                  <Chip
                    icon="sale"
                    style={{ backgroundColor: "rgba(124, 58, 237, 0.16)" }}
                    textStyle={{
                      color: "#7c3aed",
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {summary.promotionCount} promos
                  </Chip>
                  <Chip
                    icon="percent"
                    style={{ backgroundColor: "rgba(22, 163, 74, 0.16)" }}
                    textStyle={{
                      color: "#16a34a",
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {summary.profitMarginPct.toFixed(2)}% margen
                  </Chip>
                </View>
              </View>

              {monthly.length > 0 ? (
                <>
                  <LineChart
                    bezier
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
                            `rgba(124, 58, 237, ${opacity})`,
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
                      legend: ["Cobrado USD", "Ganancia USD"],
                    }}
                    fromZero
                    height={240}
                    style={chartStyles.chart}
                    width={chartWidth}
                    withInnerLines
                    withShadow
                    yAxisLabel="$"
                  />

                  <View
                    style={[
                      chartStyles.insightBox,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(15, 23, 42, 0.92)"
                          : "rgba(22, 163, 74, 0.06)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        chartStyles.insightTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Lectura ejecutiva
                    </Text>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Mejor mes
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#16a34a" }]}
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
                        Margen neto
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#3b82f6" }]}
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
                        Cobrado total
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#7c3aed" }]}
                      >
                        {formatUsd(summary.chargedUsd)}
                      </Text>
                    </View>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Gastado total
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#f97316" }]}
                      >
                        {formatUsd(summary.costUsd)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View
                  style={[
                    chartStyles.chartEmpty,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(15, 23, 42, 0.82)"
                        : "rgba(248, 250, 252, 0.9)",
                      borderColor: theme.dark
                        ? "rgba(148, 163, 184, 0.22)"
                        : "rgba(15, 23, 42, 0.08)",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={theme.colors.primary}
                    name="chart-box-outline"
                    size={34}
                  />
                  <Text
                    style={[
                      chartStyles.chartEmptyTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Sin historico suficiente
                  </Text>
                  <Text
                    style={[
                      chartStyles.chartEmptyText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Aun no hay meses suficientes para graficar la utilidad de
                    recargas.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </>
      ) : null}
    </View>
  );
};

const rechargeProfitStyles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 6,
    opacity: 0.72,
    textTransform: "uppercase",
  },
  summaryStat: {
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 170,
    padding: 14,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 4,
  },
});

export default RechargeProfitCard;
