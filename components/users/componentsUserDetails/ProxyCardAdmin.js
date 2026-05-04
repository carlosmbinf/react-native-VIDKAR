import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, Divider, ProgressBar, Surface, Switch, Text, Title, useTheme } from 'react-native-paper';
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
	const headerAccent = accentColor || '#546e7a';
	const palette = {
		copy: theme.dark ? '#cbd5e1' : '#475569',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(248, 250, 252, 0.96)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)',
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
		<Card elevation={4} style={styles.cards} testID="proxy-admin-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={styles.element}>
					<View style={ui.headerRow}>
						<Title style={[styles.title, { color: palette.title }]}>Proxy</Title>
						<View style={ui.headerRight}>
							<Chip compact icon={statusActivo ? 'check-circle' : 'close-circle'} style={{ backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }} selectedColor="#fff">
								{statusActivo ? 'Activo' : 'Inactivo'}
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
							<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.isIlimitado ? 'Tipo' : 'Límite'}</Text>
							<Text style={[ui.kpiValue, { color: palette.title }]}>{limitLabel}</Text>
						</View>
						<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
							<Text style={[ui.kpiLabel, { color: palette.label }]}>Consumo</Text>
							<Text style={[ui.kpiValue, { color: palette.title }]}>{formatGB(consumoMB)} GB</Text>
						</View>
						{!item.isIlimitado && limiteMB ? (
							<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
								<Text style={[ui.kpiLabel, { color: palette.label }]}>Restante</Text>
								<Text style={[ui.kpiValue, { color: palette.title }]}>{formatGB(restanteMB)} GB</Text>
							</View>
						) : null}
					</View>

					{!item.isIlimitado && limiteMB ? (
						<View style={ui.progressWrap}>
							<View style={ui.progressMeta}>
								<Text style={[ui.progressText, { color: palette.label }]}>{formatGB(consumoMB)} / {formatGB(limiteMB)} GB</Text>
								<Text style={[ui.progressText, { color: palette.label }]}>{Math.round(progress * 100)}%</Text>
							</View>
							<ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#1E88E5'} />
						</View>
					) : null}

					<Divider style={ui.divider} />

					<View style={ui.rowBetween}>
						<Text style={[ui.mutedLabel, { color: palette.copy }]}>Por tiempo:</Text>
						<Switch value={!!item.isIlimitado} onValueChange={() => Meteor.users.update(item._id, { $set: { isIlimitado: !item.isIlimitado } })} />
					</View>

					<Divider style={ui.divider} />

					{item.isIlimitado ? (
						<>
							<View style={{ width: '100%', marginTop: 6 }}>
								<Text style={[ui.sectionTitle, { color: palette.title }]}>Fecha Límite</Text>
								<Text style={[ui.sectionSubtitle, { color: palette.copy }]}>{formatLimitDate(moment, item.fechaSubscripcion)}</Text>
							</View>
							<Surface style={[ui.formPanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
								<CalendarPicker
									minDate={new Date()}
									selectedDayColor="#6200ee"
									selectedDayTextColor="#FFFFFF"
									selectedStartDate={item.fechaSubscripcion}
									width={320}
									height={320}
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
							</Surface>
						</>
					) : (
						<View style={{ paddingTop: 10 }}>
							<Surface style={[ui.formPanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
								{value || isFocus ? <Text style={[styles.label, isFocus && { color: 'blue' }]}>Megas • Precio</Text> : null}
								<Dropdown
									style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
									placeholderStyle={styles.placeholderStyle}
									selectedTextStyle={styles.selectedTextStyle}
									inputSearchStyle={styles.inputSearchStyle}
									iconStyle={styles.iconStyle}
									data={precioslist}
									search
									maxHeight={precioslist.length * 50 + 70 > 220 ? 220 : precioslist.length * 50 + 70}
									labelField="label"
									valueField="value"
									placeholder={!isFocus ? 'Seleccione un paquete' : '...'}
									searchPlaceholder="Buscar..."
									value={value}
									onFocus={() => setIsFocus(true)}
									onBlur={() => setIsFocus(false)}
									onChange={(option) => {
										setValue(option.value);
										setIsFocus(false);
									}}
								/>
								<View style={{ paddingTop: 10 }}>
									<Button icon="database-import" disabled={!value} mode="contained" style={btnStyles.action} onPress={async () => {
										try {
											await Meteor.users.update(item._id, { $set: { megas: value } });
											await Meteor.call('registrarLog', 'Proxy', item._id, Meteor.userId(), `Consumo de Proxy actualizado a: ${value}MB`);
										} catch (error) {
											console.error(error);
										}
									}}>
										{value ? `Establecer ${value}MB` : 'Seleccione un paquete'}
									</Button>
								</View>
							</Surface>
						</View>
					)}

					<View style={{ width: '100%', marginTop: 18 }}>
						<Text style={[ui.sectionTitle, { color: palette.title }]}>Acciones</Text>
						<View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
							<Button disabled={!item.megasGastadosinBytes} mode="outlined" onPress={handleReiniciarConsumo} style={btnStyles.action} icon="backup-restore">
								Reiniciar Consumo
							</Button>
							<Button mode="contained" buttonColor={statusActivo ? '#c62828' : '#2e7d32'} onPress={addVenta} style={btnStyles.action}>
								{statusActivo ? 'Deshabilitar' : 'Habilitar'}
							</Button>
						</View>
					</View>
				</View>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	accentBar: { height: 4, width: '100%' },
	content: { paddingBottom: 18, paddingTop: 16 },
	divider: { marginVertical: 10, opacity: 0.2 },
	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	mutedLabel: { fontWeight: '700' },
	headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	headerRight: { flexDirection: 'row', alignItems: 'center' },
	helper: { marginTop: 8, fontSize: 12, lineHeight: 17 },
	kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
	kpiItem: { borderRadius: 16, borderWidth: 1, flexGrow: 1, flexBasis: '30%', paddingHorizontal: 12, paddingVertical: 10 },
	kpiLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
	kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
	progressWrap: { marginTop: 10 },
	progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
	progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
	cancelChip: { marginLeft: 8, backgroundColor: '#E3F2FD' },
	cancelChipText: { fontWeight: '800', color: '#1565C0' },
	formPanel: { borderRadius: 18, borderWidth: 1, marginTop: 14, padding: 12, width: '100%' },
	sectionTitle: { fontWeight: '800', textAlign: 'center' },
	sectionSubtitle: { marginTop: 4, textAlign: 'center' },
});

const btnStyles = StyleSheet.create({
	action: { marginTop: 8, borderRadius: 20, marginHorizontal: 8 },
});

export default memo(ProxyCardAdmin);
