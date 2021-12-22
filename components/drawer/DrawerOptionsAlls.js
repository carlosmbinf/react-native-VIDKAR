import * as React from 'react';
import { ScrollView } from 'react-native';
import { Card, Drawer } from 'react-native-paper';

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
      url:"vpn",
      icon:"vpn"
    }
  ]
  return (
    <ScrollView>
      <Card.Cover source={"https://vidkar.sytes.net/img/c7f0fb54100a98144f178baa9a1a5ad736469f45eb4ca2c77595ce512f15f94d._V_SX300_.jpg"}></Card.Cover>
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
    </ScrollView>
  );
};

export default DrawerOptionsAlls;