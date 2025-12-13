/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useState } from 'react';
// import type {Node} from 'react';
import {
  Appbar,
  Menu,
  Provider as PaperProvider,
  Portal,
  Surface,
} from 'react-native-paper';

import {
  Text,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Dimensions,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform, // agregado: se usa en permisos y lógica por plataforma
  AppRegistry
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
// import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import Loguin from './components/loguin/Loguin';
import Meteor, { withTracker } from '@meteorrn/core';
// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import UserDetails from './components/users/UserDetails';
import MensajesHome from './components/mensajes/MensajesHome';
import MenuIconMensajes from './components/components/MenuIconMensajes';
import UserHome from './components/users/UsersHome';
import CreateUsers from './components/users/CreateUsers';
import LogsList from './components/logs/LogsList';
import VentasList from './components/ventas/VentasList';
import ChatUsersHome from './components/mensajes/ChatUsersHome';
import ConsumoUserHome from './components/users/ConsumoUsersHome';
import ServerList from './components/servers/ServerList';
import MyTabs from './components/navigator/MyTabs';
import VideoPlayer from './components/video/VideoPlayer';
import VideoPlayerIOS from './components/video/VideoPlayerIOS';
import DashBoardPrincipal from './components/dashboard/DashBoardPrincipal';
import Productos from './components/cubacel/Productos';
import MenuHeader from './components/Header/MenuHeader';
import MenuPrincipal from './components/Main/MenuPrincipal';
import TableRecargas from './components/cubacel/TableRecargas';
import TableListRemesa from './components/remesas/TableListRemesa'; // nuevo import
import FormularioRemesa from './components/remesas/FormularioRemesa'; // corregido: componente real
import VentasStepper from './components/remesas/VentasStepper';       // corregido: path real
import SubidaArchivos from './components/archivos/SubidaArchivos';
import ListaArchivos from './components/archivos/ListaArchivos';
import PropertyTable from './components/property/PropertyTable';
import HomePedidosComercio from './components/comercio/pedidos/HomePedidosComercio';

import messaging from '@react-native-firebase/messaging';
import VPNPackageCard from './components/vpn/VPNPackageCard';
import ProxyPackageCard from './components/proxy/ProxyPackageCard';
import ProxyPurchaseScreen from './components/proxy/ProxyPurchaseScreen';
import VPNPurchaseScreen from './components/vpn/VPNPurchaseScreen';
import TableProxyVPNHistory from './components/ventas/TableProxyVPNHistory';
import RequiredDataDialog from './components/auth/RequiredDataDialog';
// agregado: notifee opcional para mostrar notificaciones locales (foreground/background)
let NotifeeLib = null;
try {
  // carga condicional para no romper si @notifee/react-native no está instalado
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NotifeeLib = require('@notifee/react-native');
} catch (e) {
  console.warn('[Notifications] @notifee/react-native no instalado; se usará Alert en primer plano.');
}

const registerPushTokenForUser = async (userId, token) => {
  try {
    await Meteor.call('push.registerToken', {
      userId,
      token,
      platform: Platform.OS
    });
  } catch (e) {
    console.error("error en push.registerToken", e);
  }

};

// util: mostrar notificación local (usa Notifee si está, si no Alert en foreground)
const displayLocalNotification = async (remoteMessage, { allowAlert = true } = {}) => {
  console.log("[Notifications] Mostrar notificación local para mensaje:", remoteMessage);
  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    'Nueva notificación';
  const body =
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    (remoteMessage?.data ? JSON.stringify(remoteMessage.data) : 'Tienes un nuevo mensaje');

  Alert.alert(title, body);
  if (NotifeeLib?.default) {
    const notifee = NotifeeLib.default;
    try {
      // canal Android (necesario para mostrar notificaciones)
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'General',
        // Importance alta para heads-up
        importance: 4, // AndroidImportance.HIGH
      });

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_launcher', // asegúrate de tener el recurso
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
      console.warn('[Notifications] Error mostrando notificación con Notifee:', err);
      if (allowAlert) {
        Alert.alert(title, body);
      }
    }
  } else {
    // Fallback simple en primer plano
    if (allowAlert) {
      Alert.alert(title, body);
    }
  }
};

// const Section = ({children, title}): Node => {
//   const isDarkMode = useColorScheme() === 'dark';
//   return (
//     <View style={styles.sectionContainer}>
//       <Text
//         style={[
//           styles.sectionTitle,
//           {
//             color: isDarkMode ? Colors.white : Colors.black,
//           },
//         ]}>
//         {title}
//       </Text>
//       <Text
//         style={[
//           styles.sectionDescription,
//           {
//             color: isDarkMode ? Colors.light : Colors.dark,
//           },
//         ]}>
//         {children}
//       </Text>
//     </View>
//   );
// };

const Stack = createStackNavigator();

// const Tab = createMaterialBottomTabNavigator();
const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [data, setData] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [visibleMenu, setVisibleMenu] = useState(false);
  const [visibleMenuUsers, setVisibleMenuUsers] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [activeDrawer, setActiveDrawer] = React.useState('');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

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

  function logOut(navigation) {
    unsubscribeTokenRefresh();
    Meteor.logout(error => {
      error && Alert.alert('Error Cerrando Session');
    });
  }

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      // opcional: obtener FCM token si necesitas registrarlo en backend
      try {
        let a = await messaging().registerDeviceForRemoteMessages();
        console.log('FCM messaging().registerDeviceForRemoteMessages():', a);
        console.log('FCM messaging():', messaging().isDeviceRegisteredForRemoteMessages);
        // await messaging().registerForRemoteNotifications();


        if (Platform.OS === 'ios') {
          let tokenApns = await messaging().getAPNSToken();
          !tokenApns && await messaging().setAPNSToken(Meteor.userId());
          tokenApns = await messaging().getAPNSToken();
          console.log('FCM getAPNSToken (iOS):', tokenApns);
        }
        const token = await messaging().getToken();
        console.log('FCM token:', token);
        // registrar token con el usuario actual en backend (push.registerToken)
        await registerPushTokenForUser(Meteor.userId(), token);
      } catch (e) {
        console.warn('No se pudo obtener el FCM token:', e);
      }
    }
  }

  useEffect(() => {

    if (Platform.OS === 'ios') {
      requestUserPermission();
    } else {
      (async () => {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

        try {
          const token = await messaging().getToken();
          console.log('FCM token:', token);
          // registrar token con el usuario actual en backend (push.registerToken)
          token && await registerPushTokenForUser(Meteor.userId(), token);
        } catch (e) {
          console.warn('No se pudo obtener el FCM token:', e);
        }

      })()

    }

    // listener de refresh de token -> re-registrar en backend
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('FCM token refreshed:', newToken);
      await registerPushTokenForUser(Meteor.userId(), newToken);
    });

    // listener de mensajes en primer plano
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      // Mostrar notificación sencilla con el contenido recibido
      await displayLocalNotification(remoteMessage, { allowAlert: true });
    });

    // app abierta desde una notificación (background -> foreground)
    const unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notificación abrió la app desde background:', remoteMessage);
      // aquí se podría navegar según data del mensaje
    });

    // app abierta desde estado "quit"
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          Alert.alert(remoteMessage?.notification?.title
            , remoteMessage?.notification?.body, [{ text: 'OK', onPress: () => console.log('OK Pressed') }]);
          console.log('Se abrio desde la Notificacion:', remoteMessage);

          // aquí se podría navegar según data del mensaje
        }
      })
      .catch(err => console.warn('getInitialNotification error:', err));

    return () => {
      unsubscribeOnMessage();
      unsubscribeOpened();
    };
  }, []);







  return (
    <PaperProvider>
      <Portal.Host>
      <>
        {/* {Platform.OS === 'android' && <RequiredDataDialog />} */}
        {/* <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={backgroundStyle}> */}

      <NavigationContainer linking={linking} fallback={<Text>Cargando...</Text>}>
        <Stack.Navigator
          initialRouteName={
            "Main"
            // Meteor.user() &&
            //   Meteor.user().profile &&
            //   Meteor.user().profile.role == 'admin'
            //   ? "Users"
            //   : Meteor.user() && Meteor.user().subscipcionPelis
            //     ? 'PeliculasVideos'
            //     : 'User'
          }
        >
          {/* <Stack.Screen
            name="Loguin"
            component={Loguin}
            options={({navigation, route}) => ({
              title: <Text>Inicio</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerShown: true,
              // headerRight
              // headerTransparent:false
            })}
          /> */}
          <Stack.Screen
            name="Main"
            component={MenuPrincipal}
            options={({ navigation, route }) => ({
              animationEnabled: true,
              title: (
                <Text style={{ letterSpacing: 5 }}>
                  <FontAwesome
                    // onPress={() => logOut(navigation)}
                    name="hand-o-right"
                    color={'white'}
                    size={20}
                    // borderRadius={20}
                    solid
                  />
                  VidKar {route?.params?.id}
                  <FontAwesome
                    // onPress={() => logOut(navigation)}
                    name="hand-o-left"
                    color={'white'}
                    size={20}
                    // borderRadius={20}
                    solid
                  />
                </Text>
              ),
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerLeft: null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="Dashboard"
            options={({ navigation, route }) => {
              const { params } = route;
              var item = Meteor.users.findOne(
                params ? params.item : Meteor.userId(),
                {
                  fields: {
                    _id: 1,
                    'profile.firstName': 1,
                    'profile.lastName': 2,
                  },
                },
              );
              return {
                title: (
                  <Text>
                    {item && item.profile
                      ? `${item.profile.firstName} ${item.profile.lastName}`
                      : ''}
                  </Text>
                ),
                headerStyle: {
                  backgroundColor: '#3f51b5',
                  // height: 90,
                },
                headerTitleAlign: 'left',
                headerTintColor: '#fff',
                // headerTitleStyle: {
                //   fontWeight: 'bold',
                // },
                // headerLeft:
                //   !(
                //     Meteor.user() &&
                //     Meteor.user().profile &&
                //     Meteor.user().profile.role == 'admin'
                //   ) && null,
                headerShown: true,
                // headerLeftContainerStyle: { display: flex },
                headerRight: () => (
                  <MenuHeader
                    navigation={navigation}
                  />
                ),
                // headerRight
                // headerTransparent:false
              };
            }}>
            {props => {
              const { navigation, route } = props;
              const { params } = route;
              const item = params ? params.item : Meteor.userId();
              // const {navigation} = route.params;
              return (<Surface>
                <ScrollView style={{ width: "100%", height: "100%" }}>
                  <DashBoardPrincipal type={"HORA"} />
                  <DashBoardPrincipal type={"DIARIO"} />
                  <DashBoardPrincipal type={"MENSUAL"} />
                </ScrollView>

              </Surface>

                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>

          <Stack.Screen
            name="Users"
            component={UserHome}
            options={({ navigation, route }) => ({
              title: (
                <Text style={{ letterSpacing: 5 }}>
                  <FontAwesome
                    // onPress={() => logOut(navigation)}
                    name="hand-o-right"
                    color={'white'}
                    size={20}
                    // borderRadius={20}
                    solid
                  />
                  VidKar {route?.params?.id}
                  <FontAwesome
                    // onPress={() => logOut(navigation)}
                    name="hand-o-left"
                    color={'white'}
                    size={20}
                    // borderRadius={20}
                    solid
                  />
                </Text>
              ),
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerLeft: null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="PeliculasVideos"
            // component={MyTabs}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 4 }}>Peliculas y Series</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              )
              // headerRight
              // headerTransparent:false
            })}
          >
            {props => {
              const { navigation, route } = props;
              return (
                Meteor.user() && Meteor.user().subscipcionPelis ? (
                  <MyTabs navigation={navigation} route={route} />
                ) :
                  (
                    <Surface style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <View style={{ flex: 1, }}
                      >
                        <Text style={{ fontSize: 20, textAlign: 'center', marginTop: 20 }} >No tiene una Subscripcion Activa</Text>
                      </View>
                    </Surface>
                  )

                // <Player id={id} subtitulo={subtitulo} navigation={navigation} urlPeliHTTPS={urlPeliHTTPS} />
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="User"
            options={({ navigation, route }) => {
              const { params } = route;
              var item = Meteor.users.findOne(
                params ? params.item : Meteor.userId(),
                {
                  fields: {
                    _id: 1,
                    'profile.firstName': 1,
                    'profile.lastName': 2,
                  },
                },
              );
              return {
                title: (
                  <Text>
                    {item && item.profile
                      ? `${item.profile.firstName} ${item.profile.lastName}`
                      : ''}
                  </Text>
                ),
                headerStyle: {
                  backgroundColor: '#3f51b5',
                  // height: 90,
                },
                headerTitleAlign: 'left',
                headerTintColor: '#fff',
                // headerTitleStyle: {
                //   fontWeight: 'bold',
                // },
                headerLeft:
                  !(
                    Meteor.user() &&
                    Meteor.user().profile &&
                    Meteor.user().profile.role == 'admin'
                  ) && null,
                headerShown: true,
                // headerLeftContainerStyle: { display: flex },
                headerRight: () => (
                  <MenuHeader
                    navigation={navigation}
                  />
                ),
                // headerRight
                // headerTransparent:false
              };
            }}>
            {props => {
              const { navigation, route } = props;
              const { params } = route;
              const item = params ? params.item : Meteor.userId();
              // const {navigation} = route.params;
              return (
                <UserDetails item={item} navigation={navigation} />
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="Servidores"
            component={ServerList}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Servidores</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="ConsumoUsers"
            component={ConsumoUserHome}
            options={({ navigation, route }) => ({
              title: (
                <Text style={{ letterSpacing: 5 }}>
                  <FontAwesome
                    // onPress={() => logOut(navigation)}
                    name="hand-o-right"
                    color={'white'}
                    size={20}
                    // borderRadius={20}
                    solid
                  />
                  VidKar
                  <FontAwesome
                    // onPress={() => logOut(navigation)}
                    name="hand-o-left"
                    color={'white'}
                    size={20}
                    // borderRadius={20}
                    solid
                  />
                </Text>
              ),
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="CreateUsers"
            component={CreateUsers}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Crear Usuario</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="Logs"
            component={LogsList}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Logs</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="Ventas"
            component={VentasList}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Ventas</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="SubidaArchivos"
            component={SubidaArchivos}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Upload</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="ListaArchivos"
            component={ListaArchivos}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Archivos</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />
          <Stack.Screen
            name="ListaPropertys"
            component={PropertyTable}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Propertys</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          />

          <Stack.Screen
            name="Video"
            options={({ navigation, route }) => ({
              headerShown: false,
            })}>
            {props => {
              const { navigation, route } = props;
              const { id, subtitulo } = route.params;

              if (Platform.OS == 'ios') {
                return (
                  <VideoPlayerIOS
                    id={id}
                    subtitulo={subtitulo}
                    navigation={navigation}
                    route={route}
                  />
                );
              }
              return (
                <VideoPlayer
                  id={id}
                  subtitulo={subtitulo}
                  navigation={navigation}
                  route={route}
                />
              );

              // <Player id={id} subtitulo={subtitulo} navigation={navigation} urlPeliHTTPS={urlPeliHTTPS} />
              // <TasksProvider user={user} projectPartition={projectPartition}>
              //   <TasksView navigation={navigation} route={route} />
              // </TasksProvider>
            }}
          </Stack.Screen>
          <Stack.Screen
            name="Mensaje"
            options={({ navigation, route }) => ({
              title: (
                <Text>
                  {Meteor.users.findOne(route.params.item) &&
                    Meteor.users.findOne(route.params.item).profile.firstName}
                </Text>
              ),
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerShown: true,
              // headerRight
              // headerTransparent:false
            })}>
            {props => {
              const { navigation, route } = props;
              // console.log(item)
              const { item } = route.params;
              return (
                <MensajesHome user={item} navigation={navigation} route={route} />
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="AllMensajesUser"
            options={({ navigation, route }) => ({
              title: <Text>Mensajes</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerShown: true,
              // headerRight
              // headerTransparent:false
            })}>
            {props => {
              const { navigation, route } = props;
              // console.log(item)
              return (
                <ChatUsersHome navigation={navigation} />
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="ProductosCubacelCards"
            // component={Productos}
            options={({ navigation, route }) => ({
              title: <Text>Recargas</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                // height: 90,
              },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              // headerLeft:null,
              headerShown: true,
              headerRight: () => (
                <MenuHeader
                  navigation={navigation}
                />
              ),
              // headerRight
              // headerTransparent:false
            })}
          >
            {props => {
              const { navigation, route } = props;
              // console.log(item)
              return (
                <>
                  <Surface>
                    <Productos />
                  </Surface>

                  <TableRecargas />

                </>


                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="Remesas"
            component={TableListRemesa}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Remesas</Text>,
              headerStyle: { backgroundColor: '#3f51b5', height: 90 },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              headerShown: true,
              headerRight: () => (
                <MenuHeader navigation={navigation} />
              ),
            })}
          />

          {/* nuevo: formulario de remesas */}
          <Stack.Screen
            name="remesas"
            // component={FormularioRemesa} // usar el componente correcto
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Formulario Remesas</Text>,
              headerStyle: { backgroundColor: '#3f51b5', height: 90 },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              headerShown: true,
              headerRight: () => (
                <MenuHeader navigation={navigation} />
              ),
            })}
          >
            {props => {
              const { navigation, route } = props;
              // console.log(item)
              return (
                <Surface style={{ height: "100%" }}>
                  <ScrollView>
                    {Meteor.user()?.permiteRemesas ? (
                      <FormularioRemesa />
                    ) : (
                      <Text style={{ textAlign: 'center', margin: 20 }}>
                        No tiene permiso para realizar remesas.
                      </Text>
                    )}
                    <TableListRemesa />
                  </ScrollView>

                </Surface>


                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>

          {/* nuevo: ventas stepper */}
          <Stack.Screen
            name="VentasStepper"
            component={VentasStepper}
            options={({ navigation, route }) => ({
              title: <Text style={{ letterSpacing: 2 }}>Ventas (Stepper)</Text>,
              headerStyle: { backgroundColor: '#3f51b5', height: 90 },
              headerTitleAlign: 'left',
              headerTintColor: '#fff',
              headerShown: true,
              headerRight: () => (
                <MenuHeader navigation={navigation} />
              ),
            })}
          />

          <Stack.Screen
            name="ProxyPackages"
            component={ProxyPackageCard}
            options={{
              title: 'Paquetes Proxy',
              headerStyle: { backgroundColor: '#2196F3' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />

          <Stack.Screen
            name="VPNPackages"
            component={VPNPackageCard}
            options={{
              title: 'Paquetes VPN',
              headerStyle: { backgroundColor: '#4CAF50' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />

          <Stack.Screen
            name="ProxyPurchase"
            component={ProxyPurchaseScreen}
            options={{
              title: 'Comprar Paquete Proxy',
              headerStyle: {
                backgroundColor: '#2196F3',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />

          <Stack.Screen
            name="VPNPurchase"
            component={VPNPurchaseScreen}
            options={{
              title: 'Comprar Paquete VPN',
              headerStyle: {
                backgroundColor: '#4CAF50',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen
            name="ProxyVPNHistory"
            component={TableProxyVPNHistory}
            options={{
              title: 'Historial Proxy/VPN',
              headerStyle: {
                backgroundColor: '#673AB7', // Púrpura para indicar mixto
                height: 90
              },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />

          <Stack.Screen
            name="PedidosComercio"
            component={HomePedidosComercio}
            options={{
              title: 'Mis Pedidos',
              headerStyle: {
                backgroundColor: '#FF6F00', // Naranja Material
                // height: 90,
              },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />

          {/* <Stack.Screen name="Video" component={VideoPlayer} /> */}
          {/* <Stack.Screen name="Task List">
                {props => {
                  const {navigation, route} = props;
                  const {user, projerctPartition} = route.params;
                  return (
                    <TasksProvider
                      user={user}
                      projectPartition={projectPartition}>
                      <TasksView navigation={navigation} route={route} />
                    </TasksProvider>
                  );
                }}
              </Stack.Screen> */}
        </Stack.Navigator>
      </NavigationContainer>

      {/* <PelisHome /> */}
      {/* </ScrollView> */}
    </>
    </Portal.Host>
    </PaperProvider>
  );
};
// const MensajesHome = withTracker(user => {
//   //  console.log(user.user)
//    const handle = Meteor.subscribe('mensajes', user.user._id);
//    const myTodoTasks = MyCol.find({'to':user.user._id}).fetch();
//    return {
//     user:user.user,
//      myTodoTasks,
//      loading: !handle.ready(),
//    };
//  })(MyApp);

var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
  },
  viewFullHeight: {
    height: ScreenHeight,
  },
  imageFondo: {
    width: '100%',
    height: ScreenHeight,
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
