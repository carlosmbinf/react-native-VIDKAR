import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip, Divider, Button, List, IconButton } from 'react-native-paper';
import Meteor from '@meteorrn/core';

const estados = ['Pago Confirmado', 'Pendiente de Entrega', 'Entregado'];

const obtenerPasoDesdeEstado = (venta) => {
  const total = venta?.producto?.carritos?.filter(carrito => !carrito.entregado)?.length;
  return total > 0 ? 1 : 2;
};

const VentasStepper = ({ idAdmin }) => {
  const [ventas, setVentas] = useState([]);
  const [ventasEntregadas, setVentasEntregadas] = useState([]);

  useEffect(() => {
    const fetchVentas = async () => {
      Meteor.subscribe('ventasRecharge', { "producto.carritos.type": { $not: { $eq: "RECARGA" } } });
      const fetchedVentas = await Meteor.collection('VentasRechargeCollection').find({ "producto.carritos.entregado": false });
      const fetchedEntregadas = await Meteor.collection('VentasRechargeCollection').find({ "producto.carritos.entregado": true });
      setVentas(fetchedVentas);
      setVentasEntregadas(fetchedEntregadas);
    };
    fetchVentas();
  }, []);

  const marcarItemEntregado = (ventaId, itemIndex) => {
    Meteor.call('ventas.marcarItemEntregado', { ventaId, itemIndex }, (err) => {
      if (err) alert('Error al actualizar el estado: ' + err.reason);
    });
  };

  const marcarItemNoEntregado = (ventaId, itemIndex) => {
    Meteor.call('ventas.marcarItemNoEntregado', { ventaId, itemIndex }, (err) => {
      if (err) alert('Error al actualizar el estado: ' + err.reason);
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Seguimiento de tus Remesas sin Entregar</Text>
      {ventas.length === 0 && <Text>No tienes remesas registradas sin entregar.</Text>}

      {ventas.map((venta, index) => (
        <Card key={venta._id} style={styles.card}>
          <Card.Title title={`Remesa #${index + 1}`} subtitle={venta.createdAt?.toLocaleString()} />
          <Divider />
          <List.Section>
            {estados.map((estado, i) => (
              <List.Item
                key={i}
                title={estado}
                left={() => <IconButton icon={i <= obtenerPasoDesdeEstado(venta) ? "check-circle" : "circle-outline"} />}
              />
            ))}
          </List.Section>
          <Divider />
          <View style={styles.chipContainer}>
            <Chip style={styles.chip}>Cobrado: {venta.cobrado} USD</Chip>
            <Chip style={styles.chip}>Enviado: {venta.precioOficial || 'N/A'} USD</Chip>
            <Chip style={styles.chip}>Método de Pago: {venta.metodoPago || 'N/A'}</Chip>
          </View>
          <Divider />
          {venta?.producto?.carritos?.map((item, i) => (
            <Card key={i} style={styles.itemCard}>
              <Text>Nombre: {item.nombre || 'N/A'}</Text>
              <Text>Entregar: {item.recibirEnCuba || '0'} {item.monedaRecibirEnCuba}</Text>
              <Text>Tarjeta CUP: {item.tarjetaCUP || 'N/A'}</Text>
              <Text>Dirección: {item.direccionCuba || 'N/A'}</Text>
              {item.entregado ? (
                <Button mode="contained" onPress={() => marcarItemNoEntregado(venta._id, i)}>Marcar como No Entregado</Button>
              ) : (
                <Button mode="contained" onPress={() => marcarItemEntregado(venta._id, i)}>Marcar como Entregado</Button>
              )}
            </Card>
          ))}
        </Card>
      ))}

      <Text variant="headlineMedium" style={styles.title}>Seguimiento de tus Remesas Entregadas</Text>
      {ventasEntregadas.length === 0 && <Text>No tienes remesas entregadas.</Text>}

      {ventasEntregadas.map((venta, index) => (
        <Card key={venta._id} style={styles.card}>
          <Card.Title title={`Remesa #${index + 1}`} subtitle={venta.createdAt?.toLocaleString()} />
          <Divider />
          <View style={styles.chipContainer}>
            <Chip style={styles.chip}>Cobrado: {venta.cobrado} USD</Chip>
            <Chip style={styles.chip}>Enviado: {venta.precioOficial || 'N/A'} USD</Chip>
            <Chip style={styles.chip}>Método de Pago: {venta.metodoPago || 'N/A'}</Chip>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  chip: {
    margin: 4,
  },
  itemCard: {
    marginVertical: 8,
    padding: 16,
  },
});

export default VentasStepper;
