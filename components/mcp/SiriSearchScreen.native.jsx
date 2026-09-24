import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Button, Card, Text, useTheme } from "react-native-paper";

import { authorizeMCPPlayback, consumeMCPPlaybackAuthorization, executeMCPTool } from "../../services/mcp/mcpClient";
import { resolveUniversalLink } from "../../services/navigation/universalLinks";

const Meteor = MeteorBase;
const PRIVATE_ENTITY_TYPES = new Set(["user", "purchase", "sale", "order", "message", "subscription", "lesson"]);
const PLAYBACK_ENTITY_TYPES = new Set(["movie", "episode", "lesson"]);
const asString = (value) => Array.isArray(value) ? value[0] || "" : String(value || "");

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
        renderItem={({ item }) => (
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
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kind: { letterSpacing: 0.7, opacity: 0.68 },
  openButton: { alignSelf: "flex-start" },
  moreButton: { marginVertical: 12 },
});
