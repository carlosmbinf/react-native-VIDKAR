/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useRef, useEffect, useState } from 'react';
// import type {Node} from 'react';
import {
  Avatar,
  IconButton,
  List,
  Text,
  Provider as PaperProvider,
  Switch,
  Title,
  TextInput,
  Badge,
  Menu,
  Divider,
  Button,
  Modal,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Alert,
} from 'react-native';
import { Logs } from '../collections/collections';

import { DataTable } from 'react-native-paper';


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
      itemsPerPage: optionsPerPage[0]
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
    let myTodoTasks = Logs.find({}, { sort: { createdAt: -1 }, limit: 100 }).fetch()

    const to = Math.min((this.state.page + 1) * this.state.itemsPerPage, myTodoTasks.length);


    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: (screenHeight - 80),
    };
    const moment = require('moment');

    return (
      <ScrollView style={backgroundStyle}>
        <Surface >

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
            </DataTable.Header>


              {myTodoTasks.map((element, index) =>{
                return index >= from && index < to &&
                <DataTable.Row onPress={() => {
                  let userusername = Meteor.users.findOne(element.userAfectado) && Meteor.users.findOne(element.userAfectado).username
                  let adminusername = Meteor.users.findOne(element.userAdmin) && Meteor.users.findOne(element.userAdmin).username
                    Alert.alert(`Datos:`, `Mensaje: ${element.message}\n\nFecha: ${moment(new Date(element.createdAt).toLocaleString())
                    .format('DD/MM/YYYY=>hh:mm:ss A')}\n\nAdmin: ${adminusername&&adminusername}\n\nUsuario: ${userusername&&userusername}`)
                }}>
                  <DataTable.Cell>{element.type}</DataTable.Cell>
                  <DataTable.Cell >{element.userAdmin != "SERVER" ? (Meteor.users.findOne(element.userAdmin) && Meteor.users.findOne(element.userAdmin).username) : "SERVER"}</DataTable.Cell>
                  <DataTable.Cell>{Meteor.users.findOne(element.userAfectado) && Meteor.users.findOne(element.userAfectado).username}</DataTable.Cell>
                  {/* <DataTable.Cell >{element.message}</DataTable.Cell> */}
                  <DataTable.Cell>{moment(new Date(element.createdAt))
                    .format('DD/MM=>hh:mm:ss A')}</DataTable.Cell>
                </DataTable.Row>})}

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
              height: screenHeight-80,
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
const LogsList = withTracker(navigation => {
  //  console.log(user.user)
  const handle2 = Meteor.subscribe('logs', {}, { sort: { createdAt: -1 }, limit: 100 }).ready();
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

export default LogsList;
