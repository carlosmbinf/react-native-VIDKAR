import Meteor, { Accounts, Mongo, withTracker } from '@meteorrn/core';
import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import Orientation from 'react-native-orientation';
import { Card, Title, Text, Button, TextInput, Switch, Surface, IconButton, Avatar } from 'react-native-paper';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Alert } from 'react-native';

import { PreciosCollection, Logs, VentasCollection } from '../collections/collections'

const axios = require('axios').default;

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');


class CreateUsers extends React.Component {
  componentDidMount() {
    // Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    // Orientation.unlockAllOrientations();
  }

  constructor(props) {
    super(props);
    this.state = {
      // colorText:  Colors.darker,
      edit: false,
      nombre: "",
      apellidos: "",
      email: "",
      username: "",
      contrasena: "",
      loading: false
    };
  }

  render() {
    const { navigation } = this.props;
    const moment = require('moment');

    const send = () => {
      this.setState({
    loading: true
      })
      try {
       let user = {
          username: this.state.username,
          email: this.state.email,
          password: this.state.contrasena,
          firstName: this.state.nombre,
          lastName: this.state.nombre,
          role: "user",
          edad: 30,
          creadoPor: Meteor.userId()
  
        }
        let mensaje = Meteor.call("addUser", user)
        mensaje && (Alert.alert(mensaje), this.setState({
          edit: false,
      nombre: "",
      apellidos: "",
      email: "",
      username: "",
      contrasena: ""
        }))
        this.setState({
          loading: false
            })

        // $.post("http://vidkar.sytes.net:6000/createuser", user)
        // .done(function (data) {
        //   Alert.alert(data)
        // })
        // .fail(function (data) {
        //   Alert.alert(data)
        // })
      } catch (error) {
        console.log(error);
        
      }
      
    }
    return (
      <ScrollView>
        <Surface style={styles.container}>
          <Surface style={{ elevation: 12, padding: 10, borderRadius: 15 }}>
            <Text style={{ textAlign: "center" }}>Agregar Usuario</Text>
            <View style={{}}>
              <View style={{ padding: 5 }}>
                <TextInput
                  autoFocus={true}
                  mode="outlined"
                  label="Nombre"
                  disabled={this.state.loading}
                  value={this.state.nombre}
                  onChangeText={text => this.setState({ nombre: text })}
                  dense={true}
                />
              </View>
              <View style={{ padding: 5 }}>
                <TextInput
                  mode="outlined"
                  label="Apellidos"
                  disabled={this.state.loading}
                  value={this.state.apellidos}
                  onChangeText={text => this.setState({ apellidos: text })}
                  dense={true}
                />
              </View>
              <View style={{ padding: 5 }}>
                <TextInput
                  mode="outlined"
                  label="Email"
                  disabled={this.state.loading}
                  value={this.state.email}
                  onChangeText={text => this.setState({ email: text })}
                  dense={true}
                />
              </View>
              <View style={{ padding: 5 }}>
                <TextInput
                  mode="outlined"
                  label="Usuario"
                  disabled={this.state.loading}
                  value={this.state.username}
                  onChangeText={text => this.setState({ username: text })}
                  dense={true}
                />
              </View>
              <View style={{ padding: 5 }}>
                <TextInput
                  mode="outlined"
                  label="Contraseña"
                  type="email"
                  disabled={this.state.loading}
                  value={this.state.contrasena}
                  onChangeText={text => this.setState({ contrasena: text })}
                  dense={true}
                  secureTextEntry={true}
                />
              </View>
              <View style={{ textAlign: "rigth", width: "100%", padding: 5, flexDirection: "row-reverse" }}>
                <Button loading={this.state.loading} style={{ width: 120 }} mode="contained" onPress={send}>
                  Crear
              </Button>
              </View>
            </View>
          </Surface>
        </Surface>
      </ScrollView>

    )

  }
}


export default CreateUsers;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minHeight: screenHeight
  },
});
