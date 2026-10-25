import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Portal, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader, { DEFAULT_HEADER_COLOR } from "../Header/AppHeader";
import { ComercioProvisioningRequestsCollection } from "../collections/collections";
import {
  canAdminUpdateCode,
  isCodeUpdateBusy,
  isProvisioningAdmin,
  requestAdminCodeUpdate,
} from "../../services/commerceProvisioningAdmin";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const statusText = (request) => {
  if (request.codeUpdate?.status === "PENDIENTE") return "Actualización pendiente";
  if (request.codeUpdate?.status === "EN_PROGRESO") return "Actualizando código…";
  if (request.codeUpdate?.status === "COMPLETADA") return "Código actualizado";
  if (request.codeUpdate?.status === "FALLIDA") return "Falló la actualización";
  return "Disponible";
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
};

export default function CommerceProvisioningAdminScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const colors = useMemo(() => ({
    background: theme.dark ? "#020617" : "#eef3fb",
    surface: theme.dark ? "rgba(15, 23, 42, 0.94)" : "#ffffff",
    border: theme.dark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.1)",
    title: theme.dark ? "#f8fafc" : "#0f172a",
    copy: theme.dark ? "#cbd5e1" : "#475569",
    muted: theme.dark ? "#94a3b8" : "#64748b",
  }), [theme.dark]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const { user, requests, ready } = Meteor.useTracker(() => {
    const currentUser = Meteor.user?.();
    if (!isProvisioningAdmin(currentUser)) return { user: currentUser, requests: [], ready: true };
    const handle = Meteor.subscribe("comercio.provisioning.adminQueue");
    return {
      user: currentUser,
      requests: handle.ready()
        ? ComercioProvisioningRequestsCollection.find(
          { status: "COMPLETADA" },
          { sort: { createdAt: -1 }, limit: 100 },
        ).fetch()
        : [],
      ready: handle.ready(),
    };
  }, [subscriptionAttempt]);
  const isAdmin = isProvisioningAdmin(user);
  const selectedRequest = requests.find((request) => request._id === confirmation);

  const submitUpdate = async (request) => {
    if (!request || !canAdminUpdateCode(request) || busyId) return;
    setBusyId(request._id);
    setError("");
    setNotice("");
    setConfirmation(null);
    try {
      await requestAdminCodeUpdate(Meteor, request._id);
      setNotice(`Actualización solicitada para ${request.hostname}. La cola mostrará el progreso y resultado.`);
    } catch (requestError) {
      setError(requestError?.reason || requestError?.message || "No se pudo solicitar la actualización.");
    } finally {
      setBusyId("");
    }
  };

  const renderItem = ({ item }) => {
    const busy = isCodeUpdateBusy(item);
    const completedAt = item.codeUpdate?.completedAt;
    return (
      <Surface elevation={0} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons color="#60a5fa" name="storefront-outline" size={23} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: colors.title }]} variant="titleMedium">{item.displayName || "Comercio"}</Text>
            <Text style={{ color: colors.muted }} variant="bodySmall">{item.username || item.ownerId || "Propietario"}</Text>
          </View>
          <Text style={[styles.status, { color: item.codeUpdate?.status === "FALLIDA" ? "#ef4444" : busy ? "#d97706" : "#16a34a" }]} variant="labelMedium">
            {statusText(item)}
          </Text>
        </View>
        <Text style={[styles.hostname, { color: colors.title }]} variant="titleSmall">{item.hostname}</Text>
        {item.codeUpdate?.message ? <Text style={{ color: colors.copy }} variant="bodyMedium">{item.codeUpdate.message}</Text> : null}
        {item.codeUpdate?.commit ? <Text style={{ color: colors.muted }} variant="bodySmall">Revisión: {item.codeUpdate.commit.slice(0, 12)}</Text> : null}
        {completedAt ? <Text style={{ color: colors.muted }} variant="bodySmall">{formatDate(completedAt)}</Text> : null}
        <Button
          accessibilityLabel={`Actualizar código de ${item.hostname}`}
          disabled={!canAdminUpdateCode(item) || Boolean(busyId)}
          icon={busyId === item._id || busy ? "progress-clock" : "refresh"}
          loading={busyId === item._id}
          mode={canAdminUpdateCode(item) ? "contained" : "outlined"}
          onPress={() => setConfirmation(item._id)}
          style={styles.action}
        >
          {busy ? "Actualizando código…" : item.codeUpdate?.status === "FALLIDA" ? "Reintentar actualización" : "Actualizar código"}
        </Button>
      </Surface>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        backgroundColor={DEFAULT_HEADER_COLOR}
        backHref="/(normal)/Main"
        showBackButton
        subtitle="Actualiza solo el código de cada tienda"
        title="Tiendas de comercio"
      />
      {!isAdmin ? (
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <MaterialCommunityIcons color="#f59e0b" name="shield-lock-outline" size={34} />
          <Text style={{ color: colors.copy }} variant="bodyLarge">Esta operación está reservada al administrador principal.</Text>
        </View>
      ) : !ready ? (
        <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
          <ActivityIndicator />
          <Text style={{ color: colors.copy }} variant="bodyMedium">Cargando tiendas desplegadas…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
          data={requests}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Surface elevation={0} style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons color="#60a5fa" name="store-search-outline" size={32} />
            <Text style={[styles.cardTitle, { color: colors.title }]} variant="titleMedium">No hay tiendas desplegadas</Text>
            <Text style={{ color: colors.copy }} variant="bodyMedium">Las páginas completadas aparecerán aquí para que puedas solicitar su actualización.</Text>
          </Surface>}
          ListHeaderComponent={<View style={styles.headerCopy}>
            <Text style={[styles.heading, { color: colors.title }]} variant="headlineSmall">Actualización de tiendas</Text>
            <Text style={{ color: colors.copy }} variant="bodyMedium">
              La acción trae la versión más reciente de comercio-web, instala dependencias y reinicia solo la tienda elegida. No modifica sus datos, dominio, DNS, Nginx ni certificados.
            </Text>
            {error ? <Text style={styles.error} variant="bodyMedium">{error}</Text> : null}
            {notice ? <Text style={styles.success} variant="bodyMedium">{notice}</Text> : null}
          </View>}
          refreshing={false}
          style={styles.list}
          renderItem={renderItem}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
      <Portal>
        <Dialog onDismiss={() => setConfirmation(null)} visible={Boolean(selectedRequest)}>
          <Dialog.Title>Actualizar tienda</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {selectedRequest
                ? `¿Actualizar el código de ${selectedRequest.hostname}? Se instalarán dependencias y se reiniciará solo esta tienda; puede haber una interrupción breve. Si la nueva versión no responde, el provisionador intentará restaurar la anterior.`
                : ""}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmation(null)}>Cancelar</Button>
            <Button disabled={Boolean(busyId)} onPress={() => submitUpdate(selectedRequest)}>Confirmar actualización</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Button
        accessibilityLabel="Actualizar lista de tiendas"
        compact
        icon="refresh"
        onPress={() => setSubscriptionAttempt((attempt) => attempt + 1)}
        style={[styles.refresh, { marginBottom: Math.max(insets.bottom, 8) }]}
      >
        Actualizar lista
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { flex: 1 },
  content: { alignSelf: "center", gap: 12, maxWidth: 980, paddingHorizontal: 18, paddingTop: 18, width: "100%" },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", paddingHorizontal: 24 },
  headerCopy: { gap: 8, marginBottom: 6 },
  heading: { fontWeight: "800" },
  card: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  cardHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cardIcon: { alignItems: "center", backgroundColor: "rgba(96, 165, 250, 0.12)", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  cardTitle: { fontWeight: "800" },
  flex: { flex: 1, minWidth: 130 },
  status: { maxWidth: "100%" },
  hostname: { fontWeight: "700" },
  action: { alignSelf: "flex-start", maxWidth: "100%" },
  empty: { alignItems: "center", borderRadius: 18, borderWidth: 1, gap: 10, padding: 24 },
  error: { color: "#dc2626" },
  success: { color: "#16a34a" },
  refresh: { alignSelf: "flex-end", marginBottom: 8, marginRight: 16 },
});
