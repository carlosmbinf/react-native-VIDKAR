import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import React from "react";
import { Alert, AppState, FlatList, Keyboard, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Avatar, Button, Card, Chip, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader, { MENU_PRINCIPAL_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import { assertMCPQuerySession, authorizeMCPPlayback, consumeMCPPlaybackAuthorization, executeMCPTool, getMCPNaturalLanguageResult, getMCPQuerySession } from "../../services/mcp/mcpClient";
import { groupInAppSearchResults, IN_APP_SEARCH_CATEGORIES, inferInAppSearchIntent, makeInAppSearchArguments } from "../../services/mcp/inAppSearch";
import { ensureMeteorSession } from "../../services/meteor/client.native";
import { useCurrentSession } from "../../services/meteor/session.native";
import { isMCPAdmin } from "../../services/mcp/mcpAccess";
import { resolveUniversalLink } from "../../services/navigation/universalLinks";
import Loguin from "../loguin/Loguin.native";
import SiriSearchResultSection from "./SiriSearchResultSection.native";

const Meteor = MeteorBase;
const PLAYBACK_ENTITY_TYPES = new Set(["movie", "episode", "lesson"]);
const asString = (value) => Array.isArray(value) ? value[0] || "" : String(value || "");
const MAX_SNAPSHOT_TEXT = 20000;
const SNAPSHOT_CHECK_INTERVAL_MS = 5000;
const SNAPSHOT_UNAVAILABLE = "El resultado de Siri venció o ya no está autorizado. Vuelve a consultar a Siri.";

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
  const headerInset = useAppHeaderContentInset();
  const params = useLocalSearchParams();
  const { user, userId, userReady } = useCurrentSession();
  const userIsMCPAdmin = isMCPAdmin(user);
  const isFocused = useIsFocused();
  const [appState, setAppState] = React.useState(AppState.currentState);
  const isSnapshot = params.resultId !== undefined;
  const resultId = asString(params.resultId);
  const rawQuery = isSnapshot ? "" : asString(params.query);
  const rawEntityType = isSnapshot ? "all" : asString(params.entityType) || "all";
  const contentId = isSnapshot ? "" : asString(params.contentId || params.productId);
  // Siri abre la búsqueda con entity=all y la frase literal; si nombra una
  // entidad ("usuario Carlos Medina"), se selecciona su chip y se limpia el término.
  const inferred = rawEntityType === "all" && !isSnapshot && !contentId ? inferInAppSearchIntent(rawQuery) : null;
  const query = inferred ? inferred.query : rawQuery;
  const entityType = inferred ? inferred.entityType : rawEntityType;
  const [draftQuery, setDraftQuery] = React.useState(query);
  const [showLogin, setShowLogin] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [pagination, setPagination] = React.useState(null);
  const [snapshot, setSnapshot] = React.useState(null);
  const requestRef = React.useRef(0);
  const mountedRef = React.useRef(false);
  const snapshotReaderRef = React.useRef(null);
  const snapshotText = React.useMemo(() => {
    if (!snapshot || Array.isArray(snapshot.data?.results)) return null;
    const text = JSON.stringify(snapshot.data, null, 2);
    return { text: text.slice(0, MAX_SNAPSHOT_TEXT), truncated: text.length > MAX_SNAPSHOT_TEXT };
  }, [snapshot]);

  const loadResults = React.useCallback(async ({ offset = 0, append = false } = {}) => {
    if (!mountedRef.current) return;
    if (isSnapshot && snapshotReaderRef.current) return snapshotReaderRef.current();
    const requestId = ++requestRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestRef.current && Meteor.userId() === userId
      && isFocused && AppState.currentState === "active" && userIsMCPAdmin;
    setLoading(true);
    setError("");
    if (!append || isSnapshot) {
      setResults([]);
      setPagination(null);
      setSnapshot(null);
    }
    if (!userReady) return;
    if (userId && !userIsMCPAdmin) {
      setError("La búsqueda Siri y MCP está disponible solo para administradores.");
      setLoading(false);
      return;
    }
    if (!isFocused || appState !== "active") {
      setResults([]);
      setPagination(null);
      setLoading(false);
      return;
    }
    try {
      await ensureMeteorSession();
      if (!mountedRef.current) return;
      setSessionReady(true);
      if (!isCurrent() || isSnapshot) return;
      if (!userId || Meteor.userId() !== userId) throw new Error("Inicia sesión en VIDKAR para continuar.");
      if (!userIsMCPAdmin) throw new Error("La búsqueda Siri y MCP está disponible solo para administradores.");
      const args = makeInAppSearchArguments({ query, entityType, contentId, offset });
      const session = await getMCPQuerySession();
      await assertMCPQuerySession(session);
      if (!isCurrent()) return;
      if (!isCurrent()) return;
      const raw = await executeMCPTool("search_entities", args, session);
      if (!isCurrent()) return;
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
      if (isCurrent()) setError(searchError?.reason || searchError?.message || "No se pudo completar la búsqueda en VIDKAR.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [appState, contentId, entityType, isFocused, isSnapshot, query, userId, userIsMCPAdmin, userReady]);

  React.useLayoutEffect(() => { setDraftQuery(query); }, [query]);

  React.useLayoutEffect(() => {
    mountedRef.current = true;
    loadResults({ offset: 0, append: false });
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, [loadResults]);

  React.useLayoutEffect(() => {
    setAppState(AppState.currentState);
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, [isSnapshot, resultId, userId]);

  React.useLayoutEffect(() => {
    if (!isSnapshot || !sessionReady) return;
    if (userId && !userIsMCPAdmin) {
      requestRef.current += 1;
      snapshotReaderRef.current = null;
      setSnapshot(null);
      setResults([]);
      setPagination(null);
      setError("La búsqueda Siri y MCP está disponible solo para administradores.");
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    let disposed = false;
    let revoked = false;
    let checking = false;
    let expiresAt = null;
    let expiryTimer;
    let pollTimer;
    const isCurrent = () => !disposed && !revoked && mountedRef.current
      && requestId === requestRef.current && Meteor.userId() === userId;
    const clearData = () => {
      setSnapshot(null);
      setResults([]);
      setPagination(null);
      setLoading(false);
    };
    const invalidate = (message = SNAPSHOT_UNAVAILABLE) => {
      if (disposed || revoked) return;
      revoked = true;
      requestRef.current += 1;
      clearTimeout(expiryTimer);
      clearInterval(pollTimer);
      clearData();
      setError(message);
    };
    const scheduleExpiry = () => {
      clearTimeout(expiryTimer);
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) return invalidate();
      expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining, 2147483647));
    };
    const checkSnapshot = async () => {
      if (!isCurrent() || AppState.currentState !== "active" || checking) return;
      if (expiresAt !== null && expiresAt <= Date.now()) return invalidate();
      checking = true;
      try {
        // Lectura de memoria nativa: no tools, backend, inferencia ni renovación del TTL.
        const envelope = await getMCPNaturalLanguageResult(resultId);
        if (!isCurrent() || AppState.currentState !== "active") return;
        expiresAt = expiresAt === null ? envelope.expiresAt : Math.min(expiresAt, envelope.expiresAt);
        if (expiresAt <= Date.now()) return invalidate();
        scheduleExpiry();
        setSnapshot(envelope);
        setResults(Array.isArray(envelope.data?.results) ? envelope.data.results : []);
        setError("");
        setLoading(false);
      } catch (snapshotError) {
        if (isCurrent()) invalidate(snapshotError?.message || SNAPSHOT_UNAVAILABLE);
      } finally {
        checking = false;
      }
    };

    clearData();
    setError(userId ? "" : "Inicia sesión en VIDKAR para continuar.");
    if (userId && isFocused && appState === "active" && AppState.currentState === "active") {
      snapshotReaderRef.current = checkSnapshot;
      setLoading(true);
      checkSnapshot();
      pollTimer = setInterval(checkSnapshot, SNAPSHOT_CHECK_INTERVAL_MS);
    }
    return () => {
      disposed = true;
      requestRef.current += 1;
      snapshotReaderRef.current = null;
      clearTimeout(expiryTimer);
      clearInterval(pollTimer);
    };
  }, [appState, isFocused, isSnapshot, resultId, sessionReady, userId, userIsMCPAdmin]);

  const loadMore = () => {
    if (isSnapshot || loading || !pagination?.hasMore) return;
    loadResults({ offset: pagination.offset + pagination.limit, append: true });
  };

  const openResult = async (item, play = false) => {
    const requestId = requestRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestRef.current && userId
      && Meteor.userId() === userId && isFocused && AppState.currentState === "active";
    if (!isCurrent()) return;
    let deepLink = item?.deepLink || "";
    try {
      const url = new URL(deepLink);
      url.searchParams.delete("play");
      deepLink = url.toString();
    } catch {
      Alert.alert("VIDKAR", "El enlace del resultado no es válido.");
      return;
    }
    if (play && PLAYBACK_ENTITY_TYPES.has(item?.type)) {
      try {
        const session = await getMCPQuerySession();
        if (!isCurrent()) return;
        const confirmed = await requestPlaybackConfirmation(item?.title || "este contenido");
        if (!confirmed || !isCurrent()) return;
        await assertMCPQuerySession(session);
        await authorizeMCPPlayback(item.type, String(item.id), session);
        if (!isCurrent()) return;
        const playbackAuthorized = await consumeMCPPlaybackAuthorization(item.type, String(item.id));
        if (!isCurrent()) return;
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

  const search = (nextEntity = entityType, nextQuery = draftQuery) => {
    Keyboard.dismiss();
    router.setParams({ query: nextQuery, entityType: nextEntity, contentId: "", productId: "" });
    if (nextQuery === query && nextEntity === entityType && !contentId) loadResults();
  };

  if (userReady && userId && !userIsMCPAdmin) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <AppHeader
          backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
          backHref="/(normal)/Main"
          showBackButton
          subtitle="VIDKAR · ACCESO ADMINISTRATIVO"
          title="Acceso restringido"
        />
        <View style={styles.state}>
          <Avatar.Icon icon="shield-lock-outline" size={64} />
          <Text selectable variant="titleMedium">Siri y MCP están disponibles solo para administradores.</Text>
          <Button mode="contained" onPress={() => router.replace("/(normal)/Main")}>Volver a VIDKAR</Button>
        </View>
      </SafeAreaView>
    );
  }

  // El login existente conserva esta ruta y sus criterios; no crea tokens silenciosamente.
  if (sessionReady && !userId && showLogin) return <Loguin deferSessionRedirect />;

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        actions={(
          <Appbar.Action
            accessibilityLabel="Actualizar búsqueda"
            disabled={loading}
            icon="refresh"
            iconColor="#ffffff"
            onPress={() => loadResults({ offset: 0, append: false })}
          />
        )}
        backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
        backHref="/(normal)/Main"
        overlapContent
        showBackButton
        subtitle={isSnapshot ? snapshot?.query || "Resultado de Siri" : query || entityType}
        title="Buscar en VIDKAR"
      />
      <FlatList
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}
        data={isFocused && appState === "active" && userId ? groupInAppSearchResults(results) : []}
        keyExtractor={(item) => `${resultId || `${entityType}:${query}:${contentId}`}:${item.type}`}
        removeClippedSubviews={false}
        ListHeaderComponent={(
          <View style={styles.searchHeader}>
            {!isSnapshot ? <>
              <TextInput mode="outlined" label="Texto de búsqueda" accessibilityLabel="Texto de búsqueda"
                value={draftQuery} onChangeText={setDraftQuery} maxLength={120}
                returnKeyType="search" onSubmitEditing={() => search()} />
              <View style={styles.categories}>
                {IN_APP_SEARCH_CATEGORIES.map(({ value, label }) => (
                  <Chip key={value} selected={entityType === value} accessibilityRole="button"
                    accessibilityState={{ selected: entityType === value }} onPress={() => search(value)}>{label}</Chip>
                ))}
              </View>
              <Text variant="bodySmall">Elige dónde buscar. Las consultas se limitan a los datos autorizados para tu cuenta.</Text>
              <View style={styles.categories}>
                <Button mode="contained" onPress={() => search()} disabled={loading}>Buscar</Button>
                <Button mode="outlined" onPress={() => search("course", "")}>Ver todos los cursos</Button>
              </View>
              {userIsMCPAdmin ? (
                <Button mode="text" onPress={() => router.push("/(normal)/MCPSettings")}>Configurar o consultar MCP</Button>
              ) : null}
            </> : null}
            {sessionReady && !userId ? <Button mode="contained" onPress={() => setShowLogin(true)}>Iniciar sesión</Button> : null}
            {pagination?.total > 0 ? <Text selectable variant="bodySmall" style={styles.count}>
              {`Encontré ${pagination.total} resultado${pagination.total === 1 ? "" : "s"}. Elige el resultado que buscabas.`}
            </Text> : null}
            {error && results.length > 0 ? <Text accessibilityRole="alert" selectable>{error}</Text> : null}
          </View>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.state}>
            <ActivityIndicator animating />
            <Text selectable>{!sessionReady ? "Restaurando sesión…" : isSnapshot ? "Cargando resultado de Siri…" : "Buscando en VIDKAR…"}</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text selectable variant="bodyMedium">{error}</Text>
            <Button mode="outlined" onPress={loadResults}>Reintentar</Button>
          </View>
        ) : snapshotText ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text selectable variant="labelSmall">{snapshot.tool}</Text>
              <Text selectable variant="bodyMedium">{snapshot.summary}</Text>
              <Text selectable variant="bodySmall">{snapshotText.text}</Text>
              {snapshotText.truncated ? <Text selectable variant="labelSmall">Contenido truncado a {MAX_SNAPSHOT_TEXT} caracteres.</Text> : null}
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.state}>
            <Text selectable variant="bodyMedium">No encontré resultados para esa búsqueda en VIDKAR.</Text>
          </View>
        )}
        ListFooterComponent={!isSnapshot && pagination?.hasMore ? (
          <Button mode="outlined" onPress={loadMore} disabled={loading} style={styles.moreButton}>
            {loading ? "Cargando…" : "Cargar más resultados"}
          </Button>
        ) : null}
        renderItem={({ item }) => (
          <SiriSearchResultSection section={item} onOpen={openResult} onPlay={(result) => openResult(result, true)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchHeader: { gap: 10, paddingBottom: 12 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  content: { flexGrow: 1, gap: 10, padding: 16 },
  count: { opacity: 0.72, paddingBottom: 4 },
  state: { alignItems: "center", gap: 14, justifyContent: "center", minHeight: 220, padding: 24 },
  card: { marginBottom: 4 },
  cardContent: { gap: 6 },
  moreButton: { marginVertical: 12 },
});
