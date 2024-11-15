import Meteor from '@meteorrn/core';
import * as React from 'react';
import { ScrollView, Dimensions } from 'react-native';
import { Card, Drawer, Surface } from 'react-native-paper';

import img from "./SGN_04_02_2021_1617417653789.png";
const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');
const DrawerOptionsAlls = (opt) => {
  const [active, setActive] = React.useState('');


  const opcionesServicios = [
    {
      label: "Pelis y Videos",
      url:"PeliculasVideos",
      icon:"movie-filter"
    }
  ]

  const opcionesAdministradores = [
    {
      label: "Add Usuarios",
      url:"CreateUsers",
      icon:"account-plus"
    },
    {
      label: "Servidores",
      url:"Servidores",
      icon:"server"
    },
    // {
    //   label: "Consumo Proxy",
    //   url:"ConsumoUsers",
    //   icon:"chart-donut"
    // }
  ]
  const opcionesAdministradorGeneral = [
    {
      label: "Registro de Logs",
      url:"Logs",
      icon:"vpn"
    },
    {
      label: "Ventas",
      url:"Ventas",
      icon:"vpn"
    },

  ]
  return (
    <>
    <Surface>
    <Card.Cover source={img}></Card.Cover>
    </Surface>
    <ScrollView>
      <Surface style={{minHeight:screenHeight-180}}>
      
      <Drawer.Section title="Servicios VidKar">
        {opcionesServicios.map(element => {
          return (
            <Drawer.Item
              icon={element.icon}
              label={element.label}
              active={active === element.url}
              onPress={() => { 
                // setActive(element.url); 
                opt.navigation.navigation.navigate(element.url) }}
            />)
        }
        )}
      </Drawer.Section>

      <Drawer.Section title="Opciones de Administradores">
        {opcionesAdministradores.map(element => {
          return (
            <Drawer.Item
              icon={element.icon}
              label={element.label}
              active={active === element.url}
              onPress={() => { 
                // setActive(element.url); 
                opt.navigation.navigation.navigate(element.url) }}
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
                onPress={() => { 
                  // setActive(element.url);
                   opt.navigation.navigation.navigate(element.url) }}
              />)
          }
          )}
        </Drawer.Section>
      }

      </Surface>
    </ScrollView>
     
      
    </>
  );
};

export default DrawerOptionsAlls;