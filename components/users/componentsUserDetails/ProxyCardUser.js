import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Title, Text, Chip, Divider } from 'react-native-paper';

const BYTES_IN_MB_APPROX = 1024000;
const formatLimitDate = (moment, d) =>
  d ? moment.utc(d).format('DD-MM-YYYY') : 'Fecha límite sin especificar';

const ProxyCardUser = ({ item, styles, momentLib }) => {
  if (!item) return null;
  const moment = momentLib || require('moment');

  const shouldRender = item.megasGastadosinBytes || item.fechaSubscripcion || item.megas;
  if (!shouldRender) return null;

  const consumo = useMemo(() => {
    const bytes = item.megasGastadosinBytes || 0;
    return {
      mb: (bytes / BYTES_IN_MB_APPROX).toFixed(2),
      gb: (bytes / (BYTES_IN_MB_APPROX * 1000)).toFixed(2),
    };
  }, [item.megasGastadosinBytes]);

  const statusActivo = !item.baneado;

  return (
    <Card elevation={12} style={styles.cards} testID="proxyUserCard">
      <Card.Content>
        <View style={styles.element}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Title style={styles.title}>Datos del Proxy</Title>
            <Chip
              compact
              icon={statusActivo ? 'check-circle' : 'close-circle'}
              style={{ backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }}
              selectedColor="#fff"
              testID="proxyStatusChip"
            >
              {statusActivo ? 'Habilitado' : 'Deshabilitado'}
            </Chip>
          </View>

          <Divider style={{ marginTop: 4, opacity: 0.4 }} />

            {item.isIlimitado ? (
              <View style={{ width: '100%', marginTop: 14 }}>
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Fecha Límite</Text>
                <Text style={{ textAlign: 'center', marginTop: 4 }}>
                  {formatLimitDate(moment, item.fechaSubscripcion)}
                </Text>
              </View>
            ) : (
              <View style={{ width: '100%', marginTop: 14 }}>
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Límite de Megas</Text>
                <Text style={{ textAlign: 'center', marginTop: 4 }}>
                  {item.megas
                    ? `${item.megas} MB  →  ${(item.megas / 1024).toFixed(2)} GB`
                    : 'No configurado'}
                </Text>
              </View>
            )}

            <View style={{ width: '100%', marginTop: 14 }}>
              <Text style={{ textAlign: 'center', fontWeight: '600' }}>Consumo</Text>
              <Text style={{ textAlign: 'center', marginTop: 4 }}>
                {consumo.mb} MB  →  {consumo.gb} GB
              </Text>
            </View>

            {/* Estado ya expresado en Chip, se mantiene compatibilidad */}
            {/* <View style={{ width: '100%', marginTop: 14 }}>
              <Text style={{ textAlign: 'center', fontWeight: '600' }}>Estado</Text>
              <Text style={{ textAlign: 'center', marginTop: 4 }}>
                {statusActivo ? 'Habilitado' : 'Deshabilitado'}
              </Text>
            </View> */}
        </View>
      </Card.Content>
    </Card>
  );
};

export default memo(ProxyCardUser);
