import React from 'react';
import { ScrollView, View, StyleSheet, ImageBackground } from 'react-native';
import { Text, Card, IconButton, Divider, Chip, useTheme } from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { CarritoCollection } from '../collections/collections';
import { BlurView } from '@react-native-community/blur';

const ListaPedidos = ({eliminar}) => {
  const userId = Meteor.userId();
  const theme = useTheme();

  const isDarkMode = theme.dark;
  const { pedidosRemesa = [] } = useTracker(() => {
    Meteor.subscribe('carrito', { idUser: userId });
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
          <Card key={pedido._id} style={styles.card} elevation={4}>
            <ImageBackground
              source={require('../cubacel/Gemini_Generated_Image_rtg44brtg44brtg4.png')}
              imageStyle={{ borderRadius: 20 }}
              style={styles.cardBackground}
            >
              <BlurView
          style={StyleSheet.absoluteFill}
          blurType={isDarkMode ? "dark" : "light"}
          blurAmount={10}
              />
              <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#333' }]}>
              {type === 'REMESA' ? '💸 Remesa para:' : '📱 Recarga para:'} {nombre}
            </Text>
            {/* <Text style={[styles.cardSubtitle, {color: isDarkMode ? '#e0e0e0' : '#666' }]} >
              {nombre}
            </Text> */}
          </View>
          {eliminar && <IconButton 
            icon="close" 
            size={24} 
            iconColor={isDarkMode ? '#ff6b6b' : '#e74c3c'}
            style={styles.closeButton}
            onPress={() => eliminarPedido(pedido._id)} 
          />}
              </View>
              
              <Divider style={{ marginVertical: 12, opacity: 0.3 }} />
              
              {type === 'REMESA' ? (
          <View style={styles.contentBlock}>
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>💰 Enviar:</Text>
              <Text 
                mode="outlined" 
                style={[styles.chip, styles.amountChip]}
                textStyle={styles.chipText}
              >
                {`$${Number(cobrarUSD).toFixed(2)} USD`}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>🇨🇺 Recibe:</Text>
              <Text 
                mode="outlined" 
                style={[styles.chip, styles.receiveChip]}
                textStyle={styles.chipText}
              >
                {`${recibirEnCuba} ${monedaRecibirEnCuba}`}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>📍 Tipo de entrega:</Text>
              <Text 
                mode="outlined" 
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {direccionCuba || 'No informada'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>📍 Dirección:</Text>
              <Text 
                mode="outlined" 
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {direccionCuba || 'No informada'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>💳 Tarjeta:</Text>
              <Text 
                mode="outlined" 
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {tarjetaCUP || 'No informada'}
              </Text>
            </View>
            
            {comentario && (
              <View style={styles.commentContainer}>
                <Text style={[styles.commentLabel, { color: isDarkMode ? '#fff' : '#333' }]}>💬 Comentario:</Text>
                <Text style={[styles.comment, { color: isDarkMode ? '#e0e0e0' : '#666' }]}>
            {comentario}
                </Text>
              </View>
            )}
          </View>
              ) : (
          <View style={styles.contentBlock}>
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>📱 Móvil:</Text>
              <Text 
                mode="outlined" 
                style={[styles.chip, styles.phoneChip]}
                textStyle={styles.chipText}
              >
                {movilARecargar}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>💰 Precio:</Text>
              <Text 
                mode="outlined" 
                style={[styles.chip, styles.amountChip]}
                textStyle={styles.chipText}
              >
                {`$${cobrarUSD} USD`}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>📦 Tipo:</Text>
              <Text 
                mode="outlined" 
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {producto?.name || 'No especificado'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              {/* <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#333' }]}>🎁 Promo:</Text> */}
              <Chip 
                mode="outlined" 
                style={[styles.chip, producto?.promotions ? styles.promoChip : styles.noPromoChip]}
                textStyle={producto?.promotions?{color:"white"}:{ color: "black" }}
                
                
              >
                {producto?.promotions ? '✨ Tiene Promo' : '❌ Sin Promo'}
              </Chip>
            </View>
            
            {comentario && (
              <View style={styles.commentContainer}>
                <Text style={[styles.commentLabel, { color: isDarkMode ? '#fff' : '#333' }]}>💬 Comentario:</Text>
                <Text style={[styles.comment, { color: isDarkMode ? '#e0e0e0' : '#666' }]}>
            {comentario}
                </Text>
              </View>
            )}
          </View>
              )}
            </ImageBackground>
          </Card>
        )
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chipText:{
    // color: "black",
  },
  infoRow: {
    paddingBottom:10
  },
  promoChip:{
    backgroundColor: "green",
    width: 200,
  },
  noPromoChip:{
    backgroundColor: "#f50057",
    width: 200,
  },
  
  chip: {
    // flex: 1,
    // width: "100%",
    marginLeft: 8,
  },
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
    borderRadius: 20,
    overflow: 'hidden'
  },
  cardBackground: {
    padding: 12,
    borderRadius: 20
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
    marginTop: 8,
    textAlignVertical: "top",
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
