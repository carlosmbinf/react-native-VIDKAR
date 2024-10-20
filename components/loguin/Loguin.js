import React, {Component} from 'react';
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {Button, Surface, Text, TextInput} from 'react-native-paper';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');
import {Mensajes} from '../collections/collections';

import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
//import HeroBot from '../animations/HeroBot';

class Loguin extends Component {
  componentDidMount() {
    // Orientation.unlockAllOrientations();
  }

  componentWillUnmount() {
    // Orientation.lockToPortrait();
  }

  constructor(props) {
    super(props);
    const {navigation} = this.props;
    Meteor.connect('ws://vidkar.ddns.net:6000/websocket');

    // Meteor.user() && navigation.navigate('Peliculas');

    // Meteor.user()&& (Meteor.user().profile.role == "admin" ? navigation.navigate('Users') : navigation.navigate('User', { item: Meteor.userId() }))

    this.state = {
      ipserver: 'vidkar.ddns.net',
      username: '',
      password: '',
      // isDarkMode: useColorScheme,
    };
  }

  onLogin() {
    const {username, password} = this.state;
    const {navigation} = this.props;
    try {
    } catch (error) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar al servidor: ' + this.state.ipserver,
      );
    }
    // Note the /websocket after your URL

    // let version = 1
    // Meteor.subscribe('mensajes');
    // console.log(Mensajes.find({type:'version'}).fetch());
    // Mensajes.findOne({type:'version'}).version > version ? Alert.alert("Nueva Actualización", "Existe una nueva Actualizacion de la APK. Actualícela porfavor!!!\n\nMejoras:\n " +  Mensajes.findOne({type:'version'}).cambios):
    // navigation.navigate('Peliculas')
    Meteor.loginWithPassword(username, password, function (error) {
      error && Alert.alert('Credenciales incorrectas');
      // !error && navigation.navigate('Peliculas');
      // !error && (Meteor.users.findOne({ username: username }).profile && Meteor.users.findOne({ username: username }).profile.role == "admin" ? navigation.navigate('Users') : navigation.navigate('User', { item: Meteor.users.findOne({ username: username })._id }));
    });
  }

  render() {
    // Meteor.userId()&&Meteor.subscribe("usersId",Meteor.userId())

    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: "100%",
      minWidth: "100%",
      marginTop: "5%",
    };

    return (
      <View style={{ minHeight: "100%", minWidth:"100%"}}>
        <Video
          source={require('../videobackground/background.mp4')}
          style={{
            backgroundColor: 'black',
            width: "100%",
            height: "100%",
            position: 'relative',
            left: 0,
            top: 0,
            zIndex: 0,
          }}
          muted={true}
          repeat={true}
          resizeMode={'cover'}
          rate={1.0}
          ignoreSilentSwitch={'obey'}
        />

          {/* <HeroBot/>*/}
          <SafeAreaView style={{ 
      position: 'absolute',
      // backgroundColor: 'red',
      minHeight:'100%',
      minWidth: '100%'}}>
          <ScrollView >
          <View style={backgroundStyle}>
            <View style={styles.container}>
              <Text style={{fontSize: 30,}}>
                <FontAwesome5Icon name="house-user" size={100} />
              </Text>

              <Text style={{fontSize: 30 }}>🅥🅘🅓🅚🅐🅡</Text>
            </View>

            <View style={styles.container}>
              {/* <TextInput
              mode="outlined"
              value={this.state.ipserver}
              onChangeText={ipserver => this.setState({ipserver: ipserver})}
              label={'Dirección del Servidor'}
              // placeholderTextColor={
              //   !this.state.isDarkMode ? Colors.darker : Colors.lighter
              // }
              dense={true}
              style={{
                width: 200,
                // height: 44,
                marginBottom: 10,
              }}
            /> */}
              <TextInput
                mode="flat"
                value={this.state.username}
                onChangeText={username => this.setState({username: username})}
                label={'Username'}
                // placeholderTextColor={
                //   !this.state.isDarkMode ? Colors.darker : Colors.lighter
                // }
                dense={true}
                style={{
                  width: 200,
                  // height: 44,
                  marginBottom: 10,
                }}
              />
              <TextInput
                mode="flat"
                value={this.state.password}
                onChangeText={password => this.setState({password: password})}
                label={'Password'}
                // placeholderTextColor={
                //   !this.state.isDarkMode ? Colors.darker : Colors.lighter
                // }
                secureTextEntry={true}
                dense={true}
                style={{
                  width: 200,
                  // height: 44,
                  marginBottom: 10,
                }}
              />

              <Button mode="contained" onPress={this.onLogin.bind(this)}>
                Iniciar Sessión
              </Button>
            </View>
            </View>
          </ScrollView>
          </SafeAreaView>
         
      </View>
    );
  }
}
// const Loguin = withTracker(navigation => {
//   return {
//     navigation,
//   };
// })(MyAppLoguin);

export default Loguin;
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    zIndex: 1,
    // backgroundColor: '#ecf0f1',
  },
});
