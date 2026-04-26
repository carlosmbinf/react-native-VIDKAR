import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Avatar, Divider, Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { syncCadeteBackgroundLocation } from "../../services/location/cadeteBackgroundLocation.native";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const CadeteDrawerContent = ({ onClose, user }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isDark = theme.dark;
  const isLandscapeDrawer = width > height;
  const isCompactDrawer = isLandscapeDrawer || height < 560;
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.panel }]} edges={["top", "left"]}>
      <Surface elevation={4} style={[styles.panel, { backgroundColor: palette.panel }]}> 
      <View
        style={[
          styles.header,
          isCompactDrawer ? styles.headerCompact : null,
          { backgroundColor: palette.hero, borderBottomColor: palette.border },
        ]}
      >
        {user?.picture ? (
          <Avatar.Image size={isCompactDrawer ? 46 : 58} source={{ uri: user.picture }} />
        ) : (
          <Avatar.Text
            label={user?.username?.slice(0, 2)?.toUpperCase() || "CD"}
            size={isCompactDrawer ? 46 : 58}
            style={[styles.avatarFallback, { backgroundColor: palette.brandStrong }]}
          />
        )}

        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: palette.title }]} variant="titleMedium">
            {user?.username || "Cadete"}
          </Text>
          <Text style={[styles.headerBadge, { color: palette.brandStrong }]} variant="labelMedium">
            Modo cadete activo
          </Text>
          <Text style={[styles.headerSubtitle, isCompactDrawer ? styles.headerSubtitleCompact : null, { color: palette.copy }]} variant="bodySmall">
            Recibe pedidos cercanos y avanza cada entrega desde esta vista.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isCompactDrawer ? styles.contentCompact : null]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        <View style={[styles.metricsRow, isCompactDrawer ? styles.metricsRowCompact : null]}>
          <Surface style={[styles.metricCard, isCompactDrawer ? styles.metricCardCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
            <Text style={{ color: palette.brandStrong }} variant="labelMedium">
              Estado
            </Text>
            <Text style={{ color: palette.title }} variant="titleSmall">
              Disponible
            </Text>
          </Surface>
          <Surface style={[styles.metricCard, isCompactDrawer ? styles.metricCardCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
            <Text style={{ color: palette.brandStrong }} variant="labelMedium">
              Tracking
            </Text>
            <Text style={{ color: palette.title }} variant="titleSmall">
              Activo
            </Text>
          </Surface>
        </View>

        <View style={[styles.section, isCompactDrawer ? styles.sectionCompact : null]}>
          <Text style={[styles.sectionTitle, { color: palette.muted }]} variant="labelLarge">
            Operación
          </Text>

          <Surface style={[styles.infoCard, isCompactDrawer ? styles.infoCardCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
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
              isCompactDrawer ? styles.navItemCompact : null,
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

        <View style={[styles.section, isCompactDrawer ? styles.sectionCompact : null]}>
          <Text style={[styles.sectionTitle, { color: palette.muted }]} variant="labelLarge">
            Próximamente
          </Text>

          <View style={[styles.comingSoonItem, isCompactDrawer ? styles.comingSoonItemCompact : null, { backgroundColor: palette.card, borderColor: palette.border }]}>
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

          <View style={[styles.comingSoonItem, isCompactDrawer ? styles.comingSoonItemCompact : null, { backgroundColor: palette.card, borderColor: palette.border }]}>
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

        <Surface style={[styles.tipCard, isCompactDrawer ? styles.tipCardCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
          <Text style={[styles.tipTitle, { color: palette.title }]} variant="labelLarge">
            Recomendación
          </Text>
          <Text style={[styles.tipText, { color: palette.copy }]} variant="bodySmall">
            Mantén la app abierta y actualiza tu ubicación si cambias de zona para seguir disponible cerca de las tiendas.
            </Text>
        </Surface>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: palette.panel,
            paddingBottom: Math.max(insets.bottom, isLandscapeDrawer ? 4 : 8),
          },
        ]}
      >
        <Divider style={{ backgroundColor: palette.border }} />
        <Pressable
          onPress={handleExitCadeteMode}
          style={({ pressed }) => [
            styles.exitButton,
            isCompactDrawer ? styles.exitButtonCompact : null,
            isLandscapeDrawer ? styles.exitButtonLandscape : null,
            { backgroundColor: palette.exitSoft },
            pressed ? styles.exitButtonPressed : null,
          ]}
        >
          <MaterialCommunityIcons color={palette.exit} name="exit-run" size={isLandscapeDrawer ? 17 : isCompactDrawer ? 20 : 21} />
          <Text
            style={[
              styles.exitButtonText,
              isCompactDrawer ? styles.exitButtonTextCompact : null,
              isLandscapeDrawer ? styles.exitButtonTextLandscape : null,
              { color: palette.exit },
            ]}
            variant="labelLarge"
          >
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
  contentCompact: {
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  comingSoonItem: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  comingSoonItemCompact: {
    borderRadius: 18,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exitButton: {
    alignItems: "center",
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginHorizontal: 12,
    marginTop: 8,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exitButtonCompact: {
    borderRadius: 14,
    gap: 7,
    marginHorizontal: 10,
    marginTop: 6,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  exitButtonLandscape: {
    borderRadius: 13,
    gap: 6,
    marginTop: 4,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exitButtonPressed: {
    opacity: 0.76,
  },
  exitButtonText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "800",
  },
  exitButtonTextCompact: {
    fontSize: 12.5,
  },
  exitButtonTextLandscape: {
    fontSize: 12,
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
  headerCompact: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
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
  headerSubtitleCompact: {
    lineHeight: 17,
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
  infoCardCompact: {
    borderRadius: 18,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  metricCardCompact: {
    borderRadius: 15,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricsRowCompact: {
    gap: 8,
  },
  navItem: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  navItemCompact: {
    borderRadius: 18,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    height: "100%",
    width: "100%",
  },
  scrollArea: {
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionCompact: {
    gap: 9,
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
  tipCardCompact: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
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