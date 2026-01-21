import React, { useRef, useState } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Drawer from 'react-native-drawer';
import EmpresaDrawerContent from './EmpresaDrawerContent';
import MisTiendasScreen from './screens/MisTiendasScreen';
import TiendaDetailScreen from './screens/TiendaDetailScreen';
import ProductoFormScreen from './screens/ProductoFormScreen';
import UserDetails from '../users/UserDetails';
import { Appbar, Text } from 'react-native-paper';
import Meteor from '@meteorrn/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PedidosPreparacionScreen from './screens/PedidosPreparacionScreen';

const Stack = createStackNavigator();

// ✅ Deep linking config para módulo empresa
const linking = {
  prefixes: ['vidkar://empresa', 'https://www.vidkar.com/empresa', 'http://www.vidkar.com/empresa'],
  config: {
    screens: {
      MisTiendas: 'tiendas',
      TiendaDetail: 'tienda/:tiendaId',
      ProductoForm: {
        path: 'producto/:productoId?',
        parse: {
          productoId: (productoId) => productoId || null,
        },
      },
    },
  },
};

const EmpresaNavigator = () => {
  const drawerRef = useRef(null);
  const [navigationReady, setNavigationReady] = useState(false);

  const closeDrawer = () => drawerRef.current?.close();
  const openDrawer = () => drawerRef.current?.open();

  return (
    <>
      <StatusBar
        translucent={false}
        backgroundColor={'#673AB7'}
        barStyle={'light-content'}
      />
      
        <Drawer
          ref={drawerRef}
          type="overlay"
          content={
            <EmpresaDrawerContent
              closeDrawer={closeDrawer}
              navigationReady={navigationReady}
            />
          }
          tapToClose={true}
          openDrawerOffset={0.3}
          panCloseMask={0.3}
          closedDrawerOffset={0}
          styles={{
            drawer: {
              shadowColor: '#000000',
              shadowOpacity: 0.8,
              shadowRadius: 3,
              backgroundColor: '#FFFFFF',
            },
            main: { paddingLeft: 0 },
          }}
          tweenHandler={(ratio) => ({
            main: { opacity: Math.max(0.54, 1 - ratio) },
          })}
        >
          <View style={styles.container}>
            {/* ✅ Stack Navigator sin Appbar global */}
            <Stack.Navigator
              initialRouteName="PedidosPreparacion"
              screenOptions={{
                headerShown: false, // Cada screen maneja su header
              }}
            >

              <Stack.Screen name="PedidosPreparacion">
                {(props) => <PedidosPreparacionScreen {...props} openDrawer={openDrawer} />}
              </Stack.Screen>

              <Stack.Screen name="MisTiendas">
                {(props) => <MisTiendasScreen {...props} openDrawer={openDrawer} />}
              </Stack.Screen>
              
              <Stack.Screen
                name="TiendaDetail"
                component={TiendaDetailScreen}
                options={({ route }) => ({
                  title: route.params?.tienda?.title || 'Detalle de Tienda',
                })}
              />
              <Stack.Screen
                name="ProductoForm"
                component={ProductoFormScreen}
                options={({ route }) => ({
                  title: route.params?.producto?._id ? 'Editar Producto' : 'Nuevo Producto',
                })}
              />

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
                    headerShown: false,
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
                    <View>
                      <Appbar style={{ backgroundColor: '#3f51b5', height: useSafeAreaInsets().top + 50, justifyContent: 'center', paddingTop: useSafeAreaInsets().top }}>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                          <Appbar.BackAction
                            color='red'
                            onPress={() => {
                              if (navigation.canGoBack()) {
                                navigation.goBack();
                              }
                            }}
                          />
                          <Text style={{ color: 'white', fontSize: 20, marginTop: 10, }}>Detalles del usuario</Text>
                          {/* <MenuHeader
                            navigation={navigation}
                          /> */}
                        </View>
                      </Appbar>
                      <UserDetails item={item} navigation={navigation} />
                    </View>
                    // <TasksProvider user={user} projectPartition={projectPartition}>
                    //   <TasksView navigation={navigation} route={route} />
                    // </TasksProvider>
                  );
                }}
              </Stack.Screen>
            </Stack.Navigator>
          </View>
        </Drawer>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default EmpresaNavigator;
