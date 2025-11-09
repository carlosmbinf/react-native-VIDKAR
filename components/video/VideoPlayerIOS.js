import React, {useRef, useState, useEffect} from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Platform,
} from 'react-native';
import Video, { TextTrackType } from 'react-native-video';
import {
  Button,
  Card,
  Dialog,
  Modal,
  Portal,
  RadioButton,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player';
export const VideoPlayerIOS = ({navigation, route, ocultarControles}) => {
  const {subtitulo,id} = route.params;
  // const subtitulo = "https://vidkar.ddns.net/getsubtitle?idPeli=" + id;
  const urlVideo = route.params.urlPeliHTTPS || route.params.urlVideo;
  const [isModalAudioVisible, setModalAudioVisible] = useState(false);
  const [isModalSubtitleVisible, setModalSubtitleVisible] = useState(false);
  const [isControlVisible, setControlVisible] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  const [textTracks, setTextTracks] = useState([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(2);
  const [selectedTextTrack, setSelectedTextTrack] = useState(2);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentTimeHora, setCurrentTimeHora] = useState(0);
  const [currentTimeMin, setCurrentTimeMin] = useState(0);
  const [currentTimeSeg, setCurrentTimeSeg] = useState(0);
  const [duration, setDuration] = useState(0);

  const [focusSubtitle, setFocusSubtitle] = useState(false);
  const [focusPlayPause, setFocusPlayPause] = useState(false);
  const [focusAudio, setFocusAudio] = useState(false);
  const [focusSlider, setFocusSlider] = useState(false);
  const [focusAudioSelect, setFocusAudioSelect] = useState(false);
  const [focusSubtituloSelect, setFocusSubtituloSelect] = useState(false);

  const videoRef = useRef(null);
  const controlVisibilityTimeout = useRef(null);

  useEffect(() => {
    const backAction = () => {
      if (isModalAudioVisible) {
        setModalAudioVisible(false);
      } else if (isModalSubtitleVisible) {
        setModalSubtitleVisible(false);
      } else if (isControlVisible) {
        setControlVisible(false);
      } else {
        navigation.goBack();
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      backHandler.remove();
      if (controlVisibilityTimeout.current) {
        clearTimeout(controlVisibilityTimeout.current);
      }
    };
  }, [
    isControlVisible,
    isModalAudioVisible,
    isModalSubtitleVisible,
    navigation,
  ]);

  useEffect(() => {
    if (focusSlider) {
        
        // console.log("videoRef.current", videoRef.current.seek)
        // console.log("videoRef.current", currentTime/duration)
        // videoRef.current.seek(Number((Math.floor(currentTime) / duration).toFixed(17)));
        
    }

    // console.log("videoRef.current", videoRef.current._reactInternals.memoizedProps)
  }, [currentTime]);

  useEffect(() => {
    if (focusPlayPause) {
      setFocusAudio(false);
      setFocusSubtitle(false);
    } else if (focusAudio) {
      setFocusPlayPause(false);
      setFocusSubtitle(false);
    } else if (focusSubtitle) {
      setFocusPlayPause(false);
      setFocusAudio(false);
    }
  }, [focusAudio, focusPlayPause, focusSubtitle]);

  const onError = ({error}) => {
    // console.log("option",option);
    Alert.alert('Error', error);
    console.log(error);
  };

  const toggleModalAudio = () => {
    setModalAudioVisible(!isModalAudioVisible);
  };
  const toggleModalSubtitle = () => {
    setModalSubtitleVisible(!isModalSubtitleVisible);
  };

  const togglePause = () => {
    setPaused(!paused);
  };

  const onLoad = data => {
    setAudioTracks(data.audioTracks);
    console.log('idPeli ', id);
    Meteor.call('addVistas', id, (error, result) => {
      if (error) {
        console.log('error', error);
      } else {
        console.log('result', result);
      }
    });

    console.log(data);
    // data.textTracks &&
    // //agregar subtitulo a textTracks
    //   data.textTracks && data.textTracks.push({
    //   id: data.textTracks.length+1,
    //   name: 'Spanish VidKar',
    //   language: 'es',
    //   type: TextTrackType.SUBRIP,
    //   uri: subtitulo,
    // });
    data.textTracks
    setTextTracks(data.textTracks);
    setDuration(data.duration);
  };

  const onProgress =data => {
    if (!focusSlider) {
    // console.log('data', data);
     setCurrentTime(data.currentTime);
    //  await setPosition(data.currentTime/data.duration);
    }
  };

  const onSeek = time => {
    console.log('time', Math.floor(time)/duration);  
    setCurrentTime(time);
  };

  const toggleControls = () => {
      setControlVisible(isControlVisible => !isControlVisible);
      if (controlVisibilityTimeout.current) {
        clearTimeout(controlVisibilityTimeout.current);
      }
      controlVisibilityTimeout.current = setTimeout(() => {
        setControlVisible(false);
      }, 5000); // Ocultar controles después de 5 segundos de inactividad
    
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleControls}
        touchSoundDisabled={true}
        activeOpacity={1}
        //estilo para que no se vea el foco en el video
        style={{
          borderWidth: 0,
          borderColor: 'transparent',
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
        }}>
        {/* <VLCPlayer
            // showGG={true}
            showTitle={true}
          playInBackground={true}
          subtitleUri={"https://www.vidkar.com:3006/Peliculas/Extranjeras/2024/Alien%20Romulus%20(2024)/Alien.Romulus.2024.720p.WEBRip.x264.AAC-%5bYTS.MX%5d.srt"}
          ref={videoRef}
          renderToHardwareTextureAndroid={true}
          // seek={position}
          volume={100}
          disableExoPlayer={false}
          allowsExternalPlayback={true}
          pictureInPicture={true}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 15000,
            bufferForPlaybackAfterRebufferMs: 15000,
          }}
          audioTrack={selectedAudioTrack ? selectedAudioTrack : undefined}
          textTrack={selectedTextTrack ? selectedTextTrack : undefined}
          textTracks={
            subtitulo
              ? [
                  {
                    // id: 20,
                    name: 'Spanish VidKar VTT',
                    language: 'es',
                    type: TextTrackType.VTT,
                    uri: 'https://www.vidkar.com/getsubtitle?idPeli=' + id,
                  },
                  {
                    // id: 21,
                    name: 'Spanish VidKar SRT',
                    language: 'es',
                    type: TextTrackType.SUBRIP,
                    uri: subtitulo,
                  },
                ]
              : []
          }
          showNotificationControls={true}
          source={{
            initType: 2,
            hwDecoderEnabled: 1,
            hwDecoderForced: 1,
            uri: urlVideo,
            initOptions: [
              '--no-audio',
              '--rtsp-tcp',
              '--network-caching=150',
              '--rtsp-caching=150',
              '--no-stats',
              '--tcp-caching=150',
              '--realrtsp-caching=150',
            ],
          }}
          onError={onError}
          paused={paused}
          onLoad={onLoad}
          onProgress={onProgress}
          style={styles.backgroundVideo}
        /> */}
        {/* <VlCPlayerView
        showControls={true}
          key={id}
          showGG={true}
            showTitle={true}
          playInBackground={true}
          subtitleUri={subtitulo}
          options={['-sub-fps', '24']}
          ref={videoRef}
          renderToHardwareTextureAndroid={true}
          // seek={position}
          volume={100}
          controlButton={false}
          disableExoPlayer={true}
          allowsExternalPlayback={true}
          pictureInPicture={true}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 15000,
            bufferForPlaybackAfterRebufferMs: 15000,
          }}
          isFull={true}
          audioTrack={selectedAudioTrack ? selectedAudioTrack : undefined}
          textTrack={selectedTextTrack ? selectedTextTrack : undefined}
          textTracks={
            subtitulo
              ? [
                  {
                    id: 20,
                    title: 'Spanish VidKar VTT',
                    language: 'es',
                    type: TextTrackType.VTT,
                    uri: 'https://www.vidkar.com/getsubtitle?idPeli=' + id,
                  },
                  {
                    id: 21,
                    title: 'Spanish VidKar SRT',
                    language: 'es',
                    type: TextTrackType.SUBRIP,
                    uri: subtitulo,
                  },
                ]
              : []
          }
          showNotificationControls={true}
          url={urlVideo}
          onError={onError}
          paused={paused}
          onLoad={onLoad}
          onProgress={onProgress}
          style={styles.backgroundVideo}
       /> */}

        <Video
          ref={videoRef}
          // renderToHardwareTextureAndroid={true}
          disableExoPlayer={true}
          allowsExternalPlayback={true}
          pictureInPicture={true}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 15000,
            bufferForPlaybackAfterRebufferMs: 15000,
          }}
          selectedAudioTrack={
            selectedAudioTrack
              ? {type: 'index', value: selectedAudioTrack}
              : undefined
          }
          selectedTextTrack={
            selectedTextTrack
              ? {type: 'index', value: selectedTextTrack}
              : undefined
          }
          textTracks={
            subtitulo
              ? [
                  {
                    index: 20,
                    title: 'Spanish VidKar VTT',
                    language: 'es',
                    type: TextTrackType.VTT,
                    uri: 'https://www.vidkar.com/getsubtitle?idPeli='+id,
                  },
                  {
                    index: 21,
                    title: 'Spanish VidKar SRT',
                    language: 'es',
                    type: TextTrackType.SUBRIP,
                    uri: subtitulo,
                  },
                ]
              : []
          }
          showNotificationControls={true}
          source={{uri: urlVideo}}
          onError={onError}
          paused={paused}
          controls={false}
          onLoad={onLoad}
          onProgress={onProgress}
          style={styles.backgroundVideo}
        />
      </TouchableOpacity>

      {isControlVisible && !isModalSubtitleVisible && !isModalAudioVisible && (
        <View style={[styles.controls]}>
          <View style={styles.tiempo}>
            <Slider
            disabled={true}
              upperLimit={duration}
              //   isTVSelectable={true}
              style={[styles.slider, {opacity: true ? 1 : 0.6}]}
              minimumValue={0}
              maximumValue={duration}
              value={currentTime}
              onValueChange={onSeek}
              onSlidingStart={() => {
                console.log('onSlidingStart');
                setFocusSlider(true);
              }}
              onSlidingComplete={value => {
                console.log('onSlidingComplete');
                setFocusSlider(false);
                if(duration > 0){
                    if (Platform.OS === 'ios') {
                        videoRef.current.seek(Number((value / duration).toFixed(17)));
                      } else {
                        videoRef.current.seek(Number((value / duration).toFixed(17)));
                      }
                }
                

              }}
              thumbTintColor="white"
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#000000"
              tapToSeek={true}
            //   StepMarker={{stepMarked: true, currentValue: currentTime}}
            />
            <Text style={{color: 'white', width: '15%'}}>
              {Math.floor(currentTime / 1000 / 60 / 60)}:
              {String(Math.floor((currentTime / 1000 / 60) % 60)).padStart(
                2,
                '0',
              )}
              :{String(Math.floor((currentTime / 1000) % 60)).padStart(2, '0')}{' '}
              / {Math.floor(duration / 1000 / 60 / 60)}:
              {String(Math.floor((duration / 1000 / 60) % 60)).padStart(2, '0')}
              :{String(Math.floor((duration / 1000) % 60)).padStart(2, '0')}
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              disabled={isModalSubtitleVisible || isModalAudioVisible}
              hasTVPreferredFocus={true}
              onFocus={() => setFocusPlayPause(true)}
              onBlur={() => setFocusPlayPause(false)}
              onPress={togglePause}
              // style={{opacity: focusPlayPause ? 1 : 0.5}}
            >
              <Button
                buttonColor={focusPlayPause ? 'gray' : 'transparent'}
                textColor={focusPlayPause ? 'black' : 'white'}
                style={{borderRadius: 5}}
                icon={paused ? 'play' : 'pause'}
                mode="contained">
                {paused ? 'Play' : 'Pause'}
              </Button>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isModalSubtitleVisible || isModalAudioVisible}
              onFocus={() => setFocusSubtitle(true)}
              onBlur={() => setFocusSubtitle(false)}
              onPress={toggleModalSubtitle}
              // style={{opacity: focusSubtitle ? 1 : 0.5}}
            >
              <Button
                // buttonColor={focusSubtitle ? 'gray' : 'transparent'}
                // textColor={focusSubtitle ? 'black' : 'white'}
                style={{borderRadius: 5}}
                icon={'subtitles'}
                mode="contained">
                Subtitles
              </Button>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isModalSubtitleVisible || isModalAudioVisible}
              onFocus={() => setFocusAudio(true)}
              onBlur={() => setFocusAudio(false)}
              onPress={toggleModalAudio}
              // style={[
              //   styles.controlButtonText,
              //   {opacity: focusAudio ? 1 : 0.5},
              // ]}
            >
              <Button
                onFocus={() => setFocusAudio(true)}
                onBlur={() => setFocusAudio(false)}
                // buttonColor={focusAudio ? 'gray' : 'transparent'}
                // textColor={focusAudio ? 'black' : 'white'}
                style={{borderRadius: 5}}
                icon={'volume-high'}
                mode="contained">
                Audio
              </Button>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Dialog
        visible={isModalSubtitleVisible}
        onDismiss={toggleModalSubtitle}
        style={{
          zIndex: 1,
          height: '70%',
          // backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}>
        <Dialog.Title>Select Subtitle Track</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={{height: '70%'}}>
            {textTracks && textTracks.map((track, index) => (
              <TouchableOpacity
                // hasTVPreferredFocus={index === 0 ? true : false}
                // style={{opacity: focusSubtituloSelect === index ? 1 : 0.7}}
                key={index}
                onFocus={() => setFocusSubtituloSelect(index)}
                onBlur={() => setFocusSubtituloSelect(null)}
                onPress={() => setSelectedTextTrack(track.id)}
                >
                <RadioButton.Item
                  // color="white"
                  key={index}
                  label={track.name}
                  value={track.id}
                  status={
                    selectedTextTrack === track.id ? 'checked' : 'unchecked'
                  }
                  onPress={() => setSelectedTextTrack(track.id)}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Dialog.Content>
        {/* <Dialog.Actions>
          <Button onPress={toggleModalSubtitle}>Close</Button>
        </Dialog.Actions> */}
      </Dialog>
      <Dialog
        visible={isModalAudioVisible}
        onDismiss={toggleModalAudio}
        style={{
          zIndex: 1,
          height: '50%',
          // backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}>
        <Dialog.Title>Select Audio Track</Dialog.Title>
        <Dialog.Content>
          {audioTracks.map((track, index) => (
            <TouchableOpacity
              hasTVPreferredFocus={index === 0 ? true : false}
              style={{opacity: focusAudioSelect === index ? 1 : 0.6}}
              onFocus={() => setFocusAudioSelect(index)}
              onBlur={() => setFocusAudioSelect(null)}
              key={index}
              onPress={() => setSelectedAudioTrack(index)}>
              <RadioButton.Item
                // color="white"
                key={index}
                label={track.name}
                value={track.id}
                status={
                  selectedAudioTrack === track.id ? 'checked' : 'unchecked'
                }
                onPress={() => setSelectedAudioTrack(track.id)}
              />
            </TouchableOpacity>
          ))}
        </Dialog.Content>
        {/* <Dialog.Actions>
          <Button onPress={toggleModalAudio}>Close</Button>
        </Dialog.Actions> */}
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  backgroundVideo: {
    width: '100%',
    height: '100%',
  },
  controls: {
    zIndex: 0,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
  },
  slider: {
    width: '90%',
  },
  tiempo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  buttons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  controlButton: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  modalContent: {
    backgroundColor: 'gray',
    padding: 20,
    borderRadius: 5,
  },
  modalCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    marginTop: 20,
  },
  buttonText: {
    color: 'black',
  },
});

export default VideoPlayerIOS;
