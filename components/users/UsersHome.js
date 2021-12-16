/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useRef, useEffect, useState} from 'react';
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
} from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
// import Header from 'react-native-custom-header';

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
  Button,
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
import Orientation from 'react-native-orientation';

import {Online} from '../collections/collections'

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');

// Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  componentDidMount() {
    
    Orientation.unlockAllOrientations();
  }

  componentWillUnmount() {
    // Orientation.unlockAllOrientations();
    Orientation.lockToPortrait();
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
      activeBanner: false
    };
    // console.log(this.props.myTodoTasks);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [textSearch, setTextSearch] = useState("");
    // const carouselRef = useRef(null);
  }
  render() {
    const {loading, navigation,myTodoTasks} = this.props;
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
          onPress: () => this.setState({ activeBanner: false})
        }]}
        style={{alignItems: 'center',
        justifyContent: 'center',margin:0}}
      >
        <View
        style={{
          flexDirection: 'column',
          backgroundColor: '',
          // padding: 10,
          alignItems: 'center',
          justifyContent: 'center',
          width: screenWidth-40,
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
            backgroundColor: '',
            width:'100%',
            padding: 10,
            height: 45,
          }}
          textStyle={{color: '#000'}}
        />
      </View>
      </Banner>
      
    );

    const Item = item => {
      Meteor.subscribe('conexiones',item._id);
      let connected = Online.find({ userId: item._id }).count() > 0 ? true : false;
      
      return (
        Meteor.user() && (
          <Surface style={{ elevation: 12, margin: 10, borderRadius: 20 }}>
            <List.Item
              key={item._id}
              onPress={() => {
                // Alert.alert('Holaaa', item);
                // console.log(navigation);
                navigation.navigation.navigate('User', { item });
              }}
              title={item && (item.profile.firstName + ' ' + item.profile.lastName)}
              //  titleStyle={{fontSize: 20}}
              description={
                item.megasGastadosinBytes
                  ? `(${item.username})${connected ? ` ● (${Online.find({ userId: item._id }).count()})` : ""}\n${Number.parseFloat(item.megasGastadosinBytes / 1000000).toFixed(2)} MB => ${Number.parseFloat(item.megas).toFixed(0)} MB`
                  : `(${item.username})`
                //  + "\nConexiones: "+(connected?connected:0)
              }
              left={props =>
                item.services && item.services.facebook ? (
                  <View style={{ justifyContent: 'center' }}>
                    <Badge
                      size={20}
                      style={{
                        position: 'absolute',
                        bottom: 7,
                        right: 17,
                        zIndex: 1,
                        backgroundColor: '#10ff00',
                        borderColor: 'white',
                        borderWidth: 3,
                      }}
                      visible={connected}
                    />
                    <Avatar.Image
                      {...props}
                      size={50}
                      source={{ uri: item.services.facebook.picture.data.url }}
                    />
                  </View>
              ) : (
                <View style={{justifyContent: 'center'}}>
                  <Badge
                    size={20}
                    style={{
                      position: 'absolute',
                      bottom: 5,
                      right: 15,
                      zIndex: 1,
                      backgroundColor: '#10ff00',
                      borderColor: 'white',
                      borderWidth: 3,
                    }}
                    visible={connected}
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
            // right={props => (
            //   <View>
            //     {/* <Text style={(styles.data, {justifyContent: 'center'})}>
            //       <MaterialCommunityIcons
            //         name="account"
            //         // color={styles.data}
            //         //  size={25}
            //       />
            //       <Text style={{justifyContent: 'center'}}>Roles:</Text>{' '}
            //       {Meteor.user().profile.role == 'admin' ? (
            //         <Switch
            //           value={item.profile.role == 'admin'}
            //           onValueChange={() =>
            //             Meteor.users.update(item, {
            //               $set: {
            //                 'profile.role':
            //                   item.profile.role == 'admin' ? 'user' : 'admin',
            //               },
            //             })
            //           }
            //         />
            //       ) : (
            //         item.profile.role
            //       )}
            //     </Text> */}
            //     <Text style={styles.data, {justifyContent: 'center'}}>
            //       <MaterialIcons
            //         name="vpn-lock"
            //         // color={styles.data}
            //         //  size={}
            //       />
            //       <Text>Proxy:</Text>{' '}
            //       {Meteor.user().profile.role == 'admin' ? (
            //         <Switch
            //           value={!item.baneado}
            //           onValueChange={() =>
            //             Meteor.users.update(item, {
            //               $set: {
            //                 baneado: !item.baneado,
            //               },
            //             })
            //           }
            //         />
            //       ) : item.baneado ? (
            //         'Desabilitado'
            //       ) : (
            //         'Habilitado'
            //       )}
            //     </Text>
            //   </View>
            // )}
          />
          </Surface>
        )
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

    const admins = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => user && user.profile.role == "admin" && (user.username ? ((user.username).toString().includes(this.state.userName)) : false)).map(element => Item(element))
    const users = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => user && user.profile.role == "user" && (user.username ? ((user.username).toString().includes(this.state.userName)) : false)).map(element => Item(element))
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
        <Appbar style={{
          backgroundColor: '#3f51b5'
        }} >
         {/* <Appbar.Action icon="cloud-search"/> */}
          <Appbar.Action icon="account" onPress={() => navigation.navigation.navigate('CreateUsers')} />
          <Appbar.Action icon="cloud-search" onPress={() => this.setState({ activeBanner: true })} />
       </Appbar>
        {loading ? (
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

        ) : (
            <>
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
            </>
          )}

        {/* <Text>
           {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
         </Text> */}
        {/* </ScrollView> */}
      {/* // </Surface> */}
      </>
    );
  }
}
const UserHome = withTracker(navigation => {
  const handle = Meteor.subscribe('user');
  
  let myTodoTasks = Meteor.users.find(Meteor.user().username == "carlosmbinf" ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }, { sort: {  megasGastadosinBytes: -1,'profile.firstName': 1,'profile.lastName': 1 }, field:{ _id:1,username:1,megasGastadosinBytes:1,profile:1,"services.facebook":1, megas:1} }).fetch();
  // const users = Meteor.users.find(Meteor.user().username == "carlosmbinf" ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }, { sort: {  megasGastadosinBytes: -1,'profile.firstName': 1,'profile.lastName': 1 }, field:{ _id:1,username:1,megasGastadosinBytes:1,profile:1,"services.facebook":1} }).fetch()[0];
  // console.log(users);
  return {
    navigation,
    myTodoTasks,
    loading: !handle.ready(),
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
    marginBottom: Platform.select({ios: 0, android: 1}), // Prevent a random Android rendering issue
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
