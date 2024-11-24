import React, {useEffect} from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Button, Text, Surface, IconButton, Drawer, Chip} from 'react-native-paper';
import DrawerOptionsAlls from '../drawer/DrawerOptionsAlls';
import FastImage from 'react-native-fast-image';

const CardPeli = props => {
  const {nombrePeli, urlBackgroundHTTPS, urlPeliHTTPS, subtitulo, _id, year,vistas, extension} = props.item;
  const [drawer, setDrawer] = React.useState(false);
  const idPeli = _id;
  const {navigation} = props;
  const [mostrar, setMostrar] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const drawerStyles = {
    drawer: { shadowColor: 'black', shadowOpacity: 0, shadowRadius: 3, backgroundColor: "black" },
    main: { paddingLeft: 0 },
  }

  // console.log('CardPeli', nombrePeli);
  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.3 : 1, // Cambia el valor de escala
      friction: 5, // Ajusta la fricción para suavizar el efecto
      useNativeDriver: true,
    }).start();
  }, [focused, scaleValue]);

  return (
    <>
    
    <TouchableOpacity
      onFocus={e => {
        setFocused(true);
        console.log('FOCUS ' + nombrePeli);
      }}
      onBlur={e => {
        setFocused(false);
      }}
      onPressIn={() => {
        console.log('PRESS IN ' + nombrePeli);
      }}
      onPress={() => {
        console.log('PRESS ' + nombrePeli);
        navigation.navigationGeneral.navigate('Video', { id: _id, subtitulo: subtitulo, urlPeliHTTPS: urlPeliHTTPS, nombrePeli: nombrePeli, urlBackgroundHTTPS: urlBackgroundHTTPS });
        // navigation.navigate('Peli', {
        //   urlVideo: urlPeliHTTPS,
        //   subtitulo: subtitulo,
        //   idPeli: idPeli,
        // });
      }}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        paddingTop: 0,
        paddingBottom: 0,
        width: 175,
        opacity: focused ? 1 : 0.9,
        paddingLeft: 40,
      }}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{scale: scaleValue}],
          },
        ]}>
          <FastImage
  style={{
    width: 150,
    height: 120,
    borderRadius: 20,
    justifyContent: 'flex-end',
    backgroundColor: 'black',
  }}
  source={{
    uri: urlBackgroundHTTPS,
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.cover}
  renderToHardwareTextureAndroid={true}
  onLoadEnd={() => {
    console.log('onLoadEnd', nombrePeli);
  }}
  onError={e => {
    console.log('onError', urlBackgroundHTTPS);
  }}
  borderRadius={20}
>
<View style={styles.viewDescipcionPelisTop}>
            <><Text style={[styles.textFontName,{paddingRight:10,paddingTop:5}]}>{vistas} Vistas</Text></>
            <Text style={[styles.textFontName,{paddingLeft:10,paddingTop:5}]}>{year}</Text>
          </View>
          <View style={styles.viewDescipcionPelis}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
              style={styles.gradient}>
              <Text style={styles.textFontName}>{nombrePeli}</Text>
              <View style={{flexDirection: 'row',justifyContent:'left', width:'100%', paddingLeft:10,paddingBottom:5}}>
                {extension&&<Chip elevated={true} style={{width:45,height:15,alignContent:'center', justifyContent:'center', alignItems:'center'}} ><Text style={{fontSize:10}}>{extension}</Text></Chip>}
              </View>
            </LinearGradient>
          </View>
  </FastImage>
        {/* <ImageBackground
          onLoadEnd={() => {
            console.log('onLoadEnd', nombrePeli);
          }}
          onError={e => {
            console.log('onError', urlBackgroundHTTPS , e);
          }}

          source={{uri: urlBackgroundHTTPS}}
          defaultSource={{uri: urlBackgroundHTTPS}}
          // loadingIndicatorSource={require('../../components/files/not-available-rubber-stamp-seal-vector.jpg')}
          progressiveRenderingEnabled={true}
          style={{
            width: 150,
            height: 120,
            borderRadius: 20,
            justifyContent: 'flex-end',
            backgroundColor: 'black',
          }}
          borderRadius={20}>
            <View style={styles.viewDescipcionPelisTop}>
            <><Text style={[styles.textFontName,{paddingRight:10,paddingTop:5}]}>{vistas} Vistas</Text></>
            <Text style={[styles.textFontName,{paddingLeft:10,paddingTop:5}]}>{year}</Text>
          </View>
          <View style={styles.viewDescipcionPelis}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
              style={styles.gradient}>
              <Text style={styles.textFontName}>{nombrePeli}</Text>
              <View style={{flexDirection: 'row',justifyContent:'left', width:'100%', paddingLeft:10,paddingBottom:5}}>
                {extension&&<Chip elevated={true} style={{width:45,height:15,alignContent:'center', justifyContent:'center', alignItems:'center'}} ><Text style={{fontSize:10}}>{extension}</Text></Chip>}
              </View>
            </LinearGradient>
          </View>
        </ImageBackground> */}
      </Animated.View>
    </TouchableOpacity>


    
    </>
    
  );
};

const styles = StyleSheet.create({
  touchable: {
    padding: 10,
    marginRight: 10,
    marginTop: 10,
  },
  card: {
    borderRadius: 20,
    opacity: 1,
  },
  textFontName: {
    color: 'white',
    fontSize: 10,
    flexWrap: 'wrap',
  },
  viewDescipcionPelis: {
    height: '50%',
    bottom: 0,
    borderBottomEndRadius: 20,
    borderBottomLeftRadius: 20,
  },
  viewDescipcionPelisTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    padding:5,
    justifyContent: 'space-between',
    height: '50%',
    top: 0,
    borderTopEndRadius: 20,
    borderTopLeftRadius: 20,
  },
  gradient: {
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    // padding: 5,
  },
});
export default CardPeli;
