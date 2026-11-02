import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';

const formatCUP = (value) => {
	const numeric = Number.isFinite(value) ? value : 0;
	try {
		return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)} CUP`;
	} catch {
		return `${(Math.round(numeric * 100) / 100).toFixed(2)} CUP`;
	}
};

const getDebtLevel = (debt, isDark) => {
	if (debt <= 0) {
		return {
			badgeBg: isDark ? 'rgba(34, 197, 94, 0.20)' : 'rgba(34, 197, 94, 0.12)',
			badgeText: isDark ? '#4ade80' : '#15803d',
			color: isDark ? '#4ade80' : '#16a34a',
			icon: 'check-circle-outline',
			label: 'Sin deuda',
		};
	}
	if (debt < 1000) {
		return {
			badgeBg: isDark ? 'rgba(59, 130, 246, 0.20)' : 'rgba(37, 99, 235, 0.12)',
			badgeText: isDark ? '#93c5fd' : '#1d4ed8',
			color: isDark ? '#60a5fa' : '#2563eb',
			icon: 'information-outline',
			label: 'Deuda baja',
		};
	}
	if (debt < 2000) {
		return {
			badgeBg: isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.12)',
			badgeText: isDark ? '#fbbf24' : '#b45309',
			color: isDark ? '#fbbf24' : '#d97706',
			icon: 'alert-outline',
			label: 'Deuda media',
		};
	}
	return {
		badgeBg: isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)',
		badgeText: isDark ? '#f87171' : '#b91c1c',
		color: isDark ? '#f87171' : '#dc2626',
		icon: 'alert-circle-outline',
		label: 'Deuda alta',
	};
};

const getDebtDescriptor = (debt) => {
	if (debt <= 0) {
		return {
			actionLabel: 'Ver ventas',
			helper: 'No hay cobros pendientes para este usuario en este momento.',
			statusLabel: 'Sin pendientes',
		};
	}
	if (debt < 1000) {
		return {
			actionLabel: 'Ver pendientes',
			helper: 'El usuario tiene ventas por cobrar con monto bajo y manejable.',
			statusLabel: 'Seguimiento recomendado',
		};
	}
	if (debt < 2000) {
		return {
			actionLabel: 'Ver pendientes',
			helper: 'Conviene revisar estas ventas pronto para evitar acumulación de deuda.',
			statusLabel: 'Revisión prioritaria',
		};
	}
	return {
		actionLabel: 'Ver pendientes',
		helper: 'El monto pendiente ya es alto y requiere atención inmediata.',
		statusLabel: 'Atención inmediata',
	};
};

const VentasCard = ({ deuda, styles, onPressDetalles, accentColor }) => {
	const theme = useTheme();
	let deudaValue = 0;
	try {
		deudaValue = Number(deuda?.() ?? 0);
		if (!Number.isFinite(deudaValue)) {
			deudaValue = 0;
		}
	} catch {
		deudaValue = 0;
	}

	const level = getDebtLevel(deudaValue, theme.dark);
	const descriptor = getDebtDescriptor(deudaValue);
	const headerAccent = accentColor || (theme.dark ? '#60a5fa' : '#2563eb');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		heroBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		heroBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		iconBg: theme.dark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		meta: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		metaBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="ventas-card">
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.headerRow}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="cash-clock" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Cobros del usuario</Text>
						<Text style={[ui.title, { color: palette.title }]}>Ventas pendientes</Text>
					</View>
					<Chip
						compact
						icon={level.icon}
						style={[ui.chip, { backgroundColor: level.badgeBg }]}
						textStyle={[ui.chipText, { color: level.badgeText }]}
					>
						{level.label}
					</Chip>
				</View>

				{/* Amount Hero Banner */}
				<View style={[ui.amountBanner, { backgroundColor: palette.heroBg, borderColor: palette.heroBorder }]}>
					<View style={ui.amountHeader}>
						<Text style={[ui.amountCaption, { color: palette.label }]}>Saldo pendiente por cobrar</Text>
						<Chip compact style={[ui.currencyChip, { backgroundColor: palette.iconBg }]} textStyle={[ui.currencyText, { color: headerAccent }]}>
							CUP
						</Chip>
					</View>
					<Text style={[ui.amount, { color: level.color }]}>
						{formatCUP(deudaValue)}
					</Text>
					<Text style={[ui.helper, { color: palette.copy }]}>{descriptor.helper}</Text>
				</View>

				{/* Status & Suggested Action */}
				<View style={[ui.metaStrip, { backgroundColor: palette.meta, borderColor: palette.metaBorder }]}>
					<View style={ui.metaItem}>
						<Text style={[ui.metaLabel, { color: palette.label }]}>Estado de cuenta</Text>
						<Text style={[ui.metaValue, { color: level.color }]}>{descriptor.statusLabel}</Text>
					</View>
					<Divider style={ui.metaDivider} />
					<View style={ui.metaItem}>
						<Text style={[ui.metaLabel, { color: palette.label }]}>Acción sugerida</Text>
						<Text style={[ui.metaValue, { color: palette.title }]}>Revisar ventas no cobradas</Text>
					</View>
				</View>

				{/* Action Button */}
				<Button
					mode="contained-tonal"
					icon="receipt-text-outline"
					onPress={onPressDetalles}
					disabled={!onPressDetalles}
					style={ui.actionBtn}
					contentStyle={ui.actionBtnContent}
				>
					{descriptor.actionLabel}
				</Button>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	actionBtn: {
		borderRadius: 14,
		marginTop: 2,
	},
	actionBtnContent: {
		minHeight: 44,
	},
	amount: {
		fontSize: 26,
		fontWeight: '900',
		letterSpacing: -0.4,
	},
	amountBanner: {
		borderRadius: 16,
		borderWidth: 1,
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	amountCaption: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	amountHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	chip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	chipText: {
		fontSize: 10.5,
		fontWeight: '800',
	},
	content: {
		gap: 14,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	currencyChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	currencyText: {
		fontSize: 10,
		fontWeight: '900',
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
	metaDivider: {
		height: '100%',
		marginHorizontal: 12,
		opacity: 0.15,
		width: 1,
	},
	metaItem: {
		flex: 1,
		gap: 3,
	},
	metaLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	metaStrip: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	metaValue: {
		fontSize: 13,
		fontWeight: '700',
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default memo(VentasCard);
