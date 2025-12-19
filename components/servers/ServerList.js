/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useRef, useState } from 'react';
// import type {Node} from 'react';
import {
  ActivityIndicator,
  Avatar,
  Badge,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  Menu,
  Modal,
  Provider as PaperProvider,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
  Title,
  Icon,
  Card,
  Appbar
} from 'react-native-paper';
import { SegmentedButtons } from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  SafeAreaView
} from 'react-native';
import { Logs, ServersCollection, VentasCollection } from '../collections/collections';

import { DataTable, Dialog } from 'react-native-paper';
import DialogVenta from './DialogServer';
import { withSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../Header/MenuHeader';


const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const optionsPerPage = [50, 75, 100];

class MyApp extends React.Component {
  //   componentDidMount() {
  //     Orientation.lockToPortrait();
  //   }

  //   componentWillUnmount() {
  //     Orientation.unlockAllOrientations();
  //   }
  constructor(props) {
    super(props);
    this.state = {
      page: 0,
      itemsPerPage: optionsPerPage[0],
      showDialog: false,
      data: null
    };

    // console.log(this.props.myTodoTasks);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [isLoading, setLoading] = useState(true);
    // const carouselRef = useRef(null);
  }
  render() {
    const { user, ready, navigation ,myTodoTasks, insets } = this.props;
    //  console.log("DATA:" + JSON.stringify(myTodoTasks));

    const from = this.state.page * this.state.itemsPerPage;

    const to = Math.min((this.state.page + 1) * this.state.itemsPerPage, myTodoTasks.length);

    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: (screenHeight - 80),
    };
    const moment = require('moment');
    const mostrarDialog = () => {
      this.setState({ showDialog: true })
    }
    const cerrarDialog = () => {
      this.setState({ showDialog: false })
    }

    const reinciarServer = (idServer) => {
      console.log(idServer);
      Meteor.call(
        'actualizarEstadoServer',
        idServer,
        {
          estado: 'PENDIENTE_A_REINICIAR',
          idUserSolicitandoReinicio: Meteor.userId(),
        },
        (error, result) => {
          if (error) {
            alert(error.message);
          }
        },
      );
    }

    return (
      <ScrollView style={backgroundStyle}>
        <Surface>
          {this.state.data && (
            <DialogVenta
              visible={this.state.showDialog}
              hideDialog={cerrarDialog}
              data={this.state.data}></DialogVenta>
          )}
          {/* {ready ? myTodoTasks.map((element,index) => <Text>{element._id} ----------- {index}</Text>
           )
         
           :
           <Text>CARGANDO...</Text>} */}

          {ready ? (
            <Surface style={{
                  flex: 1,
                  flexDirection: 'column',
                  minHeight: screenHeight,
                  // backgroundColor: '#2a323d',
                  // justifyContent: 'center',
                }}>
              <Appbar.Header style={{ backgroundColor: '#3f51b5', height: 80, justifyContent: 'center', paddingTop: insets.top }}>

                <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                  <Appbar.BackAction
                    color='red'
                    onPress={() => {
                      if (navigation.navigation.canGoBack()) {
                        navigation.navigation.goBack();
                      }
                    }}
                  />
                  <MenuHeader
                    navigation={navigation}
                  />
                </View>
              </Appbar.Header>
              {myTodoTasks.map((element, index) => {
                console.log(element)
                return (
                  <Card style={{margin: 10}} elevation={6} key={element._id}>
                    <Card.Title
                      title={element.details}
                      subtitle={element.domain + ' - ' + element.ip}
                    />
                    <Card.Content>
                      <Text>Estado: {element.estado}</Text>
                    </Card.Content>
                    <Card.Actions>
                      <Button
                        loading={
                          element.estado == 'PENDIENTE_A_REINICIAR'
                            ? true
                            : false
                        }
                        disabled={
                          element.estado == 'PENDIENTE_A_REINICIAR'
                            ? true
                            : false
                        }
                        onPress={()=>{reinciarServer(element._id)}}>
                        {' '}
                        {element.estado == 'PENDIENTE_A_REINICIAR'
                          ? 'REINICIANDO'
                          : 'REINICIAR CONEXION VPN'}
                      </Button>
                    </Card.Actions>
                  </Card>
                );
              })}
            </Surface>
          ) : (
            <Surface>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  height: screenHeight - 80,
                  // backgroundColor: '#2a323d',
                  justifyContent: 'center',
                }}>
                <ActivityIndicator size="large" color="#3f51b5" />
              </View>
            </Surface>
          )}
        </Surface>
      </ScrollView>
    );
  }
}

const ServerListWithInsets = withSafeAreaInsets(MyApp);

const ServerList = withTracker(navigation => {
  //  console.log(user.user)
  const handle2 = Meteor.subscribe('servers').ready();
  const myTodoTasks = handle2 && ServersCollection.find({}, { sort: { createdAt: -1 } }).fetch();
  //  console.log(myTodoTasks);
  return {
    navigation,
    myTodoTasks,
    ready: handle2,
  };
})(ServerListWithInsets);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: { height: 40, backgroundColor: '#f1f8ff' },
  text: { margin: 6 }
});

export default ServerList;
