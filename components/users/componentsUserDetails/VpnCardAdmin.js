import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, Divider, ProgressBar, Surface, Switch, Text, Title, useTheme } from 'react-native-paper';
import { Logs } from '../../collections/collections';

const BYTES_IN_MB_BINARY = 1048576;
const formatDate = (moment, date) => (date ? moment.utc(date).format('YYYY-MM-DD') : 'Fecha límite sin especificar');
const getPlanLabel = (item) => (item.vpnplus ? 'VPN PLUS' : item.vpn2mb ? 'VPN 2MB' : 'Sin Plan');
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const formatGBFromMB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const formatLimitDate = (moment, date) => (date ? moment.utc(date).format('DD-MM-YYYY') : 'Fecha límite sin especificar');

const VpnCardAdmin = ({ item, styles, preciosVPNlist = [], handleReiniciarConsumoVPN, handleVPNStatus, accentColor, canEdit, onRequestView }) => {
	const theme = useTheme();
	const moment = require('moment');
	const [valuevpn, setValuevpn] = useState(null);
	const [valuevpnlabel, setValuevpnlabel] = useState(null);
	const [megasVPNlabel, setMegasVPNlabel] = useState(0);
	const [isFocusvpn, setIsFocusvpn] = useState(false);
	const currentItem = item || {};
	const consumoMB = useMemo(() => Number(currentItem.vpnMbGastados || 0) / BYTES_IN_MB_BINARY, [currentItem.vpnMbGastados]);

	if (!item) {
		return null;
	}

	const limiteMB = Number(currentItem.vpnmegas || 0);
	const restanteMB = Math.max(0, limiteMB - consumoMB);
	const progress = currentItem.vpnisIlimitado || !limiteMB ? 0 : clamp01(consumoMB / limiteMB);
	const headerAccent = accentColor || '#4CAF50';
	const statusActivo = currentItem.vpn === true;
	const palette = {
		copy: theme.dark ? '#cbd5e1' : '#475569',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(248, 250, 252, 0.96)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};
	const limitLabel = currentItem.vpnisIlimitado ? 'Por tiempo' : limiteMB ? `${formatGBFromMB(limiteMB)} GB` : 'No configurado';
	const helper = !statusActivo
		? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
		: currentItem.vpnisIlimitado
			? `Vence: ${formatLimitDate(moment, currentItem.vpnfechaSubscripcion)}`
			: limiteMB
				? `Restante aprox.: ${formatGBFromMB(restanteMB)} GB`
				: 'No hay un límite asignado aún.';

	return (
		<Card elevation={4} style={styles.cards} testID="vpn-admin-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<Title style={[styles.title, ui.headerTitle, { color: palette.title }]}>VPN</Title>
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

				<Text style={[ui.helper, { color: palette.copy }]}>{helper}</Text>
				<Divider style={ui.divider} />

				<View style={ui.kpiRow}>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.kpiLabel, { color: palette.label }]}>Plan</Text>
						<Text style={[ui.kpiValue, { color: palette.title }]}>{getPlanLabel(item)}</Text>
					</View>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.vpnisIlimitado ? 'Tipo' : 'Límite'}</Text>
						<Text style={[ui.kpiValue, { color: palette.title }]}>{limitLabel}</Text>
					</View>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.kpiLabel, { color: palette.label }]}>Consumo</Text>
						<Text style={[ui.kpiValue, { color: palette.title }]}>{Number(formatGBFromMB(consumoMB)).toFixed(2)} GB</Text>
					</View>
					{!item.vpnisIlimitado && limiteMB ? (
						<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
							<Text style={[ui.kpiLabel, { color: palette.label }]}>Restante</Text>
							<Text style={[ui.kpiValue, { color: palette.title }]}>{formatGBFromMB(restanteMB)} GB</Text>
						</View>
					) : null}
				</View>

				{!item.vpnisIlimitado && limiteMB ? (
					<View style={ui.progressWrap}>
						<View style={ui.progressMeta}>
							<Text style={[ui.progressText, { color: palette.label }]}>{formatGBFromMB(consumoMB)} / {formatGBFromMB(limiteMB)} GB</Text>
							<Text style={[ui.progressText, { color: palette.label }]}>{Math.round(progress * 100)}%</Text>
						</View>
						<ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#4CAF50'} />
					</View>
				) : null}

				<Divider style={ui.divider} />
				<View style={ui.rowBetween}>
					<Text style={[ui.mutedLabel, { color: palette.copy }]}>Por tiempo</Text>
					<Switch value={!!item.vpnisIlimitado} onValueChange={() => Meteor.users.update(item._id, { $set: { vpnisIlimitado: !item.vpnisIlimitado } })} />
				</View>

				{item.vpnisIlimitado ? (
					<Surface style={[ui.panel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
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
					<Surface style={[ui.panel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
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
					<Text style={[ui.sectionTitle, { color: palette.title }]}>Acciones</Text>
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
	accentBar: { height: 4, width: '100%' },
	content: { paddingBottom: 18, paddingTop: 16 },
	headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerTitle: { textAlign: 'left', paddingBottom: 0 },
	statusChip: { alignSelf: 'flex-start' },
	divider: { marginVertical: 10, opacity: 0.2 },
	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	mutedLabel: { fontWeight: '700' },
	section: { marginTop: 14 },
	sectionTitle: { textAlign: 'center', fontWeight: '800' },
	panel: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 12, marginTop: 16 },
	actionsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
	headerRight: { flexDirection: 'row', alignItems: 'center' },
	helper: { marginTop: 8, fontSize: 12, lineHeight: 17 },
	kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
	kpiItem: { borderRadius: 16, borderWidth: 1, flexGrow: 1, flexBasis: '30%', paddingHorizontal: 12, paddingVertical: 10 },
	kpiLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
	kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
	progressWrap: { marginTop: 10 },
	progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
	progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
	cancelChip: { marginLeft: 8, backgroundColor: '#E8F5E9' },
	cancelChipText: { fontWeight: '800', color: '#2E7D32' },
});

export default memo(VpnCardAdmin);
