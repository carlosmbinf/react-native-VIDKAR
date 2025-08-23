import React, {memo} from 'react';
import {View} from 'react-native';
import {Card, Title, Text} from 'react-native-paper';

const VentasCard = ({visible, deuda, styles}) => {
  if (!visible) return null;
  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Ventas'}</Title>
          <View>
            <Text style={styles.data}>Deudas: {deuda()}CUP</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

export default memo(VentasCard);
