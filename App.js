/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState} from 'react';
// import type {Node} from 'react';
import {
  Appbar,
  Menu,
  Text,  
  Provider as PaperProvider,
  Surface,
} from 'react-native-paper';

import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
// import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import Loguin from './components/loguin/Loguin';
import Meteor, {withTracker} from '@meteorrn/core';
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
        ProductosCubacelCards : 'productos'       // Ruta para pantalla los productos
        // Otras pantallas si las hay...
      },
    },
  };

  function logOut(navigation) {
    Meteor.logout(error => {
      error && Alert.alert('Error Cerrando Session');
    });
  }
  useEffect(() => {
    // Meteor.connect('ws://10.0.2.2:8080', AsyncStorage);
    // alert(Meteor.status().status);
    // let handle = Meteor.subscribe('mensajes', {});
    // handle.ready() &&
    //   setMessageCount(MyCol.find({to: Meteor.userId()}).count());
  }, []);

  return (
    <>
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
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              title: (
                <Text style={{letterSpacing: 5}}>
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
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => {
              const {params} = route;
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
                  height: 90,
                },
                headerTitleAlign: 'center',
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
              const {navigation, route} = props;
              const {params} = route;
              const item = params ? params.item : Meteor.userId();
              // const {navigation} = route.params;
              return (<Surface>
              <ScrollView style={{width:"100%", height: "100%"}}>
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
            options={({navigation, route}) => ({
              title: (
                <Text style={{letterSpacing: 5}}>
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
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              title: <Text style={{letterSpacing: 4}}>Peliculas y Series</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
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
                  <Surface style={{flex:1, justifyContent:'center', alignItems:'center', height:'100%'}}>
                  <View style={{flex:1,}}
                  >
                    <Text style={{fontSize:20, textAlign:'center', marginTop:20}} >No tiene una Subscripcion Activa</Text>
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
            options={({navigation, route}) => {
              const {params} = route;
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
                  height: 90,
                },
                headerTitleAlign: 'center',
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
              const {navigation, route} = props;
              const {params} = route;
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
            options={({navigation, route}) => ({
              title: <Text style={{letterSpacing: 5}}>Servidores</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              title: (
                <Text style={{letterSpacing: 5}}>
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
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              title: <Text style={{letterSpacing: 5}}>Crear Usuario</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              title: <Text style={{letterSpacing: 5}}>Registro de Logs</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              title: <Text style={{letterSpacing: 5}}>Registro de Logs</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
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
            options={({navigation, route}) => ({
              headerShown: false,
            })}>
            {props => {
              const {navigation, route} = props;
              const {id, subtitulo} = route.params;

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
            options={({navigation, route}) => ({
              title: (
                <Text>
                  {Meteor.users.findOne(route.params.item) &&
                    Meteor.users.findOne(route.params.item).profile.firstName}
                </Text>
              ),
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerShown: true,
              // headerRight
              // headerTransparent:false
            })}>
            {props => {
              const {navigation, route} = props;
              // console.log(item)
              const {item} = route.params;
              return (
                <MensajesHome user={item} />
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="AllMensajesUser"
            options={({navigation, route}) => ({
              title: <Text>Mensajes</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
              headerTintColor: '#fff',
              // headerTitleStyle: {
              //   fontWeight: 'bold',
              // },
              headerShown: true,
              // headerRight
              // headerTransparent:false
            })}>
            {props => {
              const {navigation, route} = props;
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
            options={({navigation, route}) => ({
              title: <Text style={{letterSpacing: 5}}>Recargas</Text>,
              headerStyle: {
                backgroundColor: '#3f51b5',
                height: 90,
              },
              headerTitleAlign: 'center',
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
              const {navigation, route} = props;
              // console.log(item)
              return (
                <>
                <Surface>
                <Productos />
                </Surface>
                
                <TableRecargas/> 
                
                </>
                
                                
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
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
