import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ConsumptionProgressBar from './ConsumptionProgressBar';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';

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
			gb: bytes / BYTES_IN_GB_BINARY,
			mb: bytes / BYTES_IN_MB_BINARY,
		};
	}, [item?.megasGastadosinBytes]);

	if (!item || !(item.megasGastadosinBytes || item.fechaSubscripcion || item.megas)) {
		return null;
	}

	const statusActivo = !item.baneado;
	const headerAccent = accentColor || (theme.dark ? '#38bdf8' : '#0284c7');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		editBg: theme.dark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.08)',
		editText: theme.dark ? '#93c5fd' : '#1d4ed8',
		iconBg: theme.dark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		progressBg: theme.dark ? '#cbd5e1' : 'rgba(15, 23, 42, 0.08)',
		setupBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		setupBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		statusBg: statusActivo
			? (theme.dark ? 'rgba(34, 197, 94, 0.20)' : 'rgba(34, 197, 94, 0.12)')
			: (theme.dark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)'),
		statusText: statusActivo ? (theme.dark ? '#4ade80' : '#15803d') : (theme.dark ? '#f87171' : '#b91c1c'),
		tileBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		tileBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
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

	const setupItems = [
		{ icon: 'server-network', label: 'Servidor', value: 'proxy.vidkar.com' },
		{ icon: 'numeric', label: 'Puerto', value: '3002' },
		{ icon: 'account', label: 'Usuario', value: item.username || 'Usuario VidKar' },
		{ icon: 'key-outline', label: 'Contraseña', value: 'Contraseña de VidKar' },
	];

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="proxy-user-card">
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
						<Text style={[ui.eyebrow, { color: palette.label }]}>Conectividad</Text>
						<Text style={[ui.title, { color: palette.title }]}>Proxy VIDKAR</Text>
					</View>
				</View>
				{canEdit ? (
					<View style={ui.headerActions}>
						<Button
							mode="text"
							compact
							icon="pencil-outline"
							onPress={onRequestEdit}
							style={[ui.editBtn, { backgroundColor: palette.editBg }]}
							labelStyle={[ui.editBtnLabel, { color: palette.editText }]}
						>
							Editar
						</Button>
					</View>
				) : null}

				<Text style={[ui.helper, { color: palette.copy }]}>{helper}</Text>

				{/* Metrics Grid */}
				<View style={ui.kpiGrid}>
					<View style={[ui.kpiItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="speedometer" size={16} color={headerAccent} />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.isIlimitado ? 'Modalidad' : 'Límite'}</Text>
						</View>
						<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{limitLabel}</Text>
					</View>

					<View style={[ui.kpiItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="cloud-download-outline" size={16} color="#10b981" />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>Consumo</Text>
						</View>
						<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{consumo.gb.toFixed(2)} GB</Text>
					</View>

					{!item.isIlimitado && limiteMB ? (
						<View style={[ui.kpiItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
							<View style={ui.kpiTop}>
								<MaterialCommunityIcons name="timer-sand" size={16} color="#f59e0b" />
								<Text style={[ui.kpiLabel, { color: palette.label }]}>Restante</Text>
							</View>
							<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{formatGB(restanteMB)} GB</Text>
						</View>
					) : null}
				</View>

				{/* Progress bar */}
				{!item.isIlimitado && limiteMB ? (
					<ConsumptionProgressBar
						label={`${consumo.gb.toFixed(2)} / ${formatGB(limiteMB)} GB consumidos`}
						progress={progress}
						trackColor={palette.progressBg}
						textColor="#000000"
					/>
				) : null}

				{/* Connection Details */}
				{statusActivo ? (
					<View style={[ui.setupPanel, { backgroundColor: palette.setupBg, borderColor: palette.setupBorder }]}>
						<View style={ui.setupHeaderRow}>
							<Text style={[ui.setupEyebrow, { color: palette.label }]}>Credenciales de acceso</Text>
							<Chip compact icon="shield-lock-outline" style={ui.setupTag} textStyle={ui.setupTagText}>
								VidKar
							</Chip>
						</View>
						<View style={ui.setupGrid}>
							{setupItems.map((setup) => (
								<View key={setup.label} style={ui.setupItem}>
									<View style={ui.setupItemHeader}>
										<MaterialCommunityIcons name={setup.icon} size={14} color={palette.label} />
										<Text style={[ui.setupLabel, { color: palette.label }]}>{setup.label}</Text>
									</View>
									<Text style={[ui.setupValue, { color: palette.title }]} numberOfLines={1}>
										{setup.value}
									</Text>
								</View>
							))}
						</View>
					</View>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	content: {
		gap: 14,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	editBtn: {
		borderRadius: 999,
		height: 28,
		justifyContent: 'center',
	},
	editBtnLabel: {
		fontSize: 11,
		fontWeight: '800',
		marginHorizontal: 8,
		marginVertical: 0,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
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
	iconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
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
	setupBg: {
		gap: 10,
	},
	setupEyebrow: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	setupGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	setupHeaderRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	setupItem: {
		flexBasis: '47%',
		flexGrow: 1,
		gap: 2,
		minWidth: 120,
	},
	setupItemHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 4,
	},
	setupLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.2,
		textTransform: 'uppercase',
	},
	setupPanel: {
		borderRadius: 16,
		borderWidth: 1,
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	setupTag: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	setupTagText: {
		fontSize: 9.5,
		fontWeight: '800',
	},
	setupValue: {
		fontSize: 12.5,
		fontWeight: '700',
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
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default memo(ProxyCardUser);
