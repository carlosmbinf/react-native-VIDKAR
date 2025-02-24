import React, {useEffect, useState} from 'react';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PelisHome from '../pelis/PelisHome';
// import DownloadVideosHome from '../downloadVideos/DownloadVideosHome';
// import Prueba from '../pruebas/Prueba';
import {BottomNavigation, Text} from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();

export default function MyTabs(prop) {
  const [index, setIndex] = useState(0);
  const [routes] =
  Meteor.user() && Meteor.user().profile && Meteor.user().profile.role == 'admin'
      ? useState([
          {
            key: 'pelis',
            title: 'Pelis',
            icon: 'movie',
            // , badge: true
          },
          {
            key: 'series',
            title: 'Series',
            icon: 'video-vintage',
            // , badge: true
          },
        ])
      : useState([
          {
            key: 'pelis',
            title: 'Pelis',
            icon: 'movie',
            // , badge: true
          },
          {
            key: 'series',
            title: 'Series',
            icon: 'video-vintage',
            // , badge: true
          },
        ]);
  // console.log();

  const renderScene = ({route}) => {
    switch (route.key) {
      case 'pelis':
        return (
          <>
          {/* <Text>pelis</Text> */}
            <PelisHome navigationGeneral={prop.navigation} />
          </>
        );
      case 'series':
        return (
          <>
            {/* comming soon */}
            <View
              style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                {/* Recuadro estetico mostrando mensaje de COMMING SOON */}
                <View
                  style={{
                    backgroundColor: '#3f51b5',
                    width: '80%',
                    height: 100,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 20,
                  }}>
                  <Text style={{color: 'white', fontSize: 20}}>
                    COMMING SOON
                  </Text>
                  </View>
            </View>
            {/* <Text>downloads</Text> */}
            {/* <DownloadVideosHome navigationGeneral={prop.navigation} /> */}
          </>
        );
    }
  };
  return (
    <BottomNavigation
      navigationState={{index, routes}}
      onIndexChange={index => {
        setIndex(index);
      }}
      renderScene={renderScene}
      activeColor="violet"
      barStyle={{backgroundColor: '#3f51b5'}}
      // shifting={true}
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
