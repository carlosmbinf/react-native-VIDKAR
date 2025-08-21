import React from 'react';
import { View } from 'react-native';
import { Card, Title, Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';

const UserPersonalDataCard = ({ item }) => {
  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Datos Personales'}</Title>
          <View>
            <Text style={styles.data}>
              Nombre: {item.profile && item.profile.firstName}
            </Text>
            <Text style={styles.data}>
              Apellidos:{' '}
              {item.profile && item.profile.lastName
                ? item.profile.lastName
                : 'N/A'}
            </Text>
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

export default UserPersonalDataCard;
