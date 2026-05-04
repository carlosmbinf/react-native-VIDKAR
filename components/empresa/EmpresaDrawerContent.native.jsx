import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Avatar, Divider, Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductosComercioCollection, TiendasComercioCollection } from "../collections/collections";
import DrawerBlurShell from "../drawer/DrawerBlurShell";
import { createEmpresaPalette } from "./styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const DrawerMetric = ({ compact, icon, label, palette, value }) => {
  if (compact) {
    return (
      <Surface
        style={[
          styles.metricItem,
          styles.metricItemCompact,
          {
            backgroundColor: palette.cardSoft,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={[styles.metricIconWrap, styles.metricIconWrapCompact, { backgroundColor: palette.brandSoft }]}>
          <MaterialCommunityIcons color={palette.brandStrong} name={icon} size={16} />
        </View>
        <View style={styles.metricCompactCopy}>
          <Text style={[styles.metricLabelCompact, { color: palette.muted }]} variant="bodySmall">
            {label}
          </Text>
        </View>
        <Text style={[styles.metricValueCompact, { color: palette.title }]} variant="titleSmall">
          {value}
        </Text>
      </Surface>
    );
  }

  return (
    <Surface
      style={[
        styles.metricItem,
        compact ? styles.metricItemCompact : null,
        {
          backgroundColor: palette.cardSoft,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={[styles.metricIconWrap, compact ? styles.metricIconWrapCompact : null, { backgroundColor: palette.brandSoft }]}>
        <MaterialCommunityIcons color={palette.brandStrong} name={icon} size={compact ? 16 : 18} />
      </View>
      <Text style={{ color: palette.title }} variant="titleSmall">
        {value}
      </Text>
      <Text style={{ color: palette.muted }} variant="bodySmall">
        {label}
      </Text>
    </Surface>
  );
};

const DrawerAction = ({ compact, description, icon, label, onPress, palette }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionItem,
        compact ? styles.actionItemCompact : null,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        pressed ? styles.actionItemPressed : null,
      ]}
    >
      <View style={[styles.actionIconWrap, compact ? styles.actionIconWrapCompact : null, { backgroundColor: palette.brandSoft }]}>
        <MaterialCommunityIcons color={palette.icon} name={icon} size={compact ? 18 : 20} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={{ color: palette.title }} variant="titleSmall">
          {label}
        </Text>
        <Text style={{ color: palette.copy }} variant="bodySmall">
          {description}
        </Text>
      </View>
      <MaterialCommunityIcons color={palette.muted} name="chevron-right" size={20} />
    </Pressable>
  );
};

const EmpresaDrawerContent = ({ onClose, user }) => {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const palette = createEmpresaPalette(theme);
  const isLandscapeDrawer = width > height;
  const isCompactDrawer = isLandscapeDrawer || height < 560;

  const { productosCount, tiendasCount } = Meteor.useTracker(() => {
    const userId = user?._id;

    if (!userId) {
      return { productosCount: 0, tiendasCount: 0 };
    }

    const tiendasHandle = Meteor.subscribe("tiendas", { idUser: userId }, { fields: { _id: 1 } });
    const tiendas = tiendasHandle.ready()
      ? TiendasComercioCollection.find({ idUser: userId }, { fields: { _id: 1 } }).fetch()
      : [];
    const tiendaIds = tiendas.map((tienda) => tienda._id);

    const productosHandle = tiendaIds.length
      ? Meteor.subscribe("productosComercio", { idTienda: { $in: tiendaIds } }, { fields: { _id: 1 } })
      : null;

    const productosCount =
      tiendaIds.length && productosHandle?.ready()
        ? ProductosComercioCollection.find({ idTienda: { $in: tiendaIds } }, { fields: { _id: 1 } }).count()
        : 0;

    return {
      productosCount,
      tiendasCount: tiendas.length,
    };
  }, [user?._id]);

  const navigateTo = (href) => {
    onClose?.();
    router.push(href);
  };

  const handleExitEmpresaMode = () => {
    Alert.alert(
      "Salir del modo empresa",
      "Volverás a la experiencia principal de la app, pero tus tiendas y productos seguirán disponibles.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          onPress: () => {
            Meteor.call("users.toggleModoEmpresa", false, (error) => {
              if (error) {
                Alert.alert(
                  "No se pudo salir del modo empresa",
                  error.reason || "Todavía no fue posible cambiar el modo empresa.",
                );
                return;
              }

              onClose?.();
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left"]}>
      <DrawerBlurShell
        elevation={4}
        overlayColor={theme.dark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.58)"}
        style={styles.panel}
      >
      <View
        style={[
          styles.header,
          isCompactDrawer ? styles.headerCompact : null,
          {
            backgroundColor: palette.hero,
            borderBottomColor: palette.border,
          },
        ]}
      >
        {user?.picture ? (
          <Avatar.Image size={isCompactDrawer ? 46 : 58} source={{ uri: user.picture }} />
        ) : (
          <Avatar.Text
            label={user?.profile?.firstName?.slice(0, 2)?.toUpperCase() || user?.username?.slice(0, 2)?.toUpperCase() || "EM"}
            size={isCompactDrawer ? 46 : 58}
            style={{ backgroundColor: palette.brand }}
          />
        )}

        <View style={styles.headerCopy}>
          <Text style={{ color: palette.title }} variant="titleMedium">
            {user?.profile?.firstName || user?.username || "Empresa"}
          </Text>
          <View style={[styles.statusPill, isCompactDrawer ? styles.statusPillCompact : null, { backgroundColor: palette.brandSoft }]}>
            <Text style={{ color: palette.brandStrong }} variant="labelMedium">
              Modo empresa activo
            </Text>
          </View>
          {!isLandscapeDrawer ? (
            <Text style={[isCompactDrawer ? styles.headerDescriptionCompact : null, { color: palette.copy }]} variant="bodySmall">
              Gestiona tus tiendas, productos y pedidos de preparación desde este espacio.
            </Text>
          ) : null}
        </View>
      </View>

      <Divider />

      <ScrollView
        contentContainerStyle={[styles.content, isCompactDrawer ? styles.contentCompact : null]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        <Text style={[styles.sectionLabel, { color: palette.muted }]} variant="labelMedium">
          Operación
        </Text>

        <View style={[styles.metricsRow, isCompactDrawer ? styles.metricsRowCompact : null]}>
          <DrawerMetric compact={isCompactDrawer} icon="storefront-outline" label="Tiendas" palette={palette} value={tiendasCount} />
          <DrawerMetric compact={isCompactDrawer} icon="package-variant-closed" label="Productos" palette={palette} value={productosCount} />
          <DrawerMetric compact={isCompactDrawer} icon="clipboard-list-outline" label="Estado" palette={palette} value="Activa" />
        </View>

        <View style={[styles.actionGroup, isCompactDrawer ? styles.actionGroupCompact : null]}>
          <DrawerAction
            compact={isCompactDrawer}
            description="Revisa, prepara y deja listos los pedidos antes de que el cadete los recoja."
            icon="clipboard-list-outline"
            label="Pedidos de preparación"
            onPress={() => navigateTo("/(empresa)/PedidosPreparacion")}
            palette={palette}
          />
          <DrawerAction
            compact={isCompactDrawer}
            description="Administra tus tiendas, su ubicación y el catálogo asociado a cada una."
            icon="storefront-outline"
            label="Mis tiendas"
            onPress={() => navigateTo("/(empresa)/MisTiendas")}
            palette={palette}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: palette.muted }]} variant="labelMedium">
          Cuenta
        </Text>

        <View style={[styles.actionGroup, isCompactDrawer ? styles.actionGroupCompact : null]}>
          <DrawerAction
            compact={isCompactDrawer}
            description="Consulta tus datos de usuario dentro del entorno empresa."
            icon="account-outline"
            label="Mi usuario"
            onPress={() => navigateTo("/(empresa)/User")}
            palette={palette}
          />
          <DrawerAction
            compact={isCompactDrawer}
            description="Abre el historial de conversaciones desde el modo empresa."
            icon="chat-processing-outline"
            label="Mensajes"
            onPress={() => navigateTo("/(empresa)/Mensaje")}
            palette={palette}
          />
        </View>

        <Surface
          style={[
            styles.tipCard,
            isCompactDrawer ? styles.tipCardCompact : null,
            {
              backgroundColor: palette.cardSoft,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={[styles.tipIconWrap, { backgroundColor: palette.brandSoft }]}> 
            <MaterialCommunityIcons color={palette.brandStrong} name="lightbulb-on-outline" size={20} />
          </View>
          <View style={styles.tipCopy}>
            <Text style={{ color: palette.title }} variant="titleSmall">
              Mantén tu operación ordenada
            </Text>
            <Text style={{ color: palette.copy }} variant="bodySmall">
              Mantén bien descritas tus tiendas y productos para que el flujo de preparación y entrega sea más claro para el cliente y para el cadete.
            </Text>
          </View>
        </Surface>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: "transparent",
            paddingBottom: Math.max(insets.bottom, isLandscapeDrawer ? 4 : 8),
          },
        ]}
      >
        <Divider />
        <View style={[styles.footerActions, isLandscapeDrawer ? styles.footerActionsLandscape : null]}>
          <Pressable
            onPress={handleExitEmpresaMode}
            style={({ pressed }) => [
              styles.modeExitButton,
              isLandscapeDrawer ? styles.modeExitButtonLandscape : null,
              { backgroundColor: palette.cardSoft },
              pressed ? styles.modeExitButtonPressed : null,
            ]}
          >
            <MaterialCommunityIcons color={palette.brandStrong} name="exit-run" size={isLandscapeDrawer ? 17 : 19} />
            <Text
              style={[
                styles.modeExitButtonLabel,
                isLandscapeDrawer ? styles.modeExitButtonLabelLandscape : null,
                { color: palette.brandStrong },
              ]}
              variant="labelLarge"
            >
              Salir del modo empresa
            </Text>
          </Pressable>
        </View>
      </View>
      </DrawerBlurShell>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: "100%",
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  actionGroup: {
    gap: 10,
  },
  actionGroupCompact: {
    gap: 8,
  },
  actionIconWrapCompact: {
    borderRadius: 14,
    height: 34,
    width: 34,
  },
  actionItem: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  actionItemCompact: {
    borderRadius: 16,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionItemPressed: {
    opacity: 0.88,
  },
  content: {
    gap: 18,
    padding: 18,
  },
  contentCompact: {
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footer: {
    marginTop: "auto",
  },
  footerActions: {
    paddingBottom: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  footerActionsLandscape: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerCompact: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerDescriptionCompact: {
    lineHeight: 17,
  },
  metricIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  metricIconWrapCompact: {
    borderRadius: 12,
    height: 28,
    width: 28,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  metricItemCompact: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    flex: 0,
    gap: 2,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricCompactCopy: {
    flex: 1,
    paddingHorizontal: 8,
  },
  metricLabelCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricValueCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricsRowCompact: {
    flexDirection: "column",
    gap: 8,
  },
  modeExitButton: {
    alignItems: "center",
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeExitButtonLandscape: {
    borderRadius: 13,
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeExitButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  modeExitButtonLabelLandscape: {
    fontSize: 12,
  },
  modeExitButtonPressed: {
    opacity: 0.78,
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
  sectionLabel: {
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillCompact: {
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tipCard: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipCardCompact: {
    borderRadius: 18,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipCopy: {
    flex: 1,
    gap: 4,
  },
  tipIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
});

export default EmpresaDrawerContent;