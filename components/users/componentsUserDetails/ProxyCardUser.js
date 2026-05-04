import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, ProgressBar, Text, Title, useTheme } from 'react-native-paper';

const BYTES_IN_MB_BINARY = 1048576;
const BYTES_IN_GB_BINARY = 1073741824;
const formatLimitDate = (moment, date) => (date ? moment.utc(date).format('DD-MM-YYYY') : 'Fecha límite sin especificar');
const formatGB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const clamp01 = (value) => Math.max(0, Math.min(1, value));

const ProxyCardUser = ({ item, styles, momentLib, accentColor, canEdit, onRequestEdit }) => {
	const theme = useTheme();

	const moment = momentLib || require('moment');
	const consumo = useMemo(() => {
		const bytes = item?.megasGastadosinBytes || 0;
		return {
			mb: bytes / BYTES_IN_MB_BINARY,
			gb: bytes / BYTES_IN_GB_BINARY,
		};
	}, [item?.megasGastadosinBytes]);

	if (!item || !(item.megasGastadosinBytes || item.fechaSubscripcion || item.megas)) {
		return null;
	}

	const statusActivo = !item.baneado;
	const headerAccent = accentColor || '#546e7a';
	const palette = {
		chip: theme.dark ? 'rgba(59, 130, 246, 0.22)' : '#E3F2FD',
		chipText: theme.dark ? '#dbeafe' : '#1565C0',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(248, 250, 252, 0.96)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	const limiteMB = Number(item.megas || 0);
	const restanteMB = Math.max(0, limiteMB - consumo.mb);
	const progress = item.isIlimitado || !limiteMB ? 0 : clamp01(consumo.mb / limiteMB);
	const limitLabel = item.isIlimitado ? 'Por tiempo' : limiteMB ? `${formatGB(limiteMB)} GB` : 'No configurado';
	const helper = !statusActivo
		? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
		: item.isIlimitado
			? `Vence: ${formatLimitDate(moment, item.fechaSubscripcion)}`
			: limiteMB
				? `Restante aprox.: ${formatGB(restanteMB)} GB`
				: 'No hay un límite asignado aún.';

	return (
		<Card elevation={4} style={styles.cards} testID="proxy-user-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<Title style={[styles.title, ui.headerTitle, { color: palette.title }]}>Proxy</Title>
					<View style={ui.headerRight}>
						<Chip compact icon={statusActivo ? 'check-circle' : 'close-circle'} style={[ui.statusChip, { backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }]} selectedColor="#fff">
							{statusActivo ? 'Activo' : 'Inactivo'}
						</Chip>
						{canEdit ? (
							<Chip compact icon="pencil" mode="flat" onPress={onRequestEdit} style={[ui.editChip, { backgroundColor: palette.chip }]} textStyle={[ui.editChipText, { color: palette.chipText }]}>
								Editar
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
						<Text style={[ui.kpiValue, { color: palette.title }]}>{consumo.gb.toFixed(2)} GB</Text>
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
							<Text style={[ui.progressText, { color: palette.label }]}>{consumo.gb.toFixed(2)} / {formatGB(limiteMB)} GB</Text>
							<Text style={[ui.progressText, { color: palette.label }]}>{Math.round(progress * 100)}%</Text>
						</View>
						<ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#1E88E5'} />
					</View>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	accentBar: { height: 4, width: '100%' },
	content: { gap: 12, paddingBottom: 18, paddingTop: 16 },
	headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerTitle: { textAlign: 'left', paddingBottom: 0 },
	statusChip: { alignSelf: 'flex-start' },
	helper: { fontSize: 12, lineHeight: 17 },
	divider: { marginVertical: 10, opacity: 0.2 },
	kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
	kpiItem: { borderRadius: 16, borderWidth: 1, flexGrow: 1, flexBasis: '30%', paddingHorizontal: 12, paddingVertical: 10 },
	kpiLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
	kpiValue: { marginTop: 2, fontSize: 14, fontWeight: '800' },
	progressWrap: { marginTop: 10 },
	progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
	progressText: { fontSize: 12, opacity: 0.75, fontWeight: '600' },
	headerRight: { flexDirection: 'row', alignItems: 'center' },
	editChip: { borderRadius: 999, marginLeft: 8 },
	editChipText: { fontWeight: '800' },
});

export default memo(ProxyCardUser);
