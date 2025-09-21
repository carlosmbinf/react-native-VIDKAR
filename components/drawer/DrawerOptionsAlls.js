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
      label: "Pelis y Series",
      url:"PeliculasVideos",
      icon:"movie-filter"
    },
    {
      label: "Productos Cubacel",
      url:"ProductosCubacelCards",
      icon:"view-dashboard"
    },
    // nuevas opciones
    // {
    //   label: "Remesas",
    //   url: "Remesas",
    //   icon: "bank-transfer"
    // },
    {
      label: "Remesas",
      url: "remesas",
      icon: "file-document-edit-outline"
    },
    // {
    //   label: "Ventas (Stepper)",
    //   url: "VentasStepper",
    //   icon: "chart-timeline-variant"
    // },
    
  ]

  const opcionesAdministradores = [
    {
      label: "Lista de Usuarios",
      url:"Users",
      icon:"account"
    },{
      label: "Add Usuarios",
      url:"CreateUsers",
      icon:"account-plus"
    },
    {
      label: "Servidores",
      url:"Servidores",
      icon:"server"
    },
    {
      label: "Dashboard",
      url:"Dashboard",
      icon:"view-dashboard"
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
    {
      label: "Subida de Archivos",
      url:"SubidaArchivos",
      icon:"cloud-upload"
    },
    {
      label: "Lista de Archivos",
      url:"ListaArchivos",
      icon:"file-multiple"
    }

  ]
  return (
    <>
      <Surface>
        <Card.Cover source={img}></Card.Cover>
      </Surface>
      <ScrollView>
        <Surface style={{minHeight: screenHeight - 180}}>
            <Drawer.Section title="Servicios VidKar">
              {opcionesServicios.map(element => {
                return (
                  <Drawer.Item
                    icon={element.icon}
                    label={element.label}
                    active={active === element.url}
                    onPress={() => {
                      // setActive(element.url);
                      opt?.navigation?.navigation?.navigate(element.url);
                    }}
                  />
                );
              })}
            </Drawer.Section>
          { Meteor.user()?.profile?.role === 'admin' &&
          <Drawer.Section title="Opciones de Administradores">
            {opcionesAdministradores.map(element => {
              return (
                <Drawer.Item
                  icon={element.icon}
                  label={element.label}
                  active={active === element.url}
                  onPress={() => {
                    // setActive(element.url);
                    opt.navigation.navigation.navigate(element.url);
                  }}
                />
              );
            })}
          </Drawer.Section>}
          {Meteor.user()?.username == 'carlosmbinf' && (
            <Drawer.Section title="Opciones Privadas">
              {opcionesAdministradorGeneral.map(element => {
                return (
                  <Drawer.Item
                    icon={element.icon}
                    label={element.label}
                    active={active === element.url}
                    onPress={() => {
                      // setActive(element.url);
                      opt.navigation?.navigation?.navigate(element.url);
                    }}
                  />
                );
              })}
            </Drawer.Section>
          )}
        </Surface>
      </ScrollView>
    </>
  );
};

export default DrawerOptionsAlls;