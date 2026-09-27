import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Avatar, Card, Text, useTheme } from "react-native-paper";
import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";

import { isMCPAdmin } from "../../services/mcp/mcpAccess";

const Meteor = MeteorBase;

export default function MCPSettingsScreen() {
  const theme = useTheme();
  const session = Meteor.useTracker(() => {
    const userId = Meteor.userId();
    if (!userId) return { ready: Boolean(Meteor.status?.()?.connected), user: null, userId: null };
    const handle = Meteor.subscribe("user", { _id: userId }, {
      fields: { username: 1, "profile.role": 1 },
    });
    return { ready: handle.ready(), user: Meteor.user(), userId };
  }, []);
  const adminAccess = isMCPAdmin(session.user);

  useEffect(() => {
    if (!session.ready) return;
    if (!session.userId) router.replace("/(auth)/Loguin");
    else if (!adminAccess) router.replace("/(normal)/Main");
  }, [adminAccess, session.ready, session.userId]);

  if (!session.ready || !adminAccess) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text variant="bodyMedium">Verificando acceso administrativo…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <Avatar.Icon icon="robot-outline" size={56} />
          <Text variant="headlineSmall">Siri y MCP de VIDKAR</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }} variant="bodyMedium">
            Esta integración requiere un dispositivo y un binario iOS nativo. Configúrala desde la app iOS de VIDKAR.
          </Text>
          <Text variant="labelMedium">Acceso reservado a administradores.</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  card: { maxWidth: 460, width: "100%" },
  content: { alignItems: "center", gap: 12, padding: 24 },
});
