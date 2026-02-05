/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useState } from 'react';
import {
  Avatar,
  List,
  Provider as PaperProvider,
  Text,
  Surface,
  Badge,
  Appbar,
  Banner,
  IconButton,
  ActivityIndicator,
  ProgressBar,
  Chip,
  Card
} from 'react-native-paper';
import Meteor, { withTracker } from '@meteorrn/core';

import Drawer from 'react-native-drawer'

import {
  StyleSheet,
  useColorScheme,
  View,
  Dimensions,
  Platform,
  Alert,
  TextInput,
  StatusBar,
} from 'react-native';

import { Online } from '../collections/collections'
import DrawerOptionsAlls from '../drawer/DrawerOptionsAlls';
import { useSafeAreaInsets, withSafeAreaInsets } from 'react-native-safe-area-context';
import MenuHeader from '../Header/MenuHeader';
import { ScrollView } from 'react-native-gesture-handler';
import UserAvatar from './UserAvatar';

const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

class MyApp extends React.Component {
  componentDidMount() {
  }

  componentWillUnmount() {
  }
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
      isDarkMode: useColorScheme == 'dark',
      data: this.props.myTodoTasks,
      carouselRef: null,
      refreshing: false,
      userName: "",
      firstName: "",
      activeBanner: false,
      drawer: false
    };
    !Meteor.userId() && navigation.navigation.navigate("Loguin")
  }
  render() {
    const { loading, navigation, myTodoTasks,isConnectedProxyOrWeb, insets } = this.props;
    const backgroundStyle = {
      minHeight: (ScreenHeight),
    };
    function filterUsers(user) {
      return user.username == this.state.userName
    }

    const renderFilter = () => (
      <Banner
        visible={this.state.activeBanner}
        actions={[{
          label: "Ocultar Filtro",
          onPress: () => this.setState({ activeBanner: false })
        }]}
        style={{
          alignItems: 'center',
          justifyContent: 'center', margin: 0
        }}
      >
        <View
          style={{
            flexDirection: 'column',
            backgroundColor: '',
            alignItems: 'center',
            justifyContent: 'center',
            width: screenWidth - 40,
          }}>

          <TextInput
            autoFocus={true}
            focusable={true}
            value={this.state.userName}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={textSearch => {
              this.setState({
                userName: textSearch,
                firstName: '',
              });
            }}
            status="info"
            placeholder="Buscar por usuario"
            style={{
              borderRadius: 30,
              borderColor: 'black',
              borderWidth: 1,
              // backgroundColor: '',
              width: '100%',
              padding: 10,
              height: 45,
            }}
            textStyle={{ color: '#000' }}
          />
        </View>
      </Banner>

    );

    const Item = item => {
      // Constantes para conversiones binarias (mismas que los cards)
      const BYTES_IN_MB_BINARY = 1048576;
      const BYTES_IN_GB_BINARY = 1073741824;
      const clamp01 = (n) => Math.max(0, Math.min(1, n));
      const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);

      // Estados de servicios
      const vpnActivo = item.vpn === true;
      const proxyActivo = item.baneado === false;
      const vpnPorMegas = !item.vpnisIlimitado && item.vpnmegas > 0;
      const proxyPorMegas = !item.isIlimitado && item.megas > 0;

      // Cálculos de consumo VPN
      const vpnConsumidoBytes = item.vpnMbGastados || 0;
      const vpnConsumidoMB = vpnConsumidoBytes / BYTES_IN_MB_BINARY;
      const vpnConsumidoGB = vpnConsumidoBytes / BYTES_IN_GB_BINARY;
      const vpnLimiteMB = Number(item.vpnmegas || 0);
      const vpnProgress = vpnPorMegas ? clamp01(vpnConsumidoMB / vpnLimiteMB) : 0;

      // Cálculos de consumo Proxy
      const proxyConsumidoBytes = item.megasGastadosinBytes || 0;
      const proxyConsumidoMB = proxyConsumidoBytes / BYTES_IN_MB_BINARY;
      const proxyConsumidoGB = proxyConsumidoBytes / BYTES_IN_GB_BINARY;
      const proxyLimiteMB = Number(item.megas || 0);
      const proxyProgress = proxyPorMegas ? clamp01(proxyConsumidoMB / proxyLimiteMB) : 0;

      const descripcion = (
        <View style={styles.itemDescription}>
          {/* Información del usuario */}
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.username}</Text>
          </View>

          <View style={styles.servicesContainer}>
            {/* VPN Section */}
            <View style={styles.serviceSection}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceLeft}>
                  <Chip
                    mode="flat" 
                    compact
                    icon={vpnActivo ? 'shield-check' : 'shield-off'}
                    style={[
                      styles.serviceChip, 
                      { 
                        backgroundColor: vpnActivo ? '#e8f5e9' : '#f5f5f5',
                        opacity: vpnActivo ? 1 : 0.7
                      }
                    ]}
                    textStyle={{ 
                      color: vpnActivo ? '#2e7d32' : '#666', 
                      fontSize: 10, 
                      fontWeight: '600' 
                    }}
                  >
                    VPN
                  </Chip>
                  {!vpnActivo && (
                    <Text style={styles.inactiveLabel}>Inactivo</Text>
                  )}
                </View>
                
                {vpnActivo && (
                  <Text style={styles.consumoText}>
                    {vpnConsumidoGB.toFixed(1)} GB
                    {vpnPorMegas && ` / ${formatGB(vpnLimiteMB)} GB`}
                    {item.vpnisIlimitado && ' (∞)'}
                  </Text>
                )}
              </View>
              
              {vpnActivo && vpnPorMegas && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressWrapper}>
                    <ProgressBar 
                      progress={vpnProgress} 
                      color={vpnProgress > 0.8 ? '#FF5722' : vpnProgress > 0.6 ? '#FF9800' : '#4CAF50'}
                      style={styles.progressBar}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(vpnProgress * 100)}%</Text>
                </View>
              )}
            </View>

            {/* Proxy Section */}
            <View style={styles.serviceSection}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceLeft}>
                  <Chip
                    mode="flat"
                    compact
                    icon={proxyActivo ? 'wifi-check' : 'wifi-off'}
                    style={[
                      styles.serviceChip, 
                      { 
                        backgroundColor: proxyActivo ? '#e3f2fd' : '#f5f5f5',
                        opacity: proxyActivo ? 1 : 0.7
                      }
                    ]}
                    textStyle={{ 
                      color: proxyActivo ? '#1565c0' : '#666', 
                      fontSize: 10, 
                      fontWeight: '600' 
                    }}
                  >
                    PROXY
                  </Chip>
                  {!proxyActivo && (
                    <Text style={styles.inactiveLabel}>Inactivo</Text>
                  )}
                </View>
                
                {proxyActivo && (
                  <Text style={styles.consumoText}>
                    {proxyConsumidoGB.toFixed(1)} GB
                    {proxyPorMegas && ` / ${formatGB(proxyLimiteMB)} GB`}
                    {item.isIlimitado && ' (∞)'}
                  </Text>
                )}
              </View>
              
              {proxyActivo && proxyPorMegas && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressWrapper}>
                    <ProgressBar 
                      progress={proxyProgress} 
                      color={proxyProgress > 0.8 ? '#FF5722' : proxyProgress > 0.6 ? '#FF9800' : '#1E88E5'}
                      style={styles.progressBar}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(proxyProgress * 100)}%</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );

      return (
        <Surface
          elevation={5}
          key={'Card_' + item._id}
          style={styles.itemCard}>
          <List.Item
          style={{borderRadius: 12}}
            // borderless={true}
            key={'Item_' + item._id}
            onPress={() => {
              navigation.navigation.navigate('User', {item: item._id});
            }}
            title={item && item.profile.firstName + ' ' + item.profile.lastName}
            description={descripcion}
            left={props => {
              // Determinar tipo de conexión
              const hasWebConnection = isConnectedProxyOrWeb &&
                isConnectedProxyOrWeb.length > 0 &&
                isConnectedProxyOrWeb.filter(
                  online => online.userId && online.userId == item._id && online.hostname != null
                ).length > 0;
              
              const hasProxyConnection = isConnectedProxyOrWeb &&
                isConnectedProxyOrWeb.length > 0 &&
                isConnectedProxyOrWeb.filter(
                  online => online.userId && online.userId == item._id && !online.hostname
                ).length > 0;
              
              const hasVpnConnection = item.vpnplusConnected || item.vpn2mbConnected;
              
              const isConnected = hasWebConnection || hasProxyConnection || hasVpnConnection;
              const connectionType = hasWebConnection ? 'web' : hasProxyConnection ? 'proxy' : 'vpn';

              return (
                <View style={styles.avatarContainer}>
                  <UserAvatar 
                    user={item}
                    isConnected={isConnected}
                    connectionType={connectionType}
                    size={50}
                  />
                </View>
              );
            }}
            right={props => {
              return (
                <View style={styles.rightContainer}>
                  {item.idtelegram && (
                    <IconButton
                      loading={true}
                      icon={
                        item.notificarByTelegram
                          ? 'cellphone-message'
                          : 'cellphone-message-off'
                      }
                      color={item.notificarByTelegram ? 'black' : 'red'}
                      mode="contained"
                      size={30}
                      onPress={() => {
                        Meteor.call(
                          'changeNotificacionTelegram',
                          item._id,
                          (error, result) => {
                            error && alert(error.message);
                          },
                        );
                      }}
                    />
                  )}
                </View>
              );
            }}
          />
        </Surface>
      );
    };


    const admins = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => {
      if (!user || !user.profile || user.profile.role !== "admin") return false;
      
      const searchTerm = this.state.userName.toLowerCase().trim();
      if (!searchTerm) return true; // Si no hay término de búsqueda, mostrar todos
      
      const username = user.username ? user.username.toLowerCase() : "";
      const firstName = user.profile?.firstName ? user.profile.firstName.toLowerCase() : "";
      const lastName = user.profile?.lastName ? user.profile.lastName.toLowerCase() : "";
      
      return username.includes(searchTerm) || 
             firstName.includes(searchTerm) || 
             lastName.includes(searchTerm);
    }).map(element => Item(element))
    const users = () => JSON.parse(JSON.stringify(myTodoTasks)).filter(user => {
      if (!user || !user.profile || user.profile.role !== "user") return false;
      
      const searchTerm = this.state.userName.toLowerCase().trim();
      if (!searchTerm) return true; // Si no hay término de búsqueda, mostrar todos
      
      const username = user.username ? user.username.toLowerCase() : "";
      const firstName = user.profile?.firstName ? user.profile.firstName.toLowerCase() : "";
      const lastName = user.profile?.lastName ? user.profile.lastName.toLowerCase() : "";
      
      return username.includes(searchTerm) || 
             firstName.includes(searchTerm) || 
             lastName.includes(searchTerm);
    }).map(element => Item(element))

    const drawerStyles = {
      drawer: { shadowColor: 'black', shadowOpacity: 0, shadowRadius: 3 },
      main: { paddingLeft: 0 },
    }
    return (
      <>
        {loading ? (
          <>
            <Surface style={backgroundStyle}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  height: '100%',
                  // backgroundColor: '#2a323d',
                  justifyContent: 'center',
                }}>
                <ActivityIndicator size="large" color="#3f51b5" />
              </View>
            </Surface>
          </>
        ) : (
          Meteor.user() && Meteor.user().profile && Meteor.user().profile.role == "admin" ? (
            <>
              <Drawer
                type="overlay"
                open={this.state.drawer}
                content={<DrawerOptionsAlls navigation={navigation} />}
                tapToClose={true}
                // captureGestures="closed"
                // acceptPanOnDrawer={false}
                // acceptPan={true}
                onClose={() => this.setState({ drawer: false })}
                elevation={12}
                side="left"
                openDrawerOffset={0.2} // 20% gap on the right side of drawer
                panCloseMask={0.2}
                closedDrawerOffset={0}
                styles={drawerStyles}
                tweenHandler={(ratio) => ({
                  main: { opacity: ((2 - ratio) / 2) }
                })}
              >

                  <Appbar style={{ backgroundColor: '#3f51b5', height: insets.top + 50, justifyContent: 'center', paddingTop: insets.top  }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>

                      <View style={{ flexDirection: "row" }}>
                        <Appbar.BackAction
                          color='red'
                          onPress={() => {
                            if (navigation.navigation.canGoBack()) {
                              navigation.navigation.goBack();
                            }
                          }}
                        />
                        <Appbar.Action icon="menu" color={"white"} onPress={() => this.setState({ drawer: !this.state.drawer })} />

                      </View>
                      <View style={{ flexDirection: "row" }}>
                        <Appbar.Action icon="magnify" color={"white"} disabled={this.state.activeBanner} onPress={() => this.setState({ activeBanner: true })} />

                        <MenuHeader
                          navigation={navigation.navigation}
                        />
                      </View>
                    </View>
                  </Appbar>
                <Surface>
                  {renderFilter()}
                </Surface>

                <ScrollView >
                  <Surface style={backgroundStyle}>
                    <List.Accordion
                      title="Administradores"
                    >
                      {admins()}
                    </List.Accordion>
                    <List.Accordion
                      title="Usuarios">
                      {users()}
                    </List.Accordion>
                  </Surface>
                </ScrollView>
              </Drawer>

            </>
          ) : <Surface style={backgroundStyle}><Text style={{ textAlign: "center", justifyContent: "center", fontSize: 25, fontWeight: 'bold', paddingTop: 10 }}>Sin Acceso</Text></Surface>
        )}

      </>
    );
  }
}
const UserHome = withTracker(navigation => {
  const handle = Meteor.subscribe('user', ((Meteor.user() && Meteor.user().username == "carlosmbinf") ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }), { fields: { username: 1, profile: 1, picture: 1, vpnMbGastados: 1, megasGastadosinBytes: 1, idtelegram: 1, notificarByTelegram:1, vpnplusConnected:1, vpn2mbConnected:1, vpn: 1, baneado: 1, vpnisIlimitado: 1, isIlimitado: 1, vpnmegas: 1, megas: 1 } });
  const handleOnline =  Meteor.subscribe("conexiones",{},{fields:{userId:1,hostname:1}})
  let myTodoTasks = Meteor.users.find(((Meteor.user() && Meteor.user().username == "carlosmbinf") ? {} : { $or: [{ "bloqueadoDesbloqueadoPor": Meteor.userId() }, { "bloqueadoDesbloqueadoPor": { $exists: false } }, { "bloqueadoDesbloqueadoPor": { $in: [""] } }] }), { sort: { "vpnMbGastados": -1, "megasGastadosinBytes": -1, 'profile.firstName': 1, 'profile.lastName': 1 }, fields: { username: 1, profile: 1, picture: 1, vpnMbGastados: 1, megasGastadosinBytes: 1, idtelegram: 1 , notificarByTelegram:1, vpnplusConnected:1, vpn2mbConnected:1, vpn: 1, baneado: 1, vpnisIlimitado: 1, isIlimitado: 1, vpnmegas: 1, megas: 1} }).fetch();

  let isConnectedProxyOrWeb = Online.find({},{fields:{userId:1,hostname:1}}).fetch()
  
  return {
    navigation,
    myTodoTasks,
    loading: !handle.ready() && !handleOnline.ready(),
    isConnectedProxyOrWeb
  };
})(withSafeAreaInsets(MyApp));

var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container2: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    marginHorizontal: 16,
  },
  item2: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
  },
  header: {
    fontSize: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    height: ScreenHeight,
    backgroundColor: '#2a323d',
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
  data: {},
  // Nuevos estilos para items profesionales
  itemCard: {
    margin: 10, 
    borderRadius: 12,
    backgroundColor: '#ffffff',
    // Añadir sombra adicional en iOS
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  itemDescription: {
    marginTop: 2,
    paddingHorizontal: 4,
  },
  userInfo: {
    marginBottom: 10,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#444',
    letterSpacing: 0.2,
  },
  servicesContainer: {
    gap: 8,
  },
  serviceSection: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceChip: {
    // height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inactiveLabel: {
    fontSize: 9,
    color: '#999',
    fontStyle: 'italic',
  },
  consumoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressWrapper: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666',
    minWidth: 28,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContainer: {
    justifyContent: 'center'
  },
});

export default UserHome;
