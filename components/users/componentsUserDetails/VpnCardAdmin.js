import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, Divider, ProgressBar, Surface, Switch, Text, Title } from 'react-native-paper';
import { Logs } from '../../collections/collections';

const BYTES_IN_MB_BINARY = 1048576;
const formatDate = (moment, date) => (date ? moment.utc(date).format('YYYY-MM-DD') : 'Fecha límite sin especificar');
const getPlanLabel = (item) => (item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Sin Plan');
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const formatGBFromMB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const formatLimitDate = (moment, date) => (date ? moment.utc(date).format('DD-MM-YYYY') : 'Fecha límite sin especificar');

const VpnCardAdmin = ({ item, styles, preciosVPNlist = [], handleReiniciarConsumoVPN, handleVPNStatus, accentColor, canEdit, onRequestView }) => {
	const moment = require('moment');
	const [valuevpn, setValuevpn] = useState(null);
	const [valuevpnlabel, setValuevpnlabel] = useState(null);
	const [megasVPNlabel, setMegasVPNlabel] = useState(0);
	const [isFocusvpn, setIsFocusvpn] = useState(false);
	const currentItem = item || {};
	const consumoMB = useMemo(() => Number(currentItem.vpnMbGastados || 0) / BYTES_IN_MB_BINARY, [currentItem.vpnMbGastados]);
	const limiteMB = Number(currentItem.vpnmegas || 0);
	const restanteMB = Math.max(0, limiteMB - consumoMB);
	const progress = currentItem.vpnisIlimitado || !limiteMB ? 0 : clamp01(consumoMB / limiteMB);
	const headerAccent = accentColor || '#4CAF50';
	const statusActivo = currentItem.vpn === true;
	const limitLabel = currentItem.vpnisIlimitado ? 'Por tiempo' : limiteMB ? `${formatGBFromMB(limiteMB)} GB` : 'No configurado';
	const helper = !statusActivo
		? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
		: currentItem.vpnisIlimitado
			? `Vence: ${formatLimitDate(moment, currentItem.vpnfechaSubscripcion)}`
			: limiteMB
				? `Restante aprox.: ${formatGBFromMB(restanteMB)} GB`
				: 'No hay un límite asignado aún.';

	if (!item) {
		return null;
	}

	return (
		<Card elevation={12} style={[styles.cards, ui.cardShell]} testID="vpn-admin-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<Title style={[styles.title, ui.headerTitle]}>VPN</Title>
					<View style={ui.headerRight}>
						<Chip compact icon={statusActivo ? 'check-circle' : 'close-circle'} style={[ui.statusChip, { backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }]} selectedColor="#fff">
							{statusActivo ? 'Activa' : 'Inactiva'}
						</Chip>
						{canEdit ? (
							<Chip compact icon="close-circle" mode="flat" onPress={onRequestView} style={ui.cancelChip} textStyle={ui.cancelChipText}>
								Cancelar
							</Chip>
						) : null}
					</View>
				</View>

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
						<Text style={ui.kpiValue}>{Number(formatGBFromMB(consumoMB)).toFixed(2)} GB</Text>
					</View>
					{!item.vpnisIlimitado && limiteMB ? (
						<View style={ui.kpiItem}>
							<Text style={ui.kpiLabel}>Restante</Text>
							<Text style={ui.kpiValue}>{formatGBFromMB(restanteMB)} GB</Text>
						</View>
					) : null}
				</View>

				{!item.vpnisIlimitado && limiteMB ? (
					<View style={ui.progressWrap}>
						<View style={ui.progressMeta}>
							<Text style={ui.progressText}>{formatGBFromMB(consumoMB)} / {formatGBFromMB(limiteMB)} GB</Text>
							<Text style={ui.progressText}>{Math.round(progress * 100)}%</Text>
						</View>
						<ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#4CAF50'} />
					</View>
				) : null}

				<Divider style={ui.divider} />
				<View style={ui.rowBetween}>
					<Text style={ui.mutedLabel}>Por tiempo</Text>
					<Switch value={!!item.vpnisIlimitado} onValueChange={() => Meteor.users.update(item._id, { $set: { vpnisIlimitado: !item.vpnisIlimitado } })} />
				</View>

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
							onDateChange={(date) => {
								if (!date) {
									return;
								}
								Meteor.users.update(item._id, {
									$set: {
										vpnfechaSubscripcion: new Date(moment.utc(date).startOf('day').add(4, 'hours')),
										vpnplus: true,
										vpn2mb: true,
									},
								});
								Logs.insert({
									type: 'Fecha Limite VPN',
									userAfectado: item._id,
									userAdmin: Meteor.userId(),
									message: `La Fecha Límite de la VPN se cambió para: ${formatDate(moment, new Date(date))}`,
								});
								if (item.vpn) {
									Logs.insert({ type: 'VPN', userAfectado: item._id, userAdmin: Meteor.userId(), message: 'Se desactivó la VPN porque estaba activa y cambió la fecha límite' });
									Meteor.users.update(item._id, { $set: { vpn: false } });
								}
							}}
						/>
					</Surface>
				) : (
					<Surface style={ui.panel}>
						{valuevpn || isFocusvpn ? <Text style={[styles.label, isFocusvpn && { color: 'blue' }]}>VPN • Megas • Precio</Text> : null}
						<Dropdown
							style={[styles.dropdown, isFocusvpn && { borderColor: 'blue' }]}
							placeholderStyle={styles.placeholderStyle}
							selectedTextStyle={styles.selectedTextStyle}
							inputSearchStyle={styles.inputSearchStyle}
							iconStyle={styles.iconStyle}
							data={preciosVPNlist}
							search
							maxHeight={preciosVPNlist.length * 50 + 70 > 220 ? 220 : preciosVPNlist.length * 50 + 70}
							labelField="label"
							valueField="value"
							placeholder={!isFocusvpn ? 'Seleccione un paquete' : '...'}
							searchPlaceholder="Buscar..."
							value={valuevpn}
							onFocus={() => setIsFocusvpn(true)}
							onBlur={() => setIsFocusvpn(false)}
							onChange={(paquete) => {
								setValuevpn(paquete.value);
								setIsFocusvpn(false);
								setValuevpnlabel(paquete.label);
								setMegasVPNlabel(paquete.value || 0);
							}}
						/>
						<View style={{ paddingTop: 10 }}>
							<Button icon="database-import" disabled={!valuevpn} mode="contained" onPress={async () => {
								try {
									await Meteor.users.update(item._id, { $set: { vpnplus: true, vpn2mb: true } });
									await Meteor.call('registrarLog', 'VPN', item._id, Meteor.userId(), `Seleccionado paquete VPN: ${valuevpnlabel || valuevpn}`);
									Meteor.users.update(item._id, { $set: { vpnmegas: megasVPNlabel } });
									if (item.vpn) {
										await Meteor.users.update(item._id, { $set: { vpn: false } });
										await Meteor.call('registrarLog', 'VPN', item._id, Meteor.userId(), 'Se desactivó la VPN porque cambió la oferta');
									}
								} catch (error) {
									console.error(error);
								}
							}}>
								{megasVPNlabel ? `Establecer ${megasVPNlabel}MB` : 'Seleccione un paquete'}
							</Button>
						</View>
					</Surface>
				)}

				<View style={ui.section}>
					<Text style={ui.sectionTitle}>Acciones</Text>
					<View style={ui.actionsRow}>
						<Button icon="backup-restore" disabled={!item.vpnMbGastados} style={btnStyles.action} mode="outlined" onPress={handleReiniciarConsumoVPN}>
							Reiniciar Consumo
						</Button>
						<Button mode="contained" style={btnStyles.action} buttonColor={item.vpn ? '#c62828' : '#2e7d32'} onPress={handleVPNStatus}>
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
	panel: { width: '100%', elevation: 3, borderRadius: 16, padding: 12, marginTop: 16 },
	panelDark: { backgroundColor: '#546e7a', padding: 0, elevation: 0 },
	actionsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
	headerRight: { flexDirection: 'row', alignItems: 'center' },
	helper: { marginTop: 8, opacity: 0.75, fontSize: 12, lineHeight: 16 },
	kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
	kpiItem: { flexGrow: 1, flexBasis: '30%', paddingVertical: 6 },
	kpiLabel: { fontSize: 12, opacity: 0.65, fontWeight: '600' },
	kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
	progressWrap: { marginTop: 10 },
	progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
	progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
	cancelChip: { marginLeft: 8, backgroundColor: '#E8F5E9' },
	cancelChipText: { fontWeight: '800', color: '#2E7D32' },
});

export default memo(VpnCardAdmin);
