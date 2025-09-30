import React from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { DataTable, Text, Chip, Surface, Portal, Dialog, Button, IconButton, Divider } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { TransaccionRecargasCollection, VentasRechargeCollection } from '../collections/collections';
import SubidaArchivos from '../archivos/SubidaArchivos';

const chipColorEstado = (estado) => {
  switch (estado) {
    case 'ENTREGADO':
      return '#28a745';
    case 'PENDIENTE_ENTREGA':
      return '#ffc107';
    case 'CANCELADO':
    case 'PENDIENTE_PAGO':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

// nuevo: mapeo a etiquetas amigables
const estadoLabel = (estado) => {
  switch (estado) {
    case 'PENDIENTE_PAGO':
      return 'Pendiente de Pago';
    case 'PENDIENTE_ENTREGA':
      return 'Pendiente';
    case 'ENTREGADO':
      return 'Pagado';
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
  (venta?.producto?.carritos ||
    venta?.carrito ||
    venta?.producto?.carrito ||
    [])?.filter(carrito => carrito.type === 'RECARGA') || [];


const TableRecargas = () => {
  const { width, height } = useWindowDimensions();
  const isWide = width > height || width >= 768; // apaisado o tablet

  // nuevo: flex por columna según ancho
  const flexes = React.useMemo(() => {
    return isWide
      ? { fecha: 1.4, metodo: 1.1, estado: 1.2, cobrado: 0.9, enviado: 0.9, items: 0.6, acc: 0.35 }
      : { fecha: 1.6, estado: 1.5, acc: 0.35 };
  }, [isWide]);

  const isAdmin = Meteor.user()?.profile?.role === 'admin' || false;
  const isAdminPrincipal = Meteor.user()?.username === 'carlosmbinf' || false;

  const listIdSubordinados = useTracker(() => {
    console.log("idAdmin", Meteor.userId());
    isAdmin && Meteor.subscribe("user", { bloqueadoDesbloqueadoPor: Meteor.userId() }, { fields: { _id: 1, bloqueadoDesbloqueadoPor: 1 } })
    return isAdmin ? Meteor.users.find({ bloqueadoDesbloqueadoPor: Meteor.userId() }).fetch()?.map((element) => element._id) : [];
  }, [Meteor.userId()]);

  const { ventas, loading } = useTracker(() => {

    const sub = Meteor.subscribe('ventasRecharge', isAdminPrincipal ? { 'producto.carritos.type': 'RECARGA' } : (isAdmin ? { 'producto.carritos.type': 'RECARGA', $or: [{ userId: Meteor.userId() }, { userId: { $in: listIdSubordinados } }] } : { 'producto.carritos.type': 'RECARGA', userId: Meteor.userId() }));
    const query = isAdminPrincipal ? { 'producto.carritos.type': 'RECARGA' } : (isAdmin ? { 'producto.carritos.type': 'RECARGA', $or: [{ userId: Meteor.userId() }, { userId: { $in: listIdSubordinados } }] } : { 'producto.carritos.type': 'RECARGA', userId: Meteor.userId() });
    console.log("query", query);
    const ventas = VentasRechargeCollection.find(query, { sort: { createdAt: -1 } });
    return { ventas, loading: !sub.ready() };
  }, [listIdSubordinados]);

  // nuevo: normalizar ventas a array (puede venir como cursor)
  const ventasArr = React.useMemo(() => {
    if (!ventas) return [];
    if (Array.isArray(ventas)) return ventas;
    if (typeof ventas.fetch === 'function') return ventas.fetch();
    try { return Array.from(ventas); } catch { return []; }
  }, [ventas]);

  // nuevo: obtener carritoIds únicos de las ventas
  const carritoIds = React.useMemo(() => {
    const ids = [];
    for (const v of ventasArr) {
      const carritos = getItemsArray(v) || [];
      for (const c of carritos) {
        if (c?._id) ids.push(String(c._id));
      }
    }
    return Array.from(new Set(ids));
  }, [ventasArr]);

  // nuevo: tracker de transacciones por externalId de carritos
  const { transacciones, cargandoTransacciones } = useTracker(() => {
    if (!carritoIds || carritoIds.length === 0) return { loading: false };
    const sub = Meteor.subscribe('transacciones', { externalId: { $in: carritoIds } });
    // mantener reactividad
    let transacciones = TransaccionRecargasCollection.find({ externalId: { $in: carritoIds } }).fetch();
    return { transacciones, cargandoTransacciones: !sub.ready() };
  }, [JSON.stringify(carritoIds)]);

  const transaccion = (idCarrito) => {
    console.log("idCarrito", idCarrito);
    let trans = transacciones.find(t => t.externalId === idCarrito);
    console.log("trans", trans);
    return trans
  }

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

  // nuevo: derivar estado desde los carritos
  const deriveEstadoVenta = (venta) => {
    const carritos = getItemsArray(venta) || [];
    const isCanceladaVenta = venta.isCancelada;
    const isCobrado = venta.isCobrado;
    if (isCobrado) return 'ENTREGADO';
    if (isCanceladaVenta) return 'CANCELADO';
    let t = transacciones?.filter(t => carritos?.map(car => car._id)?.includes(t.externalId));
    const allCompleted = t.length > 0 ? t.every(c => c?.status?.message === 'COMPLETED') : false;
    const allCancelled = t.length > 0 ? t.every(c => c?.status?.message === 'CANCELLED') : false;
    
    if (allCompleted) return 'ENTREGADO';
    if (allCancelled) return 'CANCELADO';
    if(venta.isCobrado !== true) return 'PENDIENTE_PAGO';
    if (carritos.length === 0) return 'PENDIENTE_ENTREGA';
    return 'PENDIENTE_ENTREGA';
  };


  return (
    <ScrollView style={styles.container} scrollEnabled>
      <Surface style={{ height: '100%' }}>

        <Text variant="headlineMedium" style={styles.title}>Lista de Recargas</Text>

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
              const estadoDerivado = deriveEstadoVenta(row);

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
        


        <Portal>
          <Dialog visible={visible} onDismiss={closeDialog} style={{ maxHeight: maxDialogHeight }}>
            <Dialog.Content>
              <ScrollView
                style={{ maxHeight: maxScrollHeight }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={false}
                    onRefresh={() => {
                      ventaSel?.producto?.carritos?.forEach(c => {
                        let t = transaccion(c._id)
                        console.log("t", t)
                        t && t?.status?.message != "COMPLETED" ? Meteor.call("dtshop.getStatusTransaccionById", t.id, (error, result) => {
                          if (error) {
                            console.log(error);
                          } else {
                            console.log("result", result);
                          }
                        }) : Alert.alert("Transacción ya completada", "La transacción ya se encuentra completada, no es posible actualizar su estado")
                      });

                    }}
                  />
                }
              >
                {ventaSel ? (
                  <View style={{ borderRadius: 8 }}>


                    <View style={{ padding: 0, borderRadius: 6, marginBottom: 0 }}>
                      <Text style={{ marginBottom: 6 }}><Text style={{ fontWeight: 'bold' }}>ID de la Venta: </Text> {ventaSel._id}</Text>
                      <Divider style={{ marginBottom: 6 }} />
                      <Text style={{ marginBottom: 6 }}>📅 <Text style={{ fontWeight: 'bold' }}>Fecha:</Text> {formatFecha(ventaSel.createdAt)}</Text>
                      <Text style={{ marginBottom: 6 }}>💳 <Text style={{ fontWeight: 'bold' }}>Método de pago:</Text> {ventaSel.metodoPago || '-'}</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ marginBottom: 6 }}>📊 <Text style={{ fontWeight: 'bold' }}>Estado:</Text></Text>
                        <Chip
                          compact
                          style={{
                            backgroundColor: chipColorEstado(deriveEstadoVenta(ventaSel)),
                            marginLeft: 8
                          }}
                          textStyle={{ color: 'black', fontSize: 12 }}
                        >
                          {estadoLabel(deriveEstadoVenta(ventaSel))}
                        </Chip>
                      </View>

                      {/* <Text style={{ marginBottom: 6 }}>💸 <Text style={{ fontWeight: 'bold' }}>Enviado:</Text> {money(ventaSel.precioOficial, ventaSel.monedaPrecioOficial)}</Text> */}

                    </View>
                    <Divider />

                    {/* Lista de Ítems */}
                    <Text variant="titleMedium" style={{ marginBottom: 12, marginTop: 12 }}>
                      📱 Cantidad de Recargas ({getItemsArray(ventaSel).length})
                    </Text>

                    {getItemsArray(ventaSel).length === 0 ? (
                      <Surface style={{ padding: 16, borderRadius: 6, backgroundColor: '#fff3cd', borderColor: '#ffeaa7', borderWidth: 1 }}>
                        <Text style={{ textAlign: 'center', color: '#856404' }}>⚠️ Sin recargas registradas</Text>
                      </Surface>
                    ) : (
                      getItemsArray(ventaSel).map((it, i) => {
                        const transaccionItem = transacciones?.find(t => t.externalId === it._id);
                        const isCompleted = transaccionItem?.status?.message === "COMPLETED";

                        return (
                          <Surface
                            key={i}
                            style={{
                              maxWidth: 400,
                              padding: 14,
                              marginBottom: 12,
                              borderRadius: 8,
                              elevation: 2,
                              borderLeftWidth: 4,
                              borderLeftColor: isCompleted ? '#28a745' : '#ffc107'
                            }}
                          >
                            {/* Header del item */}
                            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#343a40' }}>
                              📱 Recarga #{i + 1}
                            </Text>

                            {/* Información básica */}
                            <Text style={{ marginBottom: 6 }}><Text style={{ fontWeight: 'bold' }}>ID de la Recarga: </Text> {transaccionItem?._id || "N/A"}</Text>
                            <Text style={{ marginBottom: 4 }}>👤 <Text style={{ fontWeight: 'bold' }}>Cliente:</Text> {it?.nombre || 'Sin especificar'}</Text>
                            <Text style={{ marginBottom: 4 }}>📞 <Text style={{ fontWeight: 'bold' }}>Móvil:</Text> {it?.movilARecargar || 'Sin especificar'}</Text>
                            <Text style={{ marginBottom: 6 }}>💰 <Text style={{ fontWeight: 'bold' }}>Precio:</Text> {money(it.cobrarUSD, "USD")}</Text>

                            {/* Estado de entrega */}
                            <Surface style={{
                              padding: 8,
                              borderRadius: 6,
                              backgroundColor: isCompleted ? '#d4edda' : '#fff3cd',
                              marginVertical: 8
                            }}>
                              <Text style={{
                                fontWeight: 'bold',
                                color: isCompleted ? '#155724' : '#856404',
                                marginBottom: 4
                              }}>
                                {isCompleted ? '✅' : '⏳'} Estado de la Recarga
                              </Text>
                              <Text style={{ color: isCompleted ? '#155724' : '#856404' }}>
                                Entregado: {isCompleted ? 'Sí' : 'No'}
                              </Text>
                              <Text style={{ color: isCompleted ? '#155724' : '#856404' }}>
                                Estado: {transaccionItem?.status?.message || 'Pendiente'}
                              </Text>
                            </Surface>

                            {/* Promociones */}
                            {it?.producto?.promotions?.length && <Chip
                              compact
                              style={{
                                backgroundColor: it?.producto?.promotions?.length ? '#28a745' : '#dc3545',
                                // alignSelf: 'flex-start',
                                // marginVertical: 6
                              }}
                              textStyle={{ color: 'white', fontSize: 11 }}
                              icon={it?.producto?.promotions?.length ? 'gift' : 'close-circle'}
                            >
                              {it?.producto?.promotions?.length ? 'CON PROMOCIÓN' : 'SIN PROMOCIÓN'}
                            </Chip>}

                            {/* Comentario del item */}
                            {it?.comentario && (
                              <Surface style={{
                                padding: 8,
                                borderRadius: 6,
                                backgroundColor: '#e9ecef',
                                marginTop: 8
                              }}>
                                <Text style={{ fontStyle: 'italic', color: '#6c757d' }}>
                                  💬 {it.comentario}
                                </Text>
                              </Surface>
                            )}
                          </Surface>
                        );
                      })
                    )}
                    {/* NUEVO: solo para método EFECTIVO */}
                    {ventaSel?.metodoPago === 'EFECTIVO' && (
                      <Surface style={{ marginTop: 5,  borderRadius: 6, backgroundColor: '#fff3cd', borderColor: '#ffeaa7', borderWidth: 1 }}>
                        <Text style={{ textAlign: 'center', color: '#856404', paddingBottom: 5 }}> 
                          ⚠️ Debe subir Evidencia para poder corroborar el pago y Autorizar la recarga
                        </Text>
                        <SubidaArchivos venta={ventaSel} />
                      </Surface>
                    )}
                    
                  </View>
                ) : (
                  <Surface style={{ padding: 20, borderRadius: 8, backgroundColor: '#f8d7da' }}>
                    <Text style={{ textAlign: 'center', color: '#721c24' }}>❌ Sin datos disponibles</Text>
                  </Surface>
                )}
                {!!ventaSel?.comentario && (
                  <Text style={{ marginTop: 8, fontStyle: 'italic' }}>💬 <Text style={{ fontWeight: 'bold' }}></Text>{ventaSel.comentario}</Text>
                )}
              </ScrollView>
            </Dialog.Content>
            <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Button
                mode="contained"
                onPress={closeDialog}
                style={{ borderRadius: 8 }}
              >
                Cerrar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, },
  title: { marginBottom: 16, textAlign: 'center' },
  item: { padding: 8, marginTop: 8 }
});

export default TableRecargas;

