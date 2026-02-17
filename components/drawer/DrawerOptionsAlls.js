import Meteor, {useTracker} from '@meteorrn/core';
import * as React from 'react';
import { ScrollView, Dimensions, Alert, View, StyleSheet, ImageBackground } from 'react-native';
import { Card, Divider, Drawer, Surface, Avatar, Text, Chip, useTheme } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';

import img from "./SGN_04_02_2021_1617417653789.png";
const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const DrawerOptionsAlls = (opt) => {
  const [active, setActive] = React.useState('');
  const theme = useTheme();

  const { user, ready } = useTracker(() => {
    const subscription = Meteor.subscribe("user", Meteor.userId());
    const user = Meteor.user();
    return { user, ready: subscription.ready() };
  });

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (!user?.username) return '?';
    const parts = user.username.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  // Obtener rol del usuario
  const getUserRole = () => {
    if (user?.username === 'carlosmbinf') return 'Administrador General';
    if (user?.profile?.role === 'admin') return 'Administrador';
    if (user?.modoCadete) return 'Cadete Activo';
    return 'Usuario';
  };

  // Obtener icono según rol
  const getRoleIcon = () => {
    if (user?.username === 'carlosmbinf') return 'shield-crown';
    if (user?.profile?.role === 'admin') return 'shield-account';
    if (user?.modoCadete) return 'bike-fast';
    return 'account-circle';
  };

  // Obtener color según rol
  const getRoleColor = () => {
    if (user?.username === 'carlosmbinf') return '#FF6B6B';
    if (user?.profile?.role === 'admin') return '#4ECDC4';
    if (user?.modoCadete) return '#95E1D3';
    return '#A8DADC';
  };

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
      label: "Compras PROXY/VPN",
      url: "ProxyVPNHistory",
      icon: "history"
    });
    opciones.push({
      label: "Comercios",
      url: "ComerciosList",
      icon: "storefront"
    });
    
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

  // if (user?.permiteRemesas == true) {
  //   opcionesAdministradorGeneral.push({
  //     label: "Remesas a Entregar",
  //     url: "VentasStepper",
  //     icon: "file-document-edit-outline"
  //   });
  // }

  opcionesAdministradorGeneral.push({
    label: "Mapa de Usuarios",
    url: "MapaUsuarios",
    icon: "file-document-edit-outline"
  });

  // Función para alternar modo cadete con confirmación
  const toggleModoCadete = () => {
    const nuevoEstado = !user?.modoCadete;
    const mensaje = nuevoEstado 
      ? 'Al activarlo, comenzarás a aparecer como disponible para entregas y recibirás notificaciones de nuevos pedidos asignados en tiempo real.\n\n✓ Recibirás pedidos automáticamente\n✓ Tu ubicación será visible para el sistema\n✓ Podrás gestionar entregas activas'
      : 'Al desactivarlo, dejarás de recibir nuevos pedidos y tu disponibilidad quedará en pausa.\n\n• No recibirás más asignaciones\n• Podrás completar pedidos activos\n• Tu ubicación dejará de compartirse\n\nRecuerda: Puedes reactivarlo en cualquier momento.';
    
    Alert.alert(
      nuevoEstado ? '🚴 ¿Activar Modo Cadete?' : '⚠️ ¿Salir del Modo Cadete?',
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
            Meteor.call('users.toggleModoCadete', nuevoEstado, async (error) => {
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
      <Surface style={{ height: '100%', flex: 1 }}>
        {/* Header Mejorado con UX Profesional */}
        <Surface elevation={4} style={styles.headerContainer}>
          <ImageBackground 
            source={img} 
            resizeMode="cover"
            style={styles.headerBackground}
            imageStyle={styles.headerBackgroundImage}
            >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              >
              
              {/* Avatar y Status Badge */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarWrapper}>
                  <Avatar.Text 
                    size={72} 
                    label={getUserInitials()}
                    style={[styles.avatar, { backgroundColor: getRoleColor() }]}
                    labelStyle={styles.avatarLabel}
                  />
                  {user?.modoCadete && (
                    <Avatar.Icon 
                      size={28} 
                      icon="bike-fast" 
                      style={styles.statusBadge}
                      color="#fff"
                    />
                  )}
                </View>
              </View>

              {/* Info del Usuario */}
              <View style={styles.userInfoContainer}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.username || 'Usuario'}
                </Text>
                
                <View style={styles.roleContainer}>
                  <Avatar.Icon 
                    size={30} 
                    icon={getRoleIcon()} 
                    style={styles.roleIconAvatar}
                    color="#fff"
                  />
                  <Text style={styles.userRole}>{getUserRole()}</Text>
                </View>

                {/* Chips de Permisos/Estado */}
                <View style={styles.chipsContainer}>
                  {user?.permiteRemesas && (
                    <Chip 
                      icon="cash-fast" 
                      mode="outlined" 
                      textStyle={styles.chipText}
                      style={styles.chip}
                      compact>
                      Remesas
                    </Chip>
                  )}
                  
                    <Chip 
                      icon="shield-star" 
                      mode="outlined" 
                      textStyle={styles.chipText}
                      style={styles.chip}
                      compact>
                      {user?.profile?.role === 'admin' || user?.username === 'carlosmbinf' ? "Admin" : "Usuario"}
                    </Chip>
                  
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </Surface>

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
          <Drawer.Section title="Servicios VidKar">
            {getOpcionesServicios().map((element, index) => {
              return (
                <Drawer.Item
                  key={`servicio-${index}`}
                  icon={element.icon}
                  label={element.label}
                  active={active === element.url}
                  onPress={() => {
                    opt?.navigation?.navigation?.navigate(element.url);
                  }}
                />
              );
            })}
          </Drawer.Section>
          
          {Meteor.user()?.profile?.role === 'admin' && (
            <Drawer.Section title="Opciones de Administradores">
              {opcionesAdministradores.map((element, index) => {
                return (
                  <Drawer.Item
                    key={`admin-${index}`}
                    icon={element.icon}
                    label={element.label}
                    active={active === element.url}
                    onPress={() => {
                      opt.navigation.navigation.navigate(element.url);
                    }}
                  />
                );
              })}
            </Drawer.Section>
          )}
          
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
                      opt.navigation?.navigation?.navigate(element.url);
                    }}
                  />
                );
              })}
              <Divider style={{ marginVertical: 10 }} />
            </Drawer.Section>
          )}
          
          {/* Spacer */}
          <View style={{ flex: 1 }} />
        </ScrollView>

        {/* Botón Modo Cadete Anclado */}
        <Surface style={styles.footerButton}>
          <Drawer.Item
            icon={user?.modoCadete ? "exit-to-app" : "bike"}
            label={user?.modoCadete ? "Salir del Modo Cadete" : "Activar Modo Cadete"}
            active={true}
            style={{
              backgroundColor: user?.modoCadete ? '#FFEBEE' : '#E8F5E9',
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: user?.modoCadete ? '#FF5252' : '#4CAF50',
            }}
            labelStyle={{
              color: user?.modoCadete ? '#B71C1C' : '#1B5E20',
              fontWeight: '600',
            }}
            onPress={toggleModoCadete}
          />
        </Surface>
      </Surface>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 200,
    overflow: 'hidden',
  },
  headerBackground: {
    // backgroundColor: "#555",
    width: '100%',
    height: '100%',
  },
  headerBackgroundImage: {
    opacity: 0.4,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4CAF50',
    elevation: 4,
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    // marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 12,
  },
  roleIconAvatar: {
    marginRight: 6,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  userRole: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderColor: 'rgba(200, 0, 255, 0.5)',
  },
  chipText: {
    fontSize: 11,
    // color: '#fff',
    fontWeight: '600',
  },
  footerButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 12,
  },
});

export default DrawerOptionsAlls;