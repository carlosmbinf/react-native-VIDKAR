/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useRef, useState} from 'react';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import {StatusBar, StyleSheet} from 'react-native';
import {Text,Provider as PaperProvider,} from 'react-native-paper';
import App from './App';
import Loguin from './components/loguin/Loguin';

console.log('Main.js');
class MyApp extends React.Component {
  //   componentDidMount() {
  //     Orientation.lockToPortrait();
  //   }

  //   componentWillUnmount() {
  //     Orientation.unlockAllOrientations();
  //   }
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (Meteor.userId()) {
      Meteor.subscribe('userId', Meteor.userId());
    }
  }

  render() {
    const {user,ready} = this.props;
    //  console.log("DATA:" + JSON.stringify(myTodoTasks));


    return (
      <PaperProvider>
        { ready && user ? (
          <>
           <StatusBar
              translucent={true}
              backgroundColor={'transparent'}
              barStyle={true ? 'light-content' : 'dark-content'}
            />
            <App />
            </>
        ) : (
          <>
            <StatusBar
              translucent={true}
              backgroundColor={'transparent'}
              barStyle={true ? 'light-content' : 'dark-content'}
            />
            <Loguin />
          </>
        )}
      </PaperProvider>
    );
  }
}
const ServerList = withTracker(navigation => {
  //  console.log(user.user)
  user = Meteor.user();
  const ready = Meteor.userId() && Meteor.subscribe('user', Meteor.userId()).ready();
  //  console.log(myTodoTasks);
  return {
    user,
    ready
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff'},
  head: {height: 40, backgroundColor: '#f1f8ff'},
  text: {margin: 6},
});

export default ServerList;
