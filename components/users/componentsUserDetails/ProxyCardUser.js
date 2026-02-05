import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, Chip, Divider, ProgressBar } from 'react-native-paper';

const BYTES_IN_MB_BINARY = 1048576;
const BYTES_IN_GB_BINARY = 1073741824;
const formatLimitDate = (moment, d) =>
  d ? moment.utc(d).format('DD-MM-YYYY') : 'Fecha límite sin especificar';

const formatGB = (mb) => {
  const n = Number(mb) || 0;
  return (n / 1024).toFixed(2);
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const ProxyCardUser = ({ item, styles, momentLib, accentColor, canEdit, onRequestEdit }) => {
  if (!item) return null;
  const moment = momentLib || require('moment');

  const shouldRender = item.megasGastadosinBytes || item.fechaSubscripcion || item.megas;
  if (!shouldRender) return null;

  const statusActivo = !item.baneado;
  const headerAccent = accentColor || '#546e7a';

  const consumo = useMemo(() => {
    const bytes = item.megasGastadosinBytes || 0;
    return {
      bytes,
      mb: bytes / BYTES_IN_MB_BINARY,
      gb: bytes / BYTES_IN_GB_BINARY,
    };
  }, [item.megasGastadosinBytes]);

  const limiteMB = Number(item.megas || 0);
  const consumoMB = consumo.mb; // ✅ ahora en MB decimal como Admin
  const consumoGB = consumo.gb; // ✅ ahora en GB decimal como Admin
  const restanteMB = Math.max(0, limiteMB - consumoMB);
  const progress = item.isIlimitado || !limiteMB ? 0 : clamp01(consumoMB / limiteMB);

  const limitLabel = item.isIlimitado
    ? 'Por tiempo'
    : limiteMB
      ? `${formatGB(limiteMB)} GB`
      : 'No configurado';

  const helper =
    !statusActivo
      ? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
      : item.isIlimitado
        ? `Vence: ${formatLimitDate(moment, item.fechaSubscripcion)}`
        : limiteMB
          ? `Restante aprox.: ${formatGB(restanteMB)} GB`
          : 'No hay un límite asignado aún.';

  return (
    <Card elevation={12} style={[styles.cards, ui.cardShell]} testID="proxyUserCard">
      <View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
      <Card.Content style={ui.content}>
        <View style={ui.headerRow}>
          <Title style={[styles.title, ui.headerTitle]}>Proxy</Title>

          <View style={ui.headerRight}>
            <Chip
              compact
              icon={statusActivo ? 'check-circle' : 'close-circle'}
              style={[ui.statusChip, { backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }]}
              selectedColor="#fff"
              testID="proxyStatusChip"
            >
              {statusActivo ? 'Activo' : 'Inactivo'}
            </Chip>

            {!!canEdit && (
              <Chip
                compact
                icon="pencil"
                mode="flat"
                onPress={onRequestEdit}
                style={ui.editChip}
                textStyle={ui.editChipText}
                testID="proxyEditBtn"
              >
                Editar
              </Chip>
            )}
          </View>
        </View>

        <Text style={ui.helper}>{helper}</Text>

        <Divider style={ui.divider} />

        {/* KPIs */}
        <View style={ui.kpiRow}>
          <View style={ui.kpiItem}>
            <Text style={ui.kpiLabel}>{item.isIlimitado ? 'Tipo' : 'Límite'}</Text>
            <Text style={ui.kpiValue}>{limitLabel}</Text>
          </View>

          <View style={ui.kpiItem}>
            <Text style={ui.kpiLabel}>Consumo</Text>
            <Text style={ui.kpiValue}>
              {consumoGB.toFixed(2)} GB
            </Text>
          </View>

          {!item.isIlimitado && !!limiteMB && (
            <View style={ui.kpiItem}>
              <Text style={ui.kpiLabel}>Restante</Text>
              <Text style={ui.kpiValue}>{formatGB(restanteMB)} GB</Text>
            </View>
          )}
        </View>

        {/* Barra: solo si es por megas y hay límite */}
        {!item.isIlimitado && !!limiteMB && (
          <View style={ui.progressWrap}>
            <View style={ui.progressMeta}>
              <Text style={ui.progressText}>
                {consumoGB.toFixed(2)} / {formatGB(limiteMB)} GB
              </Text>
              <Text style={ui.progressText}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#1E88E5'} />
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const ui = StyleSheet.create({
  cardShell: { overflow: 'hidden' },
  accentBar: { height: 4, width: '100%' },
  content: { paddingTop: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { textAlign: 'left', paddingBottom: 0 },
  statusChip: { alignSelf: 'flex-start' },
  helper: { marginTop: 6, opacity: 0.75, fontSize: 12, lineHeight: 16 },
  divider: { marginVertical: 10, opacity: 0.2 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  kpiItem: { flexGrow: 1, flexBasis: '30%', paddingVertical: 6 },
  kpiLabel: { fontSize: 12, opacity: 0.65, fontWeight: '600' },
  kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
  progressWrap: { marginTop: 10 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  editChip: { marginLeft: 8, backgroundColor: '#E3F2FD' },
  editChipText: { fontWeight: '800', color: '#1565C0' },
});

export default memo(ProxyCardUser);
