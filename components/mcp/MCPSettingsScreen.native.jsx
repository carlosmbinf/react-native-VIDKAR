import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Avatar, Button, Card, Chip, Divider, Surface, Text, useTheme } from "react-native-paper";
import { router } from "expo-router";

import AppHeader, { MENU_PRINCIPAL_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import { getMCPUrl } from "../../services/appUrls";
import { isMCPAdmin } from "../../services/mcp/mcpAccess";
import {
  createAndConfigureMCPToken,
  discoverMCPTools,
  getMCPAccessStatus,
  revokeMCPToken,
  refreshMCPTools,
  rotateAndConfigureMCPToken,
} from "../../services/mcp/mcpClient";
import { useCurrentSession } from "../../services/meteor/session.native";

const MCPSettingsScreen = ({
  backHref = "/(normal)/Main",
  headerBackgroundColor = MENU_PRINCIPAL_HEADER_COLOR,
}) => {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const { user, userId, userReady } = useCurrentSession();
  const adminAccess = isMCPAdmin(user);
  const [tools, setTools] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loadedToken, setLoadedToken] = useState(null);
  const [recoverableToken, setRecoverableToken] = useState(null);
  const [requiresTokenReplacement, setRequiresTokenReplacement] = useState(false);
  const [needsTokenSelection, setNeedsTokenSelection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [feedback, setFeedback] = useState(null);
  const [expandedTool, setExpandedTool] = useState("");

  const loadTools = useCallback(async (force = false) => {
    setBusy(true);
    setConnectionStatus("checking");
    setFeedback(null);
    try {
      const access = await getMCPAccessStatus();
      setTokens(access.tokens);

      if (!access.configured) {
        setLoadedToken(null);
        setRecoverableToken(access.recoverableToken || null);
        setTools([]);
        const activeTokens = access.tokens.filter((token) => !token.revokedAt);
        if (access.recoverableToken) {
          setRequiresTokenReplacement(false);
          setNeedsTokenSelection(false);
          setConnectionStatus("error");
          setFeedback({ kind: "error", message: "El token activo de esta cuenta no está conectado. Renuévalo para volver a cargarlo en este dispositivo." });
          return;
        }
        if (access.requiresTokenReplacement) {
          setRequiresTokenReplacement(true);
          setNeedsTokenSelection(activeTokens.length > 0);
          setConnectionStatus("error");
          setFeedback({ kind: "error", message: "El token guardado en este dispositivo no tiene un registro activo en el backend. Crea un reemplazo o renueva uno de los tokens de la cuenta." });
          return;
        }
        if (activeTokens.length > 0) {
          setRequiresTokenReplacement(false);
          setNeedsTokenSelection(true);
          setConnectionStatus("error");
          setFeedback({ kind: "error", message: "No se pudo identificar el token de este dispositivo. Elige un token de la cuenta para renovarlo y conectarlo aquí." });
          return;
        }
        setRequiresTokenReplacement(false);
        setNeedsTokenSelection(false);
        setConnectionStatus("provisioning");
        setFeedback({ kind: "info", message: "No hay un token cargado. Generando uno seguro para este dispositivo…" });
        await createAndConfigureMCPToken("VIDKAR iOS");
        const nextAccess = await getMCPAccessStatus();
        setTokens(nextAccess.tokens);
        setLoadedToken(nextAccess.token);
        setRecoverableToken(nextAccess.recoverableToken || null);
        setRequiresTokenReplacement(nextAccess.requiresTokenReplacement === true);
        setTools(await refreshMCPTools());
        setConnectionStatus("connected");
        setFeedback({ kind: "success", message: "Token generado y conectado automáticamente en este dispositivo." });
        return;
      }

      setNeedsTokenSelection(false);
      setLoadedToken(access.token);
      setRecoverableToken(null);
      setRequiresTokenReplacement(false);
      const nextTools = await (force ? refreshMCPTools() : discoverMCPTools());
      setTools(nextTools);
      setConnectionStatus("connected");
    } catch (error) {
      setTools([]);
      setConnectionStatus("error");
      setFeedback({
        kind: "error",
        message: error?.reason || error?.message || "No se pudo preparar el acceso MCP.",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!userReady) return;
    if (!userId) {
      router.replace("/(auth)/Loguin");
      return;
    }
    if (!adminAccess) {
      router.replace(backHref);
      return;
    }
    loadTools();
  }, [adminAccess, backHref, loadTools, userId, userReady]);

  const handleRenew = async (token = loadedToken || recoverableToken) => {
    if (!token?.tokenId || busy) return;
    setBusy(true);
    setConnectionStatus("provisioning");
    setFeedback(null);
    try {
      const rotated = await rotateAndConfigureMCPToken(token.tokenId, "VIDKAR iOS");
      const access = await getMCPAccessStatus();
      setTokens(access.tokens);
      setLoadedToken(access.token);
      setRecoverableToken(access.recoverableToken || null);
      setRequiresTokenReplacement(access.requiresTokenReplacement === true);
      setNeedsTokenSelection(false);
      setTools(await refreshMCPTools());
      setConnectionStatus("connected");
      setFeedback({
        kind: "success",
        message: rotated.replacedMissingBackendToken
          ? "El token guardado no existía en el backend. Se creó uno nuevo y se conectó en este dispositivo."
          : "Token renovado. El anterior dejó de funcionar y este dispositivo ya usa el nuevo.",
      });
    } catch (error) {
      setConnectionStatus("error");
      setFeedback({ kind: "error", message: error?.reason || error?.message || "No se pudo renovar el token MCP." });
    } finally {
      setBusy(false);
    }
  };

  const handleReplaceToken = async () => {
    if (!requiresTokenReplacement || busy) return;
    setBusy(true);
    setConnectionStatus("provisioning");
    setFeedback(null);
    try {
      await createAndConfigureMCPToken("VIDKAR iOS");
      const access = await getMCPAccessStatus();
      setTokens(access.tokens);
      setLoadedToken(access.token);
      setRecoverableToken(access.recoverableToken || null);
      setRequiresTokenReplacement(access.requiresTokenReplacement === true);
      setNeedsTokenSelection(false);
      setTools(await refreshMCPTools());
      setConnectionStatus("connected");
      setFeedback({ kind: "success", message: "Token de reemplazo creado y conectado en este dispositivo." });
    } catch (error) {
      setConnectionStatus("error");
      setFeedback({ kind: "error", message: error?.reason || error?.message || "No se pudo crear un token de reemplazo." });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (token) => {
    if (!token?.tokenId || busy) return;
    const wasLoaded = token.tokenId === loadedToken?.tokenId;
    const wasRecoverable = token.tokenId === recoverableToken?.tokenId;
    setBusy(true);
    setFeedback(null);
    try {
      await revokeMCPToken(token.tokenId);
      const access = await getMCPAccessStatus();
      setTokens(access.tokens);
      setLoadedToken(access.token);
      setRecoverableToken(access.recoverableToken || null);
      setRequiresTokenReplacement(access.requiresTokenReplacement === true);
      if (wasLoaded || wasRecoverable) {
        setTools([]);
        setConnectionStatus("idle");
      } else if (!access.configured) {
        await loadTools();
      }
      setNeedsTokenSelection(!access.configured && !access.recoverableToken
        && access.tokens.some((item) => !item.revokedAt));
      setFeedback({
        kind: "success",
        message: wasLoaded
          ? "Token revocado; también se desconectó de este dispositivo."
          : "Token antiguo revocado. Se generó automáticamente el acceso para este dispositivo.",
      });
    } catch (error) {
      setFeedback({ kind: "error", message: error?.reason || error?.message || "No se pudo revocar el token MCP." });
    } finally {
      setBusy(false);
    }
  };

  const confirmRenew = (token) => {
    Alert.alert(
      "Renovar y conectar token MCP",
      `El token “${token?.label || "Cliente MCP"}” dejará de funcionar en el otro cliente y se cargará en este dispositivo.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Renovar y conectar", onPress: () => handleRenew(token) },
      ],
    );
  };

  const confirmRevoke = (token) => {
    Alert.alert(
      "Revocar token MCP",
      token?.tokenId === loadedToken?.tokenId || token?.tokenId === recoverableToken?.tokenId
        ? "Siri dejará de usar este token en el dispositivo. Esta acción no se puede deshacer."
        : `Se revocará “${token?.label || "este token"}” en el servidor.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Revocar", style: "destructive", onPress: () => handleRevoke(token) },
      ],
    );
  };

  if (!userReady || !adminAccess) {
    return (
      <View style={[styles.screen, styles.accessCheck, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text variant="bodyMedium">Verificando acceso administrativo…</Text>
      </View>
    );
  }

  const status = connectionStatus;
  const statusLabel = status === "connected"
    ? "Conectado"
    : status === "checking"
      ? "Verificando"
      : status === "provisioning"
        ? "Creando o renovando"
      : status === "error"
        ? "Revisar conexión"
        : "Sin configurar";
  const statusIcon = status === "connected"
    ? "check-circle-outline"
    : status === "checking"
      ? "progress-clock"
      : status === "provisioning"
        ? "key-plus"
      : status === "error"
        ? "alert-circle-outline"
        : "link-variant-off";
  const statusColor = status === "error" ? theme.colors.error : theme.colors.primary;
  const deviceToken = loadedToken || recoverableToken;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        backgroundColor={headerBackgroundColor}
        backHref={backHref}
        overlapContent
        showBackButton
        subtitle="VIDKAR · ADMINISTRACIÓN"
        title="Siri y MCP"
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <Card mode="contained" style={[styles.hero, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <View style={styles.heroRow}>
              <Avatar.Icon icon="robot-outline" size={58} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
              <View style={styles.heroCopy}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>CONTROL ADMINISTRATIVO</Text>
                <Text variant="headlineSmall">Conecta Siri con VIDKAR</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Configura el acceso MCP y revisa las herramientas de solo lectura disponibles para esta cuenta.
                </Text>
              </View>
            </View>
            <Chip compact icon="shield-account-outline" style={styles.adminChip}>Solo administradores</Chip>
          </Card.Content>
        </Card>

        <Surface elevation={0} style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
          <Avatar.Icon
            icon={statusIcon}
            size={42}
            style={{ backgroundColor: theme.colors.surfaceVariant }}
            color={statusColor}
          />
          <View style={styles.statusCopy}>
            <Text variant="labelLarge">Estado del acceso</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {user?.username ? `Sesión de administrador · @${user.username}` : "Sesión administrativa de VIDKAR"}
            </Text>
          </View>
          <Chip compact icon={statusIcon} textStyle={{ color: statusColor }}>{statusLabel}</Chip>
        </Surface>

        <Card mode="outlined" style={styles.card}>
          <Card.Title title="Token de este dispositivo" subtitle="Se genera aquí y se guarda de forma segura; no tienes que copiarlo desde la web." left={(props) => <Avatar.Icon {...props} icon="key-chain-variant" />} />
          <Card.Content style={styles.formContent}>
            <View style={styles.endpoint}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>ENDPOINT MCP</Text>
              <Text selectable accessibilityLabel="Endpoint MCP de VIDKAR" variant="bodyMedium">
                {getMCPUrl() || "Configura una URL base HTTPS para habilitar MCP."}
              </Text>
            </View>
            {deviceToken ? (
              <Surface elevation={0} style={[styles.loadedToken, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Avatar.Icon icon={loadedToken ? "cellphone-key" : "key-alert-outline"} size={42} style={{ backgroundColor: theme.colors.surface }} color={theme.colors.primary} />
                <View style={styles.loadedTokenCopy}>
                  <Text variant="titleSmall">{loadedToken ? loadedToken.label || "VIDKAR iOS" : "Token listo para renovar"}</Text>
                  <Text selectable style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                    {deviceToken.tokenPreview || "Token seguro"} · {loadedToken ? "cargado en este dispositivo" : "no está conectado a este dispositivo"}
                  </Text>
                </View>
                <Chip compact icon={loadedToken ? "check-circle-outline" : "alert-circle-outline"}>{loadedToken ? "Activo" : "Renovación"}</Chip>
              </Surface>
            ) : requiresTokenReplacement ? (
              <Surface elevation={0} style={[styles.loadedToken, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Avatar.Icon icon="key-alert-outline" size={42} style={{ backgroundColor: theme.colors.surface }} color={theme.colors.error} />
                <View style={styles.loadedTokenCopy}>
                  <Text variant="titleSmall">Token local sin registro</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                    El backend no reconoce el token guardado. Puedes crear aquí uno de reemplazo.
                  </Text>
                </View>
                <Chip compact icon="alert-circle-outline">Reemplazar</Chip>
              </Surface>
            ) : (
              <Surface elevation={0} style={[styles.loadedToken, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Avatar.Icon icon="key-plus" size={42} style={{ backgroundColor: theme.colors.surface }} color={theme.colors.primary} />
                <View style={styles.loadedTokenCopy}>
                  <Text variant="titleSmall">{needsTokenSelection ? "Elige un token activo" : "Preparando acceso"}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                    {needsTokenSelection
                      ? "Renueva uno de los tokens de la cuenta para conectarlo a este dispositivo."
                      : "Si no hay un token cargado, VIDKAR crea uno automáticamente para esta instalación."}
                  </Text>
                </View>
              </Surface>
            )}
            <View style={styles.actionRow}>
              <Button
                disabled={busy || (!deviceToken?.tokenId && !requiresTokenReplacement)}
                icon="autorenew"
                loading={busy && status === "provisioning"}
                mode="contained"
                onPress={() => (requiresTokenReplacement ? handleReplaceToken() : handleRenew())}
              >
                {requiresTokenReplacement
                  ? "Crear reemplazo"
                  : recoverableToken
                    ? "Renovar y reconectar"
                    : "Renovar token"}
              </Button>
              <Button
                disabled={busy || !deviceToken}
                icon="key-remove"
                mode="outlined"
                onPress={() => confirmRevoke(deviceToken)}
                textColor={theme.colors.error}
              >
                Revocar cargado
              </Button>
            </View>
            <View style={styles.actionRow}>
              <Button disabled={busy} icon="refresh" mode="text" onPress={() => loadTools(true)}>
                Actualizar herramientas
              </Button>
            </View>
            {feedback ? (
              <Surface elevation={0} style={[styles.feedback, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text accessibilityRole={feedback.kind === "error" ? "alert" : undefined} selectable style={{ color: feedback.kind === "error" ? theme.colors.error : theme.colors.onSurface }} variant="bodySmall">
                  {feedback.message}
                </Text>
              </Surface>
            ) : null}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title="Tokens de la cuenta"
            subtitle="Puedes revocar accesos antiguos sin salir de VIDKAR."
            right={() => <Chip compact style={styles.countChip}>{tokens.filter((item) => !item.revokedAt).length}</Chip>}
          />
          <Card.Content style={styles.toolsContent}>
            {tokens.filter((item) => !item.revokedAt).length ? tokens.filter((item) => !item.revokedAt).map((item) => {
              const isLoaded = item.tokenId === loadedToken?.tokenId;
              const isRecoverable = item.tokenId === recoverableToken?.tokenId;
              return (
                <Surface elevation={0} key={item.tokenId} style={[styles.tokenRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View style={styles.toolCopy}>
                    <Text variant="titleSmall">{item.label || "Cliente MCP"}</Text>
                    <Text selectable style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                      {item.tokenPreview} · {isLoaded ? "este dispositivo" : isRecoverable ? "este dispositivo · requiere renovar" : "otro cliente"}
                    </Text>
                  </View>
                  {isLoaded ? <Chip compact icon="cellphone-key">Cargado</Chip> : null}
                  {isRecoverable ? <Chip compact icon="alert-circle-outline">Renovar</Chip> : null}
                  {needsTokenSelection ? (
                    <Button compact disabled={busy} mode="text" onPress={() => confirmRenew(item)}>
                      Renovar aquí
                    </Button>
                  ) : null}
                  <Button compact disabled={busy} mode="text" onPress={() => confirmRevoke(item)} textColor={theme.colors.error}>
                    Revocar
                  </Button>
                </Surface>
              );
            }) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                No hay tokens activos para esta cuenta.
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title="Herramientas disponibles"
            subtitle={connectionStatus === "connected" ? `${tools.length} herramientas encontradas` : "Conecta MCP para consultar el catálogo"}
            right={() => <Chip compact style={styles.countChip}>{tools.length}</Chip>}
          />
          <Card.Content style={styles.toolsContent}>
            {busy && ["checking", "provisioning"].includes(connectionStatus) ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" />
                <Text variant="bodySmall">
                  {connectionStatus === "provisioning" ? "Preparando el token seguro…" : "Consultando el catálogo seguro…"}
                </Text>
              </View>
            ) : tools.length ? tools.map((tool) => {
              const expanded = expandedTool === tool.name;
              return (
                <Surface elevation={0} key={tool.name} style={[styles.toolCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View style={styles.toolHeader}>
                    <Avatar.Icon
                      icon={tool.readOnly ? "eye-outline" : "lock-outline"}
                      size={38}
                      style={{ backgroundColor: theme.colors.surface }}
                      color={theme.colors.primary}
                    />
                    <View style={styles.toolCopy}>
                      <Text selectable variant="titleSmall">{tool.name.replace(/_/g, " ")}</Text>
                      <Text selectable variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {tool.description || "Herramienta MCP de VIDKAR."}
                      </Text>
                    </View>
                    <Chip compact>{tool.readOnly ? "Lectura" : "Bloqueada"}</Chip>
                  </View>
                  <View style={styles.toolMeta}>
                    <Chip compact icon="database-outline">{tool.dataClass || "Datos VIDKAR"}</Chip>
                    {tool.requiresConfirmation ? <Chip compact icon="check-decagram-outline">Confirma</Chip> : null}
                  </View>
                  <Button
                    compact
                    icon={expanded ? "chevron-up" : "chevron-down"}
                    mode="text"
                    onPress={() => setExpandedTool(expanded ? "" : tool.name)}
                  >
                    {expanded ? "Ocultar esquema" : "Ver esquema y permisos"}
                  </Button>
                  {expanded ? (
                    <View style={styles.schemaDetails}>
                      <Text selectable variant="labelMedium">Parámetros</Text>
                      <Text selectable style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                        {JSON.stringify(tool.inputSchema || {}, null, 2)}
                      </Text>
                      {tool.security?.conditionalPermissions ? (
                        <>
                          <Divider />
                          <Text selectable variant="labelMedium">Permisos por entidad</Text>
                          <Text selectable style={{ color: theme.colors.onSurfaceVariant }} variant="bodySmall">
                            {JSON.stringify(tool.security.conditionalPermissions, null, 2)}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </Surface>
              );
            }) : (
              <View style={styles.emptyTools}>
                <Avatar.Icon icon="text-box-search-outline" size={46} style={{ backgroundColor: theme.colors.surfaceVariant }} />
                <Text variant="titleSmall">El catálogo aparecerá aquí</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }} variant="bodySmall">
                  Conecta MCP para descubrir las herramientas disponibles para tu cuenta administrativa.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
        <Text selectable style={[styles.note, { color: theme.colors.onSurfaceVariant }]} variant="bodySmall">
          El token completo nunca se muestra ni se incluye en la app. Renovar invalida el anterior; revocar cierra el acceso MCP. Siri requiere un dispositivo y un binario iOS compatible con App Intents.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  accessCheck: { alignItems: "center", gap: 12, justifyContent: "center", padding: 24 },
  content: { gap: 14, padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 24 },
  heroRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  heroCopy: { flex: 1, gap: 5 },
  adminChip: { alignSelf: "flex-start", marginTop: 16 },
  statusCard: { alignItems: "center", borderRadius: 18, flexDirection: "row", gap: 12, padding: 14 },
  statusCopy: { flex: 1, gap: 3 },
  card: { borderRadius: 20 },
  formContent: { gap: 14 },
  endpoint: { gap: 4 },
  actionRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feedback: { borderRadius: 12, padding: 12 },
  loadedToken: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 12, padding: 12 },
  loadedTokenCopy: { flex: 1, gap: 3, minWidth: 0 },
  tokenRow: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 8, padding: 10 },
  countChip: { marginRight: 12 },
  toolsContent: { gap: 10 },
  inlineLoading: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 12 },
  toolCard: { borderRadius: 16, gap: 10, padding: 12 },
  toolHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  toolCopy: { flex: 1, gap: 3, minWidth: 0 },
  toolMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  schemaDetails: { borderRadius: 12, gap: 8, padding: 10 },
  emptyTools: { alignItems: "center", gap: 10, padding: 16 },
  note: { paddingHorizontal: 4 },
});

export default MCPSettingsScreen;
