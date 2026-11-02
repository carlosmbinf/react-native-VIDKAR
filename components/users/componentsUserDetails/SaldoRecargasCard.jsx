import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Meteor from '@meteorrn/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, IconButton, Text, useTheme } from 'react-native-paper';

const extractNumber = (data) => {
	if (data == null) {
		return null;
	}
	if (typeof data === 'number') {
		return data;
	}
	if (typeof data === 'string') {
		const numeric = Number(data);
		return Number.isNaN(numeric) ? null : numeric;
	}
	for (const key of ['available', 'balance', 'amount', 'saldo', 'availableBalance']) {
		if (data[key] != null) {
			const nested = extractNumber(data[key]);
			if (nested != null) {
				return nested;
			}
		}
	}
	return null;
};

const parseBalances = (data) => {
	if (!data) {
		return [];
	}
	if (Array.isArray(data)) {
		return data
			.map((balance) => ({
				amount: extractNumber(balance.available ?? balance.balance ?? balance.amount ?? balance.saldo),
				currency: balance.currency || balance.unit || 'USD',
				unitType: balance.unitType || 'CURRENCY',
			}))
			.filter((balance) => balance.amount != null);
	}
	if (typeof data === 'object') {
		const amount = extractNumber(data);
		return amount != null ? [{ amount, currency: data.currency || data.unit || 'USD', unitType: data.unitType || 'CURRENCY' }] : [];
	}
	const amount = extractNumber(data);
	return amount != null ? [{ amount, currency: 'USD', unitType: 'CURRENCY' }] : [];
};

const SaldoRecargasCard = ({ refreshKey = 0, accentColor, styles }) => {
	const theme = useTheme();
	const [saldoRaw, setSaldoRaw] = useState(null);
	const [saldo, setSaldo] = useState(null);
	const [balances, setBalances] = useState([]);
	const [loading, setLoading] = useState(true);
	const [lastUpdated, setLastUpdated] = useState(null);
	const [error, setError] = useState(null);
	const [cooldown, setCooldown] = useState(0);

	const countdownRef = useRef(null);
	const fetchingRef = useRef(false);
	const mountedRef = useRef(true);
	const REFRESH_SECONDS = 60;

	const formatAmount = (value) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

	const fetchBalance = useCallback((forced = false) => {
		if (fetchingRef.current) {
			return;
		}
		fetchingRef.current = true;
		setLoading((previous) => previous && !forced);
		setError(null);

		Meteor.call('dtshop.getBalance', (callError, result) => {
			if (!mountedRef.current) {
				return;
			}

			if (callError) {
				setError(callError.reason || callError.message || 'Error desconocido');
			} else {
				setSaldoRaw(result);
				const list = parseBalances(result);
				setBalances(list);
				const numeric = list.length > 1 ? list.reduce((accumulator, current) => accumulator + (current.amount || 0), 0) : list[0]?.amount ?? extractNumber(result);
				setSaldo(numeric);
				setLastUpdated(new Date());
			}

			setLoading(false);
			fetchingRef.current = false;
			setCooldown(REFRESH_SECONDS);
		});
	}, []);

	useEffect(() => {
		countdownRef.current && clearInterval(countdownRef.current);
		countdownRef.current = setInterval(() => {
			setCooldown((current) => {
				if (current <= 1) {
					if (!fetchingRef.current) {
						fetchBalance();
					}
					return 0;
				}
				return current - 1;
			});
		}, 1000);

		return () => countdownRef.current && clearInterval(countdownRef.current);
	}, [fetchBalance]);

	useEffect(() => {
		fetchBalance(true);
	}, [fetchBalance]);

	useEffect(() => {
		fetchBalance(true);
	}, [refreshKey, fetchBalance]);

	useEffect(() => () => {
		mountedRef.current = false;
		countdownRef.current && clearInterval(countdownRef.current);
	}, []);

	const currency = balances.length === 1 ? balances[0].currency : saldoRaw?.currency || saldoRaw?.unit || 'USD';
	const headerAccent = accentColor || (theme.dark ? '#38bdf8' : '#0284c7');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		danger: theme.dark ? '#f87171' : '#dc2626',
		dangerBg: theme.dark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
		heroBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		heroBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		iconBg: theme.dark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		primarySoft: theme.dark ? 'rgba(56, 189, 248, 0.20)' : 'rgba(2, 132, 199, 0.10)',
		primaryText: theme.dark ? '#7dd3fc' : '#0369a1',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	return (
		<Card elevation={0} style={[styles?.cards, ui.card, { borderColor: palette.cardBorder }]} testID="saldo-recargas-card">
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.headerRow}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="wallet-outline" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Servicio DTShop</Text>
						<Text style={[ui.title, { color: palette.title }]}>Saldo de Recargas</Text>
						<Text style={[ui.subtitle, { color: palette.label }]}>
							{lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Obteniendo saldo...'}
						</Text>
					</View>
					<IconButton
						icon="refresh"
						size={22}
						iconColor={headerAccent}
						style={[ui.refreshBtn, { backgroundColor: palette.primarySoft }]}
						onPress={() => fetchBalance(true)}
						disabled={loading}
						accessibilityLabel="Refrescar saldo"
					/>
				</View>

				{/* Balance Container */}
				{loading ? (
					<View style={[ui.stateBox, { backgroundColor: palette.heroBg }]}>
						<ActivityIndicator size="small" color={headerAccent} />
						<Text style={[ui.loadingText, { color: palette.copy }]}>Consultando saldo DTShop...</Text>
					</View>
				) : error ? (
					<View style={[ui.stateBox, { backgroundColor: palette.dangerBg }]}>
						<MaterialCommunityIcons name="alert-circle-outline" size={24} color={palette.danger} />
						<Text style={[ui.errorText, { color: palette.danger }]}>Error: {error}</Text>
						<Text style={[ui.retryHint, { color: palette.label }]}>Toca el botón de refrescar para reintentar.</Text>
					</View>
				) : saldo != null ? (
					<View style={[ui.balanceHero, { backgroundColor: palette.heroBg, borderColor: palette.heroBorder }]}>
						<View style={ui.balanceTop}>
							<Text style={[ui.balanceCaption, { color: palette.label }]}>Monto disponible</Text>
							<Chip compact style={[ui.currencyChip, { backgroundColor: palette.iconBg }]} textStyle={[ui.currencyText, { color: headerAccent }]}>
								{balances.length > 1 ? 'TOTAL' : currency}
							</Chip>
						</View>
						<Text style={[ui.amount, { color: palette.title }]}>
							{formatAmount(saldo)}
						</Text>
					</View>
				) : (
					<View style={[ui.stateBox, { backgroundColor: palette.heroBg }]}>
						<Text style={[ui.noData, { color: palette.label }]}>No se pudo interpretar el saldo.</Text>
					</View>
				)}

				{/* Footer Meta Row */}
				<View style={ui.metaRow}>
					<Chip
						compact
						icon="timer-sand"
						style={[ui.timerChip, { backgroundColor: palette.primarySoft }]}
						textStyle={[ui.timerChipText, { color: palette.primaryText }]}
					>
						Actualización automática en {cooldown}s
					</Chip>
				</View>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	amount: {
		fontSize: 30,
		fontWeight: '900',
		letterSpacing: -0.5,
	},
	balanceCaption: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	balanceHero: {
		borderRadius: 16,
		borderWidth: 1,
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	balanceTop: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
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
	currencyChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	currencyText: {
		fontSize: 10.5,
		fontWeight: '900',
	},
	errorText: {
		fontSize: 12.5,
		fontWeight: '700',
		textAlign: 'center',
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
	loadingText: {
		fontSize: 12.5,
		fontWeight: '600',
	},
	metaRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
	},
	noData: {
		fontSize: 12.5,
		textAlign: 'center',
	},
	refreshBtn: {
		borderRadius: 14,
		margin: 0,
	},
	retryHint: {
		fontSize: 11,
		marginTop: 2,
	},
	stateBox: {
		alignItems: 'center',
		borderRadius: 16,
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 20,
	},
	subtitle: {
		fontSize: 11.5,
		fontWeight: '500',
	},
	timerChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	timerChipText: {
		fontSize: 10.5,
		fontWeight: '800',
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default SaldoRecargasCard;
