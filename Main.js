/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useRef, useState } from 'react';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Text, Provider as PaperProvider, } from 'react-native-paper';
import App from './App';
import Loguin from './components/loguin/Loguin';
import HomePedidosComercio from './components/comercio/pedidos/HomePedidosComercio';
import CadeteNavigator from './components/cadete/CadeteNavigator';
import EmpresaNavigator from './components/empresa/EmpresaNavigator'; // ✅ NUEVO
import MyService from './src/native/MyService';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PermissionsManager from './components/permissions/PermissionsManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ✅ NUEVO: Importar hook de permisos y utilidades
import { check, RESULTS } from 'react-native-permissions';
import { 
  NATIVE_PERMISSIONS, 
  PERMISSION_TYPES,
  getRequiredPermissions,
  isPermissionGranted,
  isPermissionsLibraryAvailable,
  checkNotificationPermission // ✅ Función especial para notificaciones iOS
} from './components/permissions/utils/permissionsConfig';

console.log('Main.js');
class MyApp extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      permissionsChecked: false,
      showPermissionsScreen: false,
      checkingPermissions: true, // ✅ NUEVO: Estado de verificación inicial
    };
  }

  // ✅ MODIFICADO: Validar disponibilidad de librería ANTES de usar
  checkRequiredPermissions = async (userRole = 'user') => {
    // ✅ Validación defensiva: verificar si la librería está disponible
    if (!isPermissionsLibraryAvailable()) {
      console.error('❌ [Permissions Check] Librería react-native-permissions no disponible');
      console.error('   La app continuará pero sin verificación de permisos.');
      console.error('   Solución: Reinstalar librería y rebuild.');
      return false; // ✅ Asumir que faltan permisos si la librería no está
    }

    try {
      console.log('🔍 [Permissions Check] Iniciando verificación...');
      
      const requiredPermissions = getRequiredPermissions(userRole);
      
      if (!requiredPermissions || requiredPermissions.length === 0) {
        console.warn('⚠️ [Permissions Check] No hay permisos requeridos definidos');
        return true; // ✅ Si no hay permisos definidos, permitir acceso
      }

      const permissionsStatus = {};

      for (const permission of requiredPermissions) {
        // ✅ SPECIAL CASE: Notificaciones en iOS usan API diferente
        if (permission.id === PERMISSION_TYPES.NOTIFICATIONS) {
          try {
            const status = await checkNotificationPermission();
            permissionsStatus[permission.id] = status;
            console.log(`  ✓ ${permission.id} (iOS special): ${status}`);
          } catch (error) {
            console.error(`❌ [Permissions Check] Error checking ${permission.id}:`, error.message);
            permissionsStatus[permission.id] = 'unavailable';
          }
          continue;
        }


        // ✅ Resto de permisos: flujo normal
        const nativePermission = NATIVE_PERMISSIONS[permission?.id];
        
        if (!nativePermission) {
          console.warn('⚠️ [Permissions Check] Permiso nativo no encontrado:', permission?.id);
          continue;
        }

        try {
          const status = await check(nativePermission);
          permissionsStatus[permission.id] = status;
        } catch (error) {
          console.error(`❌ [Permissions Check] Error checking ${permission.id}:`, error.message);
          permissionsStatus[permission.id] = 'unavailable';
        }
      }

      console.log('🔍 [Permissions Check] Estados obtenidos:', permissionsStatus);

      const allGranted = requiredPermissions.every((permission) =>
        isPermissionGranted(permissionsStatus[permission.id])
      );
      
      console.log('🔐 [Permissions Check] Resultado:', {
        allGranted,
        statuses: permissionsStatus,
        requiredCount: requiredPermissions.length,
      });

      return allGranted;
    } catch (error) {
      console.error('❌ [Permissions Check] Error general:', error);
      return false;
    }
  };

  async componentDidMount() {
    await this.verifyPermissionsStatus();
  }

  // ✅ NUEVO: Método que se ejecuta en cada mount y cuando cambia el usuario
  verifyPermissionsStatus = async () => {
    const userId = Meteor.userId();
    const userRole = this.props.user?.profile?.role || 'user';

    if (!userId) {
      // Si no hay usuario, no verificar permisos
      this.setState({ 
        checkingPermissions: false,
        showPermissionsScreen: false 
      });
      return;
    }

    console.log('🔍 [Main] Verificando permisos para usuario:', { userId, userRole });

    // Verificar estado REAL de los permisos (no solo si fueron solicitados)
    const allPermissionsGranted = await this.checkRequiredPermissions(userRole);

    if (allPermissionsGranted) {
      console.log('✅ [Main] Todos los permisos otorgados, permitir acceso a la app');
      this.setState({ 
        showPermissionsScreen: false,
        permissionsChecked: true,
        checkingPermissions: false 
      });
    } else {
      console.log('⚠️ [Main] Faltan permisos, mostrar pantalla de configuración');
      this.setState({ 
        showPermissionsScreen: true,
        permissionsChecked: false,
        checkingPermissions: false 
      });
    }
  };

  // ✅ MODIFICADO: componentDidUpdate para re-verificar cuando cambia el usuario
  async componentDidUpdate(prevProps) {
    const prevUserId = prevProps.user?._id;
    const currentUserId = this.props.user?._id;
    const prevRole = prevProps.user?.profile?.role;
    const currentRole = this.props.user?.profile?.role;

    // Re-verificar si cambió el usuario o su rol
    if (prevUserId !== currentUserId || prevRole !== currentRole) {
      console.log('🔄 [Main] Usuario o rol cambió, re-verificando permisos');
      await this.verifyPermissionsStatus();
    }
  }

  handlePermissionsComplete = async (permissionsStatus) => {
    console.log('✅ [Main] Permisos configurados:', permissionsStatus);
    
    // Marcar que se completó la configuración
    await AsyncStorage.setItem('permissions_configured', 'true');
    
    // Re-verificar permisos para asegurar que están otorgados
    await this.verifyPermissionsStatus();
  };

  
  render() {
    const { user, ready } = this.props;
    const { showPermissionsScreen, checkingPermissions } = this.state;

    console.log('🎨 [Main] Render state:', {
      ready,
      userId: Meteor.userId(),
      showPermissionsScreen,
      checkingPermissions,
      modoCadete: user?.modoCadete
    });

    // ✅ NUEVO: Mostrar loading mientras se verifican permisos
    if (checkingPermissions && ready && Meteor.userId()) {
      return (
        <SafeAreaProvider>
          <PaperProvider>
            <View style={styles.loadingContainer}>
              <Text variant="titleLarge" style={styles.loadingText}>
                Verificando permisos...
              </Text>
            </View>
          </PaperProvider>
        </SafeAreaProvider>
      );
    }

    // ✅ MODIFICADO: Mostrar pantalla de permisos si faltan permisos (sin importar AsyncStorage)
    if (ready && Meteor.userId() && showPermissionsScreen) {
      return (
        <SafeAreaProvider>
          <PaperProvider>
            <PermissionsManager
              onComplete={this.handlePermissionsComplete}
              userRole={user?.profile?.role || 'user'}
              initialScreen="intro" // ✅ Ir directo a pantalla de solicitud
            />
          </PaperProvider>
        </SafeAreaProvider>
      );
    }

    // Render normal
    return (
      <SafeAreaProvider>
        <PaperProvider>
          {ready && user?.modoCadete ? (
            // Modo Cadete activo: mostrar pantalla dedicada
            <CadeteNavigator />
          ) : ready && user?.profile?.roleComercio?.includes('EMPRESA') && user?.modoEmpresa ? ( 
            // ✅ NUEVO: Modo Empresa activo
            <EmpresaNavigator />
          ) : Meteor.userId() ? (
            // Usuario autenticado: ir a App principal
            <>
              <StatusBar
                translucent={true}
                backgroundColor={'transparent'}
                barStyle={'light-content'}
              />
              <App />
            </>
          ) : (
            // Sin autenticación: mostrar Login
            <>
              <StatusBar
                translucent={true}
                backgroundColor={'transparent'}
                barStyle={'light-content'}
              />
              <Loguin />
            </>
          )}
        </PaperProvider>
      </SafeAreaProvider>
    );
  }
}

const ServerList = withTracker(navigation => {
  const ready = (Meteor.userId() && Meteor.subscribe('user', { _id: Meteor.userId() }).ready()) || false;
  let user = Meteor.user();

  const userId = Meteor.userId();
  console.log('🔍 [Main.js Debug] Variables de estado:', {
    'Meteor.userId()': userId,
    'Meteor.status().connected': Meteor.status().connected,
    'ready': ready,
    'user': user ? {
      _id: user._id,
      username: user.username,
      modoCadete: user.modoCadete,
      profile: user.profile
    } : null,
    'Meteor.status()': Meteor.status()
  });

  if (Platform.OS === 'android') {
    if (Meteor.status().connected && ready && userId) {
      console.log("MyService.start()");
      MyService.setMeteorUserId(userId);
      MyService.start();
    } else if (Meteor.status().connected && ready) {
      console.log("MyService.stop()");
      MyService.setMeteorUserId(null);
      MyService.stop();
    }
  }

  return {
    user,
    ready
  };
})(MyApp);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: { height: 40, backgroundColor: '#f1f8ff' },
  text: { margin: 6 },
  // ✅ NUEVO: Estilos para pantalla de loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
});

export default ServerList;
