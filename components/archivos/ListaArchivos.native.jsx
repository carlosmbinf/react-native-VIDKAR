import MeteorBase from "@meteorrn/core";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import AprobacionEvidenciasVenta from "./AprobacionEvidenciasVenta.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const EFECTIVO_LIST_FIELDS = {
  _id: 1,
  cobrado: 1,
  comentario: 1,
  createdAt: 1,
  estado: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  precioOficial: 1,
  userId: 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
  "producto.status": 1,
  "producto.type": 1,
  "producto.userId": 1,
};

const ListaVentasEfectivo = () => {
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = Meteor.user()?.profile?.role === "admin" || false;
  const isAdminPrincipal = Meteor.user()?.username === "carlosmbinf" || false;
  const dataReady = useDeferredScreenData();

  const listIdSubordinados = Meteor.useTracker(() => {
    if (!dataReady || !isAdmin) {
      return [];
    }

    Meteor.subscribe(
      "user",
      { bloqueadoDesbloqueadoPor: Meteor.userId() },
      { fields: { _id: 1 } },
    );
    return Meteor.users
      .find({ bloqueadoDesbloqueadoPor: Meteor.userId() })
      .fetch()
      .map((user) => user._id);
  }, [dataReady, isAdmin, Meteor.userId()]);

  const { cargando, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { cargando: true, ventas: [] };
    }

    const filtroBase = {
      isCobrado: false,
      metodoPago: "EFECTIVO",
      isCancelada: false,
    };
    const query = isAdminPrincipal
      ? filtroBase
      : isAdmin
        ? {
            ...filtroBase,
            $or: [
              { userId: Meteor.userId() },
              { userId: { $in: listIdSubordinados } },
            ],
          }
        : { ...filtroBase, userId: Meteor.userId() };

    const sub = Meteor.subscribe("ventasRecharge", query, {
      fields: EFECTIVO_LIST_FIELDS,
    });
    const ready = sub.ready();
    const ventasData = ready
      ? VentasRechargeCollection.find(query, {
          fields: EFECTIVO_LIST_FIELDS,
          sort: { createdAt: -1 },
        }).fetch()
      : [];

    return { cargando: !ready, ventas: ventasData };
  }, [dataReady, isAdmin, isAdminPrincipal, listIdSubordinados, Meteor.userId()]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Aprobaciones de ventas efectivo"
        showBackButton
        backHref="/(normal)/Main"
      />
      {cargando ? (
        <Surface style={styles.centrado}>
          <ActivityIndicator size="large" />
          <Text style={styles.textoCargando}>Cargando ventas...</Text>
        </Surface>
      ) : (
        <Surface style={styles.container}>
          <FlatList
            data={ventas}
            renderItem={({ item }) => (
              <AprobacionEvidenciasVenta venta={item} />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={
              ventas.length === 0
                ? styles.listEmptyContainer
                : styles.listContent
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.centrado}>
                <Text style={styles.textoVacio}>No hay ventas en efectivo</Text>
                <Button mode="outlined" onPress={onRefresh}>
                  Recargar
                </Button>
              </View>
            }
          />
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centrado: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  listEmptyContainer: {
    flexGrow: 1,
  },
  screen: {
    backgroundColor: "#f3f5fb",
    flex: 1,
  },
  textoCargando: {
    fontSize: 16,
    marginTop: 16,
  },
  textoVacio: {
    color: "#666",
    fontSize: 16,
    marginBottom: 16,
  },
});

export default ListaVentasEfectivo;
