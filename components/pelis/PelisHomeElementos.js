/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useRef, useEffect, useState} from 'react';
 // import type {Node} from 'react';
 import {Provider as PaperProvider, Title, Surface} from 'react-native-paper';
 import Carousel, {ParallaxImage} from 'react-native-snap-carousel';
 // import * as axios from 'axios';
 import Meteor, {Mongo, withTracker} from '@meteorrn/core';
 import Header from 'react-native-custom-header';
 
 import {
   SafeAreaView,
   ScrollView,
   StatusBar,
   StyleSheet,
   Text,
   useColorScheme,
   View,
   ImageBackground,
   ActivityIndicator,
   FlatList,
   VirtualizedList,
   Dimensions,
   Platform,
   Button,
   RefreshControl,
 } from 'react-native';
 
 import {
   Colors,
   DebugInstructions,
   LearnMoreLinks,
   ReloadInstructions,
 } from 'react-native/Libraries/NewAppScreen';
 import PelisCard from './PelisCard';
 import Loguin from '../loguin/Loguin';
 
 import {PelisRegister} from '../collections/collections'
 
 // import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
 // const Tab = createMaterialBottomTabNavigator();
 
 const {width: screenWidth} = Dimensions.get('window');
 // Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL
 
 class MyApp extends React.Component {
   componentDidMount() {
   }
 
   componentWillUnmount() {
   }
   constructor(props) {
     // const handle = Meteor.subscribe('pelis');
     // const myTodoTasks = PelisRegister.find({}).fetch();
     // console.log(props.myTodoTasks);
     super(props);
     this.state = {
       count: 0,
       isDarkMode: useColorScheme === 'dark',
       backgroundColor: '#2a323d',
       // data: props.myTodoTasks,
       // loading: props.loading,
       carouselRef: null,
       refreshing: false,
     };
 
     // const isDarkMode = useColorScheme() === 'dark';
     // const [data, setData] = ;
     // const [isLoading, setLoading] = useState(true);
     // const carouselRef = useRef(null);
   }
   render() {
     const {loading, navigation, myTodoTasks, clasificacion} = this.props;
     var ScreenHeight = Dimensions.get('window').height;
     const styles = StyleSheet.create({
       container: {
         flex: 1,
         flexDirection: 'column',
         paddingBottom: 30
         // height: ScreenHeight,
         // backgroundColor: this.state.backgroundColor,
       },
       viewFullHeight: {
         minHeight: ScreenHeight,
       },
       item: {
         width: screenWidth - 60,
         height: screenWidth - 60,
       },
       imageContainer: {
         flex: 1,
         marginBottom: Platform.select({ios: 0, android: 1}), // Prevent a random Android rendering issue
         backgroundColor: 'white',
         borderRadius: 8,
       },
       image: {
         ...StyleSheet.absoluteFillObject,
         resizeMode: 'cover',
       },
     });
     // let isDarkMode = {
     //   return (useColorScheme() === 'dark');
     // };
     const backgroundStyle = {
       // backgroundColor: '#2a323d',
     };
     const renderItem = ({item, index}, parallaxProps) => {
       // console.log(item);
       // console.log(index);
       return (
         <View>
           <ParallaxImage
             source={{uri: item.urlBackground}}
             containerStyle={styles.imageContainer}
             style={styles.image}
             parallaxFactor={0.4}
             {...parallaxProps}
           />
           <PelisCard key={item._id} navigation={navigation} item={item} />
         </View>
       );
     };
 
 
     return (
       <View>
           {loading ? (
             <View
               style={{
                 flex: 1,
                 flexDirection: 'column',
                 height: ScreenHeight,
                 // backgroundColor: '#2a323d',
                 justifyContent: 'center',
               }}>
               <ActivityIndicator size="large" color="#3f51b5" />
             </View>
           ) : (
             <>
             {myTodoTasks&&<Surface style={styles.container}>
             <View style={{width: '100%', alignItems: 'center'}}>
               <Title
                 style={{
                   paddingTop: 30,
                   // paddingLeft: 25,
                   fontSize: 30,
                 }}>
                 {clasificacion}
               </Title>
             </View>
 
             <Carousel
               layout={'default'}
               ref={this.state.carouselRef}
               sliderWidth={screenWidth}
               sliderHeight={400}
               itemWidth={screenWidth - 100}
               data={myTodoTasks}
               renderItem={renderItem}
               hasParallaxImages={true}
               // getItem
               // layoutCardOffset={10}
             />
           </Surface>}
           
           </>
            
             
           )}
 
           {/* <Text>
           {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
         </Text> */}
       </View>
     );
   }
 }
 const PelisHomeElementos = withTracker(props => {
  var handle = Meteor.subscribe('pelis',{},{fields:{
    _id:1,
    nombrePeli: 1,
    urlBackground: 1,
    descripcion: 1,
    year: 1,
    urlTrailer: 1,
    clasificacion: 1,
    mostrar: 1,
    subtitulo:1
  }});;
  const myTodoTasks = PelisRegister.find((props.clasificacion == "All" ?{ mostrar: "true" }:{ mostrar: "true", clasificacion: props.clasificacion }),{fields:{
    _id:1,
    nombrePeli: 1,
    urlBackground: 1,
    descripcion: 1,
    year: 1,
    urlTrailer: 1,
    clasificacion: 1,
    mostrar: 1,
    subtitulo:1
  }}).fetch();

  console.log(props.clasificacion)

   return {
     navigation: props.navigation,
     myTodoTasks,
     loading: !handle.ready(),
     clasificacion: props.clasificacion
   };
 })(MyApp);
 
 export default PelisHomeElementos;
 