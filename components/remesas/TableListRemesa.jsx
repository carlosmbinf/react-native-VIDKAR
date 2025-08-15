import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { DataTable, Text, Chip, Surface, Portal, Dialog, Button, IconButton } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { VentasRechargeCollection } from '../collections/collections';

const chipColorEstado = (estado) => {
  switch (estado) {
    case 'ENTREGADO':
      return '#28a745';
    case 'PENDIENTE_ENTREGA':
      return '#ffc107';
    case 'CANCELADO':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

// nuevo: mapeo a etiquetas amigables
const estadoLabel = (estado) => {
  switch (estado) {
    case 'PENDIENTE_ENTREGA':
      return 'Pendiente';
    case 'ENTREGADO':
      return 'Entregado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return estado;
  }
};

const getItemsCount = (venta) => (
  venta?.producto?.carritos?.length ||
  venta?.carrito?.length ||
  venta?.producto?.carrito?.length ||
  0
);

const getItemsArray = (venta) =>
  venta?.producto?.carritos ||
  venta?.carrito ||
  venta?.producto?.carrito ||
  [];

// nuevo: derivar estado desde los carritos
const deriveEstadoVenta = (venta) => {
  const carritos = getItemsArray(venta) || [];
  if (carritos.length === 0) return venta?.estado || 'PENDIENTE_ENTREGA';

  const hasCancel = carritos.some(c => c?.status === 'CANCELLED' || c?.cancelado === true);
  if (hasCancel) return 'CANCELADO';

  const allCompleted = carritos.every(c => c?.status === 'COMPLETED' || c?.entregado === true);
  if (allCompleted) return 'ENTREGADO';

  return 'PENDIENTE_ENTREGA';
};

const TableListRemesa = () => {
  const { width, height } = useWindowDimensions();
  const isWide = width > height || width >= 768; // apaisado o tablet

  // nuevo: flex por columna según ancho
  const flexes = React.useMemo(() => {
    return isWide
      ? { fecha: 1.4, metodo: 1.1, estado: 1.2, cobrado: 0.9, enviado: 0.9, items: 0.6, acc: 0.35 }
      : { fecha: 1.6, estado: 1.5, acc: 0.35 };
  }, [isWide]);

  const { ventas, loading } = useTracker(() => {
    const sub = Meteor.subscribe('ventasRecharge');
    const isAdmin = Meteor.user()?.profile?.role === 'admin';
    const query = isAdmin ? {} : { userId: Meteor.userId() };
    const ventas = VentasRechargeCollection.find(query, { sort: { createdAt: -1 } });
    return { ventas, loading: !sub.ready() };
  }, []);

  const [visible, setVisible] = React.useState(false);
  const [ventaSel, setVentaSel] = React.useState(null);

  const openDialog = (venta) => { setVentaSel(venta); setVisible(true); };
  const closeDialog = () => { setVisible(false); setVentaSel(null); };

  const formatFecha = (d) => (d ? new Date(d).toLocaleString() : '-');
  const money = (v, m) => `${v ?? 0} ${m ?? ''}`.trim();

  // calcular alturas máximas para que el diálogo completo quepa en pantalla
  const maxDialogHeight = Math.floor(height * 0.9); // 90% de alto de pantalla
  const headerActionsReserve = 140; // espacio aprox. para título + acciones
  const maxScrollHeight = Math.max(200, maxDialogHeight - headerActionsReserve);

  return (
    <Surface style={{ height: '100%' }}>
      <ScrollView style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>Lista de Remesas</Text>

        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ flex: flexes.fecha }}>Fecha</DataTable.Title>
            {isWide && <DataTable.Title style={{ flex: flexes.metodo }}>Método</DataTable.Title>}
            <DataTable.Title style={{ flex: flexes.estado }}>Estado</DataTable.Title>
            {isWide && <DataTable.Title numeric style={{ flex: flexes.cobrado }}>Cobrado</DataTable.Title>}
            {isWide && <DataTable.Title numeric style={{ flex: flexes.enviado }}>Enviado</DataTable.Title>}
            {isWide && <DataTable.Title numeric style={{ flex: flexes.items }}>Ítems</DataTable.Title>}
            <DataTable.Title numeric style={{ flex: flexes.acc }}>Acc.</DataTable.Title>
          </DataTable.Header>

          {loading ? (
            <DataTable.Row>
              <DataTable.Cell>Cargando...</DataTable.Cell>
            </DataTable.Row>
          ) : (
            ventas.map((row, idx) => {
              const fecha = formatFecha(row?.createdAt);
              const metodo = row?.metodoPago || '-';
              const cobrado = money(row?.cobrado, row?.monedaCobrado);
              const enviado = money(row?.precioOficial, row?.monedaPrecioOficial);
              const items = getItemsCount(row);
              const estadoDerivado = deriveEstadoVenta(row); // usar estado derivado

              return (
                <DataTable.Row key={row?._id || idx}>
                  <DataTable.Cell style={{ flex: flexes.fecha }}>{fecha}</DataTable.Cell>
                  {isWide && <DataTable.Cell style={{ flex: flexes.metodo }}>{metodo}</DataTable.Cell>}
                  <DataTable.Cell style={{ flex: flexes.estado }}>
                    <Chip compact={!isWide} style={{ backgroundColor: chipColorEstado(estadoDerivado) }} textStyle={{ color: 'white' }}>
                      {estadoLabel(estadoDerivado)}
                    </Chip>
                  </DataTable.Cell>
                  {isWide && <DataTable.Cell numeric style={{ flex: flexes.cobrado }}>{cobrado}</DataTable.Cell>}
                  {isWide && <DataTable.Cell numeric style={{ flex: flexes.enviado }}>{enviado}</DataTable.Cell>}
                  {isWide && <DataTable.Cell numeric style={{ flex: flexes.items }}>{items}</DataTable.Cell>}
                  <DataTable.Cell numeric style={{ flex: flexes.acc }}>
                    <IconButton icon="information-outline" size={18} style={{ margin: 0 }} onPress={() => openDialog(row)} />
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })
          )}
        </DataTable>
      </ScrollView>

      <Portal>
        <Dialog visible={visible} onDismiss={closeDialog} style={{ maxHeight: maxDialogHeight }}>
          <Dialog.Title>Detalle de remesa</Dialog.Title>
          <Dialog.Content>
            <ScrollView
              style={{ maxHeight: maxScrollHeight }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {ventaSel ? (
                <>
                  <Text>Fecha: {formatFecha(ventaSel.createdAt)}</Text>
                  <Text>Método de pago: {ventaSel.metodoPago || '-'}</Text>
                  <Text>Estado: {estadoLabel(deriveEstadoVenta(ventaSel))}</Text>
                  <Text>Cobrado: {money(ventaSel.cobrado, ventaSel.monedaCobrado)}</Text>
                  <Text>Enviado: {money(ventaSel.precioOficial, ventaSel.monedaPrecioOficial)}</Text>
                  {!!ventaSel?.comentario && <Text>Comentario: {ventaSel.comentario}</Text>}
                  <Text style={{ marginTop: 12, fontWeight: 'bold' }}>Ítems</Text>
                  {getItemsArray(ventaSel).length === 0 ? (
                    <Text>- Sin ítems -</Text>
                  ) : (
                    getItemsArray(ventaSel).map((it, i) => (
                      <Surface key={i} style={styles.item}>
                        <Text>Nombre: {it?.nombre || '-'}</Text>
                        <Text>Entregar: {(it?.recibirEnCuba ?? 0)} {it?.monedaRecibirEnCuba || ''}</Text>
                        {it?.tarjetaCUP ? <Text>Tarjeta CUP: {it.tarjetaCUP}</Text> : null}
                        {it?.direccionCuba ? <Text>Dirección: {it.direccionCuba}</Text> : null}
                        {typeof it?.entregado === 'boolean' && (
                          <Text>Entregado: {it.entregado ? 'Sí' : 'No'}</Text>
                        )}
                        {it?.comentario ? <Text>Comentario: {it.comentario}</Text> : null}
                      </Surface>
                    ))
                  )}
                </>
              ) : (
                <Text>Sin datos</Text>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 16, textAlign: 'center' },
  item: { padding: 8, marginTop: 8 }
});

export default TableListRemesa;
