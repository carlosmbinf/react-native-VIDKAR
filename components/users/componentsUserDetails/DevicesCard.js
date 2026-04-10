import { MaterialCommunityIcons } from '@expo/vector-icons';
import MeteorBase from '@meteorrn/core';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, Surface, Text, Title } from 'react-native-paper';

import { PushTokens } from '../../collections/collections';

const Meteor =
	/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
		MeteorBase
	);

const UNKNOWN_LABEL = 'No disponible';

const formatDate = (value) => {
	if (!value) {
		return UNKNOWN_LABEL;
	}

	try {
		return new Date(value).toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return UNKNOWN_LABEL;
	}
};

const getTimeValue = (value) => {
	if (!value) {
		return 0;
	}

	const date = new Date(value);
	const time = date.getTime();
	return Number.isFinite(time) ? time : 0;
};

const capitalize = (value = '') => {
	if (!value) {
		return '';
	}

	return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const getPlatformMeta = (platformRaw, provider) => {
	const raw = typeof platformRaw === 'string' ? platformRaw.trim() : '';
	const parts = raw.split('_').filter(Boolean);
	const platformKey = (parts[0] || '').toLowerCase();
	const versionIndex = parts.findIndex((part) => /^v\d+(?:\.\d+)+$/i.test(part));
	const appVersionToken = versionIndex >= 0 ? parts[versionIndex] : '';
	const buildToken = versionIndex >= 0 ? parts[versionIndex + 1] : '';
	const parsedProvider =
		typeof provider === 'string' && provider.trim()
			? provider.trim().toLowerCase()
			: parts.find((part) => ['expo', 'fcm', 'apns'].includes(part.toLowerCase()))?.toLowerCase() || '';

	let osVersion = UNKNOWN_LABEL;

	if (platformKey === 'android' && parts[1] && /^\d+$/.test(parts[1])) {
		osVersion = `Android API ${parts[1]}`;
	} else if (platformKey === 'ios' && parts[1] && !/^v\d+(?:\.\d+)+$/i.test(parts[1])) {
		osVersion = `iOS ${parts[1]}`;
	}

	return {
		raw: raw || UNKNOWN_LABEL,
		platformLabel:
			platformKey === 'android'
				? 'Android'
				: platformKey === 'ios'
					? 'iPhone / iOS'
					: raw
						? capitalize(raw)
						: UNKNOWN_LABEL,
		providerLabel: parsedProvider ? capitalize(parsedProvider) : null,
		osVersion,
		appVersion: appVersionToken ? appVersionToken.replace(/^v/i, '') : UNKNOWN_LABEL,
		buildNumber: buildToken && /^\d+$/.test(buildToken) ? buildToken : UNKNOWN_LABEL,
	};
};

const getDeviceTitle = (platformLabel, index) => `${platformLabel} ${index + 1}`;

const getPlatformIcon = (platformLabel) => {
	if (platformLabel === 'Android') {
		return 'android';
	}

	if (platformLabel === 'iPhone / iOS') {
		return 'apple-ios';
	}

	return 'cellphone';
};

const DevicesCard = ({ userId, styles, accentColor, containerStyle }) => {
	const { ready, devices } = Meteor.useTracker(() => {
		if (!userId) {
			return { ready: false, devices: [] };
		}

		const handle = Meteor.subscribe(
			'push_tokens',
			{ userId },
			{
				fields: {
					platform: 1,
					createdAt: 1,
					updatedAt: 1,
					provider: 1,
					token: 1,
					deviceId: 1,
					userId: 1,
				},
				sort: { updatedAt: -1, createdAt: -1 },
			},
		);

		return {
			ready: handle.ready(),
			devices: PushTokens.find(
				{ userId },
				{
					fields: {
						platform: 1,
						createdAt: 1,
						updatedAt: 1,
						provider: 1,
						token: 1,
						deviceId: 1,
						userId: 1,
					},
					sort: { updatedAt: -1, createdAt: -1 },
				},
			).fetch(),
		};
	}, [userId]);

	const parsedDevices = useMemo(
		() =>
			devices.map((device, index) => {
				const meta = getPlatformMeta(device?.platform, device?.provider);
				return {
					...device,
					index,
					meta,
					title: getDeviceTitle(meta.platformLabel, index),
					icon: getPlatformIcon(meta.platformLabel),
					updatedAtValue: getTimeValue(device?.updatedAt || device?.createdAt),
				};
			}),
		[devices],
	);

	const latestDevice = parsedDevices[0];
	const deviceCount = parsedDevices.length;

	if (!ready || !deviceCount) {
		return null;
	}

	return (
		<Surface elevation={5} style={[styles.cards, ui.cardShell, containerStyle]} testID="devices-card">
			<View style={[ui.accentBar, { backgroundColor: accentColor || '#5E35B1' }]} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<View style={ui.headerCopy}>
						<Text style={ui.eyebrow}>Dispositivos registrados</Text>
						<Title style={ui.title}>Dispositivos del usuario</Title>
						<Text style={ui.subtitle}>
							{deviceCount} {deviceCount === 1 ? 'dispositivo detectado' : 'dispositivos detectados'}
						</Text>
					</View>
					<Chip icon="devices" compact style={ui.countChip} textStyle={ui.countChipText}>
						{deviceCount}
					</Chip>
				</View>

				<View style={ui.summaryRow}>
					<View style={ui.summaryItem}>
						<Text style={ui.summaryLabel}>Última actividad</Text>
						<Text style={ui.summaryValue}>
							{latestDevice ? formatDate(latestDevice.updatedAt || latestDevice.createdAt) : UNKNOWN_LABEL}
						</Text>
					</View>
					<View style={ui.summaryDivider} />
					<View style={ui.summaryItem}>
						<Text style={ui.summaryLabel}>Plataforma reciente</Text>
						<Text style={ui.summaryValue}>
							{latestDevice ? latestDevice.meta.platformLabel : UNKNOWN_LABEL}
						</Text>
					</View>
				</View>

				<Divider style={ui.divider} />

				<View style={ui.devicesList}>
					{parsedDevices.map((device) => (
						<Surface key={device._id} elevation={1} style={ui.deviceCard}>
							<View style={ui.deviceHeader}>
								<View style={ui.deviceIdentity}>
									<View style={ui.iconWrap}>
										<MaterialCommunityIcons color="#5E35B1" name={device.icon} size={20} />
									</View>
									<View style={ui.deviceHeaderCopy}>
										<Text style={ui.deviceTitle}>{device.title}</Text>
										<Text style={ui.deviceSubtitle}>{device.meta.raw}</Text>
									</View>
								</View>
								<View style={ui.deviceChips}>
									<Chip compact icon="cellphone-cog" style={ui.deviceChip} textStyle={ui.deviceChipText}>
										{device.meta.platformLabel}
									</Chip>
									{device.meta.providerLabel ? (
										<Chip compact icon="cloud-outline" style={ui.deviceChipSecondary} textStyle={ui.deviceChipText}>
											{device.meta.providerLabel}
										</Chip>
									) : null}
								</View>
							</View>

							<View style={ui.metricsRow}>
								<View style={ui.metricItem}>
									<Text style={ui.metricLabel}>Versión app</Text>
									<Text style={ui.metricValue}>{device.meta.appVersion}</Text>
								</View>
								<View style={ui.metricItem}>
									<Text style={ui.metricLabel}>Núm. versión</Text>
									<Text style={ui.metricValue}>{device.meta.buildNumber}</Text>
								</View>
								<View style={ui.metricItem}>
									<Text style={ui.metricLabel}>Versión dispositivo</Text>
									<Text style={ui.metricValue}>{device.meta.osVersion}</Text>
								</View>
							</View>

							<View style={ui.footerRow}>
								<View style={ui.footerMeta}>
									<MaterialCommunityIcons color="#64748B" name="clock-outline" size={16} />
									<Text style={ui.footerText}>
										Actualizado: {formatDate(device.updatedAt || device.createdAt)}
									</Text>
								</View>
								<Text style={ui.footerText}>
									Registrado: {formatDate(device.createdAt)}
								</Text>
							</View>
						</Surface>
					))}
				</View>
			</Card.Content>
		</Surface>
	);
};

const ui = StyleSheet.create({
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	content: { paddingTop: 10 },
	headerRow: {
		alignItems: 'flex-start',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	headerCopy: { flex: 1, paddingRight: 12 },
	eyebrow: {
		color: '#64748B',
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.7,
		textTransform: 'uppercase',
	},
	title: { color: '#312E81', fontSize: 20, fontWeight: '700' },
	subtitle: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4 },
	countChip: { alignSelf: 'flex-start', backgroundColor: '#312E81' },
	countChipText: { color: '#FFFFFF', fontWeight: '700' },
	summaryRow: {
		alignItems: 'stretch',
		backgroundColor: '#F8FAFC',
		borderRadius: 14,
		flexDirection: 'row',
		marginTop: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	summaryItem: { flex: 1, gap: 2 },
	summaryLabel: {
		color: '#64748B',
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	summaryValue: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
	summaryDivider: {
		backgroundColor: 'rgba(15, 23, 42, 0.08)',
		marginHorizontal: 12,
		width: 1,
	},
	divider: { marginVertical: 12, opacity: 0.2 },
	devicesList: { gap: 12 },
	deviceCard: {
		backgroundColor: '#FCFCFF',
		borderColor: 'rgba(94, 53, 177, 0.08)',
		borderRadius: 18,
		borderWidth: 1,
		padding: 14,
	},
	deviceHeader: {
		alignItems: 'flex-start',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	deviceIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', paddingRight: 12 },
	iconWrap: {
		alignItems: 'center',
		backgroundColor: 'rgba(94, 53, 177, 0.12)',
		borderRadius: 14,
		height: 40,
		justifyContent: 'center',
		marginRight: 12,
		width: 40,
	},
	deviceHeaderCopy: { flex: 1 },
	deviceTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
	deviceSubtitle: { color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 2 },
	deviceChips: {
		alignItems: 'flex-end',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		justifyContent: 'flex-end',
		maxWidth: '44%',
	},
	deviceChip: { backgroundColor: 'rgba(94, 53, 177, 0.12)' },
	deviceChipSecondary: { backgroundColor: 'rgba(30, 136, 229, 0.12)' },
	deviceChipText: { color: '#0F172A', fontSize: 11, fontWeight: '700' },
	metricsRow: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 14,
		padding: 12,
	},
	metricItem: { flexGrow: 1, flexBasis: '30%', minWidth: 96 },
	metricLabel: {
		color: '#64748B',
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	metricValue: { color: '#0F172A', fontSize: 13, fontWeight: '700', marginTop: 4 },
	footerRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginTop: 14,
		rowGap: 8,
	},
	footerMeta: { alignItems: 'center', flexDirection: 'row', gap: 6 },
	footerText: { color: '#64748B', fontSize: 11, lineHeight: 16 },
});

export default memo(DevicesCard);
