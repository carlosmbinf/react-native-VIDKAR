import React from 'react';
import { View } from 'react-native';
import { Card, Title, Button } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import Meteor from '@meteorrn/core';

const UserOptionsCard = ({ item, modificarNotificacion }) => {
  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Opciones'}</Title>
          <View>
            <Button 
              mode='contained' 
              color={item && item.modificarNotificacion && 'red'} 
              onPress={modificarNotificacion}
            >
              {item && item.modificarNotificacion ? "Denegar": "Permitir"} cambio de notificacion
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

export default UserOptionsCard;
