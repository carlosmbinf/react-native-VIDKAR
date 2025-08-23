import React, { memo, useState } from 'react';
import { View, Dimensions } from 'react-native';
import { Card, Title, Text, Button, Switch, Surface } from 'react-native-paper';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import Meteor from '@meteorrn/core';
import { Logs } from '../../collections/collections';

const { width: screenWidth } = Dimensions.get('window');

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

    const renderLabelVPN = () => {
        if (valuevpn || isFocusvpn) {
            return (
                <Text style={[styles.label, isFocusvpn && { color: 'blue' }]}>
                    VPN • Megas • Precio
                </Text>
            );
        }
        return null;
    };

    return (
        <Card elevation={12} style={styles.cards}>
            <Card.Content>
                <View style={styles.element}>
                    <Title style={styles.title}>{'Datos VPN'}</Title>

                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ justifyContent: 'center', paddingRight: 10 }}>
                            Por Tiempo:
                        </Text>
                        <Switch
                            value={item.vpnisIlimitado}
                            onValueChange={() => {
                                Meteor.users.update(item._id, {
                                    $set: { vpnisIlimitado: !item.vpnisIlimitado },
                                });
                            }}
                        />
                    </View>

                    <View style={{ width: '100%', borderRadius: 20, marginTop: 10 }}></View>
                    <Text style={{ paddingTop: 10, textAlign: 'center' }}>
                        OFERTA / LIMITE:
                    </Text>
                    {item.vpnisIlimitado ? (
                        <>
                            <Text style={{ textAlign: 'center' }}>
                                {item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Ninguna'}
                            </Text>
                            <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                                {item.vpnfechaSubscripcion
                                    ? `${item.vpnfechaSubscripcion.getUTCFullYear()}-${item.vpnfechaSubscripcion.getUTCMonth() + 1}-${item.vpnfechaSubscripcion.getUTCDate()}`
                                    : 'Fecha Limite sin especificar'}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={{ textAlign: 'center' }}>
                                {item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Ninguna'}
                            </Text>
                            <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                                {item.vpnmegas
                                    ? `${item.vpnmegas} MB => ${(item.vpnmegas / 1024).toFixed(2)} GB`
                                    : 'No se ha especificado aun el Límite de megas'}
                            </Text>
                        </>
                    )}
                </View>

                <View
                    style={{
                        width: '100%',
                        borderRadius: 20,
                        marginTop: 10,
                        marginBottom: 10,
                    }}>

                </View>
                <Text style={{ paddingTop: 10, textAlign: 'center' }}>Consumo:</Text>
                <Text style={{ paddingBottom: 10, textAlign: 'center' }}>
                    {item.vpnMbGastados ? (item.vpnMbGastados / 1000000).toFixed(2) : 0}
                    {'MB => '}
                    {item.vpnMbGastados ? (item.vpnMbGastados / 1000000000).toFixed(2) : 0}
                    GB
                </Text>

                {item.vpnisIlimitado ? (
                    <Surface
                        style={{
                            width: '100%',
                            elevation: 12,
                            borderRadius: 20,
                            marginTop: 20,
                            backgroundColor: '#607d8b',
                            padding: 20,
                        }}>
                        <CalendarPicker
                            format="YYYY-MM-DD"
                            minDate={new Date()}
                            selectedDayColor="#7300e6"
                            selectedDayTextColor="#FFFFFF"
                            mode="date"
                            width={screenWidth - 100}
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
                                        'La Fecha Limite de la VPN se cambió para: ' +
                                        moment.utc(new Date(date)).format('YYYY-MM-DD'),
                                });
                                if (item.vpn) {
                                    Logs.insert({
                                        type: 'VPN',
                                        userAfectado: item._id,
                                        userAdmin: Meteor.userId(),
                                        message:
                                            'Se Desactivó la VPN porque estaba activa y cambio la fecha Limite',
                                    });
                                    Meteor.users.update(item._id, { $set: { vpn: false } });
                                }
                            }}
                        />
                    </Surface>
                ) : (
                    <Surface
                        style={{
                            width: '100%',
                            elevation: 3,
                            borderRadius: 20,
                            padding: 10,
                        }}>
                        <View style={{ paddingTop: 20 }}>
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
                                searchPlaceholder="Search..."
                                value={valuevpn}
                                onFocus={() => setIsFocusvpn(true)}
                                onBlur={() => setIsFocusvpn(false)}
                                onChange={paquete => {
                                    setValuevpn(paquete.value);
                                    setIsFocusvpn(false);
                                    setValuevpnlabel(paquete.label);
                                    setMegasVPNlabel(paquete.value ? paquete.value : 0);
                                }}
                            />
                            <View style={{ paddingTop: 10, paddingBottom: 10 }}>
                                <Button
                                    icon="send"
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
                                                `Ha sido Seleccionada la VPN: ${valuevpnlabel ? valuevpnlabel : valuevpn}`,
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
                                                    `Se ${!item.vpn ? 'Activo' : 'Desactivó'} la VPN porque estaba activa y cambio la oferta`,
                                                );
                                            }
                                        } catch (error) {
                                            console.error(error);
                                        }
                                    }}>
                                    {megasVPNlabel ? `Establecer ${megasVPNlabel}MB` : `Seleccione 1 compra!!!`}
                                </Button>
                            </View>
                        </View>
                    </Surface>
                )}

                <View style={{ width: '100%', borderRadius: 20, marginTop: 10 }}>
                    <Text style={{ paddingTop: 10, textAlign: 'center' }}>Estado:</Text>
                    <View style={{ paddingBottom: 10, textAlign: 'center' }}>
                        <>
                            <View style={{ padding: 10 }}>
                                <Button
                                    icon="send"
                                    disabled={item.vpnMbGastados ? false : true}
                                    mode="contained"
                                    onPress={handleReiniciarConsumoVPN}>
                                    REINICIAR CONSUMO!!!
                                </Button>
                            </View>
                            <View style={{ padding: 10 }}>
                                <Button
                                    mode="contained"
                                    color={item.vpn && 'red'}
                                    onPress={handleVPNStatus}>
                                    {!item.vpn ? 'Habilitar' : 'Desabilitar'}
                                </Button>
                            </View>
                        </>
                    </View>
                </View>
            </Card.Content >
        </Card >
    );
};

export default memo(VpnCardAdmin);
