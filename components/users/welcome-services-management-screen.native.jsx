import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { NestableScrollContainer } from "react-native-draggable-flatlist";
import { Surface, Text, useTheme } from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import WelcomeServicesCard from "./componentsUserDetails/WelcomeServicesCard.native";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (MeteorBase);
const SERVICE_USER_FIELDS = { _id: 1, username: 1, serviciosInicio: 1 };

const WelcomeServicesManagementScreen = ({ profileRoute, headerBackgroundColor }) => {
  const theme = useTheme();
  const router = useRouter();
  const headerInset = useAppHeaderContentInset();
  const params = useLocalSearchParams();
  const rawItemId = Array.isArray(params.item) ? params.item[0] : params.item;
  const itemId = typeof rawItemId === "string" ? rawItemId : "";
  const currentUser = Meteor.useTracker(() => Meteor.user(), []);
  const isAdmin = currentUser?.profile?.role === "admin"
    || String(currentUser?.username || "").toLowerCase() === "carlosmbinf";

  const { item, loading } = Meteor.useTracker(() => {
    if (!isAdmin || !itemId) return { item: null, loading: false };
    const handle = Meteor.subscribe("user", { _id: itemId }, { fields: SERVICE_USER_FIELDS });
    return {
      item: Meteor.users.findOne(itemId, { fields: SERVICE_USER_FIELDS }) || null,
      loading: !handle.ready(),
    };
  }, [isAdmin, itemId]);

  const profileHref = itemId
    ? `${profileRoute}?item=${encodeURIComponent(itemId)}`
    : profileRoute;
  const backgroundColor = theme.dark ? "#020617" : "#eef3fb";

  return (
    <Surface style={[ui.screen, { backgroundColor }]}>
      <AppHeader
        backgroundColor={headerBackgroundColor}
        backHref={profileHref}
        overlapContent
        showBackButton
        subtitle={item ? `Configuración para @${item.username || "usuario"}` : "Personalización de portada"}
        title="Servicios"
      />
      <NestableScrollContainer
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[ui.content, { paddingTop: headerInset + 16 }]}
      >
        {!isAdmin ? (
          <Surface elevation={0} style={[ui.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <Text selectable style={{ color: theme.colors.onSurface, fontWeight: "800" }} variant="titleMedium">
              Acceso reservado a administradores
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }} variant="bodyMedium">
              Solo un administrador puede cambiar los servicios de bienvenida de una cuenta.
            </Text>
          </Surface>
        ) : loading ? (
          <Surface elevation={0} style={[ui.stateCard, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodyMedium">Cargando configuración de servicios…</Text>
          </Surface>
        ) : item ? (
          <>
            <Surface elevation={0} style={[ui.introCard, { backgroundColor: theme.dark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.92)", borderColor: theme.colors.outlineVariant }]}>
              <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.7 }} variant="labelMedium">
                EXPERIENCIA DE INICIO
              </Text>
              <Text style={{ color: theme.colors.onSurface, fontWeight: "900" }} variant="headlineSmall">
                Organiza los servicios
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 21 }} variant="bodyMedium">
                Cambia el orden arrastrando cada fila y decide qué secciones aparecen en la bienvenida de @{item.username || "este usuario"}.
              </Text>
            </Surface>
            <WelcomeServicesCard
              accentColor={theme.colors.primary}
              item={item}
              onOpenCommerceCategories={() => router.push({
                pathname: profileRoute.replace(/\/User$/, "/UserCommerceCategories"),
                params: { item: itemId },
              })}
            />
          </>
        ) : (
          <Surface elevation={0} style={[ui.stateCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: "800" }} variant="titleMedium">
              No se encontró el usuario
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodyMedium">
              Vuelve al perfil y abre la configuración de servicios nuevamente.
            </Text>
          </Surface>
        )}
      </NestableScrollContainer>
    </Surface>
  );
};

const ui = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 16, paddingBottom: 28, paddingHorizontal: 16 },
  introCard: { borderRadius: 22, borderWidth: 1, gap: 8, padding: 18 },
  stateCard: { alignItems: "center", borderColor: "transparent", borderRadius: 20, borderWidth: 1, gap: 12, justifyContent: "center", minHeight: 176, padding: 24 },
});

export default WelcomeServicesManagementScreen;
