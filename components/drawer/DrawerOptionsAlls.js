import Meteor from '@meteorrn/core';
import * as React from 'react';
import { ScrollView } from 'react-native';
import { Card, Drawer } from 'react-native-paper';

import img from "./SGN_04_02_2021_1617417653789.png";

const DrawerOptionsAlls = (opt) => {
  const [active, setActive] = React.useState('');

  const opcionesAdministradores = [
    {
      label: "Agregar Usuarios",
      url:"CreateUsers",
      icon:"account-plus"
    }
  ]
  const opcionesAdministradorGeneral = [
    
    {
      label: "VPN",
      url:"VPN",
      icon:"vpn"
    }
  ]
  return (
    <>
    <Card.Cover source={img}></Card.Cover>
    <ScrollView>
     
      <Drawer.Section title="Opciones de Administradores">
        {opcionesAdministradores.map(element => {
          return (
            <Drawer.Item
              icon={element.icon}
              label={element.label}
              active={active === element.url}
              onPress={() => { setActive(element.url); opt.navigation.navigation.navigate(element.url) }}
            />)
        }
        )}
      </Drawer.Section>
      {Meteor.user().username == "carlosmbinf" &&
        <Drawer.Section title="Opciones Privadas">
          {opcionesAdministradorGeneral.map(element => {
            return (
              <Drawer.Item
                icon={element.icon}
                label={element.label}
                active={active === element.url}
                onPress={() => { setActive(element.url); opt.navigation.navigation.navigate(element.url) }}
              />)
          }
          )}
        </Drawer.Section>
      }
    </ScrollView>
    </>
  );
};

export default DrawerOptionsAlls;