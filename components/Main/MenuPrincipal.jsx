import Meteor, { Accounts, Mongo, withTracker, useTracker } from '@meteorrn/core';
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Card, Title, Text, Button, TextInput, Switch, Surface, IconButton, Avatar, Appbar, List } from 'react-native-paper';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Alert } from 'react-native';
import Drawer from 'react-native-drawer';
import { PreciosCollection, Logs, VentasCollection } from '../collections/collections';
import DrawerOptionsAlls from '../drawer/DrawerOptionsAlls';
import Productos from '../cubacel/Productos';
import MainPelis from '../pelis/MainPelis';
import ProxyVPNPackagesHorizontal from '../proxyVPN/ProxyVPNPackagesHorizontal';
import { BlurView } from '@react-native-community/blur';

const axios = require('axios').default;

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const MenuPrincipal = ({ navigation }) => {
  const moment = require('moment');

  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDarkMode = useColorScheme() === 'dark';

  const { user, ready } = useTracker(() => {
    const handler = Meteor.subscribe('userID', {_id:Meteor.userId()});
    if (handler.ready()) {
      return { user: Meteor.user(), ready: handler.ready() };
    }
    return {};
  });

  const drawerStyles = {
    drawer: { shadowColor: 'black', shadowOpacity: 0, shadowRadius: 3, backgroundColor: "red" },
    main: { paddingLeft: 0 },
  };

  return (
      <Drawer
        type="overlay"
        open={drawer}
        content={<DrawerOptionsAlls navigation={{ navigation }} />}
        tapToClose={true}
        onClose={() => setDrawer(false)}
        elevation={2}
        side="left"
        openDrawerOffset={0.2} // 20% gap on the right side of drawer
        panCloseMask={0.2}
        closedDrawerOffset={0}
        styles={drawerStyles}
        tweenHandler={(ratio) => ({
          main: { opacity: ((2 - ratio) / 2) }
        })}
      >
       <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType={isDarkMode ? 'black' : 'light'}
                  blurAmount={5}
                  blurRadius={5}
                />
        <Appbar style={{ backgroundColor: '#3f51b5' }}>
       
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Appbar.Action icon="menu" color={"white"} onPress={() => setDrawer(!drawer)} />
          </View>
        </Appbar>
        <Surface style={{ height: "100%" ,paddingBottom:50}}>
          <ScrollView
            style={styles.container}
            // refreshControl={
            //   <RefreshControl
            //     refreshing={loading}
            //     onRefresh={() => {
            //       setLoading(true);
            //       setTimeout(() => {
            //         setLoading(false);
            //       }, 2000);
            //     }}
            //   />
            // }
          >

            <View style={{padding: 10, backgroundColor:'#3f51b5'}} >
              {/* <Card.Content> */}
                <Text>Bienvenido al menú principal de la aplicación.</Text>
              {/* </Card.Content> */}
            </View>
            <Productos />
            {ready && user?.subscipcionPelis &&
              <MainPelis
                navigation={{ navigationGeneral: navigation }}
                clasificacion="All"
              />
            }
            <ProxyVPNPackagesHorizontal navigation={navigation} />

          </ScrollView>
        </Surface>
      </Drawer>
  );
};

export default MenuPrincipal;

const styles = StyleSheet.create({
  container: {
    minHeight: "100%"
  },
});
