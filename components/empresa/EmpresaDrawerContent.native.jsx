import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Divider, Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductosComercioCollection, TiendasComercioCollection } from "../collections/collections";
import { createEmpresaPalette } from "./styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const DrawerMetric = ({ icon, label, palette, value }) => {
  return (
    <Surface
      style={[
        styles.metricItem,
        {
          backgroundColor: palette.cardSoft,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={[styles.metricIconWrap, { backgroundColor: palette.brandSoft }]}>
        <MaterialCommunityIcons color={palette.brandStrong} name={icon} size={18} />
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

const DrawerAction = ({ description, icon, label, onPress, palette }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionItem,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        pressed ? styles.actionItemPressed : null,
      ]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: palette.brandSoft }]}> 
        <MaterialCommunityIcons color={palette.icon} name={icon} size={20} />
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
  const palette = createEmpresaPalette(theme);

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

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "Se cerrará la sesión actual en este dispositivo.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => {
          Meteor.logout(() => {
            onClose?.();
            router.replace("/(auth)/Loguin");
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.panel }]} edges={["top", "bottom", "left"]}>
      <Surface style={[styles.panel, { backgroundColor: palette.panel }]}> 
      <View
        style={[
          styles.header,
          {
            backgroundColor: palette.hero,
            borderBottomColor: palette.border,
          },
        ]}
      >
        {user?.picture ? (
          <Avatar.Image size={58} source={{ uri: user.picture }} />
        ) : (
          <Avatar.Text
            label={user?.profile?.firstName?.slice(0, 2)?.toUpperCase() || user?.username?.slice(0, 2)?.toUpperCase() || "EM"}
            size={58}
            style={{ backgroundColor: palette.brand }}
          />
        )}

        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={{ color: palette.title }} variant="titleMedium">
            {user?.profile?.firstName || user?.username || "Empresa"}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: palette.brandSoft }]}> 
            <Text style={{ color: palette.brandStrong }} variant="labelMedium">
              Modo empresa activo
            </Text>
          </View>
          <Text style={{ color: palette.copy }} variant="bodySmall">
            Gestiona tus tiendas, productos y pedidos de preparación desde este espacio.
          </Text>
        </View>
      </View>

      <Divider />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 18 + Math.max(insets.bottom, 8) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: palette.muted }]} variant="labelMedium">
          Operación
        </Text>

        <View style={styles.metricsRow}>
          <DrawerMetric icon="storefront-outline" label="Tiendas" palette={palette} value={tiendasCount} />
          <DrawerMetric icon="package-variant-closed" label="Productos" palette={palette} value={productosCount} />
          <DrawerMetric icon="clipboard-list-outline" label="Estado" palette={palette} value="Activa" />
        </View>

        <View style={styles.actionGroup}>
          <DrawerAction
            description="Revisa, prepara y deja listos los pedidos antes de que el cadete los recoja."
            icon="clipboard-list-outline"
            label="Pedidos de preparación"
            onPress={() => navigateTo("/(empresa)/PedidosPreparacion")}
            palette={palette}
          />
          <DrawerAction
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

        <View style={styles.actionGroup}>
          <DrawerAction
            description="Consulta tus datos de usuario dentro del entorno empresa."
            icon="account-outline"
            label="Mi usuario"
            onPress={() => navigateTo("/(empresa)/User")}
            palette={palette}
          />
          <DrawerAction
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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Divider />
        <View style={styles.footerActions}>
          <Button
            buttonColor={palette.cardSoft}
            mode="contained-tonal"
            onPress={handleExitEmpresaMode}
            textColor={palette.brandStrong}
          >
            Salir del modo empresa
          </Button>
          <Button mode="outlined" onPress={handleLogout} textColor={palette.title}>
            Cerrar sesión
          </Button>
        </View>
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
  actionItem: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  actionItemPressed: {
    opacity: 0.88,
  },
  content: {
    gap: 18,
    padding: 18,
  },
  footer: {
    marginTop: "auto",
  },
  footerActions: {
    gap: 10,
    padding: 18,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  metricIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 32,
    justifyContent: "center",
    width: 32,
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
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  panel: {
    flex: 1,
    width: "100%",
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
  tipCard: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
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