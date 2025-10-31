import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator, Surface } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import AprobacionEvidenciasVenta from './AprobacionEvidenciasVenta';
import { VentasRechargeCollection } from '../collections/collections';

const ListaVentasEfectivo = ({ userId }) => {
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = Meteor.user()?.profile?.role === 'admin' || false;
  const isAdminPrincipal = Meteor.user()?.username === 'carlosmbinf' || false;

  const listIdSubordinados = useTracker(() => {
    if (isAdmin) {
      Meteor.subscribe("user", { bloqueadoDesbloqueadoPor: Meteor.userId() }, { fields: { _id: 1 } });
      return Meteor.users.find({ bloqueadoDesbloqueadoPor: Meteor.userId() }).fetch().map(u => u._id);
    }
    return [];
  }, [isAdmin, Meteor.userId()]);

  const { ventas, cargando } = useTracker(() => {
    const filtroBase = { isCobrado: false, metodoPago: "EFECTIVO", isCancelada: false };
    const query = isAdminPrincipal
      ? filtroBase
      : isAdmin
        ? { ...filtroBase, $or: [{ userId: Meteor.userId() }, { userId: { $in: listIdSubordinados } }] }
        : { ...filtroBase, userId: Meteor.userId() };

    const sub = Meteor.subscribe('ventasRecharge', query);
    const ready = sub.ready();
    const ventas = ready ? VentasRechargeCollection.find(query, { sort: { createdAt: -1 } }).fetch() : [];
    return { ventas, cargando: !ready };
  }, [isAdmin, isAdminPrincipal, listIdSubordinados, Meteor.userId()]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" />
        <Text style={styles.textoCargando}>Cargando ventas...</Text>
      </View>
    );
  }

  return (
    <Surface style={styles.container}>
      <FlatList
        data={ventas}
        renderItem={({ item }) => <AprobacionEvidenciasVenta venta={item} />}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Text style={styles.textoVacio}>No hay ventas en efectivo</Text>
            <Button mode="outlined" onPress={onRefresh}>Recargar</Button>
          </View>
        }
      />
    </Surface>
  );
};

export default ListaVentasEfectivo;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoCargando: { marginTop: 16, fontSize: 16 },
  textoVacio: { fontSize: 16, color: '#666', marginBottom: 16 },
});
