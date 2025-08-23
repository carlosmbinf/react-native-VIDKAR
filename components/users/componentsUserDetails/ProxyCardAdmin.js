import React, {memo, useState} from 'react';
import {View, Dimensions} from 'react-native';
import {Card, Title, Text, Button, Switch, Surface} from 'react-native-paper';
import CalendarPicker from 'react-native-calendar-picker';
import {Dropdown} from 'react-native-element-dropdown';
import Meteor from '@meteorrn/core';
import {Logs} from '../../collections/collections';

const {width: screenWidth} = Dimensions.get('window');

const ProxyCardAdmin = ({
  item,
  styles,
  precioslist,
  handleReiniciarConsumo,
  addVenta,
}) => {
  if (!item) return null;
  const moment = require('moment');
  const [value, setValue] = useState(null);
  const [isFocus, setIsFocus] = useState(false);

  const renderLabel = () => {
    if (value || isFocus) {
      return (
        <Text style={[styles.label, isFocus && {color: 'blue'}]}>
          Megas • Precio
        </Text>
      );
    }
    return null;
  };

  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <View style={styles.element}>
          <Title style={styles.title}>{'Datos del Proxy'}</Title>

          <View style={{flexDirection: 'row'}}>
            <Text style={{justifyContent: 'center', paddingRight: 10}}>
              Por Tiempo:
            </Text>
            <Switch
              value={item.isIlimitado}
              onValueChange={() => {
                Meteor.users.update(item._id, {
                  $set: {isIlimitado: !item.isIlimitado},
                });
              }}
            />
          </View>

          {item.isIlimitado ? (
            <>
              <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
                <Text style={{paddingTop: 10, textAlign: 'center'}}>
                  Fecha Limite:
                </Text>
                <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                  {item.fechaSubscripcion
                    ? moment.utc(item.fechaSubscripcion).format('DD-MM-YYYY')
                    : 'Fecha Límite sin especificar'}
                </Text>
              </View>

              <View
                style={{
                  width: '100%',
                  borderRadius: 20,
                  marginTop: 10,
                  marginBottom: 10,
                }}>
                <Text style={{paddingTop: 10, textAlign: 'center'}}>
                  Consumo:
                </Text>
                <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                  {item.megasGastadosinBytes
                    ? (item.megasGastadosinBytes / 1000000).toFixed(2) + ' MB'
                    : '0 MB'}
                </Text>
              </View>

              <Surface
                style={{
                  width: '100%',
                  borderRadius: 20,
                  elevation: 12,
                  marginTop: 20,
                  backgroundColor: '#607d8b',
                  padding: 20,
                }}>
                <CalendarPicker
                  minDate={new Date()}
                  selectedDayColor="#7300e6"
                  selectedDayTextColor="#FFFFFF"
                  selectedStartDate={item.fechaSubscripcion}
                  width={screenWidth - 100}
                  onDateChange={date => {
                    if (!date) return;
                    Meteor.users.update(item._id, {
                      $set: {
                        fechaSubscripcion: new Date(
                          moment.utc(date).startOf('day').add(4, 'hours'),
                        ),
                      },
                    });
                    Logs.insert({
                      type: 'Fecha Limite Proxy',
                      userAfectado: item._id,
                      userAdmin: Meteor.userId(),
                      message:
                        'La Fecha Limite del Proxy se cambió para: ' +
                        moment.utc(new Date(date)).format('YYYY-MM-DD'),
                    });
                    if (!item.baneado) {
                      Logs.insert({
                        type: 'PROXY',
                        userAfectado: item._id,
                        userAdmin: Meteor.userId(),
                        message:
                          'Se Desactivó el PROXY porque estaba activa y cambio la fecha Limite',
                      });
                      Meteor.users.update(item._id, {
                        $set: {baneado: !item.baneado},
                      });
                    }
                  }}
                />
              </Surface>
            </>
          ) : (
            <View style={{paddingTop: 20}}>
              <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
                <Text style={{paddingTop: 10, textAlign: 'center'}}>
                  Limite de Megas por el Proxy:
                </Text>
                <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                  {item.megas
                    ? `${item.megas} MB => ${(item.megas / 1024).toFixed(2)} GB`
                    : 'No se ha especificado aun el Límite de megas'}
                </Text>
              </View>

              <View
                style={{
                  width: '100%',
                  borderRadius: 20,
                  marginTop: 10,
                  marginBottom: 10,
                }}>
                <Text style={{paddingTop: 10, textAlign: 'center'}}>
                  Consumo:
                </Text>
                <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                  {item.megasGastadosinBytes
                    ? `${(item.megasGastadosinBytes / 1024000).toFixed(
                        2,
                      )} MB => ${(item.megasGastadosinBytes / 1024000000).toFixed(2)} GB`
                    : '0 MB'}
                </Text>
              </View>

              <Surface
                style={{
                  width: '100%',
                  elevation: 3,
                  borderRadius: 20,
                  marginTop: 10,
                  padding: 10,
                }}>
                {renderLabel()}
                <Dropdown
                  style={[styles.dropdown, isFocus && {borderColor: 'blue'}]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  iconStyle={styles.iconStyle}
                  data={precioslist}
                  search
                  maxHeight={
                    precioslist.length * 50 + 70 > 220
                      ? 220
                      : precioslist.length * 50 + 70
                  }
                  labelField="label"
                  valueField="value"
                  placeholder={!isFocus ? 'Seleccione un paquete' : '...'}
                  searchPlaceholder="Search..."
                  value={value}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  onChange={opt => {
                    setValue(opt.value);
                    setIsFocus(false);
                  }}
                />
                <View style={{paddingTop: 10, paddingBottom: 10}}>
                  <Button
                    icon="send"
                    disabled={!value}
                    mode="contained"
                    onPress={async () => {
                      try {
                        await Meteor.users.update(item._id, {$set: {megas: value}});
                        await Meteor.call(
                          'registrarLog',
                          'Proxy',
                          item._id,
                          Meteor.userId(),
                          `Ha sido Cambiado el consumo de Datos del Proxy a: ${value}MB`,
                        );
                      } catch (error) {
                        console.error(error);
                      }
                    }}>
                    {`Seleccione 1 Compra`}
                  </Button>
                </View>
              </Surface>
            </View>
          )}

          <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
            <Text style={{paddingTop: 10, textAlign: 'center'}}>
              Estado del Proxy:
            </Text>
            <View style={{paddingBottom: 10, textAlign: 'center'}}>
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
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

export default memo(ProxyCardAdmin);
