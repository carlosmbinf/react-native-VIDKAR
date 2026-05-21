import MeteorBase from '@meteorrn/core';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Divider, ProgressBar, Text, Title, useTheme } from 'react-native-paper';

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
			mb: bytes / BYTES_IN_MB_BINARY,
			gb: bytes / BYTES_IN_GB_BINARY,
		};
	}, [item?.vpnMbGastados]);

	if (!item || !(item.vpnMbGastados || item.vpnfechaSubscripcion || item.vpnmegas || item.vpn)) {
		return null;
	}

	const headerAccent = accentColor || '#4CAF50';
	const palette = {
		chip: theme.dark ? 'rgba(34, 197, 94, 0.2)' : '#E8F5E9',
		chipText: theme.dark ? '#bbf7d0' : '#2E7D32',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(248, 250, 252, 0.96)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)',
		setupAccent: theme.dark ? '#86efac' : '#15803d',
		setupPanel: theme.dark ? 'rgba(22, 101, 52, 0.22)' : 'rgba(22, 163, 74, 0.08)',
		setupPanelBorder: theme.dark ? 'rgba(134, 239, 172, 0.22)' : 'rgba(22, 163, 74, 0.18)',
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

	return (
		<Card elevation={4} style={styles.cards} testID="vpn-user-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<Title style={[styles.title, ui.headerTitle, { color: palette.title }]}>VPN</Title>
					<View style={ui.headerRight}>
						<Chip compact icon={statusActivo ? 'check-circle' : 'close-circle'} style={[ui.statusChip, { backgroundColor: statusActivo ? '#2e7d32' : '#c62828' }]} selectedColor="#fff">
							{statusActivo ? 'Activa' : 'Inactiva'}
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
						<Text style={[ui.kpiLabel, { color: palette.label }]}>Plan</Text>
						<Text style={[ui.kpiValue, { color: palette.title }]}>{getPlanLabel(item)}</Text>
					</View>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.kpiLabel, { color: palette.label }]}>{item.vpnisIlimitado ? 'Tipo' : 'Límite'}</Text>
						<Text style={[ui.kpiValue, { color: palette.title }]}>{limitLabel}</Text>
					</View>
					<View style={[ui.kpiItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.kpiLabel, { color: palette.label }]}>Consumo</Text>
						<Text style={[ui.kpiValue, { color: palette.title }]}>{consumo.gb.toFixed(2)} GB</Text>
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
							<Text style={[ui.progressText, { color: palette.label }]}>{consumo.gb.toFixed(2)} / {formatGBFromMB(limiteMB)} GB</Text>
							<Text style={[ui.progressText, { color: palette.label }]}>{Math.round(progress * 100)}%</Text>
						</View>
						<ProgressBar progress={progress} color={progress > 0.8 ? '#F57C00' : '#4CAF50'} />
					</View>
				) : null}

				{statusActivo ? (
					<View style={[ui.setupPanel, { backgroundColor: palette.setupPanel, borderColor: palette.setupPanelBorder }]}> 
						<View style={ui.setupHeaderRow}>
							<Text style={[ui.setupEyebrow, { color: palette.setupAccent }]}>Configuración VPN</Text>
							<Chip compact icon="vpn" style={[ui.setupChip, { backgroundColor: palette.chip }]} textStyle={[ui.setupChipText, { color: palette.chipText }]}>L2TP</Chip>
						</View>

						<View style={ui.setupGrid}>
							<View style={ui.setupItem}>
								<Text style={[ui.setupLabel, { color: palette.label }]}>Tipo de VPN</Text>
								<Text style={[ui.setupValue, { color: palette.title }]}>L2TP con clave precompartida</Text>
							</View>
							<View style={ui.setupItem}>
								<Text style={[ui.setupLabel, { color: palette.label }]}>Clave</Text>
								<Text style={[ui.setupValue, { color: palette.title }]}>vidkar</Text>
							</View>
							<View style={ui.setupItem}>
								<Text style={[ui.setupLabel, { color: palette.label }]}>Usuario</Text>
								<Text style={[ui.setupValue, { color: palette.title }]}>{item.username || 'Usuario VidKar'}</Text>
							</View>
							<View style={ui.setupItem}>
								<Text style={[ui.setupLabel, { color: palette.label }]}>Contraseña</Text>
								<Text style={[ui.setupValue, { color: palette.title }]}>Contraseña de VidKar</Text>
							</View>
						</View>

						<Divider style={ui.setupDivider} />

						<Text style={[ui.serverSectionTitle, { color: palette.title }]}>Servidores disponibles</Text>
						{loadingServers ? (
							<View style={ui.serverLoadingRow}>
								<ActivityIndicator animating size="small" />
								<Text style={[ui.serverLoadingText, { color: palette.copy }]}>Consultando servidores aprobados...</Text>
							</View>
						) : vpnServers.length > 0 ? (
							<View style={ui.serverList}>
								{vpnServers.map((server) => (
									<View key={server._id} style={[ui.serverCard, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}> 
										<Text style={[ui.serverName, { color: palette.title }]}>{server.details || 'Servidor VPN'}</Text>
										<Text style={[ui.serverLine, { color: palette.copy }]}>DNS: {server.domain || 'Sin dominio'}</Text>
										<Text style={[ui.serverLine, { color: palette.copy }]}>IP: {server.ip || 'Sin IP'}</Text>
										<Text style={[ui.serverLine, { color: palette.copy }]}>Estado: {server.estado || (server.active ? 'ACTIVO' : 'INACTIVO')}</Text>
										<Text style={[ui.serverHint, { color: palette.label }]}>Servidor: {server.ip || 'IP pendiente'} ({server.domain || 'DNS pendiente'})</Text>
									</View>
								))}
							</View>
						) : (
							<Text style={[ui.serverEmptyText, { color: palette.copy }]}>Este usuario no tiene servidores VPN aprobados en este momento.</Text>
						)}
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
	setupPanel: { borderRadius: 18, borderWidth: 1, gap: 12, marginTop: 12, padding: 14 },
	setupHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
	setupEyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
	setupChip: { borderRadius: 999 },
	setupChipText: { fontSize: 11, fontWeight: '800' },
	setupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	setupItem: { flexBasis: '47%', flexGrow: 1, minWidth: 120 },
	setupLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.35, textTransform: 'uppercase' },
	setupValue: { fontSize: 13, fontWeight: '800', marginTop: 3 },
	setupDivider: { opacity: 0.18 },
	serverSectionTitle: { fontSize: 13, fontWeight: '900' },
	serverLoadingRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 4 },
	serverLoadingText: { fontSize: 12, fontWeight: '600' },
	serverList: { gap: 8 },
	serverCard: { borderRadius: 14, borderWidth: 1, padding: 10 },
	serverName: { fontSize: 13, fontWeight: '900' },
	serverLine: { fontSize: 12, fontWeight: '700', marginTop: 3 },
	serverHint: { fontSize: 11, fontWeight: '700', marginTop: 6 },
	serverEmptyText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
});

export default memo(VpnCardUser);
