import React from 'react';
import { View } from 'react-native';
import { Card, Title, Text, Button, Surface, Switch } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import { StyleSheet } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import Meteor from '@meteorrn/core';

const UserProxyDataCard = ({ 
  item, 
  precioslist, 
  handleReiniciarConsumo, 
  addVenta,
  state,
  setState,
  screenWidth,
  moment
}) => {
  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Datos del Proxy'}</Title>
          {Meteor.user().profile &&
            Meteor.user().profile.role == 'admin' && (
              <View style={{flexDirection: 'row'}}>
                <Text style={(styles.data, {justifyContent: 'center', paddingRight: 10})}>
                  Por Tiempo:
                </Text>
                <Switch
                  value={item.isIlimitado}
                  onValueChange={() => {
                    Meteor.users.update(item._id, {
                      $set: {
                        isIlimitado: !item.isIlimitado,
                      },
                    });
                  }}
                />
              </View>
          )}

          {item.isIlimitado ? (
            <>
              <View style={styles.dateContainer}>
                <Text style={styles.centerText}>Fecha Limite:</Text>
                <Text style={styles.centerText}>
                  {item.fechaSubscripcion
                    ? moment.utc(item.fechaSubscripcion).format('DD-MM-YYYY')
                    : 'Fecha Límite sin especificar'}
                </Text>
              </View>

              <View style={styles.consumptionContainer}>
                <Text style={styles.centerText}>Consumo:</Text>
                <Text style={styles.centerText}>
                  {item.megasGastadosinBytes
                    ? (item.megasGastadosinBytes / 1000000).toFixed(2) + ' MB'
                    : '0 MB'}
                </Text>
              </View>

              <Surface style={styles.calendarContainer}>
                <CalendarPicker
                  minDate={new Date()}
                  selectedDayColor="#7300e6"
                  selectedDayTextColor="#FFFFFF"
                  selectedStartDate={item.fechaSubscripcion}
                  width={screenWidth - 100}
                  onDateChange={date => {
                    date && Meteor.users.update(item._id, {
                      $set: {
                        fechaSubscripcion: new Date(moment.utc(date).startOf('day').add(4, 'hours')),
                      },
                    });
                  }}
                />
              </Surface>
            </>
          ) : (
            // ... resto del código para modo por megas ...
            <View style={{paddingTop: 20}}>
              {/* ... código existente ... */}
            </View>
          )}

          <View style={styles.statusContainer}>
            <Text style={styles.centerText}>Estado del Proxy:</Text>
            <View style={styles.centerText}>
              {Meteor.user().profile.role == 'admin' ? (
                <>
                  <View style={{padding: 10}}>
                    <Button
                      disabled={item.megasGastadosinBytes ? false : true}
                      mode="contained"
                      onPress={handleReiniciarConsumo}>
                      REINICIAR CONSUMO!!!
                    </Button>
                  </View>
                  <View style={{padding: 10}}>
                    <Button
                      mode="contained"
                      color={!item.baneado && 'red'}
                      onPress={addVenta}>
                      {item.baneado ? 'Habilitar' : 'Desabilitar'}
                    </Button>
                  </View>
                </>
              ) : item.baneado ? (
                <Text>Desabilitado</Text>
              ) : (
                <Text>Habilitado</Text>
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
  dateContainer: {
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
    borderRadius: 20,
    elevation: 12,
    marginTop: 20,
    backgroundColor: '#607d8b',
    padding: 20,
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

export default UserProxyDataCard;
