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
  Badge,
  IconButton,
  Menu,
  Provider as PaperProvider,
} from 'react-native-paper';

// import 'react-native-gesture-handler';
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';

import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  VirtualizedList,
  Dimensions,
  Alert,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import PelisHome from './components/pelis/PelisHome';
import Header from 'react-native-custom-header';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AwesomeIcon from 'react-native-vector-icons/FontAwesome';
import Icon from 'react-native-vector-icons/FontAwesome';
// import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import Prueba from './components/pruebas/Prueba';
import Loguin from './components/loguin/Loguin';
import Meteor, {withTracker} from '@meteorrn/core';
// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import {MyTabs} from './components/navigator/MyTabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import VideoPlayer from './components/video/VideoPlayer';
import UserDetails from './components/users/UserDetails';
import MyApp from './components/mensajes/MensajesHome';
import MenuIconMensajes from './components/components/MenuIconMensajes';

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
const MyCol = new Meteor.Collection('mensajes');

const Stack = createStackNavigator();

// const Tab = createMaterialBottomTabNavigator();
const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [data, setData] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [visibleMenu, setVisibleMenu] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  function logOut(navigation) {
    Meteor.logout(error => {
      error
        ? Alert.alert('Error Cerrando Session')
        : navigation.navigate('Loguin');
    });
  }
  useEffect(() => {
    // Meteor.connect('ws://10.0.2.2:8080', AsyncStorage);
    // alert(Meteor.status().status);
    let handle = Meteor.subscribe('mensajes', {});
    handle.ready() &&
      setMessageCount(MyCol.find({to: Meteor.userId()}).count());
  }, []);

  return (
    <PaperProvider>
      <StatusBar
        translucent={true}
        backgroundColor={'transparent'}
        barStyle={true ? 'light-content' : 'dark-content'}
      />
      {/* <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}> */}

      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Loguin"
            component={Loguin}
            options={({navigation, route}) => ({
              title: <Text>{route.name}</Text>,
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
          />
          <Stack.Screen
            name="Peliculas"
            component={MyTabs}
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
              headerShown: true,
              headerRight: () => (
                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                  <MenuIconMensajes navigation={navigation} />

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
                          navigation.navigate('Loguin');
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
              const {item} = route.params;
              return (
                <VideoPlayer item={item} />
                // <TasksProvider user={user} projectPartition={projectPartition}>
                //   <TasksView navigation={navigation} route={route} />
                // </TasksProvider>
              );
            }}
          </Stack.Screen>
          <Stack.Screen
            name="User"
            options={({navigation, route}) => ({
              title: (
                <Text>
                  {route.params.item.profile.firstName +
                    ' ' +
                    route.params.item.profile.lastName}
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
              const {item} = route.params;
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
            name="Mensajes"
            options={({navigation, route}) => ({
              title: (
                <Text>
                  {route.params.item.profile.firstName +
                    ' ' +
                    route.params.item.profile.lastName}
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
              const {item} = route.params;
              // console.log(item)
              return (
                <MyApp user={item} />
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
