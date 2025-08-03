import React from 'react';
import { ScrollView, View, StyleSheet, ImageBackground } from 'react-native';
import { Text, Card, IconButton, Divider, Chip,useTheme } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { CarritoCollection } from '../collections/collections';
import { BlurView } from '@react-native-community/blur';

const ListaPedidos = () => {
  const userId = Meteor.userId();
  const theme = useTheme();

  const isDarkMode = theme.dark;
  const { pedidosRemesa = [] } = useTracker(() => {
    Meteor.subscribe('carrito',{ idUser: userId });
    const pedidos = CarritoCollection.find({ idUser: userId }).fetch();
    return { pedidosRemesa: pedidos };
  });

  const eliminarPedido = (idPedido) => {
    Meteor.call('eliminarElementoCarrito', idPedido, (error) => {
      if (error) console.error('Error al eliminar pedido:', error);
    });
  };

  if (pedidosRemesa.length === 0) {
    return <Text style={styles.empty}>No hay nada en el Carrito.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Chip mode='flat' elevated={5}>{`Tienes ${pedidosRemesa.length} compras en el Carrito`}</Chip>
      <Text style={styles.sectionTitle}>Lista de compras:</Text>

      {pedidosRemesa.map((pedido) => {
        const {
          nombre,
          type,
          cobrarUSD,
          monedaRecibirEnCuba,
          recibirEnCuba,
          tarjetaCUP,
          comentario,
          producto,
          movilARecargar,
          direccionCuba
        } = pedido;

        return (
          <Card key={pedido._id} style={styles.card}>
            <ImageBackground
              source={require('../cubacel/Gemini_Generated_Image_rtg44brtg44brtg4.png')}
              imageStyle={{ borderRadius: 12 }}
              style={styles.cardBackground}
            >
            <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType= {isDarkMode ?"dark":"light"}
                    />
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{type === 'REMESA' ? 'Remesa para:' : 'Recarga para:'} {nombre}</Text>
                <IconButton icon="close" size={20} onPress={() => eliminarPedido(pedido._id)} />
              </View>
              <Divider />
              {type === 'REMESA' ? (
                <View style={styles.contentBlock}>
                  <Text>Enviar: <Chip>{`${Number(cobrarUSD).toFixed(2)} USD`}</Chip></Text>
                  <Text style={styles.field}>Recibe en Cuba: <Chip>{`${recibirEnCuba} ${monedaRecibirEnCuba}`}</Chip></Text>
                  <Text style={styles.field}>Dirección en Cuba: <Chip>{direccionCuba || 'No se ha informado'}</Chip></Text>
                  <Text style={styles.field}>Tarjeta CUP: <Chip>{tarjetaCUP || 'No se ha informado'}</Chip></Text>
                  {comentario ? <Text style={styles.comment}>{comentario}</Text> : null}
                </View>
              ) : (
                <View style={styles.contentBlock}>
                  <Text>Movil: <Chip>{movilARecargar}</Chip></Text>
                  <Text style={styles.field}>Precio: <Chip>{`${cobrarUSD} USD`}</Chip></Text>
                  <Text style={styles.field}>Tipo: <Chip>{producto?.name}</Chip></Text>
                  <Text style={styles.field}>Promo: <Chip>{producto?.promotions ? 'Tiene Promo' : 'Sin Promo'}</Chip></Text>
                  {comentario ? <Text style={styles.comment}>{comentario}</Text> : null}
                </View>
              )}
            </ImageBackground>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    // backgroundColor: "red",
  },
  empty: {
    textAlign: 'center',
    padding: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10
  },
  headerChip: {
    marginBottom: 10,
    alignSelf: 'center'

  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden'
  },
  cardBackground: {
    padding: 12,
    borderRadius: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  contentBlock: {
    marginTop: 8
  },
  field: {
    marginTop: 8
  },
  comment: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#555'
  }
});

export default ListaPedidos;
