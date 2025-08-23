import React, {memo} from 'react';
import {View} from 'react-native';
import {Card, Title, Text} from 'react-native-paper';

const VpnCardUser = ({item, styles}) => {
  if (!item) return null;

  return (
    (item.megasGastadosinBytes || item.fechaSubscripcion || item.megas) && (
      <Card elevation={12} style={styles.cards}>
        <Card.Content>
          <View style={styles.element}>
            <Title style={styles.title}>{'Datos VPN'}</Title>

            <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
              <Text style={{paddingTop: 10, textAlign: 'center'}}>
                OFERTA / LIMITE:
              </Text>
              {item.vpnisIlimitado ? (
                <>
                  <Text style={{textAlign: 'center'}}>
                    {item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Ninguna'}
                  </Text>
                  <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                    {item.vpnfechaSubscripcion
                      ? `${item.vpnfechaSubscripcion.getUTCFullYear()}-${item.vpnfechaSubscripcion.getUTCMonth() + 1}-${item.vpnfechaSubscripcion.getUTCDate()}`
                      : 'Fecha Limite sin especificar'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{textAlign: 'center'}}>
                    {item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Ninguna'}
                  </Text>
                  <Text style={{paddingBottom: 10, textAlign: 'center'}}>
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
              }}>
              <Text style={{paddingTop: 10, textAlign: 'center'}}>Consumo:</Text>
              <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                {item.vpnMbGastados ? item.vpnMbGastados / 1000000 : 0}
                MB => {item.vpnMbGastados ? item.vpnMbGastados / 1024000000 : 0}GB
              </Text>
            </View>

            <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
              <Text style={{paddingTop: 10, textAlign: 'center'}}>
                Estado de la VPN:
              </Text>
              <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                {!item.vpn ? 'Desabilitado' : 'Habilitado'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    )
  );
};

export default memo(VpnCardUser);
