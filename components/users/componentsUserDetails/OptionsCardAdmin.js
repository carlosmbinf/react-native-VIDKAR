import React, {memo} from 'react';
import {Card, Text, Button} from 'react-native-paper';
import Meteor from '@meteorrn/core';

const OptionsCardAdmin = ({item, styles}) => {
  if (!item) return null;

  const toggleDesconectarVPN = () => {
    Meteor.call('updateAsyncUsersAll', item?._id, {
      desconectarVPN: !item?.desconectarVPN,
    });
  };

  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <Text
          style={{
            paddingTop: 10,
            textAlign: 'center',
            paddingBottom: 10,
          }}>
          OPCIONES:
        </Text>
        <Button
          color={item?.desconectarVPN && 'red'}
          mode="contained"
          onPress={toggleDesconectarVPN}>
          {item?.desconectarVPN
            ? 'Cancelar Desconexion de VPN'
            : 'Desconectar VPN'}
        </Button>
      </Card.Content>
    </Card>
  );
};

export default memo(OptionsCardAdmin);
