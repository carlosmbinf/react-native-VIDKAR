import { MaterialCommunityIcons } from "@expo/vector-icons";
import MeteorBase from "@meteorrn/core";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  UIManager,
  View,
} from "react-native";
import { Card, IconButton, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import DashBoardPrincipal from "./DashBoardPrincipal.native";
import RechargeProfitCard from "./RechargeProfitCard.native";
import { dashboardScreenStyles } from "./styles/dashboardStyles";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const DashboardScreen = () => {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [activeDomain, setActiveDomain] = React.useState("overview");

  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const currentUser = Meteor.useTracker(() => Meteor.user());
  const isMainAdmin =
    typeof currentUser?.username === "string" &&
    currentUser.username.trim().toLowerCase() === AUTHORIZED_ANALYTICS_USERNAME;

  const screenBackground = theme.dark ? "#020617" : "#f8fafc";
  const heroBackground = theme.dark
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(255, 255, 255, 0.96)";
  const heroBorderColor = theme.dark
    ? "rgba(148, 163, 184, 0.16)"
    : "rgba(15, 23, 42, 0.08)";

  const triggerRefresh = React.useCallback(() => {
    safeHaptic();
    setRefreshing(true);
    setRefreshToken(Date.now());
    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, []);

  const handleDomainChange = (newDomain) => {
    if (newDomain === activeDomain) return;
    safeHaptic();

    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    fadeAnim.setValue(0.6);
    slideAnim.setValue(8);
    setActiveDomain(newDomain);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        duration: 220,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        friction: 8,
        tension: 80,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const domainTabs = [
    {
      icon: "view-dashboard-outline",
      key: "overview",
      label: "Resumen",
    },
    {
      icon: "swap-horizontal-bold",
      key: "traffic",
      label: "Tráfico de Red",
    },
    ...(isMainAdmin
      ? [
          {
            icon: "cash-multiple",
            key: "recharges",
            label: "Finanzas",
          },
          {
            icon: "account-group",
            key: "sales",
            label: "Distribuidores",
          },
        ]
      : []),
    {
      icon: "format-list-bulleted",
      key: "all",
      label: "Vista Completa",
    },
  ];

  return (
    <SafeAreaView
      edges={[]}
      style={[
        dashboardScreenStyles.safeArea,
        { backgroundColor: screenBackground },
      ]}
    >
      <AppHeader
        actions={
          <IconButton
            icon="refresh"
            iconColor="#ffffff"
            onPress={triggerRefresh}
          />
        }
        backHref="/(normal)/Main"
        overlapContent
        showBackButton
        subtitle="Inteligencia de negocio y rendimiento"
        title="Centro de Analítica"
      />

      <ScrollView
        contentContainerStyle={[
          dashboardScreenStyles.scrollContent,
          { paddingTop: headerInset + 12 },
        ]}
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={triggerRefresh}
            refreshing={refreshing}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card
          style={[
            dashboardScreenStyles.heroCard,
            {
              backgroundColor: heroBackground,
              borderColor: heroBorderColor,
            },
          ]}
        >
          <Card.Content style={dashboardScreenStyles.heroContent}>
            <View style={dashboardScreenStyles.heroTopRow}>
              <Text
                style={[
                  dashboardScreenStyles.heroEyebrow,
                  { color: theme.colors.primary },
                ]}
              >
                Panel Ejecutivo
              </Text>
              <View
                style={[
                  dashboardScreenStyles.heroLiveBadge,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(16, 185, 129, 0.16)"
                      : "rgba(16, 185, 129, 0.12)",
                  },
                ]}
              >
                <View
                  style={[
                    dashboardScreenStyles.heroLiveDot,
                    { backgroundColor: "#10b981" },
                  ]}
                />
                <Text
                  style={[
                    dashboardScreenStyles.heroLiveText,
                    { color: "#10b981" },
                  ]}
                >
                  En tiempo real
                </Text>
              </View>
            </View>

            <Text
              style={[
                dashboardScreenStyles.heroTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              Rendimiento Operativo y Financiero
            </Text>
            <Text
              style={[
                dashboardScreenStyles.heroSubtitle,
                { color: theme.colors.onSurface },
              ]}
            >
              Consolidación interactiva de transferencias de red, volumen
              transaccionado y balances de rentabilidad en una sola superficie.
            </Text>
          </Card.Content>
        </Card>

        <View style={dashboardScreenStyles.domainNavWrapper}>
          <ScrollView
            contentContainerStyle={dashboardScreenStyles.domainNavScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {domainTabs.map((tab) => {
              const isSelected = activeDomain === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleDomainChange(tab.key)}
                  style={[
                    dashboardScreenStyles.domainNavButton,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.dark
                          ? "rgba(15, 23, 42, 0.88)"
                          : "rgba(255, 255, 255, 0.94)",
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.dark
                          ? "rgba(148, 163, 184, 0.22)"
                          : "rgba(15, 23, 42, 0.08)",
                    },
                    isSelected && dashboardScreenStyles.domainNavButtonActive,
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
                    name={tab.icon}
                    size={18}
                  />
                  <Text
                    style={[
                      dashboardScreenStyles.domainNavText,
                      {
                        color: isSelected ? "#ffffff" : theme.colors.onSurface,
                      },
                      isSelected && dashboardScreenStyles.domainNavTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {activeDomain === "overview" ? (
            <View style={dashboardScreenStyles.overviewSection}>
              <View style={dashboardScreenStyles.overviewSectionHeader}>
                <Text
                  style={[
                    dashboardScreenStyles.overviewSectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Módulos de Análisis
                </Text>
                <Text
                  style={[
                    dashboardScreenStyles.overviewSectionSubtitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Selecciona una dimensión de datos para explorar métricas a
                  fondo.
                </Text>
              </View>

              <Pressable
                onPress={() => handleDomainChange("traffic")}
                style={[
                  dashboardScreenStyles.overviewActionCard,
                  {
                    backgroundColor: heroBackground,
                    borderColor: heroBorderColor,
                  },
                ]}
              >
                <View
                  style={[
                    dashboardScreenStyles.overviewActionIcon,
                    { backgroundColor: "rgba(16, 185, 129, 0.16)" },
                  ]}
                >
                  <MaterialCommunityIcons
                    color="#10b981"
                    name="swap-horizontal-bold"
                    size={24}
                  />
                </View>
                <View style={dashboardScreenStyles.overviewActionTextCol}>
                  <Text
                    style={[
                      dashboardScreenStyles.overviewActionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Tráfico de Red y Demanda
                  </Text>
                  <Text
                    style={[
                      dashboardScreenStyles.overviewActionDesc,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Monitorea ancho de banda por hora, día o mes entre VPN y
                    conexiones Proxy.
                  </Text>
                </View>
                <View style={dashboardScreenStyles.overviewActionArrow}>
                  <MaterialCommunityIcons
                    color={theme.dark ? "#64748b" : "#94a3b8"}
                    name="chevron-right"
                    size={22}
                  />
                </View>
              </Pressable>

              {isMainAdmin ? (
                <>
                  <Pressable
                    onPress={() => handleDomainChange("recharges")}
                    style={[
                      dashboardScreenStyles.overviewActionCard,
                      {
                        backgroundColor: heroBackground,
                        borderColor: heroBorderColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        dashboardScreenStyles.overviewActionIcon,
                        { backgroundColor: "rgba(2, 132, 199, 0.16)" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#0284c7"
                        name="cash-multiple"
                        size={24}
                      />
                    </View>
                    <View style={dashboardScreenStyles.overviewActionTextCol}>
                      <Text
                        style={[
                          dashboardScreenStyles.overviewActionTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Finanzas & Rentabilidad de Recargas
                      </Text>
                      <Text
                        style={[
                          dashboardScreenStyles.overviewActionDesc,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Consulta utilidades netas, costos de adquisición de
                        saldo, divisas y canales de cobro.
                      </Text>
                    </View>
                    <View style={dashboardScreenStyles.overviewActionArrow}>
                      <MaterialCommunityIcons
                        color={theme.dark ? "#64748b" : "#94a3b8"}
                        name="chevron-right"
                        size={22}
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDomainChange("sales")}
                    style={[
                      dashboardScreenStyles.overviewActionCard,
                      {
                        backgroundColor: heroBackground,
                        borderColor: heroBorderColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        dashboardScreenStyles.overviewActionIcon,
                        { backgroundColor: "rgba(245, 158, 11, 0.16)" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#f59e0b"
                        name="account-group"
                        size={24}
                      />
                    </View>
                    <View style={dashboardScreenStyles.overviewActionTextCol}>
                      <Text
                        style={[
                          dashboardScreenStyles.overviewActionTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Rendimiento de Distribuidores
                      </Text>
                      <Text
                        style={[
                          dashboardScreenStyles.overviewActionDesc,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Revisa comisiones generadas, ranking de administradores y
                        liquidaciones pendientes.
                      </Text>
                    </View>
                    <View style={dashboardScreenStyles.overviewActionArrow}>
                      <MaterialCommunityIcons
                        color={theme.dark ? "#64748b" : "#94a3b8"}
                        name="chevron-right"
                        size={22}
                      />
                    </View>
                  </Pressable>
                </>
              ) : null}

              <DashBoardPrincipal
                allowPeriodSwitch={true}
                refreshToken={refreshToken}
                type="DIARIO"
              />
            </View>
          ) : null}

          {activeDomain === "traffic" ? (
            <DashBoardPrincipal
              allowPeriodSwitch={true}
              refreshToken={refreshToken}
              type="DIARIO"
            />
          ) : null}

          {activeDomain === "recharges" && isMainAdmin ? (
            <RechargeProfitCard refreshToken={refreshToken} />
          ) : null}

          {activeDomain === "sales" && isMainAdmin ? (
            <DashBoardPrincipal
              allowPeriodSwitch={true}
              refreshToken={refreshToken}
              type="DIARIO"
            />
          ) : null}

          {activeDomain === "all" ? (
            <>
              {isMainAdmin ? (
                <RechargeProfitCard refreshToken={refreshToken} />
              ) : null}
              <DashBoardPrincipal
                allowPeriodSwitch={true}
                refreshToken={refreshToken}
                type="DIARIO"
              />
            </>
          ) : null}
        </Animated.View>

        <View style={dashboardScreenStyles.footerNotice}>
          <MaterialCommunityIcons
            color={theme.dark ? "#64748b" : "#94a3b8"}
            name="shield-check-outline"
            size={16}
          />
          <Text
            style={[
              dashboardScreenStyles.footerText,
              { color: theme.colors.onSurface },
            ]}
          >
            Centro de Analítica Vidkar • Consolidación en tiempo real
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;
