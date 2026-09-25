import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Avatar, Button, Card, Chip, ProgressBar, Text, useTheme } from "react-native-paper";

import { authorizeMCPPlayback, consumeMCPPlaybackAuthorization, executeMCPTool } from "../../services/mcp/mcpClient";
import { resolveUniversalLink } from "../../services/navigation/universalLinks";

const Meteor = MeteorBase;
const PRIVATE_ENTITY_TYPES = new Set(["user", "purchase", "sale", "order", "message", "subscription", "lesson"]);
const PLAYBACK_ENTITY_TYPES = new Set(["movie", "episode", "lesson"]);
const asString = (value) => Array.isArray(value) ? value[0] || "" : String(value || "");
const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_MB = 1024 * 1024;

const getInitials = (value) => String(value || "U").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
const formatGB = (bytes) => (Math.max(0, Number(bytes) || 0) / BYTES_PER_GB).toFixed(1);
const formatExpiry = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("es-ES") : null;
};

const UserServiceSummary = ({ label, service, theme }) => {
  const active = service?.active === true;
  const unlimited = service?.unlimited === true;
  const usedBytes = Math.max(0, Number(service?.usedBytes) || 0);
  const limitMB = Math.max(0, Number(service?.limitMB) || 0);
  const limitBytes = limitMB * BYTES_PER_MB;
  const progress = active && !unlimited && limitBytes > 0
    ? Math.max(0, Math.min(1, usedBytes / limitBytes))
    : 0;
  const expiry = active ? formatExpiry(service?.expiresAt) : null;
  const statusColor = active
    ? theme.dark ? "#86efac" : "#15803d"
    : theme.dark ? "#cbd5e1" : "#64748b";
  const softSurface = theme.dark ? "rgba(15, 23, 42, 0.62)" : "#f8fafc";
  const borderColor = theme.dark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.08)";
  const textColor = theme.dark ? "#f8fafc" : "#0f172a";
  const mutedColor = theme.dark ? "#94a3b8" : "#64748b";
  const usage = active
    ? unlimited
      ? `${formatGB(usedBytes)} GB usados · Ilimitado`
      : limitMB > 0
        ? `${formatGB(usedBytes)} / ${(limitMB / 1024).toFixed(1)} GB`
        : `${formatGB(usedBytes)} GB usados`
    : usedBytes > 0
      ? `${formatGB(usedBytes)} GB de uso registrado`
      : "Sin consumo registrado";

  return (
    <View style={[styles.serviceSummary, { backgroundColor: softSurface, borderColor }]}>
      <View style={styles.serviceSummaryHeader}>
        <Text variant="labelLarge" style={[styles.serviceName, { color: textColor }]}>{label}</Text>
        <Text variant="labelSmall" style={{ color: statusColor }}>{active ? "ACTIVO" : "INACTIVO"}</Text>
      </View>
      <Text selectable variant="bodySmall" style={[styles.serviceUsage, { color: textColor }]}>{usage}</Text>
      {active && !unlimited && limitMB > 0 ? (
        <ProgressBar progress={progress} color={label === "VPN" ? "#2e7d32" : "#1565c0"} style={styles.serviceProgress} />
      ) : null}
      {label === "VPN" && active ? (
        <Text variant="labelSmall" style={{ color: mutedColor }}>{service?.connected ? "Conectada" : "Sin conexión"}</Text>
      ) : null}
      {expiry ? <Text variant="labelSmall" style={{ color: mutedColor }}>Vence {expiry}</Text> : null}
    </View>
  );
};

const UserSearchResultCard = ({ item, onPress, theme }) => {
  const titleColor = theme.dark ? "#f8fafc" : "#0f172a";
  const mutedColor = theme.dark ? "#94a3b8" : "#64748b";
  const createdAt = formatExpiry(item.createdAt);
  const avatar = item.imageUrl
    ? <Avatar.Image size={58} source={{ uri: item.imageUrl }} accessibilityLabel={`Foto de ${item.title || "usuario"}`} />
    : <Avatar.Text size={58} label={getInitials(item.title)} />;

  return (
    <Pressable
      accessibilityHint="Abre el perfil de este usuario en VIDKAR"
      accessibilityLabel={`Abrir perfil de ${item.title || item.subtitle || "usuario"}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.userCardPressable, pressed ? styles.userCardPressed : null]}
    >
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.userCardContent}>
          <View style={styles.userHeader}>
            {avatar}
            <View style={styles.userIdentity}>
              <Text selectable variant="titleMedium" numberOfLines={1} style={{ color: titleColor }}>{item.title || "Usuario VIDKAR"}</Text>
              <Text selectable variant="bodyMedium" numberOfLines={1} style={{ color: mutedColor }}>{item.subtitle}</Text>
              <Chip compact icon="account-outline" style={styles.roleChip} textStyle={styles.roleChipText}>{item.role || "Usuario"}</Chip>
            </View>
            <Text accessibilityElementsHidden style={[styles.userChevron, { color: mutedColor }]}>›</Text>
          </View>
          <View style={styles.serviceSummaryGrid}>
            <UserServiceSummary label="PROXY" service={item.serviceUsage?.proxy} theme={theme} />
            <UserServiceSummary label="VPN" service={item.serviceUsage?.vpn} theme={theme} />
          </View>
          <View style={styles.profileLinkRow}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Toca para abrir el perfil</Text>
            <Text variant="labelSmall" style={{ color: mutedColor }}>{createdAt ? `Desde ${createdAt}` : "Perfil VIDKAR"}</Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
};

const requestPrivateConfirmation = () => new Promise((resolve) => {
  Alert.alert(
    "Información privada",
    "Esta consulta accederá a información privada de tu cuenta. ¿Quieres continuar?",
    [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Continuar", onPress: () => resolve(true) },
    ],
    { cancelable: true, onDismiss: () => resolve(false) },
  );
});

const requestPlaybackConfirmation = (title) => new Promise((resolve) => {
  Alert.alert(
    "Iniciar reproducción",
    `La reproducción de “${title}” puede consumir recursos. ¿Quieres continuar?`,
    [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Reproducir", onPress: () => resolve(true) },
    ],
    { cancelable: true, onDismiss: () => resolve(false) },
  );
});

export default function SiriSearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const query = asString(params.query);
  const entityType = asString(params.entityType) || "all";
  const contentId = asString(params.contentId || params.productId);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [pagination, setPagination] = React.useState(null);
  const privateConfirmedRef = React.useRef(false);

  const loadResults = React.useCallback(async ({ offset = 0, append = false } = {}) => {
    setLoading(true);
    setError("");
    if (!append) {
      setResults([]);
      setPagination(null);
    }
    try {
      if (!Meteor.userId()) throw new Error("Inicia sesión en VIDKAR para continuar.");
      if (!query.trim() && !PRIVATE_ENTITY_TYPES.has(entityType)) {
        throw new Error("No se recibió un texto de búsqueda válido.");
      }
      let confirmed = PRIVATE_ENTITY_TYPES.has(entityType) && privateConfirmedRef.current;
      if (PRIVATE_ENTITY_TYPES.has(entityType) && !confirmed) {
        confirmed = await requestPrivateConfirmation();
        if (confirmed) privateConfirmedRef.current = true;
      }
      if (PRIVATE_ENTITY_TYPES.has(entityType) && !confirmed) {
        setError("Consulta cancelada; no se accedió a tus datos privados.");
        setLoading(false);
        return;
      }
      const raw = await executeMCPTool("search_entities", {
        entity: entityType,
        query,
        limit: 20,
        offset,
        confirmed,
      });
      const response = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!response?.success) {
        throw new Error(response?.error?.message || "No se pudo completar la búsqueda en VIDKAR.");
      }
      let nextResults = Array.isArray(response.results) ? response.results : [];
      if (contentId) {
        nextResults = nextResults.filter((item) => (
          String(item.id) === contentId || String(item.id).endsWith(`:${contentId}`)
        ));
      }
      setResults((current) => append
        ? [...current, ...nextResults.filter((item) => !current.some((entry) => entry.id === item.id))]
        : nextResults);
      setPagination(response.pagination || null);
    } catch (searchError) {
      setError(searchError?.reason || searchError?.message || "No se pudo completar la búsqueda en VIDKAR.");
    } finally {
      setLoading(false);
    }
  }, [contentId, entityType, query]);

  React.useEffect(() => {
    privateConfirmedRef.current = false;
    loadResults({ offset: 0, append: false });
  }, [loadResults]);

  const loadMore = () => {
    if (loading || !pagination?.hasMore) return;
    loadResults({ offset: pagination.offset + pagination.limit, append: true });
  };

  const openResult = async (item) => {
    let deepLink = item?.deepLink || "";
    if (PLAYBACK_ENTITY_TYPES.has(item?.type)) {
      const confirmed = await requestPlaybackConfirmation(item?.title || "este contenido");
      if (!confirmed) return;
      try {
        await authorizeMCPPlayback(item.type, String(item.id));
        const playbackAuthorized = await consumeMCPPlaybackAuthorization(item.type, String(item.id));
        if (!playbackAuthorized) throw new Error("La autorización de reproducción venció. Vuelve a confirmar.");
      } catch (authorizationError) {
        Alert.alert("VIDKAR", authorizationError?.message || "No se pudo autorizar la reproducción.");
        return;
      }
      try {
        const url = new URL(deepLink);
        url.searchParams.set("play", "true");
        deepLink = url.toString();
      } catch {
        Alert.alert("VIDKAR", "El enlace del resultado no es válido.");
        return;
      }
    }
    const target = resolveUniversalLink(deepLink);
    if (!target) {
      Alert.alert("VIDKAR", "No hay una pantalla disponible para abrir este resultado.");
      return;
    }
    router.push({ pathname: target.pathname, params: target.params });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Buscar en VIDKAR" subtitle={query || entityType} />
        <Appbar.Action icon="refresh" onPress={() => loadResults({ offset: 0, append: false })} disabled={loading} accessibilityLabel="Actualizar búsqueda" />
      </Appbar.Header>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={results}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        ListHeaderComponent={pagination?.total > 0 ? (
          <Text selectable variant="bodySmall" style={styles.count}>
            {`Encontré ${pagination.total} resultado${pagination.total === 1 ? "" : "s"}.`}
          </Text>
        ) : null}
        ListEmptyComponent={loading ? (
          <View style={styles.state}>
            <ActivityIndicator animating />
            <Text selectable>Buscando en VIDKAR…</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text selectable variant="bodyMedium">{error}</Text>
            <Button mode="outlined" onPress={loadResults}>Reintentar</Button>
          </View>
        ) : (
          <View style={styles.state}>
            <Text selectable variant="bodyMedium">No encontré resultados para esa búsqueda en VIDKAR.</Text>
          </View>
        )}
        ListFooterComponent={pagination?.hasMore ? (
          <Button mode="outlined" onPress={loadMore} disabled={loading} style={styles.moreButton}>
            {loading ? "Cargando…" : "Cargar más resultados"}
          </Button>
        ) : null}
        renderItem={({ item }) => item.type === "user" ? (
          <UserSearchResultCard item={item} onPress={openResult} theme={theme} />
        ) : (
          <Card mode="outlined" style={styles.card}>
            {item.imageUrl ? <Card.Cover source={{ uri: item.imageUrl }} accessibilityLabel={`Imagen de ${item.title || "contenido"}`} /> : null}
            <Card.Content style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text variant="labelSmall" style={styles.kind}>{String(item.type || "").toUpperCase()}</Text>
              </View>
              <Text selectable variant="titleMedium">{item.title || "VIDKAR"}</Text>
              {item.subtitle ? <Text selectable variant="bodyMedium">{item.subtitle}</Text> : null}
              {item.description ? <Text selectable variant="bodySmall" numberOfLines={3}>{item.description}</Text> : null}
              <Button compact mode="text" onPress={() => openResult(item)} contentStyle={styles.openButton}>
                Abrir en VIDKAR
              </Button>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, gap: 10, padding: 16 },
  count: { opacity: 0.72, paddingBottom: 4 },
  state: { alignItems: "center", gap: 14, justifyContent: "center", minHeight: 220, padding: 24 },
  card: { marginBottom: 4 },
  cardContent: { gap: 6 },
  userCardPressable: { borderRadius: 14 },
  userCardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  userCardContent: { gap: 14, paddingVertical: 16 },
  userHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  userIdentity: { flex: 1, gap: 3, minWidth: 0 },
  userChevron: { fontSize: 28, fontWeight: "600", paddingLeft: 4 },
  roleChip: { alignSelf: "flex-start", height: 28 },
  roleChipText: { fontSize: 11, fontWeight: "700" },
  serviceSummaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceSummary: { borderRadius: 14, borderWidth: 1, flexBasis: 150, flexGrow: 1, gap: 7, padding: 12 },
  serviceSummaryHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 },
  serviceName: { fontWeight: "800", letterSpacing: 0.4 },
  serviceUsage: { fontWeight: "700" },
  serviceProgress: { borderRadius: 999, height: 6 },
  profileLinkRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 },
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kind: { letterSpacing: 0.7, opacity: 0.68 },
  openButton: { alignSelf: "flex-start" },
  moreButton: { marginVertical: 12 },
});
