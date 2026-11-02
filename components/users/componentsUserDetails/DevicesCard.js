import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MeteorBase from '@meteorrn/core';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';

import { PushTokens } from '../../collections/collections';
import {
	buildDeviceViewModel,
	buildPushDashboard,
	canAccessPushTokenDashboards,
	PUSH_TOKEN_FIELDS,
	PUSH_TOKEN_SORT_UPDATED,
} from '../pushTokens/utils';

const Meteor =
	/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
		MeteorBase
	);

const MetricCard = ({ label, value, icon, iconColor, palette }) => (
	<View
		style={[
			styles.metricCard,
			{ backgroundColor: palette.tileBg, borderColor: palette.tileBorder },
		]}
	>
		<View style={styles.metricTop}>
			<MaterialCommunityIcons name={icon} size={18} color={iconColor} />
			<Text style={[styles.metricLabel, { color: palette.label }]}>{label}</Text>
		</View>
		<Text style={[styles.metricValue, { color: palette.title }]} numberOfLines={1}>
			{value}
		</Text>
	</View>
);

const DevicesCard = ({
	userId,
	parentStyles,
	accentColor,
	containerStyle,
	onOpenDevices,
}) => {
	const theme = useTheme();
	const baseAccent = accentColor || (theme.dark ? '#60a5fa' : '#2563eb');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		chipBg: theme.dark ? 'rgba(59, 130, 246, 0.20)' : 'rgba(37, 99, 235, 0.10)',
		chipText: theme.dark ? '#93c5fd' : '#1d4ed8',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		iconBg: theme.dark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		tileBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		tileBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	const canViewPushDashboard = Meteor.useTracker(
		() => canAccessPushTokenDashboards(Meteor.user()),
		[],
	);
	const { ready, devices } = Meteor.useTracker(() => {
		if (!userId) {
			return { ready: false, devices: [] };
		}

		const handle = Meteor.subscribe(
			'push_tokens',
			{ userId },
			{
				fields: PUSH_TOKEN_FIELDS,
				sort: PUSH_TOKEN_SORT_UPDATED,
			},
		);

		return {
			ready: handle.ready(),
			devices: PushTokens.find(
				{ userId },
				{
					fields: PUSH_TOKEN_FIELDS,
					sort: PUSH_TOKEN_SORT_UPDATED,
				},
			).fetch(),
		};
	}, [userId]);

	const parsedDevices = useMemo(
		() => devices.map((device, index) => buildDeviceViewModel(device, index)),
		[devices],
	);
	const dashboard = useMemo(
		() => buildPushDashboard(parsedDevices),
		[parsedDevices],
	);

	if (!canViewPushDashboard || !ready || !dashboard.totalDevices) {
		return null;
	}

	return (
		<Card
			elevation={0}
			style={[parentStyles?.cards, styles.card, { borderColor: palette.cardBorder }, containerStyle]}
			testID="devices-card"
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Abrir dispositivos registrados"
				accessibilityHint="Muestra la pantalla con el detalle completo de push tokens del usuario"
				onPress={onOpenDevices ? () => onOpenDevices() : undefined}
				style={({ pressed }) => [styles.pressableArea, pressed ? styles.pressed : null]}
			>
				<Card.Content style={styles.content}>
					{/* Header */}
					<View style={styles.headerRow}>
						<View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
							<MaterialCommunityIcons name="devices" size={24} color={baseAccent} />
						</View>
						<View style={styles.headerCopy}>
							<Text style={[styles.eyebrow, { color: palette.label }]}>Dashboard de dispositivos</Text>
							<Text style={[styles.title, { color: palette.title }]}>Push tokens registrados</Text>
						</View>
						<Chip
							compact
							icon="cellphone-link"
							style={[styles.countChip, { backgroundColor: palette.chipBg }]}
							textStyle={[styles.countChipText, { color: palette.chipText }]}
						>
							{dashboard.totalDevices} {dashboard.totalDevices === 1 ? 'dispositivo' : 'dispositivos'}
						</Chip>
					</View>

					<Text style={[styles.subtitle, { color: palette.copy }]}>
						Vista rápida del parque de dispositivos del usuario, con foco en volumen, Android y sincronización reciente.
					</Text>

					{/* 4-Metric Grid */}
					<View style={styles.metricsGrid}>
						<MetricCard
							label="Total"
							value={dashboard.totalDevices}
							icon="devices"
							iconColor={baseAccent}
							palette={palette}
						/>
						<MetricCard
							label="Android"
							value={dashboard.androidDevices}
							icon="robot"
							iconColor="#10b981"
							palette={palette}
						/>
						<MetricCard
							label="iOS"
							value={dashboard.iosDevices}
							icon="apple"
							iconColor="#a855f7"
							palette={palette}
						/>
						<MetricCard
							label="Versión"
							value={dashboard.androidVersionSummary}
							icon="cellphone-cog"
							iconColor="#f59e0b"
							palette={palette}
						/>
					</View>

					{/* Summary Strip */}
					<View style={[styles.summaryStrip, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
						<View style={styles.summaryItem}>
							<Text style={[styles.summaryLabel, { color: palette.label }]}>Última actividad</Text>
							<Text style={[styles.summaryValue, { color: palette.title }]} numberOfLines={1}>
								{dashboard.latestActivityLabel}
							</Text>
						</View>
						<View style={styles.summaryDivider} />
						<View style={styles.summaryItem}>
							<Text style={[styles.summaryLabel, { color: palette.label }]}>Plataforma</Text>
							<Text style={[styles.summaryValue, { color: palette.title }]} numberOfLines={1}>
								{dashboard.latestPlatformLabel}
							</Text>
						</View>
						<View style={styles.summaryDivider} />
						<View style={styles.summaryItem}>
							<Text style={[styles.summaryLabel, { color: palette.label }]}>Proveedores</Text>
							<Text style={[styles.summaryValue, { color: palette.title }]} numberOfLines={1}>
								{dashboard.providerCount}
							</Text>
						</View>
					</View>

					{/* Action */}
					<Button
						mode="contained-tonal"
						icon="arrow-right"
						onPress={onOpenDevices}
						disabled={!onOpenDevices}
						style={styles.actionBtn}
						contentStyle={styles.actionBtnContent}
					>
						Ver dispositivos completos
					</Button>
				</Card.Content>
			</Pressable>
		</Card>
	);
};

const styles = StyleSheet.create({
	actionBtn: {
		borderRadius: 14,
		marginTop: 2,
	},
	actionBtnContent: {
		flexDirection: 'row-reverse',
		minHeight: 44,
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
	countChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	countChipText: {
		fontSize: 10.5,
		fontWeight: '800',
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
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
	iconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
	},
	metricCard: {
		borderRadius: 14,
		borderWidth: 1,
		flexBasis: '47%',
		flexGrow: 1,
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	metricLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	metricTop: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 6,
	},
	metricValue: {
		fontSize: 15,
		fontWeight: '800',
	},
	metricsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	pressableArea: {
		borderRadius: 20,
	},
	pressed: {
		opacity: 0.96,
	},
	subtitle: {
		fontSize: 12.5,
		lineHeight: 18,
	},
	summaryDivider: {
		backgroundColor: 'rgba(148, 163, 184, 0.2)',
		height: '70%',
		marginHorizontal: 8,
		width: 1,
	},
	summaryItem: {
		flex: 1,
		gap: 2,
	},
	summaryLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	summaryStrip: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	summaryValue: {
		fontSize: 12.5,
		fontWeight: '700',
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default memo(DevicesCard);
