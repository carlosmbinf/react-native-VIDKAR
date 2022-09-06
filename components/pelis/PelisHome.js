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
import Orientation from 'react-native-orientation';

import {PelisRegister} from '../collections/collections'
import PelisHomeElementos from './PelisHomeElementos';

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const {width: screenWidth} = Dimensions.get('window');
// Meteor.connect('ws://152.206.119.5:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  componentDidMount() {
    Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    // Orientation.unlockAllOrientations();
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
    const {loading, navigation, myTodoTasks} = this.props;
    var ScreenHeight = Dimensions.get('window').height;
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        flexDirection: 'column',
        padding:30
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

    const onRefresh = () => {
      this.setState({
        refreshing: true,
        // data: PelisRegister.find({}).fetch(),
      });
      this.setState({
        refreshing: false,
        // data: PelisRegister.find({}).fetch(),
      });
      // this.state.navigation.navigate('Home')
      // this.setState({
      //   data:
      // })
    };

    return (
      <View>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={backgroundStyle}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={onRefresh}
            />
          }>
            <>
            {/* <PelisHomeElementos navigation={navigation} clasificacion="All" /> */}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Sci-Fi" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Action" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Adventure" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Thriller" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Crime" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Mystery" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Horror" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Comedy" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Drama" />}
            {!this.state.refreshing  && <PelisHomeElementos navigation={navigation} clasificacion="Romance" />}
          </>

          {/* <Text>
          {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
        </Text> */}
        </ScrollView>
      </View>
    );
  }
}
const PelisHome = withTracker(navigation => {

  return {
    navigation
  };
})(MyApp);

export default PelisHome;
