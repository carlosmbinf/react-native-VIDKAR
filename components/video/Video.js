import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import React, {useEffect} from 'react';
import {View, ScrollView, Text, Dimensions, StyleSheet} from 'react-native';
import Header from 'react-native-custom-header';
import Video, {TextTrackType} from 'react-native-video';
// Meteor.connect('ws://10.0.2.2:3000/websocket');
// const Todos = new Mongo.Collection('pelisRegister');
import useSubtitles from 'react-subtitles'
import Modal from 'react-native-modal';
import Subtitles from 'react-native-subtitles'
import Orientation from 'react-native-orientation';
import VideoPlayer from 'react-native-video-controls-subtitle';
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
    var { default: srtParser2 } = require("srt-parser-2")
    var parser = new srtParser2()
    var srt = `
1
00:00:11,544 --> 00:00:12,682
Hello
`

    this.state = {
      paused: false,
      isModalVisible: false,
      progress: 0,
    duration: 0,
    subtitle : parser.fromSrt(srt)
    };
  }

  onProgressPress = (e) => {
    const position = e.nativeEvent.locationX;
    const progress = (position / 250) * this.state.duration;
    this.player.seek(progress);
    console.log(progress);
}

onMainButtonPress = () => {
    if(this.state.progress >= 1) {
        this.player.seek(0);
    };
    this.setState(state => {
        return {
            paused: !state.paused
        }
    })
}

  handleProgress = (progress) => {
    this.setState({
        progress: progress.currentTime
    });

}

 hideShowpaused = () => {
  this.setState({paused: true, isModalVisible: true});
};

handleLoad = (meta) => {
  this.setState({
      duration: meta.duration
  })
}

handleEnd = () => {
  this.setState({
      paused: true
  })
}

  render() {
    const {item} = this.props;
    
    console.log(this.state.result);


    return (
      <View style={styles.ViewVideo}>
        {/* <Modal
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
          }></Modal> */}
          <VideoPlayer
          style={styles.backgroundVideo}

          source={{uri: item.urlPeli}} // Can be a URL or a local file.
          navigator={ this.props.navigator }
   subtitle={this.state.subtitle}
/>
        {/* <Video
          // onTouchStart={hideShowpaused}
          
          playInBackground
          controls={true}
          fullscreen={true}
          fullscreenOrientation="all"
          // source={require('../videobackground/background.mp4')}
          // source={{uri: 'http://192.168.43.230/Aquaman.2018.HDRip.AC3.X264-CMRG.mkv'}} // Can be a URL or a local file.
          // source={"http://192.168.43.124/Fantastic.Beasts.and.Where.to.Find.Them.2016.1080p.Bluray.X264.DTS-EVO.mp4"} // Can be a URL or a local file.
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
          maxBitRate={256000} // 1 megabits
          paused={this.state.paused}
          pictureInPicture
          poster={item.urlBackground}
          // useTextureView={false}
          onLoad = {this.handleLoad}
          onProgress = {this.handleProgress}
          onEnd = {this.handleEnd}
          textTracks= { [
             {
              index: 0,
              title: "Espanol",
              language: 'es',
              type: TextTrackType.VTT, // "text/vtt"
              uri: item.subtitulo, // ...or implement something along the lines of require(file)
              // uri: "https://vidkar.ddns.net/getsubtitle?idPeli=n75bETywRZRLSiiRB", // ...or implement something along the lines of require(file)
              // uri: 'http://192.168.43.230/Aquaman.2018.HDRip.AC3.X264-CMRG.srt', // ...or implement something along the lines of require(file)
            },
            {
              index: 1,
              title: "English",
              language: 'en',
              type: TextTrackType.VTT, // "text/vtt"
              uri: item.subtitulo, // ...or implement something along the lines of require(file)
              // uri: 'http://192.168.43.230/Aquaman.2018.HDRip.AC3.X264-CMRG.srt', // ...or implement something along the lines of require(file)
            },
          ]}
          selectedTextTrack={{type: 'title', value: "Espanol"}}
          // onProgress={a => {console.log(a);}}
        /> */}
      </View>
    );
  }
}

export default Player;

var styles = StyleSheet.create({
  ViewVideo: {
    width: '100%',
    // height: '100%',
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
