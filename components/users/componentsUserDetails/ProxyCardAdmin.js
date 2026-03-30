import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, Divider, ProgressBar, Surface, Switch, Text, Title } from 'react-native-paper';
import { Logs } from '../../collections/collections';

const BYTES_IN_MB_BINARY = 1048576;
const formatLimitDate = (moment, date) => (date ? moment.utc(date).format('DD-MM-YYYY') : 'Fecha límite sin especificar');
const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const clamp01 = (value) => Math.max(0, Math.min(1, value));

const ProxyCardAdmin = ({ item, styles, precioslist = [], handleReiniciarConsumo, addVenta, accentColor, canEdit, onRequestView }) => {
	if (!item) {
		return null;
	}

	const moment = require('moment');
	const [value, setValue] = useState(null);
	const [isFocus, setIsFocus] = useState(false);

	const consumoMB = useMemo(() => Number(item.megasGastadosinBytes || 0) / BYTES_IN_MB_BINARY, [item.megasGastadosinBytes]);
	const limiteMB = Number(item.megas || 0);
	const progress = item.isIlimitado || !limiteMB ? 0 : clamp01(consumoMB / limiteMB);
	const restanteMB = Math.max(0, limiteMB - consumoMB);
	const statusActivo = !item.baneado;
	const headerAccent = accentColor || '#546e7a';

	const limitLabel = item.isIlimitado ? 'Por tiempo' : limiteMB ? `${formatGB(limiteMB)} GB` : 'No configurado';
	const helper = !statusActivo
		? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
		: item.isIlimitado
			? `Vence: ${formatLimitDate(moment, item.fechaSubscripcion)}`
			: limiteMB
				? `Restante aprox.: ${formatGB(restanteMB)} GB`
				: 'No hay un límite asignado aún.';

	return (
		<Card elevation={12} style={[styles.cards, ui.cardShell]} testID="proxy-admin-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={styles.element}>
					<View style={ui.headerRow}>
						<Title style={styles.title}>Proxy</Title>
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

					<Text style={ui.helper}>{helper}</Text>
					<Divider style={ui.divider} />

					<View style={ui.kpiRow}>
						<View style={ui.kpiItem}>
							<Text style={ui.kpiLabel}>{item.isIlimitado ? 'Tipo' : 'Límite'}</Text>
							<Text style={ui.kpiValue}>{limitLabel}</Text>
						</View>
						<View style={ui.kpiItem}>
							<Text style={ui.kpiLabel}>Consumo</Text>
							<Text style={ui.kpiValue}>{formatGB(consumoMB)} GB</Text>
						</View>
						{!item.isIlimitado && limiteMB ? (
							<View style={ui.kpiItem}>
								<Text style={ui.kpiLabel}>Restante</Text>
								<Text style={ui.kpiValue}>{formatGB(restanteMB)} GB</Text>
							</View>
						) : null}
					</View>

					{!item.isIlimitado && limiteMB ? (
						<View style={ui.progressWrap}>
							<View style={ui.progressMeta}>
								<Text style={ui.progressText}>{formatGB(consumoMB)} / {formatGB(limiteMB)} GB</Text>
								<Text style={ui.progressText}>{Math.round(progress * 100)}%</Text>
							</View>
							<ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#1E88E5'} />
						</View>
					) : null}

					<Divider style={ui.divider} />

					<View style={ui.rowBetween}>
						<Text style={ui.mutedLabel}>Por tiempo:</Text>
						<Switch value={!!item.isIlimitado} onValueChange={() => Meteor.users.update(item._id, { $set: { isIlimitado: !item.isIlimitado } })} />
					</View>

					<Divider style={ui.divider} />

					{item.isIlimitado ? (
						<>
							<View style={{ width: '100%', marginTop: 6 }}>
								<Text style={{ textAlign: 'center', fontWeight: '600' }}>Fecha Límite</Text>
								<Text style={{ textAlign: 'center', marginTop: 4 }}>{formatLimitDate(moment, item.fechaSubscripcion)}</Text>
							</View>
							<Surface style={{ borderRadius: 16, marginTop: 20, backgroundColor: '#546e7a' }}>
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
							<Surface style={{ width: '100%', elevation: 3, borderRadius: 16, marginTop: 14, padding: 12 }}>
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
						<Text style={{ textAlign: 'center', fontWeight: '600' }}>Acciones</Text>
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
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	content: { paddingTop: 10 },
	divider: { marginVertical: 10, opacity: 0.2 },
	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	mutedLabel: { opacity: 0.75, fontWeight: '600' },
	headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	headerRight: { flexDirection: 'row', alignItems: 'center' },
	helper: { marginTop: 8, opacity: 0.75, fontSize: 12, lineHeight: 16 },
	kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
	kpiItem: { flexGrow: 1, flexBasis: '30%', paddingVertical: 6 },
	kpiLabel: { fontSize: 12, opacity: 0.65, fontWeight: '600' },
	kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
	progressWrap: { marginTop: 10 },
	progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
	progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
	cancelChip: { marginLeft: 8, backgroundColor: '#E3F2FD' },
	cancelChipText: { fontWeight: '800', color: '#1565C0' },
});

const btnStyles = StyleSheet.create({
	action: { marginTop: 8, borderRadius: 20, marginHorizontal: 8 },
});

export default memo(ProxyCardAdmin);
