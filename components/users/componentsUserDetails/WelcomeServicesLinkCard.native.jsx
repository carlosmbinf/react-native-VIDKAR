import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";

const WelcomeServicesLinkCard = ({ item, styles: profileStyles, accentColor, onPress }) => {
  const theme = useTheme();
  const accent = accentColor || theme.colors.primary;

  return (
    <Card elevation={5} style={[profileStyles?.cards, ui.card]} testID="welcome-services-link-card">
      <View style={[ui.accentBar, { backgroundColor: accent }]} />
      <Card.Content style={ui.content}>
        <View style={ui.header}>
          <View style={[ui.iconWrap, { backgroundColor: theme.dark ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.1)" }]}>
            <MaterialCommunityIcons color={accent} name="view-dashboard-edit-outline" size={23} />
          </View>
          <View style={ui.headerCopy}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
              PERSONALIZACIÓN DE PORTADA
            </Text>
            <Text style={{ color: theme.colors.onSurface, fontSize: 19, fontWeight: "900" }}>
              Servicios de bienvenida
            </Text>
          </View>
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
          Administra en una pantalla dedicada el orden y la visibilidad de los servicios de @{item?.username || "este usuario"}.
        </Text>
        <Button icon="arrow-right" mode="contained-tonal" onPress={onPress} style={ui.button}>
          Administrar servicios
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

export default WelcomeServicesLinkCard;
