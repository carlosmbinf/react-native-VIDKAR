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
  Icon
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
import { Logs, VentasCollection } from '../collections/collections';

import { DataTable, Dialog } from 'react-native-paper';
import DialogVenta from './DialogVenta';


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
    const { user, ready, navigation } = this.props;
    //  console.log("DATA:" + JSON.stringify(myTodoTasks));

    const from = this.state.page * this.state.itemsPerPage;
    let myTodoTasks = VentasCollection.find({}, { sort: { createdAt: -1 }, limit: 100 }).fetch()

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

    return (
      <ScrollView style={backgroundStyle}>
        <Surface >
          {this.state.data && <DialogVenta visible={this.state.showDialog} hideDialog={cerrarDialog} data={this.state.data}></DialogVenta>}
          {/* {ready ? myTodoTasks.map((element,index) => <Text>{element._id} ----------- {index}</Text>
           )
         
           :
           <Text>CARGANDO...</Text>} */}

          {ready ?
            <DataTable>

              <DataTable.Header>
                <DataTable.Title>Type</DataTable.Title>
                <DataTable.Title >Admin</DataTable.Title>
                <DataTable.Title>User</DataTable.Title>
                {/* <DataTable.Title>Mensaje</DataTable.Title> */}
                <DataTable.Title sortDirection='descending'>Fecha</DataTable.Title>
                <DataTable.Title>Pago</DataTable.Title>
              </DataTable.Header>


              {myTodoTasks.map((element, index) => {
                return index >= from && index < to &&
                  <DataTable.Row onPress={() => {
                    let userusername = Meteor.users.findOne(element.userId) && Meteor.users.findOne(element.userId).username
                    let adminusername = Meteor.users.findOne(element.adminId) && Meteor.users.findOne(element.adminId).username
                    // Alert.alert(`Datos:`, `Admin: ${adminusername && adminusername}\n\nUsuario: ${userusername && userusername}\n\nFecha: ${moment(new Date(element.createdAt))
                    //   .format('DD/MM/YYYY=>hh:mm:ss A')}\n\nMensaje: ${element.comentario}`)

                    this.setState({ data: element });
                    mostrarDialog();
                  }}>
                    <DataTable.Cell>{element.type}</DataTable.Cell>
                    <DataTable.Cell >{element.adminId != "SERVER" ? (Meteor.users.findOne(element.adminId) && Meteor.users.findOne(element.adminId).username) : "SERVER"}</DataTable.Cell>
                    <DataTable.Cell>{Meteor.users.findOne(element.userId) && Meteor.users.findOne(element.userId).username}</DataTable.Cell>
                    {/* <DataTable.Cell >{element.message}</DataTable.Cell> */}
                    <DataTable.Cell>{moment(new Date(element.createdAt))
                      .format('DD-MM-YY')}</DataTable.Cell>
                    <DataTable.Cell >
                      <View style={{ flexDirection: "column", alignItems: "center" }}>
                        <IconButton
                          icon={element && element.cobrado ? "cart-check" : "cart-arrow-down"}
                          mode='contained'
                          color={element && element.cobrado ? 'green' : 'red'}
                          onPress={ ()=>{
                            Meteor.call("changeStatusVenta", element._id, (error, result) => {
                              error && alert(error.message)
                            })
                          } }
                          // iconColor={MD3Colors.error50}
                          size={30} />
                      </View>
                    </DataTable.Cell>
                  </DataTable.Row>
              })}

              <DataTable.Pagination
                page={this.state.page}
                numberOfPages={Math.ceil(myTodoTasks.length / this.state.itemsPerPage)}
                onPageChange={(page) => this.setState({ page: page })}
                label={`${from + 1}-${to} of ${myTodoTasks.length}`}

                numberOfItemsPerPageList={optionsPerPage}
                numberOfItemsPerPage={this.state.itemsPerPage}
                onItemsPerPageChange={item => this.setState({ itemsPerPage: item })}
                selectPageDropdownLabel={'Rows per page'}

              />
              <Text></Text>
            </DataTable> :
            <Surface><View
              style={{
                flex: 1,
                flexDirection: 'column',
                height: screenHeight - 80,
                // backgroundColor: '#2a323d',
                justifyContent: 'center',
              }}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View></Surface>
          }

        </Surface>
      </ScrollView>
    )
  }
}
const VentasList = withTracker(navigation => {
  //  console.log(user.user)
  const handle2 = Meteor.subscribe('ventas', {}, { sort: { createdAt: -1 }, limit: 100 }).ready();
  const myTodoTasks = null;
  //  console.log(myTodoTasks);
  return {
    navigation,
    myTodoTasks,
    ready: handle2,
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: { height: 40, backgroundColor: '#f1f8ff' },
  text: { margin: 6 }
});

export default VentasList;
