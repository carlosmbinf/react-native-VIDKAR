import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ConsumptionProgressBar from './ConsumptionProgressBar';
import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, Divider, Switch, Text, useTheme } from 'react-native-paper';
import { Logs } from '../../collections/collections';

const BYTES_IN_MB_BINARY = 1048576;
const formatDate = (moment, date) => (date ? moment.utc(date).format('YYYY-MM-DD') : 'Fecha límite sin especificar');
const getPlanLabel = (item) => (item?.vpnplus ? 'VPN PLUS' : item?.vpn2mb ? 'VPN 2MB' : 'Sin Plan');
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
	const headerAccent = accentColor || (theme.dark ? '#4ade80' : '#16a34a');
	const statusActivo = currentItem.vpn === true;

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		dropdownBg: theme.dark ? 'rgba(15, 23, 42, 0.90)' : '#ffffff',
		dropdownBorder: theme.dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.12)',
		exitBg: theme.dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.08)',
		exitText: theme.dark ? '#cbd5e1' : '#475569',
		iconBg: theme.dark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(22, 163, 74, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		planBg: theme.dark ? 'rgba(168, 85, 247, 0.20)' : 'rgba(126, 34, 206, 0.10)',
		planText: theme.dark ? '#c084fc' : '#7e22ce',
		progressBg: theme.dark ? '#cbd5e1' : 'rgba(15, 23, 42, 0.08)',
		statusBg: statusActivo
			? (theme.dark ? 'rgba(34, 197, 94, 0.20)' : 'rgba(34, 197, 94, 0.12)')
			: (theme.dark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)'),
		statusText: statusActivo ? (theme.dark ? '#4ade80' : '#15803d') : (theme.dark ? '#f87171' : '#b91c1c'),
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
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="vpn-admin-card">
			<View style={[ui.statusRibbon, { backgroundColor: palette.statusBg }]} accessibilityRole="text">
				<Text style={[ui.statusRibbonText, { color: palette.statusText }]}>{statusActivo ? 'Activa' : 'Inactiva'}</Text>
			</View>
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.headerRow}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="shield-check" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Administración VPN</Text>
						<Text style={[ui.title, { color: palette.title }]}>Gestión de VPN</Text>
					</View>
				</View>
				<View style={ui.headerActions}>
					<Chip compact style={[ui.planChip, { backgroundColor: palette.planBg }]} textStyle={[ui.planChipText, { color: palette.planText }]}>
						{getPlanLabel(item)}
					</Chip>
					{canEdit ? (
						<Button
							mode="text"
							compact
							icon="close"
							onPress={onRequestView}
							style={[ui.cancelBtn, { backgroundColor: palette.exitBg }]}
							labelStyle={[ui.cancelBtnLabel, { color: palette.exitText }]}
						>
							Cerrar
						</Button>
					) : null}
				</View>

				<Text style={[ui.helper, { color: palette.copy }]}>{helper}</Text>

				{/* Metrics Grid */}
				<View style={ui.kpiGrid}>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="speedometer" size={16} color={headerAccent} />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.vpnisIlimitado ? 'Modalidad' : 'Límite'}</Text>
						</View>
						<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{limitLabel}</Text>
					</View>

					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="cloud-download-outline" size={16} color="#10b981" />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>Consumo</Text>
						</View>
						<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{Number(formatGBFromMB(consumoMB)).toFixed(2)} GB</Text>
					</View>

					{!item.vpnisIlimitado && limiteMB ? (
						<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
							<View style={ui.kpiTop}>
								<MaterialCommunityIcons name="timer-sand" size={16} color="#f59e0b" />
								<Text style={[ui.kpiLabel, { color: palette.label }]}>Restante</Text>
							</View>
							<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{formatGBFromMB(restanteMB)} GB</Text>
						</View>
					) : null}
				</View>

				{!item.vpnisIlimitado && limiteMB ? (
					<ConsumptionProgressBar
						label={`${formatGBFromMB(consumoMB)} / ${formatGBFromMB(limiteMB)} GB consumidos`}
						progress={progress}
						trackColor={palette.progressBg}
						textColor="#000000"
					/>
				) : null}

				<Divider style={ui.divider} />

				{/* Plan Type Switch */}
				<View style={[ui.switchRow, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
					<View style={ui.switchCopy}>
						<Text style={[ui.switchLabel, { color: palette.title }]}>Modalidad por tiempo</Text>
						<Text style={[ui.switchDesc, { color: palette.copy }]}>
							{item.vpnisIlimitado ? 'Fecha de vencimiento fija' : 'Límite por megas consumidos'}
						</Text>
					</View>
					<Switch
						value={!!item.vpnisIlimitado}
						onValueChange={() => Meteor.users.update(item._id, { $set: { vpnisIlimitado: !item.vpnisIlimitado } })}
					/>
				</View>

				{/* Calendar or Package Selector */}
				{item.vpnisIlimitado ? (
					<View style={[ui.formPanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.calendarHeader}>
							<MaterialCommunityIcons name="calendar-month-outline" size={20} color={headerAccent} />
							<Text style={[ui.sectionTitle, { color: palette.title }]}>Fecha límite de VPN</Text>
						</View>
						<Text style={[ui.calendarSubtitle, { color: palette.copy }]}>
							Vencimiento actual: {formatDate(moment, item.vpnfechaSubscripcion)}
						</Text>
						<View style={ui.calendarWrap}>
							<CalendarPicker
								format="YYYY-MM-DD"
								minDate={new Date()}
								selectedDayColor={headerAccent}
								selectedDayTextColor="#FFFFFF"
								mode="date"
								width={300}
								height={300}
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
						</View>
					</View>
				) : (
					<View style={[ui.formPanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.calendarHeader}>
							<MaterialCommunityIcons name="package-variant-closed" size={20} color={headerAccent} />
							<Text style={[ui.sectionTitle, { color: palette.title }]}>Paquete de datos VPN</Text>
						</View>
						<Dropdown
							style={[
								ui.dropdown,
								{ backgroundColor: palette.dropdownBg, borderColor: isFocusvpn ? headerAccent : palette.dropdownBorder },
							]}
							placeholderStyle={[ui.dropdownPlaceholder, { color: palette.label }]}
							selectedTextStyle={[ui.dropdownSelectedText, { color: palette.title }]}
							inputSearchStyle={[ui.inputSearchStyle, { color: palette.title, backgroundColor: palette.dropdownBg }]}
							iconStyle={ui.iconStyle}
							data={preciosVPNlist}
							search
							maxHeight={240}
							labelField="label"
							valueField="value"
							placeholder={!isFocusvpn ? 'Seleccione paquete VPN...' : '...'}
							searchPlaceholder="Buscar paquete..."
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
						<Button
							icon="database-import"
							disabled={!valuevpn}
							mode="contained"
							style={ui.setPackageBtn}
							contentStyle={ui.actionBtnContent}
							onPress={async () => {
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
							}}
						>
							{megasVPNlabel ? `Establecer ${megasVPNlabel}MB` : 'Seleccione un paquete'}
						</Button>
					</View>
				)}

				{/* Action Buttons */}
				<View style={ui.actionsContainer}>
					<Button
						icon="backup-restore"
						disabled={!item.vpnMbGastados}
						mode="outlined"
						onPress={handleReiniciarConsumoVPN}
						style={ui.actionBtn}
						contentStyle={ui.actionBtnContent}
					>
						Reiniciar consumo
					</Button>
					<Button
						mode="contained"
						buttonColor={item.vpn ? '#dc2626' : '#16a34a'}
						onPress={handleVPNStatus}
						icon={item.vpn ? 'close-circle-outline' : 'check-circle-outline'}
						style={ui.actionBtn}
						contentStyle={ui.actionBtnContent}
					>
						{item.vpn ? 'Deshabilitar' : 'Habilitar'}
					</Button>
				</View>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	actionBtn: {
		borderRadius: 14,
		flex: 1,
		minWidth: 140,
	},
	actionBtnContent: {
		minHeight: 44,
	},
	actionsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 4,
	},
	calendarHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
	},
	calendarSubtitle: {
		fontSize: 12,
	},
	calendarWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 6,
	},
	cancelBtn: {
		borderRadius: 999,
		height: 28,
		justifyContent: 'center',
	},
	cancelBtnLabel: {
		fontSize: 11,
		fontWeight: '800',
		marginHorizontal: 8,
		marginVertical: 0,
	},
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	content: {
		gap: 14,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	divider: {
		marginVertical: 2,
		opacity: 0.14,
	},
	dropdown: {
		borderRadius: 14,
		borderWidth: 1,
		height: 48,
		paddingHorizontal: 14,
	},
	dropdownPlaceholder: {
		fontSize: 13.5,
	},
	dropdownSelectedText: {
		fontSize: 13.5,
		fontWeight: '700',
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	eyebrowRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
	},
	formPanel: {
		borderRadius: 16,
		borderWidth: 1,
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	headerActions: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	headerCopy: {
		flex: 1,
		gap: 2,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
	},
	helper: {
		fontSize: 12,
		lineHeight: 17,
	},
	iconStyle: {
		height: 20,
		width: 20,
	},
	iconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
	},
	inputSearchStyle: {
		borderRadius: 12,
		fontSize: 13,
		height: 42,
	},
	kpiGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	kpiItem: {
		borderRadius: 14,
		borderWidth: 1,
		flexBasis: '30%',
		flexGrow: 1,
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	kpiLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	kpiTop: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 5,
	},
	kpiValue: {
		fontSize: 15,
		fontWeight: '800',
	},
	planChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	planChipText: {
		fontSize: 9.5,
		fontWeight: '900',
	},
	sectionTitle: {
		fontSize: 13.5,
		fontWeight: '800',
	},
	setPackageBtn: {
		borderRadius: 14,
		marginTop: 4,
	},
	statusRibbon: {
		borderBottomLeftRadius: 12,
		paddingHorizontal: 20,
		paddingVertical: 9,
		position: 'absolute',
		right: 0,
		top: 0,
		zIndex: 1,
	},
	statusRibbonText: {
		fontSize: 13,
		fontWeight: '800',
	},
	switchCopy: {
		flex: 1,
		gap: 2,
	},
	switchDesc: {
		fontSize: 11.5,
	},
	switchLabel: {
		fontSize: 13.5,
		fontWeight: '800',
	},
	switchRow: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default memo(VpnCardAdmin);
