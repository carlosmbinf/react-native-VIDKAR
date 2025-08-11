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
import { Logs, TransaccionRecargasCollection, VentasRechargeCollection } from '../collections/collections';

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
    const { user, ready, navigation, transacciones } = this?.props?._j || {};
    //  console.log("DATA:" + JSON.stringify(myTodoTasks));
    // console.log("transacciones:", transacciones);
    const from = this.state.page * this.state.itemsPerPage;
    // let myTodoTasks = Logs.find({}, { sort: { createdAt: -1 }, limit: 100 }).fetch()

    const to = Math.min((this.state.page + 1) * this.state.itemsPerPage, transacciones?.length);


    const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: (screenHeight - 80),
    };
    const moment = require('moment');

    // return <></>
    return (
      // <ScrollView style={backgroundStyle}>
        <Surface style={{minHeight:'100%'}}>

          <Text style={{paddingTop:30,paddingLeft:10}}>Listado de Recargas hechas:</Text>
          <Divider/>
          {/* {ready ? transacciones?.map((element,index) => <Text>{element._id} ----------- {index}</Text>
           )
         
           :
           <Text>CARGANDO...</Text>} */}

          {ready ?
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Type</DataTable.Title>
                <DataTable.Title >Id Carrito</DataTable.Title>
                <DataTable.Title>Estado</DataTable.Title>
                {/* <DataTable.Title>Mensaje</DataTable.Title> */}
                <DataTable.Title sortDirection='descending'>Fecha</DataTable.Title>
              </DataTable.Header>


              {transacciones?.map((element, index) => {
                return index >= from && index < to &&
                  <DataTable.Row
                  // onPress={() => {
                  //     Alert.alert(`Datos:`, `Mensaje: ${element.message}\n\nFecha: ${moment(new Date(element.createdAt))
                  //     .format('DD/MM/YYYY=>hh:mm:ss A')}\n\nAdmin: ${adminusername != null ? adminusername : "SERVER"}\n\nUsuario: ${userusername&&userusername}`)
                  // }}
                  >
                    <DataTable.Cell>{element?.product?.description}</DataTable.Cell>
                    <DataTable.Cell >{element?.externalId}</DataTable.Cell>
                    <DataTable.Cell>{element?.status?.message}</DataTable.Cell>
                    {/* <DataTable.Cell >{element.message}</DataTable.Cell> */}
                    <DataTable.Cell>{moment(new Date(element.creationDate))
                      .format('DD/MM=>hh:mm:ss A')}</DataTable.Cell>
                  </DataTable.Row>
              })}

              <DataTable.Pagination
                page={this.state.page}
                numberOfPages={Math.ceil(transacciones?.length / this.state.itemsPerPage)}
                onPageChange={(page) => this.setState({ page: page })}
                label={`${from + 1}-${to} of ${transacciones?.length}`}

                numberOfItemsPerPageList={optionsPerPage}
                numberOfItemsPerPage={this.state.itemsPerPage}
                onItemsPerPageChange={item => this.setState({ itemsPerPage: item })}
                selectPageDropdownLabel={'Rows per page'}

              />
              <Text></Text>
            </DataTable> :
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
          }

        </Surface>
      // </ScrollView>
    )
  }
}
const TableRecargas = withTracker(async (navigation) => {
  Meteor.subscribe('ventasRecharge', { userId: Meteor.userId() });
  const ventas =  VentasRechargeCollection.find({ userId: Meteor.userId() }, { sort: { createdAt: -1 } }).fetch();
  var transaccionesSubs = null
  var transacciones = []
    
    const idsCarritos = ventas?.flatMap(v =>
      (v.producto?.carritos || []).map(c => c._id)
    ) || [];

    transaccionesSubs =  Meteor.subscribe('transacciones', { externalId: { $in: idsCarritos } });
    transacciones =   TransaccionRecargasCollection.find({ externalId: { $in: idsCarritos } },{ sort: { creationDate: -1 } }).fetch();
    
  
  //  console.log(myTodoTasks);
  return {
    navigation,
    transacciones,
    ready: (transaccionesSubs && transaccionesSubs.ready() || false),
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: { height: 40, backgroundColor: '#f1f8ff' },
  text: { margin: 6 }
});

export default TableRecargas;
