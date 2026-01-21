import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Avatar,
  Title,
  Caption,
  Text,
  Divider,
  List,
  Badge,
} from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { useNavigation } from '@react-navigation/native';

const EmpresaDrawerContent = ({ closeDrawer, navigationReady }) => {
  const user = Meteor.user();
  
  // ✅ useNavigation con try-catch por seguridad
  let navigation = null;
  try {
    navigation = useNavigation();
  } catch (error) {
    console.warn('[EmpresaDrawer] Navigation no disponible aún');
  }

  const handleNavigate = (screen) => {
    if (!navigation) {
      console.warn('[EmpresaDrawer] Navigation no disponible');
      return;
    }
    
    closeDrawer();
    navigation.navigate(screen);
  };

  // ✅ NUEVO: Handler para salir del modo empresa
  const desactivarModoEmpresa = () => {
    Alert.alert(
      '⚠️ ¿Salir del Modo Empresa?',
      'Al desactivarlo, volverás a la vista principal de la aplicación.\n\n• Podrás volver a activarlo cuando quieras\n• Tus tiendas y productos se mantendrán guardados\n• No se cerrará tu sesión',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: () => {
            Meteor.users.update( Meteor.userId(), {$set:{
                modoEmpresa : false
            }});
            
            // Meteor.call('users.toggleModoEmpresa', false, (error) => {
            //   if (error) {
            //     console.error('[EmpresaDrawer] Error al desactivar modo empresa:', error);
            //     Alert.alert('Error', error.reason || 'No se pudo desactivar el modo empresa');
            //   } else {
            //     Alert.alert('Éxito', 'Has salido del modo empresa. Volviendo a la pantalla principal...');
            //     // El cambio en user.modoEmpresa hará que Main.js redirija automáticamente
            //     closeDrawer();
            //   }
            // });
          }
        }
      ]
    );
  };

  // ✅ NUEVO: Handler para cerrar sesión
  const handleLogout = () => {
    Alert.alert(
      '🚪 ¿Cerrar Sesión?',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            Meteor.logout((error) => {
              if (error) {
                console.error('[EmpresaDrawer] Error al cerrar sesión:', error);
                Alert.alert('Error', 'No se pudo cerrar sesión');
              }
            });
          }
        }
      ]
    );
  };

  return (
    <View style={styles.drawerContent}>
      {/* ✅ Header con info de empresa */}
      <View style={styles.userInfoSection}>
        <View style={styles.userInfoHeader}>
          {user?.picture ? (
            <Avatar.Image
              source={{ uri: user.picture }}
              size={60}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={60}
              label={user?.username?.substring(0, 2).toUpperCase() || 'EM'}
              style={styles.avatar}
            />
          )}

          <View style={styles.userDetails}>
            <Title style={styles.title}>{user?.username || 'Empresa'}</Title>
            <Caption style={styles.caption}>Modo Empresa</Caption>
          </View>
        </View>
      </View>

      <Divider />

      {/* ✅ Navegación principal */}
      <ScrollView style={styles.scrollSection}>
        <View style={styles.drawerSection}>
          <List.Item
            title="Mis Tiendas"
            left={props => <List.Icon {...props} icon="store" color="#673AB7" />}
            titleStyle={styles.activeItem}
            style={styles.listItem}
            onPress={() => handleNavigate('tiendas')}
            disabled={!navigationReady}
          />
        </View>

        <Divider style={styles.divider} />

        {/* ✅ Sección de gestión (preparada para futuro) */}
        <View style={styles.drawerSection}>
          <Text style={styles.sectionTitle}>Gestión</Text>
          <List.Item
            title="Estadísticas"
            left={props => <List.Icon {...props} icon="chart-line" color="#757575" />}
            titleStyle={styles.inactiveItem}
            style={styles.listItem}
            onPress={() => {
              closeDrawer();
              // TODO: Implementar pantalla de estadísticas
            }}
            disabled
          />
          <List.Item
            title="Pedidos"
            left={props => <List.Icon {...props} icon="package-variant" color="#757575" />}
            right={props => <Badge style={styles.badge}>0</Badge>}
            titleStyle={styles.inactiveItem}
            style={styles.listItem}
            onPress={() => {
              closeDrawer();
              // TODO: Implementar pantalla de pedidos
            }}
            disabled
          />
        </View>
      </ScrollView>

      {/* ✅ Footer con dos botones separados */}
      <View style={styles.bottomDrawerSection}>
        <Divider />
        
        {/* ✅ NUEVO: Botón para salir del modo empresa (sin cerrar sesión) */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={desactivarModoEmpresa}
        >
          <List.Icon icon="exit-to-app" color="#673AB7" />
          <Text style={styles.actionLabelPrimary}>Salir del Modo Empresa</Text>
        </TouchableOpacity>

        <Divider style={styles.thinDivider} />

        {/* ✅ Botón para cerrar sesión completamente */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLogout}
        >
          <List.Icon icon="logout" color="#FF5252" />
          <Text style={styles.actionLabelDanger}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  userInfoSection: {
    paddingLeft: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#F3E5F5', // Fondo violeta claro
  },
  userInfoHeader: {
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#673AB7',
  },
  userDetails: {
    marginLeft: 15,
    flexDirection: 'column',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  caption: {
    fontSize: 12,
    lineHeight: 14,
    color: '#673AB7',
    fontWeight: '600',
  },
  scrollSection: {
    flex: 1,
  },
  drawerSection: {
    marginTop: 10,
  },
  listItem: {
    paddingLeft: 16,
  },
  activeItem: {
    color: '#673AB7',
    fontWeight: '600',
  },
  inactiveItem: {
    color: '#757575',
  },
  sectionTitle: {
    paddingLeft: 20,
    paddingTop: 10,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    textTransform: 'uppercase',
  },
  divider: {
    marginVertical: 10,
  },
  badge: {
    marginRight: 16,
    backgroundColor: '#FF5252',
  },
  bottomDrawerSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  // ✅ NUEVO: Estilos para botones de acción en footer
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionLabelPrimary: {
    marginLeft: 8,
    color: '#673AB7',
    fontWeight: '600',
    fontSize: 14,
  },
  actionLabelDanger: {
    marginLeft: 8,
    color: '#FF5252',
    fontWeight: '600',
    fontSize: 14,
  },
  thinDivider: {
    marginVertical: 0,
    backgroundColor: '#E0E0E0',
  },
});

export default EmpresaDrawerContent;
