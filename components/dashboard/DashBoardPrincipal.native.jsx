import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import moment from "moment";
import "moment/locale/es";
import React from "react";
import { View, useWindowDimensions } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import {
    ActivityIndicator,
    Card,
    Chip,
    Text,
    useTheme,
} from "react-native-paper";

import { VentasCollection } from "../collections/collections";
import ChartSkeleton from "./ChartSkeleton";
import CustomSegmentedButtons from "./CustomSegmentedButtons";
import KPICard from "./KPICard";
import { chartStyles, dashboardStyles } from "./styles/dashboardStyles";
import { detectPeriodType } from "./utils/formatUtils";

moment.locale("es");

/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker, users: typeof Meteor.users }} */
const Meteor = MeteorBase;

const INITIAL_PERIOD = {
  type: "DESCONOCIDO",
  label: "Cargando",
  icon: "calendar-blank",
  color: "#757575",
  description: "Cargando periodo",
};

const buildSectionLabel = (type) => {
  if (type === "HORA") return "Bloque horario";
  if (type === "DIARIO") return "Bloque diario";
  if (type === "MENSUAL") return "Bloque mensual";
  return "Dashboard";
};

const emptyVentasSummary = {
  adminLabels: [],
  ganancias12Meses: [],
  totalCobradoMesActual: 0,
  totalDeudasHistoricas: 0,
  totalDeudasMesActual: 0,
  totalGanancias12Meses: 0,
  totalGananciasHistorico: 0,
  totalGananciasMesActual: 0,
  totalVentas12Meses: 0,
  totalVentasHistorico: 0,
  totalVendido12Meses: [],
  ventasLabels: [],
  ventasPorAdminMesActual: [],
};

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const getChartWidth = (windowWidth) => Math.max(windowWidth - 72, 280);

const buildVentasSummary = (ventas, admins) => {
  if (!Array.isArray(ventas) || ventas.length === 0) {
    return emptyVentasSummary;
  }

  const ventasLabels = [];
  const totalVendido12Meses = [];
  const ganancias12Meses = [];

  for (let index = 11; index >= 0; index -= 1) {
    const monthStart = moment().subtract(index, "month").startOf("month");
    const monthEnd = moment().subtract(index, "month").endOf("month");

    let totalMes = 0;
    let gananciasMes = 0;

    ventas.forEach((venta) => {
      const fechaVenta = moment(venta.createdAt);
      if (fechaVenta.isBetween(monthStart, monthEnd, null, "[]")) {
        totalMes += Number(venta.precio || 0);
        gananciasMes += Number(venta.gananciasAdmin || 0);
      }
    });

    ventasLabels.push(monthStart.format("MMM"));
    totalVendido12Meses.push(totalMes);
    ganancias12Meses.push(gananciasMes);
  }

  const mesActualStart = moment().startOf("month");
  const mesActualEnd = moment().endOf("month");
  const ventasPorAdminMesActual = [];
  const adminLabels = [];

  let totalCobradoMesActual = 0;
  let totalGananciasMesActual = 0;
  let totalDeudasMesActual = 0;

  admins.forEach((admin) => {
    let totalVendidoAdmin = 0;
    let gananciasAdminMesActual = 0;
    let deudasAdminMesActual = 0;

    ventas.forEach((venta) => {
      if (venta.adminId !== admin._id) {
        return;
      }

      const fechaVenta = moment(venta.createdAt);
      if (!fechaVenta.isBetween(mesActualStart, mesActualEnd, null, "[]")) {
        return;
      }

      totalVendidoAdmin += Number(venta.precio || 0);
      gananciasAdminMesActual += Number(venta.gananciasAdmin || 0);

      if (!venta.cobrado) {
        deudasAdminMesActual += Number(venta.precio || 0);
      }
    });

    totalCobradoMesActual += totalVendidoAdmin;
    totalGananciasMesActual += gananciasAdminMesActual;
    totalDeudasMesActual += deudasAdminMesActual;

    if (totalVendidoAdmin <= 0) {
      return;
    }

    const fullName =
      `${admin.profile?.firstName || ""} ${admin.profile?.lastName || ""}`.trim() ||
      "Sin nombre";
    adminLabels.push(
      fullName.length > 15 ? `${fullName.slice(0, 15)}...` : fullName,
    );
    ventasPorAdminMesActual.push({
      deudas: deudasAdminMesActual,
      ganancias: gananciasAdminMesActual,
      totalVendido: totalVendidoAdmin,
    });
  });

  let totalVentasHistorico = 0;
  let totalGananciasHistorico = 0;
  let totalDeudasHistoricas = 0;

  ventas.forEach((venta) => {
    totalVentasHistorico += Number(venta.precio || 0);
    totalGananciasHistorico += Number(venta.gananciasAdmin || 0);

    if (!venta.cobrado) {
      totalDeudasHistoricas += Number(venta.precio || 0);
    }
  });

  return {
    adminLabels,
    ganancias12Meses,
    totalCobradoMesActual,
    totalDeudasHistoricas,
    totalDeudasMesActual,
    totalGanancias12Meses: ganancias12Meses.reduce(
      (sum, value) => sum + value,
      0,
    ),
    totalGananciasHistorico,
    totalGananciasMesActual,
    totalVentas12Meses: totalVendido12Meses.reduce(
      (sum, value) => sum + value,
      0,
    ),
    totalVentasHistorico,
    totalVendido12Meses,
    ventasLabels,
    ventasPorAdminMesActual,
  };
};

const renderEmptyChart = (theme, title, copy) => (
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
      style={[chartStyles.chartEmptyTitle, { color: theme.colors.onSurface }]}
    >
      {title}
    </Text>
    <Text
      style={[chartStyles.chartEmptyText, { color: theme.colors.onSurface }]}
    >
      {copy}
    </Text>
  </View>
);

const DashBoardPrincipal = ({ refreshToken = 0, type }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [labels, setLabels] = React.useState([]);
  const [vpnValues, setVpnValues] = React.useState([]);
  const [proxyValues, setProxyValues] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedView, setSelectedView] = React.useState("general");
  const [periodInfo, setPeriodInfo] = React.useState(INITIAL_PERIOD);
  const [consumptionKpis, setConsumptionKpis] = React.useState({
    activeUsers: 0,
    totalConsumo: 0,
    totalUsers: 0,
    totalVentas: 0,
  });

  const { admins, currentUser, ventas } = Meteor.useTracker(() => {
    Meteor.subscribe(
      "ventas",
      {},
      {
        fields: {
          adminId: 1,
          cobrado: 1,
          createdAt: 1,
          gananciasAdmin: 1,
          precio: 1,
        },
      },
    );
    Meteor.subscribe(
      "user",
      {},
      {
        fields: {
          _id: 1,
          "profile.firstName": 1,
          "profile.lastName": 1,
          "profile.role": 1,
          username: 1,
        },
      },
    );

    return {
      admins: Meteor.users.find({ "profile.role": "admin" }).fetch(),
      currentUser: Meteor.user(),
      ventas: VentasCollection.find(
        {},
        {
          fields: {
            adminId: 1,
            cobrado: 1,
            createdAt: 1,
            gananciasAdmin: 1,
            precio: 1,
          },
        },
      ).fetch(),
    };
  });

  const ventasSummary = React.useMemo(
    () => buildVentasSummary(ventas, admins),
    [admins, ventas],
  );

  const fetchData = React.useCallback(() => {
    setLoading(true);

    Meteor.call("getDatosDashboardByUser", type, null, (error, result) => {
      if (error) {
        console.error("Dashboard error", error);
        setLabels([]);
        setVpnValues([]);
        setProxyValues([]);
        setPeriodInfo({
          color: theme.colors.error,
          description: "No se pudo cargar el consumo",
          icon: "alert-circle-outline",
          label: "Error",
          type: "ERROR",
        });
        setConsumptionKpis({
          activeUsers: 0,
          totalConsumo: 0,
          totalUsers: 0,
          totalVentas: 0,
        });
        setLoading(false);
        return;
      }

      const safeResult = Array.isArray(result) ? result : [];
      const vpnData = safeResult.map((item) => Number(item?.VPN || 0));
      const proxyData = safeResult.map((item) => Number(item?.PROXY || 0));
      const visibleLabels = safeResult
        .filter((_, index) => index % 2 === 0)
        .map((item) => String(item?.name || "").replace(/:00/g, ""));
      const detectedPeriod = detectPeriodType(
        safeResult.map((item) => item?.name),
      );
      const totalVPN = vpnData.reduce((sum, value) => sum + value, 0);
      const totalProxy = proxyData.reduce((sum, value) => sum + value, 0);

      setVpnValues(vpnData);
      setProxyValues(proxyData);
      setLabels(visibleLabels);
      setPeriodInfo(detectedPeriod);
      setConsumptionKpis({
        activeUsers: safeResult.filter(
          (item) => Number(item?.VPN || 0) > 0 || Number(item?.PROXY || 0) > 0,
        ).length,
        totalConsumo: Number((totalVPN + totalProxy).toFixed(2)),
        totalUsers: safeResult.length,
        totalVentas: safeResult.reduce(
          (sum, item) => sum + Number(item?.ventas || 0),
          0,
        ),
      });
      setLoading(false);
    });
  }, [theme.colors.error, type]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, refreshToken]);

  React.useEffect(() => {
    if (selectedView === "ventas" && periodInfo.type === "HORA") {
      setSelectedView("general");
    }
  }, [periodInfo.type, selectedView]);

  const chartWidth = getChartWidth(width);
  const lineLabels = labels.length > 0 ? labels : [""];
  const generalChartData = {
    datasets: [
      {
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        data: vpnValues.length > 0 ? vpnValues : [0],
        strokeWidth: 2,
      },
      {
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        data: proxyValues.length > 0 ? proxyValues : [0],
        strokeWidth: 2,
      },
    ],
    labels: lineLabels,
    legend: ["VPN", "Proxy"],
  };

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

  const visibleButtons = [
    { value: "general", label: "General", icon: "chart-box" },
    { value: "vpn", label: "VPN", icon: "shield-check" },
    { value: "proxy", label: "Proxy", icon: "wifi" },
    ...(periodInfo.type !== "HORA" && currentUser?.username === "carlosmbinf"
      ? [{ value: "ventas", label: "Ventas", icon: "currency-usd" }]
      : []),
  ];

  const sourceCardBg = theme.dark
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(255, 255, 255, 0.94)";

  if (loading && vpnValues.length === 0 && proxyValues.length === 0) {
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
              Cargando {buildSectionLabel(type).toLowerCase()}...
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
              {buildSectionLabel(type)}
            </Text>
            <Text
              style={[
                dashboardStyles.headerTitle,
                { color: theme.colors.onBackground },
              ]}
            >
              {periodInfo.description || "Analisis de consumo"}
            </Text>
          </View>
          <Chip
            icon={periodInfo.icon}
            style={{ backgroundColor: periodInfo.color }}
            textStyle={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}
          >
            {periodInfo.label}
          </Chip>
        </View>
        <Text
          style={[
            dashboardStyles.headerSubtitle,
            { color: theme.colors.onBackground },
          ]}
        >
          El consumo se obtiene desde `getDatosDashboardByUser` sobre
          `RegisterDataUsersCollection`, y las ventas se calculan reactivamente
          desde `ventas` y `Meteor.users`.
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
                    ? "rgba(59, 130, 246, 0.16)"
                    : "rgba(59, 130, 246, 0.12)",
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#3b82f6"
                name="database-outline"
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
                Consumo VPN / Proxy
              </Text>
              <Text
                style={[
                  dashboardStyles.sourceDescription,
                  { color: theme.colors.onSurface },
                ]}
              >
                Metodo Meteor agregado por periodo y convertido a GB desde
                registros de uso.
              </Text>
            </View>
          </View>
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
                name="cash-multiple"
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
                Ventas y deudas
              </Text>
              <Text
                style={[
                  dashboardStyles.sourceDescription,
                  { color: theme.colors.onSurface },
                ]}
              >
                Coleccion reactiva `ventas` + nombres de admins desde
                `Meteor.users` para resumen mensual, anual e historico.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={dashboardStyles.kpiContainer}>
        {selectedView !== "ventas" ? (
          <>
            <KPICard
              color="#4caf50"
              icon="chart-line"
              isLargeNumber
              subtitle={periodInfo.description || "Total acumulado"}
              title="Total Consumo"
              trend={12}
              value={consumptionKpis.totalConsumo}
            />
            <KPICard
              color="#2196f3"
              icon="account-group"
              subtitle={`de ${consumptionKpis.totalUsers} usuarios`}
              title="Usuarios Activos"
              trend={8}
              value={consumptionKpis.activeUsers}
            />
          </>
        ) : periodInfo.type === "DIA" ? (
          <>
            <KPICard
              color="#4caf50"
              icon="cash-check"
              subtitle={moment().format("MMMM YYYY")}
              title="Total Cobrado"
              value={formatCurrency(ventasSummary.totalCobradoMesActual)}
            />
            <KPICard
              color="#2196f3"
              icon="account-cash"
              subtitle={moment().format("MMMM YYYY")}
              title="Ganancias Admin"
              value={formatCurrency(ventasSummary.totalGananciasMesActual)}
            />
          </>
        ) : (
          <>
            <KPICard
              color="#ff9800"
              icon="cash-multiple"
              subtitle="Ultimos 12 meses"
              title="Total Ventas (12M)"
              value={formatCurrency(ventasSummary.totalVentas12Meses)}
            />
            <KPICard
              color="#9c27b0"
              icon="trending-up"
              subtitle="Todas las ventas"
              title="Historico Total"
              value={formatCurrency(ventasSummary.totalVentasHistorico)}
            />
          </>
        )}
      </View>

      <View style={dashboardStyles.segmentedContainer}>
        <CustomSegmentedButtons
          buttons={visibleButtons}
          onValueChange={setSelectedView}
          value={selectedView}
        />
      </View>

      {selectedView === "general" ? (
        <Card style={[chartStyles.card, { backgroundColor: sourceCardBg }]}>
          <Card.Content>
            <View style={chartStyles.header}>
              <View style={chartStyles.titleRow}>
                <View
                  style={[chartStyles.icon, { backgroundColor: "#4caf50" }]}
                >
                  <MaterialCommunityIcons
                    color="#ffffff"
                    name="chart-box"
                    size={20}
                  />
                </View>
                <Text
                  style={[chartStyles.title, { color: theme.colors.onSurface }]}
                >
                  Consumo comparativo
                </Text>
              </View>
              <Chip
                icon={periodInfo.icon}
                style={{ backgroundColor: `${periodInfo.color}22` }}
                textStyle={{
                  color: periodInfo.color,
                  fontSize: 10,
                  fontWeight: "800",
                }}
              >
                {periodInfo.label}
              </Chip>
            </View>
            {vpnValues.length > 0 || proxyValues.length > 0 ? (
              <LineChart
                bezier
                chartConfig={chartConfig}
                data={generalChartData}
                fromZero
                height={240}
                style={chartStyles.chart}
                width={chartWidth}
                withHorizontalLines
                withInnerLines
                withOuterLines
                withShadow
                withVerticalLines={false}
                yAxisSuffix=" GB"
              />
            ) : (
              renderEmptyChart(
                theme,
                "Sin consumo agregado",
                "No hay registros de proxy o VPN para este periodo.",
              )
            )}
          </Card.Content>
        </Card>
      ) : null}

      {selectedView === "vpn" ? (
        <Card style={[chartStyles.card, { backgroundColor: sourceCardBg }]}>
          <Card.Content>
            <View style={chartStyles.header}>
              <View style={chartStyles.titleRow}>
                <View
                  style={[chartStyles.icon, { backgroundColor: "#4caf50" }]}
                >
                  <MaterialCommunityIcons
                    color="#ffffff"
                    name="shield-check"
                    size={20}
                  />
                </View>
                <Text
                  style={[chartStyles.title, { color: theme.colors.onSurface }]}
                >
                  Consumo VPN
                </Text>
              </View>
              <View style={chartStyles.chipColumn}>
                <Chip
                  icon={periodInfo.icon}
                  style={{ backgroundColor: `${periodInfo.color}22` }}
                  textStyle={{
                    color: periodInfo.color,
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  {periodInfo.label}
                </Chip>
                <Chip
                  icon="trending-up"
                  style={{ backgroundColor: "rgba(76, 175, 80, 0.16)" }}
                  textStyle={{
                    color: "#4caf50",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  +12%
                </Chip>
              </View>
            </View>
            {vpnValues.length > 0 ? (
              <LineChart
                bezier
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  propsForDots: {
                    ...chartConfig.propsForDots,
                    stroke: "#4caf50",
                  },
                }}
                data={{
                  datasets: [{ data: vpnValues }],
                  labels: lineLabels,
                }}
                fromZero
                height={240}
                style={chartStyles.chart}
                width={chartWidth}
                withInnerLines
                withShadow
                yAxisSuffix=" GB"
              />
            ) : (
              renderEmptyChart(
                theme,
                "VPN sin consumo",
                "Todavia no hay gasto agregado de VPN para este bloque.",
              )
            )}
          </Card.Content>
        </Card>
      ) : null}

      {selectedView === "proxy" ? (
        <Card style={[chartStyles.card, { backgroundColor: sourceCardBg }]}>
          <Card.Content>
            <View style={chartStyles.header}>
              <View style={chartStyles.titleRow}>
                <View
                  style={[chartStyles.icon, { backgroundColor: "#2196f3" }]}
                >
                  <MaterialCommunityIcons
                    color="#ffffff"
                    name="wifi"
                    size={20}
                  />
                </View>
                <Text
                  style={[chartStyles.title, { color: theme.colors.onSurface }]}
                >
                  Consumo Proxy
                </Text>
              </View>
              <View style={chartStyles.chipColumn}>
                <Chip
                  icon={periodInfo.icon}
                  style={{ backgroundColor: `${periodInfo.color}22` }}
                  textStyle={{
                    color: periodInfo.color,
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  {periodInfo.label}
                </Chip>
                <Chip
                  icon="trending-up"
                  style={{ backgroundColor: "rgba(33, 150, 243, 0.16)" }}
                  textStyle={{
                    color: "#2196f3",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  +8%
                </Chip>
              </View>
            </View>
            {proxyValues.length > 0 ? (
              <LineChart
                bezier
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  propsForDots: {
                    ...chartConfig.propsForDots,
                    stroke: "#2196f3",
                  },
                }}
                data={{
                  datasets: [{ data: proxyValues }],
                  labels: lineLabels,
                }}
                fromZero
                height={240}
                style={chartStyles.chart}
                width={chartWidth}
                withInnerLines
                withShadow
                yAxisSuffix=" GB"
              />
            ) : (
              renderEmptyChart(
                theme,
                "Proxy sin consumo",
                "Todavia no hay gasto agregado de Proxy para este bloque.",
              )
            )}
          </Card.Content>
        </Card>
      ) : null}

      {selectedView === "ventas" ? (
        <Card style={[chartStyles.card, { backgroundColor: sourceCardBg }]}>
          <Card.Content>
            <View style={chartStyles.header}>
              <View style={chartStyles.titleRow}>
                <View
                  style={[chartStyles.icon, { backgroundColor: "#ff9800" }]}
                >
                  <MaterialCommunityIcons
                    color="#ffffff"
                    name="currency-usd"
                    size={20}
                  />
                </View>
                <Text
                  style={[chartStyles.title, { color: theme.colors.onSurface }]}
                >
                  {periodInfo.type === "DIA"
                    ? "Ventas por admin (mes actual)"
                    : "Ventas por mes (12 meses)"}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {periodInfo.type === "DIA" ? (
                <>
                  <Chip
                    icon="calendar-check"
                    style={{ backgroundColor: "rgba(76, 175, 80, 0.16)" }}
                    textStyle={{
                      color: "#4caf50",
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {moment().format("MMMM YYYY")}
                  </Chip>
                  <Chip
                    icon="account-group"
                    style={{ backgroundColor: "rgba(33, 150, 243, 0.16)" }}
                    textStyle={{
                      color: "#2196f3",
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {ventasSummary.adminLabels.length} admins
                  </Chip>
                </>
              ) : (
                <Chip
                  icon="calendar-range"
                  style={{ backgroundColor: "rgba(255, 152, 0, 0.16)" }}
                  textStyle={{
                    color: "#ff9800",
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  Ultimos 12 meses
                </Chip>
              )}
            </View>

            {periodInfo.type === "DIA" ? (
              ventasSummary.adminLabels.length > 0 ? (
                <>
                  <BarChart
                    chartConfig={{
                      ...chartConfig,
                      barPercentage: 0.7,
                    }}
                    data={{
                      datasets: [
                        {
                          color: (opacity = 1) =>
                            `rgba(76, 175, 80, ${opacity})`,
                          data: ventasSummary.ventasPorAdminMesActual.map(
                            (item) => item.totalVendido,
                          ),
                        },
                        {
                          color: (opacity = 1) =>
                            `rgba(0, 139, 159, ${opacity})`,
                          data: ventasSummary.ventasPorAdminMesActual.map(
                            (item) => item.ganancias,
                          ),
                        },
                        {
                          color: (opacity = 1) =>
                            `rgba(211, 47, 47, ${opacity})`,
                          data: ventasSummary.ventasPorAdminMesActual.map(
                            (item) => item.deudas,
                          ),
                        },
                      ],
                      labels: ventasSummary.adminLabels,
                    }}
                    fromZero
                    height={240}
                    showValuesOnTopOfBars={false}
                    style={chartStyles.chart}
                    width={chartWidth}
                    yAxisLabel="$"
                  />
                  <View
                    style={[
                      chartStyles.insightBox,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(15, 23, 42, 0.92)"
                          : "rgba(76, 175, 80, 0.06)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        chartStyles.insightTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Resumen del mes actual
                    </Text>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Ganancias Vidkar
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#4caf50" }]}
                      >
                        {formatCurrency(ventasSummary.totalCobradoMesActual)}
                      </Text>
                    </View>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Ganancias admins
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#008b9f" }]}
                      >
                        {formatCurrency(ventasSummary.totalGananciasMesActual)}
                      </Text>
                    </View>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Deudas del mes
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#d32f2f" }]}
                      >
                        {formatCurrency(ventasSummary.totalDeudasMesActual)}
                      </Text>
                    </View>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Cobrado + ganancias
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#ff9800" }]}
                      >
                        {formatCurrency(
                          ventasSummary.totalCobradoMesActual +
                            ventasSummary.totalGananciasMesActual,
                        )}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                renderEmptyChart(
                  theme,
                  "Sin ventas del mes",
                  "No hay administradores con ventas registradas en el mes actual.",
                )
              )
            ) : ventasSummary.ventasLabels.length > 0 ? (
              <>
                <LineChart
                  bezier
                  chartConfig={{
                    ...chartConfig,
                    propsForDots: {
                      ...chartConfig.propsForDots,
                      stroke: "#4caf50",
                    },
                  }}
                  data={{
                    datasets: [
                      {
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                        data: ventasSummary.totalVendido12Meses,
                        strokeWidth: 3,
                      },
                      {
                        color: (opacity = 1) => `rgba(0, 139, 159, ${opacity})`,
                        data: ventasSummary.ganancias12Meses,
                        strokeWidth: 3,
                      },
                    ],
                    labels: ventasSummary.ventasLabels,
                    legend: ["Total vendido", "Ganancias admin"],
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
                        : "rgba(255, 152, 0, 0.06)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      chartStyles.insightTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Estadisticas 12 meses
                  </Text>
                  <View style={chartStyles.insightRow}>
                    <Text
                      style={[
                        chartStyles.insightLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Ganancias Vidkar
                    </Text>
                    <Text
                      style={[chartStyles.insightValue, { color: "#4caf50" }]}
                    >
                      {formatCurrency(ventasSummary.totalVentas12Meses)}
                    </Text>
                  </View>
                  <View style={chartStyles.insightRow}>
                    <Text
                      style={[
                        chartStyles.insightLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Ganancias admins
                    </Text>
                    <Text
                      style={[chartStyles.insightValue, { color: "#008b9f" }]}
                    >
                      {formatCurrency(ventasSummary.totalGanancias12Meses)}
                    </Text>
                  </View>
                  <View style={chartStyles.insightRow}>
                    <Text
                      style={[
                        chartStyles.insightLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Promedio mensual
                    </Text>
                    <Text
                      style={[chartStyles.insightValue, { color: "#ff9800" }]}
                    >
                      {formatCurrency(
                        (ventasSummary.totalVentas12Meses +
                          ventasSummary.totalGanancias12Meses) /
                          12,
                      )}
                    </Text>
                  </View>
                  <Text
                    style={[
                      chartStyles.insightTitle,
                      { color: theme.colors.onSurface, marginTop: 10 },
                    ]}
                  >
                    Historico total
                  </Text>
                  <View style={chartStyles.insightRow}>
                    <Text
                      style={[
                        chartStyles.insightLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Total historico
                    </Text>
                    <Text
                      style={[chartStyles.insightValue, { color: "#4caf50" }]}
                    >
                      {formatCurrency(ventasSummary.totalVentasHistorico)}
                    </Text>
                  </View>
                  <View style={chartStyles.insightRow}>
                    <Text
                      style={[
                        chartStyles.insightLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Ganancias historicas
                    </Text>
                    <Text
                      style={[chartStyles.insightValue, { color: "#008b9f" }]}
                    >
                      {formatCurrency(ventasSummary.totalGananciasHistorico)}
                    </Text>
                  </View>
                  <View style={chartStyles.insightRow}>
                    <Text
                      style={[
                        chartStyles.insightLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Deudas historicas
                    </Text>
                    <Text
                      style={[chartStyles.insightValue, { color: "#d32f2f" }]}
                    >
                      {formatCurrency(ventasSummary.totalDeudasHistoricas)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              renderEmptyChart(
                theme,
                "Sin historico de ventas",
                "No hay informacion suficiente para graficar los ultimos 12 meses.",
              )
            )}
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );
};

export default DashBoardPrincipal;
