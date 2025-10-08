import React, { memo, useState, useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { Card, Title, Text, Button, Switch, Surface, Chip, Divider } from 'react-native-paper';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import Meteor from '@meteorrn/core';
import { Logs } from '../../collections/collections';

const { width: screenWidth } = Dimensions.get('window');

// Helpers reutilizables
const BYTES_IN_MB_APPROX = 1000000; // este admin card ya usaba 1e6 base decimal
const formatDate = (d, moment) =>
  d ? moment.utc(d).format('YYYY-MM-DD') : 'Fecha límite sin especificar';
const getPlanLabel = item =>
  item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Sin Plan';

const VpnCardAdmin = ({
  item,
  styles,
  preciosVPNlist,
  handleReiniciarConsumoVPN,
  handleVPNStatus,
}) => {
  if (!item) return null;
  const moment = require('moment');
  const [valuevpn, setValuevpn] = useState(null);
  const [valuevpnlabel, setValuevpnlabel] = useState(null);
  const [megasVPNlabel, setMegasVPNlabel] = useState(0);
  const [isFocusvpn, setIsFocusvpn] = useState(false);

  const consumo = useMemo(() => {
    const bytes = item.vpnMbGastados || 0;
    return {
      mb: (bytes / BYTES_IN_MB_APPROX).toFixed(2),
      gb: (bytes / (BYTES_IN_MB_APPROX * 1000)).toFixed(2),
    };
  }, [item.vpnMbGastados]);

  const renderLabelVPN = () =>
    valuevpn || isFocusvpn ? (
      <Text style={[styles.label, isFocusvpn && { color: 'blue' }]}>
        VPN • Megas • Precio
      </Text>
    ) : null;

  return (
    <Card elevation={12} style={styles.cards} testID="vpnAdminCard">
      <Card.Content>
        <View style={styles.element}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Title style={styles.title}>Datos VPN</Title>
            <Chip
              compact
              icon={item.vpn ? 'check-circle' : 'close-circle'}
              style={{
                backgroundColor: item.vpn ? '#2e7d32' : '#c62828',
              }}
              selectedColor="#fff"
              testID="vpnStatusChipAdmin"
            >
              {item.vpn ? 'Habilitada' : 'Deshabilitada'}
            </Chip>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 4, alignItems: 'center' }}>
            <Text style={{ paddingRight: 10 }}>Por Tiempo:</Text>
            <Switch
              value={item.vpnisIlimitado}
              onValueChange={() =>
                Meteor.users.update(item._id, {
                  $set: { vpnisIlimitado: !item.vpnisIlimitado },
                })
              }
              testID="switchIlimitado"
            />
          </View>

          <Divider style={{ marginVertical: 8, opacity: 0.4 }} />

          <Text style={{ textAlign: 'center', fontWeight: '600' }}>Oferta / Límite</Text>
          <Text style={{ textAlign: 'center', marginTop: 4 }}>{getPlanLabel(item)}</Text>

          {item.vpnisIlimitado ? (
            <Text style={{ textAlign: 'center', marginTop: 2, opacity: 0.85 }}>
              {formatDate(item.vpnfechaSubscripcion, moment)}
            </Text>
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 2, opacity: 0.85 }}>
              {item.vpnmegas
                ? `${item.vpnmegas} MB  →  ${(item.vpnmegas / 1024).toFixed(2)} GB`
                : 'Límite no configurado'}
            </Text>
          )}

          <View style={{ marginTop: 14 }}>
            <Text style={{ textAlign: 'center', fontWeight: '600' }}>Consumo</Text>
            <Text style={{ textAlign: 'center', marginTop: 4 }}>
              {consumo.mb} MB  →  {consumo.gb} GB
            </Text>
          </View>
        </View>

        {/* Selector Tiempo vs Megas */}
        {item.vpnisIlimitado ? (
          <Surface
            style={{
              width: '100%',
            //   elevation: 12,
              borderRadius: 16,
              marginTop: 20,
              backgroundColor: '#546e7a',
            }}
          >
            <CalendarPicker
              format="YYYY-MM-DD"
              minDate={new Date()}
              selectedDayColor="#6200ee"
              selectedDayTextColor="#FFFFFF"
              mode="date"
              width={320}
              height={320}
              selectedStartDate={item.vpnfechaSubscripcion}
              onDateChange={date => {
                if (!date) return;
                Meteor.users.update(item._id, {
                  $set: {
                    vpnfechaSubscripcion: new Date(
                      moment.utc(date).startOf('day').add(4, 'hours'),
                    ),
                    vpnplus: true,
                    vpn2mb: true,
                  },
                });
                Logs.insert({
                  type: 'Fecha Limite VPN',
                  userAfectado: item._id,
                  userAdmin: Meteor.userId(),
                  message:
                    'La Fecha Límite de la VPN se cambió para: ' +
                    moment.utc(new Date(date)).format('YYYY-MM-DD'),
                });
                if (item.vpn) {
                  Logs.insert({
                    type: 'VPN',
                    userAfectado: item._id,
                    userAdmin: Meteor.userId(),
                    message:
                      'Se desactivó la VPN porque estaba activa y cambió la fecha límite',
                  });
                  Meteor.users.update(item._id, { $set: { vpn: false } });
                }
              }}
              testID="calendarVPN"
            />
          </Surface>
        ) : (
          <Surface
            style={{
              width: '100%',
              elevation: 3,
              borderRadius: 16,
              padding: 12,
              marginTop: 16,
            }}
          >
            {renderLabelVPN()}
            <Dropdown
              style={[styles.dropdown, isFocusvpn && { borderColor: 'blue' }]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              data={preciosVPNlist}
              search
              maxHeight={
                preciosVPNlist.length * 50 + 70 > 220
                  ? 220
                  : preciosVPNlist.length * 50 + 70
              }
              labelField="label"
              valueField="value"
              placeholder={!isFocusvpn ? 'Seleccione un paquete' : '...'}
              searchPlaceholder="Buscar...'"
              value={valuevpn}
              onFocus={() => setIsFocusvpn(true)}
              onBlur={() => setIsFocusvpn(false)}
              onChange={paquete => {
                setValuevpn(paquete.value);
                setIsFocusvpn(false);
                setValuevpnlabel(paquete.label);
                setMegasVPNlabel(paquete.value ? paquete.value : 0);
              }}
              testID="dropdownVPN"
            />
            <View style={{ paddingTop: 10 }}>
              <Button
                icon="database-import"
                disabled={!valuevpn}
                mode="contained"
                onPress={async () => {
                  try {
                    await Meteor.users.update(item._id, {
                      $set: { vpnplus: true, vpn2mb: true },
                    });
                    await Meteor.call(
                      'registrarLog',
                      'VPN',
                      item._id,
                      Meteor.userId(),
                      `Seleccionado paquete VPN: ${
                        valuevpnlabel ? valuevpnlabel : valuevpn
                      }`,
                    );
                    Meteor.users.update(item._id, {
                      $set: { vpnmegas: megasVPNlabel },
                    });
                    if (item.vpn) {
                      await Meteor.users.update(item._id, { $set: { vpn: false } });
                      await Meteor.call(
                        'registrarLog',
                        'VPN',
                        item._id,
                        Meteor.userId(),
                        'Se desactivó la VPN porque cambió la oferta',
                      );
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }}
                testID="btnSetMegasVPN"
              >
                {megasVPNlabel
                  ? `Establecer ${megasVPNlabel}MB`
                  : 'Seleccione un paquete'}
              </Button>
            </View>
          </Surface>
        )}

        <View style={{ width: '100%', marginTop: 18 }}>
          <Text style={{ textAlign: 'center', fontWeight: '600' }}>Acciones</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              icon="backup-restore"
              disabled={!item.vpnMbGastados}
              style={btnStyles.action}
              mode="outlined"
              onPress={handleReiniciarConsumoVPN}
              testID="btnReiniciarConsumoVPN"
            >
              Reiniciar Consumo
            </Button>
            <Button
              mode="contained"
              style={btnStyles.action}
              buttonColor={item.vpn ? '#c62828' : '#2e7d32'}
              onPress={handleVPNStatus}
              testID="btnToggleVPN"
            >
              {item.vpn ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const btnStyles = StyleSheet.create({
  action: { marginTop: 8, borderRadius: 20, marginHorizontal: 8 },
});

export default memo(VpnCardAdmin);
