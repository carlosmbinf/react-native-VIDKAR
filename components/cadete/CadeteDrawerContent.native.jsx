import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Divider, Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { syncCadeteBackgroundLocation } from "../../services/location/cadeteBackgroundLocation.native";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const CadeteDrawerContent = ({ onClose, user }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.dark;
  const palette = {
    background: isDark ? "#04140b" : "#f5faf7",
    panel: isDark ? "rgba(7, 24, 15, 0.98)" : "#ffffff",
    hero: isDark ? "rgba(18, 74, 44, 0.34)" : "rgba(22, 163, 74, 0.10)",
    card: isDark ? "rgba(15, 34, 23, 0.92)" : "#ffffff",
    cardSoft: isDark ? "rgba(18, 55, 34, 0.72)" : "rgba(22, 163, 74, 0.08)",
    border: isDark ? "rgba(74, 222, 128, 0.18)" : "rgba(22, 163, 74, 0.12)",
    borderStrong: isDark ? "rgba(74, 222, 128, 0.28)" : "rgba(22, 163, 74, 0.2)",
    title: isDark ? "#f0fdf4" : "#0f172a",
    copy: isDark ? "#cfead7" : "#3b4b44",
    muted: isDark ? "#9fc6ab" : "#5f7469",
    brand: "#16a34a",
    brandStrong: isDark ? "#86efac" : "#15803d",
    shadowColor: isDark ? "#000000" : "#052e16",
    exit: isDark ? "#fda4af" : "#dc2626",
    exitSoft: isDark ? "rgba(190, 24, 93, 0.2)" : "rgba(220, 38, 38, 0.08)",
  };
  const handleExitCadeteMode = () => {
    Alert.alert(
      "Salir del modo cadete",
      "Al desactivar este modo dejarás de aparecer disponible para nuevas entregas hasta volver a activarlo.",
      [
        {
          style: "cancel",
          text: "Cancelar",
        },
        {
          style: "destructive",
          text: "Salir",
          onPress: () => {
            Meteor.call("users.toggleModoCadete", false, (error) => {
              if (error) {
                Alert.alert(
                  "No se pudo salir del modo cadete",
                  error.reason ||
                    "Todavía no fue posible desactivar el modo cadete. Inténtalo otra vez.",
                );
                return;
              }

              syncCadeteBackgroundLocation({
                enabled: false,
              })
                .catch((trackingError) => {
                  console.warn(
                    "[CadeteLocation] No se pudo detener el tracking al salir del modo cadete:",
                    trackingError,
                  );
                })
                .finally(() => {
                  onClose?.();
                });
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.panel }]} edges={["top", "bottom", "left"]}>
      <Surface elevation={4} style={[styles.panel, { backgroundColor: palette.panel }]}> 
      <View style={[styles.header, { backgroundColor: palette.hero, borderBottomColor: palette.border }]}> 
        {user?.picture ? (
          <Avatar.Image size={58} source={{ uri: user.picture }} />
        ) : (
          <Avatar.Text
            label={user?.username?.slice(0, 2)?.toUpperCase() || "CD"}
            size={58}
            style={[styles.avatarFallback, { backgroundColor: palette.brandStrong }]}
          />
        )}

        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: palette.title }]} variant="titleMedium">
            {user?.username || "Cadete"}
          </Text>
          <Text style={[styles.headerBadge, { color: palette.brandStrong }]} variant="labelMedium">
            Modo cadete activo
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.copy }]} variant="bodySmall">
            Recibe pedidos cercanos y avanza cada entrega desde esta vista.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 18 + Math.max(insets.bottom, 8) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsRow}>
          <Surface style={[styles.metricCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
            <Text style={{ color: palette.brandStrong }} variant="labelMedium">
              Estado
            </Text>
            <Text style={{ color: palette.title }} variant="titleSmall">
              Disponible
            </Text>
          </Surface>
          <Surface style={[styles.metricCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
            <Text style={{ color: palette.brandStrong }} variant="labelMedium">
              Tracking
            </Text>
            <Text style={{ color: palette.title }} variant="titleSmall">
              Activo
            </Text>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.muted }]} variant="labelLarge">
            Operación
          </Text>

          <Surface style={[styles.infoCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
            <View style={[styles.infoCardIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" }]}> 
              <MaterialCommunityIcons color={palette.brandStrong} name="crosshairs-gps" size={22} />
            </View>
            <View style={styles.infoCardCopy}>
              <Text style={[styles.infoCardTitle, { color: palette.title }]} variant="titleSmall">
                Asignación automática
              </Text>
              <Text style={[styles.infoCardText, { color: palette.copy }]} variant="bodySmall">
                La cola de tiendas y la asignación de pedidos dependen de tu ubicación activa.
              </Text>
            </View>
          </Surface>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.navItem,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed ? styles.navItemPressed : null,
            ]}
          >
            <View style={[styles.navItemIconWrap, { backgroundColor: palette.cardSoft }]}> 
              <MaterialCommunityIcons color={palette.brandStrong} name="package-variant-closed" size={22} />
            </View>
            <View style={styles.navItemCopy}>
              <Text style={[styles.navItemTitle, { color: palette.title }]} variant="titleSmall">
                Mis pedidos
              </Text>
              <Text style={[styles.navItemText, { color: palette.copy }]} variant="bodySmall">
                Vista operativa principal para recoger, trasladar y entregar pedidos.
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.muted }]} variant="labelLarge">
            Próximamente
          </Text>

          <View style={[styles.comingSoonItem, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <View style={[styles.navItemIconWrap, { backgroundColor: palette.cardSoft }]}> 
              <MaterialCommunityIcons color={palette.muted} name="bell-outline" size={22} />
            </View>
            <View style={styles.navItemCopy}>
              <Text style={[styles.navItemTitle, { color: palette.title }]} variant="titleSmall">
                Notificaciones
              </Text>
              <Text style={[styles.navItemText, { color: palette.copy }]} variant="bodySmall">
                Próximamente podrás ajustar recordatorios y alertas del flujo de entrega.
              </Text>
            </View>
          </View>

          <View style={[styles.comingSoonItem, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <View style={[styles.navItemIconWrap, { backgroundColor: palette.cardSoft }]}> 
              <MaterialCommunityIcons color={palette.muted} name="history" size={22} />
            </View>
            <View style={styles.navItemCopy}>
              <Text style={[styles.navItemTitle, { color: palette.title }]} variant="titleSmall">
                Historial
              </Text>
              <Text style={[styles.navItemText, { color: palette.copy }]} variant="bodySmall">
                El historial de rutas y entregas quedará disponible desde este menú.
              </Text>
            </View>
          </View>
        </View>

        <Surface style={[styles.tipCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}> 
          <Text style={[styles.tipTitle, { color: palette.title }]} variant="labelLarge">
            Recomendación
          </Text>
          <Text style={[styles.tipText, { color: palette.copy }]} variant="bodySmall">
            Mantén la app abierta y actualiza tu ubicación si cambias de zona para seguir disponible cerca de las tiendas.
            </Text>
        </Surface>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Divider style={{ backgroundColor: palette.border }} />
        <Pressable
          onPress={handleExitCadeteMode}
          style={({ pressed }) => [
            styles.exitButton,
            { backgroundColor: palette.exitSoft },
            pressed ? styles.exitButtonPressed : null,
          ]}
        >
          <MaterialCommunityIcons color={palette.exit} name="exit-run" size={22} />
          <Text style={[styles.exitButtonText, { color: palette.exit }]} variant="labelLarge">
            Salir del modo cadete
          </Text>
        </Pressable>
      </View>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: "100%",
  },
  avatarFallback: {
    backgroundColor: "#13803d",
  },
  content: {
    gap: 14,
    padding: 18,
  },
  comingSoonItem: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  exitButton: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  exitButtonPressed: {
    opacity: 0.76,
  },
  exitButtonText: {
    color: "#dc2626",
    fontWeight: "800",
  },
  footer: {
    marginTop: "auto",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  headerBadge: {
    color: "#16a34a",
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  headerSubtitle: {
    color: "#64748b",
    lineHeight: 18,
  },
  headerTitle: {
    color: "#0f172a",
    fontWeight: "800",
  },
  infoCard: {
    alignItems: "flex-start",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  infoCardCopy: {
    flex: 1,
    gap: 4,
  },
  infoCardIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  infoCardText: {
    lineHeight: 20,
  },
  infoCardTitle: {
    fontWeight: "800",
  },
  metricCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 82,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  navItem: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  navItemCopy: {
    flex: 1,
    gap: 3,
  },
  navItemIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  navItemPressed: {
    opacity: 0.82,
  },
  navItemText: {
    color: "#475569",
    lineHeight: 20,
  },
  navItemTitle: {
    color: "#0f172a",
    fontWeight: "800",
  },
  panel: {
    flex: 1,
    width: "100%",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 22,
    gap: 6,
    padding: 16,
  },
  tipText: {
    lineHeight: 20,
  },
  tipTitle: {
    fontWeight: "800",
    textTransform: "uppercase",
  },
});

export default CadeteDrawerContent;