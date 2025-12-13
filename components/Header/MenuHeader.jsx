import React, { useState } from 'react';
import { View } from 'react-native';
import { Appbar, Menu, IconButton, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import WizardConStepper from '../carritoCompras/WizardConStepper';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import { logoutFromGoogle } from '../../utilesMetodos/metodosUtiles';
import MenuIconMensajes from '../components/MenuIconMensajes';

const MenuHeader = ({ navigation }) => {
  const [visibleMenu, setVisibleMenu] = useState(false);
// console.log(navigation);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {/* 🛒 Botón del carrito */}
      <MenuIconMensajes navigation={navigation}/>
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
        style={{ top: 40, width: 210, paddingRight: 30, zIndex:999 }}
      >
          <Menu.Item
            icon="account"
            onPress={() => {
              setVisibleMenu(false);
              navigation.navigate('User', {
                item: Meteor.userId(),
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
      </Menu>
    </View>
  );
};

export default MenuHeader;
