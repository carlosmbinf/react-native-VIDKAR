import React, {Component} from 'react';
import {
  Alert,
  Button,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
  Text,
  useColorScheme,
  Dimensions,
} from 'react-native';
import Meteor, {Accounts, Mongo, withTracker} from '@meteorrn/core';
import { Colors } from 'react-native/Libraries/NewAppScreen';

const {width: screenWidth} = Dimensions.get('window');
const {height: screenHeight} = Dimensions.get('window');

class MyAppLoguin extends Component {
  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
      isDarkMode: useColorScheme
    };
  }

  onLogin() {
    const {username, password} = this.state;
    const {navigation} = this.props;

    // navigation.navigate('Peliculas')
    Meteor.loginWithPassword(username, password, function (error) {
      error && Alert.alert('Credenciales incorrectas');
      !error && navigation.navigation.navigate('Peliculas');
    });
  }

  render() {
    const {navigation} = this.props;


    const backgroundStyle = {
        backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
        height:screenHeight,
        // backgroundColor:'red'
      };

      Meteor.user() && navigation.navigation.navigate('Peliculas');
      return (
        <View style={backgroundStyle}>
          <ScrollView
        contentInsetAdjustmentBehavior="automatic" style={{padding:30}}>
              <View style={styles.container}>
                <TextInput
                  value={this.state.username}
                  onChangeText={username => this.setState({username})}
                  placeholder={'Username'}
                  placeholderTextColor={
                    !this.state.isDarkMode ? Colors.darker : Colors.lighter
                  }
                  style={{
                    color: !this.state.isDarkMode
                      ? Colors.darker
                      : Colors.lighter,
                    width: 200,
                    height: 44,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: 'white',
                    marginBottom: 10,
                  }}
                />
                <TextInput
                  value={this.state.password}
                  onChangeText={password => this.setState({password})}
                  placeholder={'Password'}
                  placeholderTextColor={
                    !this.state.isDarkMode ? Colors.darker : Colors.lighter
                  }
                  secureTextEntry={true}
                  style={{
                    color: !this.state.isDarkMode
                      ? Colors.darker
                      : Colors.lighter,
                    width: 200,
                    height: 44,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: 'white',
                    marginBottom: 10,
                  }}
                />

                <Button
                  title={'Login'}
                  style={styles.input}
                  onPress={this.onLogin.bind(this)}
                />
              </View>
          </ScrollView>
        </View>
      );
    
  }
}
const Loguin = withTracker(navigation => {
  return {
    navigation,
  };
})(MyAppLoguin);

export default Loguin;
const styles = StyleSheet.create({
  container: {
      
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#ecf0f1',
  },
  input: {
    width: 200,
    height: 44,
    padding: 10,
    borderWidth: 1,
    borderColor: 'white',
    marginBottom: 10,
  },
});
