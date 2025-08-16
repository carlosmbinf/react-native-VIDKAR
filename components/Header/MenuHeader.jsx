import React, { useState } from 'react';
import { View } from 'react-native';
import { Appbar, Menu, IconButton, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import WizardConStepper from '../carritoCompras/WizardConStepper';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import { logoutFromGoogle } from '../../utilesMetodos/metodosUtiles';

const MenuHeader = ({ navigation }) => {
  const [visibleMenu, setVisibleMenu] = useState(false);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {/* 🛒 Botón del carrito */}
      <WizardConStepper/>
      {/* 📋 Botón del menú */}
      <Menu
        visible={visibleMenu}
        onDismiss={() => setVisibleMenu(false)}
        anchor={
          <Appbar.Action
            icon="menu"
            color="white"
            onPress={() => setVisibleMenu(true)}
          />
        }
        style={{ top: 70, width: 210, paddingRight: 30 }}
      >
        <View style={{ padding: 0 }}>
          <Menu.Item
            icon="account"
            onPress={() => {
              setVisibleMenu(false);
              navigation.navigate('User', {
                item: Meteor.users.findOne({ _id: Meteor.userId() }),
              });
            }}
            title="Mi usuario"
          />
          <Menu.Item
            icon="logout"
            onPress={() => {
              logoutFromGoogle();
              setVisibleMenu(false);
            }}
            title="Cerrar Sesión"
          />
        </View>
      </Menu>
    </View>
  );
};

export default MenuHeader;
