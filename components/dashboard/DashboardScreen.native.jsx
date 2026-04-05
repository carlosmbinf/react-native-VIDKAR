import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Card, Chip, IconButton, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../Header/AppHeader";
import DashBoardPrincipal from "./DashBoardPrincipal.native";
import RechargeProfitCard from "./RechargeProfitCard.native";
import { dashboardScreenStyles } from "./styles/dashboardStyles";

const DashboardScreen = () => {
  const theme = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);

  const screenBackground = theme.dark ? "#020617" : "#f8fafc";
  const heroBackground = theme.dark
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(255, 255, 255, 0.96)";

  const triggerRefresh = React.useCallback(() => {
    setRefreshing(true);
    setRefreshToken(Date.now());
    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, []);

  return (
    <SafeAreaView
      style={[
        dashboardScreenStyles.safeArea,
        { backgroundColor: screenBackground },
      ]}
      edges={[]}
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
        showBackButton
        subtitle="Consumo agregado y ventas administrativas"
        title="Dashboard"
      />

      <ScrollView
        contentContainerStyle={dashboardScreenStyles.scrollContent}
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
            { backgroundColor: heroBackground },
          ]}
        >
          <Card.Content style={dashboardScreenStyles.heroContent}>
            <Text
              style={[
                dashboardScreenStyles.heroEyebrow,
                { color: theme.colors.primary },
              ]}
            >
              Vista consolidada
            </Text>
            <Text
              style={[
                dashboardScreenStyles.heroTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              Consumo por periodo y analitica de ventas en una sola superficie.
            </Text>
            <Text
              style={[
                dashboardScreenStyles.heroSubtitle,
                { color: theme.colors.onSurface },
              ]}
            >
              Esta ruta replica la pantalla legacy completa: tres bloques
              consecutivos (`HORA`, `DIARIO`, `MENSUAL`) alimentados por el
              metodo de dashboard y por la coleccion reactiva de ventas.
            </Text>
            <View style={dashboardScreenStyles.heroChips}>
              <Chip
                icon="database-outline"
                style={{
                  backgroundColor: theme.dark
                    ? "rgba(59, 130, 246, 0.22)"
                    : "rgba(59, 130, 246, 0.14)",
                }}
                textStyle={{
                  color: theme.dark ? "#dbeafe" : "#1d4ed8",
                  fontWeight: "800",
                }}
              >
                getDatosDashboardByUser
              </Chip>
              <Chip
                icon="cash-multiple"
                style={{
                  backgroundColor: theme.dark
                    ? "rgba(34, 197, 94, 0.22)"
                    : "rgba(34, 197, 94, 0.14)",
                }}
                textStyle={{
                  color: theme.dark ? "#dcfce7" : "#15803d",
                  fontWeight: "800",
                }}
              >
                Ventas reactivas
              </Chip>
              <Chip
                icon="account-group-outline"
                style={{
                  backgroundColor: theme.dark
                    ? "rgba(168, 85, 247, 0.22)"
                    : "rgba(168, 85, 247, 0.14)",
                }}
                textStyle={{
                  color: theme.dark ? "#f3e8ff" : "#7e22ce",
                  fontWeight: "800",
                }}
              >
                Meteor.users
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <RechargeProfitCard refreshToken={refreshToken} />
        <DashBoardPrincipal refreshToken={refreshToken} type="HORA" />
        <DashBoardPrincipal refreshToken={refreshToken} type="DIARIO" />
        <DashBoardPrincipal refreshToken={refreshToken} type="MENSUAL" />

        <View
          style={{
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 10,
          }}
        >
          <MaterialCommunityIcons
            color={theme.dark ? "#475569" : "#94a3b8"}
            name="chart-timeline-variant"
            size={22}
          />
          <Text
            style={{
              color: theme.colors.onSurface,
              fontSize: 12,
              lineHeight: 18,
              marginTop: 8,
              opacity: 0.68,
              textAlign: "center",
            }}
          >
            La vista de ventas solo se habilita donde el legacy realmente la
            mostraba: fuera del bloque horario y para el usuario administrador
            principal.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;
