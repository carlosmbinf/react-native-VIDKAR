import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Avatar, Divider, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { syncCadeteBackgroundLocation } from "../../services/location/cadeteBackgroundLocation.native";
import { VentasRechargeCollection } from "../collections/collections";
import DrawerBlurShell from "../drawer/DrawerBlurShell";
import {
  CADETE_PAYMENT_FIELDS,
  CADETE_PAYMENT_SELECTOR_BASE,
  CADETE_PAYMENT_TARGET_CURRENCY,
  formatCadetePaymentAmount,
  summarizeCadeteDeliveryPaymentsInUsd,
} from "../comercio/pedidos/cadetePaymentUtils";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const CadeteDrawerContent = ({ onClose, user }) => {
  const router = useRouter();
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
  const trackedUserId = Meteor.useTracker(() => Meteor.userId());
  const currentUserId = user?._id || trackedUserId;
  const [pendingPaymentSummary, setPendingPaymentSummary] = useState({
    conversionFailuresCount: 0,
    hasConversionFailures: false,
    hasConvertedAmount: false,
    hasPendingAmount: false,
    mainTotal: { amount: 0, currency: CADETE_PAYMENT_TARGET_CURRENCY },
    pendingSalesCount: 0,
    storesCount: 0,
    totals: [],
  });
  const pendingPaymentState = Meteor.useTracker(() => {
    if (!currentUserId) {
      return {
        ready: true,
        ventas: [],
      };
    }

    const selector = {
      ...CADETE_PAYMENT_SELECTOR_BASE,
      cadeteid: currentUserId,
      estado: "ENTREGADO",
      pagadoAlCadete: { $ne: true },
    };
    const handle = Meteor.subscribe("ventasRecharge", selector, {
      fields: CADETE_PAYMENT_FIELDS,
    });
    const ventas = VentasRechargeCollection.find(selector, {
      fields: CADETE_PAYMENT_FIELDS,
      sort: { createdAt: -1 },
    }).fetch();

    return {
      ready: handle.ready(),
      ventas,
    };
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;

    summarizeCadeteDeliveryPaymentsInUsd(pendingPaymentState.ventas || []).then((summary) => {
      if (!cancelled) {
        setPendingPaymentSummary(summary);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pendingPaymentState.ventas]);

  const openCadeteHistory = () => {
    onClose?.();
    router.push("/(cadete)/CadeteDeliveryHistory");
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
              .then(() => {
                console.log("[CadeteLocation] Tracking detenido al salir del modo cadete");
                router.replace("/(normal)/Main");
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

  const headerNode = (
    <View style={styles.headerFrame}>
      <BlurView
        intensity={24}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={
          Platform.OS === "android" ? "dimezisBlurView" : undefined
        }
        renderToHardwareTextureAndroid={true}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.headerOverlay,
          {
            backgroundColor: isDark
              ? "rgba(18, 74, 44, 0.24)"
              : "rgba(255, 255, 255, 0.22)",
            borderColor: palette.border,
          },
        ]}
      />
      <View style={[
        styles.header,
        isCompactDrawer ? styles.headerCompact : null,
        { paddingTop: Math.max(insets.top, isCompactDrawer ? 12 : 16) },
      ]}>
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
    </View>
  );

  const contentNode = (
    <View style={[styles.content, isCompactDrawer ? styles.contentCompact : null]}>
      <Pressable
        onPress={openCadeteHistory}
        style={({ pressed }) => [
          styles.pendingPaymentCard,
          isCompactDrawer ? styles.pendingPaymentCardCompact : null,
          {
            backgroundColor: isDark ? "rgba(6, 78, 59, 0.42)" : "rgba(236, 253, 245, 0.92)",
            borderColor: isDark ? "rgba(52, 211, 153, 0.34)" : "rgba(5, 150, 105, 0.22)",
          },
          pressed ? styles.pendingPaymentCardPressed : null,
        ]}
      >
        <View style={styles.pendingPaymentHeader}>
          <View style={[styles.pendingPaymentIcon, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(5, 150, 105, 0.12)" }]}>
            <MaterialCommunityIcons color={palette.brandStrong} name="cash-clock" size={24} />
          </View>
          <View style={styles.pendingPaymentCopy}>
            <Text style={[styles.pendingPaymentEyebrow, { color: palette.brandStrong }]} variant="labelMedium">
              Pendiente a cobrar
            </Text>
            <Text style={[styles.pendingPaymentAmount, { color: palette.title }]} variant="headlineSmall">
              {pendingPaymentSummary.hasConversionFailures
                  ? "Conversión pendiente"
                : pendingPaymentSummary.hasConvertedAmount
                ? formatCadetePaymentAmount(
                    pendingPaymentSummary.mainTotal.amount,
                    pendingPaymentSummary.mainTotal.currency,
                  )
                : pendingPaymentState.ready
                  ? "Sin pagos pendientes"
                  : "Calculando..."}
            </Text>
          </View>
        </View>
        <Text style={[styles.pendingPaymentText, { color: palette.copy }]} variant="bodySmall">
          {pendingPaymentSummary.hasConversionFailures
            ? `${pendingPaymentSummary.pendingSalesCount} entrega${pendingPaymentSummary.pendingSalesCount === 1 ? "" : "s"} pendiente${pendingPaymentSummary.pendingSalesCount === 1 ? "" : "s"} con ${pendingPaymentSummary.conversionFailuresCount} importe${pendingPaymentSummary.conversionFailuresCount === 1 ? "" : "s"} sin conversión USD disponible.${pendingPaymentSummary.hasConvertedAmount ? ` Convertido parcialmente: ${formatCadetePaymentAmount(pendingPaymentSummary.mainTotal.amount, pendingPaymentSummary.mainTotal.currency)}.` : ""} Abre el historial para revisar el desglose.`
            : pendingPaymentSummary.hasPendingAmount
            ? `${pendingPaymentSummary.pendingSalesCount} entrega${pendingPaymentSummary.pendingSalesCount === 1 ? "" : "s"} pendiente${pendingPaymentSummary.pendingSalesCount === 1 ? "" : "s"} · ${pendingPaymentSummary.storesCount} tienda${pendingPaymentSummary.storesCount === 1 ? "" : "s"} en desglose.`
            : "Cuando una entrega de comercio quede sin pagar al cadete, aparecerá aquí con su desglose por tienda."}
        </Text>
        {pendingPaymentSummary.totals.length > 1 ? (
          <Text style={[styles.pendingPaymentText, { color: palette.muted }]} variant="labelSmall">
            También: {pendingPaymentSummary.totals.slice(1).map((entry) => formatCadetePaymentAmount(entry.amount, entry.currency)).join(" · ")}
          </Text>
        ) : null}
      </Pressable>

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

        <Pressable
          onPress={openCadeteHistory}
          style={({ pressed }) => [
            styles.comingSoonItem,
            isCompactDrawer ? styles.comingSoonItemCompact : null,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed ? styles.navItemPressed : null,
          ]}
        >
          <View style={[styles.navItemIconWrap, { backgroundColor: palette.cardSoft }]}> 
            <MaterialCommunityIcons color={palette.brandStrong} name="history" size={22} />
          </View>
          <View style={styles.navItemCopy}>
            <Text style={[styles.navItemTitle, { color: palette.title }]} variant="titleSmall">
              Historial
            </Text>
            <Text style={[styles.navItemText, { color: palette.copy }]} variant="bodySmall">
              El historial de rutas y entregas está disponible desde este menú.
            </Text>
          </View>
        </Pressable>
      </View>

      <Surface style={[styles.tipCard, isCompactDrawer ? styles.tipCardCompact : null, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
        <Text style={[styles.tipTitle, { color: palette.title }]} variant="labelLarge">
          Recomendación
        </Text>
        <Text style={[styles.tipText, { color: palette.copy }]} variant="bodySmall">
          Mantén la app abierta y actualiza tu ubicación si cambias de zona para seguir disponible cerca de las tiendas.
        </Text>
      </Surface>
    </View>
  );

  const footerNode = (
    <View
      style={[
        styles.footer,
        isLandscapeDrawer ? styles.footerScrollable : null,
        {
          backgroundColor: "transparent",
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
  );

  return (
    <View style={styles.safeArea}>
      <DrawerBlurShell
        elevation={4}
        overlayColor={isDark ? "rgba(4, 20, 11, 0.72)" : "rgba(245, 250, 247, 0.58)"}
        style={styles.panel}
      >
        {isLandscapeDrawer ? (
          <ScrollView
            contentContainerStyle={styles.drawerScrollableContent}
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
          >
            {headerNode}
            {contentNode}
            {footerNode}
          </ScrollView>
        ) : (
          <>
            {headerNode}
            <ScrollView
              contentContainerStyle={[styles.content, isCompactDrawer ? styles.contentCompact : null]}
              showsVerticalScrollIndicator={false}
              style={styles.scrollArea}
            >
              {contentNode}
            </ScrollView>
            {footerNode}
          </>
        )}
      </DrawerBlurShell>
    </View>
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
  drawerScrollableContent: {
    flexGrow: 1,
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
  footerScrollable: {
    marginTop: 0,
  },
  headerFrame: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    marginBottom: 2,
    overflow: "hidden",
    position: "relative",
  },
  header: {
    alignItems: "center",
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
  headerOverlay: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderWidth: 1,
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
  pendingPaymentAmount: {
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  pendingPaymentCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  pendingPaymentCardCompact: {
    borderRadius: 20,
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  pendingPaymentCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  pendingPaymentCopy: {
    flex: 1,
    gap: 2,
  },
  pendingPaymentEyebrow: {
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pendingPaymentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  pendingPaymentIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pendingPaymentText: {
    lineHeight: 19,
  },
  panel: {
    backgroundColor: "transparent",
    borderRightColor: "rgba(255,255,255,0.14)",
    borderRightWidth: 1,
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