import React from 'react';
import { View } from 'react-native';
import { Card, Title, Text, Button, Surface, Switch } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import { StyleSheet } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import Meteor from '@meteorrn/core';

const UserVPNDataCard = ({
  item,
  preciosVPNlist,
  handleReiniciarConsumoVPN,
  handleVPNStatus,
  state,
  setState,
  screenWidth,
  moment,
}) => {
  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Datos VPN'}</Title>
          {Meteor.user().profile &&
            Meteor.user().profile.role == 'admin' && (
              <View style={{flexDirection: 'row'}}>
                <Text style={(styles.data, {justifyContent: 'center', paddingRight: 10})}>
                  Por Tiempo:
                </Text>
                <Switch
                  value={item.vpnisIlimitado}
                  onValueChange={() => {
                    Meteor.users.update(item._id, {
                      $set: {
                        vpnisIlimitado: !item.vpnisIlimitado,
                      },
                    });
                  }}
                />
              </View>
          )}

          <View style={styles.offerContainer}>
            <Text style={styles.centerText}>OFERTA / LIMITE:</Text>
            {item.vpnisIlimitado ? (
              <>
                <Text style={styles.centerText}>
                  {item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Ninguna'}
                </Text>
                <Text style={styles.centerText}>
                  {item.vpnfechaSubscripcion
                    ? `${item.vpnfechaSubscripcion.getUTCFullYear()}-${
                        item.vpnfechaSubscripcion.getUTCMonth() + 1
                      }-${item.vpnfechaSubscripcion.getUTCDate()}`
                    : 'Fecha Limite sin especificar'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.centerText}>
                  {item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Ninguna'}
                </Text>
                <Text style={styles.centerText}>
                  {item.vpnmegas
                    ? item.vpnmegas + ' MB => ' + (item.vpnmegas / 1024).toFixed(2) + ' GB'
                    : 'No se ha especificado aun el Límite de megas'}
                </Text>
              </>
            )}
          </View>

          <View style={styles.consumptionContainer}>
            <Text style={styles.centerText}>Consumo:</Text>
            <Text style={styles.centerText}>
              {`${item.vpnMbGastados ? (item.vpnMbGastados / 1000000).toFixed(2) : 0} MB -> ${item.vpnMbGastados ? (item.vpnMbGastados / 1000000000).toFixed(2) : 0} GB`}
            </Text>
          </View>

          {item.vpnisIlimitado ? (
            <Surface style={styles.calendarContainer}>
              <CalendarPicker
                format="YYYY-MM-DD"
                minDate={new Date()}
                selectedDayColor="#7300e6"
                selectedDayTextColor="#FFFFFF"
                mode="date"
                width={screenWidth - 100}
                selectedStartDate={item.vpnfechaSubscripcion}
                onDateChange={date => {
                  date && Meteor.users.update(item._id, {
                    $set: {
                      vpnfechaSubscripcion: new Date(moment.utc(date).startOf('day').add(4, 'hours')),
                      vpnplus: true,
                      vpn2mb: true,
                    },
                  });
                }}
              />
            </Surface>
          ) : (
            // Aquí iría el código del dropdown para selección de paquetes VPN
            <Surface style={styles.dropdownContainer}>
              {/* ... código del dropdown ... */}
            </Surface>
          )}

          <View style={styles.statusContainer}>
            <Text style={styles.centerText}>Estado:</Text>
            <View style={styles.centerText}>
              {Meteor.user().profile.role == 'admin' ? (
                <>
                  <View style={{padding: 10}}>
                    <Button
                      icon="send"
                      disabled={item.vpnMbGastados ? false : true}
                      mode="contained"
                      onPress={handleReiniciarConsumoVPN}>
                      REINICIAR CONSUMO!!!
                    </Button>
                  </View>
                  <View style={{padding: 10}}>
                    <Button
                      mode="contained"
                      color={item.vpn && 'red'}
                      onPress={handleVPNStatus}>
                      {!item.vpn ? 'Habilitar' : 'Desabilitar'}
                    </Button>
                  </View>
                </>
              ) : item.vpn ? (
                <Text>Habilitado</Text>
              ) : (
                <Text>Desabilitado</Text>
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  cards: {
    marginBottom: 20,
    borderRadius: 20,
  },
  element: {
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    paddingBottom: 5,
  },
  data: {
    padding: 3,
  },
  centerText: {
    paddingTop: 10,
    textAlign: 'center',
    paddingBottom: 10,
  },
  offerContainer: {
    width: '100%',
    borderRadius: 20,
    marginTop: 10,
  },
  consumptionContainer: {
    width: '100%',
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  calendarContainer: {
    width: '100%',
    elevation: 12,
    borderRadius: 20,
    marginTop: 20,
    backgroundColor: '#607d8b',
    padding: 20,
  },
  dropdownContainer: {
    width: '100%',
    elevation: 3,
    borderRadius: 20,
    padding: 10,
  },
  statusContainer: {
    width: '100%',
    borderRadius: 20,
    marginTop: 10,
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 22,
  },
});

export default UserVPNDataCard;
