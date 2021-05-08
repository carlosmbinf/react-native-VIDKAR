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
} from 'react-native-paper';
import Carousel, {ParallaxImage} from 'react-native-snap-carousel';
// import * as axios from 'axios';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
// import Header from 'react-native-custom-header';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const {width: screenWidth} = Dimensions.get('window');
const MyCol = new Meteor.Collection('online');
// Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  componentDidMount() {
    Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }
  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = MyCol.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.state = {
      count: 0,
      isDarkMode: useColorScheme == 'dark',
      data: props.myTodoTasks,
      // loading: props.loading,
      carouselRef: null,
      refreshing: false,
    };
    // console.log(this.props.myTodoTasks);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [isLoading, setLoading] = useState(true);
    // const carouselRef = useRef(null);
  }
  render() {
    const {loading, navigation, myTodoTasks} = this.props;

    // let isDarkMode = {
    //   return (useColorScheme() === 'dark');
    // };
    const backgroundStyle = {
      backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: ScreenHeight,
    };

    const onRefresh = () => {
      this.setState({
        // refreshing: false,
        data: myTodoTasks,
      });
      // console.log(this.props.myTodoTasks);

      // this.state.navigation.navigate('Home')
      // this.setState({
      //   data:
      // })
    };
    const Item = item => {
      let connected =
      MyCol.find({userId: item._id}).count() > 0 ? true : false;
     return (
       Meteor.user() && (
         <List.Item
           onPress={() => {
             // Alert.alert('Holaaa', item);
             navigation.navigationGeneral.navigate('User', {item});
           }}
           title={item.profile.firstName + ' ' + item.profile.lastName}
           titleStyle={{fontSize: 20}}
           description={
            item.megasGastadosinBytes?
             item.profile.role + ' - ' + Number.parseFloat(item.megasGastadosinBytes / 1000000).toFixed(2) + ' MB'
             :
             item.profile.role
           }
           left={props =>
             item.services.facebook ? (
               <View>
                 <Badge
                 size={15}

                   style={{
                     position: 'absolute',
                     bottom: 10,
                     right: 15,
                     zIndex: 1,
                     backgroundColor: '#10ff00',
                   }}
                   visible={connected}
                 />
                 <Avatar.Image
                   {...props}
                   size={55}
                   source={{uri: item.services.facebook.picture.data.url}}
                 />
               </View>
             ) : (
               <View>
                 <Badge
                 size={15}
                   style={{
                     position: 'absolute',
                     bottom: 5,
                     right: 15,
                     zIndex: 1,
                     backgroundColor: '#10ff00',
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
           right={props => (
             <View>
               <Text style={styles.data}>
                 <MaterialCommunityIcons
                   name="account"
                   // color={styles.data}
                   size={35}
                 />
                 <Text style={{fontSize: 20}}>Roles:</Text>{' '}
                 {Meteor.user().profile.role == 'admin' ? (
                   <Switch
                     value={item.profile.role == 'admin'}
                     onValueChange={() =>
                       Meteor.users.update(item._id, {
                         $set: {
                           'profile.role':
                             item.profile.role == 'admin' ? 'user' : 'admin',
                         },
                       })
                     }
                   />
                 ) : (
                   item.profile.role
                 )}
               </Text>
               <Text style={styles.data}>
                 <MaterialIcons
                   name="vpn-lock"
                   // color={styles.data}
                   size={35}
                 />
                 <Text style={{fontSize: 20}}>Proxy:</Text>{' '}
                 {Meteor.user().profile.role == 'admin' ? (
                   <Switch
                     value={!item.baneado}
                     onValueChange={() =>
                       Meteor.users.update(item._id, {
                         $set: {
                           baneado: !item.baneado,
                         },
                       })
                     }
                   />
                 ) : item.baneado ? (
                   'Desabilitado'
                 ) : (
                   'Habilitado'
                 )}
               </Text>
             </View>
           )}
         />
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
    return (
      <Surface style={{flex: 1}}>
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
        ) : (
          <FlatList
            // style={{backgroundColor: '#2a323d'}}
            data={Meteor.users.find({}).fetch()}
            renderItem={({item}) => Item(item)}
            keyExtractor={(item, index) => item._id}
          />
        )}

        {/* <Text>
           {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
         </Text> */}
        {/* </ScrollView> */}
      </Surface>
    );
  }
}
const UserHome = withTracker(navigation => {
  Meteor.subscribe("conexiones");
  const handle = Meteor.subscribe('user');
 
  const myTodoTasks = Meteor.users.find({}).fetch();
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
