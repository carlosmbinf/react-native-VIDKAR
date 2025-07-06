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
  Provider as PaperProvider,
  Surface,
} from 'react-native-paper';

import {
  StatusBar,
  StyleSheet,
  Text,
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
import Videollamada from './components/Calls/Videollamadas';
import Prueba from './components/Calls/Prueba';
import WebRTCConnection from './components/Calls/Prueba';

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
      <StatusBar
        translucent={true}
        backgroundColor={'transparent'}
        barStyle={true ? 'light-content' : 'dark-content'}
      />
      {/* <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}> */}

      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={
            // Meteor.user() &&
            // Meteor.user().profile &&
            // Meteor.user().profile.role == 'admin'
            true
              ? 'Videollamada'//'Videollamada' //'Users'
              : Meteor.user() && Meteor.user().subscipcionPelis
              ? 'PeliculasVideos'
              : 'User'
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
                  <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                    {/* <MenuIconMensajes navigation={navigation} /> */}

                    <Menu
                      visible={visibleMenuUsers}
                      onDismiss={() => {
                        setVisibleMenuUsers(false);
                      }}
                      anchor={
                        <Appbar.Action
                          icon="menu"
                          color="white"
                          onPress={() => {
                            setVisibleMenuUsers(true);
                          }}
                        />
                      }
                      style={{top: 70, width: 210, paddingRight: 30}}>
                      <View style={{padding: 0}}>
                        {/* <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({_id: Meteor.userId()}),
                          });
                        }}
                        title="Mi usuario"
                      /> */}
                        <Menu.Item
                          icon="logout"
                          onPress={() => {
                            Meteor.logout();
                            // navigation.navigate('Loguin');
                            setVisibleMenu(false);
                          }}
                          title="Cerrar Sessión"
                          style={{padding: 0}}
                        />
                      </View>
                    </Menu>
                  </View>
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
              return (<>
              <ScrollView style={{width:"100%", height: "100%"}}>
                <DashBoardPrincipal type={"HORA"} />
                <DashBoardPrincipal type={"DIARIO"} />
                <DashBoardPrincipal type={"MENSUAL"} />
              </ScrollView>
                
              </>

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
              headerLeft: null,
              headerShown: true,
              headerRight: () => (
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.userId(),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
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
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, width: 210, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({
                              _id: Meteor.userId(),
                            }),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
              ),
              // headerRight
              // headerTransparent:false
            })}>
            {props => {
              const {navigation, route} = props;
              return (
                <MyTabs navigation={navigation} route={route} />
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
                  <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                    {/* <MenuIconMensajes navigation={navigation} /> */}

                    <Menu
                      visible={visibleMenuUsers}
                      onDismiss={() => {
                        setVisibleMenuUsers(false);
                      }}
                      anchor={
                        <Appbar.Action
                          icon="menu"
                          color="white"
                          onPress={() => {
                            setVisibleMenuUsers(true);
                          }}
                        />
                      }
                      style={{top: 70, width: 210, paddingRight: 30}}>
                      <View style={{padding: 0}}>
                        {/* <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({_id: Meteor.userId()}),
                          });
                        }}
                        title="Mi usuario"
                      /> */}
                        <Menu.Item
                          icon="logout"
                          onPress={() => {
                            Meteor.logout();
                            // navigation.navigate('Loguin');
                            setVisibleMenu(false);
                          }}
                          title="Cerrar Sessión"
                          style={{padding: 0}}
                        />
                      </View>
                    </Menu>
                  </View>
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
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, width: 210, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({_id: Meteor.userId()}),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
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
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.userId(),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
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
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, width: 210, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({_id: Meteor.userId()}),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
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
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, width: 210, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({_id: Meteor.userId()}),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
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
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  {/* <MenuIconMensajes navigation={navigation} /> */}

                  <Menu
                    visible={visibleMenu}
                    onDismiss={() => {
                      setVisibleMenu(false);
                    }}
                    anchor={
                      <Appbar.Action
                        icon="menu"
                        color="white"
                        onPress={() => {
                          setVisibleMenu(true);
                        }}
                      />
                    }
                    style={{top: 70, width: 210, paddingRight: 30}}>
                    <View style={{padding: 0}}>
                      <Menu.Item
                        icon="menu"
                        onPress={() => {
                          // const item = Meteor.users.find({_id:Meteor.userId()}).fetch()
                          // console.log(item)
                          setVisibleMenu(false);
                          navigation.navigate('User', {
                            item: Meteor.users.findOne({_id: Meteor.userId()}),
                          });
                        }}
                        title="Mi usuario"
                      />
                      <Menu.Item
                        icon="logout"
                        onPress={() => {
                          Meteor.logout();
                          // navigation.navigate('Loguin');
                          setVisibleMenu(false);
                        }}
                        title="Cerrar Sessión"
                      />
                    </View>
                  </Menu>
                </View>
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
            name="Videollamada"
            options={({navigation, route}) => ({
              headerShown: false,
            })}>
            {props => {
              const {navigation, route} = props;

              return <WebRTCConnection/>

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
