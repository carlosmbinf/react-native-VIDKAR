/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useRef, useEffect, useState} from 'react';
// import type {Node} from 'react';
import {Provider as PaperProvider, Title, Surface, Banner, Searchbar, Appbar} from 'react-native-paper';
// import Carousel, {ParallaxImage} from 'react-native-snap-carousel';
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
  Image,
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
import PelisHomeElementos from './PelisHomeElementos';
import MainPelis from './MainPelis';

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
      filtro:"",
      visibleFilter: false,
    };

    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [isLoading, setLoading] = useState(true);
    // const carouselRef = useRef(null);
  }
  render() {
    const {loading, navigation, myTodoTasks} = this.props;
    console.log('this.props', );

    // console.log('navigation', navigation.navigationGeneral.getParent());
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
        <Appbar
          style={{
            backgroundColor: '#3f51b5',
          }}>
          <View
            style={{
              flexDirection: 'row-reverse',
              justifyContent: 'space-between',
              width: '100%',
            }}>
             {/* {navigation&& navigation.navigationGeneral && navigation.navigationGeneral.getState() && navigation.navigationGeneral.getState().index > 0 && <Appbar.Action icon="arrow-left" color={"white"} onPress={() => navigation.navigationGeneral.goBack()} />} */}
                  <View style={{flexDirection: 'row'}}>
                    {/* <Appbar.Action
                    icon="account-plus"
                    color={'white'}
                    onPress={() =>
                      navigation.navigationGeneral.navigate('CreateUsers')
                    }
                    />
                    <Appbar.Action
                    icon="account"
                    color={'white'}
                    onPress={() =>
                      navigation.navigationGeneral.navigate('User', {
                      item: Meteor.users.findOne({_id: Meteor.userId()}),
                      })
                    }
                    /> */}
                    <Appbar.Action
                    icon="magnify"
                    color={'white'}
                    disabled={this.state.activeBanner}
                    onPress={() => this.setState({activeBanner: true})}
                    />
                  </View>
                  </View>
                </Appbar>
                <Banner
                  visible={this.state.activeBanner}
                  actions={[
                  {
                    label: 'cerrar',
                    onPress: () => this.setState({activeBanner: false}),
                  },
                  ]}
          // icon={({size}) => (
          //   <Image
          //     source={{
          //       uri: 'https://avatars3.githubusercontent.com/u/17571969?s=400&v=4',
          //     }}
          //     style={{
          //       width: size,
          //       height: size,
          //     }}
          //   />
          // )}
        >
          <View style={{width: screenWidth - 30}}>
            <Searchbar
            style={{borderRadius: 20}}
              placeholder="Nombre, año o extension"
              autoFocus
              onChangeText={text => this.setState({filtro: text})}
              value={this.state.filtro}
            />
          </View>
        </Banner>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={onRefresh}
            />
          }>
          <>
              <MainPelis
                navigation={navigation}
                clasificacion="All"
                search={this.state.filtro}
              />
            
            {/* <PelisHomeElementos navigation={navigation} clasificacion="All" /> */}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Sci-Fi"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Action"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Adventure"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Thriller"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Crime"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Mystery"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Horror"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Comedy"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <MainPelis
                navigation={navigation}
                clasificacion="Drama"
                search={this.state.filtro}
              />
            )}
            {!this.state.refreshing && (
              <View style={this.state.activeBanner?{marginBottom: 150}:{marginBottom: 20}}>
                <MainPelis
                navigation={navigation}
                clasificacion="Romance"
                search={this.state.filtro}
              />
              </View>
              
            )}
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
