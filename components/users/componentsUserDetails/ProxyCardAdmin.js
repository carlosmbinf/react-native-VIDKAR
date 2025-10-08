import React, { memo, useState, useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { Card, Title, Text, Button, Switch, Surface, Chip, Divider } from 'react-native-paper';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import Meteor from '@meteorrn/core';
import { Logs } from '../../collections/collections';

const { width: screenWidth } = Dimensions.get('window');

const BYTES_IN_MB_APPROX = 1024000;
const formatLimitDate = (moment, d) =>
  d ? moment.utc(d).format('DD-MM-YYYY') : 'Fecha límite sin especificar';

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

  const consumo = useMemo(() => {
    const bytes = item.megasGastadosinBytes || 0;
    return {
      mb: (bytes / BYTES_IN_MB_APPROX).toFixed(2),
      gb: (bytes / (BYTES_IN_MB_APPROX * 1000)).toFixed(2),
    };
  }, [item.megasGastadosinBytes]);

  const renderLabel = () =>
    value || isFocus ? (
      <Text style={[styles.label, isFocus && { color: 'blue' }]}>Megas • Precio</Text>
    ) : null;

  const statusActivo = !item.baneado;

  return (
    <Card elevation={12} style={styles.cards} testID="proxyAdminCard">
      <Card.Content>
        <View style={styles.element}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Title style={styles.title}>Datos del Proxy</Title>
            <Chip
              compact
              icon={statusActivo ? 'check-circle' : 'close-circle'}
              style={{ backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }}
              selectedColor="#fff"
              testID="proxyStatusChipAdmin"
            >
              {statusActivo ? 'Habilitado' : 'Deshabilitado'}
            </Chip>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <Text style={{ paddingRight: 10 }}>Por Tiempo:</Text>
            <Switch
              value={item.isIlimitado}
              onValueChange={() =>
                Meteor.users.update(item._id, { $set: { isIlimitado: !item.isIlimitado } })
              }
              testID="switchIlimitadoProxy"
            />
          </View>

          <Divider style={{ marginVertical: 8, opacity: 0.4 }} />

          {item.isIlimitado ? (
            <>
              <View style={{ width: '100%', marginTop: 6 }}>
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Fecha Límite</Text>
                <Text style={{ textAlign: 'center', marginTop: 4 }}>
                  {formatLimitDate(moment, item.fechaSubscripcion)}
                </Text>
              </View>

              <View style={{ width: '100%', marginTop: 14 }}>
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Consumo</Text>
                <Text style={{ textAlign: 'center', marginTop: 4 }}>
                  {(item.megasGastadosinBytes
                    ? (item.megasGastadosinBytes / 1000000).toFixed(2)
                    : '0.00') + ' MB'}
                </Text>
              </View>

              <Surface
                style={{
                  borderRadius: 16,
                  // elevation: 12,
                  marginTop: 20,
                  backgroundColor: '#546e7a',
                  // padding: 18,
                }}
              >
                <CalendarPicker
                  minDate={new Date()}
                  selectedDayColor="#6200ee"
                  selectedDayTextColor="#FFFFFF"
                  selectedStartDate={item.fechaSubscripcion}
                  width={320}
                  height={320}
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
                        'La Fecha Límite del Proxy se cambió para: ' +
                        moment.utc(new Date(date)).format('YYYY-MM-DD'),
                    });
                    if (!item.baneado) {
                      Logs.insert({
                        type: 'PROXY',
                        userAfectado: item._id,
                        userAdmin: Meteor.userId(),
                        message:
                          'Se desactivó el PROXY porque cambió la fecha límite',
                      });
                      Meteor.users.update(item._id, {
                        $set: { baneado: !item.baneado },
                      });
                    }
                  }}
                  testID="calendarProxy"
                />
              </Surface>
            </>
          ) : (
            <View style={{ paddingTop: 10 }}>
              <View style={{ width: '100%', marginTop: 4 }}>
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Límite de Megas</Text>
                <Text style={{ textAlign: 'center', marginTop: 4 }}>
                  {item.megas
                    ? `${item.megas} MB  →  ${(item.megas / 1024).toFixed(2)} GB`
                    : 'No configurado'}
                </Text>
              </View>

              <View style={{ width: '100%', marginTop: 14 }}>
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Consumo</Text>
                <Text style={{ textAlign: 'center', marginTop: 4 }}>
                  {consumo.mb} MB  →  {consumo.gb} GB
                </Text>
              </View>

              <Surface
                style={{
                  width: '100%',
                  elevation: 3,
                  borderRadius: 16,
                  marginTop: 14,
                  padding: 12,
                }}
              >
                {renderLabel()}
                <Dropdown
                  style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
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
                  searchPlaceholder="Buscar..."
                  value={value}
                  onFocus={() => setIsFocus(true)}
                  onBlur={() => setIsFocus(false)}
                  onChange={opt => {
                    setValue(opt.value);
                    setIsFocus(false);
                  }}
                  testID="dropdownProxy"
                />
                <View style={{ paddingTop: 10 }}>
                  <Button
                    icon="database-import"
                    disabled={!value}
                    mode="contained"
                    style={btnStyles.action}
                    onPress={async () => {
                      try {
                        await Meteor.users.update(item._id, { $set: { megas: value } });
                        await Meteor.call(
                          'registrarLog',
                          'Proxy',
                          item._id,
                          Meteor.userId(),
                          `Consumo de Proxy actualizado a: ${value}MB`,
                        );
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    testID="btnSetMegasProxy"
                  >
                    {value ? `Establecer ${value}MB` : 'Seleccione un paquete'}
                  </Button>
                </View>
              </Surface>
            </View>
          )}

          <View style={{ width: '100%', marginTop: 18 }}>
            <Text style={{ textAlign: 'center', fontWeight: '600' }}>Acciones</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                disabled={!item.megasGastadosinBytes}
                mode="outlined"
                onPress={handleReiniciarConsumo}
                style={btnStyles.action}
                icon="backup-restore"
                testID="btnReiniciarConsumoProxy"
              >
                Reiniciar Consumo
              </Button>
              <Button
                mode="contained"
                buttonColor={statusActivo ? '#c62828' : '#2e7d32'}
                onPress={addVenta}
                style={btnStyles.action}
                testID="btnToggleProxy"
              >
                {statusActivo ? 'Deshabilitar' : 'Habilitar'}
              </Button>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const btnStyles = StyleSheet.create({
  action: { marginTop: 8, borderRadius: 20, marginHorizontal: 8 },
});

export default memo(ProxyCardAdmin);
