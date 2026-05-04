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
	const headerAccent = accentColor || '#1E88E5';
	const palette = {
		amount: theme.dark ? '#f8fafc' : '#0f172a',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		muted: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(248, 250, 252, 0.96)',
		primarySoft: theme.dark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(219, 234, 254, 0.95)',
		primaryText: theme.dark ? '#dbeafe' : '#1565C0',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	return (
		<Card elevation={4} style={[styles?.cards, ui.cardShell]} testID="saldo-recargas-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Title
				title="Saldo Disponible Recargas"
				subtitle={lastUpdated ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Obteniendo saldo...'}
				right={(props) => <IconButton {...props} icon="refresh" onPress={() => fetchBalance(true)} disabled={loading} accessibilityLabel="Refrescar saldo" />}
				titleStyle={[ui.title, { color: palette.title }]}
				subtitleStyle={[ui.subtitle, { color: palette.muted }]}
			/>
			<Card.Content style={ui.content}>
				{loading ? (
					<View style={[ui.stateBox, { backgroundColor: palette.panel }]}>
						<ActivityIndicator />
						<Text style={[ui.loadingText, { color: palette.copy }]}>Consultando saldo...</Text>
					</View>
				) : error ? (
					<View style={[ui.stateBox, ui.errorBox]}>
						<Text style={ui.errorText}>Error: {error}</Text>
						<Text style={[ui.retryHint, { color: palette.muted }]}>Pulsa el icono para intentar nuevamente.</Text>
					</View>
				) : saldo != null ? (
					<View style={[ui.valueWrapper, { backgroundColor: palette.panel }]}>
						<Text style={[ui.amount, { color: palette.amount }]}>{formatAmount(saldo)}</Text>
						<Text style={[ui.symbol, { color: palette.muted }]}>{balances.length > 1 ? 'TOTAL' : currency}</Text>
					</View>
				) : (
					<Text style={[ui.noData, { color: palette.muted }]}>No se pudo interpretar el saldo.</Text>
				)}

				<View style={ui.metaRow}>
					<Chip compact icon="history" style={[ui.chip, { backgroundColor: palette.primarySoft }]} textStyle={[ui.chipText, { color: palette.primaryText }]}>
						Auto en {cooldown}s
					</Chip>
				</View>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	title: { fontSize: 16, fontWeight: '600' },
	subtitle: { fontSize: 11 },
	content: { gap: 12, paddingBottom: 16, paddingTop: 4 },
	stateBox: { alignItems: 'center', borderRadius: 18, paddingVertical: 18 },
	loadingText: { fontSize: 12, fontWeight: '700', marginTop: 8 },
	errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingHorizontal: 12 },
	errorText: { fontSize: 12, color: '#d32f2f', fontWeight: '600' },
	retryHint: { fontSize: 10, marginTop: 4 },
	valueWrapper: { alignItems: 'center', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 18 },
	symbol: { fontSize: 15, fontWeight: '800', marginLeft: 8 },
	amount: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
	noData: { fontSize: 12, textAlign: 'center' },
	metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
	chip: { borderRadius: 999 },
	chipText: { fontWeight: '800' },
});

export default SaldoRecargasCard;
