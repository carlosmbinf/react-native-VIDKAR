import React, {useEffect, useState} from 'react';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Loguin from '../loguin/Loguin';
import PelisHome from '../pelis/PelisHome';
import Prueba from '../pruebas/Prueba';
import UsersHome from '../users/UsersHome';
import { BottomNavigation } from 'react-native-paper';

const Tab = createBottomTabNavigator();

export function MyTabs(prop) {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    {key: 'pelis', title: 'Pelis', icon: 'movie'
    // , badge: true
  },
    {key: 'users', title: 'Users', icon: 'account-cog'
    // , badge: true
  },
  ]);
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'pelis':
        return <PelisHome navigationGeneral={prop.navigation} />;
      case 'users':
        return <UsersHome navigationGeneral={prop.navigation} />;
    }
  }
  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      activeColor='red'
      // barStyle={
      //   [{backgroundColor:'blue'},{backgroundColor:'white'}][index]
      // }
      shifting={true}
      />
    // <Tab.Navigator
    //   initialRouteName="Feed"
    //   // activeColor="#3f51b5"
    //   // barStyle={{backgroundColor: 'red'}}
    //   >
    //   <Tab.Screen
    //     name="Pelicula"
    //     // component={PelisHome}
    //     options={{
    //       tabBarLabel: 'Películas',
    //       tabBarIcon: ({color}) => (
    //         <MaterialCommunityIcons name="movie" color={color} size={26} />
    //       ),
    //     }}>
    //     {props => {
    //       const {navigation, route} = prop;
    //       // const {item} = route.params;
    //       return (
    //         <PelisHome navigationGeneral={navigation} />
    //         // <TasksProvider user={user} projectPartition={projectPartition}>
    //         //   <TasksView navigation={navigation} route={route} />
    //         // </TasksProvider>
    //       );
    //     }}
    //   </Tab.Screen>
    //   <Tab.Screen
    //     name="Users"
    //     // component={PelisHome}
    //     options={{
    //       tabBarLabel: 'Users',
    //       tabBarIcon: ({color}) => (
    //         <MaterialCommunityIcons
    //           name="account-cog"
    //           color={color}
    //           size={26}
    //         />
    //       ),
    //     }}>
    //     {props => {
    //       const {navigation, route} = prop;
    //       // const {item} = route.params;
    //       return (
    //         <UsersHome navigationGeneral={navigation} />
    //         // <TasksProvider user={user} projectPartition={projectPartition}>
    //         //   <TasksView navigation={navigation} route={route} />
    //         // </TasksProvider>
    //       );
    //     }}
    //   </Tab.Screen>
    //   {/* <Tab.Screen
    //     name="Loguin"
    //     component={Loguin}
    //     options={{
    //       tabBarLabel: 'Updates'
    //       // ,
    //       // tabBarIcon: ({ color }) => (
    //       //   <MaterialCommunityIcons name="bell" color={color} size={26} />
    //       // ),
    //     }}
    //   /> */}
    //   {/* <Tab.Screen
    //     name="Profile"
    //     component={Profile}
    //     options={{
    //       tabBarLabel: 'Profile',
    //       tabBarIcon: ({ color }) => (
    //         <MaterialCommunityIcons name="account" color={color} size={26} />
    //       ),
    //     }}
    //   /> */}
    // </Tab.Navigator>
  );
}
