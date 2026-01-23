/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useRef, useState } from 'react';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import { Platform, StatusBar, StyleSheet, View, AppState, Alert, PermissionsAndroid } from 'react-native';
import { Text, Provider as PaperProvider, Surface, ActivityIndicator, Portal, } from 'react-native-paper';
import App from './App';
import Loguin from './components/loguin/Loguin';
import HomePedidosComercio from './components/comercio/pedidos/HomePedidosComercio';
import CadeteNavigator from './components/cadete/CadeteNavigator';
import EmpresaNavigator from './components/empresa/EmpresaNavigator'; // ✅ NUEVO
import MyService from './src/native/MyService';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import PermissionsManager from './components/permissions/PermissionsManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { badgeManager } from './services/notifications/PushMessaging';
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
import { NavigationContainer } from '@react-navigation/native';
import UserDetails from './components/users/UserDetails';
import { createStackNavigator } from '@react-navigation/stack';

// ✅ Cargar Notifee de forma segura
let NotifeeLib = null;
try {
  NotifeeLib = require('@notifee/react-native');
} catch (e) {
  console.warn('[Main] @notifee/react-native no instalado');
}

// ✅ Función para registrar token de push
const registerPushTokenForUser = async (userId, token) => {
  try {
    console.log('[Main] Registrando token de push para usuario:', { userId, token });
    await Meteor.call('push.registerToken', {
      userId,
      token,
      platform: Platform.OS
    });
  } catch (e) {
    console.error('[Main] Error en push.registerToken', e);
  }
};

// ✅ Función para mostrar notificación local
const displayLocalNotification = async (remoteMessage, { allowAlert = true } = {}) => {
  console.log('[Main] Mostrar notificación local para mensaje:', remoteMessage);
  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    'Nueva notificación';
  const body =
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    (remoteMessage?.data ? JSON.stringify(remoteMessage.data) : 'Tienes un nuevo mensaje');

  // ✅ Incrementar badge de forma profesional

  if (allowAlert) {
    Alert.alert(title, body);
  }

  if (NotifeeLib?.default && !allowAlert) {
    const notifee = NotifeeLib.default;
    try {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'General',
        importance: 4, // HIGH
      });

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });
    } catch (err) {
      console.warn('[Main] Error mostrando notificación con Notifee:', err);
    }
  }
};

// ✅ Función para solicitar permisos de notificaciones
const requestPermissionsIfNeeded = async () => {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return !!enabled;
  } else {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch { }
    return true;
  }
};

console.log('Main.js');
class MyApp extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      permissionsChecked: false,
      showPermissionsScreen: false,
      checkingPermissions: true, // ✅ NUEVO: Estado de verificación inicial
    };

    // ✅ Bandera para prevenir registros duplicados de listeners
    this.notificationListenersRegistered = false;
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
    // ✅ Verificar permisos
    await this.verifyPermissionsStatus();

    // ✅ PREVENIR REGISTROS DUPLICADOS
    if (this.notificationListenersRegistered) {
      console.log('[Main] ⚠️ Listeners ya registrados, omitiendo...');
      return;
    }

    console.log('[Main] 🔔 Registrando listeners de notificaciones...');
    this.notificationListenersRegistered = true;

    // ✅ Resetear badge al abrir la app
    await badgeManager.reset();

    // ✅ Solicitar permisos de notificaciones push
    await requestPermissionsIfNeeded();

    // ✅ Listener para AppState: resetear badge cuando la app pasa a activo
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Main] App activa, reseteando badge...');
        await badgeManager.reset();
      }
    });

    // ✅ Listener para refresh de token
    this.unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
      const userId = Meteor.userId();
      if (userId && token) {
        console.log('[Main] Token FCM refrescado:', token);
        await registerPushTokenForUser(userId, token);
      }
    });

    // ✅ Listener para notificaciones en foreground
    this.unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('[Main] Notificación en foreground:', remoteMessage);
      badgeManager.increment(); // Incrementar badge aunque estemos en foreground
      await displayLocalNotification(remoteMessage);
    });

    // ✅ Listener para app abierto desde notificación
    this.unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(async (remoteMessage) => {
      console.log('[Main] App abierto desde notificación:', remoteMessage);
      Alert.alert(remoteMessage?.notification?.title, remoteMessage?.notification?.body);
      await badgeManager.reset();
    });

    // Register background handler
    this.unsubscribeNotificationOnBackground = messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // ✅ Verificar si la app fue abierta desde una notificación (app cerrada)
    messaging()
      .getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage) {
          console.log('[Main] App abierto desde estado cerrado con notificación:', remoteMessage);
          await badgeManager.reset();
        }
      });
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

  // ✅ Limpiar listeners al desmontar el componente
  componentWillUnmount() {
    console.log('[Main] 🧹 Limpiando listeners de notificaciones...');

    // ✅ Resetear bandera
    this.notificationListenersRegistered = false;

    // Remover listener de AppState
    if (this.appStateSubscription) {
      console.log("cerrando subscripcion appStateSubscription");
      
      this.appStateSubscription.remove();
    }

    // Remover listeners de Firebase Messaging
    if (this.unsubscribeTokenRefresh) {
      console.log("cerrando subscripcion unsubscribeTokenRefresh");

      this.unsubscribeTokenRefresh();
    }
    if (this.unsubscribeForeground) {
      console.log("cerrando subscripcion unsubscribeForeground"); 
      this.unsubscribeForeground();
    }
    if (this.unsubscribeNotificationOpened) {
      console.log("cerrando subscripcion unsubscribeNotificationOpened");
      this.unsubscribeNotificationOpened();
    }
    if (this.unsubscribeNotificationOnBackground) {
      console.log("cerrando subscripcion unsubscribeNotificationOnBackground");
      this.unsubscribeNotificationOnBackground();
    }

    console.log('[Main] ✅ Listeners de notificaciones removidos correctamente');
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
    const Stack = createStackNavigator();

    const linking = {
      prefixes: ['https://www.vidkar.com', 'http://www.vidkar.com', 'vidkar://'],  // URLs válidas para la app
      config: {
        screens: {
          // Recargas: 'recargas',          // Ruta para pantalla Recargas
          // Users: 'users/:id',   
          ProductosCubacelCards: 'productos',       // Ruta para pantalla los productos
          Remesas: 'remesas', // nueva URL para Remesas
          RemesasForm: 'remesas/form',        // nueva URL
          VentasStepper: 'ventas/stepper',    // nueva URL
          // Otras pantallas si las hay...
        },
      },
    };

    console.log('🎨 [Main] Render state:', {
      ready,
      userId: Meteor.userId(),
      showPermissionsScreen,
      checkingPermissions,
      modoCadete: user?.modoCadete
    });

    // ✅ NUEVO: Mostrar loading mientras se verifican permisos
    if (Platform.OS === 'android' && checkingPermissions && ready && Meteor.userId()) {
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
    if (ready && Meteor.userId() && (Platform.OS === 'android' || user?.modoCadete) && showPermissionsScreen) {
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
          <Portal.Host>
            <NavigationContainer
              linking={linking}
              fallback={
                <Surface style={styles.loadingContainer}>
                  <ActivityIndicator
                    animating={true}
                    size="large"
                    color="#3f51b5"
                  />
                  <Text style={styles.loadingText}>Cargando...</Text>
                </Surface>
              }

            >
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
            </NavigationContainer>
          </Portal.Host>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }
}

const ServerList = withTracker(async navigation => {
  const ready = (Meteor.userId() && Meteor.subscribe('user', { _id: Meteor.userId() }).ready()) || false;
  let user = Meteor.user();

  const userId = Meteor.userId();

      // ✅ Obtener token de FCM y registrarlo
    try {
      const token = await messaging().getToken();
      console.log("[Main] Token FCM", token);
      if (userId && token) {
        await registerPushTokenForUser(userId, token);
      }
    } catch (e) {
      console.warn('[Main] No se pudo obtener token FCM', e);
    }

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

  // ✅ Gestión del servicio de tracking con validación de modo cadete
  if (Platform.OS === 'android') {
    if (Meteor.status().connected && ready && userId) {
      // ✅ Solo iniciar servicio si el usuario tiene modo cadete activo
      if (user?.modoCadete) {
        console.log("✅ [MyService] Usuario en modo cadete, iniciando servicio de tracking");
        MyService.setMeteorUserId(userId);
        MyService.start();
      } else {
        console.log("⚠️ [MyService] Usuario NO está en modo cadete, deteniendo servicio");
        MyService.setMeteorUserId(null);
        MyService.stop();
      }
    } else if (Meteor.status().connected && ready) {
      console.log("🛑 [MyService] Usuario desconectado o no ready, deteniendo servicio");
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
