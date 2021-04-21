import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {View, ScrollView, Text, Dimensions, StyleSheet, Button, Alert} from 'react-native';
import Header from 'react-native-custom-header';
import Video from 'react-native-video';
import Loguin from '../loguin/Loguin';

// Meteor.connect('ws://10.0.2.2:3000/websocket');
const Todos = new Mongo.Collection('pelisRegister');
const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');

class Prueba extends React.Component {
  constructor(props) {
    super(props);
    
  }
   logOut(){
     
    Meteor.logout((error)=>{
      Alert.alert('Error Cerrando Session')
    })
  }
  render() {
    
    const {navigation,loading, myTodoTasks} = this.props;
    // Meteor.loguin
    return (
      <View>
        
        <ScrollView>
          {/* <Header
          isGradient={false}
          colors={['#6a11cb', '#2575fc']}
          backgroundColor="#3f51b5"
          isBack={false}
          // statusBarColor="#6a11cb"
          isTranslucentStatusBar={true}
          title="VIDKAR"
          titleComponent={true}
          titleStyle={{fontSize: 20}}
          // rightButtons={rightButtons}
          height={80}
          isShowShadow={true}
        /> */}
        {Meteor.user() ? (
          <View>
            <Text>LOGUEADO</Text>
            <Button onPress={this.logOut}>Cerrar Session</Button>
          </View>
        ) : 
        <View >
            <Loguin navigation={navigation}/>
          </View>
        }
        </ScrollView>
      </View>
    );
  }
}
// const Prueba = withTracker(() => {
//   const handle = Meteor.subscribe('pelis');
//   const myTodoTasks = Todos.find({}).fetch();

//   return {
//     myTodoTasks,
//     loading: !handle.ready(),
//   };
// })(MyApp);
export default Prueba;

var styles = StyleSheet.create({
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});
