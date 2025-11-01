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
      label: "Productos Proxy",
      url: "ProxyPackages",
      icon: "wifi"
    },
    {
      label: "Productos VPN",
      url: "VPNPackages",
      icon: "cellphone"
    },
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
      label: "Dashboard",
      url:"Dashboard",
      icon:"view-dashboard"
    },
    {
      label: "Lista de Usuarios",
      url:"Users",
      icon:"account"
    },    
    {
      label: "Mensajes de Usuarios",
      url:"AllMensajesUser",
      icon:"message-text-outline"
    },
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
    {
      label: "Aprobaciones de Ventas Efectivo",
      url:"ListaArchivos",
      icon:"cellphone-wireless"
    },
    {
      label: "Registro de Logs",
      url:"Logs",
      icon:"clipboard-list-outline"
    },
    
    // {
    //   label: "Consumo Proxy",
    //   url:"ConsumoUsers",
    //   icon:"chart-donut"
    // }
  ]
  const opcionesAdministradorGeneral = [
    {
      label: "Ventas",
      url:"Ventas",
      icon:"cash-register"
    },
    {
      label: "Propertys",
      url:"ListaPropertys",
      icon:"cog-outline"
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