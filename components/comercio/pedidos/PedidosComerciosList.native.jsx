import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Appbar, Menu, Surface, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import WizardConStepper from "../../carritoCompras/WizardConStepper.native";
import { VentasRechargeCollection } from "../../collections/collections";
import MenuIconMensajes from "../../components/MenuIconMensajes.native";
import BlurMenuSurface, { blurMenuContentStyle } from "../../Header/BlurMenuSurface";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import PedidoCard from "./components/PedidoCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PEDIDOS_COMERCIO_FIELDS = {
  _id: 1,
  cadeteid: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  producto: 1,
};

const PedidosComerciosListNative = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVentas, setExpandedVentas] = useState({});
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const dataReady = useDeferredScreenData();

  const { ready, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { ready: false, ventas: [] };
    }

    const userId = Meteor.userId();

    if (!userId) {
      return { ready: true, ventas: [] };
    }

    const sub = Meteor.subscribe("ventasRecharge", {
      userId,
      "producto.carritos.type": "COMERCIO",
    }, {
      fields: PEDIDOS_COMERCIO_FIELDS,
    });

    const ventasData = VentasRechargeCollection.find(
      {
        userId,
        "producto.carritos.type": "COMERCIO",
      },
      { fields: PEDIDOS_COMERCIO_FIELDS, sort: { createdAt: -1 } },
    ).fetch();

    return { ready: sub.ready(), ventas: ventasData };
  }, [dataReady]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const toggleExpanded = useCallback((ventaId) => {
    setExpandedVentas((previous) => ({
      ...previous,
      [ventaId]: !previous[ventaId],
    }));
  }, []);

  const getStepFromStatus = useCallback((venta) => {
    if (venta.isCancelada === true) {
      return -1;
    }

    const steps = {
      PREPARANDO: 1,
      CADETEENDESTINO: 4,
      CADETEENLOCAL: 2,
      ENCAMINO: 3,
      ENTREGADO: 5,
    };

    return steps[venta.estado] || 1;
  }, []);

  const renderItem = useCallback(
    ({ item: venta }) => (
      <PedidoCard
        currentStep={getStepFromStatus(venta)}
        isExpanded={expandedVentas[venta._id]}
        onToggleExpand={() => toggleExpanded(venta._id)}
        venta={venta}
      />
    ),
    [expandedVentas, getStepFromStatus, toggleExpanded],
  );

  const listHeaderComponent = useCallback(
    () => (
      <Surface style={styles.headerSection}>
        <Text style={styles.headerTitle} variant="titleLarge">
          📋 Mis Pedidos
        </Text>
        <Text style={styles.headerSubtitle} variant="bodyMedium">
          {ventas.length} pedido(s) realizados
        </Text>
      </Surface>
    ),
    [ventas.length],
  );

  if (!ready) {
    return <LoadingState />;
  }

  if (ventas.length === 0) {
    return <EmptyState />;
  }

  return (
    <Surface style={styles.surface}>
      <Appbar
        style={[
          styles.appbar,
          {
            height: insets.top + 50,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.appbarRow}>
          <Appbar.BackAction
            color="#ffffff"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }

              router.replace("/(normal)/ComerciosList");
            }}
          />

          <View style={styles.rightActionRow}>
            <MenuIconMensajes
              onOpenMessages={(item) => {
                if (item) {
                  router.push(
                    `/(normal)/Mensaje?item=${encodeURIComponent(item)}`,
                  );
                  return;
                }

                router.push("/(normal)/Mensaje");
              }}
            />
            <WizardConStepper />
            <Menu
              anchorPosition="bottom"
              anchor={
                <Appbar.Action
                  color="#ffffff"
                  icon="dots-vertical"
                  onPress={() => setProfileMenuVisible(true)}
                />
              }
              contentStyle={styles.profileMenuContent}
              onDismiss={() => setProfileMenuVisible(false)}
              visible={profileMenuVisible}
            >
              <BlurMenuSurface>
                <Menu.Item
                  leadingIcon="account"
                  onPress={() => {
                    setProfileMenuVisible(false);
                    router.push("/(normal)/User");
                  }}
                  title="Mi usuario"
                />
                <Menu.Item
                  leadingIcon="logout"
                  onPress={() => {
                    setProfileMenuVisible(false);
                    Meteor.logout(() => {
                      router.replace("/(auth)/Loguin");
                    });
                  }}
                  title="Cerrar Sesión"
                />
              </BlurMenuSurface>
            </Menu>
          </View>
        </View>
      </Appbar>

      <FlatList
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState />}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.flatListContent}
        data={ventas}
        initialNumToRender={5}
        keyExtractor={(item) => item._id}
        maxToRenderPerBatch={5}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        removeClippedSubviews
        renderItem={renderItem}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: "#3f51b5",
    justifyContent: "center",
  },
  appbarRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  flatListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerSection: {
    borderRadius: 12,
    elevation: 8,
    marginBottom: 16,
    padding: 16,
  },
  headerSubtitle: {
    color: "#616161",
  },
  headerTitle: {
    color: "#FF6F00",
    fontWeight: "bold",
    marginBottom: 4,
  },
  rightActionRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  profileMenuContent: {
    ...blurMenuContentStyle,
    width: 210,
  },
  separator: {
    height: 12,
  },
  surface: {
    flex: 1,
  },
});

export default PedidosComerciosListNative;
