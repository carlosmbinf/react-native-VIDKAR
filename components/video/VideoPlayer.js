import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {View, ScrollView, Text, Dimensions, StyleSheet} from 'react-native';
import Header from 'react-native-custom-header';
import Player from './Video';
// import Video, {TextTrackType} from 'react-native-video';
// Meteor.connect('ws://10.0.2.2:3000/websocket');
// const Todos = new Mongo.Collection('pelisRegister');
// const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');

class VideoPlayer extends React.Component {
  render() {
    const {item} = this.props;

    return (
      <View style={styles.ViewVideo}>
        <Player item={item} />
      </View>
    );
  }
}

export default Player;

var styles = StyleSheet.create({
  ViewVideo: {
    width: '100%',
    height: screenHeight,
    // position: 'absolute',
    backgroundColor:'red',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    height: 140,
    // width: '100%'
    borderRadius: 10,
  },
});
