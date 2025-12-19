import Meteor, {useTracker} from '@meteorrn/core';
import * as React from 'react';
import { ScrollView, Dimensions, Alert } from 'react-native';
import { Card, Drawer, Surface } from 'react-native-paper';

import img from "./SGN_04_02_2021_1617417653789.png";
const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');
const DrawerOptionsAlls = (opt) => {
  const [active, setActive] = React.useState('');


    const { user,ready } = useTracker(() => {
    const subscription = Meteor.subscribe("user", Meteor.userId());
    const user = Meteor.user();
    return { user,ready: subscription.ready()};
  });

  // Construir opciones de servicios dinámicamente según permisos del usuario
  const getOpcionesServicios = () => {
    const opciones = [];
    
    // Pelis y Series - solo si tiene suscripcionPelis
    if (user?.subscipcionPelis == true) {
      opciones.push({
        label: "Pelis y Series",
        url: "PeliculasVideos",
        icon: "movie-filter"
      });
    }

    opciones.push({
      label: "Productos Cubacel",
      url: "ProductosCubacelCards",
      icon: "view-dashboard"
    });
    
    opciones.push({
      label: "Productos Proxy",
      url: "ProxyPackages",
      icon: "wifi"
    });
    
    opciones.push({
      label: "Productos VPN",
      url: "VPNPackages",
      icon: "shield-check"
    });
    
    opciones.push({
      label: "Historial de Compras PROXY/VPN",
      url: "ProxyVPNHistory",
      icon: "history"
    });

    // opciones.push({
    //   label: "Pedidos Comercio",
    //   url: "PedidosComercio",
    //   icon: "history"
    // });
    
    // Remesas - solo si tiene permiteRemesas
    if (user?.permiteRemesas == true) {
      opciones.push({
        label: "Remesas",
        url: "remesas",
        icon: "file-document-edit-outline"
      });
    }

    return opciones;
  };

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
      label: "Aprobaciones de Ventas Efectivo",
      url:"ListaArchivos",
      icon:"cellphone-wireless"
    },
    {
      label: "Add Usuarios",
      url:"CreateUsers",
      icon:"account-plus"
    },
    {
      label: "Registro de Logs",
      url:"Logs",
      icon:"clipboard-list-outline"
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
  ];

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
  ];

  // Función para alternar modo cadete con confirmación
  const toggleModoCadete = () => {
    const nuevoEstado = !user?.modoCadete;
    const mensaje = nuevoEstado 
      ? '¿Deseas activar el modo cadete? Comenzarás a recibir pedidos de delivery.'
      : '¿Estás seguro que deseas salir del modo cadete? Dejarás de recibir pedidos.';
    
    Alert.alert(
      nuevoEstado ? 'Activar Modo Cadete' : 'Salir del Modo Cadete',
      mensaje,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          style: nuevoEstado ? 'default' : 'destructive',
          onPress: () => {
            Meteor.call('users.toggleModoCadete', nuevoEstado, (error) => {
              if (error) {
                console.error('Error al cambiar modo cadete:', error);
                Alert.alert('Error', error.reason || 'No se pudo cambiar el modo cadete');
              } else {
                Alert.alert(
                  'Éxito',
                  nuevoEstado 
                    ? 'Modo cadete activado. Ahora puedes recibir pedidos.'
                    : 'Has salido del modo cadete.'
                );
              }
            });
          }
        }
      ]
    );
  };

  return (
    <>
      <Surface>
        <Card.Cover source={img}></Card.Cover>
      </Surface>
      <ScrollView>
        <Surface style={{minHeight: screenHeight - 180}}>
            <Drawer.Section title="Servicios VidKar">
              {getOpcionesServicios().map((element, index) => {
                return (
                  <Drawer.Item
                    key={`servicio-${index}`}
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
            {opcionesAdministradores.map((element, index) => {
              return (
                <Drawer.Item
                  key={`admin-${index}`}
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
              {opcionesAdministradorGeneral.map((element, index) => {
                return (
                  <Drawer.Item
                    key={`privado-${index}`}
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
              
              {/* Control de Modo Cadete - Solo para Admin General */}
              <Drawer.Item
                icon={user?.modoCadete ? "exit-to-app" : "bike"}
                label={user?.modoCadete ? "Salir del Modo Cadete" : "Activar Modo Cadete"}
                active={false}
                style={{
                  backgroundColor: user?.modoCadete ? '#FFEBEE' : '#E8F5E9',
                  marginHorizontal: 8,
                  marginVertical: 4,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: user?.modoCadete ? '#FF5252' : '#4CAF50',
                }}
                labelStyle={{
                  color: user?.modoCadete ? '#FF5252' : '#4CAF50',
                  fontWeight: '600',
                }}
                onPress={toggleModoCadete}
              />
            </Drawer.Section>
          )}
        </Surface>
      </ScrollView>
    </>
  );
};

export default DrawerOptionsAlls;