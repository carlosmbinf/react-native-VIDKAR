import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";

const McpSettingsLinkCard = ({ styles: profileStyles, accentColor, onPress }) => {
  const theme = useTheme();
  const accent = accentColor || "#f59e0b";

  return (
    <Card elevation={5} style={[profileStyles?.cards, ui.card]} testID="mcp-settings-access-card">
      <View style={[ui.accentBar, { backgroundColor: accent }]} />
      <Card.Content style={ui.content}>
        <View style={ui.header}>
          <View style={[ui.iconWrap, { backgroundColor: theme.dark ? "rgba(245, 158, 11, 0.16)" : "rgba(245, 158, 11, 0.12)" }]}>
            <MaterialCommunityIcons color={accent} name="key-chain-variant" size={23} />
          </View>
          <View style={ui.headerCopy}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
              INTEGRACIONES SEGURAS
            </Text>
            <Text style={{ color: theme.colors.onSurface, fontSize: 19, fontWeight: "900" }}>
              Tokens MCP de VIDKAR
            </Text>
          </View>
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
          Administra tus tokens y el acceso de Siri desde una pantalla dedicada.
        </Text>
        <Button icon="arrow-right" mode="contained-tonal" onPress={onPress} style={ui.button}>
          Administrar tokens MCP
        </Button>
      </Card.Content>
    </Card>
  );
};

const ui = StyleSheet.create({
  accentBar: { height: 4, width: "100%" },
  button: { alignSelf: "flex-start", borderRadius: 14 },
  card: { marginBottom: 0, overflow: "hidden" },
  content: { gap: 14, paddingTop: 16 },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  headerCopy: { flex: 1, gap: 3 },
  iconWrap: { alignItems: "center", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
});

export default McpSettingsLinkCard;
