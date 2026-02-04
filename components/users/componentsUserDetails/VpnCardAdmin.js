import React, { memo, useState, useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { Card, Title, Text, Button, Switch, Surface, Chip, Divider, IconButton, ProgressBar } from 'react-native-paper';
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
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const formatGBFromMB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const formatLimitDate = (moment, d) =>
  d ? moment.utc(d).format('DD-MM-YYYY') : 'Fecha límite sin especificar';

const VpnCardAdmin = ({
  item,
  styles,
  preciosVPNlist,
  handleReiniciarConsumoVPN,
  handleVPNStatus,
  accentColor, // NUEVO: color de acento consistente con PersonalDataCard
  canEdit,
  onRequestView,
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

  const headerAccent = accentColor || '#4CAF50';
  const statusActivo = item.vpn === true;

  const consumoMBn = Number(item.vpnMbGastados || 0) / BYTES_IN_MB_APPROX;
  const limiteMB = Number(item.vpnmegas || 0);
  const restanteMB = Math.max(0, limiteMB - consumoMBn);
  const progress = item.vpnisIlimitado || !limiteMB ? 0 : clamp01(consumoMBn / limiteMB);

  const limitLabel = item.vpnisIlimitado
    ? 'Por tiempo'
    : limiteMB
      ? `${formatGBFromMB(limiteMB)} GB`
      : 'No configurado';

  const helper =
    !statusActivo
      ? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
      : item.vpnisIlimitado
        ? `Vence: ${formatLimitDate(moment, item.vpnfechaSubscripcion)}`
        : limiteMB
          ? `Restante aprox.: ${formatGBFromMB(restanteMB)} GB`
          : 'No hay un límite asignado aún.';

  return (
    <Card elevation={12} style={[styles.cards, ui.cardShell]} testID="vpnAdminCard">
      {/* NUEVO: barra superior tipo PersonalDataCard */}
      <View style={[ui.accentBar, { backgroundColor: headerAccent }]} />

      <Card.Content style={ui.content}>
        {/* Header consistente */}
        <View style={ui.headerRow}>
          <Title style={[styles.title, ui.headerTitle]}>VPN</Title>
          <View style={ui.headerRight}>
            <Chip
              compact
              icon={statusActivo ? 'check-circle' : 'close-circle'}
              style={[ui.statusChip, { backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }]}
              selectedColor="#fff"
              testID="vpnStatusChipAdmin"
            >
              {statusActivo ? 'Activa' : 'Inactiva'}
            </Chip>
            {!!canEdit && (
              <Chip
                compact
                icon="close-circle"
                mode="flat"
                onPress={onRequestView}
                style={ui.cancelChip}
                textStyle={ui.cancelChipText}
                testID="vpnCancelEditBtnAdmin"
              >
                Cancelar
              </Chip>
            )}
          </View>
        </View>

        {/* ✅ NUEVO: Resumen visible (igual al user) */}
        <Text style={ui.helper}>{helper}</Text>
        <Divider style={ui.divider} />

        <View style={ui.kpiRow}>
          <View style={ui.kpiItem}>
            <Text style={ui.kpiLabel}>Plan</Text>
            <Text style={ui.kpiValue}>{getPlanLabel(item)}</Text>
          </View>

          <View style={ui.kpiItem}>
            <Text style={ui.kpiLabel}>{item.vpnisIlimitado ? 'Tipo' : 'Límite'}</Text>
            <Text style={ui.kpiValue}>{limitLabel}</Text>
          </View>

          <View style={ui.kpiItem}>
            <Text style={ui.kpiLabel}>Consumo</Text>
            <Text style={ui.kpiValue}>{Number(formatGBFromMB(consumoMBn)).toFixed(2)} GB</Text>
          </View>

          {!item.vpnisIlimitado && !!limiteMB && (
            <View style={ui.kpiItem}>
              <Text style={ui.kpiLabel}>Restante</Text>
              <Text style={ui.kpiValue}>{formatGBFromMB(restanteMB)} GB</Text>
            </View>
          )}
        </View>

        {!item.vpnisIlimitado && !!limiteMB && (
          <View style={ui.progressWrap}>
            <View style={ui.progressMeta}>
              <Text style={ui.progressText}>
                {formatGBFromMB(consumoMBn)} / {formatGBFromMB(limiteMB)} GB
              </Text>
              <Text style={ui.progressText}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#4CAF50'} />
          </View>
        )}

        <Divider style={ui.divider} />

        <View style={ui.rowBetween}>
          <Text style={ui.mutedLabel}>Por tiempo</Text>
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

        {/* Selector Tiempo vs Megas */}
        {item.vpnisIlimitado ? (
          <Surface style={[ui.panel, ui.panelDark]}>
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
          <Surface style={ui.panel}>
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

        <View style={ui.section}>
          <Text style={ui.sectionTitle}>Acciones</Text>
          <View style={ui.actionsRow}>
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

const ui = StyleSheet.create({
  cardShell: { overflow: 'hidden' },
  accentBar: { height: 4, width: '100%' },
  content: { paddingTop: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { textAlign: 'left', paddingBottom: 0 },
  statusChip: { alignSelf: 'flex-start' },
  divider: { marginVertical: 10, opacity: 0.2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mutedLabel: { opacity: 0.75, fontWeight: '600' },
  section: { marginTop: 14 },
  sectionTitle: { textAlign: 'center', fontWeight: '700', opacity: 0.9 },
  centerText: { textAlign: 'center', marginTop: 6 },
  centerSubText: { textAlign: 'center', marginTop: 4, opacity: 0.85 },
  panel: { width: '100%', elevation: 3, borderRadius: 16, padding: 12, marginTop: 16 },
  panelDark: { backgroundColor: '#546e7a', padding: 0, elevation: 0 },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginLeft: 8 },
  helper: { marginTop: 8, opacity: 0.75, fontSize: 12, lineHeight: 16 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  kpiItem: { flexGrow: 1, flexBasis: '30%', paddingVertical: 6 },
  kpiLabel: { fontSize: 12, opacity: 0.65, fontWeight: '600' },
  kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
  progressWrap: { marginTop: 10 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
  viewChip: { marginLeft: 8, backgroundColor: '#ECEFF1' },
  viewChipText: { fontWeight: '800', color: '#263238' },
  editChip: { marginLeft: 8, backgroundColor: '#E8F5E9' },
  editChipText: { fontWeight: '800', color: '#2E7D32' },
  cancelChip: { marginLeft: 8, backgroundColor: '#E8F5E9' },
  cancelChipText: { fontWeight: '800', color: '#2E7D32' },
});

export default memo(VpnCardAdmin);
