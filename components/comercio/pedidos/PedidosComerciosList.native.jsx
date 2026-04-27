import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Menu, Surface, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useDeferredScreenData from "../../../hooks/useDeferredScreenData";
import WizardConStepper from "../../carritoCompras/WizardConStepper.native";
import { VentasRechargeCollection } from "../../collections/collections";
import MenuIconMensajes from "../../components/MenuIconMensajes.native";
import BlurMenuSurface, { blurMenuContentStyle } from "../../Header/BlurMenuSurface";
import useSafeBack from "../../navigation/useSafeBack";
import EmptyState from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import PedidoCard from "./components/PedidoCard";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const PEDIDOS_COMERCIO_SUMMARY_FIELDS = {
  _id: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  "producto.carritos": 1,
  userId: 1,
};

const hasCommerceItems = (venta) => {
  const carritos = Array.isArray(venta?.producto?.carritos)
    ? venta.producto.carritos
    : [];

  return carritos.some((item) => item?.type === "COMERCIO");
};

const INITIAL_RENDER_COUNT = 4;
const RENDER_BATCH_SIZE = 4;

const PedidosComerciosListNative = () => {
  const router = useRouter();
  const safeBack = useSafeBack("/(normal)/ComerciosList");
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVentas, setExpandedVentas] = useState({});
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
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
      fields: PEDIDOS_COMERCIO_SUMMARY_FIELDS,
    });

    const ventasData = VentasRechargeCollection.find(
      { userId },
      { fields: PEDIDOS_COMERCIO_SUMMARY_FIELDS, sort: { createdAt: -1 } },
    ).fetch().filter(hasCommerceItems);

    return { ready: sub.ready(), ventas: ventasData };
  }, [dataReady]);

  useEffect(() => {
    if (!ventas.length) {
      setVisibleCount(INITIAL_RENDER_COUNT);
      setLoadingMore(false);
      return;
    }

    setVisibleCount((current) => {
      const nextBase = Math.min(INITIAL_RENDER_COUNT, ventas.length);
      if (!current || current < nextBase) {
        return nextBase;
      }

      return Math.min(current, ventas.length);
    });

    if (loadingMore && visibleCount >= ventas.length) {
      setLoadingMore(false);
    }
  }, [loadingMore, ventas.length, visibleCount]);

  const visibleVentas = useMemo(
    () => ventas.slice(0, Math.min(visibleCount, ventas.length)),
    [ventas, visibleCount],
  );

  const canLoadMore = visibleCount < ventas.length;

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

  const handleLoadMore = useCallback(() => {
    if (!ready || loadingMore || !canLoadMore) {
      return;
    }

    setLoadingMore(true);

    setTimeout(() => {
      setVisibleCount((current) =>
        Math.min(current + RENDER_BATCH_SIZE, ventas.length),
      );
      setLoadingMore(false);
    }, 220);
  }, [canLoadMore, loadingMore, ready, ventas.length]);

  const getStepFromStatus = useCallback((venta) => {
    if (venta.isCancelada === true) {
      return -1;
    }

    const steps = {
      PREPARANDO: 1,
      CADETEENLOCAL: 2,
      ENCAMINO: 3,
      CADETEENDESTINO: 4,
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

  const listFooterComponent = useCallback(() => {
    if (!loadingMore) {
      return <View style={styles.listFooterSpacer} />;
    }

    return (
      <View style={styles.listFooterLoading}>
        <ActivityIndicator color="#7c3aed" size="small" />
        <Text style={styles.listFooterText}>Cargando más pedidos...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderAppbar = useCallback(
    () => (
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
            onPress={safeBack}
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
    ),
    [insets.top, profileMenuVisible, router, safeBack],
  );

  if (!ready) {
    return (
      <Surface style={styles.surface}>
        {renderAppbar()}
        <LoadingState />
      </Surface>
    );
  }

  if (ventas.length === 0) {
    return (
      <Surface style={styles.surface}>
        {renderAppbar()}
        <EmptyState />
      </Surface>
    );
  }

  return (
    <Surface style={styles.surface}>
      {renderAppbar()}

      <FlatList
        alwaysBounceVertical
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={listFooterComponent}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.flatListContent}
        data={visibleVentas}
        initialNumToRender={5}
        keyExtractor={(item) => item._id}
        maxToRenderPerBatch={5}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        removeClippedSubviews={false}
        renderItem={renderItem}
        showsVerticalScrollIndicator
        style={styles.list}
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
    flexGrow: 1,
    padding: 16,
    paddingBottom: 72,
  },
  list: {
    flex: 1,
  },
  listFooterLoading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 18,
    paddingTop: 6,
  },
  listFooterSpacer: {
    height: 14,
  },
  listFooterText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginLeft: 10,
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
