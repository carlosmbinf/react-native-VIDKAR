import React from 'react';
import { View } from 'react-native';
import { Card, Title, Button } from 'react-native-paper';
import { StyleSheet } from 'react-native';

const UserNotificationsCard = ({ item, eliminarNotificacion, iniciarNotificacion }) => {
  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Datos en las Notificaciones'}</Title>
          <View>
            <Button 
              mode='contained' 
              style={{marginBottom:10}} 
              color='red' 
              onPress={eliminarNotificacion}
            >
              Eliminar Notificacion
            </Button>
            <Button 
              mode='contained' 
              onPress={iniciarNotificacion}
            >
              Iniciar Notificacion
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  cards: {
    marginBottom: 20,
    borderRadius: 20,
  },
  element: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    paddingBottom: 5,
  },
  data: {
    padding: 3,
  },
});

export default UserNotificationsCard;
