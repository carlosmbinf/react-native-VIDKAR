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
  ScrollView,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import {
  ActivityIndicator,
  Card,
  Chip,
  Text,
  useTheme,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasCollection } from "../collections/collections";
import ChartSkeleton from "./ChartSkeleton";
import CustomSegmentedButtons from "./CustomSegmentedButtons";
import InteractiveChart from "./InteractiveChart";
import KPICard from "./KPICard";
import { chartStyles, dashboardStyles } from "./styles/dashboardStyles";
import { detectPeriodType } from "./utils/formatUtils";

moment.locale("es");

/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker, users: typeof Meteor.users }} */
const Meteor = MeteorBase;

const safeHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style);
    }
  } catch (_) {}
};

const INITIAL_PERIOD = {
  color: "#757575",
  description: "Cargando métricas",
  icon: "calendar-blank",
  label: "Cargando",
  type: "DESCONOCIDO",
};

const buildSectionLabel = (type) => {
  if (type === "HORA") return "Últimas 24 Horas";
  if (type === "DIARIO") return "Evolución Diaria (Mes Actual)";
  if (type === "MENSUAL") return "Histórico Mensual (Anual)";
  return "Analítica de Tráfico";
};

const emptyVentasSummary = {
  adminDetails: [],
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
  const adminDetails = [];

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
      admin.username ||
      "Sin nombre";

    const shortLabel =
      fullName.length > 14 ? `${fullName.slice(0, 14)}...` : fullName;

    adminLabels.push(shortLabel);
    ventasPorAdminMesActual.push({
      deudas: deudasAdminMesActual,
      ganancias: gananciasAdminMesActual,
      totalVendido: totalVendidoAdmin,
    });
    adminDetails.push({
      adminId: admin._id,
      deudas: deudasAdminMesActual,
      fullName,
      ganancias: gananciasAdminMesActual,
      shortLabel,
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
    adminDetails,
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

const DashBoardPrincipal = ({
  allowPeriodSwitch = true,
  refreshToken = 0,
  type = "DIARIO",
}) => {
  const theme = useTheme();
  const dataReady = useDeferredScreenData();

  const [activeType, setActiveType] = React.useState(type || "DIARIO");
  const [labels, setLabels] = React.useState([]);
  const [vpnValues, setVpnValues] = React.useState([]);
  const [proxyValues, setProxyValues] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedView, setSelectedView] = React.useState("general");
  const [periodInfo, setPeriodInfo] = React.useState(INITIAL_PERIOD);
  const [selectedAdminId, setSelectedAdminId] = React.useState(null);
  const [barChartWidth, setBarChartWidth] = React.useState(0);
  const [consumptionKpis, setConsumptionKpis] = React.useState({
    activeUsers: 0,
    totalConsumo: 0,
    totalUsers: 0,
    totalVentas: 0,
  });

  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (type) {
      setActiveType(type);
    }
  }, [type]);

  const { admins, currentUser, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { admins: [], currentUser: Meteor.user(), ventas: [] };
    }

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
  }, [dataReady]);

  const ventasSummary = React.useMemo(
    () => buildVentasSummary(ventas, admins),
    [admins, ventas],
  );

  const fetchData = React.useCallback(
    (targetType) => {
      setLoading(true);

      Meteor.call("getDatosDashboardByUser", targetType, null, (error, result) => {
        if (error) {
          console.error("Dashboard error", error);
          setLabels([]);
          setVpnValues([]);
          setProxyValues([]);
          setPeriodInfo({
            color: theme.colors.error,
            description: "No se pudo actualizar el consumo",
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
    },
    [theme.colors.error],
  );

  React.useEffect(() => {
    if (!dataReady) {
      return;
    }

    fetchData(activeType);
  }, [activeType, dataReady, fetchData, refreshToken]);

  React.useEffect(() => {
    if (selectedView === "ventas" && activeType === "HORA") {
      setSelectedView("general");
    }
  }, [activeType, selectedView]);

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod !== activeType) {
      safeHaptic();
      setActiveType(newPeriod);
    }
  };

  const handleViewChange = (newView) => {
    fadeAnim.setValue(0.7);
    setSelectedView(newView);
    Animated.timing(fadeAnim, {
      duration: 200,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const lineLabels = labels.length > 0 ? labels : [""];
  const generalChartData = {
    datasets: [
      {
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        data: vpnValues.length > 0 ? vpnValues : [0],
        strokeWidth: 3,
      },
      {
        color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
        data: proxyValues.length > 0 ? proxyValues : [0],
        strokeWidth: 3,
      },
    ],
    labels: lineLabels,
    legend: ["Red VPN", "Conexión Proxy"],
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
      stroke: theme.colors.primary,
      strokeWidth: "2",
    },
    style: { borderRadius: 18 },
  };

  const visibleButtons = [
    { value: "general", label: "Comparativo", icon: "chart-box" },
    { value: "vpn", label: "Red VPN", icon: "shield-check" },
    { value: "proxy", label: "Proxy", icon: "wifi" },
    ...(activeType !== "HORA" && currentUser?.username === "carlosmbinf"
      ? [{ value: "ventas", label: "Ventas Admins", icon: "currency-usd" }]
      : []),
  ];

  const cardBackground = theme.dark
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(255, 255, 255, 0.96)";

  const cardBorderColor = theme.dark
    ? "rgba(148, 163, 184, 0.16)"
    : "rgba(15, 23, 42, 0.08)";

  const horizonPeriods = [
    { key: "HORA", label: "24 Horas", icon: "clock-outline" },
    { key: "DIARIO", label: "Mes Actual", icon: "calendar-today" },
    { key: "MENSUAL", label: "Histórico Anual", icon: "calendar-month" },
  ];

  const totalBandwidth = consumptionKpis.totalConsumo;
  const activePercent =
    consumptionKpis.totalUsers > 0
      ? Math.round(
          (consumptionKpis.activeUsers / consumptionKpis.totalUsers) * 100,
        )
      : 0;

  const selectedAdmin =
    ventasSummary.adminDetails.find((item) => item.adminId === selectedAdminId) ||
    ventasSummary.adminDetails[0] ||
    null;

  if (loading && vpnValues.length === 0 && proxyValues.length === 0) {
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
              Cargando métricas de {buildSectionLabel(activeType).toLowerCase()}...
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
              {buildSectionLabel(activeType)}
            </Text>
            <Text
              style={[
                dashboardStyles.headerTitle,
                { color: theme.colors.onBackground },
              ]}
            >
              Tráfico de Red y Demanda
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
          Monitoreo en tiempo real del tráfico consumido por usuarios y balance
          de demanda de red.
        </Text>
      </View>

      {allowPeriodSwitch ? (
        <View style={dashboardStyles.horizonContainer}>
          {horizonPeriods.map((period) => {
            const isSelected = activeType === period.key;
            return (
              <Pressable
                key={period.key}
                onPress={() => handlePeriodChange(period.key)}
                style={[
                  dashboardStyles.horizonButton,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.dark
                        ? "rgba(30, 41, 59, 0.82)"
                        : "rgba(248, 250, 252, 0.96)",
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.dark
                        ? "rgba(148, 163, 184, 0.24)"
                        : "rgba(15, 23, 42, 0.08)",
                  },
                  isSelected && dashboardStyles.horizonButtonActive,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    isSelected
                      ? "#ffffff"
                      : theme.dark
                        ? "#94a3b8"
                        : "#64748b"
                  }
                  name={period.icon}
                  size={15}
                />
                <Text
                  style={[
                    dashboardStyles.horizonText,
                    {
                      color: isSelected ? "#ffffff" : theme.colors.onSurface,
                    },
                    isSelected && dashboardStyles.horizonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={dashboardStyles.kpiContainer}>
        {selectedView !== "ventas" ? (
          <>
            <KPICard
              color="#10b981"
              icon="chart-line"
              isLargeNumber
              subtitle={periodInfo.description || "Consumo total acumulado"}
              title="Tráfico Total"
              trend={12}
              value={totalBandwidth}
            />
            <KPICard
              color="#0284c7"
              icon="account-group"
              subtitle={`${activePercent}% de ${consumptionKpis.totalUsers} usuarios`}
              title="Usuarios Activos"
              trend={activePercent}
              value={consumptionKpis.activeUsers}
            />
          </>
        ) : activeType === "DIARIO" ? (
          <>
            <KPICard
              color="#10b981"
              icon="cash-check"
              subtitle={moment().format("MMMM YYYY")}
              title="Facturado Plataforma"
              value={formatCurrency(ventasSummary.totalCobradoMesActual)}
            />
            <KPICard
              color="#0284c7"
              icon="account-cash"
              subtitle={moment().format("MMMM YYYY")}
              title="Comisiones Distribuidores"
              value={formatCurrency(ventasSummary.totalGananciasMesActual)}
            />
          </>
        ) : (
          <>
            <KPICard
              color="#f59e0b"
              icon="cash-multiple"
              subtitle="Últimos 12 meses"
              title="Facturado 12 Meses"
              value={formatCurrency(ventasSummary.totalVentas12Meses)}
            />
            <KPICard
              color="#8b5cf6"
              icon="trending-up"
              subtitle="Total acumulado"
              title="Histórico Global"
              value={formatCurrency(ventasSummary.totalVentasHistorico)}
            />
          </>
        )}
      </View>

      <View style={dashboardStyles.segmentedContainer}>
        <CustomSegmentedButtons
          buttons={visibleButtons}
          onValueChange={handleViewChange}
          value={selectedView}
        />
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {selectedView === "general" ? (
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
                badge={periodInfo.label}
                chartConfig={chartConfig}
                data={generalChartData}
                emptyCopy="No se registran transferencias de datos para el bloque seleccionado."
                emptyTitle="Sin consumo en este periodo"
                formatTooltipValue={(val) => `${Number(val || 0).toFixed(2)} GB`}
                height={230}
                icon="chart-box"
                iconBg="#10b981"
                title="Consumo Comparativo de Red"
                yAxisSuffix=" GB"
              />

              <View
                style={[
                  chartStyles.insightBox,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(15, 23, 42, 0.92)"
                      : "rgba(16, 185, 129, 0.06)",
                    borderColor: theme.dark
                      ? "rgba(148, 163, 184, 0.16)"
                      : "rgba(16, 185, 129, 0.18)",
                  },
                ]}
              >
                <Text
                  style={[
                    chartStyles.insightTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Lectura Ejecutiva de Demanda
                </Text>
                <View style={chartStyles.insightRow}>
                  <Text
                    style={[
                      chartStyles.insightLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Tráfico Total Combinado
                  </Text>
                  <Text
                    style={[chartStyles.insightValue, { color: "#10b981" }]}
                  >
                    {totalBandwidth} GB
                  </Text>
                </View>
                <View style={chartStyles.insightRow}>
                  <Text
                    style={[
                      chartStyles.insightLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Tasa de Usuarios con Actividad
                  </Text>
                  <Text
                    style={[chartStyles.insightValue, { color: "#0284c7" }]}
                  >
                    {activePercent}% ({consumptionKpis.activeUsers} de{" "}
                    {consumptionKpis.totalUsers})
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {selectedView === "vpn" ? (
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
                badge={periodInfo.label}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  propsForDots: {
                    ...chartConfig.propsForDots,
                    stroke: "#10b981",
                  },
                }}
                data={{
                  datasets: [{ data: vpnValues }],
                  labels: lineLabels,
                }}
                emptyCopy="No hay registros de tráfico VPN en este intervalo."
                emptyTitle="VPN sin transferencias"
                formatTooltipValue={(val) => `${Number(val || 0).toFixed(2)} GB`}
                height={230}
                icon="shield-check"
                iconBg="#10b981"
                title="Tráfico por Túnel VPN"
                yAxisSuffix=" GB"
              />
            </Card.Content>
          </Card>
        ) : null}

        {selectedView === "proxy" ? (
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
                badge={periodInfo.label}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
                  propsForDots: {
                    ...chartConfig.propsForDots,
                    stroke: "#0284c7",
                  },
                }}
                data={{
                  datasets: [{ data: proxyValues }],
                  labels: lineLabels,
                }}
                emptyCopy="No hay registros de tráfico Proxy en este intervalo."
                emptyTitle="Proxy sin transferencias"
                formatTooltipValue={(val) => `${Number(val || 0).toFixed(2)} GB`}
                height={230}
                icon="wifi"
                iconBg="#0284c7"
                title="Tráfico por Conexión Proxy"
                yAxisSuffix=" GB"
              />
            </Card.Content>
          </Card>
        ) : null}

        {selectedView === "ventas" ? (
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
              {activeType === "DIARIO" ? (
                <View
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) setBarChartWidth(Math.floor(w));
                  }}
                >
                  <View style={chartStyles.header}>
                    <View style={chartStyles.titleRow}>
                      <View
                        style={[
                          chartStyles.icon,
                          { backgroundColor: "#f59e0b" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color="#ffffff"
                          name="account-group"
                          size={20}
                        />
                      </View>
                      <Text
                        style={[
                          chartStyles.title,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Rendimiento por Distribuidor (Mes Actual)
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
                    Toca un distribuidor para inspeccionar comisiones y cobranza
                  </Text>

                  {ventasSummary.adminDetails.length > 0 ? (
                    <>
                      <ScrollView
                        contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {ventasSummary.adminDetails.map((item) => {
                          const isSelected =
                            selectedAdmin &&
                            selectedAdmin.adminId === item.adminId;
                          return (
                            <Pressable
                              key={item.adminId}
                              onPress={() => {
                                safeHaptic();
                                setSelectedAdminId(item.adminId);
                              }}
                              style={{
                                alignItems: "center",
                                backgroundColor: isSelected
                                  ? theme.colors.primary
                                  : theme.dark
                                    ? "rgba(30, 41, 59, 0.8)"
                                    : "rgba(241, 245, 249, 0.9)",
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isSelected
                                  ? theme.colors.primary
                                  : theme.dark
                                    ? "rgba(148, 163, 184, 0.2)"
                                    : "rgba(15, 23, 42, 0.08)",
                                flexDirection: "row",
                                gap: 6,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                              }}
                            >
                              <MaterialCommunityIcons
                                color={
                                  isSelected ? "#ffffff" : theme.colors.primary
                                }
                                name="account-circle"
                                size={16}
                              />
                              <Text
                                style={{
                                  color: isSelected
                                    ? "#ffffff"
                                    : theme.colors.onSurface,
                                  fontSize: 12,
                                  fontWeight: isSelected ? "800" : "600",
                                }}
                              >
                                {item.shortLabel}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      {selectedAdmin ? (
                        <View
                          style={[
                            chartStyles.insightBox,
                            {
                              backgroundColor: theme.dark
                                ? "rgba(15, 23, 42, 0.9)"
                                : "rgba(245, 158, 11, 0.08)",
                              borderColor: theme.dark
                                ? "rgba(148, 163, 184, 0.2)"
                                : "rgba(245, 158, 11, 0.2)",
                              marginVertical: 10,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              chartStyles.insightTitle,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Distribuidor: {selectedAdmin.fullName}
                          </Text>
                          <View style={chartStyles.insightRow}>
                            <Text
                              style={[
                                chartStyles.insightLabel,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              Facturación Generada
                            </Text>
                            <Text
                              style={[
                                chartStyles.insightValue,
                                { color: "#10b981" },
                              ]}
                            >
                              {formatCurrency(selectedAdmin.totalVendido)}
                            </Text>
                          </View>
                          <View style={chartStyles.insightRow}>
                            <Text
                              style={[
                                chartStyles.insightLabel,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              Comisión Ganada
                            </Text>
                            <Text
                              style={[
                                chartStyles.insightValue,
                                { color: "#0284c7" },
                              ]}
                            >
                              {formatCurrency(selectedAdmin.ganancias)}
                            </Text>
                          </View>
                          <View style={chartStyles.insightRow}>
                            <Text
                              style={[
                                chartStyles.insightLabel,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              Cartera Pendiente
                            </Text>
                            <Text
                              style={[
                                chartStyles.insightValue,
                                { color: "#ef4444" },
                              ]}
                            >
                              {formatCurrency(selectedAdmin.deudas)}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {barChartWidth > 0 ? (
                        <BarChart
                          chartConfig={{
                            ...chartConfig,
                            barPercentage: 0.7,
                          }}
                          data={{
                            datasets: [
                              {
                                color: (opacity = 1) =>
                                  `rgba(16, 185, 129, ${opacity})`,
                                data: ventasSummary.ventasPorAdminMesActual.map(
                                  (item) => item.totalVendido,
                                ),
                              },
                              {
                                color: (opacity = 1) =>
                                  `rgba(2, 132, 199, ${opacity})`,
                                data: ventasSummary.ventasPorAdminMesActual.map(
                                  (item) => item.ganancias,
                                ),
                              },
                              {
                                color: (opacity = 1) =>
                                  `rgba(239, 68, 68, ${opacity})`,
                                data: ventasSummary.ventasPorAdminMesActual.map(
                                  (item) => item.deudas,
                                ),
                              },
                            ],
                            labels: ventasSummary.adminLabels,
                          }}
                          fromZero
                          height={230}
                          showValuesOnTopOfBars={false}
                          style={chartStyles.chart}
                          width={Math.max(barChartWidth, 260)}
                          yAxisLabel="$"
                        />
                      ) : null}

                      <View
                        style={[
                          chartStyles.insightBox,
                          {
                            backgroundColor: theme.dark
                              ? "rgba(15, 23, 42, 0.92)"
                              : "rgba(16, 185, 129, 0.06)",
                            borderColor: theme.dark
                              ? "rgba(148, 163, 184, 0.16)"
                              : "rgba(16, 185, 129, 0.18)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            chartStyles.insightTitle,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Balance Total del Mes
                        </Text>
                        <View style={chartStyles.insightRow}>
                          <Text
                            style={[
                              chartStyles.insightLabel,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Facturación Plataforma
                          </Text>
                          <Text
                            style={[
                              chartStyles.insightValue,
                              { color: "#10b981" },
                            ]}
                          >
                            {formatCurrency(
                              ventasSummary.totalCobradoMesActual,
                            )}
                          </Text>
                        </View>
                        <View style={chartStyles.insightRow}>
                          <Text
                            style={[
                              chartStyles.insightLabel,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Comisiones Totales
                          </Text>
                          <Text
                            style={[
                              chartStyles.insightValue,
                              { color: "#0284c7" },
                            ]}
                          >
                            {formatCurrency(
                              ventasSummary.totalGananciasMesActual,
                            )}
                          </Text>
                        </View>
                        <View style={chartStyles.insightRow}>
                          <Text
                            style={[
                              chartStyles.insightLabel,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Cartera Pendiente
                          </Text>
                          <Text
                            style={[
                              chartStyles.insightValue,
                              { color: "#ef4444" },
                            ]}
                          >
                            {formatCurrency(
                              ventasSummary.totalDeudasMesActual,
                            )}
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
                        name="account-off-outline"
                        size={32}
                      />
                      <Text
                        style={[
                          chartStyles.chartEmptyTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Sin operaciones este mes
                      </Text>
                      <Text
                        style={[
                          chartStyles.chartEmptyText,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        No hay registros de distribuidores con ventas en el mes
                        en curso.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <InteractiveChart
                    badge="Últimos 12 Meses"
                    chartConfig={chartConfig}
                    data={{
                      datasets: [
                        {
                          color: (opacity = 1) =>
                            `rgba(16, 185, 129, ${opacity})`,
                          data: ventasSummary.totalVendido12Meses,
                          strokeWidth: 3,
                        },
                        {
                          color: (opacity = 1) =>
                            `rgba(2, 132, 199, ${opacity})`,
                          data: ventasSummary.ganancias12Meses,
                          strokeWidth: 3,
                        },
                      ],
                      labels: ventasSummary.ventasLabels,
                      legend: ["Total Facturado", "Comisiones Distribuidores"],
                    }}
                    emptyCopy="Aún no hay suficientes periodos registrados para trazar la tendencia anual."
                    emptyTitle="Sin histórico comercial"
                    formatTooltipValue={(val) => formatCurrency(val)}
                    height={230}
                    icon="currency-usd"
                    iconBg="#f59e0b"
                    title="Evolución Comercial (Últimos 12 Meses)"
                    yAxisLabel="$"
                  />

                  <View
                    style={[
                      chartStyles.insightBox,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(15, 23, 42, 0.92)"
                          : "rgba(245, 158, 11, 0.06)",
                        borderColor: theme.dark
                          ? "rgba(148, 163, 184, 0.16)"
                          : "rgba(245, 158, 11, 0.18)",
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
                      Rendimiento Consolidado (12 Meses)
                    </Text>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Facturado 12 Meses
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#10b981" }]}
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
                        Comisiones Pagadas
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#0284c7" }]}
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
                        Promedio Mensual
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#f59e0b" }]}
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
                        { color: theme.colors.onSurface, marginTop: 12 },
                      ]}
                    >
                      Acumulado Histórico Global
                    </Text>
                    <View style={chartStyles.insightRow}>
                      <Text
                        style={[
                          chartStyles.insightLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Total Facturado Histórico
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#10b981" }]}
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
                        Comisiones Históricas
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#0284c7" }]}
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
                        Cartera Histórica Pendiente
                      </Text>
                      <Text
                        style={[chartStyles.insightValue, { color: "#ef4444" }]}
                      >
                        {formatCurrency(ventasSummary.totalDeudasHistoricas)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        ) : null}
      </Animated.View>
    </View>
  );
};

export default DashBoardPrincipal;
