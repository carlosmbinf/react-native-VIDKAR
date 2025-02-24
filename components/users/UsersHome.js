/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useRef, useEffect, useState } from 'react';
// import type {Node} from 'react';
import {
  Avatar,
  List,
  Provider as PaperProvider,
  Text,
  Switch,
  Title,
  Surface,
  Badge,
  Appbar,
  Banner,
  Divider,
  Button,
  IconButton
} from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
// import Header from 'react-native-custom-header';

import Drawer from 'react-native-drawer'

import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  VirtualizedList,
  Dimensions,
  Platform,

  RefreshControl,
  SectionList,
  TouchableHighlight,
  Alert,
  TextInput,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
// import PelisCard from './PelisCard';
// import Loguin from '../loguin/Loguin';

import { Online } from '../collections/collections'
import DrawerOptionsAlls from '../drawer/DrawerOptionsAlls';

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

// Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  componentDidMount() {
  }

  componentWillUnmount() {
  }
  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = Online.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.state = {
      count: 0,
      isDarkMode: useColorScheme == 'dark',
      data: this.props.myTodoTasks,
      // loading: props.loading,
      carouselRef: null,
      refreshing: false,
      userName: "",
      firstName: "",
      activeBanner: false,
      drawer: false
    };
    // console.log(this.props.myTodoTasks);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [textSearch, setTextSearch] = useState("");
    // const carouselRef = useRef(null);
    !Meteor.userId() && navigation.navigation.navigate("Loguin")
  }
  render() {
    const { loading, navigation, myTodoTasks,isConnectedProxyOrWeb } = this.props;
    // let isDarkMode = {
    //   return (useColorScheme() === 'dark');
    // };
    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: (ScreenHeight - 80),
    };

    // const onRefresh = () => {
    //   this.setState({
    //     // refreshing: false,
    //     data: myTodoTasks,
    //   });
    // console.log(this.props.myTodoTasks);

    // this.state.navigation.navigate('Home')
    // this.setState({
    //   data:
    // })
    // };
    function searchUser(user) {
      return user.profile.firstName == textSearch;
      // this.state.textSearch || user.profile.lastName == this.state.textSearch || user.username == this.state.textSearch;
    }

    function filterUsers(user) {
      // console.log(this.state.userName);
      return user.username == this.state.userName
      // return user?(user.username.include(this.state.userName) ):true ;
    }
    // const backgroundStyle = {
    //   // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
    //   height: screenHeight,
    //   // backgroundColor:'red'
    // };

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
            // padding: 10,
            alignItems: 'center',
            justifyContent: 'center',
            width: screenWidth - 40,
          }}>
          {/* <TextInput
          value={this.state.firstName}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={textSearch => {
            this.setState({
              userName: '',
              firstName: textSearch,
              // data: myTodoTasks
                // .find(
                //   textSearch
                //     ? {
                //         'profile.firstName': {
                //           $regex: this.state.firstName,
                //           $options: 'g',
                //         },
                //       }
                //     : {},
                //   textSearch
                //     ? {sort: {'profile.firstName': 1, 'profile.lastName': 1}}
                //     : {sort: {megasGastadosinBytes: -1}},
                // )
                // .fetch()
            });
          }}
          status="info"
          placeholder="Buscar por Nombre"
          style={{
            borderRadius: 30,
            borderColor: 'black',
            borderWidth: 1,
            backgroundColor: '',
            // width:'100%',
            padding: 10,
            marginRight: 10,
            height: 35,
          }}
          textStyle={{color: '#000'}}
        /> */}

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
                // data: myTodoTasks
                // .find(
                //   textSearch
                //     ? {
                //         username: {
                //           $regex: this.state.userName,
                //           $options: 'g',
                //         },
                //       }
                //     : {},
                //   textSearch
                //     ? {sort: {'profile.firstName': 1, 'profile.lastName': 1}}
                //     : {sort: {megasGastadosinBytes: -1}},
                // )
                // .fetch()
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
      // Meteor.subscribe('conexiones', { userId: item._id }, { fields: { userId: 1 } });
      // let connected = Online.find({ userId: item._id },{ fields: { userId: 1 }, limit: 1 }).count() > 0 ? true : false;

      //concatenar username con vpn megas gastados y megas consumidos
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
              // Alert.alert('Holaaa', item);
              // console.log(navigation);
              navigation.navigation.navigate('User', {item: item._id});
            }}
            // onLongPress={() => {
            //   Alert.alert('Holaaa', descripcion);
            //   // console.log(navigation);
            //   // navigation.navigation.navigate('User', { item: item._id });
            // }}
            title={item && item.profile.firstName + ' ' + item.profile.lastName}
            //  titleStyle={{fontSize: 20}}
            onMagicTap={() => {
              Alert.alert('Holaaa', item.username);
              // console.log(navigation);
              // navigation.navigation.navigate('User', { item: item._id });
            }}
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


    //     <TouchableHighlight
    //       onPress={() => {
    //         // Alert.alert('Holaaa', item.username);
    //         navigation.navigationGeneral.navigate('User',{item});
    //       }}>
    //       <View style={styles.item2}>
    //         <Text style={styles.title}>Nombre: {item.profile.firstName}</Text>
    //         <Text style={styles.title}>Apellidos: {item.profile.lastName}</Text>
    //         <Text style={styles.title}>Nombre de Usuario: {item.username}</Text>
    //       </View>
    //     </TouchableHighlight>

    const admins = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => user && user.profile && user.profile.role == "admin" && (user.username ? ((user.username).toString().includes(this.state.userName)) : false)).map(element => Item(element))
    const users = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => user && user.profile && user.profile.role == "user" && (user.username ? ((user.username).toString().includes(this.state.userName)) : false)).map(element => Item(element))

    const drawerStyles = {
      drawer: { shadowColor: 'black', shadowOpacity: 0, shadowRadius: 3, backgroundColor: "black" },
      main: { paddingLeft: 0 },
    }

    return (
      <>
        {/* // <Surface style={{flex: 1}}> */}
        {/* <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={backgroundStyle}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={onRefresh}
            />
          }> */}

        {loading ? (
          <>
            <Surface style={backgroundStyle}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  height: ScreenHeight,
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
                openDrawerOffset={0.5} // 20% gap on the right side of drawer
                panCloseMask={0.5}
                closedDrawerOffset={0}
                styles={drawerStyles}
                tweenHandler={(ratio) => ({
                  main: { opacity: ((2 - ratio) / 2) }
                })}
              >
                <Appbar style={{
                  backgroundColor: '#3f51b5'
                }} >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                    <Appbar.Action icon="menu" color={"white"} onPress={() => this.setState({ drawer: !this.state.drawer })} />
                    <View style={{ flexDirection: "row" }}>
                      {/* <Appbar.Action icon="account-plus" color={"white"} onPress={() => navigation.navigation.navigate('CreateUsers')} /> */}
                      <Appbar.Action icon="magnify" color={"white"} disabled={this.state.activeBanner} onPress={() => this.setState({ activeBanner: true })} />
                    </View>
                  </View>
                </Appbar>
                <Surface>
                  {renderFilter()}
                </Surface>

                < ScrollView >
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
  
  // handle.ready() && console.log(Meteor.users.find(Meteor.user().username == "carlosmbinf" ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }, { sort: {  megasGastadosinBytes: -1,'profile.firstName': 1,'profile.lastName': 1 }, fields:{username:1,megasGastadosinBytes:1,profile:1,"services.facebook":1, megas:1} }).fetch());
  return {
    navigation,
    myTodoTasks,
    loading: !handle.ready() && !handleOnline.ready(),
    isConnectedProxyOrWeb
  };
})(MyApp);

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
