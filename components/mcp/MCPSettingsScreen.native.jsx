import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Button, Card, Divider, Text, TextInput, useTheme } from "react-native-paper";
import { router } from "expo-router";

import {
  clearMCPConfiguration,
  configureMCP,
  discoverMCPTools,
  refreshMCPTools,
} from "../../services/mcp/mcpClient";

const MCPSettingsScreen = () => {
  const theme = useTheme();
  const [tools, setTools] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  const loadTools = useCallback(async (force = false) => {
    setBusy(true);
    setMessage("");
    try {
      setTools(await (force ? refreshMCPTools() : discoverMCPTools()));
    } catch (error) {
      setTools([]);
      setMessage(error?.message || "Configura primero el acceso MCP de VIDKAR.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleConfigure = async () => {
    setBusy(true);
    setMessage("");
    try {
      await configureMCP({ token: token.trim() });
      await loadTools(true);
      setToken("");
      setMessage("Acceso MCP configurado de forma segura para este dispositivo.");
    } catch (error) {
      setMessage(error?.message || "No se pudo configurar el acceso MCP.");
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    await clearMCPConfiguration();
    setTools([]);
    setMessage("Acceso local eliminado. El token del servidor debe revocarse desde el perfil VIDKAR.");
    setBusy(false);
  };

  return (
    <View style={styles.screen}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Siri y MCP de VIDKAR" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium">
          Genera el token MCP desde tu perfil en la web de VIDKAR y pégalo aquí. El token es dinámico, pertenece a tu usuario y no se incluye en la aplicación.
        </Text>
        <Text accessibilityLabel="Endpoint MCP de VIDKAR" variant="bodySmall">
          Endpoint MCP: https://www.vidkar.com/mcp
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          disabled={busy}
          label="Token MCP generado en la web"
          onChangeText={setToken}
          secureTextEntry
          value={token}
        />
        <Button disabled={busy || token.trim().length < 20} mode="contained" onPress={handleConfigure} style={styles.button}>
          Probar conexión MCP
        </Button>
        <Button disabled={busy} mode="outlined" onPress={() => loadTools(true)} style={styles.button}>
          Actualizar herramientas
        </Button>
        <Button disabled={busy} mode="text" onPress={handleClear}>
          Eliminar credenciales locales
        </Button>
        {busy ? <ActivityIndicator style={styles.loading} /> : null}
        {message ? <Text style={[styles.message, { color: theme.colors.primary }]}>{message}</Text> : null}
        <Card style={styles.card}>
          <Card.Title title={`Herramientas descubiertas (${tools.length})`} />
          <Card.Content>
            {tools.length ? tools.map((tool) => (
              <View key={tool.name} style={styles.tool}>
                <Text variant="titleSmall">{tool.name}</Text>
                <Text variant="bodySmall">{tool.description || "Sin descripción"}</Text>
                <Text variant="bodySmall">Permisos: {tool.permissions?.join(", ") || "No declarados"}</Text>
                <Text variant="bodySmall">Datos: {tool.dataClass || "Sin clasificar"}</Text>
                <Text variant="bodySmall">Operación: {tool.readOnly ? "solo lectura" : "bloqueada (sin garantía de solo lectura)"}</Text>
                <Text variant="bodySmall">Confirmación: {tool.dataClass === "entity-dependent" ? "según tipo de entidad" : tool.requiresConfirmation ? "requerida" : "no requerida"}</Text>
                {tool.security?.conditionalPermissions ? (
                  <Text selectable variant="bodySmall">Permisos por entidad: {JSON.stringify(tool.security.conditionalPermissions)}</Text>
                ) : null}
                <Text selectable variant="bodySmall">Esquema: {JSON.stringify(tool.inputSchema || {})}</Text>
                <Divider style={styles.divider} />
              </View>
            )) : <Text variant="bodySmall">Configura el acceso para consultar el catálogo actual.</Text>}
          </Card.Content>
        </Card>
        <Text variant="bodySmall" style={styles.note}>
          El token se guarda en el almacenamiento seguro de iOS y se limpia al cerrar sesión. Siri necesita un dispositivo y binario iOS compatibles con App Intents.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 12, padding: 16 },
  button: { marginTop: 4 },
  loading: { marginVertical: 8 },
  message: { color: "#2563eb" },
  card: { marginTop: 8 },
  tool: { paddingVertical: 8 },
  divider: { marginTop: 8 },
  note: { marginTop: 8, opacity: 0.75 },
});

export default MCPSettingsScreen;
