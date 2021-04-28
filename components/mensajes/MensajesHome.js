/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useRef, useEffect, useState} from 'react';
 // import type {Node} from 'react';
 import {Avatar,IconButton, List, Provider as PaperProvider, Text, Switch, Title, TextInput} from 'react-native-paper';
 import Carousel, {ParallaxImage} from 'react-native-snap-carousel';
 // import * as axios from 'axios';
 import Meteor, {Mongo, withTracker} from '@meteorrn/core';
 // import Header from 'react-native-custom-header';
 import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
 import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
 import Mensajes from './MensajesDetails'
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
 const MyCol = new Meteor.Collection('mensajes');
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
       isDarkMode: useColorScheme=='dark',
       data: props.myTodoTasks,
       // loading: props.loading,
       carouselRef: null,
       refreshing: false,
       text:''
     };
     // console.log(this.props.myTodoTasks);
     // const isDarkMode = useColorScheme() === 'dark';
     // const [data, setData] = ;
     // const [isLoading, setLoading] = useState(true);
     // const carouselRef = useRef(null);
   }
   render() {
     const {user,loading, navigation, myTodoTasks} = this.props;
 
     // let isDarkMode = {
     //   return (useColorScheme() === 'dark');
     // };
     const backgroundStyle = {
       backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
       minHeight: ScreenHeight,
     };
     function sendMensaje(text) {
      //  alert(text)
          MyCol.insert({'from': Meteor.userId(), 'to': user._id, 'mensaje': text})
     }
    //  console.log({user});
     return (
       <View style={{flex: 1}}>
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
               backgroundColor: '#2a323d',
               justifyContent: 'center',
             }}>
             <ActivityIndicator size="large" color="#3f51b5" />
           </View>
         ) : (
           <FlatList
             style={{backgroundColor: '#2a323d'}}
             data={myTodoTasks}
             renderItem={item => <Mensajes item={item} />}
             keyExtractor={(item, index) => item._id}
           />
         )}

         {/* <Text>
            {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
          </Text> */}
         {/* </ScrollView> */}
         {Meteor.user().profile.role == 'admin' && (
           <View style={styles.footer}>
             <TextInput
               style={{width: '80%'}}
               label="Mensaje"
               value={this.state.text}
               onChangeText={text => this.setState({text: text})}></TextInput>
             {this.state.text ? (
               <IconButton
                 icon="send-circle"
                 color="red"
                 size={40}
                 onPress={() => sendMensaje(this.state.text)}
               />
             ) : (
               <IconButton
                 icon="send-circle"
                 color="red"
                 size={40}
                 disabled
                 onPress={() => sendMensaje(this.state.text)}
               />
             )}
           </View>
         )}
       </View>
     );
   }
 }
 const MensajesHome = withTracker(user => {
  //  console.log(user.user)
   const handle = Meteor.subscribe('mensajes', user.user._id);
   const myTodoTasks = MyCol.find({'to':user.user._id}).fetch();
   return {
    user:user.user,
     myTodoTasks,
     loading: !handle.ready(),
   };
 })(MyApp);
 
 var ScreenHeight = Dimensions.get('window').height;
 const styles = StyleSheet.create({
   data:{
     
   },
   footer:{
    //  position:'absolute',
     bottom:0,
     left:0,
     right:0,
     height:70,
     backgroundColor:'black',
    //  padding:5,
    //  flex: 1,
    flexDirection: 'row',
    // flexWrap: 'wrap',
   }
 });
 
 export default MensajesHome;
 