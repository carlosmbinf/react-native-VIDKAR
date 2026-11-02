import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ConsumptionProgressBar from './ConsumptionProgressBar';
import MeteorBase from '@meteorrn/core';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';

import { ServersCollection } from '../../collections/collections';

const Meteor =
	/** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
		MeteorBase
	);

const VPN_SERVER_FIELDS = {
	_id: 1,
	active: 1,
	details: 1,
	domain: 1,
	estado: 1,
	ip: 1,
	usuariosAprobados: 1,
};

const BYTES_IN_MB_BINARY = 1048576;
const BYTES_IN_GB_BINARY = 1073741824;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const formatLimitDate = (moment, date) => (date ? moment.utc(date).format('DD-MM-YYYY') : 'Fecha límite sin especificar');
const formatGBFromMB = (mb) => ((Number(mb) || 0) / 1024).toFixed(2);
const getPlanLabel = (item) => (item?.vpnplus ? 'VPN PLUS' : item?.vpn2mb ? 'VPN 2MB' : 'VPN');

const VpnCardUser = ({ item, styles, momentLib, accentColor, canEdit, onRequestEdit }) => {
	const theme = useTheme();

	const moment = momentLib || require('moment');
	const username = item?.username || null;
	const statusActivo = item?.vpn === true;

	const { loadingServers, vpnServers } = Meteor.useTracker(() => {
		if (!username || !statusActivo) {
			return { loadingServers: false, vpnServers: [] };
		}

		const selector = {
			usuariosAprobados: { $in: [username] },
		};
		const handle = Meteor.subscribe('servers', selector, {
			fields: VPN_SERVER_FIELDS,
		});
		const docs = handle.ready()
			? ServersCollection.find(selector, {
				fields: VPN_SERVER_FIELDS,
				sort: { domain: 1, ip: 1 },
			}).fetch()
			: [];

		return {
			loadingServers: !handle.ready(),
			vpnServers: docs,
		};
	}, [statusActivo, username]);

	const consumo = useMemo(() => {
		const bytes = item?.vpnMbGastados || 0;
		return {
			gb: bytes / BYTES_IN_GB_BINARY,
			mb: bytes / BYTES_IN_MB_BINARY,
		};
	}, [item?.vpnMbGastados]);

	if (!item || !(item.vpnMbGastados || item.vpnfechaSubscripcion || item.vpnmegas || item.vpn)) {
		return null;
	}

	const headerAccent = accentColor || (theme.dark ? '#4ade80' : '#16a34a');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		editBg: theme.dark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.08)',
		editText: theme.dark ? '#93c5fd' : '#1d4ed8',
		iconBg: theme.dark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(22, 163, 74, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		planBg: theme.dark ? 'rgba(168, 85, 247, 0.20)' : 'rgba(126, 34, 206, 0.10)',
		planText: theme.dark ? '#c084fc' : '#7e22ce',
		progressBg: theme.dark ? '#cbd5e1' : 'rgba(15, 23, 42, 0.08)',
		serverCard: theme.dark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
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

	const limiteMB = Number(item.vpnmegas || 0);
	const restanteMB = Math.max(0, limiteMB - consumo.mb);
	const progress = item.vpnisIlimitado || !limiteMB ? 0 : clamp01(consumo.mb / limiteMB);
	const limitLabel = item.vpnisIlimitado ? 'Por tiempo' : limiteMB ? `${formatGBFromMB(limiteMB)} GB` : 'No configurado';
	const helper = !statusActivo
		? 'El servicio está deshabilitado. Contacta a soporte si necesitas reactivarlo.'
		: item.vpnisIlimitado
			? `Vence: ${formatLimitDate(moment, item.vpnfechaSubscripcion)}`
			: limiteMB
				? `Restante aprox.: ${formatGBFromMB(restanteMB)} GB`
				: 'No hay un límite asignado aún.';

	const setupItems = [
		{ icon: 'ip-network', label: 'IP VPN', value: item.vpnip || 'Sin IP asignada' },
		{ icon: 'shield-lock-outline', label: 'Protocolo', value: 'L2TP con clave compartida' },
		{ icon: 'key-variant', label: 'Clave precompartida', value: 'vidkar' },
		{ icon: 'account', label: 'Usuario', value: item.username || 'Usuario VidKar' },
		{ icon: 'lock-outline', label: 'Contraseña', value: 'Contraseña de VidKar' },
	];

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="vpn-user-card">
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
						<Text style={[ui.eyebrow, { color: palette.label }]}>Túnel seguro</Text>
						<Text style={[ui.title, { color: palette.title }]}>VPN VIDKAR</Text>
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
							icon="pencil-outline"
							onPress={onRequestEdit}
							style={[ui.editBtn, { backgroundColor: palette.editBg }]}
							labelStyle={[ui.editBtnLabel, { color: palette.editText }]}
						>
							Editar
						</Button>
					) : null}
				</View>

				<Text style={[ui.helper, { color: palette.copy }]}>{helper}</Text>

				{/* Metrics Grid */}
				<View style={ui.kpiGrid}>
					<View style={[ui.kpiItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
						<View style={ui.kpiTop}>
							<MaterialCommunityIcons name="speedometer" size={16} color={headerAccent} />
							<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.vpnisIlimitado ? 'Modalidad' : 'Límite'}</Text>
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

					{!item.vpnisIlimitado && limiteMB ? (
						<View style={[ui.kpiItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
							<View style={ui.kpiTop}>
								<MaterialCommunityIcons name="timer-sand" size={16} color="#f59e0b" />
								<Text style={[ui.kpiLabel, { color: palette.label }]}>Restante</Text>
							</View>
							<Text style={[ui.kpiValue, { color: palette.title }]} numberOfLines={1}>{formatGBFromMB(restanteMB)} GB</Text>
						</View>
					) : null}
				</View>

				{/* Progress bar */}
				{!item.vpnisIlimitado && limiteMB ? (
					<ConsumptionProgressBar
						label={`${consumo.gb.toFixed(2)} / ${formatGBFromMB(limiteMB)} GB consumidos`}
						progress={progress}
						trackColor={palette.progressBg}
						textColor="#000000"
					/>
				) : null}

				{/* Connection Details & Servers */}
				{statusActivo ? (
					<View style={[ui.setupPanel, { backgroundColor: palette.setupBg, borderColor: palette.setupBorder }]}>
						<View style={ui.setupHeaderRow}>
							<Text style={[ui.setupEyebrow, { color: palette.label }]}>Credenciales y configuración</Text>
							<Chip compact icon="vpn" style={ui.setupTag} textStyle={ui.setupTagText}>
								L2TP / IPSec
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

						<Divider style={ui.divider} />

						{/* Server List */}
						<View style={ui.serverSection}>
							<View style={ui.serverHeaderRow}>
								<MaterialCommunityIcons name="server" size={16} color={headerAccent} />
								<Text style={[ui.serverSectionTitle, { color: palette.title }]}>Servidores aprobados</Text>
							</View>

							{loadingServers ? (
								<View style={ui.serverLoadingRow}>
									<ActivityIndicator animating size="small" color={headerAccent} />
									<Text style={[ui.serverLoadingText, { color: palette.copy }]}>Consultando servidores...</Text>
								</View>
							) : vpnServers.length > 0 ? (
								<View style={ui.serverList}>
									{vpnServers.map((server) => {
										const serverActive = server.estado === 'ACTIVO' || (server.active && !server.estado);
										return (
											<View
												key={server._id}
												style={[ui.serverCard, { backgroundColor: palette.serverCard, borderColor: palette.setupBorder }]}
											>
												<View style={ui.serverCardTop}>
													<Text style={[ui.serverName, { color: palette.title }]} numberOfLines={1}>
														{server.details || 'Servidor VPN'}
													</Text>
													<Chip
														compact
														style={[
															ui.serverStatusChip,
															{ backgroundColor: serverActive ? (theme.dark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.1)') : (theme.dark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.1)') },
														]}
														textStyle={[
															ui.serverStatusText,
															{ color: serverActive ? (theme.dark ? '#4ade80' : '#15803d') : (theme.dark ? '#f87171' : '#b91c1c') },
														]}
													>
														{server.estado || (server.active ? 'ACTIVO' : 'INACTIVO')}
													</Chip>
												</View>
												<View style={ui.serverDetailsGrid}>
													<Text style={[ui.serverLine, { color: palette.copy }]}>
														DNS: <Text style={ui.serverCode}>{server.domain || 'Sin dominio'}</Text>
													</Text>
													<Text style={[ui.serverLine, { color: palette.copy }]}>
														IP: <Text style={ui.serverCode}>{server.ip || 'Sin IP'}</Text>
													</Text>
												</View>
											</View>
										);
									})}
								</View>
							) : (
								<Text style={[ui.serverEmptyText, { color: palette.label }]}>
									Este usuario no tiene servidores VPN asignados en este momento.
								</Text>
							)}
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
	divider: {
		opacity: 0.14,
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
	eyebrowRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
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
	planChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	planChipText: {
		fontSize: 9.5,
		fontWeight: '900',
	},
	serverCard: {
		borderRadius: 12,
		borderWidth: 1,
		gap: 6,
		padding: 10,
	},
	serverCardTop: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	serverCode: {
		fontWeight: '700',
	},
	serverDetailsGrid: {
		gap: 2,
	},
	serverEmptyText: {
		fontSize: 12,
		lineHeight: 17,
	},
	serverHeaderRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 6,
	},
	serverLine: {
		fontSize: 11.5,
	},
	serverList: {
		gap: 8,
	},
	serverLoadingRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		paddingVertical: 4,
	},
	serverLoadingText: {
		fontSize: 12,
		fontWeight: '600',
	},
	serverName: {
		fontSize: 13,
		fontWeight: '800',
	},
	serverSection: {
		gap: 8,
	},
	serverSectionTitle: {
		fontSize: 12.5,
		fontWeight: '800',
		letterSpacing: 0.2,
		textTransform: 'uppercase',
	},
	serverStatusChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	serverStatusText: {
		fontSize: 9.5,
		fontWeight: '800',
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
		gap: 12,
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

export default memo(VpnCardUser);
