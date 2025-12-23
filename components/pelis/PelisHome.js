/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useRef, useEffect, useState } from 'react';
// import type {Node} from 'react';
import { Provider as PaperProvider, Title, Surface, Banner, Searchbar, Appbar } from 'react-native-paper';
// import Carousel, {ParallaxImage} from 'react-native-snap-carousel';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import Header from 'react-native-custom-header';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

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

import { PelisRegister } from '../collections/collections'
import PelisHomeElementos from './PelisHomeElementos';
import MainPelis from './MainPelis';
import MenuHeader from '../Header/MenuHeader';

const { width: screenWidth } = Dimensions.get('window');

// Componente funcional que envuelve la lógica
const MyApp = ({ navigation, loading, myTodoTasks }) => {
  const inset = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  const [state, setState] = useState({
    count: 0,
    isDarkMode,
    backgroundColor: '#2a323d',
    carouselRef: null,
    refreshing: false,
    filtro: "",
    visibleFilter: false,
    activeBanner: false,
  });

  const ScreenHeight = Dimensions.get('window').height;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      padding: 30
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
      marginBottom: Platform.select({ ios: 0, android: 1 }),
      backgroundColor: 'white',
      borderRadius: 8,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      resizeMode: 'cover',
    },
  });

  const onRefresh = () => {
    setState(prev => ({ ...prev, refreshing: true }));
    setTimeout(() => {
      setState(prev => ({ ...prev, refreshing: false }));
    }, 500);
  };

  return (
    <View>
      <Appbar style={{ backgroundColor: '#3f51b5', height: inset.top + 50, justifyContent: 'center', paddingTop: inset.top }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: 'center' }}>
          <Appbar.BackAction
            color='red'
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Appbar.Action
              icon="magnify"
              color={'white'}
              disabled={state.activeBanner}
              onPress={() => setState(prev => ({ ...prev, activeBanner: true }))}
            />
            <MenuHeader navigation={navigation} />
          </View>

        </View>
      </Appbar>
      <Banner
        visible={state.activeBanner}
        actions={[
          {
            label: 'cerrar',
            onPress: () => setState(prev => ({ ...prev, activeBanner: false })),
          },
        ]}
      >
        <View style={{ width: screenWidth - 30 }}>
          <Searchbar
            style={{ borderRadius: 20 }}
            placeholder="Nombre, año o extension"
            autoFocus
            onChangeText={text => setState(prev => ({ ...prev, filtro: text }))}
            value={state.filtro}
          />
        </View>
      </Banner>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <>
          <MainPelis
            navigation={navigation}
            clasificacion="All"
            search={state.filtro}
          />

          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Sci-Fi"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Action"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Adventure"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Thriller"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Crime"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Mystery"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Horror"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Comedy"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <MainPelis
              navigation={navigation}
              clasificacion="Drama"
              search={state.filtro}
            />
          )}
          {!state.refreshing && (
            <View style={state.activeBanner ? { marginBottom: 150 } : { marginBottom: 20 }}>
              <MainPelis
                navigation={navigation}
                clasificacion="Romance"
                search={state.filtro}
              />
            </View>
          )}
        </>
      </ScrollView>
    </View>
  );
};
const PelisHome = withTracker(navigation => {

  return {
    navigation
  };
})(MyApp);

export default PelisHome;
