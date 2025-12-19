import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Avatar,
  Title,
  Caption,
  Text,
  Divider,
  List,
} from 'react-native-paper';
import Meteor from '@meteorrn/core';

const CadeteDrawerContent = ({ closeDrawer }) => {
  const user = Meteor.user();

  const desactivarModoCadete = () => {
    Meteor.call('users.toggleModoCadete', false, (error) => {
      if (error) {
        console.error('Error al desactivar modo cadete:', error);
        return;
      }
      // El cambio en user.modoCadete hará que Main.js redirija automáticamente
      closeDrawer();
    });
  };

  return (
    <View style={styles.drawerContent}>
      {/* Header del Drawer con info del cadete */}
      <View style={styles.userInfoSection}>
        <View style={styles.userInfoHeader}>
          <Avatar.Text
            size={50}
            label={user?.username?.substring(0, 2).toUpperCase() || 'CD'}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Title style={styles.title}>{user?.username || 'Cadete'}</Title>
            <Caption style={styles.caption}>Modo Cadete Activo</Caption>
          </View>
        </View>
      </View>

      <Divider />

      {/* Sección de navegación */}
      <ScrollView style={styles.scrollSection}>
        <View style={styles.drawerSection}>
          <List.Item
            title="Mis Pedidos"
            left={props => <List.Icon {...props} icon="package-variant" color="#4CAF50" />}
            titleStyle={styles.activeItem}
            style={styles.listItem}
            onPress={closeDrawer}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Sección de configuración (preparada para futuro) */}
        <View style={styles.drawerSection}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          {/* Placeholder para futuras opciones */}
          <List.Item
            title="Notificaciones"
            left={props => <List.Icon {...props} icon="bell-outline" color="#757575" />}
            titleStyle={styles.inactiveItem}
            style={styles.listItem}
            onPress={() => {
              closeDrawer();
              // TODO: Navegar a configuración de notificaciones
            }}
            disabled
          />
          <List.Item
            title="Historial"
            left={props => <List.Icon {...props} icon="history" color="#757575" />}
            titleStyle={styles.inactiveItem}
            style={styles.listItem}
            onPress={() => {
              closeDrawer();
              // TODO: Navegar a historial
            }}
            disabled
          />
        </View>
      </ScrollView>

      {/* Footer con opción de salir del modo cadete */}
      <View style={styles.bottomDrawerSection}>
        <Divider />
        <TouchableOpacity 
          style={styles.exitButton}
          onPress={desactivarModoCadete}
        >
          <List.Icon icon="exit-to-app" color="#FF5252" />
          <Text style={styles.exitLabel}>Salir del Modo Cadete</Text>
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
    backgroundColor: '#F5F5F5',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#4CAF50',
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
    color: '#4CAF50',
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
    color: '#4CAF50',
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
  bottomDrawerSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  exitLabel: {
    marginLeft: 8,
    color: '#FF5252',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CadeteDrawerContent;