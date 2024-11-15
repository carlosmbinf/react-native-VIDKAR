import React, {useEffect} from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Button, Text, Image, Surface} from 'react-native-paper';

const CardPeli = props => {
  const {nombrePeli, urlBackground, urlPeli, subtitulo, _id} = props.item;
  const idPeli = _id;
  const {navigation} = props;
  const [mostrar, setMostrar] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  // console.log('CardPeli', nombrePeli);
  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.3 : 1, // Cambia el valor de escala
      friction: 5, // Ajusta la fricción para suavizar el efecto
      useNativeDriver: true,
    }).start();
  }, [focused, scaleValue]);

  return (
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
        navigation.navigationGeneral.navigate('Video', { id: _id, subtitulo: subtitulo, urlPeli: urlPeli, nombrePeli: nombrePeli, urlBackground: urlBackground });
        // navigation.navigate('Peli', {
        //   urlVideo: urlPeli,
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
        <ImageBackground
          // onLoadEnd={() => {
          //   // console.log('onLoadEnd', nombrePeli);
          //   setMostrar(true);
          // }}
          // onError={e => {
          //   console.log('onError', urlBackground);
          //   setMostrar(false);
          // }}
          source={{uri: urlBackground}}
          // defaultSource={require('../../components/files/not-available-rubber-stamp-seal-vector.jpg')}
          // loadingIndicatorSource={require('../../components/files/not-available-rubber-stamp-seal-vector.jpg')}
          progressiveRenderingEnabled={true}
          style={{
            width: 150,
            height: 100,
            borderRadius: 20,
            justifyContent: 'flex-end',
            backgroundColor: 'black',
          }}
          borderRadius={20}>
          <View style={styles.viewDescipcionPelis}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
              style={styles.gradient}>
              <Text style={styles.textFontName}>{nombrePeli}</Text>
            </LinearGradient>
          </View>
        </ImageBackground>
      </Animated.View>
    </TouchableOpacity>
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
  },
  viewDescipcionPelis: {
    height: '50%',
    bottom: 0,
    borderBottomEndRadius: 20,
    borderBottomLeftRadius: 20,
  },
  gradient: {
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // padding: 5,
  },
});
export default CardPeli;
