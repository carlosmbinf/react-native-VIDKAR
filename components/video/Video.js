import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {View, ScrollView, Text, Dimensions, StyleSheet} from 'react-native';
import Header from 'react-native-custom-header';
import Video, {TextTrackType} from 'react-native-video';
// Meteor.connect('ws://10.0.2.2:3000/websocket');
// const Todos = new Mongo.Collection('pelisRegister');
import Modal from 'react-native-modal';

import Orientation from 'react-native-orientation';
var {width: screenWidth} = Dimensions.get('window');
var {height: screenHeight} = Dimensions.get('window');
class Player extends React.Component {
  componentDidMount() {
    Orientation.lockToLandscape();
    screenWidth = Dimensions.get('window').width;
    screenHeight = Dimensions.get('window').height;
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }

  constructor(props) {
    super(props);
    this.state = {
      paused: false,
      isModalVisible: false,
    };
  }
  render() {
    const {item} = this.props;

    const hideShowpaused = () => {
      this.setState({paused: true, isModalVisible: true});
    };
    // console.log(item);
    return (
      <View style={styles.ViewVideo}>
        <Modal
          // animationType='fade'
          style={{width: '100%', margin: 0}}
          isVisible={this.state.isModalVisible}
          onSwipeComplete={() => this.state.is(false)}
          // swipeDirection="down"
          coverScreen={true}
          transparent={true}
          customBackdrop={
            <View
              onTouchEnd={() => {
                this.setState({paused: false, isModalVisible: false});
              }}
              style={{backgroundColor: 'black', flex: 1, width: '100%'}}>
              <Text>Hola</Text>
            </View>
          }></Modal>
        <Video
          // onTouchStart={hideShowpaused}
          // playInBackground
          controls={true}
          fullscreen={true}
          fullscreenOrientation="all"
          // source={require('./2_5330455701720403144.mp4')}
          // source={{uri: 'http://192.168.43.230/Aquaman.2018.HDRip.AC3.X264-CMRG.mkv'}} // Can be a URL or a local file.
          source={{uri: item.urlPeli}} // Can be a URL or a local file.
          ref={ref => {
            this.player = ref;
          }} // Store reference
          onBuffer={this.onBuffer} // Callback when remote video is buffering
          onError={this.videoError} // Callback when video cannot be loaded
          style={styles.backgroundVideo}
          bufferConfig={{
            minBufferMs: 1000,
            maxBufferMs: 5000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          resizeMode="contain"
          maxBitRate={500000} // 1 megabits
          paused={this.state.paused}
          pictureInPicture
          poster={item.urlBackground}
          textTracks={[
            {
              title: "English CC",
              language: 'en',
              type: TextTrackType.VTT, // "text/vtt"
              uri: 'https://srv5119-206152.vps.etecsa.cu/' + item.subtitulo, // ...or implement something along the lines of require(file)
              // uri: 'http://192.168.43.230/Aquaman.2018.HDRip.AC3.X264-CMRG.srt', // ...or implement something along the lines of require(file)
            },
          ]}
          selectedTextTrack={{type: 'title', value: "English CC"}}
        />
      </View>
    );
  }
}

export default Player;

var styles = StyleSheet.create({
  ViewVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  backgroundVideo: {
    width:'100%',
    height:'100%',
    // position: 'absolute',
    // top: 0,
    // left: 0,
    // bottom: 0,
    // right: 0,
    // height: 140,
    // width: '100%'
    // borderRadius: 10,
    backgroundColor: 'black',
  },
});
