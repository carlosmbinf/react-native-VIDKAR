/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useRef, useEffect, useState} from 'react';
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
 } from 'react-native-paper';
 // import * as axios from 'axios';
 import Meteor, {Mongo, withTracker} from '@meteorrn/core';
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

const optionsPerPage = [20, 30, 40];

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
     page : 0,
     itemsPerPage : optionsPerPage[0]
     };
     
     // console.log(this.props.myTodoTasks);
     // const isDarkMode = useColorScheme() === 'dark';
     // const [data, setData] = ;
     // const [isLoading, setLoading] = useState(true);
     // const carouselRef = useRef(null);
   }
   render() {
     const { user, ready, navigation } = this.props;
     console.log("DATA:" + JSON.stringify(myTodoTasks));

     const from = this.state.page * this.state.itemsPerPage;
     let myTodoTasks = Logs.find({}, { skip: from, limit: 50 }).fetch()

  const to = Math.min((this.state.page + 1) * this.state.itemsPerPage, myTodoTasks.length);


     const backgroundStyle = {
      // backgroundColor: this.state.isDarkMode ? Colors.darker : Colors.lighter,
      minHeight: (screenHeight - 80),
    };

     return (
       <Surface >
         <ScrollView style={backgroundStyle}>
         {/* {ready ? myTodoTasks.map((element,index) => <Text>{element._id} ----------- {index}</Text>
           )
         
           :
           <Text>CARGANDO...</Text>} */}

          { ready ? <DataTable>
             <DataTable.Header>
               <DataTable.Title>Type</DataTable.Title>
               <DataTable.Title>Admin</DataTable.Title>
               <DataTable.Title>User</DataTable.Title>
               <DataTable.Title>Mensaje</DataTable.Title>
               <DataTable.Title>Fecha</DataTable.Title>
             </DataTable.Header>


             {myTodoTasks.map((element,index) => 
             <DataTable.Row>
               <DataTable.Cell>{element.type}</DataTable.Cell>
               <DataTable.Cell>{element.userAdmin}</DataTable.Cell>
               <DataTable.Cell>{element.userAfectado}</DataTable.Cell>
               <DataTable.Cell>{element.message}</DataTable.Cell>
               <DataTable.Cell>{element.createdAt.toString()}</DataTable.Cell>
             </DataTable.Row> )}

             <DataTable.Pagination
               page={this.state.page}
               numberOfPages={Math.ceil(myTodoTasks.length / this.state.itemsPerPage)}
               onPageChange={(page) => this.setState({ page: page })}
               label={`${from + 1}-${to} of ${myTodoTasks.length}`}
               
               numberOfItemsPerPageList={optionsPerPage}
               numberOfItemsPerPage={this.state.itemsPerPage}
               onItemsPerPageChange={item => this.setState({ itemsPerPage: item })}
               sh
               selectPageDropdownLabel={'Rows per page'}

             />
           </DataTable>:
           <Text>CARGANDO...</Text>
   }
           </ScrollView>
       </Surface>
     )
   }
 }
 const LogsList = withTracker(navigation => {
   //  console.log(user.user)
   const handle2 = Meteor.subscribe('logs', {}, { limit: 30 }).ready();
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
 