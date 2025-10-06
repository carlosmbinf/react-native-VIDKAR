import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Title, Text, Chip, Divider } from 'react-native-paper';

// Helpers reutilizables (pensado para futura extracción a utils/)
const BYTES_IN_MB_APPROX = 1024000; // se mantiene la conversión ya usada en el proyecto
const formatDate = d =>
  d instanceof Date
    ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate(),
      ).padStart(2, '0')}`
    : 'Fecha límite sin especificar';

const getPlanLabel = item =>
  item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Sin Plan';

const VpnCardUser = ({ item, styles }) => {
  if (!item) return null;

  const shouldRender = item.vpnMbGastados || item.vpnfechaSubscripcion || item.vpnmegas;
  if (!shouldRender) return null;

  const isIlimitado = !!item.vpnisIlimitado;
  const statusActivo = !!item.vpn;

  const consumo = useMemo(() => {
    const bytes = item.vpnMbGastados || 0;
    return {
      mb: (bytes / BYTES_IN_MB_APPROX).toFixed(2),
      gb: (bytes / (BYTES_IN_MB_APPROX * 1000)).toFixed(2),
    };
  }, [item.vpnMbGastados]);

  return (
    <Card elevation={12} style={styles.cards} testID="vpnUserCard">
      <Card.Content>
        <View style={styles.element}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Title style={styles.title}>Datos VPN</Title>
              <Chip
                compact
                icon={statusActivo ? 'check-circle' : 'close-circle'}
                selectedColor="#fff"
                style={{
                  backgroundColor: statusActivo ? '#2e7d32' : '#c62828',
                }}
                testID="vpnStatusChip"
              >
                {statusActivo ? 'Habilitada' : 'Deshabilitada'}
              </Chip>
            </View>

            <Divider style={{ marginTop: 4, opacity: 0.4 }} />

            <View style={{ width: '100%', borderRadius: 16, marginTop: 14 }}>
              <Text style={{ textAlign: 'center', fontWeight: '600' }}>Oferta / Límite</Text>
              <Text style={{ textAlign: 'center', marginTop: 4 }}>{getPlanLabel(item)}</Text>
              {isIlimitado ? (
                <Text style={{ paddingBottom: 4, textAlign: 'center', opacity: 0.85 }}>
                  {item.vpnfechaSubscripcion
                    ? formatDate(item.vpnfechaSubscripcion)
                    : 'Fecha límite sin especificar'}
                </Text>
              ) : (
                <Text style={{ paddingBottom: 4, textAlign: 'center', opacity: 0.85 }}>
                  {item.vpnmegas
                    ? `${item.vpnmegas} MB  →  ${(item.vpnmegas / 1024).toFixed(2)} GB`
                    : 'Límite de megas no definido'}
                </Text>
              )}
            </View>

            <View style={{ width: '100%', borderRadius: 16, marginTop: 10 }}>
              <Text style={{ textAlign: 'center', fontWeight: '600' }}>Consumo</Text>
              <Text style={{ textAlign: 'center', marginTop: 4 }}>
                {consumo.mb} MB  →  {consumo.gb} GB
              </Text>
            </View>

            {/* Estado expresado ya en el Chip superior; se mantiene bloque por compatibilidad */}
            {/* <View style={{ width: '100%', borderRadius: 16, marginTop: 10 }}>
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

export default memo(VpnCardUser);
