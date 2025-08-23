import React, {memo} from 'react';
import {View} from 'react-native';
import {Card, Title, Text} from 'react-native-paper';

const PersonalDataCard = ({item, styles}) => {
  if (!item) return null;
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
              {item.profile && item.profile.lastName ? item.profile.lastName : 'N/A'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

export default memo(PersonalDataCard);
