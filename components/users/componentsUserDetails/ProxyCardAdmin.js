import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ConsumptionProgressBar from './ConsumptionProgressBar';
import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Divider, Switch, Text, useTheme } from 'react-native-paper';
import { Logs } from '../../collections/collections';

const BYTES_IN_MB_BINARY = 1048576;
const formatLimitDate = (moment, date) => (date ? moment.utc(date).format('DD-MM-YYYY') : 'Fecha límite sin especificar');
const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const clamp01 = (value) => Math.max(0, Math.min(1, value));

const ProxyCardAdmin = ({ item, styles, precioslist = [], handleReiniciarConsumo, addVenta, accentColor, canEdit, onRequestView }) => {
	const theme = useTheme();

	const moment = require('moment');
	const [value, setValue] = useState(null);
	const [isFocus, setIsFocus] = useState(false);

	const consumoMB = useMemo(() => Number(item?.megasGastadosinBytes || 0) / BYTES_IN_MB_BINARY, [item?.megasGastadosinBytes]);

	if (!item) {
		return null;
	}

	const limiteMB = Number(item.megas || 0);
	const progress = item.isIlimitado || !limiteMB ? 0 : clamp01(consumoMB / limiteMB);
	const restanteMB = Math.max(0, limiteMB - consumoMB);
	const statusActivo = !item.baneado;
	const headerAccent = accentColor || (theme.dark ? '#38bdf8' : '#0284c7');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		dropdownBg: theme.dark ? 'rgba(15, 23, 42, 0.90)' : '#ffffff',
		dropdownBorder: theme.dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.12)',
		exitBg: theme.dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.08)',
		exitText: theme.dark ? '#cbd5e1' : '#475569',
		iconBg: theme.dark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		progressBg: theme.dark ? '#cbd5e1' : 'rgba(15, 23, 42, 0.08)',
		statusBg: statusActivo
			? (theme.dark ? 'rgba(34, 197, 94, 0.20)' : 'rgba(34, 197, 94, 0.12)')
			: (theme.dark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)'),
		statusText: statusActivo ? (theme.dark ? '#4ade80' : '#15803d') : (theme.dark ? '#f87171' : '#b91c1c'),
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	const limitLabel = item.isIlimitado ? 'Por tiempo' : limiteMB ? `${formatGB(limiteMB)} GB` : 'No configurado';
	const helper = !statusActivo
		? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
		: item.isIlimitado
			? `Vence: ${formatLimitDate(moment, item.fechaSubscripcion)}`
			: limiteMB
				? `Restante aprox.: ${formatGB(restanteMB)} GB`
				: 'No hay un límite asignado aún.';

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="proxy-admin-card">
			<View style={[ui.statusRibbon, { backgroundColor: palette.statusBg }]} accessibilityRole="text">
				<Text style={[ui.statusRibbonText, { color: palette.statusText }]}>{statusActivo ? 'Activo' : 'Inactivo'}</Text>
			</View>
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.headerRow}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="server-network" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Administración de proxy</Text>
						<Text style={[ui.title, { color: palette.title }]}>Gestión de límites</Text>
					</View>
				</View>
				{canEdit ? (
					<View style={ui.headerActions}>
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
					</View>
				) : null}

				<Text style={[ui.helper, { color: palette.copy }]}>{helper}</Text>

				{/* Metrics Grid */}
				<View style={ui.kpiGrid}>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="speedometer" size={16} color={headerAccent} />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.isIlimitado ? 'Modalidad' : 'Límite'}</Text>
						</View>
						<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{limitLabel}</Text>
					</View>

					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="cloud-download-outline" size={16} color="#10b981" />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>Consumo</Text>
						</View>
						<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{formatGB(consumoMB)} GB</Text>
					</View>

					{!item.isIlimitado && limiteMB ? (
						<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
							<View style={ui.kpiTop}>
								<MaterialCommunityIcons name="timer-sand" size={16} color="#f59e0b" />
								<Text style={[ui.kpiLabel, { color: palette.label }]}>Restante</Text>
							</View>
							<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{formatGB(restanteMB)} GB</Text>
						</View>
					) : null}
				</View>

				{!item.isIlimitado && limiteMB ? (
					<ConsumptionProgressBar
						label={`${formatGB(consumoMB)} / ${formatGB(limiteMB)} GB consumidos`}
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
							{item.isIlimitado ? 'Fecha de vencimiento fija' : 'Límite por megas consumidos'}
						</Text>
					</View>
					<Switch
						value={!!item.isIlimitado}
						onValueChange={() => Meteor.users.update(item._id, { $set: { isIlimitado: !item.isIlimitado } })}
					/>
				</View>

				{/* Calendar or Package Selector */}
				{item.isIlimitado ? (
					<View style={[ui.formPanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.calendarHeader}>
							<MaterialCommunityIcons name="calendar-month-outline" size={20} color={headerAccent} />
							<Text style={[ui.sectionTitle, { color: palette.title }]}>Fecha límite de suscripción</Text>
						</View>
						<Text style={[ui.calendarSubtitle, { color: palette.copy }]}>
							Vencimiento actual: {formatLimitDate(moment, item.fechaSubscripcion)}
						</Text>
						<View style={ui.calendarWrap}>
							<CalendarPicker
								minDate={new Date()}
								selectedDayColor={headerAccent}
								selectedDayTextColor="#FFFFFF"
								selectedStartDate={item.fechaSubscripcion}
								width={300}
								height={300}
								onDateChange={(date) => {
									if (!date) {
										return;
									}
									Meteor.users.update(item._id, { $set: { fechaSubscripcion: new Date(moment.utc(date).startOf('day').add(4, 'hours')) } });
									Logs.insert({
										type: 'Fecha Limite Proxy',
										userAfectado: item._id,
										userAdmin: Meteor.userId(),
										message: `La Fecha Límite del Proxy se cambió para: ${moment.utc(new Date(date)).format('YYYY-MM-DD')}`,
									});
									if (!item.baneado) {
										Logs.insert({ type: 'PROXY', userAfectado: item._id, userAdmin: Meteor.userId(), message: 'Se desactivó el PROXY porque cambió la fecha límite' });
										Meteor.users.update(item._id, { $set: { baneado: !item.baneado } });
									}
								}}
							/>
						</View>
					</View>
				) : (
					<View style={[ui.formPanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<View style={ui.calendarHeader}>
							<MaterialCommunityIcons name="package-variant-closed" size={20} color={headerAccent} />
							<Text style={[ui.sectionTitle, { color: palette.title }]}>Paquete de datos (Megas)</Text>
						</View>
						<Dropdown
							style={[
								ui.dropdown,
								{ backgroundColor: palette.dropdownBg, borderColor: isFocus ? headerAccent : palette.dropdownBorder },
							]}
							placeholderStyle={[ui.dropdownPlaceholder, { color: palette.label }]}
							selectedTextStyle={[ui.dropdownSelectedText, { color: palette.title }]}
							inputSearchStyle={[ui.inputSearchStyle, { color: palette.title, backgroundColor: palette.dropdownBg }]}
							iconStyle={ui.iconStyle}
							data={precioslist}
							search
							maxHeight={240}
							labelField="label"
							valueField="value"
							placeholder={!isFocus ? 'Seleccione un paquete...' : '...'}
							searchPlaceholder="Buscar paquete..."
							value={value}
							onFocus={() => setIsFocus(true)}
							onBlur={() => setIsFocus(false)}
							onChange={(option) => {
								setValue(option.value);
								setIsFocus(false);
							}}
						/>
						<Button
							icon="database-import"
							disabled={!value}
							mode="contained"
							style={ui.setPackageBtn}
							contentStyle={ui.actionBtnContent}
							onPress={async () => {
								try {
									await Meteor.users.update(item._id, { $set: { megas: value } });
									await Meteor.call('registrarLog', 'Proxy', item._id, Meteor.userId(), `Consumo de Proxy actualizado a: ${value}MB`);
								} catch (error) {
									console.error(error);
								}
							}}
						>
							{value ? `Establecer ${value}MB` : 'Seleccione un paquete'}
						</Button>
					</View>
				)}

				{/* Action Buttons */}
				<View style={ui.actionsContainer}>
					<Button
						disabled={!item.megasGastadosinBytes}
						mode="outlined"
						onPress={handleReiniciarConsumo}
						icon="backup-restore"
						style={ui.actionBtn}
						contentStyle={ui.actionBtnContent}
					>
						Reiniciar consumo
					</Button>
					<Button
						mode="contained"
						buttonColor={statusActivo ? '#dc2626' : '#16a34a'}
						onPress={addVenta}
						icon={statusActivo ? 'close-circle-outline' : 'check-circle-outline'}
						style={ui.actionBtn}
						contentStyle={ui.actionBtnContent}
					>
						{statusActivo ? 'Deshabilitar' : 'Habilitar'}
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

export default memo(ProxyCardAdmin);
