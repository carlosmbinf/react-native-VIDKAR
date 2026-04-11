import Meteor from '@meteorrn/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, IconButton, Text } from 'react-native-paper';

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

	return (
		<Card elevation={12} style={[styles?.cards, ui.card, ui.cardShell]} testID="saldo-recargas-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Title
				title="Saldo Disponible Recargas"
				subtitle={lastUpdated ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Obteniendo saldo...'}
				right={(props) => <IconButton {...props} icon="refresh" onPress={() => fetchBalance(true)} disabled={loading} accessibilityLabel="Refrescar saldo" />}
				titleStyle={ui.title}
				subtitleStyle={ui.subtitle}
			/>
			<Card.Content style={ui.content}>
				{loading ? (
					<View style={ui.loadingBox}>
						<ActivityIndicator />
						<Text style={ui.loadingText}>Consultando saldo...</Text>
					</View>
				) : error ? (
					<View style={ui.errorBox}>
						<Text style={ui.errorText}>Error: {error}</Text>
						<Text style={ui.retryHint}>Pulsa el icono para intentar nuevamente.</Text>
					</View>
				) : saldo != null ? (
					<View style={ui.valueWrapper}>
						<Text style={ui.amount}>{formatAmount(saldo)}</Text>
						<Text style={ui.symbol}>{balances.length > 1 ? 'TOTAL' : currency}</Text>
					</View>
				) : (
					<Text style={ui.noData}>No se pudo interpretar el saldo.</Text>
				)}

				<View style={ui.metaRow}>
					<Chip compact icon="history" style={ui.chip} textStyle={ui.chipText}>
						Auto en {cooldown}s
					</Chip>
				</View>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	card: { marginBottom: 20, borderRadius: 20 },
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	title: { fontSize: 16, fontWeight: '600' },
	subtitle: { fontSize: 11 },
	content: { paddingTop: 4 },
	loadingBox: { alignItems: 'center', paddingVertical: 16 },
	loadingText: { fontSize: 11, color: '#666', marginTop: 8 },
	errorBox: { paddingVertical: 6 },
	errorText: { fontSize: 12, color: '#d32f2f', fontWeight: '600' },
	retryHint: { fontSize: 10, color: '#888', marginTop: 4 },
	valueWrapper: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginVertical: 4 },
	symbol: { fontSize: 16, fontWeight: '600', marginRight: 6 },
	amount: { fontSize: 24, fontWeight: '700', letterSpacing: -1 },
	noData: { fontSize: 12, textAlign: 'center', color: '#777' },
	metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
	chip: { backgroundColor: '#E3F2FD' },
	chipText: { color: '#1565C0', fontWeight: '700' },
});

export default SaldoRecargasCard;
