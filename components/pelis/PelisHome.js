/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useRef, useEffect, useState} from 'react';
// import type {Node} from 'react';
import {Provider as PaperProvider, Title} from 'react-native-paper';
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

// import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
// const Tab = createMaterialBottomTabNavigator();

const {width: screenWidth} = Dimensions.get('window');
const MyCol = new Meteor.Collection('pelisRegister');
Meteor.connect('ws://192.168.43.230:3000/websocket'); // Note the /websocket after your URL

class MyApp extends React.Component {
  componentDidMount() {
    Orientation.lockToPortrait();
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }
  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = MyCol.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.state = {
      count: 0,
      isDarkMode: useColorScheme ==='dark',
      backgroundColor:'#2a323d',
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
        height: ScreenHeight,
        backgroundColor: this.state.backgroundColor,
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
      backgroundColor: '#2a323d',
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

    const onRefresh = () => {
      this.setState({
        // refreshing: false,
        data: MyCol.find({}).fetch(),
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
          {loading ? (
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                height: ScreenHeight,
                backgroundColor: '#2a323d',
                justifyContent: 'center',
              }}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View>
          ) : (
            <View style={styles.container}>
              <View style={{width: '100%', alignItems: 'center'}}>
                <Title
                  style={{
                    paddingTop: 50,
                    // paddingLeft: 25,
                    fontSize: 30,
                  }}>
                  Todas las Películas
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
            </View>
          )}

          {/* <Text>
          {this.state.isLoading ? '' : JSON.stringify(this.state.data)}
        </Text> */}
        </ScrollView>
      </View>
    );
  }
}
const PelisHome = withTracker(navigation => {
  const handle = Meteor.subscribe('pelis');
  const myTodoTasks = MyCol.find({}).fetch();

  return {
    navigation,
    myTodoTasks,
    loading: !handle.ready(),
  };
})(MyApp);



export default PelisHome;
