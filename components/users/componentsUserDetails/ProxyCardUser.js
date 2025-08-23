import React, {memo} from 'react';
import {View} from 'react-native';
import {Card, Title, Text} from 'react-native-paper';

const ProxyCardUser = ({item, styles, momentLib}) => {
  if (!item) return null;
  const moment = momentLib || require('moment');

  return (
    (item.megasGastadosinBytes || item.fechaSubscripcion || item.megas) && (
      <Card elevation={12} style={styles.cards}>
        <Card.Content>
          <View style={styles.element}>
            <Title style={styles.title}>{'Datos del Proxy'}</Title>
            {item.isIlimitado ? (
              <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
                <Text style={{paddingTop: 10, textAlign: 'center'}}>
                  Fecha Límite:
                </Text>
                <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                  {item.fechaSubscripcion
                    ? moment.utc(item.fechaSubscripcion).format('DD-MM-YYYY')
                    : 'Fecha Límite sin especificar'}
                </Text>
              </View>
            ) : (
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
            )}

            <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
              <Text style={{paddingTop: 10, textAlign: 'center'}}>Consumo:</Text>
              <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                {item.megasGastadosinBytes
                  ? `${(item.megasGastadosinBytes / 1024000).toFixed(
                      2,
                    )} MB => ${(item.megasGastadosinBytes / 1024000000).toFixed(2)} GB`
                  : '0 MB'}
              </Text>
            </View>

            <View style={{width: '100%', borderRadius: 20, marginTop: 10}}>
              <Text style={{paddingTop: 10, textAlign: 'center'}}>
                Estado del Proxy:
              </Text>
              <Text style={{paddingBottom: 10, textAlign: 'center'}}>
                {item.baneado ? 'Desabilitado' : 'Habilitado'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    )
  );
};

export default memo(ProxyCardUser);
