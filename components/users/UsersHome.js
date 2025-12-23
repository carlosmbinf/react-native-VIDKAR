/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import {
  Avatar,
  List,
  Provider as PaperProvider,
  Text,
  Surface,
  Badge,
  Appbar,
  Banner,
  IconButton,
  ActivityIndicator
} from 'react-native-paper';
import Meteor, { withTracker } from '@meteorrn/core';

import Drawer from 'react-native-drawer'

import {
  StyleSheet,
  useColorScheme,
  View,
  Dimensions,
  Platform,
  Alert,
  TextInput,
  StatusBar,
} from 'react-native';

import { Online } from '../collections/collections'
import DrawerOptionsAlls from '../drawer/DrawerOptionsAlls';
import { useSafeAreaInsets, withSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../Header/MenuHeader';
import { ScrollView } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

class MyApp extends React.Component {
  componentDidMount() {
  }

  componentWillUnmount() {
  }
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
      isDarkMode: useColorScheme == 'dark',
      data: this.props.myTodoTasks,
      carouselRef: null,
      refreshing: false,
      userName: "",
      firstName: "",
      activeBanner: false,
      drawer: false
    };
    !Meteor.userId() && navigation.navigation.navigate("Loguin")
  }
  render() {
    const { loading, navigation, myTodoTasks,isConnectedProxyOrWeb, insets } = this.props;
    const backgroundStyle = {
      minHeight: (ScreenHeight),
    };
    function filterUsers(user) {
      return user.username == this.state.userName
    }

    const renderFilter = () => (
      <Banner
        visible={this.state.activeBanner}
        actions={[{
          label: "Ocultar Filtro",
          onPress: () => this.setState({ activeBanner: false })
        }]}
        style={{
          alignItems: 'center',
          justifyContent: 'center', margin: 0
        }}
      >
        <View
          style={{
            flexDirection: 'column',
            backgroundColor: '',
            alignItems: 'center',
            justifyContent: 'center',
            width: screenWidth - 40,
          }}>

          <TextInput
            autoFocus={true}
            focusable={true}
            value={this.state.userName}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={textSearch => {
              this.setState({
                userName: textSearch,
                firstName: '',
              });
            }}
            status="info"
            placeholder="Buscar por usuario"
            style={{
              borderRadius: 30,
              borderColor: 'black',
              borderWidth: 1,
              // backgroundColor: '',
              width: '100%',
              padding: 10,
              height: 45,
            }}
            textStyle={{ color: '#000' }}
          />
        </View>
      </Banner>

    );

    const Item = item => {
      let descripcion = <View>
      <Text style={{fontWeight:'bold'}}>{item.username}</Text>
      <Text>VPN:     {item.vpnMbGastados ? (item.vpnMbGastados / 1024000000).toFixed(2) : 0}GB = {item.vpnMbGastados ? (item.vpnMbGastados / 1024000).toFixed(2) : 0} MB</Text>
      <Text>PROXY: {item.megasGastadosinBytes ? (item.megasGastadosinBytes / 1024000000).toFixed(2) : 0}GB = {item.megasGastadosinBytes ? (item.megasGastadosinBytes / 1024000).toFixed(2) : 0} MB</Text>
    </View>
      return (
        <Surface
          key={'Surface_' + item._id}
          style={{elevation: 12, margin: 10, borderRadius: 10}}>
          <List.Item
            borderless={false}
            key={'Item_' + item._id}
            onPress={() => {
              navigation.navigation.navigate('User', {item: item._id});
            }}
            title={item && item.profile.firstName + ' ' + item.profile.lastName}
            description={descripcion}
            left={props =>
              item && item.picture ? (
                <View style={{justifyContent: 'center'}}>
                  <Badge
                    size={20}
                    style={{
                      position: 'absolute',
                      bottom: '20%',
                      right: 17,
                      zIndex: 1,
                      backgroundColor:
                      isConnectedProxyOrWeb &&
                      isConnectedProxyOrWeb.length > 0 &&
                      isConnectedProxyOrWeb.filter(
                        online => online.userId && online.userId == item._id,
                      ).length > 0
                        ? isConnectedProxyOrWeb.filter(
                            online =>
                              online.userId &&
                              online.userId == item._id &&
                              online.hostname != null,
                          ).length > 0
                          ? '#10ffE0'
                          : '#102dff'
                        : item.vpnplusConnected || item.vpn2mbConnected
                        ? '#10ff00'
                        : null,
                      borderColor: 'white',
                      borderWidth: 3,
                    }}
                    visible={
                      item.vpnplusConnected ||
                      item.vpn2mbConnected ||
                      (isConnectedProxyOrWeb &&
                        isConnectedProxyOrWeb.length > 0 &&
                        isConnectedProxyOrWeb.filter(
                          online => online.userId && online.userId == item._id,
                        ).length > 0)
                        ? true
                        : false
                      // connected
                    }
                  />
                  <Avatar.Image
                    {...props}
                    size={50}
                    source={{uri: item.picture}}
                  />
                </View>
              ) : (
                <View style={{justifyContent: 'center'}}>
                  <Badge
                    size={20}
                    style={{
                      position: 'absolute',
                      bottom: '20%',
                      right: 17,
                      zIndex: 1,
                      backgroundColor:
                        isConnectedProxyOrWeb &&
                        isConnectedProxyOrWeb.length > 0 &&
                        isConnectedProxyOrWeb.filter(
                          online => online.userId && online.userId == item._id,
                        ).length > 0
                          ? isConnectedProxyOrWeb.filter(
                              online =>
                                online.userId &&
                                online.userId == item._id &&
                                online.hostname != null,
                            ).length > 0
                            ? '#10ffE0'
                            : '#102dff'
                          : item.vpnplusConnected || item.vpn2mbConnected
                          ? '#10ff00'
                          : null,
                      borderColor: 'white',
                      borderWidth: 3,
                    }}
                    visible={
                      item.vpnplusConnected ||
                      item.vpn2mbConnected ||
                      (isConnectedProxyOrWeb &&
                        isConnectedProxyOrWeb.length > 0 &&
                        isConnectedProxyOrWeb.filter(
                          online => online.userId && online.userId == item._id,
                        ).length > 0)
                        ? true
                        : false
                      // connected
                    }
                  />
                  <Avatar.Text
                    {...props}
                    size={50}
                    label={
                      item.profile.firstName.toString().slice(0, 1) +
                      item.profile.lastName.toString().slice(0, 1)
                    }
                  />
                </View>
              )
            }
            // right={props => ()}
            right={props => {
              return (
                <View style={{justifyContent: 'center'}}>
                  {item.idtelegram && (
                    <IconButton
                      loading={true}
                      icon={
                        item.notificarByTelegram
                          ? 'cellphone-message'
                          : 'cellphone-message-off'
                      }
                      // disabled={this.state.valuevpn ? false : true}
                      color={item.notificarByTelegram ? 'black' : 'red'}
                      mode="contained"
                      size={30}
                      onPress={() => {
                        Meteor.call(
                          'changeNotificacionTelegram',
                          item._id,
                          (error, result) => {
                            error && alert(error.message);
                          },
                        );
                      }}
                    />
                  )}
                </View>
              );
            }}
          />
        </Surface>
      );
    };


    const admins = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => {
      if (!user || !user.profile || user.profile.role !== "admin") return false;
      
      const searchTerm = this.state.userName.toLowerCase().trim();
      if (!searchTerm) return true; // Si no hay término de búsqueda, mostrar todos
      
      const username = user.username ? user.username.toLowerCase() : "";
      const firstName = user.profile?.firstName ? user.profile.firstName.toLowerCase() : "";
      const lastName = user.profile?.lastName ? user.profile.lastName.toLowerCase() : "";
      
      return username.includes(searchTerm) || 
             firstName.includes(searchTerm) || 
             lastName.includes(searchTerm);
    }).map(element => Item(element))
    const users = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => {
      if (!user || !user.profile || user.profile.role !== "user") return false;
      
      const searchTerm = this.state.userName.toLowerCase().trim();
      if (!searchTerm) return true; // Si no hay término de búsqueda, mostrar todos
      
      const username = user.username ? user.username.toLowerCase() : "";
      const firstName = user.profile?.firstName ? user.profile.firstName.toLowerCase() : "";
      const lastName = user.profile?.lastName ? user.profile.lastName.toLowerCase() : "";
      
      return username.includes(searchTerm) || 
             firstName.includes(searchTerm) || 
             lastName.includes(searchTerm);
    }).map(element => Item(element))

    const drawerStyles = {
      drawer: { shadowColor: 'black', shadowOpacity: 0, shadowRadius: 3 },
      main: { paddingLeft: 0 },
    }
    return (
      <>
        {loading ? (
          <>
            <Surface style={backgroundStyle}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  height: '100%',
                  // backgroundColor: '#2a323d',
                  justifyContent: 'center',
                }}>
                <ActivityIndicator size="large" color="#3f51b5" />
              </View>
            </Surface>
          </>
        ) : (
          Meteor.user() && Meteor.user().profile && Meteor.user().profile.role == "admin" ? (
            <>
              <Drawer
                type="overlay"
                open={this.state.drawer}
                content={<DrawerOptionsAlls navigation={navigation} />}
                tapToClose={true}
                // captureGestures="closed"
                // acceptPanOnDrawer={false}
                // acceptPan={true}
                onClose={() => this.setState({ drawer: false })}
                elevation={12}
                side="left"
                openDrawerOffset={0.2} // 20% gap on the right side of drawer
                panCloseMask={0.2}
                closedDrawerOffset={0}
                styles={drawerStyles}
                tweenHandler={(ratio) => ({
                  main: { opacity: ((2 - ratio) / 2) }
                })}
              >

                  <Appbar style={{ backgroundColor: '#3f51b5', height: insets.top + 50, justifyContent: 'center', paddingTop: insets.top  }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>

                      <View style={{ flexDirection: "row" }}>
                        <Appbar.BackAction
                          color='red'
                          onPress={() => {
                            if (navigation.navigation.canGoBack()) {
                              navigation.navigation.goBack();
                            }
                          }}
                        />
                        <Appbar.Action icon="menu" color={"white"} onPress={() => this.setState({ drawer: !this.state.drawer })} />

                      </View>
                      <View style={{ flexDirection: "row" }}>
                        <Appbar.Action icon="magnify" color={"white"} disabled={this.state.activeBanner} onPress={() => this.setState({ activeBanner: true })} />

                        <MenuHeader
                          navigation={navigation}
                        />
                      </View>
                    </View>
                  </Appbar>
                <Surface>
                  {renderFilter()}
                </Surface>

                <ScrollView >
                  <Surface style={backgroundStyle}>
                    <List.Accordion
                      title="Administradores"
                    >
                      {admins()}
                    </List.Accordion>
                    <List.Accordion
                      title="Usuarios">
                      {users()}
                    </List.Accordion>
                  </Surface>
                </ScrollView>
              </Drawer>

            </>
          ) : <Surface style={backgroundStyle}><Text style={{ textAlign: "center", justifyContent: "center", fontSize: 25, fontWeight: 'bold', paddingTop: 10 }}>Sin Acceso</Text></Surface>
        )}

      </>
    );
  }
}
const UserHome = withTracker(navigation => {
  const handle = Meteor.subscribe('user', ((Meteor.user() && Meteor.user().username == "carlosmbinf") ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }), { fields: { username: 1, profile: 1, picture: 1, vpnMbGastados: 1, megasGastadosinBytes: 1, idtelegram: 1,notificarByTelegram:1,vpnplusConnected:1,vpn2mbConnected:1 } });
  const handleOnline =  Meteor.subscribe("conexiones",{},{fields:{userId:1,hostname:1}})
  let myTodoTasks = Meteor.users.find(((Meteor.user() && Meteor.user().username == "carlosmbinf") ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }), { sort: { "vpnMbGastados": -1, "megasGastadosinBytes": -1, 'profile.firstName': 1, 'profile.lastName': 1 }, fields: { username: 1, profile: 1, picture: 1, vpnMbGastados: 1, megasGastadosinBytes: 1, idtelegram: 1 , notificarByTelegram:1,vpnplusConnected:1,vpn2mbConnected:1} }).fetch();

  let isConnectedProxyOrWeb = Online.find({},{fields:{userId:1,hostname:1}}).fetch()
  
  return {
    navigation,
    myTodoTasks,
    loading: !handle.ready() && !handleOnline.ready(),
    isConnectedProxyOrWeb
  };
})(withSafeAreaInsets(MyApp));

var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container2: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    marginHorizontal: 16,
  },
  item2: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
  },
  header: {
    fontSize: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    height: ScreenHeight,
    backgroundColor: '#2a323d',
  },
  viewFullHeight: {
    minHeight: ScreenHeight,
  },
  item: {
    width: screenWidth - 60,
    height: screenWidth - 60,
  },
  imageContainer: {
    flex: 1,
    marginBottom: Platform.select({ ios: 0, android: 1 }), // Prevent a random Android rendering issue
    backgroundColor: 'white',
    borderRadius: 8,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  data: {},
});

export default UserHome;
